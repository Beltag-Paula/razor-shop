// Numbers for a barber's own dashboard and CSV downloads, in the same shape your original dashboard expects.
// Prices and service names are inside the encrypted appointments, so this runs only for a signed-in barber,
// with the private key that their session holds in memory. The owner/admin has no route into this.
// An appointment is "completed" once it has ended and "upcoming" while it is ahead, by the shop's clock.
// Cancelled ones are never earnings; requests still waiting for the barber's call are counted as 'pending'.
const db = require('../db');
const C = require('./crypto');
const { shopNow, daysBetween } = require('./shoptime');
const { validDate, hhmm } = require('./availability');

const bad = msg => Object.assign(new Error(msg), { status: 400 });

function monthRange(date) {
  const first = `${date.slice(0, 7)}-01`;
  const last = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7), 0)).toISOString().slice(0, 10);
  return { from: first, to: last };
}

function readRows(barberId, priv, from, to) {
  return db.prepare('SELECT id, date, start_min, end_min, status, payload, created_ts FROM appointments WHERE barber_id = ? AND date BETWEEN ? AND ? ORDER BY date, start_min')
    .all(barberId, from, to)
    .map(r => { let p = null; try { p = C.open(priv, r.payload, `appt:${barberId}`); } catch { /* unreadable row */ } return { ...r, p }; });
}

function overview({ from, to, barberId, priv }) {
  if (!validDate(from) || !validDate(to) || from > to) throw bad('Choose a valid period.');
  if (daysBetween(from, to) > 366) throw bad('Choose a period of at most one year.');
  const now = shopNow(), year = to.slice(0, 4);
  const lo = from < `${year}-01-01` ? from : `${year}-01-01`, hi = to > `${year}-12-31` ? to : `${year}-12-31`;
  const rows = readRows(barberId, priv, lo, hi);
  const done = r => r.date < now.date || (r.date === now.date && r.end_min <= now.minutes);
  const blank = () => ({ completed: 0, upcoming: 0, revenue_done: 0, revenue_expected: 0 });

  const me = db.prepare('SELECT id, name, active FROM barbers WHERE id = ?').get(barberId);
  const b = { id: me.id, name: me.name, active: me.active, cancelled: 0, pending: 0, ...blank() };
  const services = new Map(), daily = new Map(), monthly = new Map();
  const bump = (map, key) => map.get(key) || (map.set(key, blank()), map.get(key));
  const add = (e, r, price) => { if (done(r)) { e.completed++; e.revenue_done += price; } else { e.upcoming++; e.revenue_expected += price; } };

  for (const r of rows) {
    const inRange = r.date >= from && r.date <= to;
    if (r.status === 'cancelled') { if (inRange) b.cancelled++; continue; }
    if (r.status === 'pending') { if (inRange) b.pending++; continue; }
    const price = r.p?.price || 0;
    add(bump(monthly, r.date.slice(0, 7)), r, price);
    if (!inRange) continue;
    add(b, r, price); add(bump(daily, r.date), r, price);
    const key = r.p?.service_id ?? r.p?.service ?? '?';
    const s = services.get(key) || { id: key, name: r.p?.service || '?', name_ro: r.p?.service_ro || null, total: 0, revenue: 0 };
    s.total++; s.revenue += price; services.set(key, s);
  }
  b.total = b.completed + b.upcoming;
  const totals = { total: b.total, completed: b.completed, upcoming: b.upcoming, cancelled: b.cancelled, pending: b.pending, revenue_done: b.revenue_done, revenue_expected: b.revenue_expected };
  return {
    range: { from, to }, today: now.date, year, totals, barbers: [b],
    services: [...services.values()].sort((x, y) => y.total - x.total),
    daily: [...daily].map(([day, v]) => ({ day, barber_id: barberId, ...v })).sort((x, y) => x.day.localeCompare(y.day)),
    monthly: [...monthly].map(([month, v]) => ({ month, barber_id: barberId, ...v })).sort((x, y) => x.month.localeCompare(y.month)).filter(m => m.month.startsWith(year)),
  };
}

const HEAD = {
  en: { date: 'Date', start: 'Start', end: 'End', barber: 'Barber', service: 'Service', price: 'Price', status: 'Status', customer: 'Customer', phone: 'Phone', email: 'Email', booked: 'Booked on', month: 'Month',
    total: 'Appointments', completed: 'Completed', upcoming: 'Upcoming', cancelled: 'Cancelled', earned: 'Earned', expected: 'Expected', revenue: 'Total revenue',
    s_done: 'completed', s_upcoming: 'upcoming', s_cancelled: 'cancelled', s_pending: 'to confirm' },
  ro: { date: 'Data', start: 'Început', end: 'Sfârșit', barber: 'Frizer', service: 'Serviciu', price: 'Preț', status: 'Stare', customer: 'Client', phone: 'Telefon', email: 'E-mail', booked: 'Programat la', month: 'Luna',
    total: 'Programări', completed: 'Efectuate', upcoming: 'Viitoare', cancelled: 'Anulate', earned: 'Încasat', expected: 'Estimat', revenue: 'Venit total',
    s_done: 'efectuată', s_upcoming: 'viitoare', s_cancelled: 'anulată', s_pending: 'de confirmat' },
};

// Rows for a CSV download. kind: appointments | summary | daily | monthly
function exportRows(kind, { from, to, barberId, priv, lang = 'en' }) {
  const H = HEAD[lang] || HEAD.en;
  const data = overview({ from, to, barberId, priv });
  const name = data.barbers[0].name;
  if (kind === 'summary') {
    return [[H.barber, H.total, H.completed, H.upcoming, H.cancelled, H.earned, H.expected, H.revenue],
      ...data.barbers.map(b => [b.name, b.total, b.completed, b.upcoming, b.cancelled, b.revenue_done, b.revenue_expected, b.revenue_done + b.revenue_expected])];
  }
  if (kind === 'daily' || kind === 'monthly') {
    const key = kind === 'daily' ? 'day' : 'month', rows = kind === 'daily' ? data.daily : data.monthly;
    return [[kind === 'daily' ? H.date : H.month, H.barber, H.completed, H.upcoming, H.earned, H.expected, H.revenue],
      ...rows.map(r => [r[key], name, r.completed, r.upcoming, r.revenue_done, r.revenue_expected, r.revenue_done + r.revenue_expected])];
  }
  if (kind === 'appointments') {
    const now = shopNow();
    const state = r => r.status === 'cancelled' ? H.s_cancelled : r.status === 'pending' ? H.s_pending : (r.date < now.date || (r.date === now.date && r.end_min <= now.minutes)) ? H.s_done : H.s_upcoming;
    return [[H.date, H.start, H.end, H.barber, H.service, H.price, H.status, H.customer, H.phone, H.email, H.booked],
      ...readRows(barberId, priv, from, to).map(r => [r.date, hhmm(r.start_min), hhmm(r.end_min), name, (lang === 'ro' && r.p?.service_ro) || r.p?.service || '', r.p?.price ?? 0, state(r), r.p?.name || '', r.p?.phone || '', r.p?.email || '', new Date(r.created_ts).toISOString().slice(0, 16).replace('T', ' ')])];
  }
  throw Object.assign(new Error('Unknown export.'), { status: 404 });
}

module.exports = { overview, exportRows, monthRange, readRows };
