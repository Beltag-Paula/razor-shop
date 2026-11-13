// Tells a barber about a booking without them opening the dashboard.
// Channels (each barber picks their own): email and WhatsApp (through Baileys, see lib/whatsapp.js).
// Messages are built at booking time, when the server briefly has the customer's details in hand.
// The barber's channel settings are encrypted with SERVER_KEY (the server must read them while the barber is
// signed out) and no admin screen shows them.
const db = require('../db');
const C = require('./crypto');
const { send: sendMail } = require('./mail');
const WA = require('./whatsapp');
const callmebot = require('./callmebot');
const { waDigits } = require('./phone');
const { fmtDate, fmtTime, fmtLong, t: tr, prefix } = require('../i18n');
const env = process.env;
const BASE = (env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

// ---- Channel settings (encrypted) ----
const getChannels = barberId => C.decServer(db.prepare('SELECT notify_enc FROM barbers WHERE id = ?').get(barberId)?.notify_enc) || {};
const setChannels = (barberId, ch) => db.prepare('UPDATE barbers SET notify_enc = ? WHERE id = ?').run(C.encServer(ch), barberId);

// m = { subject, text, waFooter?, apptId?, pending? }. Never throws: a failed notification must not break a booking.
async function toBarber(barberId, m) {
  const acc = db.prepare('SELECT email FROM accounts WHERE barber_id = ?').get(barberId);
  const ch = getChannels(barberId), jobs = [];
  if (ch.email ? ch.email.enabled : true) jobs.push(sendMail(ch.email?.to || acc?.email, m.subject, m.text)); // email stays on until the barber turns it off
  if (ch.callmebot?.enabled && ch.callmebot.phone && ch.callmebot.apikey) jobs.push(callmebot.send(ch.callmebot.phone, ch.callmebot.apikey, m.text)); // simple route, no linking
  // WhatsApp only goes to a number the barber verified with a code, and only while the shop's WhatsApp is connected.
  if (ch.whatsapp?.enabled && ch.whatsapp.verified && ch.whatsapp.to && WA.isOpen()) jobs.push(WA.sendBooking(barberId, ch.whatsapp.to, m));
  for (const r of await Promise.allSettled(jobs)) if (r.status === 'rejected') console.error('Notify failed:', r.reason?.message || r.reason);
}

// ---- Texts for the barber (their own language setting) ----
const L = {
  en: { request: 'New booking REQUEST', instant: 'New booking', moved: 'Appointment moved by the customer', cancelled: 'Appointment cancelled by the customer',
    wants: (c, svc, when) => `${c.name} (${c.email || 'no email'}, ${c.phone}) wants to book ${svc} with you on ${when}.`,
    booked: (c, svc, when) => `${c.name} (${c.email || 'no email'}, ${c.phone}) booked ${svc} with you on ${when}.`,
    call: 'Call to confirm', chat: 'WhatsApp', manage: 'Confirm / decline', note: 'Note', at: 'at',
    reply: 'Reply YES to confirm or NO to decline (answer this message if you have several requests).',
    movedBody: (c, when) => `${c.name} (${c.phone}) moved their appointment to ${when}.`, goneBody: (c, when) => `${c.name} (${c.phone}) cancelled the appointment on ${when}.` },
  ro: { request: 'Cerere nouă de programare', instant: 'Programare nouă', moved: 'Programare mutată de client', cancelled: 'Programare anulată de client',
    wants: (c, svc, when) => `${c.name} (${c.email || 'fără e-mail'}, ${c.phone}) vrea să se programeze la tine pentru ${svc}, ${when}.`,
    booked: (c, svc, when) => `${c.name} (${c.email || 'fără e-mail'}, ${c.phone}) s-a programat la tine pentru ${svc}, ${when}.`,
    call: 'Sună pentru confirmare', chat: 'WhatsApp', manage: 'Confirmă / refuză', note: 'Mențiune', at: 'la ora',
    reply: 'Răspunde DA pentru confirmare sau NU pentru refuz (răspunde la acest mesaj dacă ai mai multe cereri).',
    movedBody: (c, when) => `${c.name} (${c.phone}) și-a mutat programarea pe ${when}.`, goneBody: (c, when) => `${c.name} (${c.phone}) a anulat programarea din ${when}.` },
};
const link = token => `${BASE}/action#${token}`;
const when = (date, startMin, lang) => `${fmtDate(date, lang)} ${L[lang].at} ${fmtTime(startMin)}`;
const lg = l => (l === 'ro' ? 'ro' : 'en');

function newBooking(bk, c) {
  const lang = lg(bk.barberLang), x = L[lang], w = when(bk.date, bk.startMin, lang), pending = bk.status === 'pending';
  const svc = lang === 'ro' && bk.service_ro ? bk.service_ro : bk.service;
  const lines = [pending ? x.request : x.instant, '', (pending ? x.wants : x.booked)(c, svc, w)];
  if (c.note) lines.push(`${x.note}: ${c.note}`);
  lines.push('', `${x.call}: ${c.phone}`, `${x.chat}: https://wa.me/${waDigits(c.phone)}`, '', `${x.manage}: ${link(bk.barberToken)}`);
  return { subject: `${pending ? x.request : x.instant}: ${c.name}, ${fmtDate(bk.date, lang)} ${fmtTime(bk.startMin)}`, text: lines.join('\n'),
    apptId: bk.id, pending, waFooter: pending ? x.reply : '' }; // on WhatsApp the barber can simply answer YES or NO
}
// The customer changed their own booking from their private link, so we can name them.
function changedByCustomer(kind, a, c) {
  const lang = lg(a.notify_lang), x = L[lang], w = when(a.date, a.start_min, lang);
  const head = kind === 'moved' ? x.moved : x.cancelled;
  return { subject: `${head}: ${c.name}`, text: `${head}\n\n${(kind === 'moved' ? x.movedBody : x.goneBody)(c, w)}\n${x.chat}: https://wa.me/${waDigits(c.phone)}` };
}

// ---- Emails to the customer ----
function customerMail(a, c, kind) {
  if (!c.email) return;
  const lang = lg(c.lang), svc = lang === 'ro' && c.service_ro ? c.service_ro : c.service;
  const w = `${fmtLong(a.date, lang)}, ${fmtTime(a.startMin ?? a.start_min)}`;
  const link = c.token ? `${BASE}${prefix(lang)}/booking/${c.token}` : '';
  const head = { booked: tr(lang, 'mConfirmed'), requested: tr(lang, 'mRequested'), moved: tr(lang, 'mMoved'), cancelled: tr(lang, 'mCancelled'), declined: tr(lang, 'mDeclined') }[kind];
  const lead = kind === 'requested' ? `${tr(lang, 'mRequestedText', { barber: a.barberName || a.barber_name })}\n\n` : '';
  const body = `${lead}${svc ? tr(lang, 'mWith', { service: svc, barber: a.barberName || a.barber_name }) + '\n' : ''}${w}${link && kind !== 'cancelled' && kind !== 'declined' ? `\n\n${tr(lang, 'mLink', { link })}` : ''}`;
  return sendMail(c.email, `${head}: ${fmtDate(a.date, lang)} ${fmtTime(a.startMin ?? a.start_min)}`, body);
}

module.exports = { toBarber, newBooking, changedByCustomer, customerMail, getChannels, setChannels, smtp: () => !!env.SMTP_HOST, waDigits };
