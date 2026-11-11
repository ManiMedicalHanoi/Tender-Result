/* Tender Map — service worker (cài app + mở nhanh + mở được khi mất mạng).
   11/11/2026 (v23, người dùng: mở app tải lâu): tệp có số phiên bản (?v=…) KHÔNG đổi nội dung theo số ⇒ lấy BẢN LƯU TRÊN MÁY ngay
   (không chờ mạng); trang index.html: mạng trước, quá 2,5 giây hoặc mất mạng ⇒ bản lưu (tải mới vẫn chạy nền cho lần sau).
   Ảnh biểu tượng: bản lưu trước rồi tải mới. Dữ liệu Apps Script (khác tên miền) KHÔNG qua đây — trang tự nhớ bản đọc gần nhất (IndexedDB).
   Phát hành bản mới = tăng ?v= trong index.html (+ CORE dưới đây) và V. Gỡ khẩn cấp: thay toàn bộ file bằng
   self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister())); */
const V = 'tr-map-v24';
const CORE = ['./', './index.html', './app.css?v=24', './app.js?v=24', './vn-geo.js?v=24', './vn-dist.js?v=24', './products.js?v=24', './csyt.js?v=24', './codes.js?v=24', './manifest.webmanifest', './app/icon-192.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function put(req, r) { if (r && r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); } return r; }
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  /* tệp có số phiên bản: bản lưu trước (không đổi theo số) */
  if (u.searchParams.has('v') && /\.(js|css)$/.test(u.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r))));
    return;
  }
  if (/\.(png|svg|ico)$/.test(u.pathname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => put(req, r)).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  /* trang (index.html …): mạng trước, chờ tối đa 2,5 giây rồi dùng bản lưu; mạng về sau vẫn cập nhật bản lưu cho lần mở tới */
  const net = fetch(req).then(r => put(req, r));
  e.respondWith(new Promise(res => {
    let done = false;
    const fallback = () => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'));
    const t = setTimeout(() => fallback().then(hit => { if (hit && !done) { done = true; res(hit); } }), 2500);
    net.then(r => { if (!done) { done = true; clearTimeout(t); res(r); } })
       .catch(() => fallback().then(hit => { if (!done) { done = true; clearTimeout(t); res(hit || Response.error()); } }));
  }));
  e.waitUntil(net.catch(() => {}));
});
