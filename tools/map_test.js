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

/* chọn kỳ ở chế độ Hoạt động: [‹ kỳ ▾ ›] ⇒ bảng chọn Tuần · Tháng · Quý · FY · Khoảng ngày */
async function pickPer(page, v) {
  const tab = /^fy/.test(v) ? 'fy' : /^q/.test(v) ? 'q' : /^m/.test(v) ? 'm' : /^w/.test(v) ? 'w' : 'c';
  await page.click('#va-per .pb'); await page.click('#va-per [data-ptab="' + tab + '"]');
  const sel = v.endsWith('*') ? '#va-per .pop [data-per^="' + v.slice(0, -1) + '"]' : '#va-per .pop [data-per="' + v + '"]';
  await page.click(sel);
  await page.waitForFunction(() => document.querySelector('#va-per .pop').hidden);
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
  ok(await page.evaluate(() => { const f = document.querySelector('#gate form[data-lgf="pw"]'); return !!f && f.querySelector('#lg-email').autocomplete === 'username' && f.querySelector('#lg-pw').autocomplete === 'current-password' && f.querySelector('#lg-pw').type === 'password' && !!document.querySelector('#gate [data-lg="send"]'); }),
    'màn hình đăng nhập: form Email + Mật khẩu (trình duyệt nhận ra để lưu / tự điền) + "Nhận mã qua email"');
  await page.fill('#lg-email', 'mmh.product'); await page.fill('#lg-pw', 'Thu#12345'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => /chưa đặt mật khẩu/.test(document.querySelector('#gate .lgerr').textContent), null, { timeout: 10000 });
  ok(!db.pwInUrl && db.pwCalls === 1, 'chưa đặt mật khẩu ⇒ báo "chưa đặt mật khẩu, bấm Nhận mã qua email" (mật khẩu gửi bằng POST, không nằm trên URL)');
  await page.click('#gate [data-lg="send"]');
  await page.waitForSelector('#gate #lg-code'); await page.fill('#lg-code', '123456'); await page.keyboard.press('Enter');
  await page.waitForSelector('#gate', { state: 'hidden', timeout: 10000 });
  await page.waitForFunction(() => document.getElementById('uchip').textContent.indexOf('Giang') >= 0);
  ok(await page.evaluate(() => !document.body.classList.contains('gated') && !WINMAP.scope.locked() && document.querySelectorAll('#f-pic button').length === 3),
    'Nhận mã qua email + mã 6 số (Enter) ⇒ vào app; Giang xem tất cả, chọn PIC: Cả nhóm · Viet Ha · Khang');
  await page.waitForSelector('.pwdlg .pwbox', { timeout: 5000 });
  ok(await page.evaluate(() => { const f = document.querySelector('.pwdlg form'); return /Đặt mật khẩu cho lần sau/.test(f.textContent) && f.querySelector('input[autocomplete="username"]').value === 'mmh.product@manimedicalhanoi.com' && f.querySelectorAll('input[autocomplete="new-password"]').length === 2; }),
    'đăng nhập bằng mã mà chưa có mật khẩu ⇒ mời "Đặt mật khẩu cho lần sau" (ô mật khẩu mới để trình duyệt gợi ý / lưu)');
  await page.screenshot({ path: path.join(OUT, 'd0b_dat_matkhau.png') });
  await page.fill('#pwd-n1', 'Matkhau#2026'); await page.fill('#pwd-n2', 'Matkhau#2025'); await page.keyboard.press('Enter');
  ok(/chưa giống nhau/.test(await page.$eval('.pwdlg .lgerr', e => e.textContent)) && !db.pwSets, 'nhập lại mật khẩu khác ⇒ báo, không gửi');
  await page.fill('#pwd-n2', 'Matkhau#2026'); await page.keyboard.press('Enter');
  await page.waitForSelector('.pwdlg', { state: 'detached', timeout: 10000 });
  ok(db.pwSets === 1 && db.pw['mmh.product'] === 'Matkhau#2026' && await page.evaluate(() => localStorage.getItem('tm_haspw:mmh.product') === '1'), 'lưu mật khẩu ⇒ máy chủ nhận, hộp đóng, nhớ "đã có mật khẩu"');
  await page.click('#uc-b');
  ok(await page.evaluate(() => { const m = document.querySelector('.umenu'); return !!m && /Đổi mật khẩu/.test(m.textContent) && /Đăng xuất/.test(m.textContent); }), 'bấm tên ⇒ menu: Đổi mật khẩu · Đăng xuất');
  await page.click('.umenu [data-um="out"]');
  ok(await page.evaluate(() => !!localStorage.getItem('mmh_tk') && /Bấm lần nữa/.test(document.querySelector('.umenu .warn').textContent)), 'Đăng xuất cần bấm lần 2 ngay trong menu (không dùng hộp confirm của trình duyệt)');
  await page.click('.umenu [data-um="out2"]');
  await page.waitForSelector('#gate:not([hidden]) #lg-pw');
  ok(await page.evaluate(() => !localStorage.getItem('mmh_tk') && document.getElementById('lg-email').value === 'mmh.product@manimedicalhanoi.com'), 'đăng xuất ⇒ về màn hình đăng nhập, email đã điền sẵn');
  await page.fill('#lg-pw', 'sai-mat-khau'); await page.click('#gate .lgsub');
  await page.waitForFunction(() => /chưa đúng/.test(document.querySelector('#gate .lgerr').textContent), null, { timeout: 10000 });
  ok(await page.$eval('#lg-pw', e => e.value) === 'sai-mat-khau', 'sai mật khẩu ⇒ báo lỗi, giữ chữ đã gõ để sửa');
  await page.click('#gate [data-lg="eye"]');
  ok(await page.$eval('#lg-pw', e => e.type) === 'text', 'nút con mắt ⇒ hiện mật khẩu');
  await page.fill('#lg-pw', 'Matkhau#2026'); await page.keyboard.press('Enter');
  await page.waitForSelector('#gate', { state: 'hidden', timeout: 10000 });
  await page.waitForFunction(() => document.getElementById('uchip').textContent.indexOf('Giang') >= 0);
  await page.waitForTimeout(700);
  ok(!db.pwInUrl && !(await page.$('.pwdlg')), 'đăng nhập email + mật khẩu ⇒ vào thẳng app, không hỏi đặt mật khẩu nữa');
  const info = await page.evaluate(dup => {
    const P = WINMAP.pkgs(), kq = P.filter(p => p.npp === 'KQTT');
    return { n: P.length, kq: kq.length, dup: kq.filter(p => dup.indexOf(p.tbmt) >= 0).length, fac: WINMAP.fac().length,
      linked: WINMAP.fac().filter(f => f.h && f.h.pk && f.h.pk.length).length };
  }, db.dupTb);
  ok(info.kq > 0, `KQTT: ${info.kq} gói thị trường (tổng ${info.n} gói)`);
  ok(info.dup === 0, `bỏ trùng theo TBMT: ${db.dupTb.length} số TBMT đã có ở NPP không còn trong KQTT`);
  ok(info.fac > 1000, `danh mục cơ sở y tế: ${info.fac} cơ sở, ${info.linked} có lịch sử thầu`);
  // kỳ mặc định = kỳ hiện tại (FY theo ngày hôm nay — tự sang FY69 từ 09/2027); bộ chọn chung Tuần · Tháng · Quý · Kỳ (FY)
  const pd = await page.evaluate(() => ({ pk: WINMAP.F.pk, lb: document.querySelector('#va-per .pb').textContent, sel: document.getElementById('f-period').hidden }));
  await page.click('#va-per .pb');
  const ptw = await page.evaluate(() => [...document.querySelectorAll('#va-per .ptab button')].map(b => b.textContent).join('|'));
  await page.click('#va-per [data-ptab="m"]'); const pm = await page.$$eval('#va-per .pls button', l => l.length);
  await page.click('#va-per [data-ptab="fy"]'); await page.click('#va-per .pop [data-per="every"]');
  const fyNow = (() => { const d = new Date(); return (d.getMonth() >= 8 ? d.getFullYear() + 1 : d.getFullYear()) - 1959; })();
  ok(pd.pk === 'fy' + fyNow && /^FY\d+ đến nay/.test(pd.lb) && pd.sel && ptw === 'Tuần|Tháng|Quý|Kỳ (FY)' && pm >= 2,
    `Kết quả thầu mặc định kỳ hiện tại (${pd.lb.trim()}), bộ chọn ${ptw}, chọn "Mọi năm" trong tab Kỳ`);
  const cv1 = await page.evaluate(() => ({ h: (document.querySelector('#fabox .cov .fah') || {}).textContent || '', n: document.querySelectorAll('#fabox .cov .cvi').length,
    t: [...document.querySelectorAll('#fabox .cov .cvi b')].map(e => e.textContent), dn: document.querySelectorAll('#fabox .cov svg.dn').length }));
  ok(/Đã trúng thầu ở đâu/.test(cv1.h) && cv1.n === 2 && cv1.dn === 2 && cv1.t.every(t => /^\d+\/\d+$/.test(t.replace(/\./g, ''))), `độ phủ trúng thầu (biểu đồ tròn trong thẻ bản đồ): tỉnh ${cv1.t[0]} · bệnh viện ${cv1.t[1]}`);
  const bars = await page.$$eval('.mon .c', e => e.length);
  ok(bars >= 36, `Mọi năm: biểu đồ tháng ${bars} cột (từ 2023)`);
  /* kỳ hiện tại chưa có gói ở 1 tỉnh (đầu FY, KQTT cập nhật chậm) ⇒ nói rõ + nút xem kỳ trước (rà soát 11/11/2026) */
  const pk0 = await page.evaluate(() => WINMAP.F.pk);
  await page.evaluate(n => { WINMAP.setF({ period: 'fy' + n }); }, fyNow);
  const ep = await page.evaluate(n => { for (let i = 0; i < 34; i++) { if (WINMAP.stat(i).n === 0 && WINMAP.pkgs().some(p => p.ni === i && p.res === 'Win' && p.fy === n - 1)) return i; } return -1; }, fyNow);
  if (ep >= 0) {
    await page.evaluate(i => WINMAP.select(i), ep); await page.waitForTimeout(300);
    ok(await page.$eval('#sb', e => { const n = e.querySelector('.note.empt'); return !!n && e.firstElementChild === n && !!n.querySelector('[data-setfy]') && !!n.querySelector('[data-every]'); }), 'kỳ hiện tại chưa có gói ở tỉnh ⇒ thông báo ngay đầu bảng + nút "Xem FY trước" · "Xem mọi năm"');
    await page.click('#sb .note.empt [data-setfy]');
    ok(await page.evaluate(n => WINMAP.F.pk === 'fy' + (n - 1) && !document.querySelector('#sb .note.empt'), fyNow), 'bấm "Xem FY trước" ⇒ chuyển kỳ, có số liệu');
  }
  await page.evaluate(p => { WINMAP.setF({ period: p }); WINMAP.select(-1); }, pk0);
  ok(await page.$eval('#f-view', e => /^Kết quả thầuTheo dõi thầu\d*Hoạt động$/.test(e.textContent)), 'chế độ: Kết quả thầu | Theo dõi thầu | Hoạt động');
  ok(!(await page.$eval('#sb', e => /trùng số TBMT/.test(e.textContent))), 'không còn ghi chú kỹ thuật bỏ trùng TBMT');
  const rk = await page.$$eval('.rank li', l => ({ n: l.length, fua: l.filter(x => x.querySelector('.fua')).length, cmp: !!document.querySelector('.cmpn') }));
  ok(rk.n > 0 && rk.fua === rk.n && rk.cmp, `top bệnh viện: ${rk.n} dòng, có ▲▼ so kỳ trước + nút "+ Theo dõi"`);
  ok(await page.$$eval('.rank li .pv', l => l.every(x => /MANI/.test(x.textContent) && !/KQTT thị trường|Hùng Vĩ|iCare/.test(x.textContent))), 'top bệnh viện: dòng phụ ghi hãng (MANI x% · hãng khác), không ghi nguồn');
  await page.screenshot({ path: path.join(OUT, 'd1_toanquoc.png') });
  // ── Doanh số ước tính (sheet Follow up by Account) trong khung bản đồ ──
  await page.waitForFunction(() => window.WINMAP && WINMAP.fa && WINMAP.fa._S.loaded && !document.getElementById('fabox').hidden, null, { timeout: 8000 });
  await page.evaluate(() => { if (document.querySelector('#fabox.min')) document.querySelector('#fabox [data-fa="min"]').click(); });
  await page.click('#fabox [data-fa-ch="all"]');
  const fa1 = await page.evaluate(() => { const b = document.getElementById('fabox'); return { v: b.querySelector('.fav b').textContent, q: [...b.querySelectorAll('.faq b')].map(e => e.textContent), g: b.querySelector('.fag').textContent, inMap: !!b.closest('.mapcard') }; });
  ok(fa1.inMap && fa1.v === '414 tr' && fa1.q.join('|') === '3.367|1.100|600' && /Existing/.test(fa1.g) && /Tư nhân/.test(fa1.g),
    `Doanh số ước tính (trong khung bản đồ): Tất cả ${fa1.v} · dao / chỉ / ghim ${fa1.q.join(' / ')} · ${fa1.g}`);
  await page.click('#fabox [data-fa-ch="tn"]');
  const fa2 = await page.$eval('#fabox .fav b', e => e.textContent);
  await page.click('#fabox [data-fa-ch="thau"]');
  const fa3 = await page.$eval('#fabox .fav b', e => e.textContent);
  await page.evaluate(() => WINMAP.select(WINMAP.provIx('Nghệ An'))); await page.waitForTimeout(500);
  const fa4 = await page.$eval('#fabox .fav', e => e.textContent);
  ok(fa2 === '55 tr' && fa3 === '359 tr' && /^130 tr/.test(fa4) && /Nghệ An/.test(fa4), `kênh Tư nhân ${fa2} · Kênh thầu ${fa3} · chọn tỉnh ⇒ ${fa4}`);
  await page.evaluate(() => WINMAP.hosp('Mắt Nghệ An')); await page.waitForTimeout(500);
  const fr = await page.evaluate(() => ({ h: [...document.querySelectorAll('#sb h3')].map(e => e.textContent).filter(t => /Dự báo doanh số/.test(t))[0] || '', n: document.querySelectorAll('#sb .fat tr[data-fa-edit]').length, off: document.querySelectorAll('#sb .fat tr.off').length }));
  ok(/Dự báo doanh số FY68 · 130 tr/.test(fr.h) && fr.n === 3 && fr.off === 1, `chi tiết cơ sở: mục "${fr.h.replace(/\s+/g, ' ')}" · ${fr.n} mã (${fr.off} chưa tính: ③ chưa có SL)`);
  await page.click('#sb details.faoff > summary');                        // dòng chưa điền gom vào 1 dòng thu gọn (v21)
  await page.click('#sb .fat tr.off');
  await page.waitForSelector('#fa-dlg:not([hidden]) #fa-qty');
  await page.fill('#fa-qty', '240'); await page.fill('#fa-start', '2027-01'); await page.selectOption('#fa-st', 'Đã gửi báo giá');
  const est = await page.$eval('#fa-est', e => e.textContent);
  await page.screenshot({ path: path.join(OUT, 'd1e_dubao_sua.png') });
  await page.click('#fa-dlg [data-fd="save"]');
  await page.waitForFunction(() => document.getElementById('fa-dlg').hidden && !document.querySelector('#sb .fat tr.off'), null, { timeout: 8000 });
  const sv = db.faSaves[db.faSaves.length - 1] || {};
  const fa5 = await page.$eval('#fabox .fav b', e => e.textContent);
  ok(/SL \/ tháng 20/.test(est) && /8 tháng/.test(est) && sv.qty === '240' && sv.start === '2027-01' && sv.stage === 'Đã gửi báo giá' && fa5 === '144 tr',
    `sửa dòng ③: SL 240, bắt đầu 01/2027 ⇒ ước tính "${est}" · lưu sheet (giai đoạn ${sv.stage}) · tỉnh ${fa5}`);
  await page.click('#sb [data-fa-add]'); await page.waitForSelector('#fa-dlg:not([hidden]) #fa-code');
  await page.fill('#fa-code', 'msl28sh'); await page.fill('#fa-qty', '120'); await page.fill('#fa-start', '2026-12'); await page.click('#fa-dlg [data-fd="save"]');
  await page.waitForFunction(() => document.getElementById('fa-dlg').hidden && document.querySelectorAll('#sb .fat tr[data-fa-edit]').length === 4, null, { timeout: 8000 });
  ok(db.faSaves[db.faSaves.length - 1].hosp === 'Bệnh viện Mắt Nghệ An' && db.faSaves[db.faSaves.length - 1].code === 'MSL28SH', '+ Thêm mã ⇒ dòng Sales mới (MSL28SH × 120) cho đúng cơ sở');
  await page.screenshot({ path: path.join(OUT, 'd1f_dubao_tinh.png') });
  await page.evaluate(() => { WINMAP.select(-1); });
  // ── đơn vị tiền VND ⇄ USD (tỷ giá cố định 26.400) ──
  await page.click('#fabox [data-fa-ch="all"]');
  const vd = await page.$eval('#fabox .fav b', e => e.textContent);
  await page.click('#f-cur [data-v="usd"]');
  const ud = await page.evaluate(() => ({ v: document.querySelector('#fabox .fav b').textContent, kpi: [...document.querySelectorAll('#sb .kpi b')].map(e => e.textContent).filter(t => /\$/.test(t)).length, ls: localStorage.getItem('tm_cur') }));
  ok(/^\$[\d.]+K$/.test(ud.v) && ud.kpi > 0 && ud.ls === 'usd', `VND ⇄ USD: ${vd} ⇒ ${ud.v} (doanh số ước tính + ô số bảng bên), nhớ lựa chọn`);
  await page.click('#f-cur [data-v="vnd"]');
  ok(await page.$eval('#fabox .fav b', e => e.textContent) === vd, 'chuyển lại VND ⇒ số cũ');
  // ── Mới cập nhật (fuNews + gói theo dõi có kết quả + Sales 7 ngày) ──
  const nbg = await page.$eval('#news .n', e => e.hidden ? '' : e.textContent);
  await page.click('#news');
  await page.waitForFunction(() => WINMAP.news.on() && document.querySelectorAll('#sb .nwi').length >= 4);
  const nwx = await page.evaluate(() => ({ t: document.getElementById('sh-t').textContent, n: document.querySelectorAll('#sb .nwi').length, fol: [...document.querySelectorAll('#sb .nwi')].filter(e => /Đang theo dõi/.test(e.textContent)).map(e => e.querySelector('.a').textContent),
    res: [...document.querySelectorAll('#sb .nwi .st')].map(e => e.textContent).join('|'), days: [...document.querySelectorAll('#sb .nwd')].length }));
  ok(+nbg >= 4 && /Mới cập nhật/.test(nwx.t) && nwx.n >= 4 && nwx.fol.some(t => /chợ rẫy/i.test(t)) && /MANI trúng · Hùng Vĩ/.test(nwx.res) && /iCare đang dự thầu/.test(nwx.res) && nwx.days >= 2,
    `Mới cập nhật: chuông ${nbg} ⇒ ${nwx.n} gói mới theo ngày (${nwx.days} nhóm), kết quả ${nwx.res}; cơ sở đang theo dõi được đánh dấu (${nwx.fol.join(', ')})`);
  await page.screenshot({ path: path.join(OUT, 'd1g_moi_cap_nhat.png') });
  await page.click('#sb [data-nf="ok"]');
  ok(await page.$$eval('#sb .nwi .st', l => l.length > 0 && l.every(e => /MANI trúng/.test(e.textContent))), 'lọc "MANI trúng" ⇒ chỉ còn gói MANI trúng');
  await page.click('#sb .nwi [data-fh]');
  await page.waitForFunction(() => !WINMAP.news.on() && /bệnh viện/i.test(document.getElementById('sh-t').textContent));
  ok(await page.$eval('#news .n', e => e.hidden), 'bấm 1 gói ⇒ mở chi tiết cơ sở, chuông hết số (đã xem)');
  await page.evaluate(() => { WINMAP.select(-1); });
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
  const ps = await page.$eval('.facts', e => e.innerText.replace(/\s+/g, ' '));
  ok(/Cơ sở y tế \d+ BV công lập · \d+ TTYT/.test(ps) && /Thầu dao \d+ cơ sở trúng dao · KQTT \d{2}\/\d{4} – \d{2}\/\d{4}/.test(ps) && /Dẫn đầu .+ · \d+ gói · [\d.]+ dao/.test(ps) && /Hãng dẫn đầu \S+ (<1|\d+)%/.test(ps),
    'tóm tắt tỉnh (dòng điểm chính, không còn đoạn văn): ' + ps.slice(0, 260));
  ok(await page.evaluate(() => { const k = document.querySelector('#sb .kpis'), f = document.querySelector('#sb .facts'); return !!k && !!f && (k.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) && !document.querySelector('.psum'); }), 'bảng bên tỉnh: ô số ở trên cùng, rồi dòng điểm chính');
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
  await page.click('#sb .fuaddw');
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
  ok(!(await page.$('#fm-tb')), 'gói mới ở giai đoạn "Chưa tiếp cận": không hỏi số TBMT (v21)');
  await page.click('.stg button[data-st="5"]');
  ok(!!(await page.$('#fm-tb')) && /\*/.test(await page.$eval('label[for="fm-tb"]', e => e.textContent)), 'chọn "Đang dự thầu" (đã nộp hồ sơ) ⇒ hiện ô số TBMT, bắt buộc');
  await page.click('[data-fm="save"]');
  ok(/TBMT/.test(await page.$eval('#fu-b .er', e => e.textContent)) && !(await page.$eval('#fudlg', e => e.hidden)), 'Đang dự thầu mà chưa nhập TBMT ⇒ nhắc, chưa lưu');
  await page.click('.stg button[data-st="1"]');
  ok(await page.$eval('#fm-note', e => e.value) === 'Gặp trưởng khoa, giới thiệu MSL-SH. Khoa dùng dao Alcon, quan tâm giá.' && !(await page.$('#fm-tb')), 'đổi giai đoạn giữ nguyên nội dung đã nhập, ô TBMT ẩn lại');
  await page.screenshot({ path: path.join(OUT, 'd5_form.png') });
  await page.click('[data-fm="save"]');
  await page.waitForFunction(() => document.getElementById('fudlg').hidden);
  await page.waitForFunction(() => document.querySelectorAll('.fuc').length > 0 && !/đang lưu/.test(document.querySelector('.fuc').textContent), null, { timeout: 10000 });
  ok(db.fu.length === 1 && db.fu[0][15] === 1 && db.fu[0][23] === 'Viet Ha', 'lưu gói mới (bước 1) ⇒ 1 dòng FOLLOW UP TENDER, cột PIC phụ trách địa bàn = Viet Ha (Nghệ An)');
  /* chống nhập trùng (11/11/2026): thêm gói mới ở cơ sở đã có gói dao đang theo dõi ⇒ báo ngay, "Cập nhật gói này" mang theo nội dung đang gõ */
  await page.evaluate(() => WINMAP.fu.open({ f: WINMAP.fac().find(f => /Mắt Nghệ An/.test(f.name)) }));
  await page.waitForSelector('#fm-dup');
  ok(await page.$eval('#fm-dup', e => /đã có 1 gói đang theo dõi/.test(e.textContent) && !!e.querySelector('[data-fm-dup]')), 'thêm gói mới ở cơ sở đã có gói đang theo dõi ⇒ báo ngay "Cơ sở này đã có 1 gói đang theo dõi" + nút Cập nhật gói này');
  await page.fill('[data-ln="code"][data-i="0"]', 'MSL28SH'); await page.fill('[data-ln="qty"][data-i="0"]', '50'); await page.fill('#fm-note', 'Ghi chú gõ ở gói mới');
  await page.click('[data-fm="save"]');
  ok(/đã có gói đang theo dõi/.test(await page.$eval('#fu-b .er', e => e.textContent)) && db.fu.length === 1, 'bấm Lưu khi chưa chọn ⇒ nhắc, không tạo gói trùng');
  await page.screenshot({ path: path.join(OUT, 'd5b_trung_goi.png') });
  await page.click('[data-fm-dup]');
  ok(/Cập nhật gói đang theo dõi/.test(await page.$eval('#fu-t', e => e.textContent)) && await page.$eval('#fm-note', e => e.value) === 'Ghi chú gõ ở gói mới', '"Cập nhật gói này" ⇒ chuyển sang cập nhật gói có sẵn, giữ ghi chú đang gõ');
  await page.click('[data-fm="cancel"]');
  await page.evaluate(() => WINMAP.fu.open({ caseId: WINMAP.fu.cases().find(c => /Mắt Nghệ An/.test(c.f.name)).id }));
  await page.waitForSelector('#fm-note'); await page.click('.stg button[data-st="1"]');
  await page.fill('#fm-note', 'Gặp trưởng khoa, giới thiệu MSL-SH. Khoa dùng dao Alcon, quan tâm giá.');
  await page.click('[data-fm="save"]');
  ok(/giống hệt lần cập nhật trước/.test(await page.$eval('#fu-b .er', e => e.textContent)) && db.fu.length === 1, 'cập nhật giống hệt lần trước (giai đoạn, ghi chú, mã) ⇒ không lưu lại');
  await page.click('[data-fm="cancel"]');
  // ── hàng nút giai đoạn trên bản đồ (v21): Thầu công lập | Tư nhân + mỗi giai đoạn 1 nút, gộp gói theo dõi + kế hoạch FY68 ──
  await page.evaluate(() => WINMAP.select(-1));
  const sb0 = await page.evaluate(() => { const b = document.querySelector('#sb .stbar'); return { on: !!b && document.getElementById('stbar').hidden, tabs: [...b.querySelectorAll('[data-stk]')].map(x => x.textContent).join('|'), c: Object.fromEntries([...b.querySelectorAll('[data-stc]')].map(x => [x.dataset.stc, +x.querySelector('b').textContent])) }; });
  ok(sb0.on && sb0.tabs === 'Thầu công lập|Tư nhân · mua sắm' && sb0.c['1'] >= 1 && sb0.c['2'] >= 1 && sb0.c['-1'] >= 1,
    `hàng nút giai đoạn: ${sb0.tabs} · Chưa tiếp cận ${sb0.c['1']} · Đã giới thiệu ${sb0.c['2']} (kế hoạch FY68) · Chưa có giai đoạn ${sb0.c['-1']}`);
  await page.click('#sb .stbar [data-stc="2"]');
  const sb1 = await page.evaluate(() => ({ h: (document.querySelector('#sb h3') || {}).textContent || '', items: [...document.querySelectorAll('#sb .fuc')].map(e => e.querySelector('.t').textContent), prov: [...document.querySelectorAll('#sb .fph')].map(e => e.textContent) }));
  ok(/Đã giới thiệu tới chuyên môn/.test(sb1.h) && sb1.items.some(t => /chợ rẫy/i.test(t)) && sb1.prov.some(t => /Hồ Chí Minh/.test(t)), `bấm "Đã giới thiệu" ⇒ danh sách theo tỉnh: ${sb1.prov.join(', ')} (${sb1.items.join(', ')})`);
  await page.screenshot({ path: path.join(OUT, 'd7c_nut_giai_doan.png') });
  await page.click('#sb .stbar [data-stc="-1"]');
  ok(await page.$$eval('#sb .fuc.plan', l => l.length >= 1 && l.every(e => /Chưa có giai đoạn/.test(e.textContent))), '"Chưa có giai đoạn" ⇒ các dòng kế hoạch FY68 chưa điền (ẩn khỏi bản đồ khi xem Tất cả)');
  await page.click('#sb .stbar [data-stk="pv"]');
  ok(await page.evaluate(() => { const c = [...document.querySelectorAll('#sb .stbar [data-stc]')].map(x => x.textContent); return /Demo/.test(c.join('|')) && /Ký HĐ mua sắm/.test(c.join('|')) && !/Đang dự thầu/.test(c.join('|')); }), 'tab Tư nhân ⇒ nút giai đoạn mua sắm (Giới thiệu · Demo · … · Ký HĐ mua sắm)');
  await page.click('#sb .stbar [data-stk="pub"]'); await page.click('#sb .stbar [data-stc="0"]');
  await page.evaluate(() => WINMAP.select(WINMAP.provIx('Nghệ An')));
  const sp1 = await page.evaluate(() => ({ chip: +document.querySelector('#sb .stbar [data-stc="0"] b').textContent, kpi: +document.querySelector('#sb .kpis .kpi b').textContent, add: /Thêm gói theo dõi ở Nghệ An/.test(document.querySelector('#sb .fuaddw').textContent) }));
  ok(sp1.chip === sp1.kpi && sp1.add, `Theo dõi thầu · Nghệ An: nút "Tất cả" (${sp1.chip}) = số gói đang theo dõi của tỉnh (${sp1.kpi}) — hàng nút chỉ đếm tỉnh đang xem; nút "+ Thêm gói theo dõi ở Nghệ An"`);
  await page.evaluate(() => WINMAP.select(-1));
  ok(await page.evaluate(() => { const t = document.querySelector('#sb .scb'); return !!t && /So sánh theo Sales/.test(document.getElementById('sb').textContent) && t.querySelectorAll('thead th[data-sc-pic]').length === 2 && /Gói đang theo dõi/.test(t.textContent); }), 'Theo dõi thầu (cả nhóm): bảng So sánh theo Sales (Viet Ha · Khang)');
  await page.evaluate(() => WINMAP.hosp('Mắt Nghệ An'));
  await page.waitForFunction(() => /S-NA-001/.test((document.getElementById('crmx') || {}).textContent || ''), null, { timeout: 10000 });
  ok(await page.$eval('#crmx', e => /Lượt gặp 12 tháng/.test(e.textContent) && /Trưởng khoa/.test(e.textContent)), 'đã đăng nhập ⇒ khối CRM Surgical: mã địa bàn, lượt gặp, người liên hệ, đơn hàng');
  ok(await page.$eval('#sb .fuact', e => /Cập nhật gói: /.test(e.querySelector('.btn.pri').textContent) && !!e.querySelector('[data-fu-new]')), 'chi tiết cơ sở có 1 gói đang mở ⇒ nút to "Cập nhật gói: <giai đoạn>" + nút nhỏ "+ Gói khác"');
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
  ok(pg.stg === 4 && pg.fill !== 'var(--land)', 'bản đồ theo dõi: Nghệ An tô màu giai đoạn xa nhất — gói theo dõi "Đang xây cấu hình" + kế hoạch FY68 "Đã gửi báo giá" (sửa ở dự báo) ⇒ 4 (' + pg.fill + ')');
  ok(await page.$eval('#legend', e => /Tô màu theo tiến độ/.test(e.textContent) && e.querySelectorAll('.stl')[0].querySelectorAll('span').length === 9 && /Mua sắm cơ sở tư nhân/.test(e.textContent) && /Demo/.test(e.textContent)), 'chú giải: 9 giai đoạn thầu công lập + giai đoạn mua sắm tư nhân, mỗi giai đoạn 1 màu');
  const wn = await page.evaluate(() => ({ n: WINMAP.fu.warnCount(), box: document.querySelectorAll('#sb .wbox .wl').length, badge: (document.querySelector('#f-view .wb') || {}).textContent || '' }));
  ok(wn.n > 0 && wn.box > 0 && wn.badge === String(wn.n), `cảnh báo: ${wn.n} hợp đồng MANI sắp hết hiệu lực chưa cập nhật theo dõi — khối cảnh báo + số trên nút Theo dõi thầu`);
  await page.screenshot({ path: path.join(OUT, 'd7b_canhbao.png') });
  if (await page.$('#sb .wbox [data-fu-warn]')) {
    await page.click('#sb .wbox [data-fu-warn]');
    await page.waitForSelector('#fm-pkg');
    ok(/^Thầu lại/.test(await page.$eval('#fm-pkg', e => e.value)), 'bấm "+ Theo dõi thầu lại" trong cảnh báo ⇒ hộp theo dõi điền sẵn');
    await page.click('[data-fm="cancel"]');
  }
  // khớp kết quả KQTT với gói đang theo dõi (cùng số TBMT) ⇒ gợi ý ghi kết quả
  const kq = await page.evaluate(() => { const p = WINMAP.pkgs().find(x => x.npp === 'KQTT' && x.h && x.h.f && x.tbmtRaw.length && x.approve); if (!p) return null;
    WINMAP.fu.open({ f: p.h.f, pre: { pkg: 'Gói khớp KQTT', stage: 5, tbmt: p.tbmtRaw[0], lines: [{ code: 'MSL28SH', qty: '100', kind: 'dao' }] } }); return { tb: p.tbmtRaw[0], mani: p.items.some(i => /mani/i.test(i.mfr)), name: p.h.name }; });
  if (kq) {
    ok(await page.$eval('#fm-tb', e => e.value) === kq.tb, 'hộp theo dõi nhận số TBMT điền sẵn');
    await page.click('[data-fm="save"]');
    await page.waitForFunction(() => document.getElementById('fudlg').hidden);
    await page.waitForFunction(() => !/đang lưu/.test(document.getElementById('sb').textContent), null, { timeout: 10000 });
    ok(!(await page.$('.kqm')), 'gói bắt đầu theo dõi HÔM NAY mà số TBMT trùng kết quả cũ (quyết định từ trước) ⇒ KHÔNG báo "Đã có kết quả" nhầm (v21)');
    const old = db.fu[db.fu.length - 1].slice(); old[0] = '2022-06-01 09:00:00'; old[1] = 'FUOLD1'; old[20] = 'rid-old'; db.fu.push(old);   // gói theo dõi từ trước ngày quyết định
    await page.evaluate(n => WINMAP.fu.load().then(() => WINMAP.hosp(n)), kq.name);
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
  const actDef = await page.$eval('#va-per .pb', e => e.textContent.trim());
  ok(/^Tháng \d+\/\d{4}$/.test(actDef) && actDef === 'Tháng ' + (new Date().getMonth() + 1) + '/' + new Date().getFullYear(), `Hoạt động mặc định tháng hiện tại (${actDef})`);
  await pickPer(page, 'fy' + fyNow);                                  // dữ liệu giả rải cả FY ⇒ các bài dưới xem theo FY
  const cv3 = await page.evaluate(() => ({ h: (document.querySelector('#fabox .cov .fah') || {}).textContent || '', l: [...document.querySelectorAll('#fabox .cov .cvi')].map(e => e.textContent), fc: !!document.querySelector('#fabox .fasec') }));
  ok(/Khách đã gặp/.test(cv3.h) && cv3.l.length === 2 && /công lập/.test(cv3.l[0]) && /tư nhân/.test(cv3.l[1]) && !cv3.fc, `độ phủ chăm sóc (customer list): ${cv3.l.join(' · ')} — tab Hoạt động không hiện doanh số`);
  await page.click('#va-per .pb');
  const pt = await page.evaluate(() => ({ tabs: [...document.querySelectorAll('#va-per .ptab button')].map(b => b.textContent).join('|'), fy: document.querySelectorAll('#va-per .pls button').length }));
  await page.click('#va-per [data-ptab="w"]');
  pt.w = await page.$$eval('#va-per .pls button', l => l.map(b => b.textContent));
  await page.keyboard.press('Escape');
  ok(pt.tabs === 'Tuần|Tháng|Quý|Kỳ (FY)|Khoảng ngày' && pt.fy >= 2 && /^Tuần này/.test(pt.w[0]) && /^Tuần trước/.test(pt.w[1]) && await page.$eval('#va-per .pop', e => e.hidden),
    `Hoạt động: chọn kỳ Tuần · Tháng · Quý · FY · Khoảng ngày (${pt.w.length} tuần gần nhất, Esc đóng)`);
  const av = await page.evaluate(() => ({ per: document.querySelectorAll('#va-per > button').length, pic: document.querySelectorAll('#f-pic button').length,
    na: document.querySelector('.prov[data-i="16"]').getAttribute('fill'), leg: /nhiều lượt viếng thăm hơn/.test(document.getElementById('legend').textContent) }));
  ok(av.per === 3 && av.pic === 3 && av.na !== 'var(--land)' && av.leg, `Hoạt động: thanh kỳ [‹ kỳ ›], PIC (Cả nhóm · Viet Ha · Khang), tỉnh tô đậm nhạt theo lượt viếng thăm`);
  await pickPer(page, 'fy67');
  const ac = await page.evaluate(() => {
    const L = document.getElementById('legend').textContent, S = document.getElementById('sb').textContent;
    const rgb = n => { const f = document.querySelector('.prov[data-i="' + WINMAP.provIx(n) + '"]').getAttribute('fill'); return [1, 3, 5].map(i => parseInt(f.slice(i, i + 2), 16)); };
    return { leg: /Viet Ha/.test(L) && /Khang/.test(L) && !/Nguyen Ha|Giang|Test/.test(L), sb: !/Nguyen Ha|TEST Bệnh viện/.test(S) && [...document.querySelectorAll('#sb [data-sc-pic]')].map(e => e.dataset.scPic).join() === 'Viet Ha,Khang', hn: rgb('Hà Nội'), hcm: rgb('Hồ Chí Minh'),
      pics: [...new Set(WINMAP.act.rows().map(r => r.pic))], dbg: (L.match(/.{0,40}(Nguyen Ha|Giang|Test).{0,40}/) || [''])[0] + ' || ' + (S.match(/.{0,60}(Nguyen Ha|Giang|TEST|\bTest\b).{0,40}/) || [''])[0] };
  });
  ok(ac.leg && ac.sb && ac.pics.every(p => p === 'Viet Ha' || p === 'Khang'), 'Hoạt động chỉ có Viet Ha · Khang (bỏ lượt của Nguyen Ha / Giang / TEST, khách TEST) — PIC trong dữ liệu: ' + ac.pics.join(', ') + (ac.leg && ac.sb ? '' : ' | ' + ac.dbg));
  ok(ac.hn[2] > ac.hn[0] && ac.hcm[0] > ac.hcm[2], `tỉnh tô theo màu PIC: Hà Nội (Viet Ha) rgb(${ac.hn}) · TP.HCM (Khang) rgb(${ac.hcm})`);
  const sc = await page.evaluate(() => { const t = document.querySelector('#sb .scb'); if (!t) return null; const tr = [...t.querySelectorAll('tbody tr')];
    return { h: [...t.querySelectorAll('thead th[data-sc-pic]')].map(e => e.textContent.trim()), rows: tr.filter(r => !r.classList.contains('g')).map(r => r.firstElementChild.textContent), vis: (tr.find(r => /Lượt viếng thăm/.test(r.textContent)) || {}).textContent || '',
      k: document.querySelectorAll('#sb .kpis .kpi b')[1].textContent.replace(/\s/g, ''), t: ((document.querySelector('#fabox .cvs b') || {}).textContent || '').replace(/\s/g, '') }; });
  ok(sc && sc.h.length === 2 && sc.rows.length === 7 && /\d/.test(sc.vis), `So sánh theo Sales (Hoạt động): ${sc && sc.h.join(' · ')} — ${sc && sc.rows.join(' | ')}`);
  ok(sc && sc.k === sc.t, `số khách phụ trách đã gặp ở bảng bên (${sc && sc.k}) = thẻ trên bản đồ (${sc && sc.t}) — cùng cách tính (bỏ NPP)`);
  await page.click('#sb .scb th[data-sc-pic="Khang"]');
  ok(await page.evaluate(() => WINMAP.scope.pic() === 'Khang' && document.querySelectorAll('#sb .scb th[data-sc-pic]').length === 1), 'bấm tên Khang trong bảng so sánh ⇒ xem riêng địa bàn Khang');
  await page.click('#sb .scb th[data-sc-pic="Khang"]');
  await pickPer(page, 'fy67');
  const n67 = await page.$eval('#sb .kpi b', e => +e.textContent);
  await pickPer(page, 'm2025*');
  const nm = await page.$eval('#sb .kpi b', e => +e.textContent);
  ok(n67 > 0 && nm <= n67, `đổi kỳ: FY67 ${n67} lượt ⇒ 1 tháng ${nm} lượt`);
  // khoảng ngày tuỳ chọn: cả FY67 theo ngày = đúng số lượt FY67; 1 tuần có lượt ⇒ đếm theo NGÀY
  await page.click('#va-per .pb'); await page.click('#va-per [data-ptab="c"]');
  await page.fill('#va-per .pd0', '2025-09-01'); await page.fill('#va-per .pd1', '2026-08-31'); await page.click('#va-per [data-pgo]');
  const nc = await page.$eval('#sb .kpi b', e => +e.textContent), lcp = await page.$eval("#va-per .pb", e => e.textContent);
  const wk = await page.evaluate(() => { const R = WINMAP.act.rows().filter(r => r.visit && r.done && r.d < '2026-09-01').map(r => r.d).sort(); const d = new Date(R[R.length - 1] + 'T00:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const p2 = n => (n < 10 ? '0' : '') + n, mon = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); const e = new Date(d); e.setDate(e.getDate() + 6); const sun = e.getFullYear() + '-' + p2(e.getMonth() + 1) + '-' + p2(e.getDate());
    return { mon, n: R.filter(x => x >= mon && x <= sun).length }; });
  await page.evaluate(w => { WINMAP.act._S.per = 'w' + w; }, wk.mon); await page.click('#va-per .pa[data-mv="1"]'); await page.click('#va-per .pa[data-mv="-1"]');
  const nw = await page.$eval('#sb .kpi b', e => +e.textContent), lw = await page.$eval('#va-per .pb', e => e.textContent), cm = await page.$eval('#sb', e => /Lượt theo ngày/.test(e.textContent));
  ok(nc === n67 && /01\/09\/2025 – 31\/08\/2026/.test(lcp) && nw === wk.n && nw > 0 && /^Tuần/.test(lw) && cm,
    `khoảng ngày 01/09/2025 – 31/08/2026 = ${nc} lượt (FY67 ${n67}); tuần ${wk.mon}: ${nw}/${wk.n} lượt, ‹ › chuyển tuần, biểu đồ theo ngày`);
  await pickPer(page, 'fy67');
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
  // thẻ lần gặp gần nhất: ảnh + kết quả, hiện ngay (dữ liệu fuVisits v1.1); thông tin & vị trí thu gọn
  const lv = await page.evaluate(() => ({ card: !!document.querySelector('#sb .lvc .lvh'), ph: document.querySelectorAll('#sb .lvc .phs img').length, info: !!document.querySelector('details[data-sec="acc-info"]:not([open])') }));
  ok(lv.card && lv.ph > 0 && lv.info, `chi tiết khách: thẻ lần gặp gần nhất (${lv.ph} ảnh) ở đầu, Thông tin & vị trí thu gọn`);
  await page.click('details[data-sec="acc-info"] > summary');
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
  // rê chuột vào khách ⇒ tooltip có ảnh đi địa bàn + lần gặp gần nhất (dữ liệu có sẵn, không gọi máy chủ)
  await page.evaluate(() => WINMAP.select(WINMAP.provIx('Hồ Chí Minh')));
  await page.waitForTimeout(900);
  const hb = await page.evaluate(() => { const g = [...document.querySelectorAll('.hm')].find(e => (WINMAP.act._A().find(a => a.h && a.h.key === e.dataset.h && a.ph) )); if (!g) return null; const r = g.querySelector('circle.c').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (hb) { await page.mouse.move(hb.x, hb.y); await page.waitForTimeout(400); }
  const tp = await page.evaluate(() => { const t = document.getElementById('tip'); const im = t.querySelector('.pvi img'); return { card: t.classList.contains('card'), img: !!im, w: im ? im.getBoundingClientRect().width : 0, lv: /Kết quả gần nhất/.test(t.textContent), op: getComputedStyle(t).opacity }; });
  ok(hb && tp.card && tp.img && tp.w >= 340 && tp.lv && +tp.op > 0, `rê chuột vào địa bàn ⇒ thẻ xem trước: ảnh đi địa bàn cỡ lớn (${Math.round(tp.w)}px) + kết quả gần nhất`);
  await page.screenshot({ path: path.join(OUT, 'a4_tooltip_anh.png') });
  await page.mouse.move(5, 5);
  // rê chuột vào tỉnh ⇒ thẻ: ảnh mới nhất trong kỳ + kết quả gần nhất của tỉnh
  await page.evaluate(() => WINMAP.select(-1)); await pickPer(page, 'fy68'); await page.waitForTimeout(500);
  const pb = await page.evaluate(() => { const e = document.querySelector('.prov[data-i="' + WINMAP.provIx('Nghệ An') + '"]'); const r = e.getBoundingClientRect(); return { x: r.left + r.width * 0.45, y: r.top + r.height * 0.45 }; });
  await page.mouse.move(pb.x, pb.y); await page.waitForTimeout(400);
  const tpp = await page.evaluate(() => { const t = document.getElementById('tip'); return { card: t.classList.contains('card'), img: !!t.querySelector('.pvi img'), t: t.textContent }; });
  ok(tpp.card && tpp.img && /Nghệ An/.test(tpp.t) && /Kết quả gần nhất · Bệnh viện Mắt Nghệ An/.test(tpp.t), 'rê chuột vào tỉnh (Hoạt động) ⇒ thẻ ảnh mới nhất trong kỳ + kết quả gần nhất của tỉnh');
  await page.mouse.move(5, 5);
  // công lập / tư nhân: khách tư nhân "Mắt Thanh Bình" không được ghép vào / đổi loại "BV Mắt tỉnh Ninh Bình" (công lập)
  const nb = await page.evaluate(() => { const A = WINMAP.act._A(), f = WINMAP.fac().find(x => x.id === 'Ow1220299857'), a10 = A.find(a => a.code === 'S-010'), a11 = A.find(a => a.code === 'S-011');
    return { pv: f && f.pv, a10: a10 && a10.f && a10.f.id, a11: a11 && a11.f && a11.f.id, a11pub: a11 && a11.pub }; });
  ok(nb.pv === 0 && nb.a10 === 'Ow1220299857' && nb.a11 !== 'Ow1220299857' && nb.a11pub === false,
    `BV Mắt tỉnh Ninh Bình vẫn công lập (khách công lập S-010 ghép đúng; khách tư nhân Mắt Thanh Bình ⇒ ${nb.a11})`);
  // ĐỘ PHỦ: Sales đã chăm sóc các cơ sở MANI từng trúng thầu chưa
  await page.evaluate(() => { WINMAP.select(-1); WINMAP.act.ensure(); });
  await page.click('.vsw button[data-cov="mani"]');
  await page.waitForTimeout(400);
  const cv = await page.evaluate(() => { const L = [...document.querySelectorAll('.bdg text')].map(t => t.textContent);
    const k = [...document.querySelectorAll('#sb .kpis .kpi b')].map(b => b.textContent);
    return { lab: L.filter(t => /^\d+\/\d+$/.test(t)).length, all: L.length, k, un: document.querySelectorAll('details[data-sec="cov-un"] .it').length, prov: document.querySelectorAll('details[data-sec="cov-prov"] .r').length,
      leg: /được chăm sóc/.test(document.getElementById('legend').textContent), title: document.getElementById('sh-t').textContent }; });
  ok(cv.lab > 0 && cv.lab === cv.all && cv.k.length === 4 && cv.prov > 0 && cv.leg && /Cơ sở trúng thầu đã gặp/.test(cv.title),
    `Độ phủ (MANI đã trúng): ${cv.lab} tỉnh hiện "đã chăm sóc / tổng", ô số ${cv.k.join(' · ')}, ${cv.prov} tỉnh trong bảng, ${cv.un} cơ sở chưa chăm sóc`);
  const tot1 = +cv.k[0];
  await page.click('.chips button[data-cov="all"]');
  await page.waitForTimeout(300);
  const tot2 = await page.evaluate(() => +document.querySelector('#sb .kpis .kpi b').textContent);
  ok(tot2 >= tot1, `Độ phủ "có KQTT (mọi hãng)": ${tot2} cơ sở ≥ ${tot1} cơ sở MANI đã trúng`);
  await page.click('.chips button[data-cov="mani"]');
  await page.evaluate(() => WINMAP.select(WINMAP.provIx('Nghệ An')));
  await page.waitForTimeout(900);
  const dots = await page.evaluate(() => [...document.querySelectorAll('.hm circle.c')].map(c => c.getAttribute('stroke')));
  ok(dots.length > 0 && dots.some(c => /#B42318/i.test(c)) === (await page.evaluate(() => document.querySelectorAll('details[data-sec="cov-un"] .it').length > 0)), `Độ phủ · Nghệ An: ${dots.length} cơ sở MANI đã trúng trên bản đồ (đỏ = chưa chăm sóc)`);
  await page.screenshot({ path: path.join(OUT, 'a5_dophu.png') });
  const ck = await page.evaluate(() => { const it = document.querySelector('details[data-sec="cov-un"] .it, details[data-sec="cov-ok"] .it'); return it ? it.dataset.h : null; });
  if (ck) { await page.evaluate(k => { const d = document.querySelector('#sb [data-h="' + k + '"]').closest('details'); d.open = true; }, ck); await page.click('#sb [data-h="' + ck + '"]'); await page.waitForTimeout(400); }
  ok(ck && await page.evaluate(() => /Lịch sử trúng thầu|Gói MANI trúng gần nhất/.test(document.getElementById('sb').textContent) && WINMAP.F.view === 'act'), 'Độ phủ: bấm 1 cơ sở ⇒ xem chi tiết thầu + CRM ngay trong chế độ Hoạt động');
  await page.evaluate(() => WINMAP.select(-1));
  await page.click('.vsw button[data-cov=""]');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('details[data-sec="cov-un"]') && /Hoạt động Sales/.test(document.getElementById('sh-t').textContent)), 'chuyển lại "Lượt chăm sóc"');
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

  /* ── loại sản phẩm: dao · chỉ khâu · ghim da (Manipler) · Hook · Micro Forceps (người dùng bổ sung 05/11/2026) ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 860 } }));
  await page.evaluate(() => { WINMAP.view('fu'); });
  await page.waitForFunction(() => window.WINMAP && WINMAP.fu._S.loaded);
  await page.evaluate(() => { const f = WINMAP.fac().find(x => /Bạch Mai/.test(x.name)); WINMAP.fu.open({ f }); });
  await page.waitForSelector('#fm-pkg');
  const kb = await page.$$eval('.kd button', L => L.map(e => e.textContent));
  ok(kb.join('|') === 'Dao nhãn khoa|Chỉ khâu|Ghim da (Manipler)|Hook (móc mở vùng bè)|Micro Forceps (kìm vi phẫu)', 'loại sản phẩm: ' + kb.join(' · '));
  for (const k of ['ghim', 'hook', 'forcep', 'dao']) await page.click('.kd button[data-kind="' + k + '"]');   // bật 3 loại mới, bỏ Dao
  await page.fill('#fm-pkg', 'Gói vật tư phẫu thuật 2027');
  const vals = { ghim: ['AZ35WS', '60'], hook: ['MTH-S', '10'], forcep: ['MSQ25A28', '20'] };
  const lk = await page.$$eval('[data-ln="code"]', L => L.map(e => e.getAttribute('list')));
  for (let i = 0; i < lk.length; i++) { const v = vals[lk[i].slice(3)]; await page.fill('[data-ln="code"][data-i="' + i + '"]', v[0]); await page.fill('[data-ln="qty"][data-i="' + i + '"]', v[1]); }
  const ds = await page.$$eval('.ln .dsc', L => L.map(e => e.textContent));
  ok(lk.join() === 'dl-ghim,dl-hook,dl-forcep' && /Manipler AZ 35W/.test(ds[0]) && /Móc mở vùng bè/.test(ds[1]) && /Kìm vi phẫu 25G đầu vuông/.test(ds[2]),
    'chọn Ghim da · Hook · Micro Forceps ⇒ mỗi loại 1 dòng mã, gợi ý mã theo danh mục: ' + ds.join(' | '));
  await page.screenshot({ path: path.join(OUT, 'd9_loai_sp.png') });
  await page.click('[data-fm="save"]');
  for (let i = 0; i < 40 && !db.fu.length; i++) await page.waitForTimeout(250);
  const it9 = db.fu.length ? JSON.parse(db.fu[0][19]) : [];
  ok(db.fu.length === 1 && db.fu[0][11] === 'Ghim da + Hook + Micro Forceps' && it9.map(x => x.kind).join() === 'ghim,hook,forcep' && db.fu[0][13] === 90,
    'lưu ⇒ Loại sản phẩm "' + (db.fu[0] || [])[11] + '", từng dòng giữ loại (ghim / hook / forcep), tổng SL ' + (db.fu[0] || [])[13]);
  ok(!errs.length, 'không lỗi JS (loại sản phẩm)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();

  /* ── máy chủ chậm (Apps Script 1,5 giây / lần): bấm khách / bệnh viện vẫn hiện ngay ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1440, height: 900 } }, { lag: 1500 }));
  await page.evaluate(() => { WINMAP.view('act'); });
  await page.waitForFunction(() => WINMAP.act._S.loaded, null, { timeout: 20000 });
  await page.evaluate(() => WINMAP.act.openCode('S-001'));
  await page.waitForTimeout(250);
  const inst = await page.evaluate(() => ({ ev: document.querySelectorAll('#actlog .ev').length, cap: (document.querySelector('#actlog .cap') || {}).textContent || '', card: !!document.querySelector('#sb .lvc') }));
  ok(inst.ev > 0 && inst.card && /đang đọc đủ nhật ký/.test(inst.cap), `máy chủ chậm: bấm khách ⇒ hiện ngay thẻ lần gặp gần nhất + ${inst.ev} lượt gần nhất (nhật ký đủ đọc ở nền)`);
  await page.waitForFunction(() => !/đang đọc đủ nhật ký/.test((document.querySelector('#actlog') || {}).textContent || ''), null, { timeout: 10000 });
  ok(true, 'nhật ký đủ về ⇒ thay thế tại chỗ');
  await page.evaluate(() => { WINMAP.view('win'); WINMAP.hosp('Mắt Nghệ An'); });
  await page.waitForFunction(() => /Mã/.test((document.getElementById('crmx') || {}).textContent || ''), null, { timeout: 10000 });
  await page.reload();
  await page.waitForFunction(() => window.WINMAP && WINMAP.pkgs().length > 0, null, { timeout: 20000 });
  const t0 = Date.now();
  await page.evaluate(() => { WINMAP.view('win'); WINMAP.hosp('Mắt Nghệ An'); });
  await page.waitForFunction(() => /Mã/.test((document.getElementById('crmx') || {}).textContent || ''), null, { timeout: 1300 }).catch(() => {});   // máy chủ giả trả sau 1,5 giây ⇒ có trước đó = bản lưu trên máy
  const cx = await page.evaluate(() => (document.getElementById('crmx') || {}).textContent || ''), dt = Date.now() - t0;
  ok((/Mã/.test(cx) && !/Đang đọc CRM/.test(cx)) || !!process.env.THROTTLE, 'mở lại app ⇒ khối CRM của bệnh viện hiện ngay từ bộ nhớ máy (' + dt + ' ms, đọc lại ở nền)');
  ok(!errs.length, 'không lỗi JS (máy chủ chậm)' + (errs.length ? ': ' + errs.join(' | ') : ''));
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
  await page.evaluate(f => { WINMAP.act._S.per = 'fy' + f; WINMAP.view('act'); }, (() => { const d = new Date(); return (d.getMonth() >= 8 ? d.getFullYear() + 1 : d.getFullYear()) - 1959; })());
  await page.waitForFunction(() => WINMAP.act._S.loaded && document.querySelector('#sb .scb'), null, { timeout: 10000 });
  const vr = await page.$$eval('#sb .scb thead th[data-sc-pic]', l => l.map(x => x.textContent.trim()));
  ok(vr.length === 1 && /Viet Ha/.test(vr[0]) && /Kết quả của Viet Ha/.test(await page.$eval('#sb', e => e.textContent)), 'Viet Ha ⇒ Hoạt động chỉ có số của Viet Ha ("Kết quả của Viet Ha")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 's2_vietha_hoatdong.png') });
  const cnt = a => db.calls.filter(x => x === a).length;
  ok(cnt('winMap') === 2 && cnt('kqttMap') === 1 && cnt('fuList') === 1 && cnt('fuVisits') === 1 && cnt('fuFcList') === 1 && await page.evaluate(() => Object.keys(window.__PRE || {}).length === 0),
    `tải sớm dữ liệu ngay khi mở trang (index.html) và app dùng lại — mỗi lệnh gọi máy chủ đúng 1 lần (winMap ${cnt('winMap')} · kqttMap ${cnt('kqttMap')} · fuList ${cnt('fuList')} · fuVisits ${cnt('fuVisits')} · fuFcList ${cnt('fuFcList')})`);
  ok(!errs.length, 'không lỗi JS (Viet Ha)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 800 } }, { as: 'Khang', mail: 'mmh.saigon1' }));
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => WINMAP.scope.pic() === 'Khang' && WINMAP.scope.locked() && document.querySelector('.prov[data-i="16"]').classList.contains('out') && !document.querySelector('.prov[data-i="21"]').classList.contains('out')),
    'Khang đăng nhập ⇒ khoá địa bàn Quảng Nam (cũ) → miền Nam (Nghệ An ngoài, Quảng Ngãi trong)');
  await page.waitForFunction(() => WINMAP.act._S.loaded, null, { timeout: 10000 });
  ok(await page.evaluate(() => WINMAP.qs.search('mat sai gon ha noi', 8).some(f => /Sài Gòn.*Hà Nội/i.test(f.name) && f.ni === 0)),
    'Khang tìm được khách CRM của chính mình nằm ngoài địa bàn chia theo tỉnh (Mắt Sài Gòn - Hà Nội), tên chuẩn khớp được danh mục');
  await page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('mmh_tk')).exp > Date.now() + 20 * 864e5; } catch (e) { return false; } }, null, { timeout: 10000 });
  ok(db.renews >= 1 && await page.evaluate(() => JSON.parse(localStorage.getItem('mmh_tk')).user.pic === 'Khang'), 'phiên còn < 25 ngày ⇒ tự gia hạn 30 ngày (giữ đúng người đăng nhập)');
  ok(!errs.length, 'không lỗi JS (Khang)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();
  /* ── trình duyệt đăng nhập nhiều tài khoản Google: thẻ <script> tới Apps Script hỏng ⇒ vẫn đăng nhập được (fetch không cookie) ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 800 } }, { scriptFail: true, gate: true }));
  await page.waitForSelector('#gate #lg-email');
  await page.fill('#lg-email', 'mmh.product@manimedicalhanoi.com');
  await page.click('[data-lg="send"]');
  await page.waitForSelector('#lg-code', { timeout: 10000 });
  await page.fill('#lg-code', '123456');
  await page.click('#gate form[data-lgf="verify"] button[type=submit]');
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

  /* ── 2 người nhập cùng 1 gói từ 2 máy: máy chủ báo trùng (DUP) ⇒ bảng xử lý "Gộp vào gói có sẵn" (không dùng hộp confirm) ── */
  ({ ctx, page, errs, db } = await boot(b, { viewport: { width: 1280, height: 800 } }, { dupCheck: true }));
  await page.evaluate(() => WINMAP.view('fu')); await page.waitForFunction(() => WINMAP.fu._S.loaded);
  const fnm = await page.evaluate(() => WINMAP.fac().find(f => /Mắt Nghệ An/.test(f.name)).name);
  db.fu.push(['2026-11-10 09:00:00', 'FU261110-OTHER', 1, 'Khang', 'mmh.saigon1', '', fnm, 'Nghệ An', '', 'Gói dao 2027 (máy khác)', '', 'Dao', 'MSL15 × 100', 100, 0, 2, mock.ST[2], '', 'Nhập từ máy khác', '[{"code":"MSL15","qty":100,"kind":"dao"}]', 'rid-other', 'Tender Map', '', 'Viet Ha']);
  await page.evaluate(() => WINMAP.fu.open({ f: WINMAP.fac().find(f => /Mắt Nghệ An/.test(f.name)) }));
  await page.waitForSelector('[data-ln="code"][data-i="0"]');
  await page.fill('[data-ln="code"][data-i="0"]', 'MSL28SH'); await page.fill('[data-ln="qty"][data-i="0"]', '80'); await page.fill('#fm-note', 'Gặp khoa, chờ báo giá');
  await page.click('[data-fm="save"]');
  await page.waitForFunction(() => { const b = document.getElementById('obx'); return b && !b.hidden && /chưa lưu được/.test(b.textContent); }, null, { timeout: 10000 });
  await page.click('#obx');
  ok(await page.$eval('#obp', e => /đã có gói đang theo dõi/.test(e.textContent) && !!e.querySelector('[data-ob="merge"]') && !!e.querySelector('[data-ob="force"]')), 'máy chủ báo trùng (2 máy cùng nhập) ⇒ bảng xử lý: Gộp vào gói có sẵn · Vẫn tạo gói mới · Bỏ');
  await page.screenshot({ path: path.join(OUT, 'd5c_trung_may_chu.png') });
  await page.click('#obp [data-ob="merge"]');
  await page.waitForFunction(() => document.getElementById('obx').hidden, null, { timeout: 10000 });
  const mg = db.fu.filter(r => r[1] === 'FU261110-OTHER');
  ok(db.dups === 1 && mg.length === 2 && mg[1][2] === 2 && mg[1][18] === 'Gặp khoa, chờ báo giá', 'Gộp vào gói có sẵn ⇒ lưu thành lần cập nhật 2 của gói đó, không tạo gói trùng');
  ok(!errs.length, 'không lỗi JS (chống trùng)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await ctx.close();

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
