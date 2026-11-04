/* Kiểm thử Tender Map (map/) bằng Playwright + backend giả lập (tools/map_mock.js).
   Chạy:  python3 -m http.server 8771 (ở gốc repo)  rồi  NODE_PATH=$(npm root -g) node tools/map_test.js [thư mục ảnh]
   Biến môi trường: KQTT_JSON = file JSON thật của ?action=kqttMap (không đưa vào repo), BASE = http://localhost:8771 */
const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs');
const mock = require('./map_mock');
const BASE = process.env.BASE || 'http://localhost:8771';
const OUT = process.argv[2] || path.join(__dirname, '.shots');
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const ok = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); if (!c) fails++; };

async function boot(b, ctxOpt, mopt) {
  const ctx = await b.newContext(Object.assign({ serviceWorkers: 'block' }, ctxOpt));
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const m = await mock.install(page, mopt);
  await page.goto(BASE + '/map/index.html');
  await page.waitForFunction(() => window.WINMAP && WINMAP.pkgs().length > 0 && document.getElementById('load').style.display === 'none', null, { timeout: 20000 });
  return { ctx, page, errs, db: m.db };
}

(async () => {
  const b = await chromium.launch();
  /* ── máy tính ── */
  let { ctx, page, errs, db } = await boot(b, { viewport: { width: 1440, height: 900 } });
  const info = await page.evaluate(dup => {
    const P = WINMAP.pkgs(), kq = P.filter(p => p.npp === 'KQTT');
    return { n: P.length, kq: kq.length, dup: kq.filter(p => dup.indexOf(p.tbmt) >= 0).length, fac: WINMAP.fac().length,
      linked: WINMAP.fac().filter(f => f.h && f.h.pk && f.h.pk.length).length };
  }, db.dupTb);
  ok(info.kq > 0, `KQTT: ${info.kq} gói thị trường (tổng ${info.n} gói)`);
  ok(info.dup === 0, `bỏ trùng theo TBMT: ${db.dupTb.length} số TBMT đã có ở NPP không còn trong KQTT`);
  ok(info.fac > 1000, `danh mục cơ sở y tế: ${info.fac} cơ sở, ${info.linked} có lịch sử thầu`);
  await page.click('#f-fy button[data-v="every"]');
  const bars = await page.$$eval('.mon .c', e => e.length);
  ok(bars >= 36, `Mọi năm: biểu đồ tháng ${bars} cột (từ 2023)`);
  await page.screenshot({ path: path.join(OUT, 'd1_toanquoc.png') });
  // tìm kiếm
  await page.fill('#qs', 'bv mat nghe an');
  await page.waitForSelector('#qsr .it');
  const first = await page.$eval('#qsr .it .nm', e => e.textContent);
  ok(/Mắt Nghệ An/i.test(first), `tìm "bv mat nghe an" ⇒ ${first}`);
  await page.screenshot({ path: path.join(OUT, 'd2_tim.png') });
  await page.keyboard.press('Enter');
  await page.waitForSelector('.finfo');
  const sh = await page.$eval('#sh-t', e => e.textContent);
  ok(/Mắt Nghệ An/.test(sh), 'mở chi tiết cơ sở: ' + sh);
  ok(await page.$('.hist .ev') !== null, 'có lịch sử trúng thầu');
  await page.screenshot({ path: path.join(OUT, 'd3_benhvien.png') });
  await page.fill('#qs', 'bach mai');
  await page.waitForSelector('#qsr .it');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /Bạch Mai/.test(document.getElementById('sh-t').textContent));
  ok(true, 'mở được cơ sở trong danh mục: Bạch Mai');
  // theo dõi thầu
  await page.click('#f-view button[data-v="fu"]');
  await page.waitForFunction(() => window.WINMAP && WINMAP.fu._S.loaded);
  ok(!(await page.$('#lg-email')), 'Theo dõi thầu mở ngay, không cần đăng nhập');
  await page.click('#fu-add');
  await page.waitForSelector('#fm-fq');
  await page.fill('#fm-fq', 'mat nghe an');
  await page.waitForSelector('#fm-fr .it');
  await page.keyboard.press('Enter');
  await page.fill('#fm-pkg', 'Gói vật tư tiêu hao nhãn khoa 2027');
  await page.fill('[data-ln="code"][data-i="0"]', 'MSL28SH');
  await page.fill('[data-ln="qty"][data-i="0"]', '300');
  await page.click('.kd button[data-kind="chi"]');
  await page.fill('[data-ln="code"][data-i="1"]', '1406');
  await page.fill('[data-ln="qty"][data-i="1"]', '120');
  await page.fill('#fm-note', 'Gặp trưởng khoa, giới thiệu MSL-SH. Khoa dùng dao Alcon, quan tâm giá.');
  await page.click('[data-fm="save"]');
  ok(/tên người cập nhật/i.test(await page.$eval('.ft2 .er', e => e.textContent)), 'chưa có tên ⇒ nhắc nhập tên người cập nhật');
  await page.fill('#fm-who', 'Khang');
  await page.screenshot({ path: path.join(OUT, 'd5_form.png') });
  await page.click('[data-fm="save"]');
  await page.waitForFunction(() => document.getElementById('fudlg').hidden);
  await page.waitForFunction(() => document.querySelectorAll('.fuc').length > 0 && !/đang lưu/.test(document.querySelector('.fuc').textContent), null, { timeout: 10000 });
  ok(db.fu.length === 1 && db.fu[0][15] === 1 && db.fu[0][3] === 'Khang', 'lưu gói mới (bước 1) ⇒ 1 dòng FOLLOW UP TENDER, người cập nhật = Khang');
  ok(await page.evaluate(() => localStorage.getItem('tm_fu_name')) === 'Khang', 'máy nhớ tên cho lần sau');
  await page.click('[data-fu-up]');
  ok(await page.$eval('#fm-who', e => e.value) === 'Khang', 'lần cập nhật sau: tên điền sẵn');
  await page.click('.stg button[data-st="3"]');
  await page.fill('#fm-note', 'Khoa đã chốt cấu hình theo MSL28SH, chờ báo giá.');
  await page.click('[data-fm="save"]');
  await page.waitForFunction(() => document.querySelectorAll('.fulog .ev').length >= 2, null, { timeout: 10000 });
  ok(db.fu.length === 2 && db.fu[1][1] === db.fu[0][1] && db.fu[1][2] === 2 && db.fu[1][15] === 3, 'cập nhật giai đoạn ⇒ dòng mới cùng mã, lần 2, dòng cũ giữ nguyên');
  await page.evaluate(() => { const d = document.querySelector('.fuc details'); if (d) d.open = true; });
  await page.screenshot({ path: path.join(OUT, 'd6_theodoi_bv.png') });
  await page.click('.sbk');
  await page.waitForFunction(() => /Theo dõi thầu/.test(document.getElementById('sh-t').textContent));
  await page.click('#zhome');
  await page.waitForTimeout(800);
  const badge = await page.$$eval('.bdg text', e => e.map(x => x.textContent));
  ok(badge.includes('1'), 'bản đồ theo dõi: huy hiệu số gói ở tỉnh');
  await page.screenshot({ path: path.join(OUT, 'd7_theodoi_toanquoc.png') });
  ok(!errs.length, 'không lỗi JS (máy tính)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();

  /* ── lỗi mạng khi lưu ⇒ hàng đợi thử lại ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 860 } }, { failSave: 1 }));
  await page.evaluate(() => localStorage.setItem('tm_fu_name', 'Khang'));
  await page.evaluate(() => { WINMAP.view('fu'); });
  await page.waitForFunction(() => window.WINMAP && WINMAP.fu._S.loaded);
  await page.evaluate(() => { const f = WINMAP.fac().find(x => /Bạch Mai/.test(x.name)); WINMAP.fu.open({ f }); });
  await page.fill('#fm-pkg', 'Gói dao phẫu thuật mắt');
  await page.fill('[data-ln="code"][data-i="0"]', 'MST15');
  await page.fill('[data-ln="qty"][data-i="0"]', '200');
  await page.click('[data-fm="save"]');
  await page.waitForFunction(() => !document.getElementById('obx').hidden);
  ok(true, 'mất mạng: hiện chip "Đang lưu…", thao tác không bị chặn');
  await page.waitForFunction(() => document.getElementById('obx').hidden, null, { timeout: 15000 });
  ok(db.fu.length === 1 && db.fu[0][3] === 'Khang', 'tự gửi lại khi có mạng ⇒ lưu đúng 1 dòng');
  ok(!errs.length, 'không lỗi JS (hàng đợi)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();

  /* ── có phiên email (Report Hub / CRM) ⇒ lấy tên trong phiên ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 860 } }));
  await page.evaluate(tk => localStorage.setItem('mmh_tk', JSON.stringify({ tk, exp: Date.now() + 864e5, user: { pic: 'Viet Ha', email: 'vietha@manimedicalhanoi.com' } })), db.tk);
  await page.evaluate(() => { WINMAP.view('fu'); const f = WINMAP.fac().find(x => /Chợ Rẫy/.test(x.name)); WINMAP.fu.open({ f }); });
  ok(!(await page.$('#fm-who')), 'có phiên email ⇒ không hỏi tên');
  await page.fill('#fm-pkg', 'Gói thử');
  await page.fill('[data-ln="code"][data-i="0"]', 'MSL22');
  await page.fill('[data-ln="qty"][data-i="0"]', '100');
  await page.click('[data-fm="save"]');
  await page.waitForFunction(() => document.getElementById('obx').hidden, null, { timeout: 10000 });
  ok(db.fu.length === 1 && db.fu[0][3] === 'Viet Ha', 'ghi theo tên trong phiên');
  await ctx.close();

  /* ── điện thoại ── */
  ({ ctx, page, errs, db } = await boot(b, devices['Pixel 7']));
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(wide <= 1, 'điện thoại: không tràn ngang (' + wide + ')');
  await page.screenshot({ path: path.join(OUT, 'm1_toanquoc.png') });
  await page.fill('#qs', 'ttyt anh son');
  await page.waitForSelector('#qsr .it');
  await page.screenshot({ path: path.join(OUT, 'm2_tim.png') });
  await page.keyboard.press('Enter');
  await page.waitForSelector('.finfo');
  await page.screenshot({ path: path.join(OUT, 'm3_benhvien.png'), fullPage: false });
  await page.evaluate(() => { WINMAP.view('fu'); const f = WINMAP.fac().find(x => /Mắt Nghệ An/.test(x.name)); WINMAP.fu.open({ f }); });
  await page.waitForSelector('#fm-pkg');
  const wide2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(wide2 <= 1, 'điện thoại: hộp cập nhật không tràn ngang');
  await page.screenshot({ path: path.join(OUT, 'm4_form.png') });
  ok(!errs.length, 'không lỗi JS (điện thoại)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
  await b.close();
  console.log(fails ? `\n${fails} mục chưa đạt` : '\nTất cả mục kiểm tra đạt');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
