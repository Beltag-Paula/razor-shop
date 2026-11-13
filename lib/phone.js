// International digits for WhatsApp: "0722 123 456" -> "40722123456", "+40 722 123 456" -> "40722123456".
const CC = () => process.env.DEFAULT_COUNTRY_CODE || '40';
function waDigits(phone) {
  let d = String(phone || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1).replace(/\D/g, '');
  d = d.replace(/\D/g, '');
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) return CC() + d.slice(1);
  return d;
}
module.exports = { waDigits };
