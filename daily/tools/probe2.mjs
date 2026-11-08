// Dò (tạm): AI miễn phí của GitHub (2 địa chỉ) + dịch máy Google miễn phí.
const tk = process.env.GITHUB_TOKEN;
const body = JSON.stringify({ model: 'openai/gpt-4.1-mini', messages: [{ role: 'user', content: 'Translate to English: Bộ Y tế ban hành thông tư mới về đấu thầu thuốc.' }], max_tokens: 60 });
for (const [u, h, b] of [
  ['https://models.github.ai/inference/chat/completions', { authorization: 'Bearer ' + tk, 'content-type': 'application/json', accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' }, body],
  ['https://models.inference.ai.azure.com/chat/completions', { authorization: 'Bearer ' + tk, 'content-type': 'application/json' }, body.replace('openai/gpt-4.1-mini', 'gpt-4o-mini')],
  ['https://models.github.ai/catalog/models', { authorization: 'Bearer ' + tk, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' }, null],
]) {
  try { const r = await fetch(u, { method: b ? 'POST' : 'GET', headers: h, body: b }); const t = await r.text();
    console.log('AI', r.status, u, JSON.stringify([...r.headers].filter(([k]) => /ratelimit|content-type|x-/.test(k)).slice(0, 8)), t.slice(0, 300)); }
  catch (e) { console.log('AI ERR', u, e.message); }
}
const q = 'Bộ Y tế ban hành thông tư mới về đấu thầu thuốc, có hiệu lực từ ngày 1/1/2027. Bệnh viện Bạch Mai đề xuất đầu tư 2.000 tỷ đồng mua trang thiết bị y tế.';
for (const u of ['https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q=' + encodeURIComponent(q),
                 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=vi&tl=en&q=' + encodeURIComponent(q)]) {
  try { const r = await fetch(u); const t = await r.text(); console.log('MT', r.status, u.slice(0, 50), t.slice(0, 400)); } catch (e) { console.log('MT ERR', e.message); }
}
// 30 câu liên tiếp: có bị chặn không
let ok = 0; for (let i = 0; i < 30; i++) { const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q=' + encodeURIComponent(q + ' ' + i)); if (r.ok) ok++; }
console.log('MT 30 lượt liên tiếp, thành công', ok);
