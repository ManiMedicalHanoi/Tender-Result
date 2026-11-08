// Dò (tạm): RSS tiếng Anh / kinh tế, GitHub Models, giọng đọc.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const URLS = [
 'https://e.vnexpress.net/rss/news.rss','https://e.vnexpress.net/rss/business.rss','https://e.vnexpress.net/rss/life.rss',
 'https://tuoitrenews.vn/rss','https://tuoitrenews.vn/rss/news.rss','https://tuoitrenews.vn/rss/business.rss',
 'https://en.vietnamplus.vn/rss/home.rss','https://en.vietnamplus.vn/rss/business-311.rss','https://en.vietnamplus.vn/rss.html',
 'https://vietnamnews.vn/rss/home.rss','https://vietnamnews.vn/rss/economy.rss','https://vietnamnews.vn/rss/society.rss','https://vietnamnews.vn/rss/politics-laws.rss',
 'https://vir.com.vn/rss/home.rss','https://vir.com.vn/rss/investing.rss','https://en.nhandan.vn/rss/home.rss','https://english.vov.vn/rss/home.rss',
 'https://english.thesaigontimes.vn/feed/','https://hanoitimes.vn/rss/home.rss','https://theinvestor.vn/rss/home.rss','https://www.vietnam-briefing.com/news/feed',
 'https://news.google.com/rss/search?q=Vietnam+economy+when:2d&hl=en-US&gl=US&ceid=US:en',
 'https://news.google.com/rss/search?q=Vietnam+site:reuters.com+when:3d&hl=en-US&gl=US&ceid=US:en',
 'https://vnexpress.net/rss/kinh-doanh.rss','https://vnexpress.net/rss/the-gioi.rss','https://vneconomy.vn/rss/home.rss','https://vneconomy.vn/tai-chinh.rss','https://baodautu.vn/rss/home.rss','https://baochinhphu.vn/kinh-te.rss','https://baochinhphu.vn/chinh-tri.rss','https://baochinhphu.vn/xa-hoi.rss','https://baochinhphu.vn/thoi-su.rss','https://cafef.vn/home.rss','https://thesaigontimes.vn/feed/','https://tuoitre.vn/rss/kinh-doanh.rss','https://thanhnien.vn/rss/kinh-te.rss','https://nhandan.vn/rss/kinhte-1185.rss','https://nhandan.vn/rss/chinhtri-1171.rss','https://nhandan.vn/rss/xahoi-1211.rss',
];
for (const u of URLS) {
  try { const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) }); const t = await r.text();
    const n = (t.match(/<item[\s>]/g) || []).length; const t1 = ((t.match(/<item[\s\S]*?<title>([\s\S]*?)<\/title>/) || [])[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').slice(0, 70);
    const pd = ((t.match(/<pubDate>([\s\S]{0,40}?)<\/pubDate>/) || [])[1] || '');
    const rss = n ? '' : [...new Set([...t.matchAll(/href=["']([^"']+?\.rss|[^"']*\/rss\/[^"']*|[^"']*\/feed\/?)["']/gi)].map(m => m[1]))].slice(0, 25).join(' | ');
    console.log(`${r.status} n=${n} ${u}  [${pd}] ${t1} ${rss ? '\n    links: ' + rss : ''}`);
  } catch (e) { console.log(`ERR ${u} ${e.message}`); }
}
// GitHub Models
const tk = process.env.GITHUB_TOKEN;
try {
  const c = await fetch('https://models.github.ai/catalog/models', { headers: { authorization: 'Bearer ' + tk } });
  const j = await c.json(); console.log('\nCATALOG', c.status, Array.isArray(j) ? j.map(m => m.id).join(', ') : JSON.stringify(j).slice(0, 300));
} catch (e) { console.log('CATALOG ERR', e.message); }
for (const model of ['openai/gpt-4.1-mini', 'openai/gpt-4o-mini', 'openai/gpt-4.1']) {
  try {
    const r = await fetch('https://models.github.ai/inference/chat/completions', { method: 'POST', headers: { authorization: 'Bearer ' + tk, 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Say hello in one short English sentence and translate it to Vietnamese.' }], max_tokens: 60 }) });
    const j = await r.json(); console.log('MODEL', model, r.status, JSON.stringify(j.choices?.[0]?.message?.content || j).slice(0, 300), JSON.stringify(r.headers.get('x-ratelimit-remaining-requests')));
  } catch (e) { console.log('MODEL ERR', model, e.message); }
}
