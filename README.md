# ANM Beauty Center: online booking site (version 2)

The site for a women's beauty center (hair and nails), in the colours of the ANM logo: the home page with hero, services, about, prices, team, gallery, reviews and
map; the booking page; the customer's own appointment page; English and Romanian; and the full admin editors (site text,
images, services and prices, team photos, reviews, gallery, messages). Underneath, it now has separate owner and barber
roles, encrypted appointments, and booking notifications.

## Run

Node 22.13 or newer.

    npm install
    cp .env.example .env     # set BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD (12+ characters)
    npm start                # then remove ADMIN_PASSWORD from .env
    npm test                 # 105 checks on roles, encryption, booking, WhatsApp flow and your public pages

Start with a **new database file**. A `razor.db` from version 1 holds plaintext appointments, which cannot be converted
(there is no barber key yet to encrypt them to); the app stops with a message if it finds one.
SQLite: `better-sqlite3` is installed by `npm install`; if it cannot be built, Node's built-in SQLite is used instead.
Lost owner password: `node scripts/reset-admin.js owner@example.com "new long password"` (run on the server).

## Who can do what

| | Owner (admin) | Barber | Customer |
|---|---|---|---|
| Site text, images, services and prices, reviews, messages | yes | no | no |
| Add, suspend, reset, delete a barber account | yes | no | no |
| Public profile text and photo | yes | own | no |
| Gallery | all | own photos | no |
| Appointments, customers, income, numbers, CSV | **no** | **own only** | own booking only |
| Weekly hours, days off, notifications, booking style | **no** | own only | no |

The owner adds a barber (name, title, email). The barber gets an invitation link and **chooses their own password**; the
owner never knows it. With SMTP set up the link is emailed straight to the barber and the owner never sees it.
Before the barber has set up, they are not on the site; suspending hides them and blocks sign-in.

## How the data is protected

- **Customer details are encrypted to the barber.** At booking, name, phone, email, service and price are sealed with the
  barber's public key (X25519 + HKDF + AES-256-GCM). The barber's private key exists only encrypted under their password
  (scrypt) and under a one-time recovery code. The owner, a copy of the database file, and other barbers cannot read it.
  `npm test` searches the raw database file to prove it.
- The customer's own link page (service, name, move/cancel) works from a second copy encrypted with a key made from the
  link itself, which is never stored.
- The unlocked key lives in server memory for the session only (30 min idle, 12 h maximum, gone on restart).
- Passwords: scrypt, 12+ characters, lockout after 5 wrong tries, rate limits on sign-in, booking, recovery and contact.
- Web: same-origin and JSON-only checks, SameSite=Strict HttpOnly cookies (`__Host-` and Secure in production), a CSRF
  token on every signed-in change, Content-Security-Policy and the other helmet headers, SQL parameters everywhere,
  uploads checked by file bytes, secret links kept in the `#fragment` so they never reach logs.
- Notification settings are encrypted with `SERVER_KEY`.

### Honest limits

- The server sees a booking in plain form for a moment while it is made, and a barber's data while that barber is signed
  in. Whoever controls the running server could change the code and capture it. Encryption protects against the owner
  role, stolen database files and backups, and other barbers; it is not protection from a malicious host.
- **Booking times are not encrypted** (barber, date, start, end, state): the site needs them to stop double bookings and
  show free hours. Names, contacts, services and money are encrypted.
- Messages sent to a barber's email or WhatsApp contain the customer's details in readable form on those
  services. Each barber chooses which channels to turn on.
- A barber who loses both password and recovery code cannot get their history back (nobody can). The owner's
  "Reset account" erases that history and sends a new invitation.
- Contact-form messages and the service price list are shop-wide, so the owner still sees those, as before.
- Use HTTPS (nginx or Caddy in front; set `TRUST_PROXY=true`) and full-disk encryption on the server. This is a
  security-minded build, not an audited one: have it reviewed, and check the privacy text (Site text > privacy) with your
  GDPR advisor.

## Booking styles and notifications (each barber, in Notifications)

- **Instant**: the booking is confirmed straight away.
- **Request**: the hour is held, the customer is told the barber will call, and the barber gets a message with *name,
  email, phone, day and hour*, a call number, a WhatsApp chat link and a one-tap **Confirm / Decline** link (no sign-in;
  it shows only the time, never customer details). Unanswered requests free the hour after `PENDING_HOURS` (24).
  The Requests tab shows them with Confirm and Decline buttons.

How the message reaches the barber without opening the dashboard (each barber picks, in Notifications):

1. **WhatsApp, simple (CallMeBot)**: nothing to link, no business account, nothing for the owner to set up. See below.
2. **WhatsApp through the shop number (Baileys)**: the shop links one number once; barbers can also answer YES / NO.
3. **Email** (on by default). Fill `SMTP_*` in `.env`. For Gmail: turn on 2-step verification, create an *app password*,
   then `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app password>`.
   Without SMTP, messages print in the server log.
4. **In the browser**: beep and desktop notification while the admin page is open (checked every 30 s).

## WhatsApp, simple: CallMeBot (recommended to start with)

[CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) is a free third-party service that sends a
WhatsApp message to **your own number**. Each barber does it once, from the phone:

1. Open the CallMeBot page above, add the contact it shows, and send it: `I allow callmebot to send me messages`.
2. It answers with an API key.
3. In the dashboard open Notifications > *WhatsApp, simple*, type your number and the key, press *Save and send a test
   message*. The test message must arrive on your WhatsApp before anything is switched on.

Trade-offs: the message passes through CallMeBot's servers (they see the customer's name and phone), it comes from their
number, you cannot reply to it (use the confirm / decline link inside it), and a free service can be slow or change.
Nothing about it is linked to your WhatsApp account, so there is no ban risk for your number.

## Known problem: "Couldn't link device" with Baileys

Linking through Baileys currently fails for many people, with both the QR code and the pairing code: the phone says
"Couldn't link device" although the code was accepted. It is reported on the Baileys issue tracker for the versions
7.0.0-rc9, rc13 and rc14 (rc14 does not handle WhatsApp's `companion_reg_refresh` message; an older default WhatsApp Web
version was also blamed). It is **not** caused by your phone, number or this site.

What this project does about it: it asks WhatsApp for the current web version, starts every attempt from clean files, and
shows the code WhatsApp answered with. If it still fails, there is nothing more to do on your side until Baileys is
fixed. Use **CallMeBot** (above) in the meantime: it needs no linking, and each specialist uses their own number.
For debugging run `WHATSAPP_DEBUG=true npm start`, or `node scripts/whatsapp-test.js qr` in a terminal.

## WhatsApp through the shop number: Baileys

Uses [Baileys](https://github.com/WhiskeySockets/Baileys), an **unofficial** WhatsApp Web client. It needs no business
account and no fees (a normal WhatsApp account works), but it is against WhatsApp's terms and the number can be banned,
so use a **dedicated number**. The shop links one number; the server sends each barber their booking messages from it.

**Link it (once, by the owner), either way:**

- **QR code (most reliable, try this first):** open the **WhatsApp** tab, press *Show a QR code*. On the phone:
  WhatsApp > Settings > Linked devices > Link a device, and scan the code on screen.
- **Pairing code:** enter the phone's number, press *Get a pairing code*. On the phone: Linked devices > Link a device >
  *Link with phone number instead*, and type the code.

**If linking fails (especially on iPhone):**
1. Use the QR code instead of the pairing code. It does not depend on the number format.
2. Update WhatsApp on the phone; the phone needs internet, and the account must be a normal, already-registered one.
3. Make sure you run the version in this zip: older builds identified themselves with an invented browser name, which
   WhatsApp can reject for pairing codes. It now identifies as Ubuntu / Chrome, as Baileys expects.
4. Give the number with country code (`40722123456`), as the phone itself uses it, not a different SIM.
5. Run `npm update @whiskeysockets/baileys`: WhatsApp changes its protocol and old versions stop linking. If the QR
   scan hangs, delete `data/whatsapp-auth/`, restart and try again. Some servers or VPN/datacenter IPs are blocked by
   WhatsApp; test from a home connection if everything else looks right.
6. Still stuck? Use CallMeBot above, which needs none of this.

**Test it without the website (headless, in a terminal)**

    node scripts/whatsapp-test.js qr                       # prints a QR code in the terminal, scan it
    node scripts/whatsapp-test.js code +40722123456        # or get a pairing code
    node scripts/whatsapp-test.js send +40733000111 "Hi"   # once linked: sends a message and exits

It shares `data/whatsapp-auth/` with the website, so linking in the terminal also links the site. Read its output: it
says clearly whether the library is missing, the link timed out, or the message was sent.

**For each barber:** Notifications > *WhatsApp through the shop number*: enter your number, press *Send me a code on
WhatsApp*, type the 6-digit code. Only a verified number ever receives messages. Save the shop number in your contacts
and send it a "hi" once; it makes the traffic look like a normal conversation.

**What the barber gets.** For a request: *name, email, phone, day and hour*, the number to call, a WhatsApp chat link
with the customer, the one-tap link, and "Reply YES to confirm or NO to decline". **YES / DA** confirms, **NO / NU**
declines (the hour is freed). Answer the request's own message if several are waiting. Other messages get a short help
text, and numbers that are not a verified barber are ignored without any reply. Confirming by WhatsApp does not email
the customer (the server cannot read their address); the barber calls them.

**Limits to know about**
- The linked phone shows every message the server sends from it, including customers' names, emails and phone numbers.
  Keep that phone with someone who is allowed to see them.
- The login session sits in `data/whatsapp-auth/` as plain files. Whoever can read that folder controls that WhatsApp
  account. Never commit it or share backups of it.
- If WhatsApp disconnects the device, the tab shows *not connected* and barbers fall back to email (or CallMeBot).
- Tested here against a stand-in for Baileys and CallMeBot (`npm test`, 105 checks), not against a live WhatsApp number.

## Other ways to send WhatsApp messages (not built in)

- **whatsapp-web.js**: same idea as Baileys (unofficial, QR login), but drives a real Chrome, so it is heavier.
- **WAHA, Evolution API**: self-hosted servers (Docker) that wrap those same unofficial engines behind a simple HTTP API.
- **WhatsApp Business Cloud API (Meta) or Twilio**: the official routes. Reliable and ban-free, but they need a business
  account (Meta) or a paid number / sandbox opt-in (Twilio), and messages need approved templates.
- **Plain `wa.me` links**: free and official, but a person must tap Send. The emails already include such links.

## What changed from your version 1 files

Unchanged: `content.js`, `lib/shoptime.js`, `lib/csv.js`, `lib/images.js`, `lib/mail.js`, `public/css/site.css`,
`public/js/site.js`, `public/js/dates.js`, all images. Changed: `db.js` (accounts, encrypted appointments),
`lib/booking.js`, `lib/availability.js` (pending requests hold an hour), `lib/stats.js` (barber only), `routes/*`,
`views.js` (pending status, setup and one-tap pages), `server.js`, `public/js/admin.js` (role-based tabs, appointments,
requests, notifications, account management; still Romanian-translated), `i18n.js` (a few new strings).
New: `lib/crypto.js`, `lib/session.js`, `lib/notify.js`, `lib/whatsapp.js`, `lib/callmebot.js`, `lib/phone.js`, `scripts/whatsapp-test.js`, `public/js/action.js`, `test/smoke.js`, `scripts/reset-admin.js`.

## Look and wording (beauty center)

- Colours come from the logo: teal `#06746c` / `#4a9793`, deep teal `#0a3a36` for dark sections, blush `#fcecec` for light
  sections, and raspberry rose `#b5485a` (the complementary of teal) for buttons and links. They are CSS variables at the
  top of `public/css/site.css` and `public/css/admin.css` (`--gold` is now the rose accent, `--dark` the deep teal).
- The staff are called **specialists** (EN) / **specialiste** (RO) everywhere visible. Starter services are hair and nails
  with example prices; change them in the admin (Services). They are only added to a **new** database: with an existing
  `razor.db`, edit the services in the admin or delete the file to start fresh.
- The background pictures are generated teal and blush artwork. Replace them with real photos in the admin, tab *Images*.
- The logo lives in `public/img/logo*.png`. The menu switches to the phone layout below 1200 px so Romanian labels fit.
