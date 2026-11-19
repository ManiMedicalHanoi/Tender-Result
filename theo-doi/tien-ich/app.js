/* MMH Tải hồ sơ thầu — chạy trên các app MMH (manimedicalhanoi.github.io).
   - Gửi phiên đăng nhập email (localStorage mmh_tk, dùng chung mọi app MMH) cho tiện ích ⇒ không cần khoá bot, không cần cài gì thêm.
   - Báo cho app Theo dõi gói thầu biết tiện ích đang bật (html[data-mmh-ext]) + trạng thái; app gửi "kick" khi vừa đưa gói vào hàng đợi ⇒ tải ngay. */
(() => {
  const VER = chrome.runtime.getManifest().version;
  if (window.__mmhExtApp) { window.__mmhExtApp(); return; }   // gắn lại (tiện ích vừa cài / mất phiên) ⇒ gửi lại phiên ngay
  // mmh_tk = JSON {tk, user, exp} (app Theo dõi gói thầu / Tender Map…) hoặc chuỗi mã phiên (app cũ) ⇒ lấy đúng mã phiên
  const raw = () => { try { return localStorage.getItem('mmh_tk') || ''; } catch (e) { return ''; } };
  const tok = () => { const r = raw(); if (!r) return ''; try { const o = JSON.parse(r); if (o && typeof o === 'object') return (o.exp && Date.now() > o.exp) ? '' : String(o.tk || o.token || ''); } catch (e) {} return r; };
  const pic = () => { try { const o = JSON.parse(raw() || 'null'); if (o && o.user) return o.user.pic || ''; } catch (e) {} try { return localStorage.getItem('mmh_pic') || ''; } catch (e) { return ''; } };
  const post = st => window.postMessage({ mmhExt: 'state', v: VER, st }, location.origin);
  const send = (m, cb) => { try { chrome.runtime.sendMessage(m, r => { void chrome.runtime.lastError; cb && cb(r); }); } catch (e) {} };
  document.documentElement.setAttribute('data-mmh-ext', VER);
  let last = '';
  const push = () => { const t = tok(); if (t && t !== last) { last = t; send({ t: 'tk', tk: t, pic: pic() }, post); } };
  window.__mmhExtApp = () => { last = ''; push(); };
  push();
  setInterval(push, 15000);
  window.addEventListener('storage', e => { if (e.key === 'mmh_tk') push(); });
  window.addEventListener('message', e => {
    if (e.source !== window || !e.data || typeof e.data.mmhExt !== 'string') return;
    if (e.data.mmhExt === 'kick') { push(); send({ t: 'kick' }, post); }
    else if (e.data.mmhExt === 'ask') send({ t: 'state' }, post);
    else if (e.data.mmhExt === 'set') send({ t: 'set', v: e.data.v || {} }, post);
  });
  send({ t: 'state' }, post);
})();
