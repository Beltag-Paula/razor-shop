const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./db');
const session = require('./lib/session');
const K = require('./lib/crypto');
const WA = require('./lib/whatsapp');
const views = require('./views');
const { LANGS, DEFAULT_LANG } = require('./i18n');

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1); // behind nginx or a hosting proxy
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'upgrade-insecure-requests': null,
      'frame-src': ["'self'", 'https://www.openstreetmap.org'],              // map on the contact section
      'connect-src': ["'self'", 'https://nominatim.openstreetmap.org'],      // "Find on map" in the admin
    },
  },
}));
app.use(express.json({ limit: '50kb' }));
app.use(session.load); // in-memory sessions: a barber's unlocked key never touches the disk

// Cross-site request protection: same-origin only, and JSON (or an image upload) only. Cookies are SameSite=Strict,
// and every signed-in change must also carry the session's CSRF token (checked in routes/admin.js).
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  try { if (origin && new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Request blocked.' }); } catch { return res.status(403).json({ error: 'Request blocked.' }); }
  if (!req.is('application/json') && !(req.is('multipart/form-data') && req.path.startsWith('/admin/api/'))) return res.status(415).json({ error: 'JSON only.' });
  next();
});
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
app.use(['/api', '/admin'], (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// Language: the default language lives at the site root, the other under /ro or /en.
// The prefix is removed before routing, and the language is kept in req.lang.
app.use((req, res, next) => {
  const m = req.url.match(new RegExp(`^/(${LANGS.join('|')})(?=/|\\?|$)`));
  req.lang = DEFAULT_LANG;
  if (!m) return next();
  const rest = req.url.slice(m[0].length);
  const url = rest.startsWith('/') ? rest : '/' + rest;
  if (m[1] === DEFAULT_LANG) return res.redirect(301, url); // one address per page
  req.lang = m[1];
  req.url = url;
  next();
});
// Fonts are served from this site (installed through the @fontsource npm packages), so visitors' browsers
// never contact Google. This matters under the GDPR.
app.use('/fonts', express.static(path.join(__dirname, 'node_modules', '@fontsource'), { maxAge: '30d', immutable: true }));
// Uploaded files have unique names, so they can be cached for a long time.
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), { maxAge: '30d', immutable: true }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.use('/admin', require('./routes/admin'));
app.use(require('./routes/public'));

app.use((req, res) => res.status(404).send(views.notFound(req.lang)));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.name === 'MulterError') return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large (10 MB maximum).' : 'Upload failed.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

// First start: create the owner/admin sign-in from ADMIN_EMAIL / ADMIN_PASSWORD (then remove the password from .env).
async function bootstrapAdmin() {
  if (db.prepare('SELECT 1 FROM accounts WHERE barber_id IS NULL').get()) return;
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) { console.warn('No admin account yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env and restart.'); return; }
  if (ADMIN_PASSWORD.length < 12) { console.error('ADMIN_PASSWORD must be at least 12 characters.'); process.exit(1); }
  const h = await K.hashPassword(ADMIN_PASSWORD);
  db.prepare("INSERT INTO accounts (email, status, pw_salt, pw_hash) VALUES (?, 'active', ?, ?)").run(ADMIN_EMAIL.toLowerCase(), h.pw_salt, h.pw_hash);
  console.log(`Admin account created for ${ADMIN_EMAIL}. Remove ADMIN_PASSWORD from .env now.`);
}

async function start(port = process.env.PORT || 3000) {
  await bootstrapAdmin();
  if (process.env.NODE_ENV === 'production' && !(process.env.BASE_URL || '').startsWith('https://')) console.warn('BASE_URL is not https. Serve the site over HTTPS in production, or sessions and passwords are exposed.');
  WA.autostart(); // reconnects the shop's WhatsApp if it was linked before
  return new Promise(ok => { const srv = app.listen(port, () => { console.log(`Listening on port ${srv.address().port}`); ok(srv); }); });
}
if (require.main === module) start();
module.exports = { app, start };
