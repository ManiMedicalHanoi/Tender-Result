/* Bản tin Y tế & Chính sách — đọc data/news.json + data/docs.json (do GitHub Actions ghi mỗi ngày). Không cần thư viện ngoài. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const DAY = 864e5;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bare = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* chế độ riêng tư */ } },
  };
  const NOW = () => (window.__NEWS_NOW ? new Date(window.__NEWS_NOW) : new Date());
  const vnDate = d => new Date(d).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
  const vnTime = d => new Date(d).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
  const dayKey = d => new Date(new Date(d).getTime() + 7 * 36e5).toISOString().slice(0, 10);   // ngày theo giờ VN
  const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function ago(d) {
    const m = Math.round((NOW() - new Date(d)) / 6e4);
    if (m < 1) return 'vừa xong';
    if (m < 60) return m + ' phút trước';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' giờ trước';
    const dd = Math.round(h / 24);
    return dd <= 6 ? dd + ' ngày trước' : vnDate(d);
  }

  const S = {
    data: null, docs: [], tab: 'home', topic: '', range: 7, mmh: false, gov: false, src: '', q: '', dkind: '', limit: 60,
    read: new Set(store.get('mmh_news_read', [])), lastVisit: store.get('mmh_news_last', 0),
  };

  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2600); }

  // ── tải dữ liệu ──
  async function load() {
    $('#hl').innerHTML = '<div class="skel"></div><div class="skel" style="width:80%"></div><div class="skel" style="width:60%"></div>';
    try {
      const [n, d] = await Promise.all([
        fetch('data/news.json?t=' + Date.now(), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
        fetch('data/docs.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : { docs: [] }).catch(() => ({ docs: [] })),
      ]);
      S.data = n; S.docs = d.docs || [];
      for (const it of n.items) { it._k = bare([it.t, it.sum, it.src, it.ai?.s, (it.docs || []).join(' ')].join(' ')); it._t = +new Date(it.d); }
    } catch (e) {
      $('#hl').innerHTML = '<div class="empty">Chưa có dữ liệu bản tin. Lượt lấy tin đầu tiên sẽ chạy trong vài phút — thử tải lại trang sau.</div>';
      return;
    }
    const u = new Date(S.data.updated);
    const old = NOW() - u > 1.5 * DAY;
    $('#upd').className = 'upd' + (old ? ' old' : '');
    $('#upd').innerHTML = `Cập nhật <b>${vnTime(u)} · ${vnDate(u)}</b>`;
    $('#upd').title = old ? 'Đã hơn 1 ngày chưa lấy được tin mới — xem mục Nguồn tin' : 'Lần lấy tin gần nhất';
    if (!S.data.items.some(x => x.ai)) $('#how-ai').innerHTML += ' <i>(chưa bật)</i>';
    fillSources();
    readHash();
    render();
    store.set('mmh_news_last', Date.now());
  }

  const T = id => S.data.topics[id] || id;
  const isNew = it => S.lastVisit && +new Date(it.first || it.d) > S.lastVisit;

  // ── thẻ tin ──
  function itemHtml(it, big) {
    const tags = (it.tp || []).map(t => `<button class="tg" data-topic="${esc(t)}" type="button">${esc(T(t))}</button>`).join('');
    const nos = (it.docs || []).slice(0, 4).map(n => `<button class="tg no" data-doc="${esc(n)}" type="button" title="Xem văn bản ${esc(n)}">${esc(n)}</button>`).join('');
    const s = it.ai?.s || it.sum || '';
    return `<article class="it${S.read.has(it.id) ? ' read' : ''}${big ? ' big' : ''}" data-id="${it.id}">
      <div class="meta"><span class="src">${esc(it.src)}</span>${it.tier === 'gov' ? '<span class="badge gov">Cơ quan nhà nước</span>' : ''}
        <span>· ${esc(ago(it.d))}</span>${isNew(it) ? '<span class="badge new">Mới</span>' : ''}${it.kind === 'doc' ? '<span class="badge doc">Văn bản</span>' : ''}${it.draft ? '<span class="badge draft">Dự thảo</span>' : ''}${it.mmh ? '<span class="badge mmh">Liên quan MMH</span>' : ''}</div>
      <a class="t" href="${esc(it.u)}" target="_blank" rel="noopener noreferrer">${esc(it.t)}</a>
      ${s ? `<p class="s">${esc(s)}</p>` : ''}
      ${it.ai?.m ? `<p class="mm"><b>Ý nghĩa với MMH:</b> ${esc(it.ai.m)}</p>` : ''}
      ${tags || nos ? `<div class="tags">${nos}${tags}</div>` : ''}
      ${it.also?.length ? `<div class="also">Cũng đăng trên: ${esc(it.also.join(', '))}</div>` : ''}
      ${it.img && big !== 'noimg' ? `<img class="th" src="${esc(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
    </article>`;
  }

  // ── Hôm nay ──
  function renderHome() {
    const items = S.data.items, now = NOW();
    const in24 = items.filter(x => now - x._t <= DAY);
    const in7 = items.filter(x => now - x._t <= 7 * DAY);
    const docs7 = S.docs.filter(d => now - new Date(d.first) <= 7 * DAY);
    const cnt = (arr, t) => arr.filter(x => x.tp.includes(t)).length;
    const newSince = S.lastVisit ? items.filter(isNew).length : 0;
    const tiles = [
      { k: 'Tin mới 24 giờ', v: in24.length, s: newSince ? `<b>${newSince}</b> tin từ lần xem trước` : `${in7.length} tin trong 7 ngày`, go: () => setNews({ range: 1, topic: '' }) },
      { k: 'Văn bản pháp luật', v: docs7.length, s: '7 ngày qua · ' + S.docs.filter(d => d.draft && now - new Date(d.first) <= 30 * DAY).length + ' dự thảo / 30 ngày', go: () => go('docs') },
      { k: 'Đấu thầu & mua sắm', v: cnt(in7, 'dau-thau'), s: 'tin trong 7 ngày', go: () => setNews({ range: 7, topic: 'dau-thau' }) },
      { k: 'Thiết bị & vật tư y tế', v: cnt(in7, 'ttbyt'), s: 'tin trong 7 ngày', go: () => setNews({ range: 7, topic: 'ttbyt' }) },
    ];
    $('#tiles').innerHTML = tiles.map((t, i) => `<button class="tile" data-i="${i}" type="button"><span class="k">${t.k}</span><span class="v">${t.v}</span><span class="s">${t.s}</span></button>`).join('');
    $('#tiles').onclick = e => { const b = e.target.closest('.tile'); if (b) tiles[+b.dataset.i].go(); };

    // Đáng chú ý: 3 ngày gần nhất, điểm cao, ưu tiên liên quan MMH
    const hl = items.filter(x => now - x._t <= 3 * DAY).map(x => ({ x, w: x.sc + (x.mmh ? 3 : 0) + (x.ai?.lvl === 3 ? 3 : 0) - (now - x._t) / DAY }))
      .sort((a, b) => b.w - a.w).slice(0, 8).map(o => o.x);
    $('#hl').innerHTML = hl.length ? hl.map((x, i) => itemHtml(x, i < 2)).join('') : '<div class="empty">Chưa có tin nổi bật trong 3 ngày qua.</div>';
    $('#hl-hint').textContent = '3 ngày qua · ưu tiên tin liên quan MMH';
    S.hl = hl;

    // Văn bản mới
    const dm = S.docs.slice(0, 6);
    $('#dl-mini').innerHTML = dm.length ? `<div class="dl mini">${dm.map(d => docHtml(d, true)).join('')}</div>` : '<div class="empty">Chưa ghi nhận văn bản mới.</div>';

    // Biểu đồ chủ đề (7 ngày) — 1 màu, sắp theo số tin
    const tops = Object.keys(S.data.topics).map(id => ({ id, n: cnt(in7, id) })).sort((a, b) => b.n - a.n);
    const max = Math.max(1, ...tops.map(t => t.n));
    $('#ch-topic').innerHTML = tops.map(t => `<button class="hb" data-topic="${t.id}" type="button" data-tip="${esc(T(t.id))}: ${t.n} tin (7 ngày)">
      <span>${esc(T(t.id))}</span><span class="tr"><i class="${S.data.mmhTopics.includes(t.id) ? '' : 'm'}" style="width:${(t.n / max * 100).toFixed(1)}%"></i></span><span class="n">${t.n}</span></button>`).join('')
      + '<div class="hint" style="font-size:12px;color:var(--t3);margin-top:6px">Vạch đậm = nhóm liên quan MMH</div>';

    // Số tin mỗi ngày (14 ngày)
    const days = [];
    for (let i = 13; i >= 0; i--) days.push(dayKey(+now - i * DAY));
    const per = Object.fromEntries(days.map(d => [d, 0]));
    for (const x of items) { const k = dayKey(x.d); if (k in per) per[k]++; }
    const mx = Math.max(1, ...Object.values(per));
    $('#ch-day').innerHTML = days.map((d, i) => {
      const n = per[d], dt = new Date(d + 'T00:00:00Z');
      const lb = (i % 2 === 1 || i === 13) ? `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}` : '';
      return `<div class="c" data-tip="${WD[dt.getUTCDay()]} ${dt.getUTCDate()}/${dt.getUTCMonth() + 1}: ${n} tin"><em>${i === 13 || n === mx ? n : ''}</em><i style="height:${(n / mx * 100).toFixed(1)}%"></i><span>${lb}</span></div>`;
    }).join('');
  }

  // ── Tin tức ──
  function filtered() {
    const now = NOW(), q = bare(S.q).trim();
    return S.data.items.filter(x =>
      (now - x._t <= S.range * DAY) &&
      (!S.topic || x.tp.includes(S.topic)) &&
      (!S.mmh || x.mmh) && (!S.gov || x.tier === 'gov') &&
      (!S.src || x.src === S.src) &&
      (!q || q.split(/\s+/).every(w => x._k.includes(w))));
  }
  function renderNews() {
    const now = NOW();
    const base = S.data.items.filter(x => now - x._t <= S.range * DAY);
    const tc = id => base.filter(x => x.tp.includes(id)).length;
    $('#f-topic').innerHTML = `<button class="chip${S.topic ? '' : ' on'}" data-topic="" type="button">Tất cả<b>${base.length}</b></button>` +
      Object.keys(S.data.topics).map(id => `<button class="chip${S.topic === id ? ' on' : ''}" data-topic="${id}" type="button">${esc(T(id))}<b>${tc(id)}</b></button>`).join('');
    document.querySelectorAll('#f-range button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.range));
    $('#f-mmh').checked = S.mmh; $('#f-gov').checked = S.gov; $('#f-src').value = S.src;
    const list = filtered();
    $('#f-cnt').textContent = list.length + ' tin';
    if (!list.length) { $('#feed').innerHTML = '<div class="grp"><div class="empty">Không có tin phù hợp bộ lọc.</div></div>'; $('#more').hidden = true; return; }
    const show = list.slice(0, S.limit);
    let html = '', cur = '';
    const today = dayKey(now), yest = dayKey(+now - DAY);
    for (const x of show) {
      const k = dayKey(x.d);
      if (k !== cur) {
        if (cur) html += '</div>';
        cur = k;
        const dt = new Date(k + 'T00:00:00Z');
        const lab = k === today ? 'Hôm nay' : k === yest ? 'Hôm qua' : WD[dt.getUTCDay()];
        const n = list.filter(y => dayKey(y.d) === k).length;
        html += `<div class="grp"><div class="day">${lab} <span>${dt.getUTCDate()}/${dt.getUTCMonth() + 1}/${dt.getUTCFullYear()} · ${n} tin</span></div>`;
      }
      html += itemHtml(x);
    }
    html += '</div>';
    $('#feed').innerHTML = html;
    $('#more').hidden = list.length <= S.limit;
    $('#n-news').textContent = S.data.items.filter(x => now - x._t <= DAY).length || '';
  }

  // ── Văn bản ──
  const KINDS = ['Luật', 'Nghị định', 'Nghị quyết', 'Thông tư', 'Quyết định', 'Văn bản hợp nhất', 'Dự thảo'];
  function docHtml(d, mini) {
    const main = d.official || d.news?.[0]?.u || '#';
    const kd = `<span class="badge doc">${esc(d.kind)}</span>${d.draft ? '<span class="badge draft">Dự thảo</span>' : ''}${(d.topics || []).some(t => S.data.mmhTopics.includes(t)) ? '<span class="badge mmh">Liên quan MMH</span>' : ''}`;
    const sub = [d.issuer, d.eff ? 'Hiệu lực ' + d.eff.split('-').reverse().join('/') : '', d.news?.length && !mini ? `${d.news.length} bài báo: ` + d.news.slice(0, 3).map(n => `<a href="${esc(n.u)}" target="_blank" rel="noopener noreferrer">${esc(n.src)}</a>`).join(', ') : ''].filter(Boolean).join(' · ');
    return `<div class="dr"><div><div class="no"><a href="${esc(main)}" target="_blank" rel="noopener noreferrer">${esc(d.no)}</a></div><div class="kd">${kd}</div></div>
      <div><div class="ti">${esc(d.title || '')}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
      <div class="dt"><b>${vnDate(d.first)}</b>${d.official ? 'Cổng văn bản' : 'Báo chí nhắc tới'}</div></div>`;
  }
  function renderDocs() {
    const q = bare(S.q).trim();
    const all = S.docs.filter(d => !q || q.split(/\s+/).every(w => bare(d.no + ' ' + d.title + ' ' + d.kind + ' ' + (d.issuer || '')).includes(w)));
    const kc = k => k === 'Dự thảo' ? all.filter(d => d.draft).length : all.filter(d => d.kind === k).length;
    $('#d-kind').innerHTML = `<button data-k="" class="${S.dkind ? '' : 'on'}" type="button">Tất cả (${all.length})</button>` +
      KINDS.filter(k => kc(k)).map(k => `<button data-k="${k}" class="${S.dkind === k ? 'on' : ''}" type="button">${k} (${kc(k)})</button>`).join('');
    const list = all.filter(d => !S.dkind || (S.dkind === 'Dự thảo' ? d.draft : d.kind === S.dkind));
    $('#d-cnt').textContent = list.length + ' văn bản';
    $('#docs').innerHTML = list.length ? `<div class="dl">${list.slice(0, 300).map(d => docHtml(d)).join('')}</div>` : '<div class="dl"><div class="empty">Không có văn bản phù hợp.</div></div>';
    $('#n-docs').textContent = S.docs.filter(d => NOW() - new Date(d.first) <= 7 * DAY).length || '';
  }

  // ── Nguồn ──
  function fillSources() {
    const srcs = [...new Set(S.data.items.map(x => x.src))].sort((a, b) => a.localeCompare(b, 'vi'));
    $('#f-src').innerHTML = '<option value="">Mọi nguồn</option>' + srcs.map(s => `<option>${esc(s)}</option>`).join('');
    const st = S.data.sources || [];
    $('#src-list').innerHTML = st.map(s => `<div class="sr"><span class="dot${s.ok ? '' : ' bad'}" title="${s.ok ? 'Đọc được' : 'Lỗi'}"></span>
      <div><b>${esc(s.name)}</b> <span style="color:var(--t3);font-size:12.5px">${s.kind === 'gnews' ? '· qua Google News, chỉ giữ báo chính thống' : s.kind === 'web' ? '· đọc bảng văn bản mới' : '· RSS'}</span>${s.err ? `<div class="e">${esc(s.err)}</div>` : ''}</div>
      <div class="n">${s.kept} / ${s.items} tin</div></div>`).join('') +
      `<p class="note" style="margin-top:12px">Số bên phải: tin y tế được giữ / tổng tin đọc được ở lượt gần nhất. Danh sách tên miền chính thống và từ khoá nằm ở <code>tin-tuc/config.json</code>.</p>`;
  }

  function render() {
    if (!S.data) return;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + S.tab));
    if (S.tab === 'home') renderHome();
    if (S.tab === 'news') renderNews();
    if (S.tab === 'docs') renderDocs();
    // số trên tab
    $('#n-news').textContent = S.data.items.filter(x => NOW() - x._t <= DAY).length || '';
    $('#n-docs').textContent = S.docs.filter(d => NOW() - new Date(d.first) <= 7 * DAY).length || '';
  }

  // ── điều hướng (#news?topic=…) ──
  function writeHash() {
    const p = new URLSearchParams();
    if (S.tab === 'news') { if (S.topic) p.set('topic', S.topic); if (S.range !== 7) p.set('range', S.range); if (S.mmh) p.set('mmh', 1); }
    if (S.q) p.set('q', S.q);
    const h = '#' + S.tab + (p.toString() ? '?' + p : '');
    if (location.hash !== h) history.replaceState(null, '', S.tab === 'home' && !S.q ? location.pathname + location.search : h);
  }
  function readHash() {
    const [t, qs] = location.hash.slice(1).split('?');
    if (['home', 'news', 'docs', 'src'].includes(t)) S.tab = t;
    const p = new URLSearchParams(qs || '');
    if (p.has('topic')) S.topic = p.get('topic');
    if (p.has('range')) S.range = +p.get('range') || 7;
    if (p.has('mmh')) S.mmh = true;
    if (p.has('q')) { S.q = p.get('q'); $('#q').value = S.q; }
  }
  function go(tab) { S.tab = tab; S.limit = 60; writeHash(); render(); window.scrollTo({ top: 0 }); }
  function setNews(o) { Object.assign(S, o); go('news'); }

  // ── sự kiện ──
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.tab); };
  document.addEventListener('click', e => {
    const tp = e.target.closest('[data-topic]');
    if (tp && !tp.closest('#f-topic')) { e.preventDefault(); setNews({ topic: tp.dataset.topic, range: Math.max(S.range, 7) }); return; }
    if (tp) { S.topic = tp.dataset.topic; S.limit = 60; writeHash(); renderNews(); return; }
    const dc = e.target.closest('[data-doc]');
    if (dc) { S.q = dc.dataset.doc; $('#q').value = S.q; S.dkind = ''; go('docs'); return; }
    const g = e.target.closest('[data-go]');
    if (g) { go(g.dataset.go); return; }
    const a = e.target.closest('.it a.t');
    if (a) { const id = a.closest('.it').dataset.id; S.read.add(id); store.set('mmh_news_read', [...S.read].slice(-800)); a.closest('.it').classList.add('read'); }
  });
  $('#f-range').onclick = e => { const b = e.target.closest('button'); if (b) { S.range = +b.dataset.v; S.limit = 60; writeHash(); renderNews(); } };
  $('#f-mmh').onchange = e => { S.mmh = e.target.checked; writeHash(); renderNews(); };
  $('#f-gov').onchange = e => { S.gov = e.target.checked; renderNews(); };
  $('#f-src').onchange = e => { S.src = e.target.value; renderNews(); };
  $('#more').onclick = () => { S.limit += 60; renderNews(); };
  $('#d-kind').onclick = e => { const b = e.target.closest('button'); if (b) { S.dkind = b.dataset.k; renderDocs(); } };
  let qt;
  $('#q').addEventListener('input', e => {
    clearTimeout(qt);
    qt = setTimeout(() => { S.q = e.target.value; S.limit = 60; if (S.tab === 'home' || S.tab === 'src') S.tab = /\d+\/\d{4}/.test(S.q) ? 'docs' : 'news'; writeHash(); render(); }, 180);
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#q').focus(); $('#q').select(); }
    if (e.key === 'Escape' && document.activeElement === $('#q') && S.q) { $('#q').value = ''; S.q = ''; writeHash(); render(); }
  });
  window.addEventListener('hashchange', () => { readHash(); render(); });

  // Sao chép bản tin (dán vào Zalo / email)
  $('#copy-brief').onclick = async () => {
    if (!S.hl?.length) return;
    const lines = [`BẢN TIN Y TẾ & CHÍNH SÁCH — ${vnDate(NOW())}`, ''];
    S.hl.forEach((x, i) => {
      lines.push(`${i + 1}. ${x.t} (${x.src})`);
      if (x.ai?.s) lines.push('   ' + x.ai.s);
      if (x.ai?.m) lines.push('   → MMH: ' + x.ai.m);
      lines.push('   ' + x.u);
    });
    const docs = S.docs.filter(d => NOW() - new Date(d.first) <= 7 * DAY).slice(0, 5);
    if (docs.length) { lines.push('', 'VĂN BẢN MỚI (7 ngày):'); docs.forEach(d => lines.push(`- ${d.no} (${d.kind}): ${d.title || ''}`)); }
    lines.push('', 'Xem đủ: ' + location.href.split('#')[0]);
    try { await navigator.clipboard.writeText(lines.join('\n')); toast('Đã sao chép bản tin — dán vào Zalo / email'); }
    catch { toast('Trình duyệt không cho sao chép'); }
  };

  // Chú thích khi rê chuột lên biểu đồ
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; document.body.appendChild(tip);
  document.addEventListener('pointermove', e => {
    const el = e.target.closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const x = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + 'px'; tip.style.top = (e.clientY - 36) + 'px';
  });

  window.NEWS = { S, render, go };
  load();
})();
