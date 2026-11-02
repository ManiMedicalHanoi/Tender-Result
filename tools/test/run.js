/* Kiểm thử thao tác giao diện v2.0 (backend giả lập).
   python3 -m http.server 8768  (ở thư mục repo), rồi:
   LIBS=<node_modules có chart.js…> NODE_PATH=$(npm root -g) node tools/test/run.js <thư mục ảnh> */
const { chromium } = require('playwright');
const M = require('./mock');
const fs = require('fs'), path = require('path');
const out = process.argv[2] || 'shots'; fs.mkdirSync(out, { recursive: true });
function libPath(rel){ for (const d of (process.env.LIBS||'').split(':').concat((process.env.NODE_PATH||'').split(':'))) { if(!d) continue; const f=path.join(d,rel); if(fs.existsSync(f)) return f; } return null; }
async function page(b, w, h, init){
  const ctx = await b.newContext({ viewport:{width:w,height:h} });
  await ctx.addInitScript(o => { localStorage.setItem('mmh_auth','1'); for (const k in o) localStorage.setItem(k,o[k]); }, init||{});
  const p = await ctx.newPage(); p._errs=[];
  p.on('pageerror', e => p._errs.push(e.message));
  await p.route(/cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/, r => {
    const u=r.request().url(), map={'chart.umd':'chart.js/dist/chart.umd.js','chartjs-plugin-datalabels':'chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.min.js','xlsx.full':'xlsx/dist/xlsx.full.min.js','pptxgen':'pptxgenjs/dist/pptxgen.bundle.js'};
    for (const k in map) if (u.includes(k)) { const f=libPath(map[k]); if (f) return r.fulfill({path:f}); }
    return r.abort();
  });
  await M.route(p);
  await p.goto('http://localhost:8768/index.html'); await p.waitForTimeout(2500);
  return p;
}
const ok=[], bad=[]; const T=(c,m)=>(c?ok:bad).push(m);
(async () => {
  const b = await chromium.launch();
  /* máy tính */
  let p = await page(b, 1440, 900, { mmh_lang:'vi' });
  T(await p.locator('.nt.on').innerText() === 'Tổng quan thị trường', 'tab mặc định = Tổng quan');
  T(await p.evaluate(() => !/\p{Extended_Pictographic}/u.test(document.querySelector('.main').innerText + document.querySelector('.hdr').innerText + document.getElementById('sidebar').innerText)), 'không còn emoji trong giao diện');
  T(await p.evaluate(() => getComputedStyle(document.querySelector('.hdr')).backgroundImage === 'none'), 'thanh trên không gradient');
  await p.click('#more-btn'); await p.waitForTimeout(200);
  T(await p.locator('#more-pop.on').count() === 1, 'menu Thêm mở');
  await p.screenshot({ path: out + '/menu.png' });
  await p.click('#theme-btn'); await p.waitForTimeout(900);
  T(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark', 'chế độ tối bật');
  await p.screenshot({ path: out + '/dark.png' });
  await p.click('#more-btn'); await p.click('#theme-btn'); await p.waitForTimeout(600);
  await p.click('#more-btn'); await p.click('#lang-en'); await p.waitForTimeout(800);
  T((await p.locator('#nt-market').innerText()).trim() === 'Market Overview', 'đổi sang tiếng Anh');
  T((await p.locator('#sb-app').innerText()).trim() === 'Tender results', 'tên app theo ngôn ngữ');
  await p.click('#more-btn'); await p.click('#lang-vi'); await p.waitForTimeout(800);
  await p.evaluate(() => goTab('market')); await p.waitForTimeout(500);
  await p.locator('.rkr').first().click(); await p.waitForTimeout(900);
  T(await p.locator('#drill.on').count() === 1, 'bấm 1 chủ đầu tư ⇒ mở bảng chi tiết');
  await p.screenshot({ path: out + '/drill.png' });
  await p.evaluate(() => closeDrill()); await p.waitForTimeout(300);
  await p.evaluate(() => openTierModal()); await p.waitForTimeout(500);
  await p.screenshot({ path: out + '/tiers.png' });
  T(await p.locator('#tier-modal.on').count() === 1, 'hộp Phân khúc giá mở');
  await p.evaluate(() => closeTierModal());
  for (const t of ['brand','acct','vs','fc']) { await p.evaluate(x => goTab(x), t); await p.waitForTimeout(1200); }
  T(await p.evaluate(() => !document.querySelector('#fc-body .emptynote') || document.getElementById('fc-body').children.length > 1), 'tab Dự trù không kẹt "Đang tải"');
  T(p._errs.length === 0, 'không lỗi trang (máy tính): ' + p._errs.join(' | '));
  /* điện thoại */
  p = await page(b, 390, 844, { mmh_lang:'vi' });
  T(await p.evaluate(() => document.getElementById('sidebar').getBoundingClientRect().right <= 0), 'điện thoại: thanh bên ẩn');
  await p.click('.only-m'); await p.waitForTimeout(400);
  T(await p.evaluate(() => document.getElementById('sidebar').getBoundingClientRect().left >= -1), 'điện thoại: mở ngăn kéo bộ lọc');
  await p.screenshot({ path: out + '/m_drawer.png' });
  await p.click('.sb-scrim', { position:{ x: 370, y: 400 } }); await p.waitForTimeout(400);
  await p.click('#bn-acct'); await p.waitForTimeout(900);
  T(await p.locator('#sec-acct.on').count() === 1, 'điện thoại: thanh dưới đổi màn hình');
  await p.click('#more-btn'); await p.waitForTimeout(200);
  await p.screenshot({ path: out + '/m_menu.png' });
  T(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'điện thoại: không cuộn ngang trang');
  T(p._errs.length === 0, 'không lỗi trang (điện thoại): ' + p._errs.join(' | '));
  await b.close();
  console.log(ok.map(x => '✓ ' + x).join('\n')); if (bad.length) { console.log(bad.map(x => '✗ ' + x).join('\n')); process.exit(1); }
  console.log('Tất cả ' + ok.length + ' kiểm tra đạt');
})();
