/* Theo dõi gói thầu — service worker tối giản: chỉ để cài được như ứng dụng. Trang luôn lấy mạng trước (không giữ dữ liệu cũ);
   Apps Script / Drive / trang khác không đụng tới. Đổi quy tắc ⇒ tăng V. */
const V = 'wt-8';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
});
