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

async function boot(b, ctxOpt, mopt, urlTail) {
  const ctx = await b.newContext(Object.assign({ serviceWorkers: 'block' }, ctxOpt));
  if (!(mopt && mopt.tour)) await ctx.addInitScript(() => { try { localStorage.setItem('tm_tour_v1', '1'); } catch (e) {} });   // không tự mở hướng dẫn lần đầu
  const page = await ctx.newPage(), errs = [];
  if (process.env.THROTTLE) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.THROTTLE }); }   // giả lập máy CI chậm
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const m = await mock.install(page, mopt);
  /* đăng nhập sẵn (phiên email công ty dùng chung Report Hub / CRM) — trừ khi kiểm thử màn hình đăng nhập (mopt.gate) */
  if (!(mopt && mopt.gate)) await page.addInitScript(o => { try { localStorage.setItem('mmh_tk', JSON.stringify({ tk: o.tk, exp: Date.now() + 864e5, user: { pic: o.pic, email: o.mail } })); } catch (e) {} },
    { tk: m.db.tk, pic: (mopt && mopt.as) || 'Giang', mail: ((mopt && mopt.mail) || 'mmh.product') + '@manimedicalhanoi.com' });
  await page.goto(BASE + '/map/index.html' + (urlTail || ''));
  await page.waitForFunction(() => window.WINMAP && WINMAP.pkgs().length > 0 && document.getElementById('load').style.display === 'none', null, { timeout: 20000 });
  return { ctx, page, errs, db: m.db };
}

(async () => {
  const b = await chromium.launch();
  /* ── máy tính ── */
  let { ctx, page, errs, db } = await boot(b, { viewport: { width: 1440, height: 900 } }, { gate: true });
  await page.waitForSelector('#gate:not([hidden]) #lg-email');
  await page.waitForTimeout(400);
  const gt = await page.evaluate(() => ({ paths: document.querySelectorAll('#gate-map path').length, feat: document.querySelectorAll('.gfeat li').length, body: document.body.classList.contains('gated') }));
  ok(gt.paths >= 30 && gt.feat === 3 && gt.body, `mở app chưa đăng nhập ⇒ màn hình đăng nhập: bản đồ minh hoạ (${gt.paths} tỉnh), 3 tính năng, ô email`);
  await page.screenshot({ path: path.join(OUT, 'd0_dangnhap.png') });
  await page.fill('#lg-email', 'mmh.product'); await page.keyboard.press('Enter');
  await page.waitForSelector('#gate #lg-code'); await page.fill('#lg-code', '123456'); await page.keyboard.press('Enter');
  await page.waitForSelector('#gate', { state: 'hidden', timeout: 10000 });
  await page.waitForFunction(() => document.getElementById('uchip').textContent.indexOf('Giang') >= 0);
  ok(await page.evaluate(() => !document.body.classList.contains('gated') && !WINMAP.scope.locked() && document.querySelectorAll('#f-pic button').length === 3),
    'đăng nhập email + mã 6 số (Enter) ⇒ vào app; Giang xem tất cả, chọn PIC: Cả nhóm · Viet Ha · Khang');
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
  ok(await page.$eval('#f-view', e => /^Kết quả thầuTheo dõi thầu\d*Hoạt động$/.test(e.textContent)), 'chế độ: Kết quả thầu | Theo dõi thầu | Hoạt động');
  ok(!(await page.$eval('#sb', e => /trùng số TBMT/.test(e.textContent))), 'không còn ghi chú kỹ thuật bỏ trùng TBMT');
  const rk = await page.$$eval('.rank li', l => ({ n: l.length, fua: l.filter(x => x.querySelector('.fua')).length, cmp: !!document.querySelector('.cmpn') }));
  ok(rk.n > 0 && rk.fua === rk.n && rk.cmp, `top bệnh viện: ${rk.n} dòng, có ▲▼ so kỳ trước + nút "+ Theo dõi"`);
  ok(await page.$$eval('.rank li .pv', l => l.every(x => /MANI/.test(x.textContent) && !/KQTT thị trường|Hùng Vĩ|iCare/.test(x.textContent))), 'top bệnh viện: dòng phụ ghi hãng (MANI x% · hãng khác), không ghi nguồn');
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
  const ps = await page.$eval('.psum', e => e.textContent);
  ok(/Nghệ An có \d+ bệnh viện công lập, \d+ trung tâm y tế/.test(ps) && /Thầu dao phẫu thuật nhãn khoa: từ tháng \d+\/\d{4} đến tháng \d+\/\d{4}/.test(ps) && /cơ sở trúng thầu dao; nhiều nhất là .+ với \d+ gói/.test(ps) && /chiếm tỉ trọng lớn nhất/.test(ps),
    'tóm tắt tỉnh: ' + ps.replace(/\s+/g, ' ').slice(0, 260) + '…');
  const bm = await page.$$eval('.hcard .bm', e => e.map(x => x.textContent));
  ok(bm.length > 0 && bm.every(t => /MANI/.test(t) && !/KQTT|Hùng Vĩ|iCare/.test(t)), 'thẻ bệnh viện ghi theo hãng (MANI + hãng lớn nhất), không ghi tên nguồn: ' + bm[0]);
  await page.screenshot({ path: path.join(OUT, 'd1d_tinh.png') });
  await page.click('#lg-t');
  ok(!(await page.$eval('#legend', e => e.classList.contains('min'))), 'bấm "Chú giải" ⇒ mở lại');
  await page.click('#lg-t');                                         // thu gọn lại để không che chấm
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
  ok(await page.$eval('#sb', e => /Công \/ tưCông lập/.test(e.textContent) && /Theo dõi thầu/.test(e.textContent)), 'cơ sở công lập: nhãn "Công lập · đấu thầu", mục Theo dõi thầu');
  await page.screenshot({ path: path.join(OUT, 'd3_benhvien.png') });
  await page.fill('#qs', 'bach mai');
  await page.waitForSelector('#qsr .it');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /Bạch Mai/.test(document.getElementById('sh-t').textContent));
  ok(true, 'mở được cơ sở trong danh mục: Bạch Mai');
  // bệnh viện tư nhân (danh mục OSM có cả bệnh viện tư) ⇒ hợp đồng mua sắm, không phải hợp đồng thầu
  await page.fill('#qs', 'benh vien mat sai gon');
  await page.waitForSelector('#qsr .it');
  const sg = await page.$$eval('#qsr .it', L => L.map(e => e.textContent));
  const si = sg.findIndex(t => /^Bệnh Viện Mắt Sài Gòn/.test(t) && /Tư nhân/.test(t));
  ok(si >= 0, 'tìm "benh vien mat sai gon" ⇒ Bệnh Viện Mắt Sài Gòn gắn nhãn Tư nhân');
  await (await page.$$('#qsr .it'))[Math.max(si, 0)].click();
  await page.waitForSelector('.finfo');
  const pvx = await page.$eval('#sb', e => ({ rb: !!e.querySelector('.ribbon.pv'), own: /Công \/ tưTư nhân mua sắm theo hợp đồng mua sắm/.test(e.textContent), fu: /Theo dõi mua sắm · hợp đồng mua sắm/.test(e.textContent), btn: /\+ Thêm cơ hội mua sắm/.test(e.textContent), noTender: !/Chưa có gói trúng thầu/.test(e.textContent) }));
  ok(pvx.rb && pvx.own && pvx.fu && pvx.btn && pvx.noTender, 'Bệnh Viện Mắt Sài Gòn = tư nhân: "mua sắm theo hợp đồng mua sắm", mục Theo dõi mua sắm, nút + Thêm cơ hội mua sắm ' + JSON.stringify(pvx));
  await page.screenshot({ path: path.join(OUT, 'd3b_tunhan.png') });
  await page.click('#sb [data-fu-new]');
  await page.waitForSelector('#fm-pkg');
  const pst = await page.$$eval('.stg button', b => b.map(x => x.textContent));
  ok(/Giới thiệu/.test(pst[0]) && /Ký hợp đồng mua sắm/.test(pst.join('|')) && !(await page.$('#fm-tb')), 'thêm cơ hội ở bệnh viện tư ⇒ giai đoạn mua sắm (… Ký hợp đồng mua sắm → Sử dụng hàng), không có ô TBMT');
  await page.click('[data-fm="cancel"]');
  // xem theo PIC (người không phải Sales): chọn Khang ⇒ chỉ địa bàn Quảng Nam (cũ) → miền Nam
  await page.evaluate(() => WINMAP.select(-1));
  await page.click('#f-pic button[data-v="Khang"]');
  await page.waitForTimeout(900);
  const kz = await page.evaluate(() => ({ pic: WINMAP.scope.pic(), out: document.querySelector('.prov[data-i="16"]').classList.contains('out'), na: WINMAP.stat(16).n, hcm: WINMAP.stat(28).n, crumb: document.getElementById('crumb').textContent }));
  ok(kz.pic === 'Khang' && kz.out && kz.na === 0 && /Địa bàn Khang/.test(kz.crumb), 'chọn PIC Khang ⇒ tỉnh ngoài địa bàn mờ, không tính (Nghệ An = 0 gói), nhãn "Địa bàn Khang"');
  await page.fill('#qs', 'bv mat nghe an');
  await page.waitForTimeout(300);
  ok(await page.$$eval('#qsr .it .sb', l => !l.some(x => /Nghệ An/.test(x.textContent))), 'chọn PIC Khang ⇒ ô tìm chỉ ra cơ sở trong địa bàn Khang');
  await page.fill('#qs', ''); await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(OUT, 'd3c_pic_khang.png') });
  await page.click('#f-pic button[data-v=""]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => WINMAP.scope.pic() === '' && !document.querySelector('.prov.out')), 'Cả nhóm ⇒ lại toàn quốc');
  // theo dõi thầu
  await page.click('#f-view button[data-v="fu"]');
  await page.waitForFunction(() => WINMAP.fu._S.loaded);
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
  ok(db.fu.length === 1 && db.fu[0][15] === 1 && db.fu[0][23] === 'Viet Ha', 'lưu gói mới (bước 1) ⇒ 1 dòng FOLLOW UP TENDER, cột PIC phụ trách địa bàn = Viet Ha (Nghệ An)');
  await page.waitForFunction(() => /S-NA-001/.test((document.getElementById('crmx') || {}).textContent || ''), null, { timeout: 10000 });
  ok(await page.$eval('#crmx', e => /Lượt gặp 12 tháng/.test(e.textContent) && /Trưởng khoa/.test(e.textContent)), 'đã đăng nhập ⇒ khối CRM Surgical: mã địa bàn, lượt gặp, người liên hệ, đơn hàng');
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
  // tô màu theo tiến độ + cảnh báo hợp đồng sắp hết hiệu lực chưa cập nhật theo dõi
  const pg = await page.evaluate(() => { const s = WINMAP.stat(16); const P = document.querySelector('.prov[data-i="16"]'); return { stg: s.stg, fill: P.getAttribute('fill'), col: WINMAP.fu.pcol(s) }; });
  ok(pg.stg === 3 && pg.fill !== 'var(--land)', 'bản đồ theo dõi: Nghệ An tô màu giai đoạn "Chốt cấu hình" (' + pg.fill + ')');
  ok(await page.$eval('#legend', e => /Tô màu theo tiến độ/.test(e.textContent) && e.querySelectorAll('.stl')[0].querySelectorAll('span').length === 9 && /Mua sắm cơ sở tư nhân/.test(e.textContent) && /Demo/.test(e.textContent)), 'chú giải: 9 giai đoạn thầu công lập + giai đoạn mua sắm tư nhân, mỗi giai đoạn 1 màu');
  const wn = await page.evaluate(() => ({ n: WINMAP.fu.warnCount(), box: document.querySelectorAll('#sb .wbox .ri').length, badge: (document.querySelector('#f-view .wb') || {}).textContent || '' }));
  ok(wn.n > 0 && wn.box > 0 && wn.badge === String(wn.n), `cảnh báo: ${wn.n} hợp đồng MANI sắp hết hiệu lực chưa cập nhật theo dõi — khối cảnh báo + số trên nút Theo dõi thầu`);
  await page.screenshot({ path: path.join(OUT, 'd7b_canhbao.png') });
  if (await page.$('#sb .wbox [data-fu-warn]')) {
    await page.click('#sb .wbox [data-fu-warn]');
    await page.waitForSelector('#fm-pkg');
    ok(/^Thầu lại/.test(await page.$eval('#fm-pkg', e => e.value)), 'bấm "+ Theo dõi thầu lại" trong cảnh báo ⇒ hộp theo dõi điền sẵn');
    await page.click('[data-fm="cancel"]');
  }
  // khớp kết quả KQTT với gói đang theo dõi (cùng số TBMT) ⇒ gợi ý ghi kết quả
  const kq = await page.evaluate(() => { const p = WINMAP.pkgs().find(x => x.npp === 'KQTT' && x.h && x.h.f && x.tbmtRaw.length); if (!p) return null;
    WINMAP.fu.open({ f: p.h.f, pre: { pkg: 'Gói khớp KQTT', tbmt: p.tbmtRaw[0], lines: [{ code: 'MSL28SH', qty: '100', kind: 'dao' }] } }); return { tb: p.tbmtRaw[0], mani: p.items.some(i => /mani/i.test(i.mfr)) }; });
  if (kq) {
    ok(await page.$eval('#fm-tb', e => e.value) === kq.tb, 'hộp theo dõi nhận số TBMT điền sẵn');
    await page.click('[data-fm="save"]');
    await page.waitForSelector('.kqm', { timeout: 10000 });
    ok(true, 'gói theo dõi có TBMT trùng KQTT ⇒ hiện "Đã có kết quả"');
    await page.screenshot({ path: path.join(OUT, 'd8_khop_kqtt.png') });
    await page.waitForFunction(() => !/đang lưu/.test(document.getElementById('sb').textContent), null, { timeout: 10000 });
    await page.click('[data-fu-res]');
    const st = await page.$eval('.stg button.on', e => +e.dataset.st);
    ok(st === (kq.mani ? 7 : 8) && /Kết quả:/.test(await page.$eval('#fm-note', e => e.value)), 'Ghi kết quả ⇒ chọn sẵn giai đoạn ' + st + ' + ghi chú hãng / giá trúng');
    await page.click('[data-fm="cancel"]');
  }
  // ── chế độ Hoạt động (CRM Surgical: Customer visiting) ──
  await page.evaluate(() => WINMAP.select(-1));
  await page.click('#f-view button[data-v="act"]');
  await page.waitForFunction(() => window.WINMAP && WINMAP.act._S.loaded && document.querySelector('#sb .kpis'), null, { timeout: 10000 });
  const av = await page.evaluate(() => ({ per: document.querySelectorAll('#va-per option').length, pic: document.querySelectorAll('#f-pic button').length,
    na: document.querySelector('.prov[data-i="16"]').getAttribute('fill'), leg: /Lượt viếng thăm theo tỉnh/.test(document.getElementById('legend').textContent) }));
  ok(av.per > 5 && av.pic === 3 && av.na !== 'var(--land)' && av.leg, `Hoạt động: chọn kỳ (${av.per} mục FY / quý / tháng), PIC (Cả nhóm · Viet Ha · Khang), tỉnh tô đậm nhạt theo lượt viếng thăm`);
  await page.selectOption('#va-per', 'fy67');
  const n67 = await page.$eval('#sb .kpi b', e => +e.textContent);
  await page.selectOption('#va-per', await page.$eval('#va-per option[value^="m2025"]', e => e.value));
  const nm = await page.$eval('#sb .kpi b', e => +e.textContent);
  ok(n67 > 0 && nm <= n67, `đổi kỳ: FY67 ${n67} lượt ⇒ 1 tháng ${nm} lượt`);
  await page.selectOption('#va-per', 'fy67');
  ok(await page.$eval('#sb', e => /Khách gặp nhiều nhất/.test(e.textContent) && /Khách lâu chưa gặp/.test(e.textContent)), 'thống kê: khách được chăm sóc nhiều nhất, khách lâu chưa gặp, theo PIC');
  await page.screenshot({ path: path.join(OUT, 'a1_hoatdong.png') });
  // tìm khách tư nhân (tên chuẩn hoá) ⇒ lịch sử chăm sóc
  await page.fill('#qs', 'mat sai gon');
  await page.waitForSelector('#qsr .it');
  const qn = await page.$$eval('#qsr .it', L => L.map(e => e.textContent));
  const qi = qn.findIndex(t => /Phòng khám Mắt Sài Gòn/.test(t) && /Tư nhân/.test(t) && /CRM/.test(t));
  ok(qi >= 0, 'tìm "mat sai gon" ⇒ "Phòng khám Mắt Sài Gòn" (tên CRM "PK MẮT SÀI GÒN" đã chuẩn hoá), nhãn Tư nhân · CRM — ' + qn.length + ' kết quả');
  await (await page.$$('#qsr .it'))[Math.max(qi, 0)].click();
  await page.waitForSelector('#actlog .ev', { timeout: 10000 });
  ok(await page.$eval('#sb', e => /Lịch sử chăm sóc/.test(e.textContent) && /Bước tiếp theo/.test(e.textContent)), 'bấm / tìm khách ⇒ lịch sử chăm sóc (kết quả, phản hồi, bước tiếp theo)');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'a2_khach_tunhan.png') });
  // sửa tên chuẩn
  await page.click('[data-act-stdo]');
  await page.fill('#act-std', 'Phòng khám Mắt Sài Gòn (Quận 3)');
  await page.click('[data-act-std]');
  await page.waitForFunction(() => /Đã lưu tên chuẩn/.test((document.querySelector('.toast') || {}).textContent || ''), null, { timeout: 5000 });
  ok(db.locs.some(x => x.op === 'name' && /Quận 3/.test(x.std)), 'sửa tên chuẩn ⇒ lưu sheet VỊ TRÍ ĐỊA BÀN');
  // ghim vị trí trên bản đồ
  await page.click('[data-act-pick="1"]');
  const box = await page.$eval('#map', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 }; });
  await page.mouse.click(box.x, box.y);
  await page.waitForFunction(() => /Đã lưu vị trí/.test((document.querySelector('.toast') || {}).textContent || ''), null, { timeout: 5000 });
  const lc = db.locs.filter(x => x.lat).pop();
  ok(lc && +lc.lat > 7 && +lc.lat < 24 && +lc.lng > 102 && +lc.lng < 118 && await page.$eval('#sb', e => /đã ghim trên bản đồ/.test(e.textContent)), `ghim vị trí ⇒ ${lc && lc.lat}, ${lc && lc.lng}`);
  // cơ sở tư nhân ⇒ theo dõi mua sắm (giai đoạn riêng)
  await page.waitForTimeout(800);                                   // chờ vẽ lại sau khi lưu vị trí (máy CI chậm hơn)
  await page.click('[data-act-fu]');
  await page.waitForSelector('#fm-pkg');
  const stg = await page.$$eval('.stg button', b => b.map(x => x.textContent));
  ok(stg.length === 7 && /Giới thiệu/.test(stg[0]) && /Demo/.test(stg[1]) && /Đề xuất từ chuyên môn/.test(stg[2]) && /Ký hợp đồng/.test(stg[3]) && /Sử dụng hàng/.test(stg[4]) && !(await page.$('#fm-tb')),
    'cơ sở tư nhân ⇒ giai đoạn Giới thiệu → Demo → Đề xuất từ chuyên môn → Ký hợp đồng → Sử dụng hàng (không có ô TBMT)');
  await page.fill('#fm-pkg', 'Dao Slit cho phòng mổ Phaco');
  await page.fill('[data-ln="code"][data-i="0"]', 'MSL28SH');
  await page.fill('[data-ln="qty"][data-i="0"]', '100');
  await page.click('.stg button[data-st="12"]');
  await page.click('[data-fm="save"]');
  const pClosed = await page.waitForFunction(() => document.getElementById('fudlg').hidden, null, { timeout: 8000 }).then(() => true, () => false);
  const pWhy = pClosed ? '' : await page.$eval('#fudlg', e => ((e.querySelector('.er') || {}).textContent || '(không có câu lỗi)') + ' | ' + e.innerText.replace(/\s+/g, ' ').slice(0, 300));
  for (let i = 0; i < 60 && !db.fu.some(r => r[15] === 12); i++) await page.waitForTimeout(250);
  ok(db.fu.some(r => r[15] === 12 && /^C:S-004/.test(r[5])), 'lưu cơ hội mua sắm tư nhân: giai đoạn 12 (Demo), mã cơ sở C:S-004' +
    (pClosed ? '' : ' — hộp chưa đóng: ' + pWhy) + (db.fu.some(r => r[15] === 12) ? '' : ' · fid đã lưu: ' + db.fu.map(r => r[5] + '/' + r[15]).join(', ')));
  if (!pClosed) await page.click('[data-fm="cancel"]').catch(() => {});
  // khách công lập ⇒ có lịch sử thầu
  await page.evaluate(() => { WINMAP.view('act'); WINMAP.act.openCode('S-001'); });
  await page.waitForFunction(() => /Bệnh viện Mắt Nghệ An/.test(document.getElementById('sh-t').textContent), null, { timeout: 5000 });
  ok(await page.$eval('#sb', e => /Lịch sử thầu/.test(e.textContent)), 'khách công lập (BV Mắt Nghệ An) ⇒ có cả lịch sử thầu');
  await page.screenshot({ path: path.join(OUT, 'a3_khach_conglap.png') });
  await page.evaluate(() => { WINMAP.view('win'); });

  // tab phân tích (Kết quả thầu)
  await page.evaluate(() => { WINMAP.view('win'); WINMAP.setF({ period: 'every' }); WINMAP.select(-1); });
  await page.waitForTimeout(300);
  await page.click('.stabs [data-tab="re"]');
  const re = await page.evaluate(() => ({ n: WINMAP.re().length, ri: document.querySelectorAll('#sb .ri').length, btn: document.querySelectorAll('#sb [data-re]').length }));
  ok(re.n === re.ri && re.btn === re.ri, `Lịch thầu lại: ${re.n} hợp đồng hết hạn trong 12 tháng / vừa hết hạn`);
  await page.screenshot({ path: path.join(OUT, 'd9_thaulai.png') });
  if (re.btn) {
    await page.click('#sb [data-re]');
    await page.waitForSelector('#fm-pkg');
    const pre = await page.evaluate(() => ({ pkg: document.getElementById('fm-pkg').value, due: document.getElementById('fm-due').value, q: document.querySelector('[data-ln="qty"]').value, note: document.getElementById('fm-note').value }));
    ok(/^Thầu lại/.test(pre.pkg) && pre.due && +pre.q > 0 && /hết hạn/.test(pre.note), '+ Theo dõi thầu lại ⇒ điền sẵn tên gói, SL, mốc dự kiến, ghi chú hợp đồng');
    await page.click('[data-fm="cancel"]');
  }
  await page.click('.stabs [data-tab="px"]');
  const px = await page.$$eval('#sb .tb2', t => t.map(x => x.querySelectorAll('tbody tr').length));
  ok(px.length >= 2 && px[0] > 0, `Giá trúng: bảng loại dao (${px[0]} dòng) + theo hãng + theo FY`);
  await page.screenshot({ path: path.join(OUT, 'd10_gia.png') });
  await page.click('#sb tr[data-pxk]');
  ok(await page.$eval('#sb', e => /Theo hãng · Dao/.test(e.textContent)), 'bấm 1 loại dao ⇒ bảng hãng của loại đó');
  await page.click('.stabs [data-tab="npp"]');
  ok(await page.$$eval('#sb .ncard', e => e.length) === 2, 'Hiệu quả NPP: thẻ Hùng Vĩ + iCare (tỉ lệ trúng, trượt, chờ)');
  await page.screenshot({ path: path.join(OUT, 'd11_npp.png') });
  await page.click('.stabs [data-tab="fc"]');
  ok(await page.$$eval('#sb .tb2', t => t[0] ? t[0].querySelectorAll('tbody tr').length : 0) === 12 || await page.$eval('#sb', e => /Không có hợp đồng MANI còn hiệu lực/.test(e.textContent)), 'Dự báo tiêu thụ: 12 tháng tới');
  await page.screenshot({ path: path.join(OUT, 'd12_dubao.png') });
  // xuất Excel / ảnh bản đồ
  await page.click('.stabs [data-tab="ov"]');
  if (process.env.XLSX_JS) {
    await page.click('#xbtn');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#xmenu [data-x="xlsx"]')]);
    const fp = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(fp);
    ok(/^TenderMap_.*\.xlsx$/.test(dl.suggestedFilename()) && fs.statSync(fp).size > 4000, 'Xuất Excel: ' + dl.suggestedFilename() + ' (' + fs.statSync(fp).size + ' byte)');
  } else console.log('… bỏ qua kiểm thử Excel (đặt XLSX_JS = đường dẫn xlsx.full.min.js để chạy)');
  const sheets = await page.evaluate(() => WINMAP.xp.sheets().map(s => s[0] + ':' + s[1].length));
  ok(sheets.length >= 8, 'Excel gồm: ' + sheets.join(', '));
  await page.click('#xbtn');
  const [dp] = await Promise.all([page.waitForEvent('download'), page.click('#xmenu [data-x="png"]')]);
  const pp = path.join(OUT, dp.suggestedFilename()); await dp.saveAs(pp);
  ok(/\.png$/.test(dp.suggestedFilename()) && fs.statSync(pp).size > 20000, 'Xuất ảnh bản đồ: ' + dp.suggestedFilename() + ' (' + Math.round(fs.statSync(pp).size / 1024) + ' KB)');
  const stg2 = await page.evaluate(() => ({ ls: Object.keys(localStorage).filter(k => (localStorage.getItem(k) || '').length > 20000) }));
  const idbKeys = await page.evaluate(() => new Promise(res => { const r = indexedDB.open('tender_map', 1); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => res(q.result); }; r.onerror = () => res([]); }));
  ok(!stg2.ls.length && idbKeys.includes('mmh_winmap_v1') && idbKeys.includes('act'), 'bộ nhớ đệm dữ liệu thầu + hoạt động ở IndexedDB, localStorage (dùng chung Report Hub / CRM) không giữ dữ liệu lớn');
  await page.reload();
  await page.waitForFunction(() => window.WINMAP && WINMAP.pkgs().length > 0 && WINMAP.act._S.loaded, null, { timeout: 3000 }).then(() => ok(true, 'mở lại: bản đồ + hoạt động hiện ngay từ bộ nhớ đệm'), () => ok(false, 'mở lại: bản đồ + hoạt động hiện ngay từ bộ nhớ đệm'));
  ok(!errs.length, 'không lỗi JS (máy tính)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();

  /* ── lỗi mạng khi lưu ⇒ hàng đợi thử lại ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 860 } }, { failSave: 2 }));   // lỗi cả fetch lẫn JSONP dự phòng ⇒ hàng đợi thử lại sau
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
  await page.evaluate(() => { WINMAP.view('fu'); const f = WINMAP.fac().find(x => /Mắt Nghệ An/.test(x.name)); WINMAP.fu.open({ f }); });
  await page.waitForSelector('#fm-pkg');
  const wide2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(wide2 <= 1, 'điện thoại: hộp cập nhật không tràn ngang');
  await page.screenshot({ path: path.join(OUT, 'm4_form.png') });
  await page.click('[data-fm="cancel"]');
  await page.click('#f-more');
  await page.waitForSelector('#fdrw:not([hidden])');
  const dr = await page.evaluate(() => { const b = document.querySelector('.fbox'), o = document.getElementById('f-own'); return { over: b.scrollWidth - b.clientWidth, own: !!o.offsetParent }; });
  ok(dr.over <= 1 && dr.own, 'điện thoại: ngăn Bộ lọc ở Theo dõi thầu không tràn ngang, có mục Cơ sở y tế (công lập / tư nhân)');
  await page.click('#fdrw-ok');
  await page.evaluate(() => { WINMAP.select(-1); WINMAP.view('act'); });
  await page.waitForFunction(() => WINMAP.act._S.loaded && document.querySelector('#sb .kpis'), null, { timeout: 10000 });
  await page.evaluate(() => WINMAP.sheet.to('half'));
  await page.waitForTimeout(500);
  const wide3 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(wide3 <= 1, 'điện thoại: chế độ Hoạt động không tràn ngang');
  await page.screenshot({ path: path.join(OUT, 'm5_hoatdong.png') });
  await page.evaluate(() => WINMAP.act.openCode('S-004'));
  await page.waitForSelector('#actlog .ev', { timeout: 10000 });
  ok(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 1, 'điện thoại: lịch sử chăm sóc không tràn ngang');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'm6_lichsu.png') });
  ok(!errs.length, 'không lỗi JS (điện thoại)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
  ({ ctx, page, errs, db } = await boot(b, devices['Pixel 7'], { gate: true }));
  await page.waitForSelector('#gate:not([hidden]) #lg-email');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.getElementById('gate').scrollWidth - document.getElementById('gate').clientWidth) <= 1, 'điện thoại: màn hình đăng nhập không tràn ngang');
  await page.screenshot({ path: path.join(OUT, 'm0_dangnhap.png') });
  await ctx.close();

  /* ── Sales chỉ thấy địa bàn của mình: Viet Ha = Bắc → Đà Nẵng, Khang = Quảng Ngãi → Nam ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1440, height: 900 } }, { as: 'Viet Ha', mail: 'vietha' }));
  await page.waitForTimeout(900);
  const vh = await page.evaluate(() => ({ lock: WINMAP.scope.locked(), chip: document.getElementById('f-pic').textContent, btn: document.querySelectorAll('#f-pic button').length,
    hcm: document.querySelector('.prov[data-i="28"]').classList.contains('out'), dn: document.querySelector('.prov[data-i="20"]').classList.contains('out'), n28: WINMAP.stat(28).n, t: document.getElementById('sh-t').textContent }));
  ok(vh.lock && /Viet Ha · Miền Bắc → Đà Nẵng/.test(vh.chip) && !vh.btn && vh.hcm && !vh.dn && vh.n28 === 0 && /Địa bàn Viet Ha/.test(vh.t), 'Viet Ha đăng nhập ⇒ khoá địa bàn Bắc → Đà Nẵng (Đà Nẵng trong, TP.HCM ngoài), không chọn PIC khác');
  const dnv = await page.evaluate(() => { const F = WINMAP.fac().filter(f => f.ni === 20 && f.oi), s = WINMAP.scope;
    return { qn: F.filter(f => f.oi === 'quangnam').length, qnIn: F.filter(f => f.oi === 'quangnam' && s.inProv(f.ni, f.oi)).length, dn: F.filter(f => f.oi === 'danang').length, dnIn: F.filter(f => f.oi === 'danang' && s.inProv(f.ni, f.oi)).length,
      own: [s.ownerOf(20, 'danang'), s.ownerOf(20, 'quangnam'), s.ownerOf(21, '')] }; });
  ok(dnv.qn > 0 && dnv.qnIn === 0 && dnv.dn > 0 && dnv.dnIn === dnv.dn && dnv.own.join() === 'Viet Ha,Khang,Khang',
    `tỉnh Đà Nẵng mới chia theo tỉnh cũ: Viet Ha thấy ${dnv.dn} cơ sở Đà Nẵng cũ, không thấy ${dnv.qn} cơ sở Quảng Nam cũ (thuộc Khang)`);
  await page.screenshot({ path: path.join(OUT, 's1_vietha.png') });
  await page.evaluate(() => WINMAP.view('act'));
  await page.waitForFunction(() => WINMAP.act._S.loaded && document.querySelector('#sb .tb2'), null, { timeout: 10000 });
  const vr = await page.$$eval('#sb .tb2 tbody tr', l => l.map(x => x.textContent.trim().split(/\s+/)[0]));
  ok(vr.length === 1 && /Viet/.test(vr[0]), 'Viet Ha ⇒ Hoạt động chỉ có lượt của Viet Ha');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 's2_vietha_hoatdong.png') });
  ok(!errs.length, 'không lỗi JS (Viet Ha)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 800 } }, { as: 'Khang', mail: 'mmh.saigon1' }));
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => WINMAP.scope.pic() === 'Khang' && WINMAP.scope.locked() && document.querySelector('.prov[data-i="16"]').classList.contains('out') && !document.querySelector('.prov[data-i="21"]').classList.contains('out')),
    'Khang đăng nhập ⇒ khoá địa bàn Quảng Nam (cũ) → miền Nam (Nghệ An ngoài, Quảng Ngãi trong)');
  await page.waitForFunction(() => WINMAP.act._S.loaded, null, { timeout: 10000 });
  ok(await page.evaluate(() => WINMAP.qs.search('mat sai gon ha noi', 8).some(f => /Sài Gòn.*Hà Nội/i.test(f.name) && f.ni === 0)),
    'Khang tìm được khách CRM của chính mình nằm ngoài địa bàn chia theo tỉnh (Mắt Sài Gòn - Hà Nội), tên chuẩn khớp được danh mục');
  ok(!errs.length, 'không lỗi JS (Khang)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
  /* ── trình duyệt đăng nhập nhiều tài khoản Google: thẻ <script> tới Apps Script hỏng ⇒ vẫn đăng nhập được (fetch không cookie) ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 800 } }, { scriptFail: true, gate: true }));
  await page.waitForSelector('#gate #lg-email');
  await page.fill('#lg-email', 'mmh.product@manimedicalhanoi.com');
  await page.click('[data-lg="send"]');
  await page.waitForSelector('#lg-code', { timeout: 10000 });
  await page.fill('#lg-code', '123456');
  await page.click('[data-lg="verify"]');
  await page.waitForFunction(() => document.getElementById('uchip').textContent.indexOf('Giang') >= 0, null, { timeout: 10000 });
  ok(true, 'nhiều tài khoản Google (thẻ <script> bị chặn) ⇒ vẫn gửi mã + đăng nhập được');
  ok(!errs.length, 'không lỗi JS (nhiều tài khoản)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();

  /* ── máy chủ từ chối phiên: lỗi khác ⇒ giữ phiên (dùng chung Report Hub / CRM) + hiện lý do; phiên hết hạn ⇒ xoá + ô đăng nhập kèm lý do ── */
  for (const [msg, dead] of [['Theo dõi thầu chỉ dành cho tài khoản email công ty', false], ['Phiên đăng nhập đã hết hạn — đăng nhập lại.', true]]) {
    ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 800 } }, { authErr: msg }));
    await page.evaluate(() => WINMAP.view('fu'));
    await page.waitForFunction(m => document.body.innerText.indexOf(m.slice(0, 20)) >= 0, msg, { timeout: 10000 });
    const st = await page.evaluate(() => ({ tk: !!localStorage.getItem('mmh_tk'), gate: !document.getElementById('gate').hidden && !!document.querySelector('#gate #lg-email') }));
    ok(dead ? (!st.tk && st.gate) : (st.tk && !st.gate), dead ? 'phiên hết hạn ⇒ xoá phiên, về màn hình đăng nhập kèm lý do' : 'máy chủ từ chối vì lý do khác ⇒ GIỮ phiên (không đăng xuất Report Hub / CRM), hiện lý do');
    await ctx.close();
  }

  /* ── link từ thông báo "Nhắc tôi" / email: ?v=fu#<Tỉnh>/<Cơ sở> ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 800 } }, {}, '?v=fu#' + encodeURIComponent('Nghệ An') + '/' + encodeURIComponent('Bệnh viện Mắt Nghệ An')));
  await page.waitForFunction(() => /Mắt Nghệ An/.test(document.getElementById('sh-t').textContent), null, { timeout: 10000 });
  ok(await page.evaluate(() => WINMAP.F.view === 'fu') && await page.$eval('#sb', e => /Theo dõi thầu/.test(e.textContent)), 'link ?v=fu#Tỉnh/Cơ sở ⇒ mở Theo dõi thầu đúng cơ sở');
  ok(!errs.length, 'không lỗi JS (link thông báo)' + (errs.length ? ': ' + errs.join(' | ') : ''));
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
