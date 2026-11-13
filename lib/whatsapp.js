// WhatsApp through Baileys (https://github.com/WhiskeySockets/Baileys), an UNOFFICIAL client for the WhatsApp Web
// protocol. The shop links ONE WhatsApp number (like a "linked device"), and the server uses it to:
//   - send each barber their booking messages (name, email, phone, day, hour) on their own WhatsApp,
//   - verify a barber's number with a 6-digit code before anything is sent to it,
//   - understand a barber's reply: "yes" / "da" confirms and "no" / "nu" declines a request waiting for them.
// Risks you accept with Baileys: it is against WhatsApp's terms, a number can be banned, and the linked
// session files in data/whatsapp-auth/ give full control of that WhatsApp account (keep them private).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const C = require('./crypto');
const booking = require('./booking');
const { waDigits } = require('./phone');
const { shopNow } = require('./shoptime');
const { fmtDate, fmtTime } = require('../i18n');

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, '..', 'data', 'whatsapp-auth');
const PACE_MS = process.env.WHATSAPP_PACE_MS !== undefined ? +process.env.WHATSAPP_PACE_MS : 1200; // small pause between messages
const S = { state: 'off', number: '', code: '', qr: '', qrImage: '', error: '' }; // off | unavailable | connecting | pairing | open
let loader = () => import('@whiskeysockets/baileys');          // replaced in tests
let baileys = null, sock = null, retry = 0, retryTimer = null, wantPair = '', pairAsked = false, pairSince = 0, chain = Promise.resolve();
const qrListeners = new Set(); // the headless test script prints the QR from here
const sent = new Map();      // id of a request message we sent -> { barberId, apptId }, so "yes" can answer that exact request
const codes = new Map();     // barberId -> { code, digits, exp, tries }
const codeSends = new Map(); // barberId -> times a code was sent (limits abuse)
const err = (msg, status = 400) => Object.assign(new Error(msg), { status });
const hasSession = () => fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
const wipe = () => fs.rmSync(AUTH_DIR, { recursive: true, force: true });
const status = () => ({ state: S.state, number: S.number, code: S.code, qrImage: S.qrImage, error: S.error });
const isOpen = () => S.state === 'open' && !!sock;

async function connect() {
  if (sock) return;
  clearTimeout(retryTimer);
  try { baileys = baileys || await loader(); }
  catch { S.state = 'unavailable'; S.error = 'The WhatsApp library is not installed. Run: npm install'; return; }
  const make = baileys.default || baileys.makeWASocket;
  fs.mkdirSync(AUTH_DIR, { recursive: true, mode: 0o700 });
  const { state, saveCreds } = await baileys.useMultiFileAuthState(AUTH_DIR);
  let logger; try { logger = require('pino')({ level: process.env.WHATSAPP_DEBUG === 'true' ? 'debug' : 'silent' }); } catch { /* Baileys' own logger */ }
  S.state = 'connecting'; pairAsked = false;
  // A stale built-in WhatsApp Web version is a reported cause of "Couldn't link device", so ask for the current one.
  let version;
  try { const r = await baileys.fetchLatestWaWebVersion?.(); if (Array.isArray(r?.version)) version = r.version; } catch { /* offline: use the library default */ }
  if (process.env.WHATSAPP_DEBUG === 'true') console.log('WhatsApp: using web version', version ? version.join('.') : '(library default)');
  // WhatsApp only accepts a link from a browser identity it knows (a made-up name makes pairing fail).
  const s = make({ auth: state, logger, ...(version ? { version } : {}), browser: baileys.Browsers.ubuntu('Chrome'), syncFullHistory: false, markOnlineOnConnect: false });
  sock = s;
  s.ev.on('creds.update', saveCreds);
  s.ev.on('connection.update', u => { if (s === sock) onConnection(s, state, u).catch(e => console.error('WhatsApp:', e.message)); });
  s.ev.on('messages.upsert', ({ messages, type }) => {
    if (s !== sock || type !== 'notify') return;
    for (const m of messages || []) handleIncoming(s, m).catch(e => console.error('WhatsApp reply:', e.message));
  });
}

async function onConnection(s, state, { connection, lastDisconnect, qr }) {
  if (qr && !state.creds.registered && !wantPair) { // QR linking: WhatsApp renews this code every ~20 seconds
    S.qr = qr; S.state = 'pairing'; S.error = '';
    try { S.qrImage = await require('qrcode').toDataURL(qr, { margin: 1, width: 300 }); } catch { S.qrImage = ''; /* qrcode not installed */ }
    for (const f of qrListeners) f(qr);
  }
  if (qr && !state.creds.registered && wantPair && !pairAsked) {
    pairAsked = true;
    try { S.code = await s.requestPairingCode(wantPair); S.state = 'pairing'; S.error = ''; }
    catch (e) { S.error = e.message; pairAsked = false; }
  }
  if (connection === 'open') {
    Object.assign(S, { state: 'open', error: '', code: '', qr: '', qrImage: '', number: String(s.user?.id || '').split(':')[0].split('@')[0] });
    wantPair = ''; retry = 0;
  }
  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode;
    sock = null;
    console.log(`WhatsApp: connection closed (code ${code ?? 'none'}${lastDisconnect?.error?.message ? ', ' + lastDisconnect.error.message : ''})`);
    if (wantPair || S.state === 'pairing') S.error = `WhatsApp did not accept the link (code ${code ?? 'none'}). This is a known problem of the Baileys library with current WhatsApp versions, not of your phone or number. The simple option (CallMeBot) does not depend on it.`;
    if (code === baileys.DisconnectReason.loggedOut) { wipe(); Object.assign(S, { state: 'off', number: '', code: '', qr: '', qrImage: '' }); return; }
    if (wantPair && Date.now() - pairSince > 5 * 60 * 1000) { wantPair = ''; Object.assign(S, { state: 'off', code: '', error: 'The code expired. Start again.' }); return; }
    if (S.state === 'open') S.state = 'connecting';
    retryTimer = setTimeout(() => connect().catch(e => console.error('WhatsApp:', e.message)), Math.min(1000 * 2 ** retry++, 60000));
    retryTimer.unref?.();
  }
}

// The shop owner links the shop's WhatsApp number: this asks WhatsApp for a pairing code to type on that phone
// (WhatsApp > Linked devices > Link a device > "Link with phone number instead").
async function link(phone) {
  const digits = waDigits(phone);
  if (digits.length < 8 || digits.length > 15) throw err('Enter the WhatsApp number with country code.');
  if (isOpen()) throw err('WhatsApp is already connected. Disconnect it first.');
  wipe(); // a half-finished earlier attempt leaves files that make the next one fail
  wantPair = digits; pairSince = Date.now(); S.code = ''; S.error = '';
  if (sock) { try { sock.end?.(undefined); } catch { /* closing */ } sock = null; }
  await connect();
}
// Link by scanning a QR code (WhatsApp > Settings > Linked devices > Link a device). Most reliable on iPhone.
async function linkQr() {
  if (isOpen()) throw err('WhatsApp is already connected. Disconnect it first.');
  wipe(); // start from a clean slate
  wantPair = ''; S.code = ''; S.qr = ''; S.qrImage = ''; S.error = '';
  if (sock) { try { sock.end?.(undefined); } catch { /* closing */ } sock = null; }
  await connect();
}
async function logout() {
  wantPair = ''; clearTimeout(retryTimer);
  const s = sock; sock = null;
  try { await s?.logout(); } catch { /* already gone */ }
  wipe(); Object.assign(S, { state: 'off', number: '', code: '', qr: '', qrImage: '', error: '' });
}
const autostart = () => { if (hasSession() || process.env.WHATSAPP_AUTOSTART === 'true') connect().catch(e => console.error('WhatsApp:', e.message)); };

// Messages go out one at a time, with a short pause, like a person would send them.
function sendText(digits, text, opts) {
  const job = chain.then(async () => {
    if (!isOpen()) throw err('WhatsApp is not connected.', 409);
    const r = await sock.sendMessage(`${digits}@s.whatsapp.net`, { text }, opts);
    if (PACE_MS) await new Promise(ok => setTimeout(ok, PACE_MS));
    return r?.key?.id || null;
  });
  chain = job.catch(() => {});
  return job;
}
async function onWhatsApp(digits) {
  try { const r = await sock.onWhatsApp(digits); return !(r && r.length && r[0].exists === false); } catch { return true; }
}

// A booking message for a barber. If it is a request waiting for their call, remember which one it was,
// so a reply to this very message ("yes") confirms exactly that request.
async function sendBooking(barberId, to, m) {
  const id = await sendText(waDigits(to), m.waFooter ? `${m.text}\n\n${m.waFooter}` : m.text);
  if (id && m.apptId && m.pending) {
    sent.set(id, { barberId, apptId: m.apptId });
    if (sent.size > 1000) sent.delete(sent.keys().next().value);
  }
}

// ---- Verifying a barber's number ----
const shopName = () => require('../content').getSettings('en').shop_name;
async function sendVerification(barberId, phone, lang) {
  const digits = waDigits(phone);
  if (digits.length < 8 || digits.length > 15) throw err('Enter your WhatsApp number with country code.');
  if (!isOpen()) throw err('The shop WhatsApp is not connected yet. Ask the owner to connect it.', 409);
  const now = Date.now(), recent = (codeSends.get(barberId) || []).filter(t => now - t < 3600e3);
  if (recent.length >= 3) throw err('Too many codes sent. Try again in an hour.', 429);
  if (!(await onWhatsApp(digits))) throw err('That number is not on WhatsApp.');
  const code = String(crypto.randomInt(100000, 1000000));
  codes.set(barberId, { code, digits, exp: now + 10 * 60 * 1000, tries: 0 });
  codeSends.set(barberId, [...recent, now]);
  const ro = lang === 'ro';
  await sendText(digits, ro ? `${shopName()}: codul tău de verificare este ${code}. Introdu-l în panoul tău ca să primești aici mesajele despre programări.` : `${shopName()}: your verification code is ${code}. Enter it in your dashboard to get booking messages here.`);
}
function checkVerification(barberId, code) {
  const v = codes.get(barberId);
  if (!v || v.exp < Date.now()) throw err('That code has expired. Send a new one.');
  if (++v.tries > 5) { codes.delete(barberId); throw err('Too many wrong codes. Send a new one.', 429); }
  const a = Buffer.from(String(code || '').trim()), b = Buffer.from(v.code);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw err('That code is not right.');
  codes.delete(barberId);
  return v.digits;
}

// ---- Replies from barbers ----
const YES = new Set(['yes', 'y', 'da', 'confirm', 'confirma', 'confirmă', 'confirmat', 'ok', '1', '👍']);
const NO = new Set(['no', 'n', 'nu', 'decline', 'refuz', 'refuza', 'refuză', 'refuzat', '2', '👎']);
const TXT = {
  en: { done: w => `✅ Confirmed: ${w}. Please call the customer.`, gone: w => `Declined: ${w}. The hour is free again.`, none: 'No requests are waiting for you.',
    many: n => `You have ${n} requests waiting. Reply YES or NO to the message of the request you mean.`, help: 'Reply YES to confirm a request or NO to decline it.', stale: 'That request was already answered.' },
  ro: { done: w => `✅ Confirmat: ${w}. Te rugăm să suni clientul.`, gone: w => `Refuzat: ${w}. Ora este liberă din nou.`, none: 'Nu ai nicio cerere în așteptare.',
    many: n => `Ai ${n} cereri în așteptare. Răspunde DA sau NU la mesajul cererii la care te referi.`, help: 'Răspunde DA ca să confirmi o cerere sau NU ca să o refuzi.', stale: 'La această cerere s-a răspuns deja.' },
};
const digitsOf = jid => (/@s\.whatsapp\.net$/.test(jid || '') ? String(jid).split('@')[0].split(':')[0] : null);

function barberBySender(list) {
  for (const b of db.prepare('SELECT id, notify_lang, notify_enc FROM barbers WHERE active = 1').all()) {
    const wa = C.decServer(b.notify_enc)?.whatsapp;
    if (wa?.verified && wa.to && list.includes(waDigits(wa.to))) return b;
  }
  return null;
}
async function handleIncoming(s, m) {
  const jid = m.key?.remoteJid || '';
  if (m.key?.fromMe || jid.endsWith('@g.us') || jid === 'status@broadcast' || !m.message) return;
  const text = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim().toLowerCase().replace(/[.!\s]+$/, '');
  const quoted = m.message.extendedTextMessage?.contextInfo?.stanzaId;
  const phones = [m.key.remoteJid, m.key.remoteJidAlt, m.key.participant, m.key.participantAlt].map(digitsOf).filter(Boolean);
  const link = quoted ? sent.get(quoted) : null;

  // Who is this? A reply to one of our request messages identifies the barber; otherwise their verified number does.
  let barber = link ? db.prepare('SELECT id, notify_lang, notify_enc FROM barbers WHERE id = ?').get(link.barberId) : null;
  if (barber && phones.length) { const wa = C.decServer(barber.notify_enc)?.whatsapp; if (!wa?.verified || !phones.includes(waDigits(wa.to))) barber = null; }
  if (!barber) barber = barberBySender(phones);
  if (!barber) return; // not one of our barbers: stay silent
  const T = TXT[barber.notify_lang === 'ro' ? 'ro' : 'en'], lang = barber.notify_lang === 'ro' ? 'ro' : 'en';
  const say = t => s.sendMessage(jid, { text: t }, { quoted: m });
  const yes = YES.has(text), no = NO.has(text);
  if (!yes && !no) return say(T.help);

  const now = shopNow();
  const waiting = db.prepare(`SELECT id, date, start_min, status FROM appointments WHERE barber_id = ? AND status = 'pending' AND (date > ? OR (date = ? AND end_min > ?)) ORDER BY date, start_min`).all(barber.id, now.date, now.date, now.minutes);
  let appt;
  if (link) { appt = db.prepare('SELECT id, date, start_min, status FROM appointments WHERE id = ? AND barber_id = ?').get(link.apptId, barber.id); if (!appt || appt.status !== 'pending') return say(T.stale); }
  else if (waiting.length === 1) appt = waiting[0];
  else return say(waiting.length ? T.many(waiting.length) : T.none);

  booking.setStatus(appt.id, yes ? 'booked' : 'cancelled');
  const when = `${fmtDate(appt.date, lang)} ${fmtTime(appt.start_min)}`;
  return say(yes ? T.done(when) : T.gone(when));
}

module.exports = { status, isOpen, link, linkQr, qrListeners, logout, autostart, connect, sendText, sendBooking, sendVerification, checkVerification, _useLoader: fn => { loader = fn; baileys = null; }, AUTH_DIR };
