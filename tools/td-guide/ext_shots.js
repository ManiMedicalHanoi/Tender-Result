// Ảnh hướng dẫn cài tiện ích (chrome://extensions thật + bảng trạng thái của tiện ích). Chạy: xvfb-run -a node tools/td-guide/ext_shots.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const EXT = path.resolve(__dirname, '../../theo-doi/tien-ich'), OUT = path.resolve(__dirname, 'raw');
const deep = `(sel) => { const m = document.querySelector('extensions-manager'); const tb = m.shadowRoot.querySelector('extensions-toolbar');
  const pick = { dev: () => tb.shadowRoot.querySelector('#devMode'), load: () => tb.shadowRoot.querySelector('#loadUnpacked'),
    card: () => { const il = m.shadowRoot.querySelector('extensions-item-list'); return il && il.shadowRoot.querySelector('extensions-item'); } };
  const e = pick[sel](); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }`;
async function ring(pg, sel, pad) {
  const r = await pg.evaluate(eval(deep), sel); if (!r) return console.log('không thấy', sel);
  await pg.evaluate(([r, p]) => { const d = document.createElement('div'); d.className = 'mmh-ring';
    Object.assign(d.style, { position: 'fixed', left: (r.x - p) + 'px', top: (r.y - p) + 'px', width: (r.w + 2 * p) + 'px', height: (r.h + 2 * p) + 'px', border: '3px solid #E8590C', borderRadius: '10px', zIndex: 99999, pointerEvents: 'none', boxShadow: '0 0 0 4px rgba(232,89,12,.18)' });
    document.body.appendChild(d); }, [r, pad || 6]);
}
const unring = pg => pg.evaluate(() => document.querySelectorAll('.mmh-ring').forEach(e => e.remove()));
(async () => {
  // 1) chưa có tiện ích, Developer mode tắt
  let ctx = await chromium.launchPersistentContext(path.join(OUT, 'p1'), { headless: false, viewport: { width: 1280, height: 720 }, locale: 'vi-VN', args: ['--lang=vi'] });
  let pg = ctx.pages()[0] || await ctx.newPage();
  await pg.goto('chrome://extensions'); await pg.waitForTimeout(1500);
  await ring(pg, 'dev', 8); await pg.screenshot({ path: path.join(OUT, 'e1-dev-off.png') }); await unring(pg);
  await pg.evaluate(eval(`() => { const m = document.querySelector('extensions-manager'); m.shadowRoot.querySelector('extensions-toolbar').shadowRoot.querySelector('#devMode').click(); }`));
  await pg.waitForTimeout(1200);
  await ring(pg, 'dev', 8); await ring(pg, 'load', 6); await pg.screenshot({ path: path.join(OUT, 'e2-dev-on.png') }); await unring(pg);
  await ring(pg, 'load', 6); await pg.screenshot({ path: path.join(OUT, 'e3-load.png') });
  await ctx.close();
  // 2) đã nạp tiện ích
  ctx = await chromium.launchPersistentContext(path.join(OUT, 'p2'), { headless: false, viewport: { width: 1280, height: 720 }, locale: 'vi-VN',
    args: ['--lang=vi', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
  const id = sw.url().split('/')[2];
  pg = ctx.pages()[0] || await ctx.newPage();
  await pg.goto('chrome://extensions'); await pg.waitForTimeout(1500);
  await pg.evaluate(eval(`() => { const m = document.querySelector('extensions-manager'); const d = m.shadowRoot.querySelector('extensions-toolbar').shadowRoot.querySelector('#devMode'); if (!d.checked) d.click(); }`));
  await pg.waitForTimeout(1200);
  await ring(pg, 'card', 6); await pg.screenshot({ path: path.join(OUT, 'e4-card.png') });
  // bảng trạng thái (popup)
  await sw.evaluate(() => chrome.storage.local.set({ off: false, tk: 'x', pic: 'Giang', dev: 'Máy văn phòng', show: false, st: { v: '1.1.0', busy: true, msg: 'Đang tải hồ sơ…', agent: true, n: 3, ag: 2, me: 'Giang', err: '', job: 'IB2500491794 · Bệnh viện Chuyên khoa Mắt Vĩnh Long',
    last: { at: '19/11/2026, 14:02:10', done: 2, upAg: 3 }, log: ['14:05:12   ⬇ IB2500491794 - Biên bản mở thầu.pdf (213 KB)', '14:04:51   ⬇ IB2500491794 - Thông báo mời thầu.pdf (35 KB)', '14:04:30 ▶ IB2500491794 · Bệnh viện Chuyên khoa Mắt Vĩnh Long', '14:02:10 ✓ IB2500512033: 7 file · 64 giây'] } }));
  await sw.evaluate(() => { chrome.alarms.clearAll(); });
  const pp = await ctx.newPage(); await pp.setViewportSize({ width: 330, height: 520 });
  await pp.goto('chrome-extension://' + id + '/popup.html'); await pp.waitForTimeout(800);
  const hgt = await pp.evaluate(() => document.body.scrollHeight);
  await pp.screenshot({ path: path.join(OUT, 'e5-popup.png'), clip: { x: 0, y: 0, width: 330, height: Math.min(hgt, 520) } });
  await ctx.close();
  for (const d of ['p1', 'p2']) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
  console.log('xong', fs.readdirSync(OUT));
})();
