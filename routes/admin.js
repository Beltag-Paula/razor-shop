const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const db = require('../db');
const C = require('../content');
const v = require('../views');
const K = require('../lib/crypto');
const session = require('../lib/session');
const booking = require('../lib/booking');
const notify = require('../lib/notify');
const WA = require('../lib/whatsapp');
const callmebot = require('../lib/callmebot');
const { upload, saveImage, removeUpload } = require('../lib/images');
const { validDate, hhmm, slots } = require('../lib/availability');
const { shopNow, addDays } = require('../lib/shoptime');
const { fmtLong, fmtDate, fmtTime } = require('../i18n');
const { send } = require('../lib/mail');
const stats = require('../lib/stats');
const { toCsv } = require('../lib/csv');

const limiter = (limit, windowMs = 15 * 60 * 1000) => rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE = /^\+?[\d\s().-]{7,20}$/;
const BASE = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const fail = (msg, status = 400) => { throw Object.assign(new Error(msg), { status }); };
const str = (val, max, label, required = false) => { const s = String(val ?? '').trim().slice(0, max); if (required && !s) fail(`${label} is required.`); return s; };
const int = (val, min, max, label) => { const n = Number(val); if (!Number.isInteger(n) || n < min || n > max) fail(`${label} must be a whole number from ${min} to ${max}.`); return n; };
const wrap = fn => (req, res, next) => { try { Promise.resolve(fn(req, res, next)).catch(next); } catch (e) { next(e); } };
const isOwner = req => !req.session.user.barber_id;
const own = req => req.session.user.barber_id;
const owner = (req, res, next) => (isOwner(req) ? next() : res.status(403).json({ error: 'Only the owner can do that.' }));
// Appointments, schedules, numbers and notification settings belong to the barber. The owner is refused here,
// not just shown nothing, and the data is encrypted so that the owner could not read it anyway.
const barberOnly = (req, res, next) => (own(req) ? next() : res.status(403).json({ error: 'This is private to each specialist.' }));
const position = val => C.cleanPos(val) || fail('Invalid position.');
const exists = (table, id) => !!db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);

// Long passphrases protect a barber's data (the password also unlocks their key), so length matters most.
function checkNewPassword(pw, email = '') {
  pw = String(pw || '');
  if (pw.length < 12) fail('Use at least 12 characters. A few words in a row make a strong password.');
  if (pw.length > 200) fail('That password is too long.');
  const name = email.toLowerCase().split('@')[0];
  if (name.length > 3 && pw.toLowerCase().includes(name)) fail('The password must not contain your email name.');
  if (/^(.)\1+$/.test(pw) || /^(0123456789|1234567890|password|qwertyuiop)/i.test(pw)) fail('That password is too easy to guess.');
  return pw;
}

// ---------- Sign in, invitation, recovery (no session needed) ----------
const MAX_FAILS = 5, LOCK_MS = 15 * 60 * 1000;
router.get('/login', (req, res) => (req.session ? res.redirect('/admin') : res.send(v.login())));

router.post('/api/login', limiter(10), wrap(async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim(), pw = String(req.body?.password || '');
  const a = db.prepare('SELECT * FROM accounts WHERE email = ?').get(email);
  if (a && a.locked_until > Date.now()) fail('Too many wrong passwords. Try again in a few minutes.', 429);
  if (!a || a.status !== 'active' || !a.pw_hash) { await K.fakeCheck(); fail('Wrong email or password.', 401); }
  if (!(await K.checkPassword(pw, a.pw_salt, a.pw_hash))) {
    const failed = a.failed + 1;
    db.prepare('UPDATE accounts SET failed = ?, locked_until = ? WHERE id = ?').run(failed >= MAX_FAILS ? 0 : failed, failed >= MAX_FAILS ? Date.now() + LOCK_MS : 0, a.id);
    fail('Wrong email or password.', 401);
  }
  db.prepare('UPDATE accounts SET failed = 0, locked_until = 0 WHERE id = ?').run(a.id);
  const priv = a.barber_id ? await K.unlock(a, pw) : null; // the barber's key, kept in memory for this session only
  session.create(res, a, priv);
  res.json({ ok: true });
}));

const invited = token => db.prepare("SELECT a.*, b.name FROM accounts a JOIN barbers b ON b.id = a.barber_id WHERE a.invite_hash = ? AND a.invite_exp > ? AND a.status = 'invited'").get(K.hashToken(String(token || '')), Date.now());
router.get('/setup', (req, res) => res.send(v.setup()));
router.post('/api/setup/check', limiter(30), (req, res) => {
  const a = invited(req.body?.token);
  if (!a) fail('This invitation is not valid any more. Ask for a new one.', 404);
  res.json({ name: a.name, email: a.email });
});
// The barber chooses their own password here, so the owner never knows it.
router.post('/api/setup', limiter(10), wrap(async (req, res) => {
  const a = invited(req.body?.token);
  if (!a) fail('This invitation is not valid any more. Ask for a new one.', 404);
  const pw = checkNewPassword(req.body?.password, a.email);
  const hashed = await K.hashPassword(pw), keys = await K.newBarberKeys(pw);
  db.transaction(() => {
    const r = db.prepare(`UPDATE accounts SET pw_salt = ?, pw_hash = ?, status = 'active', invite_hash = NULL, invite_exp = NULL,
      pub_key = ?, kdf_salt = ?, enc_priv = ?, rec_salt = ?, enc_priv_rec = ?, failed = 0, locked_until = 0 WHERE id = ? AND status = 'invited'`)
      .run(hashed.pw_salt, hashed.pw_hash, keys.row.pub_key, keys.row.kdf_salt, keys.row.enc_priv, keys.row.rec_salt, keys.row.enc_priv_rec, a.id);
    if (!r.changes) fail('This invitation was already used.', 409);
    db.prepare('UPDATE barbers SET active = 1 WHERE id = ?').run(a.barber_id); // now shown on the site and bookable
  })();
  res.json({ ok: true, recoveryCode: keys.code }); // shown once, never stored
}));

// Forgot the password: the recovery code opens the key, then a new password re-wraps it. Appointments stay readable.
router.post('/api/recover', limiter(5, 60 * 60 * 1000), wrap(async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  const a = db.prepare("SELECT * FROM accounts WHERE email = ? AND barber_id IS NOT NULL AND status = 'active'").get(email);
  const no = () => fail('That email and recovery code do not match.', 401);
  if (!a) { await K.fakeCheck(); no(); }
  let priv;
  try { priv = await K.unlockWithCode(a, req.body?.code); } catch { no(); }
  const pw = checkNewPassword(req.body?.password, a.email);
  const hashed = await K.hashPassword(pw), wrapped = await K.rewrap(priv, pw);
  db.prepare('UPDATE accounts SET pw_salt = ?, pw_hash = ?, kdf_salt = ?, enc_priv = ?, failed = 0, locked_until = 0 WHERE id = ?').run(hashed.pw_salt, hashed.pw_hash, wrapped.kdf_salt, wrapped.enc_priv, a.id);
  session.destroyUser(a.id);
  res.json({ ok: true });
}));

// ---------- Everything below needs a signed-in owner or barber ----------
router.use((req, res, next) => {
  if (!req.session) return req.path.startsWith('/api') ? res.status(401).json({ error: 'Sign in required.' }) : res.redirect('/admin/login');
  if (!['GET', 'HEAD'].includes(req.method) && req.get('x-csrf') !== req.session.csrf) return res.status(403).json({ error: 'Session check failed. Reload the page.' });
  next();
});

router.get('/', (req, res) => res.send(v.admin(req.session.user, req.session.csrf)));
router.post('/api/logout', (req, res) => { session.destroy(req, res); res.json({ ok: true }); });

router.post('/api/password', limiter(10), wrap(async (req, res) => {
  const a = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.session.user.id);
  if (!(await K.checkPassword(String(req.body?.current || ''), a.pw_salt, a.pw_hash))) fail('Your current password is wrong.', 403);
  const pw = checkNewPassword(req.body?.next, a.email);
  const hashed = await K.hashPassword(pw);
  if (a.barber_id) { // a barber's key is re-wrapped under the new password
    const w = await K.rewrap(req.session.priv, pw);
    db.prepare('UPDATE accounts SET pw_salt = ?, pw_hash = ?, kdf_salt = ?, enc_priv = ? WHERE id = ?').run(hashed.pw_salt, hashed.pw_hash, w.kdf_salt, w.enc_priv, a.id);
  } else db.prepare('UPDATE accounts SET pw_salt = ?, pw_hash = ? WHERE id = ?').run(hashed.pw_salt, hashed.pw_hash, a.id);
  session.destroyUser(a.id, req.sid); // every other device is signed out
  res.json({ ok: true });
}));

// ---------- Appointments: private to each barber, decrypted with their own key ----------
function view(req, r) {
  let p = null;
  try { p = K.open(req.session.priv, r.payload, `appt:${own(req)}`); } catch { /* unreadable */ }
  return { id: r.id, barber_id: r.barber_id, barber_name: db.prepare('SELECT name FROM barbers WHERE id = ?').get(r.barber_id)?.name || '', date: r.date, start_min: r.start_min, start: hhmm(r.start_min), end: hhmm(r.end_min), status: r.status,
    service_id: p?.service_id, service_name: p?.service || '', service_name_ro: p?.service_ro || '', price: p?.price ?? 0,
    name: p?.name || '(unreadable)', phone: p?.phone || '', email: p?.email || '', lang: p?.lang || 'en' };
}
const SEL = 'SELECT id, barber_id, date, start_min, end_min, status, payload FROM appointments';
router.get('/api/appointments', barberOnly, wrap((req, res) => {
  const date = String(req.query.date || '');
  if (!validDate(date)) fail('Invalid date.');
  const rows = db.prepare(`${SEL} WHERE barber_id = ? AND date = ? AND status != 'cancelled' ORDER BY start_min`).all(own(req), date);
  res.json({ appointments: rows.map(r => view(req, r)) });
}));
// Requests waiting for the barber's call. The count is plain (the dashboard polls it); the list is decrypted.
router.get('/api/pending', barberOnly, (req, res) => {
  const n = shopNow();
  const rows = db.prepare(`${SEL} WHERE barber_id = ? AND status = 'pending' AND (date > ? OR (date = ? AND end_min > ?)) ORDER BY date, start_min`).all(own(req), n.date, n.date, n.minutes);
  res.json({ count: rows.length, appointments: rows.map(r => view(req, r)) });
});
router.get('/api/upcoming', barberOnly, (req, res) => {
  const n = shopNow();
  const rows = db.prepare(`${SEL} WHERE barber_id = ? AND status != 'cancelled' AND (date > ? OR (date = ? AND end_min > ?)) AND date <= ? ORDER BY date, start_min LIMIT 100`).all(own(req), n.date, n.date, n.minutes, addDays(n.date, 30));
  res.json({ appointments: rows.map(r => view(req, r)) });
});

function ownedAppt(req) {
  const r = db.prepare(`${SEL} WHERE id = ? AND barber_id = ?`).get(+req.params.id, own(req));
  if (!r || r.status === 'cancelled') fail('Appointment not found.', 404);
  return r;
}
// The customer's email is read with the barber's own key, so these emails go out only while the barber is signed in.
function mailCustomer(req, r, kind) {
  const a = view(req, r);
  if (!a.email) return;
  const me = db.prepare('SELECT name FROM barbers WHERE id = ?').get(own(req));
  notify.customerMail({ date: r.date, start_min: r.start_min, barber_name: me.name }, { name: a.name, email: a.email, lang: a.lang, service: a.service_name, service_ro: a.service_name_ro }, kind);
}
router.get('/api/appointments/:id/slots', barberOnly, wrap((req, res) => {
  const r = ownedAppt(req);
  res.json({ slots: slots({ serviceId: 0, barberId: r.barber_id, date: String(req.query.date || ''), ignoreId: r.id, dur: r.end_min - r.start_min, all: true }) });
}));
router.post('/api/appointments/:id/move', barberOnly, wrap((req, res) => {
  const r = ownedAppt(req);
  const date = String(req.body?.date || ''), start = req.body?.start_min;
  if (!validDate(date) || !Number.isInteger(start)) fail('Choose a date and a time.');
  if (!booking.move({ ...r }, date, start)) fail('That time is not free.', 409);
  mailCustomer(req, db.prepare(`${SEL} WHERE id = ?`).get(r.id), 'moved');
  res.json({ ok: true });
}));
router.post('/api/appointments/:id/confirm', barberOnly, wrap((req, res) => {
  const r = ownedAppt(req);
  if (r.status !== 'pending') fail('Only a request waiting for confirmation can be confirmed.', 409);
  booking.setStatus(r.id, 'booked');
  mailCustomer(req, r, 'booked');
  res.json({ ok: true });
}));
router.post('/api/appointments/:id/cancel', barberOnly, wrap((req, res) => {
  const r = ownedAppt(req);
  booking.cancel(r.id);
  mailCustomer(req, r, r.status === 'pending' ? 'declined' : 'cancelled');
  res.json({ ok: true });
}));

// ---- Site text and location ----
router.get('/api/settings', owner, (req, res) => res.json({ fields: C.FIELDS, values: C.getAdminSettings() }));
router.put('/api/settings', owner, wrap((req, res) => {
  try { C.setSettings(req.body || {}); } catch (e) { fail(e.message); }
  res.json({ values: C.getAdminSettings() });
}));

// ---- Section background images ----
router.get('/api/images', owner, (req, res) => res.json({ images: Object.entries(C.IMAGE_SLOTS).map(([slot, s]) =>
  ({ slot, label: s.label, hint: s.hint, minWidth: s.minWidth, url: C.slotUrl(slot) || s.def, pos: C.slotPos(slot), custom: !!C.slotUrl(slot) })) }));
router.post('/api/images/:slot', owner, upload.single('photo'), wrap(async (req, res) => {
  const s = C.IMAGE_SLOTS[req.params.slot];
  if (!s) fail('Unknown image.', 404);
  const url = await saveImage(req.file, { maxWidth: s.maxWidth });
  const old = C.slotUrl(req.params.slot);
  C.setSlot(req.params.slot, url);
  C.resetPos(req.params.slot); // a new photo starts centred
  removeUpload(old);
  res.json({ url });
}));
router.put('/api/images/:slot/pos', owner, wrap((req, res) => {
  if (!C.IMAGE_SLOTS[req.params.slot]) fail('Unknown image.', 404);
  C.setPos(req.params.slot, position(req.body?.pos));
  res.json({ ok: true });
}));
router.delete('/api/images/:slot', owner, wrap((req, res) => {
  if (!C.IMAGE_SLOTS[req.params.slot]) fail('Unknown image.', 404);
  removeUpload(C.slotUrl(req.params.slot));
  C.clearSlot(req.params.slot);
  res.json({ ok: true });
}));

// ---- Services ----
const linkBarbers = (serviceId, ids) => {
  db.prepare('DELETE FROM barber_services WHERE service_id = ?').run(serviceId);
  const add = db.prepare('INSERT OR IGNORE INTO barber_services (barber_id, service_id) SELECT id, ? FROM barbers WHERE id = ?');
  for (const id of ids) add.run(serviceId, id);
};
function readService(b) {
  return {
    name: str(b.name, 80, 'Name', true), description: str(b.description, 200),
    name_ro: str(b.name_ro, 80) || null, description_ro: str(b.description_ro, 200) || null,
    price: int(b.price, 0, 100000, 'Price'), duration: int(b.duration_min, 5, 600, 'Duration'),
    icon: v.ICON_KEYS.includes(b.icon) ? b.icon : 'scissors', sort: int(b.sort ?? 0, 0, 1000, 'Order'), active: b.active ? 1 : 0,
    barbers: Array.isArray(b.barbers) ? b.barbers.map(Number).filter(Number.isInteger) : null,
  };
}
router.get('/api/services', owner, (req, res) => res.json({
  icons: v.ICON_KEYS,
  barbers: db.prepare('SELECT id, name FROM barbers WHERE active = 1 ORDER BY id').all(),
  services: db.prepare('SELECT * FROM services ORDER BY sort, id').all().map(s => ({
    ...s, barbers: db.prepare('SELECT barber_id FROM barber_services WHERE service_id = ?').all(s.id).map(r => r.barber_id) })),
}));
router.post('/api/services', owner, wrap((req, res) => {
  const s = readService(req.body || {});
  const id = db.transaction(() => {
    const id = db.prepare('INSERT INTO services (name, description, name_ro, description_ro, duration_min, price, icon, sort, active) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(s.name, s.description, s.name_ro, s.description_ro, s.duration, s.price, s.icon, s.sort, s.active).lastInsertRowid;
    linkBarbers(id, s.barbers ?? db.prepare('SELECT id FROM barbers WHERE active = 1').all().map(r => r.id));
    return id;
  })();
  res.json({ id });
}));
router.put('/api/services/:id', owner, wrap((req, res) => {
  const id = +req.params.id;
  if (!exists('services', id)) fail('Service not found.', 404);
  const s = readService(req.body || {});
  db.transaction(() => {
    db.prepare('UPDATE services SET name=?, description=?, name_ro=?, description_ro=?, duration_min=?, price=?, icon=?, sort=?, active=? WHERE id=?')
      .run(s.name, s.description, s.name_ro, s.description_ro, s.duration, s.price, s.icon, s.sort, s.active, id);
    if (s.barbers) linkBarbers(id, s.barbers);
  })();
  res.json({ ok: true });
}));
router.delete('/api/services/:id', owner, wrap((req, res) => {
  const id = +req.params.id;
  if (!exists('services', id)) fail('Service not found.', 404);
  // Appointments keep their own copy of the service name and price (encrypted), so a service can simply be deleted.
  db.prepare('DELETE FROM services WHERE id = ?').run(id);
  res.json({ ok: true });
}));

// ---- Team ----
// The owner manages ACCOUNTS (add, suspend, delete) and the public profile text. Weekly hours, days off,
// bookings, numbers and notification settings are the barber's own and are not exposed to the owner.
const canEditBarber = (req, id) => {
  if (!exists('barbers', id)) fail('Team member not found.', 404);
  if (!isOwner(req) && own(req) !== id) fail('You can only edit your own profile.', 403);
};
const ownHours = (req, id) => { if (own(req) !== id) fail('Your schedule is private to you.', 403); };
function teamRow(b, ownerView) {
  const acc = db.prepare('SELECT email, status FROM accounts WHERE barber_id = ?').get(b.id);
  const row = { id: b.id, name: b.name, role: b.role, role_ro: b.role_ro, bio: b.bio, bio_ro: b.bio_ro, photo: b.photo, photo_pos: b.photo_pos, active: b.active, login_email: acc?.email || '', account_status: acc?.status || 'invited' };
  if (ownerView) return row;
  const hours = Array(7).fill(null);
  for (const h of db.prepare('SELECT weekday, opens, closes FROM working_hours WHERE barber_id = ?').all(b.id)) hours[h.weekday] = { opens: h.opens, closes: h.closes };
  return { ...row, hours, timeoff: db.prepare('SELECT id, date, reason FROM time_off WHERE barber_id = ? AND date >= ? ORDER BY date').all(b.id, shopNow().date) };
}
router.get('/api/team', (req, res) => {
  const mine = own(req);
  const rows = mine ? db.prepare('SELECT * FROM barbers WHERE id = ?').all(mine) : db.prepare('SELECT * FROM barbers ORDER BY id').all();
  res.json({ team: rows.map(b => teamRow(b, !mine)), emailInvites: notify.smtp() });
});

function invite(accountId, email, name) {
  const token = K.newToken();
  db.prepare('UPDATE accounts SET invite_hash = ?, invite_exp = ? WHERE id = ?').run(K.hashToken(token), Date.now() + 72 * 3600 * 1000, accountId);
  const url = `${BASE()}/admin/setup#${token}`;
  send(email, `${C.getSettings('en').shop_name}: set up your specialist account`,
    `Hello ${name},\n\nYou have been added as a specialist. Choose your own password here (valid for 3 days):\n${url}\n\nThe page shows you a recovery code once. Keep it safe: it is the only way back in if you forget your password.`);
  // With email set up, the link goes only to the barber, so the owner cannot use it to take the account over.
  return notify.smtp() ? null : url;
}
router.post('/api/team', owner, wrap((req, res) => {
  const name = str(req.body?.name, 80, 'Name', true), email = str(req.body?.email, 120, 'Sign-in email', true).toLowerCase();
  if (!EMAIL.test(email)) fail('Enter a valid sign-in email.');
  if (db.prepare('SELECT 1 FROM accounts WHERE email = ?').get(email)) fail('That email already has a login.', 409);
  const out = db.transaction(() => {
    const id = db.prepare('INSERT INTO barbers (name, role, bio, active) VALUES (?,?,?,0)').run(name, str(req.body?.role, 80), str(req.body?.bio, 1000)).lastInsertRowid;
    db.prepare('INSERT INTO barber_services (barber_id, service_id) SELECT ?, id FROM services WHERE active = 1').run(id);
    for (const d of [2, 3, 4, 5, 6]) db.prepare('INSERT INTO working_hours VALUES (?,?,?,?)').run(id, d, '10:00', '19:00');
    const acc = db.prepare('INSERT INTO accounts (email, barber_id, status) VALUES (?,?,?)').run(email, id, 'invited').lastInsertRowid;
    return { id, acc };
  })();
  res.json({ id: out.id, inviteUrl: invite(out.acc, email, name) });
}));
router.put('/api/team/:id', wrap((req, res) => {
  const id = +req.params.id; canEditBarber(req, id);
  const b = req.body || {};
  db.prepare('UPDATE barbers SET name=?, role=?, bio=?, role_ro=?, bio_ro=? WHERE id=?')
    .run(str(b.name, 80, 'Name', true), str(b.role, 80), str(b.bio, 1000), str(b.role_ro, 80) || null, str(b.bio_ro, 1000) || null, id);
  res.json({ ok: true });
}));
router.post('/api/team/:id/photo', upload.single('photo'), wrap(async (req, res) => {
  const id = +req.params.id; canEditBarber(req, id);
  const url = await saveImage(req.file, { maxWidth: 900 });
  removeUpload(db.prepare('SELECT photo FROM barbers WHERE id = ?').get(id).photo);
  db.prepare('UPDATE barbers SET photo = ?, photo_pos = NULL WHERE id = ?').run(url, id);
  res.json({ url });
}));
router.put('/api/team/:id/photo-pos', wrap((req, res) => {
  const id = +req.params.id; canEditBarber(req, id);
  db.prepare('UPDATE barbers SET photo_pos = ? WHERE id = ?').run(position(req.body?.pos), id);
  res.json({ ok: true });
}));
router.delete('/api/team/:id/photo', wrap((req, res) => {
  const id = +req.params.id; canEditBarber(req, id);
  removeUpload(db.prepare('SELECT photo FROM barbers WHERE id = ?').get(id).photo);
  db.prepare('UPDATE barbers SET photo = NULL, photo_pos = NULL WHERE id = ?').run(id);
  res.json({ ok: true });
}));
// Weekly schedule: days[0..6] (Sunday first), each null for a day off or {opens, closes}. Barber's own only.
router.put('/api/team/:id/hours', barberOnly, wrap((req, res) => {
  const id = +req.params.id; ownHours(req, id);
  const days = req.body?.days;
  if (!Array.isArray(days) || days.length !== 7) fail('Send seven days.');
  const rows = [];
  days.forEach((d, i) => {
    if (!d) return;
    if (!TIME.test(d.opens) || !TIME.test(d.closes) || d.opens >= d.closes) fail('Each working day needs an opening time earlier than its closing time.');
    rows.push([id, i, d.opens, d.closes]);
  });
  db.transaction(() => {
    db.prepare('DELETE FROM working_hours WHERE barber_id = ?').run(id);
    for (const r of rows) db.prepare('INSERT INTO working_hours VALUES (?,?,?,?)').run(...r);
  })();
  res.json({ ok: true });
}));
router.post('/api/team/:id/timeoff', barberOnly, wrap((req, res) => {
  const id = +req.params.id; ownHours(req, id);
  const date = String(req.body?.date || '');
  if (!validDate(date)) fail('Choose a date.');
  const t = db.prepare('INSERT INTO time_off (barber_id, date, reason) VALUES (?,?,?)').run(id, date, str(req.body?.reason, 80));
  // Existing bookings are not cancelled automatically; tell the barber so they can move them.
  res.json({ id: t.lastInsertRowid, booked: db.prepare("SELECT COUNT(*) AS n FROM appointments WHERE barber_id = ? AND date = ? AND status IN ('booked','pending')").get(id, date).n });
}));
router.delete('/api/timeoff/:id', barberOnly, wrap((req, res) => {
  const t = db.prepare('SELECT * FROM time_off WHERE id = ?').get(+req.params.id);
  if (!t) fail('Not found.', 404);
  ownHours(req, t.barber_id);
  db.prepare('DELETE FROM time_off WHERE id = ?').run(t.id);
  res.json({ ok: true });
}));

// ---- Owner: invitations, suspend, reset, delete ----
const accountOf = id => { const a = db.prepare('SELECT a.*, b.name FROM accounts a JOIN barbers b ON b.id = a.barber_id WHERE a.barber_id = ?').get(id); if (!a) fail('Team member not found.', 404); return a; };
async function requireOwnerPassword(req) {
  const me = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.session.user.id);
  if (!(await K.checkPassword(String(req.body?.password || ''), me.pw_salt, me.pw_hash))) fail('Your admin password is wrong.', 403);
}
router.post('/api/team/:id/invite', owner, wrap((req, res) => {
  const a = accountOf(+req.params.id);
  if (a.status !== 'invited') fail('This specialist has already set up their account.', 409);
  res.json({ inviteUrl: invite(a.id, a.email, a.name) });
}));
router.post('/api/team/:id/suspend', owner, wrap((req, res) => {
  const a = accountOf(+req.params.id), suspend = req.body?.suspended === true;
  if (a.status === 'invited') fail('This specialist has not set up their account yet.', 409);
  db.transaction(() => {
    db.prepare('UPDATE accounts SET status = ? WHERE id = ?').run(suspend ? 'suspended' : 'active', a.id);
    db.prepare('UPDATE barbers SET active = ? WHERE id = ?').run(suspend ? 0 : 1, a.barber_id); // hidden from the site and not bookable
  })();
  if (suspend) session.destroyUser(a.id);
  res.json({ ok: true });
}));
// A barber who lost BOTH the password and the recovery code cannot get their old appointments back (nobody can).
// This wipes their appointments and starts again with a fresh invitation.
router.post('/api/team/:id/reset', owner, wrap(async (req, res) => {
  const a = accountOf(+req.params.id);
  if (String(req.body?.confirm || '').trim().toLowerCase() !== a.email) fail("Type the barber's sign-in email to confirm.");
  await requireOwnerPassword(req);
  db.transaction(() => {
    db.prepare('DELETE FROM appointments WHERE barber_id = ?').run(a.barber_id);
    db.prepare("UPDATE accounts SET status = 'invited', pw_salt = NULL, pw_hash = NULL, pub_key = NULL, kdf_salt = NULL, enc_priv = NULL, rec_salt = NULL, enc_priv_rec = NULL WHERE id = ?").run(a.id);
    db.prepare('UPDATE barbers SET active = 0, notify_enc = NULL WHERE id = ?').run(a.barber_id);
  })();
  session.destroyUser(a.id);
  res.json({ inviteUrl: invite(a.id, a.email, a.name) });
}));
router.delete('/api/team/:id', owner, wrap(async (req, res) => {
  const a = accountOf(+req.params.id);
  if (String(req.body?.confirm || '').trim().toLowerCase() !== a.email) fail("Type the barber's sign-in email to confirm.");
  await requireOwnerPassword(req);
  const b = db.prepare('SELECT photo FROM barbers WHERE id = ?').get(a.barber_id);
  const photos = db.prepare('SELECT url FROM gallery WHERE barber_id = ?').all(a.barber_id);
  db.prepare('DELETE FROM barbers WHERE id = ?').run(a.barber_id); // cascades: account, hours, days off, services links, gallery, appointments
  removeUpload(b?.photo); for (const p of photos) removeUpload(p.url);
  session.destroyUser(a.id);
  res.json({ ok: true });
}));

// ---- Testimonials ----
function readQuote(b) {
  return { name: str(b.name, 80, 'Name', true), label: str(b.label, 80), quote: str(b.quote, 500, 'Review', true),
    label_ro: str(b.label_ro, 80) || null, quote_ro: str(b.quote_ro, 500) || null, sort: int(b.sort ?? 0, 0, 1000, 'Order'), active: b.active ? 1 : 0 };
}
router.get('/api/testimonials', owner, (req, res) => res.json({ testimonials: db.prepare('SELECT * FROM testimonials ORDER BY sort, id').all() }));
router.post('/api/testimonials', owner, wrap((req, res) => {
  const t = readQuote(req.body || {});
  res.json({ id: db.prepare('INSERT INTO testimonials (name, label, quote, label_ro, quote_ro, sort, active) VALUES (?,?,?,?,?,?,?)').run(t.name, t.label, t.quote, t.label_ro, t.quote_ro, t.sort, t.active).lastInsertRowid });
}));
router.put('/api/testimonials/:id', owner, wrap((req, res) => {
  const t = readQuote(req.body || {});
  if (!db.prepare('UPDATE testimonials SET name=?, label=?, quote=?, label_ro=?, quote_ro=?, sort=?, active=? WHERE id=?').run(t.name, t.label, t.quote, t.label_ro, t.quote_ro, t.sort, t.active, +req.params.id).changes) fail('Not found.', 404);
  res.json({ ok: true });
}));
router.delete('/api/testimonials/:id', owner, (req, res) => { db.prepare('DELETE FROM testimonials WHERE id = ?').run(+req.params.id); res.json({ ok: true }); });

// ---- Gallery ----
router.get('/api/gallery', (req, res) => {
  const own = req.session.user.barber_id;
  res.json({ photos: db.prepare(`SELECT g.*, b.name AS barber_name FROM gallery g LEFT JOIN barbers b ON b.id = g.barber_id
    ${own ? 'WHERE g.barber_id = ?' : ''} ORDER BY g.id DESC`).all(...(own ? [own] : [])) });
});
router.post('/api/gallery', upload.single('photo'), wrap(async (req, res) => {
  const barberId = req.session.user.barber_id || Number(req.body?.barber_id) || null;
  if (barberId && !exists('barbers', barberId)) fail('Pick a specialist from the list.');
  const url = await saveImage(req.file, { maxWidth: 1400, thumb: 640 });
  db.prepare('INSERT INTO gallery (barber_id, url, caption, tag, caption_ro, tag_ro) VALUES (?,?,?,?,?,?)')
    .run(barberId, url, str(req.body?.caption, 200), str(req.body?.tag, 80), str(req.body?.caption_ro, 200) || null, str(req.body?.tag_ro, 80) || null);
  res.json({ url });
}));
function ownedPhoto(req) {
  const g = db.prepare('SELECT * FROM gallery WHERE id = ?').get(+req.params.id);
  const own = req.session.user.barber_id;
  if (!g || (own && g.barber_id !== own)) fail('Photo not found.', 404);
  return g;
}
router.put('/api/gallery/:id/pos', wrap((req, res) => {
  const g = ownedPhoto(req);
  db.prepare('UPDATE gallery SET pos = ? WHERE id = ?').run(position(req.body?.pos), g.id);
  res.json({ ok: true });
}));
router.put('/api/gallery/:id', wrap((req, res) => {
  const g = ownedPhoto(req);
  db.prepare('UPDATE gallery SET tag = ?, caption = ?, tag_ro = ?, caption_ro = ? WHERE id = ?')
    .run(str(req.body?.tag, 80), str(req.body?.caption, 200), str(req.body?.tag_ro, 80) || null, str(req.body?.caption_ro, 200) || null, g.id);
  res.json({ ok: true });
}));
router.delete('/api/gallery/:id', wrap((req, res) => {
  const g = ownedPhoto(req);
  db.prepare('DELETE FROM gallery WHERE id = ?').run(g.id);
  removeUpload(g.url);
  res.json({ ok: true });
}));

// ---- Dashboard numbers and CSV downloads: each barber sees only their own ----
function period(req) {
  const def = stats.monthRange(shopNow().date);
  return { from: String(req.query.from || def.from), to: String(req.query.to || def.to), barberId: own(req), priv: req.session.priv };
}
router.get('/api/stats', barberOnly, wrap((req, res) => {
  res.json({ ...stats.overview(period(req)), currency: C.getSettings().currency });
}));
router.get('/api/export.csv', barberOnly, wrap((req, res) => {
  const kind = String(req.query.kind || 'appointments');
  const p = period(req);
  const rows = stats.exportRows(kind, { ...p, lang: req.query.lang === 'ro' ? 'ro' : 'en' });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${kind}-${p.from}_${p.to}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(toCsv(rows, req.query.sep === ';' ? ';' : ','));
}));

// ---- How this barber hears about new bookings, and how bookings work for them ----
router.get('/api/notify', barberOnly, (req, res) => {
  const ch = notify.getChannels(own(req)), acc = db.prepare('SELECT email FROM accounts WHERE barber_id = ?').get(own(req));
  const b = db.prepare('SELECT booking_mode, notify_lang FROM barbers WHERE id = ?').get(own(req));
  res.json({
    booking_mode: b.booking_mode, notify_lang: b.notify_lang,
    email: { enabled: ch.email ? !!ch.email.enabled : true, to: ch.email?.to || acc.email },
    whatsapp: { enabled: !!ch.whatsapp?.enabled && !!ch.whatsapp?.verified, to: ch.whatsapp?.to || '', verified: !!ch.whatsapp?.verified },
    callmebot: { enabled: !!ch.callmebot?.enabled, phone: ch.callmebot?.phone || '', saved: !!ch.callmebot?.apikey },
    available: { emailReal: notify.smtp(), whatsapp: WA.isOpen(), whatsappState: WA.status().state },
  });
});
router.put('/api/notify', barberOnly, wrap((req, res) => {
  const b = req.body || {}, ch = notify.getChannels(own(req));
  const to = str(b.email?.to, 120, 'Email');
  if (to && !EMAIL.test(to)) fail('Enter a valid email address.');
  ch.email = { enabled: !!b.email?.enabled, to };
  if (ch.whatsapp) ch.whatsapp.enabled = !!b.whatsapp?.enabled && !!ch.whatsapp.verified; // only a verified number can be switched on
  if (ch.callmebot) ch.callmebot.enabled = !!b.callmebot?.enabled;
  db.transaction(() => {
    notify.setChannels(own(req), ch);
    db.prepare('UPDATE barbers SET booking_mode = ?, notify_lang = ? WHERE id = ?').run(b.booking_mode === 'request' ? 'request' : 'instant', b.notify_lang === 'ro' ? 'ro' : 'en', own(req));
  })();
  res.json({ ok: true });
}));
// WhatsApp number: first a 6-digit code is sent to it, and only after the barber types it in is the number used.
router.post('/api/notify/whatsapp-code', barberOnly, limiter(10, 60 * 60 * 1000), wrap(async (req, res) => {
  const phone = str(req.body?.phone, 20, 'WhatsApp number', true);
  if (!PHONE.test(phone)) fail('Enter a valid WhatsApp number, with country code.');
  const lang = db.prepare('SELECT notify_lang FROM barbers WHERE id = ?').get(own(req)).notify_lang;
  await WA.sendVerification(own(req), phone, lang);
  const ch = notify.getChannels(own(req));
  ch.whatsapp = { enabled: false, verified: false, to: phone, pending: true }; // a changed number stops being used until verified
  notify.setChannels(own(req), ch);
  res.json({ ok: true });
}));
router.post('/api/notify/whatsapp-verify', barberOnly, limiter(20, 60 * 60 * 1000), wrap((req, res) => {
  const digits = WA.checkVerification(own(req), req.body?.code);
  const ch = notify.getChannels(own(req));
  if (!ch.whatsapp?.pending || notify.waDigits(ch.whatsapp.to) !== digits) fail('Send a new code to your number first.');
  ch.whatsapp = { enabled: true, verified: true, to: ch.whatsapp.to };
  notify.setChannels(own(req), ch);
  res.json({ ok: true });
}));
// Simple route: CallMeBot. The test message proves the number and key work before anything is switched on.
router.post('/api/notify/callmebot', barberOnly, limiter(10, 60 * 60 * 1000), wrap(async (req, res) => {
  const phone = str(req.body?.phone, 20, 'WhatsApp number', true), apikey = str(req.body?.apikey, 40, 'API key', true);
  if (!PHONE.test(phone)) fail('Enter a valid WhatsApp number, with country code.');
  if (!/^[\w-]+$/.test(apikey)) fail('The API key looks wrong. Copy it exactly from the CallMeBot message.');
  await callmebot.send(phone, apikey, `${C.getSettings('en').shop_name}: test message. Booking messages will arrive here.`);
  const ch = notify.getChannels(own(req));
  ch.callmebot = { enabled: true, phone, apikey };
  notify.setChannels(own(req), ch);
  res.json({ ok: true });
}));
router.post('/api/notify/callmebot-remove', barberOnly, (req, res) => {
  const ch = notify.getChannels(own(req)); delete ch.callmebot; notify.setChannels(own(req), ch); res.json({ ok: true });
});
router.post('/api/notify/whatsapp-remove', barberOnly, (req, res) => {
  const ch = notify.getChannels(own(req)); delete ch.whatsapp; notify.setChannels(own(req), ch); res.json({ ok: true });
});
router.post('/api/notify/test', barberOnly, wrap(async (req, res) => {
  await notify.toBarber(own(req), { subject: 'Test notification', text: "Test: this is how a new booking will reach you.\nThe customer's name, email and phone number will appear here.", waFooter: '' });
  res.json({ ok: true });
}));

// ---- Owner: link the shop's WhatsApp number (used only to send booking messages to barbers) ----
router.get('/api/whatsapp', owner, (req, res) => res.json(WA.status()));
router.post('/api/whatsapp/link', owner, limiter(10, 60 * 60 * 1000), wrap(async (req, res) => {
  await WA.link(str(req.body?.phone, 20, 'WhatsApp number', true));
  res.json(WA.status());
}));
router.post('/api/whatsapp/link-qr', owner, limiter(10, 60 * 60 * 1000), wrap(async (req, res) => { await WA.linkQr(); res.json(WA.status()); }));
router.post('/api/whatsapp/logout', owner, wrap(async (req, res) => { await WA.logout(); res.json(WA.status()); }));

// ---- Contact messages ----
router.get('/api/messages', owner, (req, res) => res.json({ messages: db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 100').all() }));
router.delete('/api/messages/:id', owner, (req, res) => { db.prepare('DELETE FROM messages WHERE id = ?').run(+req.params.id); res.json({ ok: true }); });

module.exports = router;
