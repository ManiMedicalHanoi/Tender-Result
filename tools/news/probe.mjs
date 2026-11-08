// Dò nguồn tin lượt 2: RSS ứng viên + cấu trúc trang văn bản.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const get = async u => { const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) }); return [r.status, await r.text(), r.url]; };
const RSS = ['https://baochinhphu.vn/chinh-sach-moi.rss','https://baochinhphu.vn/y-te.rss','https://baochinhphu.vn/chinh-sach-va-cuoc-song.rss','https://baochinhphu.vn/phap-luat.rss','https://baochinhphu.vn/van-ban-moi.rss',
 'https://suckhoedoisong.vn/y-te.rss','https://suckhoedoisong.vn/thoi-su.rss','https://suckhoedoisong.vn/chinh-sach.rss','https://suckhoedoisong.vn/y-te/chinh-sach.rss',
 'https://www.vietnamplus.vn/rss/suckhoe-327.rss','https://www.vietnamplus.vn/rss/xahoi/yte-323.rss','https://nhandan.vn/rss/y-te-1309.rss','https://vtv.vn/rss/suc-khoe.rss','https://vtv.vn/rss/xa-hoi.rss','https://baodauthau.vn/rss/dau-thau-2.rss'];
for (const u of RSS) { try { const [s, t] = await get(u); console.log(`RSS ${s} items=${(t.match(/<item[\s>]/g)||[]).length} ${u}`); } catch (e) { console.log('RSS ERR ' + u + ' ' + e.message); } }
for (const u of ['https://vanban.chinhphu.vn/','https://vanban.chinhphu.vn/he-thong-van-ban','https://vbpl.vn/','https://vbpl.vn/pages/vbpq-moi.aspx','https://luatvietnam.vn/','https://luatvietnam.vn/van-ban-moi.html','https://luatvietnam.vn/y-te-37-f1.html','https://chinhphu.vn/he-thong-van-ban','https://moh.gov.vn/van-ban-quy-pham-phap-luat']) {
  try {
    const [s, t, ru] = await get(u);
    console.log(`\n#### ${u} ${s} ${ru} len=${t.length}`);
    const re = /\d{1,4}\/\d{4}\/[A-ZĐ]{1,6}(?:-[A-ZĐa-z0-9]{1,8}){0,3}/g; let m, n = 0, seen = new Set();
    while ((m = re.exec(t)) && n < 8) { if (seen.has(m[0])) continue; seen.add(m[0]); n++;
      console.log('  >> ' + t.slice(Math.max(0, m.index - 260), m.index + 260).replace(/\s+/g, ' ')); }
    const links = [...t.matchAll(/href="([^"]+)"/g)].map(x => x[1]).filter(h => /van-?ban|vbpq|ItemID|docid|\.htm/i.test(h)).slice(0, 25);
    console.log('  links: ' + links.join(' | '));
  } catch (e) { console.log(`\n#### ${u} ERR ${e.message}`); }
}
