const crypto = require('crypto');
const db = require('../db');
const C = require('./crypto');
const { freeStarts, offeredBy } = require('./availability');
const { shopNow, daysBetween } = require('./shoptime');

const PENDING_HOURS = Math.max(1, parseInt(process.env.PENDING_HOURS ?? '24', 10) || 24);

// Creates the appointment. The customer's details are sealed to the barber's public key right here, so the
// database never holds them in readable form. Returns null if the time is no longer free.
function create({ serviceId, barberId, date, startMin, name, phone, email, lang }) {
  const svc = db.prepare('SELECT name, name_ro, duration_min, price FROM services WHERE id = ? AND active = 1').get(serviceId);
  if (!svc || !offeredBy(serviceId).includes(barberId)) return null;
  const b = db.prepare(`SELECT b.id, b.name, b.booking_mode, b.notify_lang, a.pub_key FROM barbers b JOIN accounts a ON a.barber_id = b.id
    WHERE b.id = ? AND b.active = 1 AND a.status = 'active'`).get(barberId);
  if (!b || !b.pub_key) return null;
  const custToken = crypto.randomBytes(24).toString('hex'), barberToken = crypto.randomBytes(24).toString('hex');
  const status = b.booking_mode === 'request' ? 'pending' : 'booked';
  const payload = C.seal(b.pub_key, { name, phone, email, service_id: serviceId, service: svc.name, service_ro: svc.name_ro, price: svc.price, lang }, `appt:${barberId}`);
  const blob = C.sealForToken(custToken, { name, phone, email, service_id: serviceId, service: svc.name, service_ro: svc.name_ro, lang });
  try {
    const id = db.transaction(() => {
      if (!freeStarts(barberId, serviceId, date).includes(startMin)) return null;
      return db.prepare(`INSERT INTO appointments (barber_id, date, start_min, end_min, status, cust_hash, barber_hash, payload, cust_blob, created_ts)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).run(barberId, date, startMin, startMin + svc.duration_min, status, C.hashToken(custToken), C.hashToken(barberToken), payload, blob, Date.now()).lastInsertRowid;
    })();
    if (!id) return null;
    return { id, status, custToken, barberToken, barberId, barberName: b.name, barberLang: b.notify_lang, service: svc.name, service_ro: svc.name_ro, price: svc.price, date, startMin, endMin: startMin + svc.duration_min };
  } catch (e) {
    if (String(e.code || e.message).includes('CONSTRAINT')) return null; // lost a race for the same slot
    throw e;
  }
}

const BASE = `SELECT a.id, a.barber_id, a.date, a.start_min, a.end_min, a.status, a.cust_blob, b.name AS barber_name, b.notify_lang
  FROM appointments a JOIN barbers b ON b.id = a.barber_id`;
// The customer's page: what the link itself can decrypt (service, name) plus the plain time and state.
function byToken(token) {
  const a = db.prepare(`${BASE} WHERE a.cust_hash = ?`).get(C.hashToken(token));
  if (!a) return null;
  const c = C.openWithToken(token, a.cust_blob) || {};
  return { ...a, token, service_id: c.service_id, service_name: c.service, service_name_ro: c.service_ro, name: c.name || '', phone: c.phone || '', email: c.email || '', lang: c.lang || 'en', duration_min: a.end_min - a.start_min };
}
const byBarberToken = token => db.prepare(`${BASE} WHERE a.barber_hash = ?`).get(C.hashToken(token));

// Same barber, same length, new time. Returns false if the slot is not free.
function move(a, date, startMin) {
  if (a.status === 'cancelled') return false;
  const dur = a.end_min - a.start_min;
  return db.transaction(() => {
    if (!freeStarts(a.barber_id, 0, date, a.id, dur).includes(startMin)) return false;
    db.prepare('UPDATE appointments SET date = ?, start_min = ?, end_min = ? WHERE id = ?').run(date, startMin, startMin + dur, a.id);
    return true;
  })();
}
const setStatus = (id, status) => db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
const cancel = id => setStatus(id, 'cancelled');

// Customers can change appointments online until 2 hours before the start.
const isLocked = a => { const now = shopNow(); return daysBetween(now.date, a.date) * 1440 + a.start_min - now.minutes < 120; };

// A request nobody answered frees its hour again.
const expirePending = () => db.prepare("UPDATE appointments SET status = 'cancelled' WHERE status = 'pending' AND created_ts < ?").run(Date.now() - PENDING_HOURS * 3600 * 1000);
setInterval(() => { try { expirePending(); } catch (e) { console.error(e.message); } }, 5 * 60 * 1000).unref();

module.exports = { create, byToken, byBarberToken, move, cancel, setStatus, isLocked, expirePending, PENDING_HOURS };
