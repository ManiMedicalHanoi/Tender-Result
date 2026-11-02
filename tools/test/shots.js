/* Chụp ảnh 5 tab ở 1440 & 390.  NODE_PATH=$(npm root -g) node tools/test/shots.js <thư mục ra> [lang]
   Cần máy chủ tĩnh: python3 -m http.server 8768 (ở thư mục repo). */
const { chromium } = require('playwright');
const M = require('./mock');
const out = process.argv[2] || 'shots'; const lang = process.argv[3] || 'vi';
const fs = require('fs'), path = require('path');
/* thư viện CDN lấy từ node_modules cục bộ (cdn bị chặn trong môi trường Claude) — đặt LIBS=<thư mục node_modules> */
function libPath(rel){ for (const d of (process.env.LIBS || '').split(':').concat((process.env.NODE_PATH||'').split(':'))) { if (!d) continue; const f = path.join(d, rel); if (fs.existsSync(f)) return f; } return null; } fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await ctx.addInitScript(l => { localStorage.setItem('mmh_auth', '1'); localStorage.setItem('mmh_lang', l); }, lang);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tag + ': ' + e.message));
    await p.route(/cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/, r => {
      const u = r.request().url();
      const map = { 'chart.umd': 'chart.js/dist/chart.umd.js', 'chartjs-plugin-datalabels': 'chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.min.js', 'xlsx.full': 'xlsx/dist/xlsx.full.min.js', 'pptxgen': 'pptxgenjs/dist/pptxgen.bundle.js' };
      for (const k in map) if (u.includes(k)) { const f = libPath(map[k]); if (f) return r.fulfill({ path: f }); }
      return r.abort();
    });
    await M.route(p);
    await p.goto('http://localhost:8768/index.html');
    await p.waitForTimeout(2500);
    for (const tab of ['market', 'brand', 'acct', 'vs', 'fc']) {
      await p.evaluate(t => goTab(t), tab);
      await p.waitForTimeout(1800);
      await p.screenshot({ path: `${out}/${tag}_${tab}.png`, fullPage: tag === 'd' ? false : false });
      if (tag === 'd') await p.screenshot({ path: `${out}/${tag}_${tab}_full.png`, fullPage: true });
    }
    await ctx.close();
  }
  console.log(errs.length ? 'ERR:\n' + errs.join('\n') : 'no page errors');
  await b.close();
})();
