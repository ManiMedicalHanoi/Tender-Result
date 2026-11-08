/* MMH Daily — app đọc báo + nghe podcast. Dữ liệu: data/index.json, data/editions/<ngày>.json (GitHub Actions tạo mỗi sáng). */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* riêng tư */ } },
  };
  const SEC = { health: ['Y tế', 'Health'], economy: ['Kinh tế', 'Economy'], politics: ['Chính trị', 'Politics'], society: ['Xã hội', 'Society'] };
  const TAG = { tender: 'Đấu thầu', policy: 'Chính sách', invest: 'Đầu tư công', hospital: 'Bệnh viện', device: 'Thiết bị y tế' };
  const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="5.5" y="4" width="4.5" height="16" rx="1.2" fill="currentColor"/><rect x="14" y="4" width="4.5" height="16" rx="1.2" fill="currentColor"/></svg>',
  };
  const S = { index: null, eds: {}, cur: null, lang: store.get('mmh_daily_lang', 'vi'), ep: null, tab: '', sub: store.get('mmh_daily_sub', 'both') };
  const toast = t => { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2400); };
  const viDate = ds => { const d = new Date(ds + 'T00:00:00Z'); return `${WD[d.getUTCDay()]}, ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`; };
  const enDate = ds => new Date(ds + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const ago = d => { const h = Math.round((Date.now() - new Date(d)) / 36e5); return h < 1 ? 'vừa xong' : h < 24 ? h + ' giờ trước' : Math.round(h / 24) + ' ngày trước'; };

  // ── ảnh bìa podcast (SVG, theo màu chương trình) ──
  function cover(pod, date, big) {
    const c = pod?.color || '#0E7C6B';
    const name = pod?.name || 'MMH Daily';
    const words = name.split(' ');
    const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [name];
    const d = date ? new Date(date + 'T00:00:00Z') : null;
    const seed = (date || name).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const bars = Array.from({ length: 28 }, (_, i) => { const h = 10 + ((seed * (i + 3) * 37) % 46); return `<rect x="${14 + i * 6}" y="${150 - h}" width="3.4" height="${h}" rx="1.7" fill="#fff" opacity="${0.18 + (i % 5) * 0.06}"/>`; }).join('');
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(name)}">
      <defs><linearGradient id="g${seed}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#0b0d10"/></linearGradient></defs>
      <rect width="200" height="200" fill="url(#g${seed})"/>
      <circle cx="168" cy="34" r="54" fill="#fff" opacity=".07"/><circle cx="168" cy="34" r="30" fill="#fff" opacity=".07"/>
      ${bars}
      <text x="14" y="28" fill="#fff" opacity=".8" font-family="Inter,sans-serif" font-weight="700" font-size="9.5" letter-spacing="1.6">MMH DAILY</text>
      ${lines.map((l, i) => `<text x="14" y="${(lines.length > 1 ? 160 : 172) + i * 22}" fill="#fff" font-family="'Playfair Display',Georgia,serif" font-weight="800" font-size="${big ? 21 : 20}">${esc(l)}</text>`).join('')}
      ${d ? `<text x="186" y="28" text-anchor="end" fill="#fff" opacity=".8" font-family="Inter,sans-serif" font-weight="600" font-size="9.5">${d.getUTCDate()}/${d.getUTCMonth() + 1}</text>` : ''}
    </svg>`;
  }

  // ── dữ liệu ──
  async function loadIndex() {
    const r = await fetch('data/index.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('index ' + r.status);
    S.index = await r.json();
  }
  async function loadEd(date) {
    if (S.eds[date]) return S.eds[date];
    const r = await fetch(`data/editions/${date}.json`, { cache: 'no-cache' });
    if (!r.ok) throw new Error('edition ' + r.status);
    const ed = await r.json();
    for (const id in ed.stories) ed.stories[id].id = id;
    return (S.eds[date] = ed);
  }
  const story = (ed, id) => ed.stories[id];
  const H = x => (S.lang === 'en' ? (x.h_en || (x.lang === 'en' ? x.t : '') || x.h_vi || x.t) : (x.h_vi || (x.lang === 'vi' ? x.t : '') || x.t));
  const dePrefix = s => String(s || '').replace(/^\s*\(?[\p{L}\d&.]{2,14}(?:\.vn)?\)?\s*[-–—]\s+/u, '');
  const SUMV = x => x.s_vi || (x.lang === 'vi' ? dePrefix(x.sum) : '') || '';
  const SUME = x => x.s_en || (x.lang === 'en' ? x.sum : '') || '';

  // ── mẩu tin ──
  function kicker(x) {
    const tags = (x.tags || []).map(t => TAG[t]).filter(Boolean).slice(0, 2);
    return `<div class="kick">${esc(SEC[x.sec]?.[0] || '')}${tags.map(t => `<span class="tg">· ${esc(t)}</span>`).join('')}${x.kind === 'doc' ? '<span class="red">· Văn bản mới</span>' : ''}</div>`;
  }
  function byline(x) {
    return `<div class="by"><b>${esc(x.src)}</b><span>· ${esc(ago(x.d))}</span>${x.lang === 'en' ? '<span class="badge en">EN</span>' : ''}${x.also?.length ? `<span>· cũng đăng trên ${esc(x.also.slice(0, 3).join(', '))}</span>` : ''}</div>`;
  }
  function body(x, opt = {}) {
    const vi = SUMV(x), en = SUME(x);
    let out = '';
    if (S.lang === 'en') { if (en) out += `<p class="sum">${esc(en)}</p>`; else if (vi) out += `<p class="sum">${esc(vi)}</p>`; }
    else { if (vi) out += `<p class="sum">${esc(vi)}</p>`; if (en && opt.both) out += `<p class="sum en">${esc(en)}</p>`; else if (!vi && en) out += `<p class="sum en">${esc(en)}</p>`; }
    if (x.why && opt.why !== false) out += `<div class="why"><b>Vì sao quan trọng:</b> ${esc(x.why)}</div>`;
    return out;
  }
  const link = (x, inner) => `<a href="${esc(x.u)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
  function storyHtml(x, size = 's', opt = {}) {
    return `<article class="story">${opt.img && x.img ? `<img class="thumb" src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      ${opt.kick ? kicker(x) : ''}<h3 class="hl ${size}">${link(x, esc(H(x)))}</h3>${x.dek && S.lang === 'en' ? `<p class="dek">${esc(x.dek)}</p>` : ''}${body(x, opt)}${byline(x)}</article>`;
  }

  // ── thẻ nghe ──
  function listenCard(ed) {
    const p = ed.podcast; const a = p.audio;
    return `<a class="lcard" href="#/listen/${ed.date}" style="--show:${p.color}">
      <div class="cv">${cover(p, ed.date)}</div>
      <div><div class="k">Nghe hôm nay · English podcast</div><b>${esc(p.name)}</b><span>${esc(p.hosts.map(h => h.name).join(' & '))}${a ? ' · ' + Math.round(a.dur / 60) + ' phút' : ''}</span>
      <div class="row"><button class="pbtn" type="button" data-play="${ed.date}" aria-label="Phát podcast">${ICON.play}</button><span>${a ? 'Bấm để nghe' : 'Đang tạo âm thanh…'}</span></div></div></a>`;
  }

  // ── TRANG NHẤT ──
  function front(ed) {
    const L = story(ed, ed.lead);
    const secs = ed.sections;
    const healthIds = (secs.health || []).filter(id => id !== ed.lead);
    const leadSub = healthIds.slice(0, 2).map(id => story(ed, id)).filter(Boolean);
    const note = ed.note ? `<div class="note"><h3>Lời biên tập</h3><p>${esc(ed.note.vi)}</p><p class="en">${esc(ed.note.en)}</p></div>` : '';
    const docs = (ed.docs || []).map(id => story(ed, id)).filter(Boolean).slice(0, 6);
    const docsBox = docs.length ? `<div class="docs-box"><h3>Văn bản & chính sách mới</h3>${docs.map(x => `<div class="doc"><span class="no">${esc((x.docs || [''])[0])}</span>${link(x, esc(H(x)))}</div>`).join('')}</div>` : '';
    const vocab = ed.vocab?.length ? vocabHtml(ed) : '';
    let html = `<div class="mlisten">${listenCard(ed)}</div><div class="front">
      <div class="lead">${L ? `${kicker(L)}${L.img ? `<img class="ph" src="${esc(L.img)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
        <h1 class="hl xl">${link(L, esc(H(L)))}</h1>${L.dek ? `<p class="dek">${esc(L.dek)}</p>` : ''}${body(L, { both: true })}${byline(L)}` : '<div class="empty">Chưa có tin.</div>'}
        <div class="lead-sub">${leadSub.map(x => storyHtml(x, 'm', { kick: true })).join('')}</div>
      </div>
      <aside class="side">${listenCard(ed)}${note}${docsBox}${vocab}</aside>
    </div>`;
    html += healthDesk(ed, true);
    html += `<div class="sec-h"><h2>Kinh tế · Chính trị · Xã hội</h2><span class="sub">Economy · Politics · Society</span></div><div class="cols3">`;
    for (const sec of ['economy', 'politics', 'society']) {
      html += `<div><div class="col-h">${SEC[sec][0]}</div>${(secs[sec] || []).slice(0, 5).map((id, i) => storyHtml(story(ed, id), i ? 's' : 'm', { img: i === 0 })).join('') || '<p class="empty">Chưa có tin.</p>'}<a class="by" href="#/s/${sec}">Xem tất cả ${SEC[sec][0].toLowerCase()} →</a></div>`;
    }
    html += '</div>';
    return html;
  }

  function healthDesk(ed, compact) {
    const g = ed.healthDesk?.groups || {};
    const an = ed.healthDesk?.analysis;
    const col = t => {
      const xs = (g[t] || []).map(id => story(ed, id)).filter(Boolean).slice(0, compact ? 4 : 8);
      return `<div><h4>${TAG[t]}</h4>${xs.length ? `<ul>${xs.map(x => `<li>${link(x, esc(H(x)))}<small>${esc(x.src)} · ${esc(ago(x.d))}</small></li>`).join('')}</ul>` : '<p class="none">Chưa có tin mới.</p>'}</div>`;
    };
    return `<section class="desk"><div class="sec-h"><h2>Bàn tin Y tế</h2><span class="sub">Health Desk — đấu thầu, chính sách, đầu tư công, bệnh viện</span><a href="#/s/health">Tất cả tin y tế →</a></div>
      ${an ? `<div class="desk-an"><div><p>${esc(an.vi)}</p></div><div><p class="en">${esc(an.en)}</p></div></div>` : ''}
      <div class="desk-g">${['tender', 'policy', 'invest', 'hospital', 'device'].map(col).join('')}</div></section>`;
  }

  function vocabHtml(ed, dark) {
    return `<div class="vocab${dark ? ' dk' : ''}"><h3>Học tiếng Anh hôm nay</h3><dl>${ed.vocab.map(v => `<dt>${esc(v.en)}</dt><dd>${esc(v.vi)}</dd>${v.ex ? `<div class="ex">“${esc(v.ex)}”</div>` : ''}`).join('')}</dl></div>`;
  }

  // ── TRANG CHUYÊN MỤC ──
  function sectionPage(ed, sec) {
    const ids = sec === 'health' ? [...new Set([...(ed.sections.health || []), ...Object.values(ed.healthDesk?.groups || {}).flat()])] : (ed.sections[sec] || []);
    let xs = ids.map(id => story(ed, id)).filter(Boolean);
    if (sec === 'health' && S.tab) xs = xs.filter(x => x.tags?.includes(S.tab));
    const chips = sec === 'health' ? `<div class="filters">${['', 'tender', 'policy', 'invest', 'hospital', 'device'].map(t => `<button class="chip${S.tab === t ? ' on' : ''}" data-tab="${t}" type="button">${t ? TAG[t] : 'Tất cả'}</button>`).join('')}</div>` : '';
    const items = xs.map(x => `<div class="sp-item${x.img ? '' : ' noimg'}"><div>${kicker(x)}<h2 class="hl l">${link(x, esc(H(x)))}</h2>${x.dek && S.lang === 'en' ? `<p class="dek">${esc(x.dek)}</p>` : ''}${body(x, { both: true })}${byline(x)}</div>${x.img ? `<img class="ph" src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg');this.remove()">` : ''}</div>`).join('');
    return `<div class="sec-h" style="margin-top:4px"><h2>${SEC[sec][0]}</h2><span class="sub">${SEC[sec][1]}</span></div>${chips}
      <div class="secpage"><div class="main">${items || '<div class="empty">Chưa có tin.</div>'}</div><aside class="side">${listenCard(ed)}${sec === 'health' && ed.healthDesk?.analysis ? `<div class="note"><h3>Phân tích</h3><p>${esc(ed.healthDesk.analysis.vi)}</p></div>` : ''}${ed.vocab?.length ? vocabHtml(ed) : ''}</aside></div>`;
  }

  function docsPage(ed) {
    const xs = (ed.docs || []).map(id => story(ed, id)).filter(Boolean);
    return `<div class="sec-h" style="margin-top:4px"><h2>Văn bản & chính sách</h2><span class="sub">Nghị định, thông tư, quyết định mới liên quan y tế, đấu thầu, đầu tư công</span></div>
      <div class="secpage"><div class="main">${xs.map(x => `<div class="sp-item noimg"><div><div class="kick"><span class="red">${esc((x.docs || []).join(' · '))}</span></div><h2 class="hl m">${link(x, esc(H(x)))}</h2>${body(x)}${byline(x)}</div></div>`).join('') || '<div class="empty">Chưa có văn bản mới trong số này.</div>'}</div>
      <aside class="side">${listenCard(ed)}</aside></div>`;
  }

  function archivePage() {
    const eds = S.index.editions;
    return `<div class="sec-h" style="margin-top:4px"><h2>Số cũ</h2><span class="sub">${eds.length} số báo · bấm để đọc / nghe lại</span></div>
      <div class="archive">${eds.map(e => `<a class="arc" href="#/e/${e.date}"><div class="cv">${cover({ name: showName(e.show), color: showColor(e.show) }, e.date)}</div><div><b>${esc(viDate(e.date))}</b><span>Số ${e.no} · ${esc(showName(e.show))}</span><br><span>${esc(e.lead || '')}</span></div></a>`).join('')}</div>`;
  }
  const SHOWMETA = { briefing: ['The Morning Briefing', '#1F4E79'], twotakes: ['Two Takes', '#7A3E9D'], healthdesk: ['Health Desk', '#0E7C6B'], markets: ['Market Watch', '#B8641B'], editor: ['Ask the Editor', '#2F6F9F'], explainer: ['The Explainer', '#A23B3B'], weekly: ['Week in Review', '#3D5A3D'] };
  const SHOWDESC = { briefing: 'Một người dẫn · tin chính trong ~8 phút', twotakes: 'Hai người dẫn trao đổi', healthdesk: 'Chuyên sâu y tế: đấu thầu, chính sách, bệnh viện', markets: 'Kinh tế, thương mại, đầu tư', editor: 'Hỏi – đáp với biên tập viên', explainer: 'Giải thích sâu một tin lớn', weekly: 'Chủ nhật: nhìn lại cả tuần' };
  const showName = id => SHOWMETA[id]?.[0] || id;
  const showColor = id => SHOWMETA[id]?.[1] || '#0E7C6B';

  // ── TRANG NGHE ──
  function listenPage(ed) {
    const p = ed.podcast, a = p.audio;
    const turns = (p.turns || []).filter(t => t.text);
    const hosts = Object.fromEntries(p.hosts.map(h => [h.id, h]));
    const recent = S.index.editions.slice(0, 14);
    return `<div class="ls" style="--show:${p.color}">
      <section class="ls-hero"><div class="cv">${cover(p, ed.date, true)}</div><div>
        <div class="ls-k">Podcast · ${esc(viDate(ed.date))}</div>
        <h1 class="ls-t">${esc(p.name)}</h1>
        <p class="ls-d">${esc(p.desc || '')}</p>
        <div class="ls-meta"><span>${esc(p.hosts.map(h => `${h.name} (${h.role})`).join(' · '))}</span>${a ? `<span>${Math.round(a.dur / 60)} phút</span>` : ''}<span>Tiếng Anh · phụ đề bên dưới</span></div>
      </div></section>
      <div class="ls-ctl">
        <button class="bigplay" id="ls-play" type="button" data-play="${ed.date}" aria-label="Phát">${ICON.play}</button>
        <button class="ibtn" id="ls-back" type="button" aria-label="Lùi 15 giây" title="Lùi 15 giây">${$('#mini-back').innerHTML}</button>
        <button class="ibtn" id="ls-fwd" type="button" aria-label="Tới 15 giây" title="Tới 15 giây">${$('#mini-fwd').innerHTML}</button>
        <button class="spd" id="ls-spd" type="button" title="Tốc độ đọc">${(store.get('mmh_daily_rate', 1)).toFixed(2).replace(/0$/, '')}×</button>
        ${a ? `<a class="dl" href="${esc(a.file)}" download>Tải MP3</a>` : '<span class="dl">Âm thanh đang được tạo…</span>'}
      </div>
      <div class="nowsub" id="nowsub" aria-live="off"><span class="en"></span><span class="vi"></span></div>
      <div class="seek"><span id="ls-cur">0:00</span><div class="tr" id="ls-tr"><i id="ls-prog" style="width:0"></i></div><span id="ls-dur">${a ? mmss(a.dur) : '--:--'}</span></div>
      <div class="ls-grid">
        <div class="ls-box"><h3>Lời thoại<small>bấm một câu để nghe từ đó</small></h3>
          <div class="subsel" id="subsel" role="group" aria-label="Phụ đề">${[['both', 'Anh + Việt'], ['en', 'Tiếng Anh'], ['vi', 'Tiếng Việt']].map(([k, l]) => `<button type="button" data-sub="${k}" class="${S.sub === k ? 'on' : ''}">${l}</button>`).join('')}</div>
          <div class="tx sub-${S.sub}" id="tx">${turns.map((t, i) => `<p data-i="${i}" data-t="${t.t ?? ''}"><b>${esc(hosts[t.sp]?.name || t.sp)}</b><span class="en">${esc(t.text)}</span>${t.vi ? `<span class="vi">${esc(t.vi)}</span>` : ''}</p>`).join('')}</div></div>
        <div>
          <div class="ls-box"><h3>Các số gần đây</h3><div class="eps">${recent.map(e => `<a class="ep${e.date === ed.date ? ' on' : ''}" href="#/listen/${e.date}"><div class="cv">${cover({ name: showName(e.show), color: showColor(e.show) }, e.date)}</div><div><b>${esc(showName(e.show))}</b><span>${esc(viDate(e.date))}</span></div><em>${e.words ? '~' + Math.round(e.words / 130) + ' ph' : ''}</em></a>`).join('')}</div></div>
          ${ed.vocab?.length ? `<div style="margin-top:20px">${vocabHtml(ed, true)}</div>` : ''}
        </div>
      </div>
      <h2 class="ls-sh">Các chương trình</h2>
      <div class="shows">${Object.keys(SHOWMETA).map(id => `<div class="show${id === p.show ? ' today' : ''}" style="--show:${showColor(id)}"><div class="cv">${cover({ name: showName(id), color: showColor(id) })}</div><b>${esc(showName(id))}</b><span>${esc(SHOWDESC[id])}</span></div>`).join('')}</div>
    </div>`;
  }

  // ── trình phát ──
  const audio = $('#audio');
  audio.playbackRate = store.get('mmh_daily_rate', 1);
  function setEp(ed) {
    const a = ed.podcast.audio;
    if (!a) { toast('Âm thanh của số này chưa sẵn sàng'); return false; }
    if (S.ep?.date !== ed.date) {
      S.ep = ed;
      audio.src = a.file;
      audio.playbackRate = store.get('mmh_daily_rate', 1);
      const pos = store.get('mmh_daily_pos', {})[ed.date];
      if (pos && pos < a.dur - 10) audio.currentTime = pos;
      $('#mini').hidden = false;
      $('#mini-open').innerHTML = cover(ed.podcast, ed.date);
      $('#mini-t').textContent = ed.podcast.name;
      $('#mini-s').textContent = viDate(ed.date) + ' · ' + ed.podcast.hosts.map(h => h.name).join(' & ');
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: ed.podcast.title || ed.podcast.name, artist: 'MMH Daily', album: viDate(ed.date),
          artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
      }
    }
    return true;
  }
  async function playDate(date) {
    try {
      const ed = await loadEd(date);
      if (!setEp(ed)) return;
      if (audio.paused) await audio.play(); else audio.pause();
    } catch (e) { toast('Không phát được: ' + e.message); }
  }
  function syncUi() {
    const playing = !audio.paused;
    $('#mini-play').innerHTML = playing ? ICON.pause : ICON.play;
    $('#mini-play').setAttribute('aria-label', playing ? 'Tạm dừng' : 'Phát');
    document.querySelectorAll('[data-play]').forEach(b => { const on = S.ep && b.dataset.play === S.ep.date && playing; b.innerHTML = on ? ICON.pause : ICON.play; });
  }
  let lastSave = 0, lastLine = -1;
  function onTime() {
    if (!S.ep) return;
    const d = audio.duration || S.ep?.podcast.audio?.dur || 1, t = audio.currentTime;
    $('#mini-prog').style.width = (t / d * 100) + '%';
    curSubMini(t);
    const lp = $('#ls-prog');
    if (lp && S.cur && S.ep && S.cur.date === S.ep.date) { lp.style.width = (t / d * 100) + '%'; $('#ls-cur').textContent = mmss(t); $('#ls-dur').textContent = mmss(d); hiLine(t); }
    if (Date.now() - lastSave > 4000) { lastSave = Date.now(); const p = store.get('mmh_daily_pos', {}); p[S.ep.date] = Math.floor(t); store.set('mmh_daily_pos', p); }
  }
  // dòng 2 của thanh phát nhỏ = phụ đề Việt câu đang đọc (học tiếng Anh khi nghe)
  let miniIdx = -2;
  function curSubMini(t) {
    const turns = (S.ep?.podcast.turns || []).filter(x => x.text);
    let i = -1; turns.forEach((x, k) => { if (x.t != null && x.t <= t + 0.2) i = k; });
    if (i === miniIdx) return; miniIdx = i;
    $('#mini-s').textContent = (i >= 0 && turns[i].vi && !audio.paused) ? turns[i].vi : viDate(S.ep.date) + ' · ' + S.ep.podcast.hosts.map(h => h.name).join(' & ');
  }
  function hiLine(t) {
    const ps = [...document.querySelectorAll('#tx p')];
    let idx = -1;
    ps.forEach((p, i) => { const v = parseFloat(p.dataset.t); if (!isNaN(v) && v <= t + 0.2) idx = i; });
    if (idx === lastLine) return;
    lastLine = idx;
    ps.forEach((p, i) => { p.classList.toggle('now', i === idx); p.classList.toggle('past', i < idx); });
    const turn = S.ep?.podcast.turns.filter(t => t.text)[idx], ns = $('#nowsub');
    if (ns) { ns.querySelector('.en').textContent = turn ? turn.text : ''; ns.querySelector('.vi').textContent = turn?.vi || ''; ns.className = 'nowsub sub-' + S.sub + (turn ? ' on' : ''); }
    const el = ps[idx], box = $('#tx');
    if (el && box && box.scrollHeight > box.clientHeight + 4) box.scrollTop = el.offsetTop - box.offsetTop - box.clientHeight / 3;
  }
  const seekBy = s => { if (S.ep) audio.currentTime = Math.max(0, Math.min((audio.duration || 0) - 1, audio.currentTime + s)); };
  audio.addEventListener('timeupdate', onTime);
  audio.addEventListener('play', syncUi);
  audio.addEventListener('pause', syncUi);
  audio.addEventListener('ended', () => { const p = store.get('mmh_daily_pos', {}); delete p[S.ep.date]; store.set('mmh_daily_pos', p); syncUi(); });
  audio.addEventListener('error', () => {
    const alt = S.ep?.podcast.audio?.alt;
    if (alt && !audio.src.endsWith(alt)) { const t = audio.currentTime; audio.src = alt; audio.currentTime = t; audio.play().catch(() => {}); return; }
    if (S.ep) toast('Không tải được file âm thanh');
  });
  $('#mini-play').onclick = () => { if (!S.ep) return; audio.paused ? audio.play() : audio.pause(); };
  $('#mini-back').onclick = () => seekBy(-15);
  $('#mini-fwd').onclick = () => seekBy(15);
  $('#mini-open').onclick = () => { if (S.ep) location.hash = '#/listen/' + S.ep.date; };
  $('#mini-bar').onclick = e => { if (!S.ep) return; const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * (audio.duration || 0); };
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => seekBy(-15));
    navigator.mediaSession.setActionHandler('seekforward', () => seekBy(15));
  }

  // ── điều hướng ──
  async function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [r, a] = h.split('/');
    let date = S.index.editions[0]?.date;
    if ((r === 'e' || r === 'listen') && a) date = a;
    if (!date) { $('#view').innerHTML = '<div class="empty">Chưa có số báo nào. Số đầu tiên sẽ có sau lượt chạy sáng mai.</div>'; return; }
    let ed;
    try { ed = await loadEd(date); } catch { $('#view').innerHTML = '<div class="empty">Không tải được số báo này.</div>'; return; }
    S.cur = ed;
    const row = S.index.editions.find(e => e.date === date);
    $('#m-date').textContent = viDate(date);
    $('#m-no').textContent = `Số ${row?.no || ed.no} · ${S.lang === 'en' ? enDate(date) : 'Hà Nội'}`;
    const dark = r === 'listen';
    document.body.classList.toggle('dark', dark);
    document.querySelector('meta[name=theme-color]').content = dark ? '#0E1013' : '#FBF9F4';
    let html;
    if (r === 's' && SEC[a]) html = sectionPage(ed, a);
    else if (r === 'docs') html = docsPage(ed);
    else if (r === 'listen') html = listenPage(ed);
    else if (r === 'archive') html = archivePage();
    else html = front(ed);
    $('#view').innerHTML = html;
    lastLine = -1;
    const key = r === 's' ? a : (r === 'e' || !r) ? 'front' : r;
    document.querySelectorAll('#nav a').forEach(x => x.classList.toggle('on', x.dataset.r === key));
    $('#foot').innerHTML = footer(ed);
    if (dark) wireListen(ed);
    syncUi();
    if (!S.routed) S.routed = true; else window.scrollTo({ top: 0 });
  }
  function wireListen(ed) {
    $('#ls-back').onclick = () => { if (S.ep?.date !== ed.date) setEp(ed); seekBy(-15); };
    $('#ls-fwd').onclick = () => { if (S.ep?.date !== ed.date) setEp(ed); seekBy(15); };
    $('#ls-spd').onclick = e => {
      const steps = [0.8, 0.9, 1, 1.15, 1.3, 1.5];
      const cur = store.get('mmh_daily_rate', 1);
      const nx = steps[(steps.indexOf(cur) + 1) % steps.length] || 1;
      store.set('mmh_daily_rate', nx); audio.playbackRate = nx;
      e.currentTarget.textContent = String(nx).replace(/^1$/, '1') + '×';
      toast('Tốc độ đọc ' + nx + '×');
    };
    $('#ls-tr').onclick = e => { if (!setEp(ed)) return; const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * (audio.duration || ed.podcast.audio.dur); if (audio.paused) audio.play(); };
    $('#tx').onclick = e => {
      const p = e.target.closest('p'); if (!p) return;
      const t = parseFloat(p.dataset.t); if (isNaN(t) || !setEp(ed)) return;
      audio.currentTime = t; if (audio.paused) audio.play();
    };
    if (S.ep?.date === ed.date) onTime();
  }
  function footer(ed) {
    const ok = (ed.sources || []).filter(s => s.ok).length;
    const writer = ed.writer === 'claude' ? 'Biên tập bằng Claude (AI) từ tin gom được' : 'Tin lấy nguyên văn từ báo · podcast đọc tin tiếng Anh';
    return `<span><b>MMH Daily</b> · số ${ed.no} · cập nhật ${new Date(ed.updated).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
      <span>${ok}/${(ed.sources || []).length} nguồn tin chạy</span><span>${writer}</span><span>Giọng đọc: giọng máy (Microsoft neural)</span><span>Bấm tiêu đề để đọc bài gốc</span>`;
  }

  document.addEventListener('click', e => {
    const p = e.target.closest('[data-play]');
    if (p) { e.preventDefault(); e.stopPropagation(); playDate(p.dataset.play); return; }
    const sb = e.target.closest('[data-sub]');
    if (sb) { S.sub = sb.dataset.sub; store.set('mmh_daily_sub', S.sub); document.querySelectorAll('#subsel button').forEach(b => b.classList.toggle('on', b === sb)); const tx = $('#tx'); if (tx) tx.className = 'tx sub-' + S.sub; lastLine = -1; onTime(); return; }
    const c = e.target.closest('[data-tab]');
    if (c) { S.tab = c.dataset.tab; route(); }
  });
  $('#lang').onclick = () => { S.lang = S.lang === 'vi' ? 'en' : 'vi'; store.set('mmh_daily_lang', S.lang); paintLang(); route(); };
  const paintLang = () => { $('#lang').innerHTML = S.lang === 'vi' ? '<b>VI</b> · EN' : 'VI · <b>EN</b>'; $('#lang').title = S.lang === 'vi' ? 'Đang đọc tiêu đề tiếng Việt — bấm để chuyển tiếng Anh' : 'Reading English headlines — tap for Vietnamese'; };
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', e => {
    if (e.target.closest('input,textarea')) return;
    if (e.code === 'Space' && S.ep) { e.preventDefault(); audio.paused ? audio.play() : audio.pause(); }
    if (e.key === 'ArrowLeft' && S.ep && document.body.classList.contains('dark')) seekBy(-5);
    if (e.key === 'ArrowRight' && S.ep && document.body.classList.contains('dark')) seekBy(5);
  });

  async function boot() {
    paintLang();
    $('#view').innerHTML = '<div class="skel" style="height:44px;width:70%"></div><div class="skel"></div><div class="skel" style="width:85%"></div><div class="skel" style="width:60%"></div>';
    try { await loadIndex(); }
    catch { $('#view').innerHTML = '<div class="empty">Chưa có dữ liệu. Thử tải lại sau ít phút.</div>'; return; }
    await route();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.DAILY = { S, route, playDate };
  boot();
})();
