// Run on the server if the owner's password is lost:  node scripts/reset-admin.js owner@example.com "a new long password"
// Whoever can run this already controls the server, so it needs no other check. It does not touch any barber data.
const K = require('../lib/crypto');
const db = require('../db');
const [email, pw] = process.argv.slice(2);
if (!email || !pw || pw.length < 12) { console.error('Usage: node scripts/reset-admin.js <email> "<password of 12+ characters>"'); process.exit(1); }
(async () => {
  const h = await K.hashPassword(pw), e = email.toLowerCase();
  const has = db.prepare('SELECT id FROM accounts WHERE barber_id IS NULL AND email = ?').get(e);
  if (has) db.prepare('UPDATE accounts SET pw_salt = ?, pw_hash = ?, failed = 0, locked_until = 0 WHERE id = ?').run(h.pw_salt, h.pw_hash, has.id);
  else db.prepare("INSERT INTO accounts (email, status, pw_salt, pw_hash) VALUES (?, 'active', ?, ?)").run(e, h.pw_salt, h.pw_hash);
  console.log('Owner password set.');
})();
