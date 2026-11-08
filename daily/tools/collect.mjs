// MMH Daily — gom tin: RSS báo chính thống (Việt + Anh) + Google News + cổng văn bản ⇒ data/pool.json (4 ngày gần nhất).
// Mỗi tin: mảng (health/economy/politics/society), nhãn chuyên sâu y tế (tender/policy/invest/hospital/device), điểm.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAY, norm, hasKw, tkey, idOf, parseFeed, parseDate, get, host, gnUrl, strip, dec, findDocs, iso } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const NOW = process.env.DAILY_NOW ? new Date(process.env.DAILY_NOW) : new Date();
const POOL = path.join(ROOT, 'data', 'pool.json');

function trustedName(u) {
  let h = host(u);
  while (h) { if (CFG.trusted[h]) return [h, CFG.trusted[h]]; const i = h.indexOf('.'); if (i < 0) break; h = h.slice(i + 1); }
  return null;
}
const KW = Object.fromEntries(Object.entries(CFG.kw).map(([k, v]) => [k, v]));
const count = (n, list) => list.reduce((s, k) => s + (hasKw(n, k) ? 1 : 0), 0);
/** bỏ tiền tố nguồn ở đầu mô tả: "SKĐS - ", "(Chinhphu.vn) - ", "TTO - ", "VTV.vn - "… */
const dePrefix = s => String(s || '').replace(/^\s*\(?[\p{L}\d&.\s]{2,22}\)?\s*[-–—:]\s+/u, m => (/\s\S+\s\S+\s\S+/.test(m.trim()) ? m : '')).trim();
const CRIME = ['tạm giữ', 'khởi tố', 'bắt giữ', 'truy nã', 'sàm sỡ', 'cướp', 'trộm', 'giết', 'án mạng', 'lừa đảo', 'arrested', 'murder', 'robbery'];

function classify(it, feed) {
  const n = norm(it.title + ' ' + it.desc), nt = norm(it.title);
  const health = count(n, CFG.health_core) + count(nt, CFG.health_core);
  const sc = {
    health: health * 2 + (feed.sec === 'health' ? 3 : 0),
    economy: count(n, KW.economy) + (feed.sec === 'economy' ? 3 : 0),
    politics: count(n, KW.politics) + (feed.sec === 'politics' ? 3 : 0),
    society: count(n, KW.society) + (feed.sec === 'society' ? 3 : 0),
  };
  let sec = Object.entries(sc).sort((a, b) => b[1] - a[1])[0];
  if (sec[1] <= 0) return null;
  if (health >= 2 || feed.sec === 'health') sec = ['health', Math.max(sc.health, 2)];   // có nội dung y tế rõ ⇒ ưu tiên mảng Y tế
  const tags = [];
  const crime = count(n, CRIME) > 0;
  if (sec[0] === 'health' && !crime) {
    for (const t of ['health_tender', 'health_policy', 'public_invest', 'hospital', 'device']) if (count(n, KW[t])) tags.push(t.replace('health_', ''));
  } else if (count(n, KW.public_invest)) tags.push('invest');
  const docs = findDocs(it.title + ' ' + it.desc, NOW).map(d => d.no);
  if (docs.length && !tags.includes('policy')) tags.push('policy');
  // điểm: mảng + chiều sâu y tế + văn bản + nguồn
  let score = (crime ? -2 : 0) + CFG.sections[sec[0]].w + Math.min(sec[1], 6) * 0.5 + tags.length * 1.5 + (docs.length ? 2 : 0) + (count(nt, KW[sec[0] === 'health' ? 'health_tender' : 'economy']) ? 1 : 0);
  return { sec: sec[0], tags, docs, score };
}

async function main() {
  fs.mkdirSync(path.dirname(POOL), { recursive: true });
  let prev = { items: [] };
  try { prev = JSON.parse(fs.readFileSync(POOL, 'utf8')); } catch { /* lần đầu */ }
  const since = NOW - CFG.keepDays * DAY;
  const byId = new Map(prev.items.filter(x => new Date(x.d) >= since).map(x => [x.id, x]));
  const byKey = new Map([...byId.values()].map(x => [tkey(x.t), x.id]));
  const status = [];

  for (const f of CFG.feeds) {
    const urls = f.gnews ? f.gnews.map(q => gnUrl(q, f.lang)) : f.urls;
    const st = { id: f.id, lang: f.lang, ok: 0, n: 0, kept: 0, err: [] };
    for (const u of urls) {
      let xml;
      try { xml = await get(u); } catch (e) { st.err.push(u.replace(/^https?:\/\//, '').slice(0, 50) + ': ' + e.message); continue; }
      const items = parseFeed(xml, f.datefmt);
      if (items.length) st.ok++;
      st.n += items.length;
      for (const it of items) {
        if (!it.title || !it.link) continue;
        const tn = trustedName(f.gnews ? it.srcUrl : it.link);
        if (!tn) continue;
        if (f.gnews && it.src) { it.title = it.title.replace(new RegExp('\\s+-\\s+' + it.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), ''); it.desc = ''; }
        if (it.title.length < 25 || it.title === it.title.toUpperCase()) continue;
        const d = it.date || NOW;
        if (d < since || d - NOW > DAY / 2) continue;
        const c = classify(it, f);
        if (!c) continue;
        const id = idOf(it.link), k = tkey(it.title);
        if (byKey.has(k) && byKey.get(k) !== id) { const x = byId.get(byKey.get(k)); if (x && !x.also?.includes(tn[1]) && x.src !== tn[1]) (x.also ||= []).push(tn[1]); continue; }
        byKey.set(k, id);
        const o = byId.get(id);
        byId.set(id, { ...(o || {}), id, t: it.title, u: it.link, d: iso(d), src: tn[1], dom: tn[0], lang: f.lang,
          sum: dePrefix((it.desc || '').replace(it.title, '')).slice(0, 400) || undefined, img: it.img || o?.img || undefined,
          sec: c.sec, tags: c.tags.length ? c.tags : undefined, docs: c.docs.length ? c.docs : undefined, sc: +c.score.toFixed(2), first: o?.first || iso(NOW) });
        st.kept++;
      }
    }
    status.push(st);
    console.log(`${st.ok ? 'OK ' : 'LỖI'} ${f.id.padEnd(8)} ${f.lang} tin ${st.n} · nhận ${st.kept}${st.err.length ? ' · ' + st.err.join('; ') : ''}`);
  }

  // Văn bản mới của Chính phủ (y tế / đấu thầu / đầu tư công)
  for (const s of CFG.docSites || []) {
    try {
      const html = await get(s.url);
      let kept = 0;
      for (const row of html.split(/<tr[\s>]/i).slice(1)) {
        const code = strip((row.match(/class="code"[^>]*>([\s\S]*?)<\/span>/) || [])[1]);
        const title = strip((row.match(/class="substract"[^>]*>([\s\S]*?)<\/span>/) || [])[1]);
        const date = parseDate(strip((row.match(/class="issued-date[^"]*"[^>]*>([\s\S]*?)<\/span>/) || [])[1]), 'dmy');
        const href = (row.match(/href='([^']*docid=\d+[^']*)'/) || [])[1];
        if (!code || !title || !href || !date || date < since) continue;
        const n = norm(title);
        const sec = count(n, CFG.health_core) ? 'health' : (count(n, KW.public_invest) || count(n, KW.economy)) ? 'economy' : null;
        if (!sec || /UBND|HĐND|VBHN/.test(code)) continue;
        const u = new URL(dec(href), s.url).href, id = idOf(u);
        byId.set(id, { ...(byId.get(id) || {}), id, t: `${code}: ${title}`, u, d: iso(date), src: s.name, dom: host(s.url), lang: 'vi', sec, kind: 'doc',
          tags: ['policy'], docs: [code], sc: CFG.sections[sec].w + 4, first: byId.get(id)?.first || iso(NOW) });
        kept++;
      }
      status.push({ id: s.id, lang: 'vi', ok: 1, n: 0, kept, err: [] });
      console.log(`OK  ${s.id.padEnd(8)} vi văn bản liên quan ${kept}`);
    } catch (e) { status.push({ id: s.id, lang: 'vi', ok: 0, n: 0, kept: 0, err: [e.message] }); console.log(`LỖI ${s.id} ${e.message}`); }
  }

  const items = [...byId.values()].filter(x => new Date(x.d) >= since).sort((a, b) => b.d.localeCompare(a.d));
  fs.writeFileSync(POOL, JSON.stringify({ updated: iso(NOW), status, items }));
  const by = {}; for (const x of items) by[x.sec + '/' + x.lang] = (by[x.sec + '/' + x.lang] || 0) + 1;
  console.log(`\nKho tin: ${items.length} · ${JSON.stringify(by)}`);
  if (!status.some(s => s.ok)) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
