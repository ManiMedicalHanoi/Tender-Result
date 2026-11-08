// MMH Daily — dịch máy miễn phí (Google Translate, không cần khoá). Gom nhiều đoạn vào 1 lần gọi, gọi giãn, thử lại khi bị giới hạn.
// Không chắc chắn lâu dài (địa chỉ không chính thức) ⇒ lỗi thì trả về rỗng, app vẫn chạy với tin gốc.
const SEP = '\n¶\n';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function call(text, sl, tl) {
  const endpoints = [
    () => fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: 'q=' + encodeURIComponent(text), signal: AbortSignal.timeout(20000) })
      .then(async r => { if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); return j[0].map(p => p[0]).join(''); }),
    () => fetch(`https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: 'q=' + encodeURIComponent(text), signal: AbortSignal.timeout(20000) })
      .then(async r => { if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); return Array.isArray(j) ? (Array.isArray(j[0]) ? j[0][0] : j[0]) : j.sentences?.map(s => s.trans).join(''); }),
  ];
  let err;
  for (let i = 0; i < 6; i++) {
    try { const out = await endpoints[i % 2](); if (out) return out; } catch (e) { err = e; }
    await sleep(1500 * (i + 1));
  }
  throw err || new Error('không dịch được');
}

/** texts: mảng chuỗi ⇒ mảng bản dịch (cùng thứ tự; đoạn lỗi = '') */
export async function translate(texts, sl, tl) {
  const out = new Array(texts.length).fill('');
  let batch = [], size = 0, ok = 0;
  const flush = async () => {
    if (!batch.length) return;
    try {
      const res = await call(batch.map(b => b.t).join(SEP), sl, tl);
      const parts = res.split(/\s*¶\s*/);
      if (parts.length === batch.length) { batch.forEach((b, i) => { out[b.i] = parts[i].trim(); }); ok += batch.length; }
      else for (const b of batch) { try { out[b.i] = (await call(b.t, sl, tl)).trim(); ok++; } catch { /* bỏ */ } await sleep(700); }
    } catch (e) { console.log('  dịch lỗi: ' + e.message); }
    batch = []; size = 0;
    await sleep(900);
  };
  for (let i = 0; i < texts.length; i++) {
    const t = String(texts[i] || '').replace(/¶/g, ' ').trim();
    if (!t) continue;
    if (size + t.length > 3500) await flush();
    batch.push({ i, t }); size += t.length + 3;
  }
  await flush();
  return { out, ok };
}

/** Dịch các tin của số báo: tin Việt ⇒ thêm h_en / s_en, tin Anh ⇒ thêm h_vi / s_vi (đánh dấu mt = dịch máy). */
export async function translateStories(stories) {
  const vi = stories.filter(x => x.lang === 'vi' && !x.h_en);
  const en = stories.filter(x => x.lang === 'en' && !x.h_vi);
  let n = 0;
  if (vi.length) {
    const { out } = await translate(vi.flatMap(x => [x.t, x.sum || '']), 'vi', 'en');
    vi.forEach((x, i) => { if (out[2 * i]) { x.h_en = out[2 * i]; x.s_en = out[2 * i + 1] || undefined; x.mt = true; n++; } });
  }
  if (en.length) {
    const { out } = await translate(en.flatMap(x => [x.t, x.sum || '']), 'en', 'vi');
    en.forEach((x, i) => { if (out[2 * i]) { x.h_vi = out[2 * i]; x.s_vi = out[2 * i + 1] || undefined; x.mt = true; n++; } });
  }
  return n;
}
