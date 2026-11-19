// Ảnh hướng dẫn app Theo dõi gói thầu (dữ liệu mẫu, máy chủ giả). Chạy ở gốc repo: python3 -m http.server 8792 & ; NODE_PATH=$(npm root -g) node tools/td-guide/app_shots.js
const { chromium, devices } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, 'raw'), URL = 'http://localhost:8792/theo-doi/index.html';
const now = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
const T = (m) => new Date(Date.now() + 7 * 3600e3 - m * 60e3).toISOString().slice(0, 19).replace('T', ' ');
const F = (n, s, k, z, g) => ({ name: n, url: 'https://drive.google.com/file/d/x' + n.length + '/view', id: 'x' + n.length + s, sec: s, kind: k, size: z, gsheet: g ? 1 : 0 });
function data() {
  const H = [
    { key: 'h1', type: 'kqdt', no: 'IB2500491794', investor: 'Bệnh viện Chuyên khoa Mắt Vĩnh Long', name: 'Mua sắm vật tư y tế, hóa chất sử dụng tại Bệnh viện Chuyên khoa Mắt Vĩnh Long giai đoạn 2026-2027', date: '2026-02-13', found: T(3000), status: 'Đã tải', done: T(40), last: T(42), tries: 1, watchers: 1,
      info: { prov: 'Vĩnh Long', price: '61733138030', win: '58420000000', winner: 'Công ty TNHH Thiết bị Y tế Hùng Vĩ', url: 'https://muasamcong.mof.gov.vn/',
        agentFiles: [{ name: '18 BCĐG + TCG GÓI VTYT.pdf', type: 'Báo cáo đánh giá tổng hợp E-HSDT', tab: 'kq', fileId: 'a1', tries: 0 }] },
      files: [F('IB2500491794 - Thông báo mời thầu.pdf', 'tbmt', 'Thông báo mời thầu', 35800), F('IB2500491794 - Quyết định phê duyệt HSMT.pdf', 'tbmt', 'Quyết định phê duyệt HSMT', 412000),
        F('IB2500491794 - HSMT - Yêu cầu về kỹ thuật.doc', 'tbmt', 'HSMT - Yêu cầu về kỹ thuật', 1250000), F('IB2500491794 - Biên bản mở thầu.pdf', 'mo', 'Biên bản mở thầu', 218000),
        F('IB2500491794 - 12 Nhà thầu tham dự', 'mo', 'Nhà thầu tham dự', 30500, 1), F('IB2500491794 - Quyết định phê duyệt KQLCNT.pdf', 'kq', 'Quyết định phê duyệt KQLCNT', 388000),
        F('IB2500491794 - Danh sách nhà thầu', 'kq', 'Danh sách nhà thầu', 29700, 1), F('IB2500491794 - Danh sách hàng hóa', 'kq', 'Danh sách hàng hóa', 34800, 1)] },
    { key: 'h2', type: 'tbmt', no: 'IB2600112233', investor: 'Bệnh viện Mắt Trung ương', name: 'Mua sắm dao phẫu thuật nhãn khoa và chỉ khâu năm 2026', date: '2026-11-17', found: T(300), status: 'Đang tải', last: T(1), tries: 1, watchers: 1, info: { prov: 'Hà Nội', price: '4250000000' }, files: [] },
    { key: 'h3', type: 'tbmt', no: 'IB2600118790', investor: 'Bệnh viện Đa khoa tỉnh Nghệ An', name: 'Mua sắm vật tư tiêu hao phẫu thuật năm 2026-2027', date: '2026-11-18', found: T(200), status: 'Chờ tải', last: '', tries: 0, watchers: 1, info: { prov: 'Nghệ An' }, files: [] },
    { key: 'h4', type: 'khmt', no: 'PL2500276110', investor: 'Bệnh viện Chuyên khoa Mắt Vĩnh Long', name: 'Mua sắm vật tư y tế, hóa chất giai đoạn 2026-2027', date: '2025-10-30', found: T(5000), status: 'Đã tải', done: T(600), last: T(601), tries: 1, watchers: 1,
      info: { prov: 'Vĩnh Long', price: '61733138030' }, files: [F('PL2500276110 - Quyết định phê duyệt KHLCNT.pdf', 'kh', 'Quyết định phê duyệt KHLCNT', 245000), F('PL2500276110 - Kế hoạch lựa chọn nhà thầu.pdf', 'kh', 'Kế hoạch lựa chọn nhà thầu', 61000)] },
  ];
  return H;
}
function mock(state) {
  return async route => {
    const u = new globalThis.URL(route.request().url()); const p = Object.fromEntries(u.searchParams);
    const body = route.request().postData(); if (body) Object.assign(p, Object.fromEntries(new URLSearchParams(body)));
    const a = p.action, H = state.hits, ok = x => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign({ ok: true }, x)) });
    const boot = () => ({ v: '1.9', me: { pic: 'Giang', mail: 'giang@x', boss: true, admin: true }, watches: [{ id: 'w1', investor: 'Bệnh viện Chuyên khoa Mắt Vĩnh Long', types: ['tbmt', 'kqdt'], keywords: ['nhãn khoa'], dl: true, mail: 'giang@x', active: true }, { id: 'w2', investor: 'Bệnh viện Mắt Trung ương', types: ['tbmt', 'kqdt', 'khmt'], keywords: [], dl: true, mail: 'giang@x', active: true }],
      hits: H, types: {}, bot: { seen: T(1), name: 'Tiện ích · Giang (Máy văn phòng)', queue: 2 }, sumUrl: 'https://docs.google.com/x', rootUrl: 'https://drive.google.com/x', agw: { seen: T(0), name: 'Tiện ích · Giang (Máy văn phòng)', agent: '1' },
      ext: state.ext || [{ name: 'Tiện ích · Giang (Máy văn phòng)', min: 0, agent: true }] });
    if (a === 'wBoot') return ok(boot());
    if (a === 'wDocs') return ok({ all: true, rows: [] });
    if (a === 'wQuick') { H.unshift({ key: 'hq', type: 'tbmt', no: 'IB2600120456', investor: 'Bệnh viện Mắt TP. Hồ Chí Minh', name: 'Mua sắm vật tư y tế phẫu thuật nhãn khoa năm 2026', date: '2026-11-19', found: now(), status: 'Chờ tải', last: '', tries: 0, watchers: 1, info: { prov: 'TP. Hồ Chí Minh' }, files: [] }); return ok(Object.assign(boot(), { queued: ['hq'], skipped: [] })); }
    if (a === 'wtKick') return ok({ kicked: true });
    return ok({});
  };
}
async function setup(ctx, state, ext) {
  await ctx.addInitScript(([ext]) => {
    localStorage.setItem('mmh_tk', JSON.stringify({ tk: 'test', user: { pic: 'Giang', email: 'giang@manimedicalhanoi.com' }, exp: Date.now() + 864e5 }));
    localStorage.setItem('wt_tab', 'watch'); localStorage.setItem('wt_gd_seen', '1'); localStorage.setItem('wt_gd', '0'); localStorage.setItem('wt_seen:giang@x', '2099-01-01 00:00:00');
    document.addEventListener('DOMContentLoaded', () => { const css = document.createElement('style'); css.textContent = '#nb{display:none!important}'; document.head.appendChild(css); });
    if (ext) {
      const mark = () => document.documentElement && document.documentElement.setAttribute('data-mmh-ext', '1.1.0');
      mark(); document.addEventListener('DOMContentLoaded', mark);
      const st = { v: '1.1.0', agent: true, busy: false, msg: 'Không có gói chờ tải', n: 0 };
      window.addEventListener('message', e => { if (e.data && (e.data.mmhExt === 'ask' || e.data.mmhExt === 'kick')) setTimeout(() => window.postMessage({ mmhExt: 'state', v: '1.1.0', st: window.__extSt || st }, '*'), 50); });
      setTimeout(() => window.postMessage({ mmhExt: 'state', v: '1.1.0', st }, '*'), 400);
    }
  }, [ext]);
  await ctx.route(/script\.google(usercontent)?\.com/, mock(state));
}
const ringCss = sel => `${sel}{outline:3px solid #E8590C!important;outline-offset:3px;border-radius:8px;box-shadow:0 0 0 7px rgba(232,89,12,.18)!important}`;
(async () => {
  const b = await chromium.launch();
  // ── máy tính
  const st = { hits: data() };
  let ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, deviceScaleFactor: 1, locale: 'vi-VN' });
  await setup(ctx, st, true);
  let pg = await ctx.newPage();
  await pg.goto(URL); await pg.waitForTimeout(2200);
  await pg.screenshot({ path: path.join(OUT, 'a0-watch.png') });
  // thanh hướng dẫn mở
  await pg.click('[data-gd="tog"]'); await pg.waitForTimeout(500);
  await pg.screenshot({ path: path.join(OUT, 'a0-guide.png') });
  await pg.click('[data-gd="tog"]'); await pg.waitForTimeout(300);
  // dán số + bấm Tải ngay
  const q = pg.locator('#q-nos'); await q.scrollIntoViewIfNeeded();
  await pg.addStyleTag({ content: ringCss('#q-nos') + ringCss('[data-a="quick"]') });
  await q.fill('IB2600120456');
  const box = await pg.locator('#proc').boundingBox(), qb = await pg.locator('.quick').boundingBox();
  await pg.screenshot({ path: path.join(OUT, 'a1-dan-so.png'), clip: { x: 0, y: Math.max(0, box.y - 8), width: 1360, height: Math.min(860, qb.y + qb.height - box.y + 30) } });
  await pg.screenshot({ path: path.join(OUT, 'r1.png') });
  await pg.evaluate(() => document.querySelectorAll('style').forEach(s => { if (/E8590C/.test(s.textContent)) s.remove(); }));
  await pg.click('[data-a="quick"]'); await pg.waitForTimeout(1500);
  await pg.screenshot({ path: path.join(OUT, 'r2.png') });
  const pb = await pg.locator('#proc').boundingBox();
  await pg.screenshot({ path: path.join(OUT, 'a3-tien-trinh.png'), clip: { x: 0, y: Math.max(0, pb.y - 8), width: 1360, height: pb.height + 16 } });
  // đang tải ⇒ xong
  st.hits[0].status = 'Đang tải'; st.hits[0].last = T(0);
  await pg.evaluate(() => { window.__extSt = { v: '1.1.0', agent: true, busy: true, job: 'IB2600120456 · Bệnh viện Mắt TP. Hồ Chí Minh', n: 2 }; window.postMessage({ mmhExt: 'ask' }, '*'); S._lt = 0; load(); });
  await pg.waitForTimeout(1500); await pg.screenshot({ path: path.join(OUT, 'r3.png') });
  st.hits[0].status = 'Đã tải'; st.hits[0].done = now(); st.hits[0].info = { prov: 'TP. Hồ Chí Minh', price: '2860000000', url: 'https://muasamcong.mof.gov.vn/' };
  st.hits[0].files = [F('IB2600120456 - Thông báo mời thầu.pdf', 'tbmt', 'Thông báo mời thầu', 41200), F('IB2600120456 - Quyết định phê duyệt HSMT.pdf', 'tbmt', 'Quyết định phê duyệt HSMT', 365000), F('IB2600120456 - HSMT - Yêu cầu về kỹ thuật.docx', 'tbmt', 'HSMT - Yêu cầu về kỹ thuật', 820000), F('IB2600120456 - HSMT - Tiêu chuẩn đánh giá HSDT.pdf', 'tbmt', 'HSMT - Tiêu chuẩn đánh giá HSDT', 512000)];
  await pg.evaluate(() => { window.__extSt = { v: '1.1.0', agent: true, busy: false, msg: 'Lượt xong: 1 gói', n: 1 }; window.postMessage({ mmhExt: 'ask' }, '*'); load(); });
  await pg.waitForTimeout(1500); await pg.screenshot({ path: path.join(OUT, 'r4.png') });
  await pg.click('[data-tab="docs"]'); await pg.waitForTimeout(1500);
  await pg.screenshot({ path: path.join(OUT, 'r5.png') });
  // thẻ gói đã tải: IB2500491794
  await pg.evaluate(() => { DOPEN = { _all: '0', h1: true }; render(); });
  await pg.waitForTimeout(500);
  await pg.waitForTimeout(3500);
  const li = pg.locator('.dc > li.op').first(); await li.scrollIntoViewIfNeeded();
  const lb = await li.boundingBox();
  await pg.screenshot({ path: path.join(OUT, 'a5-the-goi.png'), clip: { x: lb.x - 8, y: lb.y - 8, width: lb.width + 16, height: Math.min(lb.height + 16, 860) } });
  await pg.evaluate(() => { DOPEN = { _all: '' }; render(); scrollTo(0, 0); }); await pg.waitForTimeout(400);
  await pg.screenshot({ path: path.join(OUT, 'a6-docs.png') });
  // hướng dẫn mở (để xem bố cục)
  await pg.evaluate(() => { GD.open = true; GD.sec = 'cai'; render(); scrollTo(0, 0); }); await pg.waitForTimeout(600);
  await pg.screenshot({ path: path.join(OUT, 'a7-guide-cai.png'), fullPage: true });
  await ctx.close();
  // ── điện thoại (không có tiện ích, máy văn phòng đang bật)
  const st2 = { hits: data() };
  ctx = await b.newContext(Object.assign({}, devices['iPhone 13'], { locale: 'vi-VN' }));
  await setup(ctx, st2, false);
  pg = await ctx.newPage(); await pg.goto(URL); await pg.waitForTimeout(2200);
  await pg.screenshot({ path: path.join(OUT, 'p0.png'), fullPage: true });
  await pg.evaluate(() => { const t = document.getElementById('q-nos'); t.scrollIntoView({ block: 'center' }); });
  await pg.locator('#q-nos').fill('IB2600120456');
  await pg.click('[data-a="quick"]'); await pg.waitForTimeout(1800);
  await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(300);
  await pg.screenshot({ path: path.join(OUT, 'a4-phone.png') });
  await pg.click('[data-tab="docs"]'); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { DOPEN = { _all: '0', h1: true }; render(); }); await pg.waitForTimeout(400);
  await pg.screenshot({ path: path.join(OUT, 'a8-phone-docs.png'), fullPage: false });
  // minh hoạ giải nén (Windows)
  const wp = await b.newPage({ viewport: { width: 900, height: 420 } });
  await wp.setContent(`<html><body style="margin:0;font:13px 'Segoe UI',Aptos,sans-serif;background:#E9EEF4">
  <div style="position:absolute;left:24px;top:24px;width:852px;height:372px;background:#fff;border:1px solid #CBD3DC;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.08);overflow:hidden">
   <div style="height:38px;background:#F3F6F9;border-bottom:1px solid #E1E6EC;display:flex;align-items:center;padding:0 14px;gap:10px;color:#333">📁 <b style="font-weight:600">Downloads</b><span style="color:#888">› Tải xuống</span></div>
   <div style="display:flex;height:334px"><div style="width:170px;border-right:1px solid #EEF1F4;padding:10px 12px;color:#555;line-height:2">⭐ Quick access<br>🖥 Desktop<br><b style="color:#1C5FB8">⬇ Downloads</b><br>📄 Documents</div>
   <div style="flex:1;padding:10px 14px"><div style="display:grid;grid-template-columns:1fr 160px 90px;color:#777;border-bottom:1px solid #EEF1F4;padding:4px 6px"><span>Name</span><span>Type</span><span>Size</span></div>
    <div style="display:grid;grid-template-columns:1fr 160px 90px;padding:6px;background:#CCE4F7;border-radius:4px;margin-top:4px"><span>🗜 <b style="font-weight:600">MMH_Tai_ho_so_thau.zip</b></span><span>Compressed (zipped)</span><span>22 KB</span></div>
    <div style="display:grid;grid-template-columns:1fr 160px 90px;padding:6px;color:#444"><span>📁 MMH_Tai_ho_so_thau</span><span>File folder</span><span></span></div>
   </div></div></div>
  <div style="position:absolute;left:300px;top:110px;width:250px;background:#fff;border:1px solid #CBD3DC;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:6px 0;color:#222">
   <div style="padding:7px 16px">Open</div>
   <div style="padding:7px 16px;margin:0 6px;background:#FFF1E8;outline:3px solid #E8590C;border-radius:6px;font-weight:600">Extract All… / Giải nén tất cả</div>
   <div style="padding:7px 16px">Share</div><div style="padding:7px 16px">Copy</div><div style="padding:7px 16px">Rename</div><div style="padding:7px 16px">Properties</div></div>
  <div style="position:absolute;left:580px;top:150px;width:260px;color:#7A3C00;background:#FFF6E0;border:1px solid #F2D9B0;border-radius:8px;padding:10px 12px;line-height:1.45">Chuột phải file zip ⇒ <b>Extract All…</b> ⇒ <b>Extract</b>.<br>Được thư mục <b>MMH_Tai_ho_so_thau</b> — để nguyên, dùng ở bước 4.</div>
  </body></html>`);
  await wp.screenshot({ path: path.join(OUT, 'w1-extract.png') });
  await b.close(); console.log('xong');
})();
