// All cryptography lives here, using only Node's built-in crypto module.
//
// Passwords      scrypt (N=32768, r=8, p=1), a random salt each.
// Barber data    Every barber has an X25519 key pair. The public key is stored in the clear and used to
//                "seal" each appointment the moment it is booked (ephemeral X25519 + HKDF + AES-256-GCM).
//                The private key is stored only encrypted: once under a key derived from the barber's
//                password, once under a key derived from a recovery code shown a single time.
//                Nobody but the barber (not the admin, not the database file) can read what was sealed.
// Server secrets AES-256-GCM with SERVER_KEY, for the few settings the server must read without a barber
//                being signed in (where to send a notification).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
// Key that encrypts the notification settings at rest (the part the server itself must be able to read).
function loadServerKey() {
  if (process.env.SERVER_KEY) {
    const k = Buffer.from(process.env.SERVER_KEY, 'hex');
    if (k.length !== 32) throw new Error('SERVER_KEY must be 64 hex characters.');
    return k;
  }
  const dir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'server.key');
  if (fs.existsSync(file)) return Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex');
  const k = crypto.randomBytes(32);
  fs.writeFileSync(file, k.toString('hex'), { mode: 0o600 });
  return k;
}
const cfg = { serverKey: loadServerKey() };

const b64 = b => Buffer.from(b).toString('base64');
const unb64 = s => Buffer.from(s, 'base64');
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const kdf = (secret, salt) => new Promise((ok, no) =>
  crypto.scrypt(String(secret).normalize('NFKC'), salt, 32, SCRYPT, (e, k) => (e ? no(e) : ok(k))));

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return { pw_salt: b64(salt), pw_hash: b64(await kdf(pw, salt)) };
}
async function checkPassword(pw, salt, hash) {
  const k = await kdf(pw, unb64(salt)), h = unb64(hash);
  return k.length === h.length && crypto.timingSafeEqual(k, h);
}
// Same cost as a real check, so an unknown email takes as long as a wrong password.
const fakeCheck = () => kdf('not-a-real-password', Buffer.alloc(16));

function aesEnc(key, buf, aad) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (aad) c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]);
}
function aesDec(key, buf, aad) {
  const d = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  if (aad) d.setAAD(Buffer.from(aad));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]);
}

const SPKI = { type: 'spki', format: 'der' }, PKCS8 = { type: 'pkcs8', format: 'der' };
const INFO = Buffer.from('barbershop-seal-v1');
const sealKey = shared => Buffer.from(crypto.hkdfSync('sha256', shared, Buffer.alloc(0), INFO, 32));

// Encrypt an object so only the holder of the private key can read it.
function seal(pubB64, obj, aad) {
  const eph = crypto.generateKeyPairSync('x25519');
  const pub = crypto.createPublicKey({ key: unb64(pubB64), ...SPKI });
  const shared = crypto.diffieHellman({ privateKey: eph.privateKey, publicKey: pub });
  const epub = eph.publicKey.export(SPKI); // 44 bytes
  return b64(Buffer.concat([epub, aesEnc(sealKey(shared), Buffer.from(JSON.stringify(obj)), aad)]));
}
function open(privKey, sealed, aad) {
  const buf = unb64(sealed);
  const epub = crypto.createPublicKey({ key: buf.subarray(0, 44), ...SPKI });
  const shared = crypto.diffieHellman({ privateKey: privKey, publicKey: epub });
  return JSON.parse(aesDec(sealKey(shared), buf.subarray(44), aad).toString());
}

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function newRecoveryCode() {
  const chars = [...crypto.randomBytes(24)].map(b => ALPHA[b & 31]).join(''); // 24 x 5 bits = 120 bits
  return chars.match(/.{4}/g).join('-');
}

// Key material for a new barber account. `code` is shown to the barber once and never stored.
async function newBarberKeys(password) {
  const kp = crypto.generateKeyPairSync('x25519');
  const der = kp.privateKey.export(PKCS8);
  const kdfSalt = crypto.randomBytes(16), recSalt = crypto.randomBytes(16), code = newRecoveryCode();
  return {
    code,
    row: {
      pub_key: b64(kp.publicKey.export(SPKI)),
      kdf_salt: b64(kdfSalt), enc_priv: b64(aesEnc(await kdf(password, kdfSalt), der, 'priv')),
      rec_salt: b64(recSalt), enc_priv_rec: b64(aesEnc(await kdf(normCode(code), recSalt), der, 'priv')),
    },
  };
}
const toKey = der => crypto.createPrivateKey({ key: der, ...PKCS8 });
async function unlock(u, password) { return toKey(aesDec(await kdf(password, unb64(u.kdf_salt)), unb64(u.enc_priv), 'priv')); }
async function unlockWithCode(u, code) { return toKey(aesDec(await kdf(normCode(code), unb64(u.rec_salt)), unb64(u.enc_priv_rec), 'priv')); }
async function rewrap(privKey, password) {
  const salt = crypto.randomBytes(16);
  return { kdf_salt: b64(salt), enc_priv: b64(aesEnc(await kdf(password, salt), privKey.export(PKCS8), 'priv')) };
}

const encServer = obj => b64(aesEnc(cfg.serverKey, Buffer.from(JSON.stringify(obj)), 'srv'));
const decServer = s => { try { return s ? JSON.parse(aesDec(cfg.serverKey, unb64(s), 'srv').toString()) : null; } catch { return null; } };

// What a customer's own link page needs (service, name...) is encrypted with a key made from the link itself.
// The link is never stored (only its hash), so the database alone cannot open it.
const custKey = token => Buffer.from(crypto.hkdfSync('sha256', Buffer.from(String(token)), Buffer.alloc(0), Buffer.from('barbershop-customer-v1'), 32));
const sealForToken = (token, obj) => b64(aesEnc(custKey(token), Buffer.from(JSON.stringify(obj)), 'cust'));
const openWithToken = (token, s) => { try { return JSON.parse(aesDec(custKey(token), unb64(s), 'cust').toString()); } catch { return null; } };

const newToken = () => crypto.randomBytes(24).toString('base64url');
const hashToken = t => crypto.createHash('sha256').update(String(t)).digest('hex');

module.exports = { hashPassword, checkPassword, fakeCheck, seal, open, newBarberKeys, unlock, unlockWithCode, rewrap, encServer, decServer, sealForToken, openWithToken, newToken, hashToken };
