// Bản tin Y tế & Chính sách — lấy tin hằng ngày (GitHub Actions, Node 22, không cần thư viện ngoài).
// Đọc RSS các báo chính thống / cơ quan nhà nước (tin-tuc/config.json) ⇒ lọc tin y tế ⇒ gắn chủ đề, số văn bản, điểm
// ⇒ ghi tin-tuc/data/news.json (45 ngày), tin-tuc/data/docs.json (sổ văn bản), tin-tuc/data/archive/yyyy-mm.json.
// Có ANTHROPIC_API_KEY ⇒ tóm tắt tin quan trọng bằng Claude (tools/news/summarize.mjs); không có thì bỏ qua.
// Chạy thử không mạng: node tools/news/fetch.mjs --fixtures <thư mục có *.xml>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'tin-tuc');
const DATA = path.join(DIR, 'data');
const CFG = JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8'));
const args = process.argv.slice(2);
const FIX = args.includes('--fixtures') ? args[args.indexOf('--fixtures') + 1] : '';
const NOW = process.env.NEWS_NOW ? new Date(process.env.NEWS_NOW) : new Date();
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 MMH-News/1.0';
const DAY = 864e5;
const DOCS_V = 2;

// ── chữ tiếng Việt: chuẩn hoá dấu (hoà / hòa, khoẻ / khỏe) để so từ khoá ──
const TONE = { 'oà': 'òa', 'oá': 'óa', 'oả': 'ỏa', 'oã': 'õa', 'oạ': 'ọa', 'oè': 'òe', 'oé': 'óe', 'oẻ': 'ỏe', 'oẽ': 'õe', 'oẹ': 'ọe', 'uỳ': 'ùy', 'uý': 'úy', 'uỷ': 'ủy', 'uỹ': 'ũy', 'uỵ': 'ụy' };
const norm = s => ' ' + String(s || '').normalize('NFC').toLowerCase()
  .replace(/o[àáảãạ]|o[èéẻẽẹ]|u[ỳýỷỹỵ]/g, m => TONE[m] || m)
  .replace(/[^\p{L}\p{N}\-\/]+/gu, ' ').replace(/\s+/g, ' ') + ' ';
const bare = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// ── XML / HTML ──
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const NAMED = { agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', egrave: 'è', eacute: 'é', ecirc: 'ê', igrave: 'ì', iacute: 'í', ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ugrave: 'ù', uacute: 'ú', yacute: 'ý', Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Igrave: 'Ì', Iacute: 'Í', Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Ugrave: 'Ù', Uacute: 'Ú', Yacute: 'Ý', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', laquo: '«', raquo: '»' };
const dec = s => String(s || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return c ? String.fromCodePoint(c) : ''; }
  return ENT[e] ?? NAMED[e] ?? m;
});
const cdata = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
const strip = s => dec(dec(cdata(s)).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const tag = (x, n) => { const m = x.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${n}>`, 'i')); return m ? m[1] : ''; };
const attr = (x, n, a) => { const m = x.match(new RegExp(`<${n}\\s[^>]*${a}=["']([^"']+)["']`, 'i')); return m ? dec(m[1]) : ''; };

// fmt 'mdy' = nguồn ghi tháng/ngày/năm (Báo Chính phủ); mặc định ngày/tháng/năm. Giờ Việt Nam nếu không ghi múi giờ.
function parseDate(s, fmt) {
  s = strip(s);
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|SA|CH)?)?/i);
  if (m) {
    const ap = (m[6] || '').toUpperCase();
    const us = fmt === 'mdy' || (fmt !== 'dmy' && (ap === 'AM' || ap === 'PM'));   // có AM/PM ⇒ kiểu Mỹ tháng/ngày
    let [dd, mm] = us ? [+m[2], +m[1]] : [+m[1], +m[2]];
    if (mm > 12 && dd <= 12) [dd, mm] = [mm, dd];
    let h = +(m[4] || 0);
    if ((ap === 'PM' || ap === 'CH') && h < 12) h += 12;
    if ((ap === 'AM' || ap === 'SA') && h === 12) h = 0;
    return new Date(Date.UTC(+m[3], mm - 1, dd, h - 7, +(m[5] || 0)));
  }
  const d = new Date(s.replace(/GMT\+(\d)(?!\d)/, 'GMT+0$100'));
  return isNaN(d) ? null : d;
}

function parseFeed(xml, fmt) {
  const out = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const rawDesc = cdata(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content'));
    let link = strip(tag(b, 'link')) || attr(b, 'link', 'href');
    const img = attr(b, 'enclosure', 'url') || attr(b, 'media:content', 'url') || attr(b, 'media:thumbnail', 'url') || attr(dec(rawDesc), 'img', 'src');
    out.push({
      title: strip(tag(b, 'title')),
      link: link.trim(),
      desc: strip(rawDesc),
      date: parseDate(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'), fmt),
      img: /^https?:/.test(img) ? img : '',
      src: strip(tag(b, 'source')),
      srcUrl: attr(b, 'source', 'url'),
    });
  }
  return out;
}

const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
function domainOf(u) {
  let h = host(u);
  while (h) { if (CFG.domains[h]) return h; const i = h.indexOf('.'); if (i < 0) break; h = h.slice(i + 1); }
  return '';
}

async function get(u, tries = 2) {
  if (FIX) {
    const f = path.join(FIX, crypto.createHash('md5').update(u).digest('hex').slice(0, 10) + '.xml');
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
    throw new Error('không có bản giả lập');
  }
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'application/rss+xml,application/xml,text/xml,text/html,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } catch (e) { err = e; if (i < tries - 1) await new Promise(r => setTimeout(r, 1500)); }
  }
  throw err;
}

// Tìm link RSS trên trang mục lục (rss.htm …) khớp chuyên mục cần.
async function discover(f) {
  const urls = new Set(f.urls || []);
  for (const page of f.discover || []) {
    try {
      const html = await get(page, 1);
      const re = new RegExp(f.match || 'y-?te|suc-?khoe', 'i');
      const base = new URL(page);
      for (const m of html.matchAll(/href=["']([^"']+?(?:\.rss|\/rss\/[^"']*))["']/gi)) {
        const u = new URL(dec(m[1]), base).href;
        if (re.test(u.replace(/^https?:\/\/[^/]+/, ''))) urls.add(u);
      }
      if (urls.size) break;
    } catch (e) { /* trang mục lục lỗi ⇒ dùng danh sách có sẵn */ }
  }
  return [...urls].slice(0, f.max || 6);
}

const gnUrl = q => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=vi&gl=VN&ceid=VN:vi';

// ── văn bản pháp luật ──
const DOC_RE = /(\d{1,4})\/(\d{4})\/([A-ZĐ]{1,6}(?:-[A-ZĐ0-9a-z]{1,10}){0,3})/g;
function docKind(code) {
  const c = code.toUpperCase();
  if (/^VBHN/.test(c)) return 'Văn bản hợp nhất';
  if (/^NĐ-/.test(c)) return 'Nghị định';
  if (/^TT(LT)?-/.test(c)) return 'Thông tư';
  if (/^QĐ-/.test(c)) return 'Quyết định';
  if (/^NQ-/.test(c)) return 'Nghị quyết';
  if (/^CT-/.test(c)) return 'Chỉ thị';
  if (/^QH\d+$/.test(c)) return 'Luật';
  if (/^UBTVQH/.test(c)) return 'Nghị quyết';
  if (/^L-CTN$/.test(c)) return 'Lệnh';
  return 'Văn bản';
}
const ISSUER = { CP: 'Chính phủ', TTG: 'Thủ tướng Chính phủ', BYT: 'Bộ Y tế', BTC: 'Bộ Tài chính', BKHĐT: 'Bộ Kế hoạch và Đầu tư', BNV: 'Bộ Nội vụ', BLĐTBXH: 'Bộ LĐ-TB&XH', BTP: 'Bộ Tư pháp', BCT: 'Bộ Công Thương', BKHCN: 'Bộ KH&CN', BXD: 'Bộ Xây dựng', BGDĐT: 'Bộ GD&ĐT', BQP: 'Bộ Quốc phòng', BCA: 'Bộ Công an', NHNN: 'Ngân hàng Nhà nước', BHXH: 'Bảo hiểm xã hội VN', UBTVQH: 'UBTV Quốc hội' };
function docIssuer(code) {
  const c = code.toUpperCase();
  if (/^QH\d+$/.test(c)) return 'Quốc hội';
  for (const p of c.split('-').slice(1).reverse()) { const k = p.replace(/\d+$/, ''); if (ISSUER[k]) return ISSUER[k]; }
  if (/^UBTVQH/.test(c)) return ISSUER.UBTVQH;
  return '';
}
function findDocs(text) {
  const out = new Map();
  for (const m of String(text).matchAll(DOC_RE)) {
    const y = +m[2]; if (y < 2005 || y > NOW.getUTCFullYear() + 1) continue;
    const no = `${m[1]}/${m[2]}/${m[3].replace(/-([a-z])/g, (x, c) => '-' + c)}`;
    out.set(no.toUpperCase(), { no, kind: docKind(m[3]), issuer: docIssuer(m[3]), year: y });
  }
  return [...out.values()];
}
const NEW_DOC = /ban hành|vừa ký|đã ký|có hiệu lực|hiệu lực từ|hiệu lực thi hành|thông qua|công bố|quy định mới|chính sách mới|sửa đổi|thay thế|hướng dẫn/;
const DRAFT = /dự thảo|lấy ý kiến|xin ý kiến|đề xuất/;
const EFFECT = /(?:có hiệu lực|hiệu lực thi hành|hiệu lực)\s*(?:kể\s*)?(?:từ\s*(?:ngày\s*)?)?(\d{1,2})\/(\d{1,2})\/(\d{4})/;

// ── chấm chủ đề ──
const CORE = CFG.core.map(k => norm(k).trimEnd() + ' ');
const TOPICS = CFG.topics.map(t => ({ ...t, n: t.kw.map(k => norm(k).trim()) }));
function classify(it, feed) {
  const t = norm(it.title + ' ' + it.desc);
  const tt = norm(it.title);
  const healthy = feed.health || CORE.some(k => t.includes(' ' + k.trim() + ' ') || t.includes(' ' + k.trim()));
  if (!healthy) return null;
  const topics = [];
  let score = 0;
  for (const tp of TOPICS) {
    const hit = tp.n.filter(k => t.includes(' ' + k + ' ') || (k.includes(' ') && t.includes(k)));
    if (!hit.length) continue;
    const inTitle = tp.n.some(k => tt.includes(' ' + k + ' ') || (k.includes(' ') && tt.includes(k)));
    topics.push(tp.id);
    score += tp.w * (inTitle ? 2 : 1);
  }
  const docs = findDocs(it.title + ' ' + it.desc);
  if (docs.length && !topics.includes('van-ban')) topics.unshift('van-ban');
  if (docs.length) score += 3;
  return { topics, score, docs };
}


// ── đọc thẳng cổng văn bản (bảng "văn bản mới") ──
const isHealth = t => { const n = norm(t); return CORE.some(k => n.includes(' ' + k.trim())); };
function scrapeVbcp(html, base) {
  const out = [];
  for (const row of html.split(/<tr[\s>]/i).slice(1)) {
    const code = strip((row.match(/class="code"[^>]*>([\s\S]*?)<\/span>/) || [])[1]);
    const title = strip((row.match(/class="substract"[^>]*>([\s\S]*?)<\/span>/) || [])[1]);
    const date = strip((row.match(/class="issued-date[^"]*"[^>]*>([\s\S]*?)<\/span>/) || [])[1]);
    const href = (row.match(/href='([^']*docid=\d+[^']*)'/) || row.match(/href="([^"]*docid=\d+[^"]*)"/) || [])[1];
    if (!code || !title || !href) continue;
    out.push({ code, title, date: parseDate(date), u: new URL(dec(href), base).href });
  }
  return out;
}
function scrapeLvn(html, base, slugs) {
  const out = [];
  const draft = /du-thao/.test(base);
  for (const m of html.matchAll(/class="doc-title"[^>]*>[\s\S]{0,200}?<a href="([^"]+)"[^>]*title="([^"]+)"/g)) {
    const href = dec(m[1]), title = dec(m[2]);
    const slug = (href.match(/^\/([^/]+)\//) || [])[1] || '';
    if (!slugs.includes(slug) && !isHealth(title)) continue;
    const no = findDocs(title)[0];
    out.push({ code: no ? no.no : '', title, date: null, u: new URL(href, base).href, draft, slug });
  }
  return out;
}
async function scrapeDocSites(status) {
  const docs = [];
  for (const s of CFG.docSites || []) {
    const st = { id: s.id, name: s.name, kind: 'web', urls: s.urls.length, ok: 0, items: 0, kept: 0, err: '' };
    for (const u of s.urls) {
      let html;
      try { html = await get(u); } catch (e) { st.err = (st.err ? st.err + '; ' : '') + `${u.replace(/^https?:\/\//, '').slice(0, 60)}: ${e.message}`; continue; }
      const rows = s.type === 'vbcp' ? scrapeVbcp(html, u) : scrapeLvn(html, u, s.slugs || []);
      if (rows.length) st.ok++;
      st.items += rows.length;
      for (const r of rows) {
        if (/UBND|HĐND/.test(r.code || r.title.slice(0, 40)) && r.slug !== 'y-te') continue;
        if (s.type === 'vbcp' && !isHealth(r.title) && !/đấu thầu|mua sắm|bảo hiểm y tế/i.test(r.title)) continue;
        st.kept++;
        docs.push({ ...r, site: s.id, src: s.name, dom: domainOf(u) || host(u) });
      }
    }
    status.push(st);
    console.log(`${st.ok ? 'OK ' : 'LỖI'} ${s.id.padEnd(8)} ${st.name.padEnd(22)} trang ${st.ok}/${st.urls} · văn bản ${st.items} · liên quan y tế ${st.kept}${st.err ? ' · ' + st.err : ''}`);
  }
  return docs;
}

const idOf = u => crypto.createHash('sha1').update(u).digest('hex').slice(0, 12);
const tkey = s => bare(s).replace(/[^a-z0-9]+/g, '').slice(0, 70);
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const iso = d => new Date(d).toISOString();

async function main() {
  fs.mkdirSync(path.join(DATA, 'archive'), { recursive: true });
  const prev = readJson(path.join(DATA, 'news.json'), { items: [] });
  const old = new Map(prev.items.map(x => [x.id, x]));
  const seenKey = new Map(prev.items.map(x => [tkey(x.t), x.id]));
  const status = [];
  const fresh = [];
  const since = NOW - CFG.keepDays * DAY;

  for (const f of CFG.feeds) {
    const urls = f.gnews ? [gnUrl(f.gnews)] : await discover(f);
    const st = { id: f.id, name: f.name, kind: f.gnews ? 'gnews' : 'rss', urls: urls.length, ok: 0, items: 0, kept: 0, err: '', why: {} };
    const why = k => (st.why[k] = (st.why[k] || 0) + 1);
    for (const u of urls) {
      let xml;
      try { xml = await get(u); } catch (e) { st.err = (st.err ? st.err + '; ' : '') + `${u.replace(/^https?:\/\//, '').slice(0, 60)}: ${e.message}`; continue; }
      const items = parseFeed(xml, f.datefmt);
      if (items.length) st.ok++;
      if (items[0] && !st.sample) st.sample = { raw: (xml.match(/<pubDate>([\s\S]{0,60}?)<\/pubDate>/i) || [])[1] || '', link: items[0].link.slice(0, 90), date: items[0].date && items[0].date.toISOString() };
      st.items += items.length;
      for (const it of items) {
        if (!it.title || !it.link) { why('thiếu link'); continue; }
        let srcDom = domainOf(it.link);
        if (f.gnews) {
          srcDom = domainOf(it.srcUrl);
          if (it.src) it.title = it.title.replace(new RegExp('\\s+-\\s+' + it.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '');
          it.desc = it.desc.replace(it.title, '').replace(it.src, '').trim();
        }
        if (!srcDom) { why('ngoài danh sách'); continue; }
        if (it.title.length < 25 || it.title === it.title.toUpperCase()) { why('tiêu đề rác'); continue; }   // chỉ nhận tên miền chính thống
        const d = it.date || NOW;
        if (d < since) { why('cũ'); continue; }
        if (d - NOW > DAY) { why('ngày lỗi'); continue; }
        const c = classify(it, f);
        if (!c) { why('không phải y tế'); continue; }
        const k = tkey(it.title);
        const id = idOf(it.link);
        const dup = seenKey.get(k);
        if (dup && dup !== id) {                      // trùng tiêu đề ⇒ thêm nguồn
          const x = old.get(dup) || fresh.find(y => y.id === dup);
          if (x) { const nm = CFG.domains[srcDom][0]; if (x.src !== nm && !(x.also || []).includes(nm)) (x.also ||= []).push(nm); }
          why('trùng'); continue;
        }
        seenKey.set(k, id);
        st.kept++;
        const o = old.get(id);
        const rec = {
          id, t: it.title, u: it.link, d: iso(d),
          src: CFG.domains[srcDom][0], dom: srcDom, tier: CFG.domains[srcDom][1],
          sum: it.desc.slice(0, 320), img: it.img || undefined,
          tp: c.topics, sc: c.score + (CFG.domains[srcDom][1] === 'gov' ? 2 : 0),
          docs: c.docs.length ? c.docs.map(x => x.no) : undefined,
          first: o?.first || iso(NOW),
          ai: o?.ai, also: o?.also,
        };
        rec.mmh = c.topics.some(t => CFG.mmhTopics.includes(t)) || undefined;
        if (o) old.set(id, { ...o, ...rec }); else fresh.push(rec);
      }
    }
    status.push(st);
    console.log(`${st.ok ? 'OK ' : 'LỖI'} ${f.id.padEnd(8)} ${st.name.padEnd(22)} kênh ${st.ok}/${st.urls} · tin ${st.items} · nhận ${st.kept} · loại ${JSON.stringify(st.why)}${st.err ? ' · ' + st.err : ''}`);
    if (process.env.NEWS_DEBUG) console.log('   mẫu', JSON.stringify(st.sample));
  }


  // Văn bản đọc thẳng từ cổng văn bản ⇒ cũng hiện trong dòng tin
  const siteDocs = await scrapeDocSites(status);
  for (const r of siteDocs) {
    const id = idOf(r.u);
    const k = tkey(r.title);
    if (seenKey.has(k) && seenKey.get(k) !== id) continue;
    seenKey.set(k, id);
    const o = old.get(id);
    const d = r.date || (o ? new Date(o.d) : NOW);
    if (d < since) continue;
    const t0 = r.code && !r.title.includes(r.code) ? `${docKind(r.code.split('/').pop())} ${r.code}: ${r.title}` : r.title;
    const c = classify({ title: t0, desc: '' }, { health: true }) || { topics: [], score: 0, docs: [] };
    if (!c.topics.includes('van-ban')) c.topics.unshift('van-ban');
    const rec = {
      id, t: t0, u: r.u, d: iso(d), src: r.src, dom: r.dom, tier: 'gov', kind: 'doc', draft: r.draft || undefined,
      sum: '', tp: c.topics, sc: c.score + 4, docs: c.docs.length ? c.docs.map(x => x.no) : (r.code ? [r.code] : undefined),
      first: o?.first || iso(NOW), ai: o?.ai,
    };
    rec.mmh = c.topics.some(t => CFG.mmhTopics.includes(t)) || undefined;
    if (o) old.set(id, { ...o, ...rec }); else fresh.push(rec);
  }

  let items = [...old.values(), ...fresh].filter(x => new Date(x.d) >= since);
  items.sort((a, b) => b.d.localeCompare(a.d));

  // Tóm tắt bằng Claude (nếu có khoá)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { summarize } = await import('./summarize.mjs');
      const n = await summarize(items, CFG);
      console.log(`Claude tóm tắt ${n} tin.`);
    } catch (e) { console.log('Bỏ qua tóm tắt: ' + e.message); }
  }

  // Sổ văn bản
  let docsPrev = readJson(path.join(DATA, 'docs.json'), { docs: [] });
  if (docsPrev.v !== DOCS_V) docsPrev = { docs: [] };          // đổi luật lập sổ ⇒ dựng lại từ tin
  const docs = new Map(docsPrev.docs.map(x => [x.no.toUpperCase(), x]));
  for (const it of items) {
    const txt = it.t + ' ' + (it.sum || '');
    const nt = norm(txt);
    let own = findDocs(it.t);                                   // chỉ văn bản nêu ở tiêu đề (văn bản chính của tin)
    if (it.kind === 'doc') own = own.slice(0, 1);
    for (const dd of own) {
      if (/UBND|HĐND/i.test(dd.no)) continue;                    // văn bản cấp tỉnh: bỏ
      if (dd.year < NOW.getUTCFullYear() - 1) continue;          // văn bản cũ chỉ được nhắc tới
      const k = dd.no.toUpperCase();
      const x = docs.get(k) || { ...dd, first: it.d, news: [] };
      if (it.d < x.first) x.first = it.d;
      if (!x.news.some(n => n.id === it.id)) x.news.push({ id: it.id, t: it.t, u: it.u, src: it.src, d: it.d });
      x.news.sort((a, b) => b.d.localeCompare(a.d)); x.news = x.news.slice(0, 8);
      if (DRAFT.test(nt)) x.draft = true;
      if (NEW_DOC.test(nt) && dd.year >= NOW.getUTCFullYear() - 1) x.fresh = true;
      const ef = txt.match(EFFECT); if (ef && findDocs(it.t).some(y => y.no.toUpperCase() === k)) x.eff = `${ef[3]}-${ef[2].padStart(2, '0')}-${ef[1].padStart(2, '0')}`;
      if (it.kind === 'doc') { x.official = it.u; x.signed = x.signed || it.d; if (it.draft) x.draft = true; }
      if (!x.title || (findDocs(it.t).some(y => y.no.toUpperCase() === k) && it.t.length > (x.title || '').length)) x.title = it.t;
      x.topics = [...new Set([...(x.topics || []), ...it.tp.filter(t => t !== 'van-ban')])];
      x.last = x.news[0].d;
      docs.set(k, x);
    }
  }
  const dkeep = NOW - CFG.docsKeepDays * DAY;
  const docList = [...docs.values()].filter(x => new Date(x.last) >= dkeep).sort((a, b) => b.last.localeCompare(a.last));

  // Ghi
  const topicNames = Object.fromEntries(CFG.topics.map(t => [t.id, t.name]));
  const out = { updated: iso(NOW), keepDays: CFG.keepDays, topics: topicNames, mmhTopics: CFG.mmhTopics, highlight: CFG.highlight, sources: status, items };
  fs.writeFileSync(path.join(DATA, 'news.json'), JSON.stringify(out));
  fs.writeFileSync(path.join(DATA, 'docs.json'), JSON.stringify({ v: DOCS_V, updated: iso(NOW), docs: docList }));
  const byMonth = {};
  for (const it of items) (byMonth[it.d.slice(0, 7)] ||= []).push(it);
  for (const [m, arr] of Object.entries(byMonth)) {
    const f = path.join(DATA, 'archive', m + '.json');
    const a = readJson(f, { month: m, items: [] });
    const map = new Map(a.items.map(x => [x.id, x]));
    for (const x of arr) map.set(x.id, { id: x.id, t: x.t, u: x.u, d: x.d, src: x.src, tp: x.tp, docs: x.docs, sc: x.sc, ai: x.ai?.s });
    a.items = [...map.values()].sort((p, q) => q.d.localeCompare(p.d));
    fs.writeFileSync(f, JSON.stringify(a));
  }
  const okSrc = status.filter(s => s.ok).length;
  console.log(`\nTổng: ${items.length} tin (${fresh.length} mới) · ${docList.length} văn bản · nguồn chạy ${okSrc}/${status.length}`);
  if (!okSrc) { console.error('Không đọc được nguồn nào.'); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });
