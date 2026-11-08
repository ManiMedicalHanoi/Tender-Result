// MMH Daily — hàm dùng chung: đọc RSS, chữ tiếng Việt, ngày giờ, văn bản pháp luật.
import crypto from 'node:crypto';

export const DAY = 864e5;
const TONE = { 'oà': 'òa', 'oá': 'óa', 'oả': 'ỏa', 'oã': 'õa', 'oạ': 'ọa', 'oè': 'òe', 'oé': 'óe', 'oẻ': 'ỏe', 'oẽ': 'õe', 'oẹ': 'ọe', 'uỳ': 'ùy', 'uý': 'úy', 'uỷ': 'ủy', 'uỹ': 'ũy', 'uỵ': 'ụy' };
/** ' chữ thường có dấu chuẩn hoá ' — để so từ khoá theo cả từ */
export const norm = s => ' ' + String(s || '').normalize('NFC').toLowerCase()
  .replace(/o[àáảãạ]|o[èéẻẽẹ]|u[ỳýỷỹỵ]/g, m => TONE[m] || m)
  .replace(/[^\p{L}\p{N}\-\/%]+/gu, ' ').replace(/\s+/g, ' ') + ' ';
export const bare = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
export const tkey = s => bare(s).replace(/[^a-z0-9]+/g, '').slice(0, 70);
export const idOf = u => crypto.createHash('sha1').update(u).digest('hex').slice(0, 12);
/** có từ khoá (cả từ; cụm nhiều từ thì so chuỗi) */
export const hasKw = (n, kw) => { const k = norm(kw).trim(); return n.includes(' ' + k + ' ') || (k.includes(' ') && n.includes(k)); };

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const NAMED = { agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', egrave: 'è', eacute: 'é', ecirc: 'ê', igrave: 'ì', iacute: 'í', ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ugrave: 'ù', uacute: 'ú', yacute: 'ý', Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Igrave: 'Ì', Iacute: 'Í', Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Ugrave: 'Ù', Uacute: 'Ú', Yacute: 'Ý', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', laquo: '«', raquo: '»' };
export const dec = s => String(s || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const c = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return c ? String.fromCodePoint(c) : ''; }
  return ENT[e] ?? NAMED[e] ?? m;
});
const cdata = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
export const strip = s => dec(dec(cdata(s)).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const tag = (x, n) => { const m = x.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${n}>`, 'i')); return m ? m[1] : ''; };
const attr = (x, n, a) => { const m = x.match(new RegExp(`<${n}\\s[^>]*${a}=["']([^"']+)["']`, 'i')); return m ? dec(m[1]) : ''; };

/** Ngày: RFC / ISO / dd/MM/yyyy; có AM/PM ⇒ MM/dd/yyyy (Báo Chính phủ, Tuổi Trẻ). Không múi giờ ⇒ giờ VN. */
export function parseDate(s, fmt) {
  s = strip(s);
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|SA|CH)?)?/i);
  if (m) {
    const ap = (m[6] || '').toUpperCase();
    const us = fmt === 'mdy' || (fmt !== 'dmy' && (ap === 'AM' || ap === 'PM'));
    let [dd, mm] = us ? [+m[2], +m[1]] : [+m[1], +m[2]];
    if (mm > 12 && dd <= 12) [dd, mm] = [mm, dd];
    let h = +(m[4] || 0);
    if ((ap === 'PM' || ap === 'CH') && h < 12) h += 12;
    if ((ap === 'AM' || ap === 'SA') && h === 12) h = 0;
    return new Date(Date.UTC(+m[3], mm - 1, dd, h - 7, +(m[5] || 0)));
  }
  const d = new Date(s.replace(/GMT\+(\d)(?!\d)/, 'GMT+0$100').replace(/\s\+07$/, ' +0700'));
  return isNaN(d) ? null : d;
}

export function parseFeed(xml, fmt) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.map(b => {
    const rawDesc = cdata(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded') || tag(b, 'content'));
    const img = attr(b, 'enclosure', 'url') || attr(b, 'media:content', 'url') || attr(b, 'media:thumbnail', 'url') || attr(dec(rawDesc), 'img', 'src');
    return {
      title: strip(tag(b, 'title')),
      link: (strip(tag(b, 'link')) || attr(b, 'link', 'href')).trim(),
      desc: strip(rawDesc),
      date: parseDate(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'), fmt),
      img: /^https?:/.test(img) ? img : '',
      src: strip(tag(b, 'source')),
      srcUrl: attr(b, 'source', 'url'),
    };
  });
}

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 MMH-Daily/1.0';
export async function get(u, tries = 2) {
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
export const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
export const gnUrl = (q, lang) => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + (lang === 'en' ? '&hl=en-US&gl=US&ceid=US:en' : '&hl=vi&gl=VN&ceid=VN:vi');

// văn bản pháp luật
const DOC_RE = /(\d{1,4})\/(\d{4})\/([A-ZĐ]{1,6}(?:-[A-ZĐ0-9a-z]{1,10}){0,3})/g;
export function docKind(code) {
  const c = String(code).toUpperCase();
  if (/^VBHN/.test(c)) return 'Văn bản hợp nhất';
  if (/^NĐ-/.test(c)) return 'Nghị định';
  if (/^TT(LT)?-/.test(c)) return 'Thông tư';
  if (/^QĐ-/.test(c)) return 'Quyết định';
  if (/^NQ-/.test(c)) return 'Nghị quyết';
  if (/^CT-/.test(c)) return 'Chỉ thị';
  if (/^QH\d+$/.test(c)) return 'Luật';
  return 'Văn bản';
}
export function findDocs(text, now = new Date()) {
  const out = new Map();
  for (const m of String(text).matchAll(DOC_RE)) {
    const y = +m[2]; if (y < 2005 || y > now.getUTCFullYear() + 1) continue;
    const no = `${m[1]}/${m[2]}/${m[3]}`;
    out.set(no.toUpperCase(), { no, kind: docKind(m[3]), year: y });
  }
  return [...out.values()];
}
export const iso = d => new Date(d).toISOString();
/** yyyy-mm-dd theo giờ Việt Nam */
export const vnDay = d => new Date(+new Date(d) + 7 * 36e5).toISOString().slice(0, 10);
