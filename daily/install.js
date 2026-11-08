// MMH Daily — cài thành ứng dụng (PWA). Chrome / Edge / Android: hộp cài của trình duyệt.
// iPhone / iPad / Safari Mac: không có hộp cài tự động ⇒ hướng dẫn từng bước. Đang mở bằng app đã cài ⇒ ẩn nút.
(function () {
  const $ = s => document.querySelector(s);
  const btn = $('#inst-btn'), dlg = $('#inst-dlg'), steps = $('#inst-steps');
  if (!btn) return;
  const ua = navigator.userAgent;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const macSafari = !ios && /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
  const inApp = /FBAN|FBAV|Zalo|Instagram|Line\//i.test(ua);           // trình duyệt trong Zalo / Facebook không cài được
  let deferred = null;
  if (standalone) { document.documentElement.classList.add('is-app'); return; }

  const SHARE = '<svg class="ii" viewBox="0 0 24 24"><path d="M12 15V3m0 0L8 7m4-4 4 4M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const PLUS = '<svg class="ii" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const guide = () => {
    if (inApp) return ['Bấm nút <b>⋯</b> (góc trên) ▸ <b>Mở bằng trình duyệt</b> (Safari / Chrome).', 'Trong trình duyệt, bấm lại <b>Cài app</b>.'];
    if (ios) return [`Bấm nút <b>Chia sẻ</b> ${SHARE} ở thanh dưới (iPad: góc trên).`, `Kéo xuống, chọn <b>Thêm vào MH chính</b> ${PLUS}.`, 'Bấm <b>Thêm</b>. Biểu tượng MMH Daily xuất hiện trên màn hình chính.'];
    if (macSafari) return ['Trên thanh menu, bấm <b>Tệp</b> (File) ▸ <b>Thêm vào Dock</b>.', 'Bấm <b>Thêm</b>. MMH Daily mở như một ứng dụng riêng từ Dock / Launchpad.'];
    return ['Mở menu trình duyệt <b>⋮</b> (góc trên bên phải).', 'Chọn <b>Cài đặt ứng dụng</b> / <b>Thêm vào màn hình chính</b>.', 'Bấm <b>Cài đặt</b>.'];
  };
  const open = () => { steps.innerHTML = guide().map(s => `<li>${s}</li>`).join(''); dlg.hidden = false; $('#inst-close').focus(); };
  async function install() {
    if (deferred) {
      deferred.prompt();
      const r = await deferred.userChoice.catch(() => ({}));
      deferred = null;
      if (r.outcome === 'accepted') btn.hidden = true;
      return;
    }
    open();
  }
  window.MMHApp = { install };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; });
  window.addEventListener('appinstalled', () => { btn.hidden = true; deferred = null; });
  if (ios || macSafari || inApp) btn.hidden = false;                      // không có sự kiện cài ⇒ luôn hiện nút (mở hướng dẫn)
  btn.onclick = install;
  $('#inst-close').onclick = () => { dlg.hidden = true; };
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !dlg.hidden) dlg.hidden = true; });
})();
