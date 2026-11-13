// Test the WhatsApp link WITHOUT the website, in a terminal (also works on a server with no browser).
//
//   node scripts/whatsapp-test.js qr                    show a QR code in the terminal, scan it with the phone
//   node scripts/whatsapp-test.js code +40722123456     get a pairing code for that number instead
//   node scripts/whatsapp-test.js send +40733000111 "Hello"    send a message once linked (then exits)
//
// QR: WhatsApp > Settings > Linked devices > Link a device, then point the camera at the terminal.
// The session is stored in data/whatsapp-auth, the same place the website uses, so linking here also links the site.
process.env.DB_FILE = ':memory:'; // the website's database is not needed for this test
const WA = require('../lib/whatsapp');
const { waDigits } = require('../lib/phone');
const [mode, a, b] = process.argv.slice(2);
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms, label) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(500); } console.error(`Timed out waiting for: ${label}`); return false; };

(async () => {
  if (!['qr', 'code', 'send'].includes(mode)) { console.log('Usage: node scripts/whatsapp-test.js qr | code <number> | send <number> "<text>"'); process.exit(1); }
  if (mode === 'qr') {
    let qrcode; try { qrcode = require('qrcode'); } catch { console.error('Run "npm install" first (the qrcode package is missing).'); process.exit(1); }
    WA.qrListeners.add(async q => { console.clear?.(); console.log('Scan this with WhatsApp > Linked devices > Link a device (it renews every ~20 s):\n'); console.log(await qrcode.toString(q, { type: 'terminal', small: true })); });
    await WA.linkQr();
  } else if (mode === 'code') {
    if (!a) { console.error('Give the phone number that will be linked, e.g. +40722123456'); process.exit(1); }
    await WA.link(a);
    if (!(await until(() => WA.status().code || WA.status().state === 'unavailable' || WA.status().error, 30000, 'a pairing code'))) process.exit(1);
    if (WA.status().state === 'unavailable' || !WA.status().code) { console.error(WA.status().error || 'No pairing code received.'); process.exit(1); }
    console.log(`\nPairing code: ${WA.status().code}\nOn the phone: WhatsApp > Settings > Linked devices > Link a device > "Link with phone number instead" > type the code.\n`);
  } else {
    if (!a || !b) { console.error('Usage: send <number> "<text>"'); process.exit(1); }
    await WA.connect();
  }
  if (WA.status().state === 'unavailable') { console.error(WA.status().error); process.exit(1); }
  if (!(await until(() => WA.status().state === 'open', mode === 'send' ? 45000 : 180000, 'WhatsApp to connect'))) process.exit(1);
  console.log(`Connected as +${WA.status().number}`);
  if (mode === 'send') {
    const id = await WA.sendText(waDigits(a), b);
    console.log(`Sent (message id ${id}). Check the other phone.`);
    await wait(2000); process.exit(0);
  }
  console.log('Linked. You can stop this script (Ctrl+C) and start the website: it will use this session.');
  await wait(3000); process.exit(0);
})().catch(e => { console.error('Failed:', e.message); process.exit(1); });
