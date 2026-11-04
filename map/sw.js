/* Tender Map — service worker (cài app + mở được khi mất mạng).
   Trang / script: lấy MẠNG trước (luôn bản mới), mất mạng ⇒ bản lưu. Ảnh biểu tượng: bản lưu trước rồi tải mới.
   Dữ liệu Apps Script (khác tên miền) KHÔNG qua đây — trang tự nhớ bản đọc gần nhất (localStorage).
   Đổi quy tắc lưu ⇒ tăng V. Gỡ khẩn cấp: thay toàn bộ file bằng
   self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister())); */
const V = 'tr-map-v8';
const CORE = ['./', './index.html', './app.css?v=8', './app.js?v=8', './vn-geo.js', './vn-dist.js', './products.js', './csyt.js', './codes.js', './manifest.webmanifest', './app/icon-192.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  if (/\.(png|svg|ico)$/.test(u.pathname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  e.respondWith(fetch(req).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
});
