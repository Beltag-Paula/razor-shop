// End-to-end check of roles, encryption and booking rules. Run: npm test
process.env.DB_FILE = require('path').join(require('os').tmpdir(), `razor-test-${process.pid}.db`);
process.env.SERVER_KEY = 'ab'.repeat(32);
process.env.ADMIN_EMAIL = 'owner@test.local';
process.env.ADMIN_PASSWORD = 'correct horse battery staple';
process.env.TZ = 'Europe/Bucharest';
process.env.BASE_URL = 'http://localhost:3000';
process.env.WHATSAPP_AUTH_DIR = require('path').join(require('os').tmpdir(), `razor-wa-${process.pid}`);
process.env.WHATSAPP_PACE_MS = '0';
const fs = require('fs');
const assert = require('assert');
const { start } = require('../server');
const db = require('../db');
const booking = require('../lib/booking');
const notify = require('../lib/notify');
const WA = require('../lib/whatsapp');
const { EventEmitter } = require('events');

// A stand-in for Baileys (the real one needs a phone and the internet): it records what the server sends and lets the test play incoming messages.
const outbox = []; let fake = null, lastOpts = null;
WA._useLoader(async () => ({
  default: opts => {
    lastOpts = opts;
    fake = { ev: new EventEmitter(), user: { id: '40700000000:3@s.whatsapp.net' },
      sendMessage: async (jid, c, o) => { const id = `M${outbox.length + 1}`; outbox.push({ jid, text: c.text, id, quoted: o?.quoted?.key?.id }); return { key: { id } }; },
      requestPairingCode: async () => 'ABCD1234', onWhatsApp: async () => [{ exists: true }], logout: async () => {}, end() {} };
    return fake;
  },
  useMultiFileAuthState: async () => ({ state: { creds: { registered: false } }, saveCreds: async () => {} }),
  Browsers: { ubuntu: n => ['Ubuntu', n, '22.04.4'] }, DisconnectReason: { loggedOut: 401 }, fetchLatestWaWebVersion: async () => ({ version: [2, 3000, 123456], isLatest: true }),
}));
const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));
const incoming = (from, text, quotedId, extra = {}) => fake.ev.emit('messages.upsert', { type: 'notify', messages: [{ key: { remoteJid: `${from}@s.whatsapp.net`, fromMe: false, id: `IN${Math.random()}`, ...extra }, message: quotedId ? { extendedTextMessage: { text, contextInfo: { stanzaId: quotedId } } } : { conversation: text } }] });
const { shopNow, addDays, weekdayOf } = require('../lib/shoptime');

let base, ok = 0;
const check = (cond, label) => { assert.ok(cond, label); ok++; console.log('  ok  ' + label); };

function client() {
  const c = { cookie: '', csrf: '' };
  c.call = async (method, url, body, opts = {}) => {
    const headers = { cookie: c.cookie, 'x-lang': 'en', ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}), ...(c.csrf && !opts.noCsrf ? { 'x-csrf': c.csrf } : {}) };
    const res = await fetch(base + url, { method, headers, body: method === 'GET' ? undefined : JSON.stringify(body || {}), redirect: 'manual' });
    for (const s of res.headers.getSetCookie?.() || []) { const [kv] = s.split(';'); c.cookie = kv.endsWith('=') ? '' : kv; }
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* html */ }
    return { status: res.status, json, text };
  };
  c.login = async (email, password) => {
    const r = await c.call('POST', '/admin/api/login', { email, password });
    if (r.status === 200) { const page = await c.call('GET', '/admin'); c.csrf = /data-csrf="([^"]+)"/.exec(page.text)?.[1] || ''; }
    return r;
  };
  return c;
}

(async () => {
  const server = await start(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const pw1 = 'first barber long password', pw2 = 'second barber long password';

  console.log('Public site (your original front end)');
  const pub = client();
  const home = await pub.call('GET', '/');
  check(home.status === 200 && home.text.includes('id="services"') && home.text.includes('id="team"') && home.text.includes('id="contact"'), 'home page renders its sections');
  check((await pub.call('GET', '/ro/')).text.includes('lang="ro"'), 'Romanian version is served under /ro');
  check((await pub.call('GET', '/book')).status === 200 && (await pub.call('GET', '/privacy')).status === 200, 'booking and privacy pages render');
  check((await pub.call('POST', '/api/contact', { name: 'Ana', phone: '0722 111 222', message: 'Hello there', consent: true })).status === 200, 'contact form works');

  console.log('Owner');
  const owner = client();
  check((await owner.login('owner@test.local', 'wrong password here')).status === 401, 'wrong owner password is refused');
  check((await owner.login('owner@test.local', process.env.ADMIN_PASSWORD)).status === 200, 'owner signs in');
  const inv = [];
  for (const [name, email] of [['Barber One', 'one@test.local'], ['Barber Two', 'two@test.local']]) {
    const r = await owner.call('POST', '/admin/api/team', { name, role: 'Barber', email });
    check(r.status === 200 && r.json.inviteUrl, `owner adds ${name}`);
    inv.push({ id: r.json.id, token: r.json.inviteUrl.split('#')[1] });
  }
  check(!(await pub.call('GET', '/')).text.includes('Barber One'), 'a barber is not on the site before setting up');
  check((await owner.call('POST', '/admin/api/team', { name: 'Dup', email: 'one@test.local' })).status === 409, 'duplicate email refused');

  console.log('Invitations and sign-in');
  check((await client().call('POST', '/admin/api/setup', { token: inv[0].token, password: 'short' })).status === 400, 'short password refused');
  const s1 = await client().call('POST', '/admin/api/setup', { token: inv[0].token, password: pw1 });
  await client().call('POST', '/admin/api/setup', { token: inv[1].token, password: pw2 });
  check(/^([A-Z2-9]{4}-){5}[A-Z2-9]{4}$/.test(s1.json.recoveryCode), 'barber gets a recovery code');
  check((await client().call('POST', '/admin/api/setup', { token: inv[0].token, password: pw1 })).status === 404, 'invitation works only once');
  const b1 = client(), b2 = client();
  check((await b1.login('one@test.local', pw1)).status === 200 && (await b2.login('two@test.local', pw2)).status === 200, 'both barbers sign in');
  check((await pub.call('GET', '/')).text.includes('Barber One'), 'a barber appears on the site once set up');

  console.log('Customer booking');
  const [barber1, barber2] = inv.map(x => x.id);
  const month = shopNow().date.slice(0, 7), nextMonth = addDays(`${month}-28`, 8).slice(0, 7);
  let days = (await pub.call('GET', `/api/days?service=1&barber=${barber1}&month=${month}`)).json.days;
  if (!days.length) days = (await pub.call('GET', `/api/days?service=1&barber=${barber1}&month=${nextMonth}`)).json.days;
  const earliest = addDays(shopNow().date, 2); // far enough ahead that the 2-hour online-change lock does not apply
  if (!days.some(d => d >= earliest)) days = (await pub.call('GET', `/api/days?service=1&barber=${barber1}&month=${nextMonth}`)).json.days;
  const date = days.find(d => d >= earliest);
  check(!!date && weekdayOf(date) >= 2, 'free days come from the barber\'s own hours');
  const slot = (await pub.call('GET', `/api/slots?service=1&barber=${barber1}&date=${date}`)).json.slots[0];
  const book = (barber, start, extra = {}) => pub.call('POST', '/api/book', { service: 1, barber, date, start_min: start, name: 'Ion Popescu', phone: '0722 123 456', email: 'ion@example.com', consent: true, ...extra });
  const r1 = await book(barber1, slot.start_min);
  check(r1.status === 200 && r1.json.status === 'booked', 'instant booking is confirmed');
  check((await book(barber1, slot.start_min)).status === 409, 'the same hour cannot be booked twice');
  check((await book(barber1, slot.start_min + 15, { name: 'X' })).status === 400, 'bad details are refused');
  check((await book(barber1, slot.start_min + 120, { consent: false })).status === 400, 'consent is required');
  await b2.call('PUT', '/admin/api/notify', { booking_mode: 'request', notify_lang: 'ro', email: { enabled: true, to: '' } });
  const r2 = await book(barber2, slot.start_min);
  check(r2.status === 200 && r2.json.status === 'pending', 'request-mode barber gets a pending booking');
  check((await pub.call('GET', `/api/slots?service=1&barber=${barber2}&date=${date}&all=1`)).json.slots.find(s => s.start_min === slot.start_min)?.free === false, 'a pending request holds the hour');

  console.log('Encryption');
  const rows = db.prepare('SELECT payload, cust_blob FROM appointments').all();
  check(rows.length === 2 && rows.every(r => !/Ion|Popescu|0722|example\.com|Haircut/i.test(r.payload + r.cust_blob)), 'database rows hold no readable customer details');
  db.exec('PRAGMA wal_checkpoint(FULL)');
  const raw = [process.env.DB_FILE, process.env.DB_FILE + '-wal'].filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f).toString('latin1')).join('');
  check(!/Popescu|0722 123 456|ion@example\.com/.test(raw), 'the database file itself holds no readable customer details');

  console.log('Privacy between roles');
  const a1 = (await b1.call('GET', `/admin/api/appointments?date=${date}`)).json.appointments;
  check(a1.length === 1 && a1[0].name === 'Ion Popescu' && a1[0].service_name === 'Haircut and styling', 'barber 1 reads their own appointment');
  const a2 = (await b2.call('GET', `/admin/api/appointments?date=${date}`)).json.appointments;
  check(a2.length === 1 && a2[0].status === 'pending', 'barber 2 reads only their own');
  const id1 = db.prepare('SELECT id FROM appointments WHERE barber_id = ?').get(barber1).id;
  check((await b2.call('POST', `/admin/api/appointments/${id1}/cancel`, {})).status === 404, "barber 2 cannot touch barber 1's appointment");
  for (const [m, u] of [['GET', `/admin/api/appointments?date=${date}`], ['GET', '/admin/api/pending'], ['GET', '/admin/api/stats'], ['GET', '/admin/api/export.csv'], ['GET', '/admin/api/notify'], ['PUT', `/admin/api/team/${barber1}/hours`], ['POST', `/admin/api/team/${barber1}/timeoff`]]) {
    check((await owner.call(m, u, {})).status === 403, `owner is refused: ${m} ${u.split('?')[0]}`);
  }
  const team = (await owner.call('GET', '/admin/api/team')).text;
  check(!/Ion|0722|hours|timeoff|price|opens/i.test(team), 'owner team list shows accounts only, nothing about schedules or activity');
  check((await b1.call('GET', '/admin/api/messages')).status === 403 && (await b1.call('POST', '/admin/api/team', { name: 'x', email: 'x@y.zz' })).status === 403, 'barber cannot use owner functions');
  check((await b2.call('PUT', `/admin/api/team/${barber1}`, { name: 'Hacked' })).status === 403, "barber 2 cannot edit barber 1's profile");
  check((await b1.call('POST', '/admin/api/services', { name: 'x', price: 1, duration_min: 30 }, { noCsrf: true })).status === 403, 'changes without the CSRF token are refused');
  check((await pub.call('GET', `/admin/api/appointments?date=${date}`)).status === 401, 'signed-out visitors are refused');

  console.log('Pending request, one-tap link and stats');
  check((await b2.call('GET', '/admin/api/pending')).json.count === 1, 'pending request is listed');
  check((await b2.call('POST', `/admin/api/appointments/${a2[0].id}/confirm`, {})).status === 200, 'barber confirms the request');
  const st = (await b1.call('GET', `/admin/api/stats?from=${date}&to=${date}`)).json;
  check(st.totals.upcoming === 1 && st.totals.revenue_expected === 120 && st.services[0].name === 'Haircut and styling' && st.barbers.length === 1, "barber 1's numbers count only their own income");
  const csv = await b1.call('GET', `/admin/api/export.csv?from=${date}&to=${date}`);
  check(csv.status === 200 && csv.text.includes('Ion Popescu'), 'barber downloads their own CSV');
  const bk = booking.create({ serviceId: 1, barberId: barber2, date, startMin: slot.start_min + 120, name: 'Maria', phone: '0700 000 111', email: '', lang: 'ro' });
  const view = await pub.call('GET', `/api/action/${bk.barberToken}`);
  check(view.json.status === 'pending' && !JSON.stringify(view.json).includes('Maria'), 'one-tap link shows time and state, no customer details');
  check((await pub.call('POST', `/api/action/${bk.barberToken}`, { do: 'confirm' })).json.status === 'booked', 'barber confirms from the link');
  check((await pub.call('POST', `/api/action/${bk.barberToken}`, { do: 'confirm' })).status === 409, 'confirming twice is refused');
  const msg = notify.newBooking(booking.byBarberToken(bk.barberToken) && { ...bk, status: 'pending' }, { name: 'Maria', phone: '0722 000 111', email: 'm@x.ro', note: '' });
  check(msg.text.includes('https://wa.me/40722000111') && msg.text.includes('Maria') && /\/action#/.test(msg.text), 'notification has name, phone, WhatsApp link and one-tap link');
  check((await pub.call('GET', '/action')).status === 200, 'the one-tap page renders');

  console.log("Customer's own link (original manage page)");
  const page = await pub.call('GET', `/booking/${r1.json.token}`);
  check(page.status === 200 && page.text.includes('Haircut and styling') && page.text.includes('Ion Popescu'), 'customer page shows their service and name from the link');
  const free = (await pub.call('GET', `/api/slots?service=1&barber=${barber1}&date=${date}&token=${r1.json.token}`)).json.slots;
  const target = free.find(s => s.start_min !== slot.start_min && s.start_min > slot.start_min + 60);
  const mv = await pub.call('POST', `/api/booking/${r1.json.token}/move`, { date, start_min: target.start_min }); if (mv.status !== 200) console.log('MOVE', mv.status, mv.text.slice(0, 300));
  check(mv.status === 200, 'customer moves their appointment');
  check((await b1.call('GET', `/admin/api/appointments?date=${date}`)).json.appointments[0].start === `${String(Math.floor(target.start_min / 60)).padStart(2, '0')}:${String(target.start_min % 60).padStart(2, '0')}`, 'the barber sees the new time');
  check((await pub.call('POST', `/api/booking/${r1.json.token}/cancel`, {})).status === 200, 'customer cancels with their private link');
  check((await b1.call('GET', `/admin/api/appointments?date=${date}`)).json.appointments.length === 0, 'cancelled booking leaves the day view');
  const again = await pub.call('GET', `/booking/${r1.json.token}`);
  check(again.text.includes('cancelled') || again.text.includes('Cancelled'), 'customer page then shows it as cancelled');

  console.log('Recovery and password change');
  const rec = client();
  check((await rec.call('POST', '/admin/api/recover', { email: 'one@test.local', code: 'AAAA-AAAA-AAAA-AAAA-AAAA-AAAA', password: 'brand new long password' })).status === 401, 'wrong recovery code refused');
  const newPw = 'brand new long password';
  check((await rec.call('POST', '/admin/api/recover', { email: 'one@test.local', code: s1.json.recoveryCode, password: newPw })).status === 200, 'recovery code sets a new password');
  const again1 = client();
  check((await again1.login('one@test.local', pw1)).status === 401, 'old password no longer works');
  check((await again1.login('one@test.local', newPw)).status === 200, 'new password works');
  const kept = (await again1.call('GET', `/admin/api/stats?from=${date}&to=${date}`)).json;
  check(kept.totals.upcoming === 0 && kept.totals.cancelled === 1, 'history is still readable after recovery');
  check((await again1.call('POST', '/admin/api/password', { current: newPw, next: 'yet another long password' })).status === 200, 'password change works');
  check((await client().login('one@test.local', 'yet another long password')).status === 200, 'barber signs in with the changed password');

  console.log('WhatsApp through Baileys');
  const early = await b2.call('POST', '/admin/api/notify/whatsapp-code', { phone: '0722 333 444' }); if (early.status !== 409) console.log('EARLY', early.status, early.text.slice(0, 200));
  check(early.status === 409, 'a barber cannot verify a number before the shop WhatsApp is linked');
  check((await again1.call('POST', '/admin/api/whatsapp/link', { phone: '0700000000' })).status === 403 && (await again1.call('GET', '/admin/api/whatsapp')).status === 403, 'only the owner can link the shop WhatsApp');
  check((await owner.call('POST', '/admin/api/whatsapp/link', { phone: '12' })).status === 400, 'a bad number is refused');
  require('fs').mkdirSync(process.env.WHATSAPP_AUTH_DIR, { recursive: true }); require('fs').writeFileSync(require('path').join(process.env.WHATSAPP_AUTH_DIR, 'creds.json'), 'left over from a failed attempt');
  check((await owner.call('POST', '/admin/api/whatsapp/link', { phone: '+40 700 000 000' })).status === 200, 'owner asks for a pairing code');
  check(!fs.existsSync(require('path').join(process.env.WHATSAPP_AUTH_DIR, 'creds.json')), 'files left by a failed earlier attempt are cleared first');
  check(JSON.stringify(lastOpts.version) === '[2,3000,123456]' && lastOpts.browser[1] === 'Chrome', 'it asks WhatsApp for the current web version and identifies as Chrome');
  fake.ev.emit('connection.update', { qr: 'qr-data' }); await tick();
  const pairing = (await owner.call('GET', '/admin/api/whatsapp')).json;
  check(pairing.state === 'pairing' && pairing.code === 'ABCD1234', 'the pairing code is shown to the owner');
  fake.ev.emit('connection.update', { connection: 'open' }); await tick();
  check((await owner.call('GET', '/admin/api/whatsapp')).json.state === 'open' && (await owner.call('GET', '/admin/api/whatsapp')).json.number === '40700000000', 'the shop WhatsApp shows as connected');

  check((await b2.call('POST', '/admin/api/notify/whatsapp-code', { phone: '0722 333 444' })).status === 200, 'a barber asks for a verification code');
  const codeMsg = outbox.at(-1), code = /(\d{6})/.exec(codeMsg.text)?.[1];
  check(codeMsg.jid === '40722333444@s.whatsapp.net' && !!code && /verificare/.test(codeMsg.text), 'the code arrives on that number, in the barber\'s language');
  check((await b2.call('PUT', '/admin/api/notify', { booking_mode: 'request', notify_lang: 'ro', email: { enabled: true, to: '' }, whatsapp: { enabled: true } })).status === 200 && (await b2.call('GET', '/admin/api/notify')).json.whatsapp.verified === false, 'an unverified number cannot be switched on');
  check((await b2.call('POST', '/admin/api/notify/whatsapp-verify', { code: '000000' })).status === 400, 'a wrong code is refused');
  check((await b2.call('POST', '/admin/api/notify/whatsapp-verify', { code })).status === 200, 'the right code verifies the number');
  const nb = (await b2.call('GET', '/admin/api/notify')).json;
  check(nb.whatsapp.verified && nb.whatsapp.enabled && nb.available.whatsapp, 'WhatsApp is on for that barber');
  check(!JSON.stringify(await owner.call('GET', '/admin/api/team')).includes('722'), 'the owner cannot see the barber\'s WhatsApp number');

  const startAt = slot.start_min + 240, bookWA = (start, name) => pub.call('POST', '/api/book', { service: 1, barber: barber2, date, start_min: start, name, phone: '0700 111 222', email: `${name}@example.com`, consent: true });
  const statusAt = start => db.prepare('SELECT status FROM appointments WHERE barber_id = ? AND start_min = ?').get(barber2, start)?.status;
  const before = outbox.length;
  await bookWA(startAt, 'Dan'); await tick();
  const req1 = outbox.slice(before).find(m => m.text.includes('Dan'));
  check(req1 && req1.jid === '40722333444@s.whatsapp.net' && /Dan/.test(req1.text) && /0700 111 222/.test(req1.text) && /dan@example\.com/.test(req1.text) && /DA/.test(req1.text), 'a booking request reaches the barber on WhatsApp with name, email, phone and how to answer');
  const sentBeforeOthers = outbox.length;
  incoming('40799999999', 'da'); await tick();
  check(outbox.length === sentBeforeOthers && statusAt(startAt) === 'pending', 'a message from a stranger is ignored');
  incoming('40722333444', 'DA', req1.id); await tick();
  check(statusAt(startAt) === 'booked' && /Confirmat/.test(outbox.at(-1).text) && outbox.at(-1).quoted, 'replying DA to the request confirms it');
  incoming('40722333444', 'da', req1.id); await tick();
  check(/deja/.test(outbox.at(-1).text), 'answering the same request twice is refused politely');

  await bookWA(startAt + 60, 'Eva'); await tick();
  incoming('40722333444', 'nu'); await tick();
  check(statusAt(startAt + 60) === 'cancelled' && /Refuzat/.test(outbox.at(-1).text), 'a plain NO declines the only waiting request');
  await bookWA(startAt + 120, 'Fane'); await tick(); const reqF = outbox.at(-1);
  await bookWA(startAt + 180, 'Gina'); await tick(); const reqG = outbox.at(-1);
  incoming('40722333444', 'da'); await tick();
  check(statusAt(startAt + 120) === 'pending' && statusAt(startAt + 180) === 'pending' && /2/.test(outbox.at(-1).text), 'with several waiting, a plain answer asks which one');
  incoming('123456789', 'da', reqG.id, { remoteJid: '123456789@lid' }); await tick();
  check(statusAt(startAt + 180) === 'booked' && statusAt(startAt + 120) === 'pending', 'a reply to a specific message works even when WhatsApp hides the number');
  incoming('40722333444', 'hello'); await tick();
  check(/DA/.test(outbox.at(-1).text), 'other text gets a short help message');
  check((await b2.call('POST', '/admin/api/notify/whatsapp-code', { phone: '0733 000 111' })).status === 200 && (await b2.call('GET', '/admin/api/notify')).json.whatsapp.verified === false, 'changing the number switches WhatsApp off until it is verified again');
  const before2 = outbox.length;
  await bookWA(startAt + 240, 'Hugo'); await tick();
  check(!outbox.slice(before2).some(m => m.text.includes('Hugo')), 'an unverified number gets no booking messages');
  check((await owner.call('POST', '/admin/api/whatsapp/logout', {})).json.state === 'off', 'owner disconnects the shop WhatsApp');
  check(!fs.existsSync(require('path').join(process.env.WHATSAPP_AUTH_DIR, 'creds.json')), 'the linked session files are removed');

  console.log('WhatsApp without linking (CallMeBot) and QR linking');
  const realFetch = global.fetch, calls = [];
  global.fetch = async (url, o) => { if (String(url).startsWith('https://api.callmebot.com/')) { calls.push(String(url)); return { ok: true, text: async () => (String(url).includes('apikey=BAD') ? 'ERROR: wrong apikey' : 'Message queued.') }; } return realFetch(url, o); };
  check((await again1.call('POST', '/admin/api/notify/callmebot', { phone: '0733 000 111', apikey: 'BAD' })).status === 400, 'a wrong CallMeBot key is refused and nothing is saved');
  check((await again1.call('POST', '/admin/api/notify/callmebot', { phone: '0733 000 111', apikey: '123456' })).status === 200 && /phone=%2B40733000111/.test(calls.at(-1)) && /apikey=123456/.test(calls.at(-1)), 'a good key sends a test message and switches it on');
  const cmbBefore = calls.length;
  const barber1Day = (await pub.call('GET', `/api/slots?service=1&barber=${barber1}&date=${date}`)).json.slots.at(-1);
  await pub.call('POST', '/api/book', { service: 1, barber: barber1, date, start_min: barber1Day.start_min, name: 'Radu', phone: '0700 999 888', email: 'radu@example.com', consent: true }); await tick(100);
  check(calls.length === cmbBefore + 1 && decodeURIComponent(calls.at(-1)).includes('Radu') && decodeURIComponent(calls.at(-1)).includes('0700 999 888'), 'a booking reaches the barber through CallMeBot with name and phone');
  check(!JSON.stringify((await owner.call('GET', '/admin/api/team')).json).includes('123456'), 'the owner cannot see the barber\'s key');
  check((await again1.call('GET', '/admin/api/notify')).json.callmebot.saved === true && !JSON.stringify((await again1.call('GET', '/admin/api/notify')).json).includes('123456'), 'the key is never sent back to the browser');
  check((await again1.call('POST', '/admin/api/notify/callmebot-remove', {})).status === 200, 'a barber can remove it');
  global.fetch = realFetch;
  // QR linking (the shop WhatsApp was disconnected above, so start fresh)
  check((await owner.call('POST', '/admin/api/whatsapp/link-qr', {})).status === 200, 'owner asks for a QR code');
  fake.ev.emit('connection.update', { qr: 'qr-data-1' }); await tick();
  check((await owner.call('GET', '/admin/api/whatsapp')).json.state === 'pairing', 'the page shows the pairing state while waiting for the scan');
  fake.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 408 }, message: 'QR refs attempts ended' } } }); await tick();
  check(/408/.test((await owner.call('GET', '/admin/api/whatsapp')).json.error), 'when WhatsApp refuses the link, the owner sees the code and what to do');
  await tick(1300); // the server retries by itself
  fake.ev.emit('connection.update', { connection: 'open' }); await tick();
  check((await owner.call('GET', '/admin/api/whatsapp')).json.state === 'open', 'after the scan the shop WhatsApp is connected');
  await owner.call('POST', '/admin/api/whatsapp/logout', {});

  console.log('Lockout and reset');
  const lk = client();
  for (let i = 0; i < 5; i++) await lk.call('POST', '/admin/api/login', { email: 'two@test.local', password: 'nope nope nope nope' });
  check((await lk.call('POST', '/admin/api/login', { email: 'two@test.local', password: pw2 })).status === 429, 'account locks after repeated wrong passwords');
  check((await owner.call('POST', `/admin/api/team/${barber1}/suspend`, { suspended: true })).status === 200, 'owner suspends a barber');
  check((await b1.call('GET', '/admin/api/pending')).status === 401 && !(await pub.call('GET', '/')).text.includes('Barber One'), 'a suspended barber is signed out and hidden from the site');
  check((await owner.call('POST', `/admin/api/team/${barber1}/suspend`, { suspended: false })).status === 200, 'owner reactivates them');

  console.log('Owner deletes a barber');
  check((await owner.call('DELETE', `/admin/api/team/${barber2}`, { confirm: 'two@test.local', password: 'wrong' })).status === 403, 'delete needs the owner password');
  check((await owner.call('DELETE', `/admin/api/team/${barber2}`, { confirm: 'two@test.local', password: process.env.ADMIN_PASSWORD })).status === 200 && !db.prepare('SELECT 1 FROM appointments WHERE barber_id = ?').get(barber2), 'barber and all their data are gone');
  check((await b2.call('GET', '/admin/api/pending')).status === 401, "deleted barber's session stops working at once");

  console.log(`\nAll ${ok} checks passed.`);
  server.close(); process.exit(0);
})().catch(e => { console.error('\nFAILED:', e.message, '\n', e.stack?.split('\n')[1]); process.exit(1); });
