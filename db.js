const Database = require('./lib/sqlite');

const db = new Database(process.env.DB_FILE || 'razor.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('secure_delete = ON');

// This version encrypts appointments. A database from the first version (plaintext appointments) cannot be
// converted, because there is no barber key yet to encrypt them to. Start with a new database file.
if (db.prepare('PRAGMA table_info(appointments)').all().some(c => c.name === 'phone')) {
  console.error('razor.db is from the first version (plaintext appointments). Move it away and start again with a fresh database.');
  process.exit(1);
}

// Dates are stored as shop-local 'YYYY-MM-DD' and times as minutes since midnight.
// One shop, one time zone (set TZ in .env), so no UTC conversion is needed.
// Image columns hold URL paths such as '/uploads/abc.webp'.
db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS barbers (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT, bio TEXT, photo TEXT, email TEXT,
  active INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT,
  duration_min INTEGER NOT NULL, price INTEGER NOT NULL,
  icon TEXT NOT NULL DEFAULT 'scissors', sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS barber_services (
  barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (barber_id, service_id)
);
CREATE TABLE IF NOT EXISTS working_hours (
  barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL, opens TEXT NOT NULL, closes TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS time_off (
  id INTEGER PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  date TEXT NOT NULL, start_min INTEGER NOT NULL DEFAULT 0, end_min INTEGER NOT NULL DEFAULT 1440, reason TEXT
);
-- Who the customer is, what they booked and what it cost live ONLY in payload, encrypted to the barber's own key.
-- cust_blob holds what the customer's own link page needs (encrypted with a key made from their link).
-- The plain columns are just what stops two people taking the same hour: which barber, when, and the state.
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  date TEXT NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','booked','cancelled')),
  cust_hash TEXT NOT NULL UNIQUE, barber_hash TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL, cust_blob TEXT NOT NULL,
  created_ts INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_slot
  ON appointments(barber_id, date, start_min) WHERE status IN ('pending','booked');
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY,
  barber_id INTEGER REFERENCES barbers(id) ON DELETE CASCADE,
  url TEXT NOT NULL, caption TEXT, tag TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, label TEXT, quote TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Sign-ins. barber_id NULL is the owner/admin; otherwise the row belongs to that barber.
-- A barber account holds an X25519 key pair: the public key (clear) seals bookings, the private key exists only
-- encrypted under the barber's password and under a one-time recovery code.
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE,
  barber_id INTEGER UNIQUE REFERENCES barbers(id) ON DELETE CASCADE,
  pw_salt TEXT, pw_hash TEXT,
  kdf_salt TEXT, pub_key TEXT, enc_priv TEXT, rec_salt TEXT, enc_priv_rec TEXT,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended')),
  invite_hash TEXT, invite_exp INTEGER,
  failed INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

// Columns added for the Romanian translations and the customer's language. Safe to run on an existing database.
const addColumn = (table, col, def) => {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some(r => r.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
};
addColumn('services', 'name_ro', 'TEXT');
addColumn('services', 'description_ro', 'TEXT');
addColumn('barbers', 'role_ro', 'TEXT');
addColumn('barbers', 'bio_ro', 'TEXT');
addColumn('testimonials', 'label_ro', 'TEXT');
addColumn('testimonials', 'quote_ro', 'TEXT');
addColumn('gallery', 'tag_ro', 'TEXT');
addColumn('gallery', 'caption_ro', 'TEXT');
addColumn('barbers', 'booking_mode', "TEXT NOT NULL DEFAULT 'instant'"); // 'instant' or 'request' (the barber phones to confirm)
addColumn('barbers', 'notify_lang', "TEXT NOT NULL DEFAULT 'en'");
addColumn('barbers', 'notify_enc', 'TEXT');          // where to send booking messages, encrypted with SERVER_KEY
addColumn('barbers', 'photo_pos', 'TEXT');   // focal point of a photo, like '50% 30%'
addColumn('gallery', 'pos', 'TEXT');

// Starter data so the site works on first run. Everything here is editable from /admin (prices are only examples).
// There are no starter specialists: one exists once the owner invites them and they set their own password.
const STARTER = [ // English name, English text, Romanian name, Romanian text, minutes, price, icon
  ['Haircut and styling', 'Consultation, wash, cut and blow-dry.', 'Tuns și coafat', 'Consultație, spălat, tuns și coafat.', 60, 120, 'scissors'],
  ['Hair colouring', 'One colour, highlights or toning, with a care treatment.', 'Vopsit', 'O culoare, șuvițe sau tonifiere, cu tratament de îngrijire.', 120, 280, 'brush'],
  ['Occasion styling', 'Waves, curls or an updo for a special day.', 'Coafat de ocazie', 'Bucle, valuri sau coc pentru o zi specială.', 60, 150, 'dryer'],
  ['Classic manicure', 'Shaping, cuticle care and polish.', 'Manichiură clasică', 'Formare, îngrijirea cuticulelor și ojă.', 45, 80, 'polish'],
  ['Gel manicure', 'Long-lasting gel polish or gel overlay.', 'Manichiură cu gel', 'Ojă semipermanentă sau gel pe unghia naturală.', 75, 130, 'hand'],
  ['Pedicure', 'Foot care, shaping and polish.', 'Pedichiură', 'Îngrijirea picioarelor, formare și ojă.', 60, 120, 'flower'],
];
if (!db.prepare('SELECT 1 FROM services').get()) {
  db.transaction(() => {
    const addService = db.prepare('INSERT INTO services (name, description, name_ro, description_ro, duration_min, price, icon, sort) VALUES (?,?,?,?,?,?,?,?)');
    STARTER.forEach((x, i) => addService.run(x[0], x[1], x[2], x[3], x[4], x[5], x[6], i + 1));
    const addT = db.prepare('INSERT INTO testimonials (name, label, quote, label_ro, quote_ro, sort) VALUES (?,?,?,?,?,?)');
    addT.run('Client name', 'City', 'Replace this with a real review from one of your clients. Short and specific works best.', 'Oraș', 'Înlocuiește această recenzie cu una reală de la una dintre clientele tale. Scurtă și concretă funcționează cel mai bine.', 1);
    addT.run('Another client', 'City', 'A second review shows the carousel at work. Edit or delete these in the admin.', 'Oraș', 'O a doua recenzie arată cum funcționează caruselul. Editează sau șterge recenziile din administrare.', 2);
  })();
}

module.exports = db;
