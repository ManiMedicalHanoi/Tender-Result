/* MMH Tải hồ sơ thầu — chạy TRONG trang muasamcong (world MAIN, trước mọi script của trang).
   CHỈ bật ở cửa sổ tải của tiện ích (sessionStorage mmhbot = 1); trang muasamcong người dùng tự mở không bị đụng tới.
   - Bắt mã file (fileId) trang gửi tới VNeGP Agent (localhost:1234) — trang không tự lưu file vào máy, tiện ích tự lấy file từ Agent.
   - Bắt kết quả tìm kiếm (JSON), file trang tự dựng (Xuất Excel, Tải TBMT bằng pdfmake / blob) — không lưu vào thư mục Tải xuống.
   - Hàm tiện ích gọi qua window.__mmh (giống các bước của bot GitHub tools/msc/bot.mjs). */
(() => {
  let on = false;
  try { on = sessionStorage.getItem('mmhbot') === '1'; } catch (e) {}
  if (!on || window.__mmh) return;
  const W = window.__mmh = { v: 1, cap: [], srch: [], blobs: [], dl: [], pdf: null, pdfT: 0 };
  const oFetch = window.fetch;
  W.fetch = function () { return oFetch.apply(window, arguments); };
  const AG = /^https?:\/\/(localhost|127\.0\.0\.1):1234\//i;
  const fidOf = u => (String(u).match(/fileId=([\w-]+)/) || [])[1];
  const isSearch = u => /search/i.test(u) && /token=/.test(u);

  window.fetch = function (input, init) {
    const u = typeof input === 'string' ? input : (input && input.url) || String(input || '');
    if (AG.test(u)) {
      const f = fidOf(u); if (f) W.cap.push(f);
      return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    const p = oFetch.apply(this, arguments);
    if (isSearch(u)) {
      const body = init && init.body ? String(init.body) : '';
      p.then(r => r.clone().json()).then(j => W.srch.push({ u, body, j, t: Date.now() })).catch(() => {});
    }
    return p;
  };
  const XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) {
    this.__mmhU = String(u || '');
    if (AG.test(this.__mmhU)) {
      const f = fidOf(this.__mmhU); if (f) W.cap.push(f);
      const a = [].slice.call(arguments); a[0] = 'GET'; a[1] = 'data:application/json,%7B%7D';
      return XO.apply(this, a);
    }
    return XO.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const u = this.__mmhU || '';
    if (AG.test(u)) return XS.call(this);
    if (isSearch(u)) {
      const b = body ? String(body) : '';
      this.addEventListener('load', () => { try { W.srch.push({ u, body: b, j: JSON.parse(this.responseText), t: Date.now() }); } catch (e) {} });
    }
    return XS.apply(this, arguments);
  };

  /* file trang tự dựng: giữ Blob + chặn lưu xuống máy */
  const COU = URL.createObjectURL;
  URL.createObjectURL = function (b) {
    const u = COU.apply(this, arguments);
    try { if (b instanceof Blob) { W.blobs.push({ u, b, t: Date.now() }); if (W.blobs.length > 30) W.blobs.shift(); } } catch (e) {}
    return u;
  };
  const grab = a => {
    const href = a.href || '';
    if (!a.hasAttribute('download') && !/^(blob:|data:)/.test(href)) return false;
    W.dl.push({ name: a.getAttribute('download') || '', href, t: Date.now() });
    return true;
  };
  const AC = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (grab(this)) return; return AC.apply(this, arguments); };
  const DE = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (ev) {
    if (this instanceof HTMLAnchorElement && ev && ev.type === 'click' && grab(this)) return true;
    return DE.apply(this, arguments);
  };
  document.addEventListener('click', e => {
    const a = e.target && e.target.closest && e.target.closest('a[download], a[href^="blob:"]');
    if (a && grab(a)) e.preventDefault();
  }, true);
  const WO = window.open;
  window.open = function (u) {
    if (/^(blob:|data:)/.test(String(u || ''))) { W.dl.push({ name: '', href: String(u), t: Date.now() }); return null; }
    return WO.apply(this, arguments);
  };
  /* pdfmake (nút "Tải TBMT"…): lấy bản base64 */
  const hookPdf = () => {
    const M = window.pdfMake; if (!M || !M.createPdf || M.__mmh) return;
    const o = M.createPdf; M.__mmh = 1;
    M.createPdf = function () {
      const d = o.apply(this, arguments);
      const keep = b => { if (b) { W.pdf = b; W.pdfT = Date.now(); } };
      ['download', 'open', 'print'].forEach(k => { if (d[k]) d[k] = function () { try { const r = d.getBase64(keep); if (r && r.then) r.then(keep).catch(() => {}); } catch (e) {} }; });
      return d;
    };
  };
  setInterval(hookPdf, 300);
  try { window.alert = () => {}; window.confirm = () => true; window.print = () => {}; } catch (e) {}

  /* ───────── hàm cho tiện ích ───────── */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = e => !!(e && e.offsetParent !== null && e.getClientRects().length);
  const txt = e => (e && (e.innerText || e.textContent) || '').trim();
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const s = String(r.result || ''); res(s.slice(s.indexOf(',') + 1)); }; r.onerror = rej; r.readAsDataURL(blob); });
  const RXF = /\.(pdf|docx?|xlsx?|zip|rar|7z)$/i;

  W.closePopups = async () => {
    for (let i = 0; i < 4; i++) {
      const big = e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.offsetWidth > innerWidth * 0.6 && e.offsetHeight > innerHeight * 0.6 && +cs.zIndex >= 50 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
      const ov = [...document.querySelectorAll('body *')].filter(big);
      if (!ov.length) return;
      let hit = false;
      for (const o of ov) for (const b of o.querySelectorAll('button,a,[role=button]')) {
        const t = (b.innerText || b.getAttribute('aria-label') || '').trim();
        if (/^(đóng|đóng thông báo|close|bỏ qua|đã hiểu|tôi đã hiểu|ok|x|×|✕)$/i.test(t)) { b.click(); hit = true; break; }
      }
      if (!hit) { ov.forEach(e => e.remove()); document.body.style.overflow = 'auto'; }
      await sleep(300);
    }
  };
  W.waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = fn(); if (r) return r; } catch (e) {} await sleep(250); } return null; };
  W.waitSel = (sel, ms) => W.waitFor(() => [...document.querySelectorAll(sel)].some(vis), ms).then(Boolean);
  W.waitText = (src, ms) => W.waitFor(() => new RegExp(src, 'i').test(document.body.innerText), ms).then(Boolean);
  W.waitTdFile = ms => W.waitFor(() => [...document.querySelectorAll('td')].some(td => td.offsetParent && /\.(pdf|docx?|xlsx?|zip|rar)\s*$/i.test(td.innerText)), ms).then(Boolean);
  W.info = () => ({ url: location.href, title: document.title, n: document.querySelectorAll('*').length, txt: (document.body ? document.body.innerText : '').slice(0, 300) });

  const setVal = (el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    el.focus(); set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const enter = el => ['keydown', 'keypress', 'keyup'].forEach(t => el.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })));
  const realClick = el => {
    try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
    const r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(t => el.dispatchEvent(new (t.startsWith('pointer') ? PointerEvent : MouseEvent)(t, o)));
    el.click();
  };
  W.click = realClick;

  /* tìm số TBMT / KHLCNT ⇒ { hit (dòng JSON), url trang chi tiết } */
  W.search = async (no, plan) => {
    if (!(await W.waitSel('input[placeholder*="IB000202"]', 30000))) return { err: 'Trang chủ muasamcong chưa hiện ô tìm kiếm' };
    await W.closePopups();
    let sel = 'input[placeholder*="IB000202"]';
    if (plan) {
      const lb = [...document.querySelectorAll('label')].find(l => vis(l) && /KHLCNT/.test(txt(l)));
      if (lb) { realClick(lb); await sleep(800); }
      if ([...document.querySelectorAll('input[placeholder*="KHLCNT"]')].some(vis)) sel = 'input[placeholder*="KHLCNT"]';
    }
    for (let i = 0; i < 3; i++) {
      await sleep(1500 + i * 2500);
      const box = [...document.querySelectorAll(sel)].find(vis);
      if (!box) return { err: 'Không thấy ô tìm kiếm' };
      const n0 = W.srch.length;
      setVal(box, ''); setVal(box, no); enter(box);
      let res = await W.waitFor(() => W.srch.slice(n0).find(x => x.body.indexOf(no) >= 0 || x.u.indexOf(no) >= 0), i ? 25000 : 12000);
      if (!res) {   // Enter chưa ăn ⇒ bấm nút tìm cạnh ô
        const wrap = box.closest('form') || box.parentElement && box.parentElement.parentElement;
        const btn = wrap && [...wrap.querySelectorAll('button,[role=button],i,svg,span')].find(b => vis(b) && b !== box && (/tìm/i.test(txt(b)) || /search/i.test(String(b.className && b.className.baseVal !== undefined ? b.className.baseVal : b.className))));
        if (btn) { realClick(btn); res = await W.waitFor(() => W.srch.slice(n0).find(x => x.body.indexOf(no) >= 0 || x.u.indexOf(no) >= 0), 15000); }
      }
      if (res) {
        const items = ((res.j || {}).page || {}).content || [];
        const hit = items.find(x => String(x.notifyNo || x.planNo || '').toUpperCase().startsWith(no)) || items[0];
        if (!hit) return { none: true };
        const a = await W.waitFor(() => document.querySelector('a[href*="render=detail"]'), 20000);
        let url = a ? a.getAttribute('href') : '';
        if (url && url.startsWith('/')) url = location.origin + url;
        return { hit, url };
      }
      await W.closePopups();
    }
    return { err: 'Trang tìm kiếm muasamcong không phản hồi (thử 3 lần)' };
  };

  W.clickTab = async text => {
    const t = [...document.querySelectorAll('a,button,li,span,div,[role=tab]')].filter(e => vis(e) && txt(e) === text).pop();
    if (!t) return false;
    realClick(t); await sleep(1500); await W.closePopups();
    return true;
  };

  W.readFields = KN => {
    const o = {};
    for (const r of document.querySelectorAll('.infomation__content')) {
      if (!r.offsetParent) continue;
      const t = r.querySelector('.infomation__content__title'); if (!t) continue;
      const k = t.innerText.trim().replace(/:$/, ''); if (!k || o[k]) continue;
      const v = r.innerText.replace(t.innerText, '').replace(/\s+\n/g, '\n').trim().slice(0, 500);
      if (v) o[k] = v;
    }
    const tb = [...document.querySelectorAll('table')].find(t => t.offsetParent && /Giá gói thầu/.test(t.innerText) && /Tên gói thầu/.test(t.innerText));
    let all = document.body.innerText;
    if (tb) all = all.split(tb.innerText).join('\n');
    const lines = [].concat(...all.split('\n').map(x => x.split('\t'))).map(x => x.trim()).filter(Boolean);
    const nInfo = Object.keys(o).length;
    for (let i = 0; nInfo < 5 && i < lines.length - 1; i++) {
      const k = lines[i];
      if (KN.indexOf(k) >= 0 && !o[k] && KN.indexOf(lines[i + 1]) < 0) o[k] = (lines[i + 1] + (/^\d\d:\d\d$/.test(lines[i + 1]) && /^\d\d\/\d\d\/\d{4}$/.test(lines[i + 2] || '') ? ' ' + lines[i + 2] : '')).slice(0, 500);
    }
    if (tb) {
      const hr = [...tb.querySelectorAll('tr')].find(tr => tr.querySelector('th') && /Giá gói thầu/.test(tr.innerText)) || tb.querySelector('tr');
      const head = [...hr.querySelectorAll('th,td')].map(th => th.innerText.trim());
      o._pkgs = [...tb.querySelectorAll('tr')].filter(tr => tr !== hr && !tr.querySelector('th')).map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim())).filter(r => r.length >= Math.min(head.length - 2, 6)).slice(0, 30);
    }
    return o;
  };
  W.waitValues = (s, ms) => W.waitFor(() => { const R = new RegExp(s); return [...document.querySelectorAll('.infomation__content')].some(r => r.offsetParent && R.test(r.innerText)) || (/^PL/.test(s) && new RegExp('[\\n\\t]\\s*' + s).test(document.body.innerText)); }, ms || 40000).then(Boolean);

  const labelOf = e => {
    const own = txt(e);
    const clean = s => String(s || '').replace(own, '').replace(/\s+/g, ' ').replace(/^\s*\d+(\.\d+)*\s*/, '').replace(/^(Chương|Phần)\s+[\dIVXLC]+[A-Z]?\s*[.:\-]?\s*/i, '').replace(/[\w.\- ()]+\.(pdf|docx?|xlsx?|zip|rar)\b/gi, '').replace(/\s*(Xuất Excel|Tải về|Tải xuống)\s*/gi, ' ').trim();
    const ic = e.closest('.infomation__content'); if (ic) { const t = ic.querySelector('.infomation__content__title'); if (t) return clean(t.innerText); }
    const tr = e.closest('tr');
    if (tr) { const tds = [...tr.querySelectorAll('th,td')].map(td => clean(td.innerText)).filter(x => x && !/^\d+(\.\d+)*$/.test(x)); if (tds[0]) return tds[0]; }
    let n = e;
    for (let i = 0; i < 6 && n; i++, n = n.parentElement) {
      let p = n.previousElementSibling;
      for (let k = 0; k < 3 && p; k++, p = p.previousElementSibling) { const t = clean(p.innerText); if (t && t.length < 120) return t; }
    }
    return '';
  };
  /* danh sách file đính kèm đang hiện ⇒ [{i, orig, label}] */
  W.attachList = () => {
    document.querySelectorAll('[data-wtf]').forEach(e => e.removeAttribute('data-wtf'));
    let n = 0; const out = [];
    for (const e of document.querySelectorAll('tags.tags-fileAttach, body a, body span, body div, body td, body p, body li, body button')) {
      if (!e.offsetParent || e.closest('[data-wtf]') || e.querySelector('[data-wtf]')) continue;
      const t = txt(e);
      if (!t || t.length > 250) continue;
      if (e.matches('tags.tags-fileAttach') || (RXF.test(t) && ![...e.children].some(c => RXF.test(txt(c))))) { e.setAttribute('data-wtf', String(n)); out.push({ i: n, orig: t, label: labelOf(e) }); n++; }
    }
    return out;
  };
  /* bấm 1 file đính kèm ⇒ mã file trang gửi tới Agent (hoặc file tải thẳng) */
  W.attachClick = async i => {
    const el = document.querySelector('[data-wtf="' + i + '"]'); if (!el) return {};
    const n0 = W.cap.length, t0 = Date.now();
    realClick(el);
    await W.waitFor(() => W.cap.length > n0 || W.dl.some(d => d.t >= t0), 3000);
    await W.closePopups();
    if (W.cap.length > n0) return { fid: W.cap[W.cap.length - 1] };
    const f = await W.take(t0, 1500);
    return f ? { file: f } : {};
  };
  /* file trang tạo ra sau thời điểm t0 (chờ tối đa ms) ⇒ {b64, name, type} */
  W.take = async (t0, ms) => {
    const got = await W.waitFor(() => (W.pdf && W.pdfT >= t0) || W.dl.some(d => d.t >= t0) || W.blobs.some(x => x.t >= t0 && x.b.size > 1000), ms || 1);
    if (!got) return null;
    await sleep(300);
    if (W.pdf && W.pdfT >= t0) return { b64: W.pdf, name: '', type: 'application/pdf' };
    const d = W.dl.filter(x => x.t >= t0).pop();
    if (d) {
      let blob = (W.blobs.find(x => x.u === d.href) || {}).b;
      if (!blob) { try { blob = await (await W.fetch(d.href, { credentials: 'include' })).blob(); } catch (e) {} }
      if (blob) return { b64: await b64(blob), name: d.name, type: blob.type };
    }
    const bl = W.blobs.filter(x => x.t >= t0 && x.b.size > 1000).pop();
    if (bl) return { b64: await b64(bl.b), name: '', type: bl.b.type };
    return null;
  };
  W.fetchB64 = async u => { const r = await W.fetch(u, { credentials: 'include' }); if (!r.ok) return { err: 'HTTP ' + r.status }; const b = await r.blob(); return { b64: await b64(b), type: b.type }; };

  /* nút "Xuất Excel" đang hiện */
  const excelBtns = () => [...document.querySelectorAll('a,button')].filter(b => vis(b) && txt(b) === 'Xuất Excel');
  W.excelCount = () => excelBtns().length;
  W.excelClick = async (k, ms) => {
    const b = excelBtns()[k]; if (!b) return { err: 'không còn nút' };
    const label = labelOf(b), t0 = Date.now();
    realClick(b);
    const f = await W.take(t0, ms || 45000);
    await W.closePopups();
    return f ? Object.assign(f, { label }) : { label, t0 };
  };
  W.takeLater = (t0, ms) => W.take(t0, ms);

  /* nút "Tải TBMT" / "Tải KQLCNT" / "Tải KHLCNT" / "Tải biên bản" ⇒ PDF trang tự dựng */
  W.pdfButton = async (src, ms) => {
    const R = new RegExp(src, 'i');
    const C = [...document.querySelectorAll('body *')].filter(e => e.offsetParent && R.test(txt(e)) && txt(e).length <= 30);
    const leaf = C.filter(e => !C.some(o => o !== e && e.contains(o)))[0];
    if (!leaf) return { none: true };
    const btn = leaf.closest('a,button,[role=button],tags,span') || leaf, label = txt(leaf), t0 = Date.now();
    hookPdf();
    realClick(btn);
    const f = await W.take(t0, ms || 60000);
    await W.closePopups();
    return f ? Object.assign(f, { label }) : { label, miss: true };
  };

  /* Biên bản mở thầu ở khung phải (không có đuôi .pdf trong chữ) */
  W.bbmt = async () => {
    const C = [...document.querySelectorAll('body *')].filter(e => e.offsetParent && /^\s*Biên bản mở thầu\s*$/i.test(e.textContent || '') && !e.closest('[role=tab],[role=tablist],.ant-tabs-tab,nav'));
    const leaf = C.filter(e => !C.some(o => o !== e && e.contains(o)));
    for (let i = leaf.length - 1; i >= 0; i--) {
      const box = leaf[i].closest('a,button,[role=button],li,div') || leaf[i];
      const n0 = W.cap.length, t0 = Date.now();
      realClick(box);
      const icon = [...box.querySelectorAll('svg,img,i,[class*=icon]')].pop(); if (icon) realClick(icon);
      await W.waitFor(() => W.cap.length > n0 || W.dl.some(d => d.t >= t0), 8000);
      await W.closePopups();
      const f = await W.take(t0, 500);
      if (f) return { file: f };
      if (W.cap.length > n0) return { fid: W.cap[W.cap.length - 1] };
    }
    return { n: leaf.length };
  };

  /* lấy file qua VNeGP Agent — chính trang muasamcong gọi (đúng như người dùng bấm tải) */
  W.agent = async fid => {
    const u = 'http://localhost:1234/api/download/file/browser/public?fileId=' + encodeURIComponent(fid);
    let r;
    try { r = await W.fetch(u); } catch (e) { try { r = await W.fetch(u.replace('localhost', '127.0.0.1')); } catch (e2) { return { err: 'Agent không trả lời (' + e2.message + ')' }; } }
    if (!r.ok) return { err: 'Agent trả lỗi HTTP ' + r.status };
    const ct = r.headers.get('content-type') || '', cd = r.headers.get('content-disposition') || '';
    const buf = await r.arrayBuffer();
    if (/json/i.test(ct) || new Uint8Array(buf.slice(0, 1))[0] === 123) {
      try {
        const j = JSON.parse(new TextDecoder().decode(buf)), res = j && typeof j.result === 'object' ? j.result : {};
        for (const k of ['data', 'content', 'file', 'base64', 'fileContent']) { const v = (j || {})[k] || res[k]; if (typeof v === 'string' && v.length > 100) return { b64: v.replace(/^data:[^,]*,/, ''), type: '' }; }
        return { err: 'Agent trả lời: ' + JSON.stringify(j).slice(0, 160) };
      } catch (e) {}
    }
    if (buf.byteLength < 100) return { err: 'Agent trả về dữ liệu rỗng' };
    const name = decodeURIComponent((cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i) || [])[1] || '');
    return { b64: await b64(new Blob([buf])), type: ct.split(';')[0], name };
  };
})();
