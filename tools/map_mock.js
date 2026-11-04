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
const ST = ['', 'Giới thiệu sản phẩm', 'Lên danh mục', 'Chốt cấu hình', 'Ra báo giá', 'Ra HSMT', 'Đang chấm thầu', 'Đã trúng thầu', 'Đã trượt thầu', 'Huỷ / dừng theo dõi'];
const COLS = ['at','id','rev','pic','mail','fid','hosp','prov','addr','pkg','tbmt','ptype','itemsTxt','qty','value','stage','stageName','due','note','items','rid','src','ll'];
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
    ['', 'BV Mới Toanh', 'Hospital', 'Đồng Nai', 'Miền Nam', 'Khang', '', null, null, '', '']];
  const pics = ['Viet Ha', 'Khang'], acts = ['Visiting', 'Telephone', 'Presentation'], sts = ['Completed', 'Plan', 'Cancel'], tasks = ['Customer visit', 'Other'];
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
  rows.sort((x, y) => x[0] < y[0] ? -1 : 1);
  return { ok: true, v: '1.0', from: '2025-09-01', to: '2027-02-04', today: '2026-11-04', accCols: ['code', 'name', 'type', 'province', 'area', 'pic', 'address', 'gps', 'loc', 'std', 'kind'], acc, pics, acts, sts, tasks,
    cols: ['d', 'pic', 'acc', 'act', 'st', 'lat', 'lng', 'photo', 'task'], rows };
}
async function install(page, opt = {}) {
  seed = 7;
  const db = { fu: [], locs: [], vis: visitsFake(), saves: 0, failSave: opt.failSave || 0, hv: nppRows('HUNGVI'), ic: nppRows('ICARE'), tk: 'mock.tk.' + 'x'.repeat(20), calls: [] };
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
  await page.route(/script\.google\.com/, async route => {
    const req = route.request(), url = new URL(req.url());
    if (req.resourceType && req.resourceType() === 'script' && opt.scriptFail) return route.fulfill({ status: 404, body: '' });
    let p = Object.fromEntries(url.searchParams.entries());
    if (req.method() === 'POST') { try { p = Object.assign(p, JSON.parse(req.postData() || '{}')); } catch (e) {} }
    const a = p.action || ''; db.calls.push(a);
    if (url.pathname.includes(HV) || url.pathname.includes(IC)) {
      const npp = url.pathname.includes(HV) ? 'HUNGVI' : 'ICARE';
      if (a === 'winMap') return reply(route, url, { ok: true, v: '1.0', npp, sheet: 'Tender', exported: '2026-11-04 08:00', rows: npp === 'HUNGVI' ? db.hv : db.ic });
      if (a === 'kqttMap') return opt.noKqtt ? reply(route, url, { ok: false, error: 'Unknown action' }) : reply(route, url, db.kqtt);
      return reply(route, url, { ok: true, rows: [] });
    }
    if (url.pathname.includes(HUB)) {
      if (a === 'rhAuthStart') return reply(route, url, /@(manimedicalhanoi\.com|mani\.inc)$/.test(p.email || '') ? { ok: true, gap: 45 } : { ok: false, error: 'Email không có trong danh sách.' });
      if (a === 'rhAuthVerify') return reply(route, url, p.code === '123456' ? { ok: true, token: db.tk, exp: Date.now() + 30 * 864e5, user: { pic: 'Viet Ha', email: p.email, level: 'pic' } } : { ok: false, error: 'Mã chưa đúng.' });
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
          prod: 'Dao Slit', plan: 'Giới thiệu MSL28SH', res: 'Gặp trưởng khoa, demo dao Slit 2.8 mm', st: db.vis.sts[rw[4]], fb: 'Hài lòng độ sắc', next: 'Gửi báo giá', stop: '', photo: rw[7] ? 'https://drive.google.com/file/d/x/view' : '', gps: rw[5] ? rw[5] + ',' + rw[6] : '', addr: '' })) }); }
      if (a === 'fuLocSave') { db.locs.push(p); const ai = db.vis.acc.findIndex(x => x[0] === p.code);
        const loc = p.op === 'clear' ? null : p.op === 'name' ? ['', '', '', '', '', 'Viet Ha', '', p.std] : [+p.lat || '', +p.lng || '', p.fid || '', p.fname || '', p.src || 'tay', 'Viet Ha', '2026-11-04 10:00', ''];
        if (ai >= 0) { db.vis.acc[ai][8] = loc; if (p.op === 'name') db.vis.acc[ai][9] = p.std; }
        return reply(route, url, { ok: true, code: p.code, loc }); }
      if (a === 'fuList') return reply(route, url, { ok: true, v: '1.0', me: { pic: 'Viet Ha', local: 'vietha', level: 'pic', admin: false }, stages: ST, cols: COLS, rows: db.fu });
      if (a === 'fuSave') {
        if (db.failSave > 0) { db.failSave--; return route.abort('failed'); }
        db.saves++;
        const dup = db.fu.find(r => r[20] === p.rid); if (dup) return reply(route, url, { ok: true, dup: true, rec: dup, cols: COLS });
        let id = p.case, rev = 1;
        if (id) { const ex = db.fu.filter(r => r[1] === id); if (!ex.length) return reply(route, url, { ok: false, error: 'Không tìm thấy gói ' + id }); rev = ex.length + 1; }
        else id = 'FU261104-' + String(1000 + db.fu.length);
        const items = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
        const d = new Date(Date.now() + 7 * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
        const rec = [d, id, rev, 'Viet Ha', 'vietha', p.fid || '', p.hosp, p.prov, p.addr || '', p.pkg || '', p.tbmt || '', p.ptype || '', items.map(x => x.code + ' × ' + x.qty).join('; '),
          items.reduce((s, x) => s + (+x.qty || 0), 0), +p.value || 0, +p.stage, ST[+p.stage], p.due || '', p.note || '', JSON.stringify(items), p.rid, p.src || '', p.ll || ''];
        db.fu.push(rec); return reply(route, url, { ok: true, rec, cols: COLS });
      }
      return reply(route, url, { ok: true });
    }
    return reply(route, url, { ok: false, error: 'mock: không rõ backend' });
  });
  return { db };
}
module.exports = { install, COLS, ST };
