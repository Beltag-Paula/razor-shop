// One-tap page for a barber: confirm or decline a booking request from the link in their notification.
// A button press is needed (opening the link never changes anything), so link previews cannot trigger it.
(() => {
  const box = document.getElementById('action'); if (!box) return;
  const d = box.dataset, token = location.hash.slice(1), LANG = document.documentElement.lang;
  const h = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); e.append(...kids); return e; };
  const call = async (method, body) => {
    const r = await fetch(`/api/action/${encodeURIComponent(token)}`, { method, headers: { 'Content-Type': 'application/json', 'X-Lang': LANG }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || d.errnotfound);
    return data;
  };
  const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const draw = (a, done) => {
    const statusText = { pending: d.stpending, booked: d.stbooked, cancelled: d.cancelledtext }[a.status] || a.status;
    const btns = a.status === 'pending'
      ? [h('button', { className: 'btn pill', type: 'button', textContent: d.actconfirm, onclick: () => go('confirm') }), h('button', { className: 'textbtn', type: 'button', textContent: d.actdecline, onclick: () => go('decline') })]
      : a.status === 'booked' ? [h('button', { className: 'textbtn', type: 'button', textContent: d.actcancel, onclick: () => { if (confirm(d.actsure)) go('cancel'); } })] : [];
    box.replaceChildren(...(done ? [h('p', { className: 'msg ok', textContent: d.actdone })] : []),
      h('p', {}, h('strong', { textContent: `${window.Dates ? Dates.fmt(a.date, LANG) : a.date}, ${hm(a.start_min)}\u2013${hm(a.end_min)}` })), h('p', { textContent: statusText }), h('p', { className: 'row' }, ...btns));
  };
  const go = async what => { try { draw(await call('POST', { do: what }), true); } catch (e) { box.prepend(h('p', { className: 'msg', textContent: e.message })); } };
  call('GET').then(a => draw(a, false)).catch(e => { box.replaceChildren(h('p', { className: 'msg', textContent: e.message })); });
})();
