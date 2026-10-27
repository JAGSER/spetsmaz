// network first, cached app shell for offline, payment reminders on chosen weekdays
const C = 'sm-v5';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(['/', '/manifest.webmanifest', '/icon-192.png'])).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && k !== 'sm-data').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate') { e.respondWith(fetch(r).catch(() => caches.match('/'))); return; }
  if (u.pathname === '/config.json' || u.pathname === '/__remind') return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r)));
});
async function remind(){
  const c = await caches.open('sm-data'); const r = await c.match('/__remind'); if (!r) return;
  const d = await r.json(); const now = new Date(), key = now.toDateString();
  if (!d.on || !(d.days || []).includes(now.getDay()) || d.last === key || now.getHours() < 9 || now.getHours() > 21) return;
  d.last = key; await c.put('/__remind', new Response(JSON.stringify(d), {headers: {'content-type': 'application/json'}}));
  await self.registration.showNotification('Сегодня день оплаты', {body: d.text, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'pay-remind', data: {url: '/#/pay'}});
}
self.addEventListener('periodicsync', e => { if (e.tag === 'pay-remind') e.waitUntil(remind()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(ws => { for (const w of ws) { if (w.navigate) w.navigate(url); return w.focus(); } return self.clients.openWindow(url); }));
});
