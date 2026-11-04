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
  if (!(mopt && mopt.tour)) await ctx.addInitScript(() => { try { localStorage.setItem('tm_tour_v1', '1'); } catch (e) {} });   // không tự mở hướng dẫn lần đầu
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
  await page.selectOption('#f-period', 'every');
  const bars = await page.$$eval('.mon .c', e => e.length);
  ok(bars >= 36, `Mọi năm: biểu đồ tháng ${bars} cột (từ 2023)`);
  ok(await page.$eval('#f-view', e => e.textContent) === 'Kết quả thầuTheo dõi thầu', 'chế độ: Kết quả thầu | Theo dõi thầu');
  ok(!(await page.$eval('#sb', e => /trùng số TBMT/.test(e.textContent))), 'không còn ghi chú kỹ thuật bỏ trùng TBMT');
  const rk = await page.$$eval('.rank li', l => ({ n: l.length, fua: l.filter(x => x.querySelector('.fua')).length, cmp: !!document.querySelector('.cmpn') }));
  ok(rk.n > 0 && rk.fua === rk.n && rk.cmp, `top bệnh viện: ${rk.n} dòng, có ▲▼ so kỳ trước + nút "+ Theo dõi"`);
  await page.screenshot({ path: path.join(OUT, 'd1_toanquoc.png') });
  // bộ lọc: bảng thả xuống ⇒ nhãn có × ⇒ bỏ lọc
  await page.click('#f-more');
  await page.waitForSelector('#fdrw:not([hidden])');
  await page.click('#f-npp button[data-v="KQTT"]');
  await page.click('#f-res button[data-v="all"]');
  await page.screenshot({ path: path.join(OUT, 'd1b_boloc.png') });
  await page.click('#fdrw-ok');
  const chips = await page.$$eval('#fchips .fc:not(.sum)', e => e.map(x => x.textContent));
  ok(chips.length === 2 && /KQTT/.test(chips[0]) && await page.$eval('#f-more .n', e => e.textContent) === '2', 'bộ lọc đang bật ⇒ 2 nhãn + số trên nút Bộ lọc: ' + chips.join(' | '));
  await page.click('#fchips [data-fx="npp"]');
  ok(await page.evaluate(() => WINMAP.F.npp === 'all' && WINMAP.F.res === 'all'), 'bấm × ⇒ bỏ đúng 1 bộ lọc');
  await page.click('#fchips [data-fx="res"]');
  // tô màu theo thị phần MANI
  await page.evaluate(() => WINMAP.setF({ color: 'mani' }));
  const pct = await page.$$eval('.bdg text', e => e.filter(x => /%$/.test(x.textContent)).length);
  ok(pct > 0, `tô màu thị phần MANI: ${pct} tỉnh hiện %`);
  ok(await page.$eval('#sb', e => /Thị phần MANI theo tỉnh/.test(e.textContent)), 'bảng bên: thị phần MANI theo tỉnh');
  await page.screenshot({ path: path.join(OUT, 'd1c_thiphan.png') });
  await page.evaluate(() => WINMAP.setF({ color: 'src' }));
  // phóng vào tỉnh: chú giải tự thu gọn, chấm xám cơ sở chưa có gói
  await page.evaluate(() => WINMAP.select(16));
  await page.waitForTimeout(800);
  const zi = await page.evaluate(() => ({ min: document.getElementById('legend').classList.contains('min'), fd: document.querySelectorAll('.fd').length, hm: document.querySelectorAll('.hm').length }));
  ok(zi.min && zi.fd > 0, `Nghệ An: chú giải thu gọn, ${zi.hm} bệnh viện có gói + ${zi.fd} chấm xám cơ sở công lập`);
  await page.screenshot({ path: path.join(OUT, 'd1d_tinh.png') });
  await page.click('#lg-t');
  ok(!(await page.$eval('#legend', e => e.classList.contains('min'))), 'bấm "Chú giải" ⇒ mở lại');
  await page.click('.fd', { force: true });
  await page.waitForSelector('.finfo');
  ok(!(await page.$eval('#sb', e => /chưa có số giường/.test(e.textContent))), 'chấm xám ⇒ mở chi tiết cơ sở, không hiện "Quy mô" khi chưa có số liệu');
  // gói ngoài kỳ lọc ⇒ gợi ý "Xem Mọi năm"
  const oop = await page.evaluate(() => {
    WINMAP.setF({ period: '68q1' });
    const h = WINMAP.pkgs().map(p => p.h).filter(Boolean).find(h => h.pk.length && !h.pk.some(p => p.fy === 68));
    if (!h) return null; WINMAP.hospOf(h.f); return h.name;
  });
  if (oop) { await page.evaluate(n => WINMAP.hosp(n), oop); await page.waitForSelector('[data-every]'); await page.click('[data-every]');
    ok(await page.evaluate(() => WINMAP.F.fy === 'every'), 'cơ sở không có gói trong kỳ ⇒ gợi ý gói gần nhất + nút Xem Mọi năm'); }
  await page.evaluate(() => WINMAP.setF({ period: 'all' }));
  await page.evaluate(() => WINMAP.select(-1));
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
  const rb = await page.$$eval('.ribbon', e => e.map(x => x.querySelector('b').textContent));
  ok(rb.length >= 1 && /MANI/.test(rb[0]), 'tách hợp đồng MANI / hãng khác: ' + rb.join(' | '));
  ok(await page.$eval('#sb', e => /Gói MANI trúng gần nhất|Gói trúng gần nhất · MANI/.test(e.textContent)), 'có mục "Gói MANI trúng gần nhất"');
  ok(await page.$eval('#sb', e => /Gói theo dõi ở cơ sở này chỉ hiện với tài khoản email công ty/.test(e.textContent)), 'chưa đăng nhập ⇒ không thấy gói theo dõi, có nút Đăng nhập');
  await page.screenshot({ path: path.join(OUT, 'd3_benhvien.png') });
  await page.fill('#qs', 'bach mai');
  await page.waitForSelector('#qsr .it');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /Bạch Mai/.test(document.getElementById('sh-t').textContent));
  ok(true, 'mở được cơ sở trong danh mục: Bạch Mai');
  // theo dõi thầu
  await page.click('#f-view button[data-v="fu"]');
  await page.waitForSelector('#lg-email');
  await page.screenshot({ path: path.join(OUT, 'd4_dangnhap.png') });
  await page.fill('#lg-email', 'vietha');
  await page.click('[data-lg="send"]');
  await page.waitForSelector('#lg-code');
  await page.fill('#lg-code', '123456');
  await page.click('[data-lg="verify"]');
  await page.waitForFunction(() => document.getElementById('uchip').textContent.indexOf('Viet Ha') >= 0);
  ok(true, 'đăng nhập email + mã 6 số');
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
  await page.screenshot({ path: path.join(OUT, 'd5_form.png') });
  await page.click('[data-fm="save"]');
  await page.waitForFunction(() => document.getElementById('fudlg').hidden);
  await page.waitForFunction(() => document.querySelectorAll('.fuc').length > 0 && !/đang lưu/.test(document.querySelector('.fuc').textContent), null, { timeout: 10000 });
  ok(db.fu.length === 1 && db.fu[0][15] === 1, 'lưu gói mới (bước 1) ⇒ 1 dòng FOLLOW UP TENDER');
  await page.click('[data-fu-up]');
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
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 860 } }, { failSave: 2 }));   // lỗi cả fetch lẫn JSONP dự phòng ⇒ hàng đợi thử lại sau
  await page.evaluate(tk => localStorage.setItem('mmh_tk', JSON.stringify({ tk, exp: Date.now() + 864e5, user: { pic: 'Viet Ha', email: 'vietha@manimedicalhanoi.com' } })), db.tk);
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
  ok(db.fu.length === 1, 'tự gửi lại khi có mạng ⇒ lưu đúng 1 dòng');
  ok(!errs.length, 'không lỗi JS (hàng đợi)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();

  /* ── điện thoại ── */
  ({ ctx, page, errs, db } = await boot(b, devices['Pixel 7']));
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(wide <= 1, 'điện thoại: không tràn ngang (' + wide + ')');
  const hd = await page.evaluate(() => ({ h: document.getElementById('top').offsetHeight, view: !!document.querySelector('#fslot #f-view'), sh: WINMAP.sheet.state() }));
  ok(hd.h <= 100 && hd.view && hd.sh === 'peek', `điện thoại: thanh trên gọn ${hd.h}px (logo · tìm · bộ lọc), chế độ xem nằm trong Bộ lọc, bảng chi tiết ở mức thấp`);
  await page.screenshot({ path: path.join(OUT, 'm1_toanquoc.png') });
  await page.click('#f-more');
  await page.waitForSelector('#fdrw:not([hidden])');
  await page.screenshot({ path: path.join(OUT, 'm1b_boloc.png') });
  await page.click('#fdrw-ok');
  await page.click('#grab');
  ok(await page.evaluate(() => WINMAP.sheet.state()) === 'half', 'bấm thanh kéo ⇒ bảng chi tiết lên nửa màn hình');
  await page.fill('#qs', 'ttyt anh son');
  await page.waitForSelector('#qsr .it');
  await page.screenshot({ path: path.join(OUT, 'm2_tim.png') });
  await page.keyboard.press('Enter');
  await page.waitForSelector('.finfo');
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => WINMAP.sheet.state()) === 'half', 'chọn cơ sở ⇒ bảng chi tiết nửa dưới, bản đồ nửa trên');
  await page.screenshot({ path: path.join(OUT, 'm3_benhvien.png'), fullPage: false });
  await page.evaluate(tk => localStorage.setItem('mmh_tk', JSON.stringify({ tk, exp: Date.now() + 864e5, user: { pic: 'Viet Ha', email: 'vietha@manimedicalhanoi.com' } })), db.tk);
  await page.evaluate(() => { WINMAP.view('fu'); const f = WINMAP.fac().find(x => /Mắt Nghệ An/.test(x.name)); WINMAP.fu.open({ f }); });
  await page.waitForSelector('#fm-pkg');
  const wide2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(wide2 <= 1, 'điện thoại: hộp cập nhật không tràn ngang');
  await page.screenshot({ path: path.join(OUT, 'm4_form.png') });
  ok(!errs.length, 'không lỗi JS (điện thoại)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
  /* ── hướng dẫn lần đầu ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1366, height: 820 } }, { tour: true }));
  await page.waitForSelector('.tr-card', { timeout: 5000 });
  await page.screenshot({ path: path.join(OUT, 't1_huongdan.png') });
  let n = 0; while (await page.$('.tr-card') && n < 12) { await page.click('[data-tr="next"]'); n++; }
  ok(n >= 5 && await page.evaluate(() => localStorage.getItem('tm_tour_v1') === '1'), `hướng dẫn lần đầu: ${n} bước, xong thì không tự mở lại`);
  await page.click('#help');
  ok(!!(await page.$('.tr-card')), 'nút ? mở lại hướng dẫn');
  await page.keyboard.press('Escape');
  ok(!errs.length, 'không lỗi JS (hướng dẫn)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
  await b.close();
  console.log(fails ? `\n${fails} mục chưa đạt` : '\nTất cả mục kiểm tra đạt');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
