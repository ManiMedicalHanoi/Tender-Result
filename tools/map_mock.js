/* Backend giả lập cho Tender Map (map/) — dùng với Playwright: await mock.install(page[, opt]).
   · NPP Hùng Vĩ / iCare: ?action=winMap ⇒ dòng giả (dao + chỉ khâu), vài số TBMT trùng KQTT để thử bỏ trùng
   · KQTT toàn quốc: ?action=kqttMap ⇒ dữ liệu giả, hoặc file JSON thật của kqttMap (opt.kqttJson / env KQTT_JSON — KHÔNG đưa vào repo)
   · CRM Surgical: fuList / fuSave (sheet FOLLOW UP TENDER, ghi nối tiếp, cần tk) · fuCrm (địa bàn CRM của cơ sở) · Training Hub: rhAuthStart / rhAuthVerify (mã đúng 123456)
   opt: { kqttJson, failSave:n (n lần fuSave đầu lỗi mạng), lag:ms, noKqtt:true (máy chủ chưa có kqttMap), xlsxJs (hoặc env XLSX_JS = xlsx.full.min.js cho nút Xuất Excel), authErr (fu* luôn trả AUTH với câu này) }  ⇒ trả { db } để kiểm tra. */
const fs = require('fs');
const HV = 'AKfycbyL5FRVXl0Zr35ndE1PGJMGXzHOYzHjdsyQK7vHwIYhqe5owjSg3o1QtH-i8qGNBKJ-';
const IC = 'AKfycbx8xuGaBOVgLxb8JtaH25t1pcisacigDecTMLKOVaBucuDWZ7hw2W_W4IngA1nSODg4';
const CRM = 'AKfycbxxckrqwkfhE0fszm1XVdpYyEHU_PCKQWMKE_2wBnMTgoJCZ-1nRZ_fhOCPXXsVfEE';
const HUB = 'AKfycbwsX4cQEoH4LNlmcNfe8qWIM9K6EiDEXy7PjhP9bHY2citL6xHn5L1unsAlQJHyL9EP';
const ST = ['', 'Chưa tiếp cận', 'Đã giới thiệu tới chuyên môn', 'Đang xây cấu hình', 'Đã gửi báo giá', 'Đang dự thầu', '', 'Đã trúng thầu', 'Trượt thầu', 'Tạm dừng theo dõi', 'Không tham dự',
  'Giới thiệu', 'Demo', 'Đề xuất từ chuyên môn', 'Ký hợp đồng mua sắm', 'Sử dụng hàng', '', '', 'Không thành công', 'Dừng theo dõi'];   // như backend MMH_TenderFU v1.9
/* Follow up by Account (backend MMH_FcAccount.gs) — dòng dự báo giả lập, giá NPP giả lập */
const FA_COLS = ['id','caseId','kenh','grp','pic','npp','hosp','prov','tbmt','now','kind','type','code','qty','dur','start','end','price','n','qtyFy','valFy','inFc','stage','prog','cfg','brand','crit','chance','note','due','others','src','man','at','by','fid','months'];
/* giá GIẢ để kiểm thử — bảng giá MANI → NPP thật là tài liệu nội bộ, không đưa vào repo công khai này */
const FA_PRICE = { MSL28SH:[100000,'dao'], MST15MK:[50000,'dao'], MCU26:[90000,'dao'], MSL28:[96000,'dao'], '1406':[80000,'chi'], AZ35WS:[40000,'ghim'] };
const FA_M0 = 2026 * 12 + 8;
function faMi(s) { const m = /^(\d{1,2})\/(\d{4})$/.exec(s || ''); return m ? +m[2] * 12 + (+m[1] - 1) : 0; }
function faMs(i) { return i ? String(i % 12 + 1).padStart(2, '0') + '/' + Math.floor(i / 12) : ''; }
function faCalc(o) {
  const s = faMi(o.start), d = +o.dur || 12, per = (+o.qty || 0) / d, a = Math.max(s, FA_M0), b = Math.min(s ? s + d - 1 : 0, FA_M0 + 11), n = s && b >= a ? b - a + 1 : 0, pr = (FA_PRICE[o.code] || [0])[0];
  o.price = pr; o.n = n; o.qtyFy = Math.round(per * n); o.valFy = Math.round(per * n * pr); o.end = s ? faMs(s + d - 1) : '';
  o.months = Array.from({ length: 12 }, (_, i) => (s && FA_M0 + i >= a && FA_M0 + i <= b) ? Math.round(per * 10) / 10 : 0);
  o.inFc = ['Trượt thầu', 'Không tham dự', 'Tạm dừng theo dõi'].includes(o.stage) ? 'Không — Giai đoạn: ' + o.stage : !(+o.qty > 0) ? 'Không — Chưa có SL' : !s ? 'Không — Chưa có tháng bắt đầu' : 'Có';
  return o;
}
function faRow(o) { return FA_COLS.map(c => o[c] == null ? '' : o[c]); }
function faSeedRows() {
  return [
    { id: 'E|IB2500484361|MSL28SH', caseId: 'IB2500484361', kenh: 'Thầu', grp: '① Existing', pic: 'Viet Ha', npp: 'Hùng Vĩ', hosp: 'Bệnh viện Mắt Nghệ An', prov: 'Nghệ An', tbmt: 'IB2500484361', now: 'Mani trúng 2.000 Slit knife\n(Hiệu lực thầu: đến hết T11/2027)', kind: 'dao', type: 'MSL', code: 'MSL28SH', qty: 2000, dur: 24, start: '12/2025', stage: 'Đã trúng thầu', src: 'Hùng Vĩ' },
    { id: 'D|IB2500484361|MST15MK', caseId: 'D|IB2500484361', kenh: 'Thầu', grp: '② Duy trì', pic: 'Viet Ha', npp: 'Hùng Vĩ', hosp: 'Bệnh viện Mắt Nghệ An', prov: 'Nghệ An', tbmt: 'IB2500484361', kind: 'dao', type: 'MST', code: 'MST15MK', qty: 1200, dur: 12, start: '03/2027', stage: '', src: 'Hùng Vĩ' },
    { id: 'M|IB2500484361|MCU', caseId: 'M|IB2500484361', kenh: 'Thầu', grp: '③ Mở mới', pic: 'Viet Ha', npp: 'Hùng Vĩ', hosp: 'Bệnh viện Mắt Nghệ An', prov: 'Nghệ An', tbmt: 'IB2500484361', kind: 'dao', type: 'MCU', code: 'MCU26', qty: 0, dur: 12, start: '01/2027', others: 200, stage: '', src: 'KQTT' },
    { id: 'M|IB2600063266|MSL', caseId: 'M|IB2600063266', kenh: 'Thầu', grp: '③ Mở mới', pic: 'Khang', npp: 'I-Care', hosp: 'Bệnh viện Chợ Rẫy', prov: 'Hồ Chí Minh', tbmt: 'IB2600063266', kind: 'dao', type: 'MSL', code: 'MSL28', qty: 3650, dur: 12, start: '05/2027', others: 3650, stage: 'Đã giới thiệu tới chuyên môn', src: 'KQTT' },
    { id: 'E|IB2600070000|AZ35WS', caseId: 'IB2600070000', kenh: 'Thầu', grp: '① Existing', pic: 'Khang', npp: 'I-Care', hosp: 'Bệnh viện Chợ Rẫy', prov: 'Hồ Chí Minh', tbmt: 'IB2600070000', kind: 'ghim', type: 'GHIM', code: 'AZ35WS', qty: 600, dur: 12, start: '09/2026', stage: 'Đã trúng thầu', src: 'I-Care' },
    { id: 'E|IB2600080000|1406', caseId: 'IB2600080000', kenh: 'Thầu', grp: '① Existing', pic: 'Viet Ha', npp: 'Hùng Vĩ', hosp: 'Bệnh viện Bạch Mai', prov: 'Hà Nội', tbmt: 'IB2600080000', kind: 'chi', type: 'CHI', code: '1406', qty: 1200, dur: 12, start: '10/2026', stage: 'Đã trúng thầu', src: 'Hùng Vĩ' },
    { id: 'S|261109-AB12|MSL28SH', caseId: '261109-AB12', kenh: 'Tư nhân', grp: 'Tư nhân', pic: 'Khang', npp: '', hosp: 'Phòng khám Mắt Sài Gòn', prov: 'Hồ Chí Minh', tbmt: '', kind: 'dao', type: 'MSL', code: 'MSL28SH', qty: 600, dur: 12, start: '10/2026', stage: 'Demo', src: 'Sales (Tender Map)' }
  ].map(faCalc);
}
const COLS = ['at','id','rev','pic','mail','fid','hosp','prov','addr','pkg','tbmt','ptype','itemsTxt','qty','value','stage','stageName','due','note','items','rid','src','ll','own'];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];

function nppRows(npp) {
  const H = npp === 'HUNGVI'
    ? [['Bệnh viện Mắt Nghệ An', 'Nghệ An'], ['Bệnh viện Mắt Trung ương', 'Hà Nội'], ['Bệnh viện Mắt Hà Nội', 'Hà Nội'], ['Bệnh viện Đa khoa tỉnh Thanh Hóa', 'Thanh Hóa'],
       ['Bệnh viện Mắt Hà Tĩnh', 'Hà Tĩnh'], ['Trung tâm Y tế huyện Anh Sơn', 'Nghệ An'], ['Bệnh viện Mắt tỉnh Bắc Ninh', 'Bắc Ninh'], ['Bệnh viện Đa khoa tỉnh Phú Thọ', 'Phú Thọ']]
    : [['Bệnh viện Mắt Thành phố Hồ Chí Minh', 'TP. HCM'], ['Bệnh viện Chợ Rẫy', 'Hồ Chí Minh'], ['Bệnh viện Mắt tỉnh Tiền Giang', 'Tiền Giang'], ['Bệnh viện Đa khoa Trung ương Cần Thơ', 'Cần Thơ'],
       ['Bệnh viện Mắt Đồng Tháp', 'Đồng Tháp'], ['Bệnh viện Đa khoa tỉnh Bình Dương', 'Bình Dương']];
  const codes = ['MSL28SH', 'MSL22', 'MST15', 'MCU26', '1406', '1430', '2808', '3305'];
  const rows = []; let k = 0;
  for (let y = 2023; y <= 2026; y++) H.forEach(([h, c], i) => {
    if (rnd() < 0.35) return;
    const m = 1 + Math.floor(rnd() * 12); if (y === 2026 && m > 10) return;
    const tb = 'IB' + String(y).slice(2) + String(9000000 + (++k) * 137 + i).padStart(8, '0');
    const res = rnd() < 0.75 ? 'Win' : pick(['Fail', 'Pending']);
    const n = 1 + Math.floor(rnd() * 3);
    for (let j = 0; j < n; j++) {
      const code = pick(codes), q = (1 + Math.floor(rnd() * 20)) * 50, p = code[0] === 'M' ? 240000 + Math.floor(rnd() * 20) * 1000 : 95000;
      rows.push({ row: rows.length + 8, tbmt: tb + '-0' + (j + 1), hospital: h, city: c, address: '', tender: 'Gói vật tư nhãn khoa ' + y, project: '', company: '', signed: '',
        month: y * 100 + m, pcode: code, qty: q, price: p, unit: code[0] === 'M' ? 'Cái' : 'Sợi', result: res, wonProduct: code, wonQty: q, wonPrice: p, total: 0,
        approve: res === 'Win' ? `${y}-${String(m).padStart(2, '0')}-15` : '', dur: 12, note: '', link: '' });
    }
  });
  return rows;
}
function kqttFake() {
  const buyers = [['Bệnh viện Mắt Nghệ An', 'Nghệ An', 'Thành phố Vinh,Tỉnh Nghệ An'], ['Bệnh viện Bạch Mai', 'Hà Nội', 'Quận Đống Đa,Thành phố Hà Nội'],
    ['Bệnh viện Đa khoa tỉnh Quảng Ninh', 'Quảng Ninh', 'Thành phố Hạ Long,Tỉnh Quảng Ninh'], ['Bệnh viện Mắt Đà Nẵng', 'Đà Nẵng', 'Quận Hải Châu,Thành phố Đà Nẵng'],
    ['Bệnh viện Mắt tỉnh Gia Lai', 'Gia Lai', 'Thành phố Pleiku,Tỉnh Gia Lai'], ['Trung tâm Y tế khu vực Cao Lộc', 'Lạng Sơn', 'Phường Kỳ Lừa,Tỉnh Lạng Sơn']];
  const mf = [['Mani', 'MSL28SH', 'Slit knife'], ['Surgistar', 'SS-2820', 'Slit knife'], ['Oasis Medical', 'OM-15', 'Stab knife'], ['Aurolab', 'AU-CR', 'Cresent knife'], ['KAI', 'A-15F', 'Stab knife']];
  const rows = [];
  for (let i = 0; i < 40; i++) {
    const b = pick(buyers), m = pick(mf), y = 2023 + Math.floor(rnd() * 4), mo = 1 + Math.floor(rnd() * 12);
    if (y * 100 + mo > 202605) continue;
    rows.push(['IB' + String(y).slice(2) + String(5000000 + i * 911).padStart(8, '0'), b[0], 'Dao mổ mắt', m[1], m[1], m[0], 'Japan', 'Cái', (1 + Math.floor(rnd() * 10)) * 100,
      60000 + Math.floor(rnd() * 200) * 1000, 'Đấu thầu rộng rãi', `${y}-${String(mo).padStart(2, '0')}-20`, '1/QĐ', `${y}-${String(mo).padStart(2, '0')}-18`, 1.5, b[2], y * 100 + mo,
      'North', 'Mid', b[1], m[2], 12, '', i + 3]);
  }
  return { ok: true, v: '1.0', sheet: 'Data xử lý', from: 202209, exported: '2026-11-04 08:00',
    cols: ['tbmt','buyer','pname','pcode','brand','mfr','country','unit','qty','price','method','pub','decNo','dec','bidders','loc','month','region','tier','prov','ktype','dur','exp','row'], rows, n: rows.length };
}

/* như backend VisitMap v1.1: mỗi khách thêm last (≤ 3 lượt gần nhất đến hôm nay) + ph (ảnh của lượt gần nhất có ảnh); mã ảnh giả 33 ký tự */
const RES = ['Gặp trưởng khoa, giới thiệu dao Slit 2.8 mm (MSL28SH) và chỉ Nylon 10-0', 'Demo dao MST15 cho 2 bác sĩ phaco, phản hồi tốt về độ sắc', 'Gọi điện xác nhận danh mục vật tư 2027', 'Gửi catalogue + báo giá, hẹn tuần sau gặp phòng VTYT'];
function photoId(ai, k) { return ('PH' + ai + 'x' + k + 'abcdefghijklmnopqrstuvwxyz0123456789').slice(0, 33); }
function addLast(d) {
  d.accCols = d.accCols.concat(['last', 'ph']);
  const today = d.today || '2026-11-05', by = {};
  d.rows.forEach((r, k) => { if (r[0] <= today) (by[r[2]] = by[r[2]] || []).push([r, k]); });
  d.acc.forEach((a, ai) => {
    while (a.length < 11) a.push(a.length === 8 ? null : '');
    const L = (by[ai] || []).slice().sort((x, y) => (x[0][0] < y[0][0] ? 1 : -1));
    a[11] = L.length ? L.slice(0, 3).map(([r, k]) => [r[0], d.pics[r[1]], d.acts[r[3]], d.sts[r[4]], RES[k % RES.length], k % 2 ? 'Quan tâm giá thầu' : '', k % 3 ? 'Gửi báo giá trước 20/11' : '', r[7] ? [photoId(ai, k), photoId(ai, k + 1)] : []]) : null;
    const P = L.find(([r]) => r[7]);
    a[12] = P ? [P[0][0], [photoId(ai, P[1]), photoId(ai, P[1] + 1)]] : null;
  });
  return d;
}
/* CRM Surgical ▸ fuVisits: khách hàng (công lập + tư nhân) + lượt việc khách hàng của Viet Ha / Khang */
function visitsFake() {
  const acc = [
    ['S-001', 'Bệnh viện Mắt Nghệ An', 'Hospital', 'Nghệ An', 'Miền Trung', 'Viet Ha', 'Thành phố Vinh, Nghệ An', [18.6715, 105.6806, 4, 4], null, '', 'cl'],
    ['S-002', 'BV Bạch Mai', 'Hospital', 'Hà Nội', 'Miền Bắc', 'Viet Ha', '78 Giải Phóng, Đống Đa, Hà Nội', null, null, '', 'cl'],
    ['S-003', 'Bệnh viện Chợ Rẫy', 'Hospital', 'Hồ Chí Minh', 'Miền Nam', 'Khang', '201B Nguyễn Chí Thanh, Quận 5', null, null, '', 'cl'],
    ['S-004', 'PK MẮT SÀI GÒN', '', 'Hồ Chí Minh', 'Miền Nam', 'Khang', 'Phường 7, Quận 3, Thành phố Hồ Chí Minh', null, null, '', 'tn'],
    ['S-005', 'Phòng khám Nhãn khoa Thanh Hà', '', 'Hà Nội', 'Miền Bắc', 'Viet Ha', 'Cầu Giấy, Hà Nội', [21.0301, 105.8012, 3, 3], null, '', 'tn'],
    ['S-006', 'Bệnh viện Mắt tỉnh Tiền Giang', 'Hospital', 'Tiền Giang', 'Miền Nam', 'Khang', 'Mỹ Tho, Tiền Giang', null, null, '', 'cl'],
    ['S-007', 'BV Quốc tế Đồng Nai', 'Hospital', 'Đồng Nai', 'Miền Nam', 'Khang', 'Biên Hòa, Đồng Nai', null, null, '', 'tn'],
    ['', 'BV Mới Toanh', 'Hospital', 'Đồng Nai', 'Miền Nam', 'Khang', '', null, null, '', ''],
    ['S-008', 'BỆNH VIỆN MẮT SÀI GÒN - HÀ NỘI ( CHI NHÁNH SỐ 1)', 'Hospital', 'Ha Noi', 'Miền Bắc', 'Khang', '', null, null, 'Bệnh viện Mắt Sài Gòn - Hà Nội (cơ sở 1)', 'tn'],   // khách của Khang nằm ngoài địa bàn chia theo tỉnh
    ['T-001', 'TEST Bệnh viện ảo', 'Hospital', 'Hà Nội', 'Miền Bắc', 'Test', 'Hà Nội', null, null, '', ''],   // như dữ liệu thật: khách TEST
    /* 09/11/2026: khách tư nhân tên gần giống bệnh viện công (Mắt Thanh Bình ≈ Mắt tỉnh Ninh Bình) — không được ghép / đổi loại cơ sở công lập */
    ['S-010', 'BỆNH VIỆN MẮT TỈNH NINH BÌNH', 'Hospital', 'Ninh Binh', 'Miền Bắc', 'Viet Ha', '', null, null, 'Bệnh viện Mắt tỉnh Ninh Bình', 'cl'],
    ['S-011', 'BỆNH VIỆN MẮT THANH BÌNH', '', 'Ninh Binh', 'Miền Bắc', 'Viet Ha', '', null, null, 'Bệnh viện Mắt Thanh Bình', 'tn']];
  const pics = ['Viet Ha', 'Khang', 'Nguyen Ha', 'Test', 'Giang'], acts = ['Visiting', 'Telephone', 'Presentation'], sts = ['Completed', 'Plan', 'Cancel'], tasks = ['Customer visit', 'Other'];
  const rows = []; let r = 11;
  const rnd2 = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 160; k++) {
    const ai = [0, 0, 1, 1, 2, 3, 3, 4, 5, 7][Math.floor(rnd2() * 10)], a = acc[ai];
    const y = 2025 + Math.floor(rnd2() * 2), m = 1 + Math.floor(rnd2() * 12), d = 1 + Math.floor(rnd2() * 27);
    if (y * 100 + m < 202509 || y * 100 + m > 202611) continue;
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, fut = iso > '2026-11-04';
    const act = rnd2() < 0.75 ? 0 : 1 + Math.floor(rnd2() * 2), st = fut ? 1 : (rnd2() < 0.9 ? 0 : 2), g = act === 0 && a[7];
    rows.push([iso, pics.indexOf(a[5]), ai, act, st, g ? a[7][0] : '', g ? a[7][1] : '', act === 0 && st === 0 ? 1 : 0, 0]);
  }
  /* như dữ liệu thật: CRM có cả lượt của quản lý / Admin / TEST ⇒ app chỉ tính Viet Ha, Khang */
  [['2026-10-06', 2, 1], ['2026-10-14', 2, 2], ['2026-09-22', 4, 0], ['2026-10-20', 3, 9], ['2026-10-21', 3, 2]].forEach(([iso, pi, ai]) => rows.push([iso, pi, ai, 0, 0, '', '', 0, 0]));
  rows.sort((x, y) => x[0] < y[0] ? -1 : 1);
  return { ok: true, v: '1.0', from: '2025-09-01', to: '2027-02-04', today: '2026-11-04', accCols: ['code', 'name', 'type', 'province', 'area', 'pic', 'address', 'gps', 'loc', 'std', 'kind'], acc, pics, acts, sts, tasks,
    cols: ['d', 'pic', 'acc', 'act', 'st', 'lat', 'lng', 'photo', 'task'], rows };
}
/* tên người dùng theo email (như RH_Users): Sales Surgical Viet Ha / Khang bị giới hạn địa bàn; người khác xem tất cả */
function picOf(email) {
  const l = String(email || '').split('@')[0];
  return { vietha: 'Viet Ha', 'mmh.saigon1': 'Khang', khang: 'Khang', 'mmh.product': 'Giang', 'tt.tuyen': 'Tuyen', 'nt.ha': 'Nguyen Ha' }[l] || 'Giang';
}
/* fuVisits từ danh sách khách thật (không địa chỉ / GPS — thử mức định vị theo tên + tỉnh), lượt viếng thăm giả 09/2025 → 11/2026 */
function visitsFromList(txt) {
  const acc = txt.split('\n').map(l => l.split('|')).filter(p => p.length >= 5 && p[0]).map(p => [p[0], p[1], p[2], p[3], '', p[4], '', null, null, '', '']);
  const pics = ['Viet Ha', 'Khang'], acts = ['Visiting', 'Telephone', 'Presentation'], sts = ['Completed', 'Plan', 'Cancel'], tasks = ['Customer visit', 'Other'];
  const rows = []; let r = 5; const rr = () => (r = (r * 16807) % 2147483647) / 2147483647;
  acc.forEach((a, ai) => { const n = Math.floor(rr() * rr() * 14); for (let k = 0; k < n; k++) {
    const y = 2025 + (rr() < 0.4 ? 0 : 1), m = y === 2025 ? 9 + Math.floor(rr() * 4) : 1 + Math.floor(rr() * 11), d = 1 + Math.floor(rr() * 27);
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, fut = iso > '2026-11-05', act = rr() < 0.75 ? 0 : 1 + Math.floor(rr() * 2);
    rows.push([iso, Math.max(0, pics.indexOf(a[5])), ai, act, fut ? 1 : (rr() < 0.9 ? 0 : 2), '', '', act === 0 ? 1 : 0, 0]); } });
  rows.sort((x, y) => x[0] < y[0] ? -1 : 1);
  return { ok: true, v: '1.0', from: '2025-09-01', today: '2026-11-05', accCols: ['code', 'name', 'type', 'province', 'area', 'pic', 'address', 'gps', 'loc', 'std', 'kind'], acc, pics, acts, sts, tasks,
    cols: ['d', 'pic', 'acc', 'act', 'st', 'lat', 'lng', 'photo', 'task'], rows };
}
async function install(page, opt = {}) {
  seed = 7;
  const db = { fu: [], locs: [], vis: addLast(visitsFake()), saves: 0, failSave: opt.failSave || 0, hv: nppRows('HUNGVI'), ic: nppRows('ICARE'), tk: 'mock.tk.' + 'x'.repeat(20), calls: [], fa: faSeedRows(), faSaves: [], pw: Object.assign({}, opt.pw || {}), me: opt.me || 'mmh.product' };
  /* dữ liệu thật để rà soát (KHÔNG đưa vào repo): bản xuất winMap của 2 NPP, danh sách khách CRM Surgical "mã|tên|loại|tỉnh|PIC" */
  const hvp = opt.hvJson || process.env.NPP_HV_JSON, icp = opt.icJson || process.env.NPP_IC_JSON, accp = opt.accTxt || process.env.CRM_ACC_TXT;
  if (hvp) db.hv = JSON.parse(fs.readFileSync(hvp, 'utf8')).rows;
  if (icp) db.ic = JSON.parse(fs.readFileSync(icp, 'utf8')).rows;
  if (accp) db.vis = addLast(visitsFromList(fs.readFileSync(accp, 'utf8')));
  const stdp = opt.stdJson || process.env.CRM_STD_JSON;            // bảng tên chuẩn VM_STD {mã: [tên, cl|tn|npp]} như backend trả
  if (accp && stdp) { const st = JSON.parse(fs.readFileSync(stdp, 'utf8')); db.vis.acc.forEach(a => { const v = st[a[0]]; if (v) { a[9] = v[0]; a[10] = v[1]; } }); }
  const kpath = opt.kqttJson || process.env.KQTT_JSON;
  db.kqtt = kpath ? JSON.parse(fs.readFileSync(kpath, 'utf8')) : kqttFake();
  // vài gói NPP trùng số TBMT với KQTT ⇒ app phải bỏ gói KQTT tương ứng
  const pk = [...new Set(db.hv.map(z => z.tbmt.replace(/-\d+$/, '')))].slice(0, 3), tbs = [...new Set(db.kqtt.rows.map(r => r[0]))].slice(0, 3);
  pk.forEach((b, i) => db.hv.filter(z => z.tbmt.replace(/-\d+$/, '') === b).forEach((z, j) => { z.tbmt = tbs[i] + '-0' + (j + 1); }));
  db.dupTb = tbs;
  const reply = (route, url, obj) => {
    const cb = url.searchParams.get('callback'), body = JSON.stringify(obj);
    const go = () => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: cb ? 'application/javascript' : 'application/json', body: cb ? `${cb}(${body});` : body });
    return opt.lag ? new Promise(r => setTimeout(() => r(go()), opt.lag)) : go();
  };
  // thư viện Excel (cdnjs bị chặn khi kiểm thử) ⇒ file cục bộ XLSX_JS nếu có
  const xjs = opt.xlsxJs || process.env.XLSX_JS;
  await page.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\//, route => xjs && fs.existsSync(xjs)
    ? route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(xjs, 'utf8') }) : route.abort('failed'));
  db.thumbs = 0;
  await page.route(/drive\.google\.com\/thumbnail/, route => { db.thumbs++;
    const id = new URL(route.request().url()).searchParams.get('id') || '', h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},35%,72%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360},40%,42%)"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><rect x="40" y="70" width="320" height="170" rx="6" fill="#fff" fill-opacity=".85"/><g fill="hsl(${h},30%,55%)">${[0, 1, 2, 3].map(i => `<rect x="${64 + i * 76}" y="96" width="48" height="40" rx="3"/><rect x="${64 + i * 76}" y="160" width="48" height="40" rx="3"/>`).join('')}</g><text x="200" y="272" font-family="Arial" font-size="18" fill="#fff" text-anchor="middle">Ảnh đi địa bàn (minh hoạ)</text></svg>` });
  });
  await page.route(/script\.google\.com/, async route => {
    const req = route.request(), url = new URL(req.url());
    if (req.resourceType && req.resourceType() === 'script' && opt.scriptFail) return route.fulfill({ status: 404, body: '' });
    let p = Object.fromEntries(url.searchParams.entries());
    if (req.method() === 'POST') { const body = req.postData() || '';
      try { p = Object.assign(p, JSON.parse(body || '{}')); } catch (e) { p = Object.assign(p, Object.fromEntries(new URLSearchParams(body).entries())); } }
    const a = p.action || ''; db.calls.push(a);
    if (url.pathname.includes(HV) || url.pathname.includes(IC)) {
      const npp = url.pathname.includes(HV) ? 'HUNGVI' : 'ICARE';
      if (a === 'winMap') return reply(route, url, { ok: true, v: '1.0', npp, sheet: 'Tender', exported: '2026-11-04 08:00', rows: npp === 'HUNGVI' ? db.hv : db.ic });
      if (a === 'kqttMap') return opt.noKqtt ? reply(route, url, { ok: false, error: 'Unknown action' }) : reply(route, url, db.kqtt);
      return reply(route, url, { ok: true, rows: [] });
    }
    if (url.pathname.includes(HUB)) {
      if (a === 'rhAuthStart') return reply(route, url, /@(manimedicalhanoi\.com|mani\.inc)$/.test(p.email || '') ? { ok: true, gap: 45 } : { ok: false, error: 'Email không có trong danh sách.' });
      if (a === 'rhAuthVerify') return reply(route, url, p.code === '123456' ? { ok: true, token: db.tk, exp: Date.now() + 30 * 864e5, user: { pic: picOf(p.email), email: p.email, level: 'pic' }, hasPw: !!db.pw[(p.email || '').split('@')[0]] } : { ok: false, error: 'Mã chưa đúng.' });
      /* mật khẩu (11/11/2026): POST form — db.pw[phần trước @] = mật khẩu; mật khẩu KHÔNG được nằm trên URL */
      if (/^rhAuthPw/.test(a) && url.searchParams.get('pw')) db.pwInUrl = (db.pwInUrl || 0) + 1;
      if (a === 'rhAuthPw') { db.pwCalls = (db.pwCalls || 0) + 1; const l = (p.email || '').split('@')[0];
        if (!db.pw[l]) return reply(route, url, { ok: false, code: 'NOPW', error: 'Email này chưa đặt mật khẩu. Bấm "Nhận mã qua email" để đăng nhập, sau đó đặt mật khẩu cho lần sau.' });
        return reply(route, url, db.pw[l] === p.pw ? { ok: true, token: db.tk, exp: Date.now() + 30 * 864e5, user: { pic: picOf(p.email), email: p.email, level: 'pic' }, hasPw: true } : { ok: false, code: 'PW', left: 4, error: 'Mật khẩu chưa đúng. Còn 4 lần thử (hoặc bấm "Nhận mã qua email").' }); }
      if (a === 'rhAuthPwSet') { if (p.tk !== db.tk) return reply(route, url, { ok: false, code: 'AUTH', error: 'Phiên đăng nhập đã hết hạn.' });
        if (String(p.pw || '').length < 8) return reply(route, url, { ok: false, code: 'WEAK', error: 'Mật khẩu cần ít nhất 8 ký tự.' });
        db.pw[db.me || 'mmh.product'] = p.pw; db.pwSets = (db.pwSets || 0) + 1; return reply(route, url, { ok: true, hasPw: true, message: 'Đã lưu mật khẩu — lần sau đăng nhập bằng email + mật khẩu.' }); }
      if (a === 'rhAuthRenew') { db.renews = (db.renews || 0) + 1; return reply(route, url, p.tk === db.tk ? { ok: true, token: db.tk, exp: Date.now() + 30 * 864e5, user: { pic: 'Giang', email: 'mmh.product@manimedicalhanoi.com' }, hasPw: !!db.pw['mmh.product'] } : { ok: false, code: 'AUTH', error: 'Phiên đăng nhập đã hết hạn.' }); }
      return reply(route, url, { ok: true });
    }
    if (url.pathname.includes(CRM)) {
      if (/^fu/.test(a) && p.tk !== db.tk) return reply(route, url, { ok: false, code: 'AUTH', error: 'Cần đăng nhập bằng email công ty.' });
      if (/^fu/.test(a) && opt.authErr) return reply(route, url, { ok: false, code: 'AUTH', error: opt.authErr });
      if (a === 'fuCrm') return reply(route, url, /Mắt Nghệ An/.test(p.hosp || '') ? { ok: true, v: '1.3', alt: 0,
        acc: { code: 'S-NA-001', name: 'Bệnh viện Mắt Nghệ An', type: 'Hospital', province: 'Nghệ An', area: 'Miền Trung', pic: 'Viet Ha' },
        visits: { n12: 6, done12: 5, total: 14, last: [{ d: '2026-10-28', pic: 'Viet Ha', act: 'Visiting', st: 'Completed', res: 'Gặp trưởng khoa, giới thiệu MSL-SH', fb: 'Quan tâm giá' }] },
        cbc: [{ name: 'BS. Trần Văn A', title: 'Trưởng khoa', spec: 'Phaco', role: 'Decision maker', inf: 'High' }], orders: { n: 2, amount: 48000000, last: '2026-09-12', prods: [['Dao Slit', 200]] } }
        : { ok: true, v: '1.3', acc: null });
      if (a === 'fuVisits') return reply(route, url, db.vis);
      if (a === 'fuVisitLog') { const ai = db.vis.acc.findIndex(x => x[0] && x[0] === p.code), L = db.vis.rows.filter(rw => rw[2] === ai).reverse();
        return reply(route, url, { ok: true, v: '1.0', acc: ai >= 0 ? { code: p.code, name: db.vis.acc[ai][1] } : null, rows: L.map(rw => ({ no: '1', d: rw[0], f: rw[0], pic: db.vis.pics[rw[1]], task: 'Customer visit', act: db.vis.acts[rw[3]], proc: 'Follow up',
          prod: 'Dao Slit', plan: 'Giới thiệu MSL28SH', res: 'Gặp trưởng khoa, demo dao Slit 2.8 mm', st: db.vis.sts[rw[4]], fb: 'Hài lòng độ sắc', next: 'Gửi báo giá', stop: '', photo: rw[7] ? 'https://drive.google.com/file/d/' + photoId(ai, db.vis.rows.indexOf(rw)) + '/view' : '', gps: rw[5] ? rw[5] + ',' + rw[6] : '', addr: '' })) }); }
      if (a === 'fuLocSave') { db.locs.push(p); const ai = db.vis.acc.findIndex(x => x[0] === p.code);
        const loc = p.op === 'clear' ? null : p.op === 'name' ? ['', '', '', '', '', 'Viet Ha', '', p.std] : [+p.lat || '', +p.lng || '', p.fid || '', p.fname || '', p.src || 'tay', 'Viet Ha', '2026-11-04 10:00', ''];
        if (ai >= 0) { db.vis.acc[ai][8] = loc; if (p.op === 'name') db.vis.acc[ai][9] = p.std; }
        return reply(route, url, { ok: true, code: p.code, loc }); }
      if (a === 'fuNews') {                                    // sổ gói mới (backend MMH_FcNews.gs) — dữ liệu giả
        const iso = d => { const x = new Date(Date.now() - d * 864e5); return x.toISOString().slice(0, 10) + ' ' + x.toISOString().slice(11, 16); };
        const rows = opt.noNews ? [] : [
          [iso(0.1), 'KQ', 'Win', '', '', 'Bệnh viện Mắt Nghệ An', 'Nghệ An', 'IB2600888002', '11/2026', 0, 'Aurolab AU-CR × 300', 'Viet Ha'],
          [iso(0.2), 'HV', 'Win', 'Pending', iso(0.2), 'Bệnh viện Đa khoa tỉnh Thái Bình', 'Hưng Yên', 'IB2600999001', '10/2026', 1, 'MSL28SH × 500', 'Viet Ha'],
          [iso(1.2), 'KQ', 'Win', '', '', 'Bệnh viện Chợ Rẫy', 'Hồ Chí Minh', 'IB2600777003', '10/2026', 1, 'MANI MST15 × 200', 'Khang'],
          [iso(3), 'IC', 'Pending', '', '', 'Bệnh viện Đa khoa Khánh Hòa', 'Khánh Hòa', 'IB2600666004', '11/2026', 0, 'MST15MK × 2034', 'Khang']];
        return reply(route, url, { ok: true, v: '1.0', days: 45, base: '2026-11-11', last: iso(0.05), cols: ['seen','src','res','prev','chg','hosp','prov','tbmt','mon','mani','sum','pic'], rows });
      }
      if (a === 'fuFcList') return reply(route, url, { ok: true, v: '1.0', fy: { fy: 68, m0: FA_M0, from: '09/2026', to: '08/2027' }, cols: FA_COLS, rows: db.fa.map(faRow), prices: FA_PRICE,
        stages: ST.slice(1, 6).concat(['Đã trúng thầu', 'Trượt thầu', 'Không tham dự', 'Tạm dừng theo dõi']), priv: ['Giới thiệu', 'Demo', 'Đề xuất từ chuyên môn', 'Ký hợp đồng mua sắm', 'Sử dụng hàng', 'Không thành công', 'Dừng theo dõi'],
        lists: { prog: ['Chưa có thông tin', 'Xây dựng danh mục', 'Yêu cầu báo giá', 'Đã phê duyệt kế hoạch', 'Đã ra HSMT', 'Đang chấm thầu', 'Đã có KQLCNT'], cfg: ['Mở', 'Khóa'], crit: ['Giá thấp', 'Chất lượng cao'], chance: ['Cao', 'Trung bình', 'Thấp'], brand: ['All', 'Mani', 'Feather'] },
        sync: { at: '2026-11-09 08:00', err: '', n: db.fa.length } });
      if (a === 'fuFcSave') {
        db.faSaves.push(p);
        let o = p.id ? db.fa.find(r => r.id === p.id) : null;
        if (p.id && !o) return reply(route, url, { ok: false, error: 'Không tìm thấy dòng ' + p.id });
        if (!o) { o = { id: 'S|261109-' + (1000 + db.fa.length) + '|' + String(p.code || '').toUpperCase(), caseId: '', kenh: p.kenh === 'Tư nhân' ? 'Tư nhân' : 'Thầu', grp: p.kenh === 'Tư nhân' ? 'Tư nhân' : (p.grp || '③ Mở mới'), pic: 'Viet Ha', npp: '', hosp: p.hosp, prov: p.prov, tbmt: '', kind: 'dao', type: '', code: '', qty: 0, dur: 12, start: '', stage: '', src: 'Sales (Tender Map)', fid: p.fid || '' }; db.fa.push(o); }
        const lock = String(o.grp).charAt(0) === '①';
        if (!lock) { if (p.code != null) o.code = String(p.code).toUpperCase(); if (p.qty != null) o.qty = +p.qty || 0; if (p.dur != null) o.dur = +p.dur || 12; if (p.start != null) o.start = p.start ? faMs(+p.start.slice(0, 4) * 12 + (+p.start.slice(5, 7) - 1)) : ''; }
        ['stage', 'prog', 'cfg', 'brand', 'crit', 'chance', 'note', 'due'].forEach(k => { if (p[k] != null) o[k] = p[k]; });
        o.kind = /^\d/.test(o.code) ? 'chi' : /^(AZ|DS)/.test(o.code) ? 'ghim' : 'dao'; faCalc(o);
        return reply(route, url, { ok: true, id: o.id, isNew: !p.id });
      }
      if (a === 'fuFcDel') { const i = db.fa.findIndex(r => r.id === p.id); if (i < 0 || !/^S\|/.test(p.id)) return reply(route, url, { ok: false, error: 'Chỉ xoá được dòng do Sales thêm.' }); db.fa.splice(i, 1); return reply(route, url, { ok: true, id: p.id }); }
      if (a === 'fuList') return reply(route, url, { ok: true, v: '1.0', me: { pic: 'Viet Ha', local: 'vietha', level: 'pic', admin: false }, stages: ST, cols: COLS, rows: db.fu });
      if (a === 'fuSave') {
        if (db.failSave > 0) { db.failSave--; return route.abort('failed'); }
        db.saves++;
        const dup = db.fu.find(r => r[20] === p.rid); if (dup) return reply(route, url, { ok: true, dup: true, rec: dup, cols: COLS });
        let id = p.case, rev = 1;
        if (id) { const ex = db.fu.filter(r => r[1] === id); if (!ex.length) return reply(route, url, { ok: false, error: 'Không tìm thấy gói ' + id }); rev = ex.length + 1; }
        else id = 'FU261104-' + String(1000 + db.fu.length);
        /* như backend v1.10 (fuDupOf_): gói mới ở cơ sở đã có gói đang theo dõi (giai đoạn 1–6 / 11–14) cùng tên cơ sở ⇒ DUP, trừ khi force=1 */
        if (!p.case && String(p.force || '') !== '1' && opt.dupCheck) { const last = {}; db.fu.forEach(r => { if (!last[r[1]] || r[2] >= last[r[1]][2]) last[r[1]] = r; });
          const hit = Object.values(last).find(r => r[6] === p.hosp && ((+r[15] >= 1 && +r[15] <= 6) || (+r[15] >= 11 && +r[15] <= 14)));
          if (hit) { db.dups = (db.dups || 0) + 1; return reply(route, url, { ok: false, code: 'DUP', case: hit[1], error: 'Cơ sở này đã có gói đang theo dõi: ' + (hit[9] || hit[1]) + ' · ' + hit[16] + '. Gộp cập nhật vào gói đó, hoặc chọn "Vẫn tạo gói mới".' }); } }
        const KINDS = ['dao', 'chi', 'ghim', 'hook', 'forcep'];   // như backend MMH_TenderFU v1.8 (fuKind_)
        const items = (typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || [])).map(x => Object.assign({}, x, { kind: KINDS.includes(String(x.kind || '').toLowerCase()) ? String(x.kind).toLowerCase() : /^chi/i.test(x.kind || '') ? 'chi' : 'dao' }));
        const d = new Date(Date.now() + 7 * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
        const rec = [d, id, rev, 'Viet Ha', 'vietha', p.fid || '', p.hosp, p.prov, p.addr || '', p.pkg || '', p.tbmt || '', p.ptype || '', items.map(x => x.code + ' × ' + x.qty).join('; '),
          items.reduce((s, x) => s + (+x.qty || 0), 0), +p.value || 0, +p.stage, ST[+p.stage], p.due || '', p.note || '', JSON.stringify(items), p.rid, p.src || '', p.ll || '', p.own || ''];
        db.fu.push(rec); return reply(route, url, { ok: true, rec, cols: COLS });
      }
      return reply(route, url, { ok: true });
    }
    return reply(route, url, { ok: false, error: 'mock: không rõ backend' });
  });
  return { db };
}
module.exports = { install, COLS, ST, picOf };
