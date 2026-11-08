// Dò nguồn tin (chạy trên GitHub Actions): trạng thái HTTP + link RSS tìm được trên trang.
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : [
  'https://baochinhphu.vn/rss.htm','https://baochinhphu.vn/home.rss','https://baochinhphu.vn/rss/home.rss',
  'https://suckhoedoisong.vn/rss.htm','https://suckhoedoisong.vn/home.rss',
  'https://moh.gov.vn/','https://moh.gov.vn/rss','https://moh.gov.vn/web/guest/rss',
  'https://vanban.chinhphu.vn/','https://chinhphu.vn/','https://vbpl.vn/',
  'https://thuvienphapluat.vn/rss.aspx','https://thuvienphapluat.vn/','https://luatvietnam.vn/','https://luatvietnam.vn/rss.html',
  'https://vnexpress.net/rss','https://vnexpress.net/rss/suc-khoe.rss','https://vnexpress.net/rss/phap-luat.rss',
  'https://tuoitre.vn/rss.htm','https://tuoitre.vn/rss/suc-khoe.rss',
  'https://thanhnien.vn/rss.html','https://thanhnien.vn/rss/suc-khoe.rss',
  'https://dantri.com.vn/rss.htm','https://dantri.com.vn/rss/suc-khoe.rss',
  'https://nhandan.vn/rss.html','https://www.vietnamplus.vn/rss.html','https://vtv.vn/rss.htm',
  'https://baodauthau.vn/rss.html','https://baodauthau.vn/','https://muasamcong.mpi.gov.vn/',
  'https://dangcongsan.vn/rss.html','https://www.qdnd.vn/rss','https://laodong.vn/rss.html','https://plo.vn/rss.html',
  'https://news.google.com/rss/search?q=site:moh.gov.vn&hl=vi&gl=VN&ceid=VN:vi',
  'https://news.google.com/rss/search?q=ngh%E1%BB%8B+%C4%91%E1%BB%8Bnh+y+t%E1%BA%BF+when:7d&hl=vi&gl=VN&ceid=VN:vi',
];
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
for (const u of PAGES) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    const t = await r.text();
    const items = (t.match(/<item[\s>]/g) || []).length + (t.match(/<entry[\s>]/g) || []).length;
    const rss = [...new Set([...t.matchAll(/(?:href|src)=["']([^"']+?\.rss[^"']*|[^"']*\/rss\/[^"']*)["']/gi)].map(m => m[1]))];
    const t1 = (t.match(/<item[\s\S]*?<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    console.log(`\n## ${u}\n  ${r.status} ${r.url !== u ? '→ ' + r.url : ''} len=${t.length} items=${items} ${t1 ? 'first=' + t1.replace(/<!\[CDATA\[|\]\]>/g, '').slice(0, 90) : ''}`);
    if (rss.length) console.log('  rss: ' + rss.slice(0, 80).join(' | '));
  } catch (e) { console.log(`\n## ${u}\n  ERR ${e.message}`); }
}
