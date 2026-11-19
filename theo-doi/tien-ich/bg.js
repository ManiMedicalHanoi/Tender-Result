/* MMH Tải hồ sơ thầu — phần chạy nền (service worker).
   Mỗi phút (hoặc ngay khi app Theo dõi gói thầu báo có gói mới): hỏi máy chủ tender-info (phiên email của người dùng, lấy từ app)
   ⇒ còn gói Chờ tải ⇒ mở muasamcong trong 1 CỬA SỔ THU NHỎ của trình duyệt ⇒ làm đúng các bước của bot GitHub (tools/msc/bot.mjs):
   tìm số ⇒ trang chi tiết ⇒ Thông tin chung, Tải TBMT, file đính kèm, HSMT, Biên bản mở thầu, Kết quả (Xuất Excel)
   ⇒ gửi file lên Drive (botFile) ⇒ botDone. VNeGP Agent đang chạy ⇒ file "cần Agent" tải luôn (trang gọi Agent), gói cũ còn thiếu cũng tải nốt. */
const VER = chrome.runtime.getManifest().version;
const API_DEF = 'https://script.google.com/macros/s/AKfycbwv3R7EACqtt3pQZfMWRQFilC4E0W7td8Z8xWxQW6P7UckqFjWFJSFxcOWBZknHplhQuQ/exec';
const HOME = 'https://muasamcong.mof.gov.vn/';
const MAX_JOBS = 4, MAX_MIN = 5;          // mỗi lượt: ≤ 4 gói hoặc 5 phút rồi đóng cửa sổ (lượt sau mở lại)
const MIME = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip: 'application/zip', rar: 'application/vnd.rar' };

/* ───────── trạng thái (popup + app đọc) ───────── */
let ST = { v: VER, busy: false, msg: 'Đang khởi động', agent: false, n: 0, ag: 0, me: '', last: null, err: '', job: '', log: [] };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toLocaleString('vi-VN', { hour12: false });
function say(m) { ST.log.unshift(now().slice(0, 8) + ' ' + m); ST.log = ST.log.slice(0, 40); console.log('[MMH]', m); save(); }
function set(o) { Object.assign(ST, o); save(); }
function save() { chrome.storage.local.set({ st: ST }).catch(() => {}); chrome.action.setBadgeText({ text: ST.busy ? '…' : ST.err ? '!' : ST.n ? String(Math.min(ST.n, 99)) : '' }).catch(() => {}); chrome.action.setBadgeBackgroundColor({ color: ST.err ? '#B3261E' : '#2C4A5E' }).catch(() => {}); }
const cfg = () => chrome.storage.local.get(['tk', 'pic', 'api', 'off', 'dev', 'show']);

/* ───────── máy chủ ───────── */
async function api(action, body, tries) {
  const c = await cfg();
  if (!c.tk) throw new Error('NOTK');
  const payload = JSON.stringify(Object.assign({ action, tk: c.tk, v: VER, dev: c.dev || '' }, body || {}));
  let last;
  for (let i = 0; i < (tries || 3); i++) {
    try {
      const r = await fetch(c.api || API_DEF, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload, redirect: 'follow', credentials: 'omit' });
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { throw new Error('máy chủ trả về không phải JSON: ' + t.slice(0, 120)); }
    } catch (e) { last = e; await sleep(2500 * (i + 1)); }
  }
  return { ok: false, error: 'Không gọi được máy chủ (' + (last && last.message) + ')' };
}

/* Agent của muasamcong có đang chạy trên máy không (cổng 1234 trả lời bất kỳ mã nào) */
async function agentAlive() {
  for (const h of ['http://127.0.0.1:1234/', 'http://localhost:1234/']) {
    try { const ac = new AbortController(); setTimeout(() => ac.abort(), 2500); await fetch(h, { signal: ac.signal, credentials: 'omit' }); return true; } catch (e) {}
  }
  return false;
}

/* ───────── cửa sổ tải ───────── */
let WIN = null, TAB = null, KEEP = null;
function tabDone(tabId, ms) {
  return new Promise(res => {
    let fin = false;
    const end = ok => { if (fin) return; fin = true; chrome.tabs.onUpdated.removeListener(fn); clearTimeout(to); res(ok); };
    const fn = (id, ch, tab) => { if (id === tabId && ch.status === 'complete') end(true); };
    const to = setTimeout(() => end(false), ms || 90000);
    chrome.tabs.onUpdated.addListener(fn);
    chrome.tabs.get(tabId).then(t => { if (t.status === 'complete' && t.url && t.url.startsWith('https://muasamcong')) end(true); }).catch(() => end(false));
  });
}
async function P(fn, ...args) {   // gọi window.__mmh.<fn>(...args) trong trang
  const [r] = await chrome.scripting.executeScript({ target: { tabId: TAB }, world: 'MAIN', func: (f, a) => {
    const W = window.__mmh; if (!W) return { __nohook: 1 };
    return Promise.resolve(W[f].apply(W, a)).then(x => x === undefined ? null : x, e => ({ __err: String(e && e.message || e) }));
  }, args: [fn, args] });
  const v = r && r.result;
  if (v && v.__nohook) throw new Error('Trang muasamcong chưa sẵn sàng');
  if (v && v.__err) throw new Error(v.__err);
  return v;
}
async function nav(url) {
  await chrome.tabs.update(TAB, { url });
  await sleep(400);
  const ok = await tabDone(TAB, 90000);
  if (!ok) say('Trang tải chậm: ' + url.slice(0, 80));
  for (let i = 0; i < 20; i++) { try { await P('info'); return; } catch (e) { await sleep(500); } }
  throw new Error('Không mở được trang muasamcong');
}
async function openWin() {
  if (TAB) { try { await chrome.tabs.get(TAB); return; } catch (e) { TAB = WIN = null; } }
  const c = await cfg();
  const w = await chrome.windows.create(Object.assign({ url: HOME, focused: false }, c.show ? { width: 1280, height: 860, state: 'normal' } : { state: 'minimized' }));
  WIN = w.id; TAB = w.tabs[0].id;
  chrome.storage.session.set({ win: WIN }).catch(() => {});
  await tabDone(TAB, 90000);
  await chrome.scripting.executeScript({ target: { tabId: TAB }, world: 'MAIN', func: () => { sessionStorage.setItem('mmhbot', '1'); } });
  await nav(HOME);
  KEEP = setInterval(() => chrome.runtime.getPlatformInfo(), 20000);   // giữ phần chạy nền không bị tắt giữa chừng
}
async function closeWin() {
  if (KEEP) { clearInterval(KEEP); KEEP = null; }
  if (WIN) { try { await chrome.windows.remove(WIN); } catch (e) {} }
  WIN = TAB = null;
}
chrome.windows.onRemoved.addListener(id => { if (id === WIN) { WIN = TAB = null; } });

/* tải xuống thật lọt ra ngoài (trang chuyển hướng tải) trong lúc đang làm ⇒ huỷ, lấy lại bằng trang */
const LEAK = [];
chrome.downloads.onCreated.addListener(d => {
  if (!TAB || !ST.busy) return;
  const u = d.finalUrl || d.url || '', ref = d.referrer || '';
  if (!/muasamcong\.mof\.gov\.vn/.test(u + ' ' + ref)) return;
  chrome.downloads.cancel(d.id).then(() => chrome.downloads.erase({ id: d.id })).catch(() => {});
  LEAK.push({ url: u, name: (d.filename || '').split(/[\\/]/).pop(), t: Date.now() });
});
async function leak(t0) {
  const L = LEAK.filter(x => x.t >= t0).pop(); if (!L) return null;
  const r = await P('fetchB64', L.url).catch(() => null);
  return r && r.b64 ? { b64: r.b64, name: L.name, type: r.type } : null;
}

/* ───────── tên + loại tài liệu (giống bot.mjs) ───────── */
const safe = (s, n = 150) => String(s || '').replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').trim().slice(0, n) || 'file';
const extOf = n => ((String(n).match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toLowerCase();
const vnTime = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; };
function docName(no, label, ext, used) { let base = safe(no + ' - ' + (label || 'Tài liệu'), 140), nm = base + (ext ? '.' + ext : ''), k = 2; while (used.has(nm)) nm = base + ' (' + (k++) + ')' + (ext ? '.' + ext : ''); used.add(nm); return nm; }
function docType(sec, label, fname) {
  const t = (label + ' ' + fname).toLowerCase();
  if (sec === 'kq') {
    if (/quyết định|quyet dinh|qđ|qd/.test(t)) return 'Quyết định phê duyệt KQLCNT';
    if (/báo cáo|bao cao|đánh giá|danh gia/.test(t)) return 'Báo cáo đánh giá tổng hợp E-HSDT';
    if (/nhà thầu|nha.?thau/.test(t)) return 'Danh sách nhà thầu';
    if (/hàng hóa|hàng hoá|hang.?hoa/.test(t)) return 'Danh sách hàng hóa';
  }
  if (sec === 'tbmt' && /quyết định|quyet dinh/.test(t)) return 'Quyết định phê duyệt HSMT';
  if (sec === 'kh' && /quyết định|quyet dinh/.test(t)) return 'Quyết định phê duyệt KHLCNT';
  if (sec === 'mo') return /nhà thầu|nha.?thau/.test(t) ? 'Nhà thầu tham dự' : 'Biên bản mở thầu';
  return label || (sec === 'kq' ? 'Tài liệu kết quả' : sec === 'kh' ? 'Tài liệu KHLCNT' : 'Tài liệu TBMT');
}
function wants(c, ...keys) { const W = (c.job.info || {}).want; return !W || !W.length || keys.some(k => W.indexOf(k) >= 0); }
function keyOf(sec, type, prefix) {
  if (/^Danh sách nhà thầu/.test(type)) return ['nt'];
  if (/^Danh sách hàng hóa/.test(type)) return ['hh'];
  if (/^(Quyết định|Báo cáo)/.test(type)) return sec === 'kh' ? ['qd', 'kh'] : ['qd'];
  if (prefix === 'HSMT') return ['hsmt'];
  if (sec === 'mo') return ['mo'];
  return [sec === 'kq' ? 'kq' : sec];
}
function pkgRow(r) {
  const o = {}, dur = [];
  r.forEach(v => {
    if (!o['Giá gói thầu'] && /^\d{1,3}(\.\d{3}){2,}$/.test(v)) o['Giá gói thầu'] = v;
    else if (!o['Hình thức LCNT'] && /^(Đấu thầu|Chào hàng|Chỉ định|Mua sắm trực tiếp|Tự thực hiện|Đàm phán|Lựa chọn nhà thầu trong trường hợp đặc biệt)/i.test(v)) o['Hình thức LCNT'] = v;
    else if (!o['Phương thức LCNT'] && /^(Một|Hai) giai đoạn|túi hồ sơ/i.test(v)) o['Phương thức LCNT'] = v;
    else if (!o['Loại hợp đồng'] && /^(Trọn gói|Đơn giá|Theo thời gian|Theo chi phí|Theo kết quả|Hỗn hợp)/i.test(v)) o['Loại hợp đồng'] = v;
    else if (/^\d+([.,]\d+)?\s*(tháng|ngày|năm|tuần)$/i.test(v)) dur.push(v);
    else if (!o['Chi tiết nguồn vốn'] && /(nguồn|vốn|ngân sách|quỹ|thu sự nghiệp)/i.test(v) && v.length > 12) o['Chi tiết nguồn vốn'] = v;
  });
  if (dur.length) o['Thời gian thực hiện gói thầu'] = dur[dur.length - 1];
  return o;
}
const KNOWN = ['Mã TBMT', 'Ngày đăng tải', 'Mã KHLCNT', 'Tên KHLCNT', 'Phân loại KHLCNT', 'Tên dự toán mua sắm', 'Tên gói thầu', 'Bên mời thầu', 'Chủ đầu tư', 'Chi tiết nguồn vốn',
  'Lĩnh vực', 'Hình thức lựa chọn nhà thầu', 'Loại hợp đồng', 'Trong nước/ Quốc tế', 'Phương thức lựa chọn nhà thầu', 'Thời gian thực hiện hợp đồng', 'Thời gian thực hiện gói thầu',
  'Gói thầu có nhiều phần/lô', 'Số lượng phần (lô)', 'Hình thức dự thầu', 'Địa điểm thực hiện gói thầu', 'Thời điểm đóng thầu', 'Thời điểm mở thầu', 'Hiệu lực hồ sơ dự thầu',
  'Số tiền bảo đảm dự thầu', 'Số quyết định phê duyệt', 'Ngày phê duyệt', 'Cơ quan ban hành quyết định', 'Số lượng gói thầu', 'Dự toán mua sắm', 'Giá gói thầu', 'Giá dự toán',
  'Thời gian đăng tải', 'Trạng thái đăng tải', 'Tổng số nhà thầu tham dự', 'Thời điểm hoàn thành mở thầu', 'Tên chủ đầu tư', 'Hình thức LCNT', 'Giá trúng thầu', 'Nhà thầu trúng thầu', 'Tên nhà thầu trúng thầu', 'Ngày phê duyệt kết quả'];

/* ───────── 1 gói ───────── */
async function addFile(c, f, sec, type, extDef) {
  const ext = extOf(f.name) || extDef || (/pdf/.test(f.type || '') ? 'pdf' : /sheet|excel/.test(f.type || '') ? 'xlsx' : '');
  const name = docName(c.no, type, ext, c.used);
  c.files.push({ name, b64: f.b64, sec, type, mime: MIME[ext] || f.type || 'application/octet-stream' });
  say('  ⬇ ' + name + ' (' + Math.round(f.b64.length * 0.75 / 1024) + ' KB)');
}
async function attachments(c, sec, prefix) {
  const list = await P('attachList') || [];
  for (const it of list) {
    const orig = safe(it.orig);
    if (!orig || c.seenF.has(orig)) continue; c.seenF.add(orig);
    const label = it.label || orig.replace(/\.[a-z0-9]+$/i, '');
    const type = (prefix ? prefix + ' - ' : '') + docType(sec, label, orig);
    if (!wants(c, ...keyOf(sec, type, prefix))) continue;
    const t0 = Date.now(), r = await P('attachClick', it.i) || {};
    if (r.file && r.file.b64) { await addFile(c, Object.assign({ name: orig }, r.file), sec, type); continue; }
    const lk = await leak(t0); if (lk) { await addFile(c, Object.assign({ name: orig }, lk), sec, type); continue; }
    if (c.agent && r.fid) {
      const a = await P('agent', r.fid).catch(e => ({ err: e.message }));
      if (a && a.b64) { await addFile(c, { name: orig, b64: a.b64, type: a.type }, sec, type); continue; }
      say('  ! Agent: ' + ((a && a.err) || 'không có dữ liệu') + ' — ' + orig);
    }
    c.agentFiles.push({ name: orig, fileId: r.fid || '', tab: sec, type });
    c.docs.push({ sec, docType: type, name: orig, agent: true });
    say('  · ' + type + ' (' + orig + ') — cần Agent');
  }
}
async function excels(c, sec, fixType) {
  if (sec === 'mo' ? !wants(c, 'mo') : !wants(c, 'nt', 'hh')) return;
  const n = await P('excelCount') || 0;
  for (let k = 0; k < n; k++) {
    let r = await P('excelClick', k, 45000) || {};
    if (!r.b64) { const lk = await leak(r.t0 || Date.now() - 46000); if (lk) r = Object.assign(r, lk); }
    if (!r.b64) { await P('closePopups'); await sleep(3000); r = await P('excelClick', k, 75000) || {}; }
    if (!r.b64) { say('  · Xuất Excel #' + (k + 1) + ': không ra file'); c.miss = (c.miss || 0) + 1; continue; }
    const type = fixType || docType(sec, r.label || '', r.name || '');
    if (!wants(c, ...keyOf(sec, type, ''))) continue;
    await addFile(c, r, sec, type, 'xlsx');
  }
}
async function pagePdf(c, sec, type, src) {
  if (!wants(c, sec)) return true;
  const t0 = Date.now();
  let r = await P('pdfButton', src, 60000) || {};
  if (r.none) return false;
  if (!r.b64) { const lk = await leak(t0); if (lk) r = lk; }
  if (!r.b64 || r.b64.length < 2000 || !r.b64.startsWith('JVBER')) { say('  · "' + (r.label || type) + '": chưa lấy được file PDF'); return false; }
  await addFile(c, { name: 'x.pdf', b64: r.b64 }, sec, type);
  return true;
}
async function ensureValues(url, re, tabs) {
  for (let i = 0; i < 2; i++) {
    for (const t of tabs) await P('clickTab', t);
    if (await P('waitValues', re, 40000)) return true;
    if (i) break;
    say('  · trang chậm — tải lại');
    await nav(url); await sleep(3000); await P('closePopups');
  }
  return false;
}

/* gõ số ⇒ chờ kết quả tìm kiếm (trang có thể chuyển trang) ⇒ { hit, url } | { none } */
const Pq = (fn, ...a) => P(fn, ...a).catch(() => null);    // lệnh bị cắt vì trang đang chuyển ⇒ null, hỏi lại
async function search(no, plan) {
  await nav(HOME);
  const pr = await P('prepSearch', plan);
  if (!pr || pr.err) throw new Error((pr && pr.err) || 'Trang chủ muasamcong chưa sẵn sàng');
  for (let i = 0; i < 3; i++) {
    await sleep(1500 + i * 2500);
    for (let k = 0; k < 2; k++) {
      const t = await Pq('typeSearch', no, k === 1);
      if (!t || !t.ok) { if (k === 0 && t && t.err) throw new Error(t.err); continue; }
      const T = Date.now();
      while (Date.now() - T < (k ? 15000 : 20000)) {
        await sleep(700);
        const r = await Pq('srchFind', no);
        if (r && (r.none || r.url)) return r;
        if (r && r.wait && Date.now() - T > 14000) break;
      }
    }
    say('  · tìm ' + no + ' chưa ra (' + JSON.stringify(await Pq('srchDbg')).slice(0, 300) + ')');
    await nav(HOME); await Pq('prepSearch', plan);
  }
  throw new Error('Trang tìm kiếm muasamcong không phản hồi (thử 3 lần)');
}

async function doJob(job, agent) {
  const t0 = Date.now(), bare = job.no.toUpperCase().replace(/-\d+$/, ''), plan = /^PL/.test(bare);
  set({ job: job.no + ' · ' + String(job.investor || job.name || '').slice(0, 60) });
  say('▶ ' + job.no + ' · ' + String(job.investor || '').slice(0, 50));
  const s = await search(bare, plan);
  if (s.none || !s.url) { await api('botDone', { hit: job.key, status: 'error', note: 'Không tìm thấy số ' + job.no + ' trên muasamcong' }); return 0; }
  const hit = s.hit || {}, one = v => Array.isArray(v) ? v[0] : (v || ''), loc = (hit.locations || [])[0] || {};
  const pk = { url: s.url, plan, investor: one(hit.investorName) || one(hit.procuringEntityName) || '', bidName: plan ? (hit.name || one(hit.bidName)) : one(hit.bidName),
    planNo: one(hit.planNo), planName: one(hit.planName) || (plan ? hit.name || '' : ''), prov: loc.provName || loc.provinceName || '', posted: vnTime(one(hit.publicDate)), close: vnTime(hit.bidCloseDate), price: hit.investTotal || '' };
  await nav(pk.url);
  const c = { job, no: bare, files: [], docs: [], agentFiles: [], used: new Set(), seenF: new Set(), agent };
  const info = { url: pk.url, investor: pk.investor, bidName: pk.bidName, planNo: pk.planNo, planName: pk.planName, prov: pk.prov, posted: pk.posted, fields: {}, kqFields: {}, by: 'ext' };
  if (plan) {
    if (!(await ensureValues(pk.url, 'PL\\d{8}', []))) say('  · KHLCNT chưa hiện số liệu');
    await P('closePopups');
    info.fields = await P('readFields', KNOWN) || {};
    const F = info.fields, PK = F._pkgs || [], P0 = pkgRow(PK[0] || []); delete F._pkgs;
    info.pkgs = PK.length;
    const put = (k, v) => { if (v && !F[k]) F[k] = v; };
    put('Giá gói thầu', F['Dự toán mua sắm'] || pk.price); put('Ngày đăng tải', pk.posted || F['Thời gian đăng tải']);
    put('Chi tiết nguồn vốn', P0['Chi tiết nguồn vốn']); put('Hình thức lựa chọn nhà thầu', P0['Hình thức LCNT']); put('Phương thức lựa chọn nhà thầu', P0['Phương thức LCNT']);
    put('Loại hợp đồng', P0['Loại hợp đồng']); put('Thời gian thực hiện gói thầu', P0['Thời gian thực hiện gói thầu']);
    info.planNo = F['Mã KHLCNT'] || info.planNo || bare;
    info.planName = F['Tên KHLCNT'] || F['Tên dự toán mua sắm'] || F['Tên dự án'] || info.planName;
    await pagePdf(c, 'kh', 'Kế hoạch lựa chọn nhà thầu', '^Tải\\s*(KHLCNT|KH\\s*LCNT|kế hoạch)');
    await attachments(c, 'kh', '');
    await excels(c, 'kh');
  } else {
    if (!(await ensureValues(pk.url, 'IB\\d{8}', ['Thông báo mời thầu', 'Thông tin chung']))) say('  · Thông tin chung chưa hiện số TBMT');
    await sleep(800); await P('closePopups');
    info.fields = await P('readFields', KNOWN) || {}; delete info.fields._pkgs;
    const put = (k, v) => { if (v && !info.fields[k]) info.fields[k] = v; };
    put('Ngày đăng tải', pk.posted); put('Thời điểm đóng thầu', pk.close);
    if (!info.planNo) info.planNo = info.fields['Mã KHLCNT'] || '';
    await pagePdf(c, 'tbmt', 'Thông báo mời thầu', '^Tải\\s*(TBMT|thông báo)');
    await attachments(c, 'tbmt', '');
    if (wants(c, 'hsmt') && await P('clickTab', 'Hồ sơ mời thầu')) {
      if (!(await P('waitTdFile', 20000))) say('  · tab HSMT chưa hiện file');
      await attachments(c, 'tbmt', 'HSMT');
    }
    if (wants(c, 'mo') && await P('clickTab', 'Biên bản mở thầu')) {
      await P('waitText', 'Tổng số nhà thầu|Thông tin nhà thầu|Xuất Excel', 25000); await sleep(1200); await P('closePopups');
      info.moFields = await P('readFields', KNOWN) || {}; delete info.moFields._pkgs;
      const nT = parseInt(String(info.moFields['Tổng số nhà thầu tham dự'] || '').replace(/\D/g, ''), 10);
      if (!(await pagePdf(c, 'mo', 'Biên bản mở thầu', '^Tải\\s*(biên bản|BBMT)'))) {
        await attachments(c, 'mo', '');
        if (!c.agentFiles.some(a => a.tab === 'mo') && !c.files.some(f => f.sec === 'mo' && /\.pdf$/i.test(f.name))) {
          const b = await P('bbmt') || {};
          if (b.file && b.file.b64) await addFile(c, Object.assign({ name: 'x.pdf' }, b.file), 'mo', 'Biên bản mở thầu');
          else if (b.fid) {
            const a = agent ? await P('agent', b.fid).catch(e => ({ err: e.message })) : null;
            if (a && a.b64) await addFile(c, { name: 'x.pdf', b64: a.b64 }, 'mo', 'Biên bản mở thầu');
            else { c.agentFiles.push({ name: 'Biên bản mở thầu.pdf', fileId: b.fid, tab: 'mo', type: 'Biên bản mở thầu' }); c.docs.push({ sec: 'mo', docType: 'Biên bản mở thầu', name: 'Biên bản mở thầu.pdf', agent: true }); }
          }
        }
      }
      await excels(c, 'mo', (nT ? nT + ' ' : '') + 'Nhà thầu tham dự');
    }
    if (await P('clickTab', 'Kết quả lựa chọn nhà thầu')) {
      await P('waitText', 'Xuất Excel|Quyết định phê duyệt|Nhà thầu trúng', 25000); await sleep(1200); await P('closePopups');
      info.kqFields = await P('readFields', KNOWN) || {}; delete info.kqFields._pkgs;
      await pagePdf(c, 'kq', 'Kết quả lựa chọn nhà thầu', '^Tải\\s*(KQLCNT|KQ\\s*LCNT|kết quả)');
      await attachments(c, 'kq', '');
      await excels(c, 'kq');
    }
  }
  let up = 0;
  for (const f of c.files) {
    const r = await api('botFile', { hit: job.key, name: f.name, kind: f.type, sec: f.sec, planNo: info.planNo, investor: pk.investor, bidName: pk.bidName, mime: f.mime, b64: f.b64 });
    if (r.ok) { up++; c.docs.push({ sec: f.sec, docType: f.type, name: r.name || f.name, url: r.url }); }
    else say('  ! gửi file lỗi: ' + (r.error || ''));
  }
  info.agentFiles = c.agentFiles;
  const ag = c.agentFiles.length;
  await api('botDone', { hit: job.key, status: up ? 'done' : 'nofile', note: up + ' file' + (ag ? ' · ' + ag + ' file cần Agent' : '') + (c.miss ? ' · ' + c.miss + ' file Excel chưa xuất được (bấm Tải lại)' : '') + ' · tiện ích trình duyệt', info: JSON.stringify(info), docs: JSON.stringify(c.docs) });
  say('✓ ' + job.no + ': ' + up + ' file' + (ag ? ' + ' + ag + ' cần Agent' : '') + ' · ' + Math.round((Date.now() - t0) / 1000) + ' giây');
  return up;
}

/* file "cần Agent" của các gói đã tải trước (bot GitHub ghi tên + mã file) */
async function agentBacklog(T0) {
  const d = await api('botAgentList', { agent: 1 });
  if (!d.ok || !(d.items || []).length) return 0;
  let n = 0;
  for (const it of d.items) {
    for (const f of it.files || []) {
      if (Date.now() - T0 > MAX_MIN * 60e3) return n;
      set({ job: it.no + ' · ' + f.name });
      const a = await P('agent', f.fileId).catch(e => ({ err: e.message }));
      if (a && a.b64) {
        const mime = MIME[extOf(f.name)] || a.type || 'application/octet-stream';
        const r = await api('botAgentPut', { hit: it.hit, orig: f.name, name: f.name, mime, b64: a.b64 });
        if (r.ok) { n++; say('  ⬇ ' + it.no + ' · ' + f.name + ' (Agent)'); } else say('  ! ' + (r.error || 'máy chủ chưa nhận'));
      } else {
        say('  ! Agent: ' + ((a && a.err) || 'không có dữ liệu') + ' — ' + f.name);
        await api('botAgentPut', { hit: it.hit, orig: f.name, err: (a && a.err) || 'không có dữ liệu' });
      }
    }
  }
  return n;
}

/* ───────── 1 lượt ───────── */
let RUN = null;
function tick(why) { if (!RUN) RUN = round(why).finally(() => { RUN = null; }); return RUN; }
async function round(why) {
  const c = await cfg();
  if (c.off) { set({ msg: 'Đang tạm dừng', busy: false, err: '' }); return; }
  if (!c.tk) { set({ msg: 'Chưa đăng nhập — mở app Theo dõi gói thầu 1 lần để tiện ích nhận đăng nhập', err: 'login', busy: false }); return; }
  const agent = await agentAlive();
  let h;
  try { h = await api('botHello', { agent: agent ? 1 : 0, job: ST.job || '' }, 2); } catch (e) { return; }
  if (!h.ok) {
    const auth = h.code === 'AUTH';
    if (auth) await chrome.storage.local.remove('tk');
    set({ msg: auth ? 'Phiên đăng nhập hết hạn — mở app Theo dõi gói thầu để đăng nhập lại' : (h.error || 'Máy chủ lỗi'), err: auth ? 'login' : 'server', busy: false, agent });
    return;
  }
  set({ agent, n: h.n || 0, ag: h.ag || 0, me: h.me || c.pic || '', err: '' });
  const jobs = h.n || 0, backlog = agent ? (h.ag || 0) : 0;
  if (!jobs && !backlog) { set({ msg: 'Không có gói chờ tải', busy: false, job: '' }); return; }
  set({ busy: true, msg: 'Đang tải hồ sơ…' });
  const T0 = Date.now();
  let done = 0, upAg = 0;
  try {
    await openWin();
    for (let k = 0; k < MAX_JOBS && Date.now() - T0 < MAX_MIN * 60e3; k++) {
      const q = await api('botNext', { n: 1 });
      if (!q.ok || !q.jobs || !q.jobs.length) break;
      const job = q.jobs[0];
      try { await doJob(job, agent); done++; }
      catch (e) {
        say('✗ ' + job.no + ': ' + e.message);
        await api('botDone', { hit: job.key, status: 'error', note: ('Tiện ích: ' + e.message).slice(0, 300) });
        if (/chưa sẵn sàng|Không mở được/.test(e.message)) { await closeWin(); await openWin(); }
      }
    }
    if (agent && Date.now() - T0 < MAX_MIN * 60e3) { await nav(HOME); upAg = await agentBacklog(T0); }
  } catch (e) { say('✗ ' + e.message); set({ err: 'run' }); }
  finally { await closeWin(); }
  set({ busy: false, job: '', msg: 'Lượt xong: ' + done + ' gói' + (upAg ? ' · ' + upAg + ' file Agent' : ''), last: { at: now(), done, upAg } });
  if (done || upAg) setTimeout(() => tick('tiếp'), 3000);   // còn gói ⇒ lượt kế ngay
}

/* ───────── sự kiện ───────── */
chrome.runtime.onInstalled.addListener(() => { chrome.alarms.create('tick', { periodInMinutes: 1 }); tick('cài'); });
chrome.runtime.onStartup.addListener(() => { chrome.alarms.create('tick', { periodInMinutes: 1 }); tick('mở'); });
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'tick') tick('hẹn giờ'); });
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  (async () => {
    if (m.t === 'tk') {   // app gửi phiên đăng nhập
      const c = await cfg();
      if (m.tk && m.tk !== c.tk) { await chrome.storage.local.set({ tk: m.tk, pic: m.pic || '' }); if (ST.err === 'login') set({ err: '', msg: 'Đã nhận đăng nhập' }); tick('đăng nhập'); }
      if (!m.tk && c.tk && m.out) await chrome.storage.local.remove('tk');
      reply(ST); return;
    }
    if (m.t === 'kick') { tick('app'); reply(ST); return; }
    if (m.t === 'state') { reply(ST); return; }
    if (m.t === 'set') { await chrome.storage.local.set(m.v || {}); if (m.v && m.v.off === false) tick('bật'); reply(ST); return; }
    reply(ST);
  })();
  return true;
});
chrome.alarms.get('tick').then(a => { if (!a) chrome.alarms.create('tick', { periodInMinutes: 1 }); });
/* phần chạy nền bị trình duyệt tắt giữa lượt ⇒ đóng cửa sổ tải còn sót */
chrome.storage.session.get('win').then(x => { if (x.win && !WIN) chrome.windows.remove(x.win).catch(() => {}); }).catch(() => {});
chrome.storage.local.get('st').then(x => { if (x.st) ST = Object.assign(x.st, { busy: false, v: VER }); save(); });
