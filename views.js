// Server-rendered pages: plain template literals, no template engine.
// Every public page takes a language ('en' or 'ro') and builds its links, text, dates and times from it.
const db = require('./db');
const C = require('./content');
const { shopNow, addDays } = require('./lib/shoptime');
const I = require('./i18n');
const { thumbUrl } = require('./lib/images');
const { LANGS, DEFAULT_LANG, prefix, pick, t, fmtLong, fmtTime, minutes } = I;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Text with blank lines between paragraphs; a line starting with "## " becomes a heading.
const rich = txt => String(txt || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b => {
  if (!b.startsWith('## ')) return `<p>${esc(b).replace(/\n/g, '<br>')}</p>`;
  const [head, ...rest] = b.split('\n');
  return `<h2>${esc(head.slice(3))}</h2>${rest.length ? `<p>${esc(rest.join('\n')).replace(/\n/g, '<br>')}</p>` : ''}`;
}).join('');
const initials = n => esc(String(n).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase());
const plusDays = n => addDays(shopNow().date, n); // today (n = 0) in the shop's time zone, from the server's clock
// Inline CSS that keeps a photo's focal point in view when it is cropped to its frame.
const posStyle = p => { const c = C.cleanPos(p); return c ? ` style="object-position:${c}"` : ''; };
const tel = p => esc(String(p).replace(/[^+\d]/g, ''));

const ICON_KEYS = ['scissors', 'brush', 'dryer', 'polish', 'hand', 'flower'];

// Inline SVG (stroke icons, 24 x 24) so no icon font is needed.
const svg = (inner, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const SVG = {
  instagram: svg('<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>'),
  facebook: svg('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'),
  close: svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  prev: svg('<polyline points="15 18 9 12 15 6"/>'),
  next: svg('<polyline points="9 18 15 12 9 6"/>'),
  quote: svg('<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h4"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h4"/>', 'quote-mark'),
};

// Flags as small inline SVG drawings (not emoji, which Windows does not show as flags).
// The UK flag stands for English and the Romanian flag for Romanian; the language code is always shown next to it.
const FLAGS = {
  en: '<svg class="flag" viewBox="0 0 60 30" width="21" height="14" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><clipPath id="fl-a"><path d="M0,0 v30 h60 v-30 z"/></clipPath><clipPath id="fl-b"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><g clip-path="url(#fl-a)"><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#fl-b)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
  ro: '<svg class="flag" viewBox="0 0 3 2" width="21" height="14" aria-hidden="true"><rect width="1" height="2" fill="#002B7F"/><rect x="1" width="1" height="2" fill="#FCD116"/><rect x="2" width="1" height="2" fill="#CE1126"/></svg>',
};
const LANG_NAME = { en: 'English', ro: 'Română' };

// path is the page's address without a language prefix, so the language switch can point at the same page.
function shell({ lang, title, body, S, path = '/', home = false, extraNav = [], index = true, preload = '', bookBar = false, scripts = '' }) {
  const img = C.imageStyle();
  const u = p => prefix(lang) + p;
  const a = id => (home ? `#${id}` : `${u('/')}#${id}`);
  const base = (process.env.BASE_URL || '').replace(/\/$/, '');
  const alts = index ? LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${esc(base + prefix(l) + path)}">`).join('')
    + `<link rel="alternate" hreflang="x-default" href="${esc(base + prefix(DEFAULT_LANG) + path)}">` : '<meta name="robots" content="noindex">';
  const links = [['home'], ['services'], ['about'], ['price'], ['team'], ...extraNav, ['contact']];
  const book = `<a class="btn small book-btn" href="${u('/book')}">${t(lang, 'bookNow')}</a>`;
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="theme-color" content="#0a3a36"><link rel="icon" type="image/png" href="/img/logo-64.png"><link rel="apple-touch-icon" href="/img/logo-192.png">${alts}
<link rel="stylesheet" href="/fonts/abril-fatface/400.css"><link rel="stylesheet" href="/fonts/montserrat/600.css"><link rel="stylesheet" href="/fonts/montserrat/700.css">
<link rel="stylesheet" href="/fonts/source-sans-3/400.css"><link rel="stylesheet" href="/fonts/source-sans-3/600.css"><link rel="stylesheet" href="/fonts/source-sans-3/700.css">
${preload ? `<link rel="preload" as="image" href="${esc(preload)}" fetchpriority="high">` : ''}<style>${img.css}</style><link rel="stylesheet" href="/css/calendar.css"><link rel="stylesheet" href="/css/site.css"></head>
<body class="${home ? 'home' : 'inner'}" data-prefix="${prefix(lang)}">
<a class="skip" href="#main">${t(lang, 'skip')}</a>
<div class="loader" id="loader" aria-hidden="true"><div class="balls"><span></span><span></span><span></span></div></div>
<noscript><style>.loader{display:none}</style></noscript>
<header class="top-nav${home ? '' : ' solid'}" id="top"><div class="nav-inner">
  <a class="brand" href="${u('/')}" aria-label="${esc(S.shop_name)}"><img src="/img/logo-192.png" width="66" height="66" alt="${esc(S.shop_name)}"></a>
  <nav class="menu" id="menu" aria-label="${t(lang, 'menu')}">${links.map(([id]) => `<a href="${a(id)}">${t(lang, 'nav_' + (id === 'testimonial' ? 'testimonial' : id))}</a>`).join('')}
    <a class="btn small book-in-menu" href="${u('/book')}">${t(lang, 'bookNow')}</a></nav>
  <div class="langs" role="group" aria-label="${t(lang, 'langLabel')}">${LANGS.map(l => `<a href="${esc(prefix(l) + path)}" lang="${l}" hreflang="${l}" title="${LANG_NAME[l]}" aria-label="${LANG_NAME[l]}"${l === lang ? ' aria-current="true"' : ''}>${FLAGS[l]}<span>${l.toUpperCase()}</span></a>`).join('')}</div>
  ${book}
  <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="menu" aria-label="${t(lang, 'menu')}"><span></span><span></span><span></span></button>
</div></header>
<main id="main">${body}</main>
${bookBar ? `<a class="book-bar" href="${u('/book')}"><span class="btn pill">${t(lang, 'bookNow')}</span></a>` : ''}
<footer class="copy-footer"><div class="container">
  <span>&copy; ${new Date().getFullYear()} ${esc(S.shop_name)}${S.footer_text ? '. ' + esc(S.footer_text) : ''}</span>
  <a href="${u('/privacy')}">${t(lang, 'privacy')}</a>
  ${(S.instagram || S.facebook) ? `<span class="social">${S.instagram ? `<a href="${esc(S.instagram)}" rel="noopener" aria-label="Instagram">${SVG.instagram}</a>` : ''}${S.facebook ? `<a href="${esc(S.facebook)}" rel="noopener" aria-label="Facebook">${SVG.facebook}</a>` : ''}</span>` : ''}
  <span class="credit">${t(lang, 'iconsBy', { link: '<a href="https://www.flaticon.com/packs/linear-hairdressing-salon-elements" rel="noopener">Flaticon</a>' })}</span>
  <span class="made">${t(lang, 'madeBy')}</span>
</div></footer>
<script type="application/json" id="i18n">${JSON.stringify(I.clientStrings(lang)).replace(/</g, '\\u003c')}</script>
<script src="/js/dates.js" defer></script><script src="/js/site.js" defer></script>${scripts}</body></html>`;
}

const consent = (lang, key, id) => `<label class="consent"><input type="checkbox" name="consent" id="${id}" required> <span>${t(lang, key, { link: `<a href="${prefix(lang)}/privacy">${t(lang, 'privacy')}</a>` })}</span></label>`;

const adminLangSwitch = `<div class="langsw" role="group" aria-label="Language">${LANGS.map(l => `<button type="button" data-lang="${l}" aria-pressed="false" title="${LANG_NAME[l]}">${FLAGS[l]}<span>${l.toUpperCase()}</span></button>`).join('')}</div>`;

const pages = {
  home(lang) {
    const S = C.getSettings(lang), img = C.imageStyle();
    const services = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort, id').all();
    const team = db.prepare('SELECT * FROM barbers WHERE active = 1 ORDER BY id').all();
    const gallery = db.prepare('SELECT g.*, b.name AS barber_name FROM gallery g LEFT JOIN barbers b ON b.id = g.barber_id ORDER BY g.id DESC LIMIT 60').all();
    const quotes = db.prepare('SELECT * FROM testimonials WHERE active = 1 ORDER BY sort, id').all();
    const galleryBarbers = [...new Map(gallery.filter(g => g.barber_id).map(g => [g.barber_id, g.barber_name])).entries()];
    const cu = slot => (img.custom[slot] ? ' has-custom' : '');
    const extraNav = [...(gallery.length ? [['gallery']] : []), ...(quotes.length ? [['testimonial']] : [])];
    const u = p => prefix(lang) + p;

    const body = `
<section id="home" class="intro parallax"><div class="container"><div class="intro-caption">
  <h1>${esc(S.hero_title)}</h1>${S.hero_text ? `<p>${esc(S.hero_text)}</p>` : ''}
  <p class="btns"><a class="btn" href="${u('/book')}">${esc(S.hero_button)}</a><a class="btn ghost" href="#services">${t(lang, 'exploreMore')}</a></p>
</div></div></section>

<section id="services" class="sec dark bg-services${cu('services')}"><div class="container">
  <h2>${esc(S.services_title)}</h2>
  <div class="service-grid">${services.map(s => `<div class="service"><img src="/img/icons/${ICON_KEYS.includes(s.icon) ? s.icon : 'scissors'}.png" alt="" width="50" height="50">
    <h3>${esc(pick(s, 'name', lang))}</h3><p>${esc(pick(s, 'description', lang))}</p></div>`).join('')}</div>
</div></section>

<section id="about" class="sec bg-about${cu('about')}"><div class="container"><div class="copy">
  <h2>${esc(S.about_title)}</h2>${S.about_lead ? `<p class="lead">${esc(S.about_lead)}</p>` : ''}${rich(S.about_text)}
  <p><a class="btn" href="${u('/book')}">${esc(S.hero_button)}</a></p>
</div></div></section>

<section id="price" class="sec bg-prices overlay"><div class="container">
  <h2 class="center">${esc(S.prices_title)}</h2>
  <div class="price-grid">${services.map(s => `<div class="price-card"><div class="price-count">${s.price}<span>${esc(S.currency)}</span></div>
    <h3>${esc(pick(s, 'name', lang))}</h3><p>${minutes(s.duration_min)}</p></div>`).join('')}</div>
</div></section>

<section id="team" class="sec team-section"><div class="container">
  <h2 class="gold center">${esc(S.team_title)}</h2>
  <div class="team-grid">${team.map(b => `<article class="member"><div class="photo">
    ${b.photo ? `<img src="${esc(b.photo)}" alt="${esc(b.name)}" loading="lazy" decoding="async"${posStyle(b.photo_pos)}>` : `<div class="initials" aria-hidden="true">${initials(b.name)}</div>`}
    <div class="overlay"><p>${esc(pick(b, 'bio', lang))}</p><a class="btn small" href="${u('/book')}?barber=${b.id}">${t(lang, 'bookWith', { name: esc(b.name.split(' ')[0]) })}</a></div></div>
    <div class="member-foot"><h3>${esc(b.name)}</h3><p>${esc(pick(b, 'role', lang))}</p></div></article>`).join('')}</div>
</div></section>

${gallery.length ? `<section id="gallery" class="sec dark gallery-section"><div class="container">
  <h2 class="center">${esc(S.gallery_title)}</h2>
  ${galleryBarbers.length > 1 ? `<div class="filters" role="group" aria-label="${t(lang, 'filterBarber')}"><button type="button" class="chip" aria-pressed="true" data-barber="">${t(lang, 'all')}</button>${galleryBarbers.map(([id, n]) => `<button type="button" class="chip" aria-pressed="false" data-barber="${id}">${esc(n)}</button>`).join('')}</div>` : ''}
  <div class="wall">${gallery.map(g => { const alt = pick(g, 'caption', lang) || pick(g, 'tag', lang) || t(lang, 'haircutAlt'); return `<figure data-barber="${g.barber_id || ''}">
    <button type="button" class="tile" data-full="${esc(g.url)}" data-alt="${esc(alt)}" aria-label="${t(lang, 'openPhoto')}: ${esc(alt)}"><img src="${esc(thumbUrl(g.url))}" alt="" loading="lazy" decoding="async"${posStyle(g.pos)}></button>
    <figcaption>${esc([pick(g, 'tag', lang), g.barber_name].filter(Boolean).join(', '))}</figcaption></figure>`; }).join('')}</div>
  <dialog class="lightbox" id="lightbox" aria-label="${t(lang, 'nav_gallery')}">
    <button type="button" class="lb-btn lb-close" aria-label="${t(lang, 'close')}">${SVG.close}</button>
    <button type="button" class="lb-btn lb-prev" aria-label="${t(lang, 'prevPhoto')}">${SVG.prev}</button>
    <button type="button" class="lb-btn lb-next" aria-label="${t(lang, 'nextPhoto')}">${SVG.next}</button>
    <figure><img alt=""><figcaption></figcaption></figure>
  </dialog>
</div></section>` : ''}

${quotes.length ? `<section id="testimonial" class="sec bg-testimonials${cu('testimonials')}"><div class="container">
  <h2 class="center">${esc(S.testimonials_title)}</h2>
  <div class="carousel" role="region" aria-roledescription="carousel" aria-label="${t(lang, 'reviewsLabel')}">
    <div class="track">${quotes.map((q, i) => `<figure class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${quotes.length}">
      ${SVG.quote}<blockquote>${esc(pick(q, 'quote', lang))}</blockquote><figcaption><b>${esc(q.name)}</b>${pick(q, 'label', lang) ? `<span>${esc(pick(q, 'label', lang))}</span>` : ''}</figcaption></figure>`).join('')}</div>
    ${quotes.length > 1 ? `<div class="car-nav"><button type="button" class="prev" aria-label="${t(lang, 'prevReview')}">${SVG.prev}</button><button type="button" class="next" aria-label="${t(lang, 'nextReview')}">${SVG.next}</button></div>` : ''}
  </div>
</div></section>` : ''}

<section id="contact" class="contact-section">
  ${C.hasMap(S) ? `<iframe class="map" title="${esc(S.address)}" src="${esc(C.mapEmbedUrl(S))}" loading="lazy" tabindex="-1" referrerpolicy="no-referrer"></iframe>` : ''}
  <div class="container"><div class="contact-card">
    <div class="info"><h2>${esc(S.contact_title)}</h2>
      <p>${esc(S.address)}<br><a href="${esc(C.mapsLink(S))}" rel="noopener" target="_blank">${t(lang, 'openMaps')}</a></p>
      <p><a href="tel:${tel(S.phone)}">${esc(S.phone)}</a>${S.email ? `<br><a href="mailto:${esc(S.email)}">${esc(S.email)}</a>` : ''}</p>
      <dl class="hours">${C.parseHours(S.hours).map(([d, h]) => `<dt>${esc(d)}</dt><dd>${esc(h)}</dd>`).join('')}</dl></div>
    <form id="contact-form" class="cform" novalidate>
      <label class="sr-only" for="c-name">${t(lang, 'name')}</label><input id="c-name" class="field" name="name" placeholder="${t(lang, 'fullName')}" autocomplete="name" required>
      <label class="sr-only" for="c-phone">${t(lang, 'phone')}</label><input id="c-phone" class="field" name="phone" type="tel" placeholder="${t(lang, 'phonePh')}" autocomplete="tel" required>
      <label class="sr-only" for="c-msg">${t(lang, 'message')}</label><textarea id="c-msg" class="field" name="message" rows="4" placeholder="${t(lang, 'message')}" required></textarea>
      <label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
      ${consent(lang, 'consentContact', 'c-consent')}
      <p class="msg" id="c-status" role="alert"></p>
      <button class="btn pill" type="submit">${t(lang, 'send')}</button>
    </form>
  </div></div>
</section>`;
    return shell({ lang, title: S.shop_name, body, S, path: '/', home: true, extraNav, preload: C.slotUrl('hero') || C.IMAGE_SLOTS.hero.def, bookBar: true });
  },

  book(lang) {
    const S = C.getSettings(lang);
    const services = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort, id').all();
    const barbers = db.prepare('SELECT * FROM barbers WHERE active = 1 ORDER BY id').all();
    const offers = {};
    for (const r of db.prepare('SELECT * FROM barber_services').all()) (offers[r.service_id] ||= []).push(r.barber_id);
    const barberField = barbers.length === 1
      ? `<input type="hidden" name="barber" value="${barbers[0].id}">`
      : `<label>${t(lang, 'barber')}<select class="field" name="barber"><option value="">${t(lang, 'anyone')}</option>${barbers.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label>`;
    return shell({ lang, title: `${t(lang, 'bookTitle')} | ${S.shop_name}`, S, path: '/book', body: `
<section class="sec dark page-head"><div class="container"><h1 class="display">${t(lang, 'bookTitle')}</h1></div></section>
<section class="panel-sec"><div class="container"><div class="panel">
<form id="book" class="stack" novalidate data-offers="${esc(JSON.stringify(offers))}">
  <label>${t(lang, 'service')}<select class="field" name="service" required>${services.map(s => `<option value="${s.id}">${esc(pick(s, 'name', lang))}, ${minutes(s.duration_min)}, ${s.price} ${esc(S.currency)}</option>`).join('')}</select></label>
  ${barberField}
  <div><p class="label">${t(lang, 'date')}</p><div id="datepick" data-min="${plusDays(0)}" data-max="${plusDays(60)}"></div></div>
  <div><p class="label">${t(lang, 'time')}</p><div id="slots" class="slots" aria-live="polite"><span class="hint">${t(lang, 'chooseDateHint')}</span></div></div>
  <label>${t(lang, 'fullName')}<input class="field" name="fullname" autocomplete="name" required></label>
  <label>${t(lang, 'phone')}<input class="field" name="phone" type="tel" autocomplete="tel" required></label>
  <label>${t(lang, 'email')}<input class="field" name="email" type="email" autocomplete="email" required></label>
  ${consent(lang, 'consentBook', 'b-consent')}
  <p id="msg" class="msg" role="alert"></p>
  <button class="btn pill" type="submit">${t(lang, 'confirm')}</button>
</form></div></div></section>` });
  },

  manage(lang, a, locked) {
    const S = C.getSettings(lang);
    const details = `<dl class="details"><dt>${t(lang, 'service')}</dt><dd>${esc(pick({ name: a.service_name, name_ro: a.service_name_ro }, 'name', lang))}</dd><dt>${t(lang, 'barber')}</dt><dd>${esc(a.barber_name)}</dd>
      <dt>${t(lang, 'whenLbl')}</dt><dd>${esc(fmtLong(a.date, lang))}, ${fmtTime(a.start_min)}</dd><dt>${t(lang, 'name')}</dt><dd>${esc(a.name)}</dd>${a.status === 'pending' ? `<dt>${t(lang, 'statusLbl')}</dt><dd>${t(lang, 'stPending')}</dd>` : ''}</dl>${a.status === 'pending' ? `<p>${t(lang, 'pendingText', { barber: esc(a.barber_name) })}</p>` : ''}`;
    let action;
    if (a.status === 'cancelled') action = `<p>${t(lang, 'cancelledText')}</p><p><a class="btn pill" href="${prefix(lang)}/book">${t(lang, 'bookNew')}</a></p>`;
    else if (locked) action = `<p>${t(lang, 'locked', { phone: `<a href="tel:${tel(S.phone)}">${esc(S.phone)}</a>` })}</p>`;
    else action = `<div id="manage" class="stack" data-token="${esc(a.token)}" data-service="${a.service_id}" data-barber="${a.barber_id}" data-value="${a.date}" data-min="${plusDays(0)}" data-max="${plusDays(60)}">
      <h2>${t(lang, 'moveTitle')}</h2>
      <div><p class="label">${t(lang, 'newDate')}</p><div id="datepick"></div></div>
      <div id="slots" class="slots" aria-live="polite"></div><p id="msg" class="msg" role="alert"></p>
      <p class="row"><button id="move" class="btn pill" type="button">${t(lang, 'move')}</button><button id="cancel" class="textbtn" type="button">${t(lang, 'cancel')}</button></p></div>`;
    return shell({ lang, title: `${t(lang, 'yourAppt')} | ${S.shop_name}`, S, path: `/booking/${a.token}`, index: false, body: `
<section class="sec dark page-head"><div class="container"><h1 class="display">${a.status === 'cancelled' ? t(lang, 'apptCancelled') : a.status === 'pending' ? t(lang, 'pendingHead') : t(lang, 'yourAppt')}</h1></div></section>
<section class="panel-sec"><div class="container"><div class="panel">${details}${action}</div></div></section>` });
  },

  privacy(lang) {
    const S = C.getSettings(lang);
    return shell({ lang, title: `${t(lang, 'privacy')} | ${S.shop_name}`, S, path: '/privacy', body: `
<section class="sec dark page-head"><div class="container"><h1 class="display">${t(lang, 'privacy')}</h1></div></section>
<section class="panel-sec"><div class="container"><div class="panel prose">${rich(S.privacy_text)}</div></div></section>` });
  },


  // Invitation page for a new barber: they choose their own password (the owner never knows it) and get a recovery code once.
  setup() {
    const S = C.getSettings('en');
    return `${pages.adminHead('Set up your account')}<body class="login" data-setup="1"><main>
<form id="setup" class="card stack" novalidate><img class="logo" src="/img/logo-192.png" width="72" height="72" alt=""><h1>${esc(S.shop_name)}</h1><p id="welcome" class="hint" data-t>Checking your invitation...</p>
<label><span data-t>Password (at least 12 characters)</span><input name="password" type="password" autocomplete="new-password" required></label>
<label><span data-t>Repeat password</span><input name="again" type="password" autocomplete="new-password" required></label>
<p class="hint" data-t>Only you will know this password, not the owner of the shop. It also protects your clients' details, so make it long: a few words in a row work well.</p>
<p id="msg" class="msg" role="alert"></p><button class="btn" type="submit" data-t>Create my account</button></form>
<section id="recovery" class="card stack" hidden><h1 data-t>Save your recovery code</h1>
<p class="hint" data-t>This code is shown once and cannot be shown again. If you forget your password, it is the only way to keep your appointment history. Without it, the owner can only reset your account, which erases that history.</p>
<p id="code" class="recoverycode" aria-live="polite"></p>
<label class="check"><input type="checkbox" id="saved"> <span data-t>I saved the code somewhere safe (a password manager or on paper).</span></label>
<a id="go" class="btn" href="/admin/login" aria-disabled="true" data-t>Continue to sign in</a></section>
<p class="loginlang">${adminLangSwitch}</p></main>${pages.adminScripts}</body></html>`;
  },

  // The link in a barber's notification: confirm or decline a request with one tap, no sign-in.
  // The token is read in the browser from the #fragment, so it never reaches server logs or other sites.
  action(lang) {
    const S = C.getSettings(lang);
    const attrs = ['actConfirm', 'actDecline', 'actCancel', 'actDone', 'actSure', 'pendingHead', 'stPending', 'stBooked', 'cancelledText', 'errNotFound']
      .map(k => `data-${k.toLowerCase()}="${esc(t(lang, k))}"`).join(' ');
    return shell({ lang, title: `${t(lang, 'actionTitle')} | ${S.shop_name}`, S, path: '/action', index: false,
      scripts: '<script src="/js/action.js" defer></script>', body: `
<section class="sec dark page-head"><div class="container"><h1 class="display">${t(lang, 'actionTitle')}</h1></div></section>
<section class="panel-sec"><div class="container"><div class="panel"><div id="action" class="stack" ${attrs}><p class="hint">...</p></div></div></div></section>` });
  },

  notFound(lang) {
    const S = C.getSettings(lang);
    return shell({ lang, title: `${t(lang, 'notFound')} | ${S.shop_name}`, S, index: false, body: `<section class="sec dark page-head"><div class="container"><h1 class="display">${t(lang, 'notFound')}</h1><p><a class="btn" href="${prefix(lang)}/">${t(lang, 'backHome')}</a></p></div></section>` });
  },

  // Admin pages use their own light stylesheet; their text is translated in the browser (data-t marks static text).
  adminHead: title => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><link rel="icon" type="image/png" href="/img/logo-64.png"><meta name="robots" content="noindex"><link rel="icon" href="data:,"><link rel="stylesheet" href="/css/calendar.css"><link rel="stylesheet" href="/css/admin.css"></head>`,
  adminScripts: '<script src="/js/dates.js"></script><script src="/js/admin.js"></script>',
  login() {
    const S = C.getSettings('en');
    return `${pages.adminHead('Sign in')}<body class="login"><main><form id="login" class="card stack" novalidate><img class="logo" src="/img/logo-192.png" width="72" height="72" alt=""><h1>${esc(S.shop_name)} <span data-t>admin</span></h1>
<label><span data-t>Email</span><input name="email" type="email" autocomplete="username" required></label>
<label><span data-t>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
<p id="msg" class="msg" role="alert"></p><button class="btn" type="submit" data-t>Sign in</button><button id="forgot" class="linkbtn" type="button" data-t>Forgot password?</button></form>
<form id="recover" class="card stack" hidden novalidate><h1 data-t>Reset your password</h1><p class="hint" data-t>Specialists: enter the recovery code you were shown when you set up your account. Your appointments stay readable.</p>
<label><span data-t>Email</span><input name="email" type="email" autocomplete="username" required></label>
<label><span data-t>Recovery code</span><input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" required></label>
<label><span data-t>New password (at least 12 characters)</span><input name="password" type="password" autocomplete="new-password" required></label>
<p id="rmsg" class="msg" role="alert"></p><button class="btn" type="submit" data-t>Set new password</button><button id="backlogin" class="linkbtn" type="button" data-t>Back to sign in</button></form>
<p class="loginlang">${adminLangSwitch}</p></main>${pages.adminScripts}</body></html>`;
  },
  admin(user, csrf) {
    const S = C.getSettings('en');
    return `${pages.adminHead('Admin')}<body data-owner="${user.barber_id ? 0 : 1}" data-barber="${user.barber_id || ''}" data-csrf="${esc(csrf)}" data-cc="${esc(process.env.DEFAULT_COUNTRY_CODE || '40')}">
<header class="ahead"><strong><img class="alogo" src="/img/logo-64.png" width="32" height="32" alt="">${esc(S.shop_name)} <span data-t>admin</span></strong><span class="grow"></span><span class="who">${esc(user.email)}</span>
<a href="/" target="_blank" rel="noopener" data-t>View site</a>${adminLangSwitch}<button id="pw" class="linkbtn" type="button" data-t>Change password</button><button id="logout" class="linkbtn" type="button" data-t>Sign out</button></header>
<nav class="tabs" id="tabs" aria-label="Admin"></nav><main id="panel"></main>
<footer class="afoot"><span data-t>Created by PumaBytes (alias Paula Beltag)</span></footer>${pages.adminScripts}</body></html>`;
  },
};

module.exports = { ...pages, ICON_KEYS };
