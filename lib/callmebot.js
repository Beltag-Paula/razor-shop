// CallMeBot (https://www.callmebot.com/blog/free-api-whatsapp-messages/): a free third-party service that sends a
// WhatsApp message to YOUR OWN number. Nothing is linked and no business account is needed. Each barber does this once:
//   1. save the CallMeBot contact in the phone and send it "I allow callmebot to send me messages",
//   2. it replies with an API key, 3. enter the number and key in the dashboard.
// Trade-offs: the message passes through CallMeBot's servers, it comes from their number, and you cannot reply to it
// (so confirm or decline with the one-tap link in the message).
const { waDigits } = require('./phone');

async function send(phone, apikey, text) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent('+' + waDigits(phone))}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const body = (await r.text()).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!r.ok || /error/i.test(body)) throw Object.assign(new Error(`CallMeBot: ${body.slice(0, 200) || r.status}`), { status: 400 });
}
module.exports = { send };
