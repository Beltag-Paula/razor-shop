// Server-side sessions kept in memory, on purpose: a barber's unlocked private key lives in this Map
// and must never be written to disk. A restart signs everyone out, and that is the intended behaviour.
// req.session = { user: { id, email, barber_id }, priv, csrf } (user.barber_id is null for the owner/admin).
const crypto = require('crypto');
const db = require('../db');

const IDLE_MS = 30 * 60 * 1000, ABSOLUTE_MS = 12 * 3600 * 1000;
const PROD = process.env.NODE_ENV === 'production';
const NAME = PROD ? '__Host-sid' : 'sid';
const sessions = new Map();

const cookieOf = req => {
  const m = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(NAME + '='));
  return m ? m.slice(NAME.length + 1) : null;
};
const setCookie = (res, value, maxAge) => res.append('Set-Cookie',
  `${NAME}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${PROD ? '; Secure' : ''}`);

function create(res, account, priv = null) {
  const sid = crypto.randomBytes(32).toString('base64url');
  const s = { user: { id: account.id, email: account.email, barber_id: account.barber_id || null }, priv,
    csrf: crypto.randomBytes(24).toString('base64url'), created: Date.now(), last: Date.now() };
  sessions.set(sid, s);
  setCookie(res, sid, ABSOLUTE_MS / 1000);
  return s;
}
function destroy(req, res) {
  const sid = cookieOf(req);
  if (sid) sessions.delete(sid);
  if (res) setCookie(res, '', 0);
}
function destroyUser(accountId, exceptSid) {
  for (const [sid, s] of sessions) if (s.user.id === accountId && sid !== exceptSid) sessions.delete(sid);
}

// Loads the session onto req.session. A deleted or suspended account loses its session at once.
function load(req, res, next) {
  const sid = cookieOf(req), s = sid && sessions.get(sid);
  if (s) {
    const now = Date.now();
    const a = db.prepare('SELECT status FROM accounts WHERE id = ?').get(s.user.id);
    if (now - s.last > IDLE_MS || now - s.created > ABSOLUTE_MS || !a || a.status !== 'active') {
      sessions.delete(sid); setCookie(res, '', 0);
    } else { s.last = now; req.session = s; req.sid = sid; }
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [sid, s] of sessions) if (now - s.last > IDLE_MS || now - s.created > ABSOLUTE_MS) sessions.delete(sid);
}, 60 * 1000).unref();

module.exports = { create, destroy, destroyUser, load };
