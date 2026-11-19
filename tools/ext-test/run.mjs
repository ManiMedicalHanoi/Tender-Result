// Chạy thử tiện ích "MMH Tải hồ sơ thầu" với muasamcong THẬT (GitHub Actions — máy Claude bị muasamcong chặn).
// Máy chủ tender-info giả (127.0.0.1:8899) + VNeGP Agent giả (127.0.0.1:1234, kiểm Origin) ⇒ in mọi file tiện ích gửi lên.
// Chạy: xvfb-run node tools/ext-test/run.mjs   (NO="IB2500491794 PL2500276110", AGENT=1|0, BACKLOG=1)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const EXT = path.resolve('theo-doi/tien-ich'), OUT = path.resolve('ext-out');
fs.mkdirSync(OUT, { recursive: true });
const NOS = (process.env.NO || 'IB2500491794 PL2500276110').split(/[ ,]+/).filter(Boolean);
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const jobs = NOS.map((no, i) => ({ key: 'k' + i, type: /^PL/.test(no) ? 'khmt' : 'kqdt', no, investor: '', name: no, info: {} }));
const R = { files: [], done: [], agentPut: [], hello: 0 };
const PDF = Buffer.from('%PDF-1.4\n' + 'x'.repeat(3000) + '\n%%EOF');

// máy chủ giả
http.createServer((req, res) => {
  let b = ''; req.on('data', d => b += d).on('end', () => {
    let p = {}; try { p = JSON.parse(b || '{}'); } catch (e) {}
    const a = p.action, out = x => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(x)); };
    if (p.tk !== 'test-tk') return out({ ok: false, code: 'AUTH', error: 'phiên sai' });
    if (a === 'botHello') { R.hello++; return out({ ok: true, n: jobs.length, ag: process.env.BACKLOG ? 1 : 0, me: 'Thử' }); }
    if (a === 'botNext') { const j = jobs.shift(); return out({ ok: true, jobs: j ? [j] : [] }); }
    if (a === 'botFile') { const kb = Math.round(p.b64.length * 0.75 / 1024), head = Buffer.from(p.b64.slice(0, 16), 'base64').toString('latin1').slice(0, 4);
      R.files.push({ hit: p.hit, name: p.name, sec: p.sec, kind: p.kind, kb, head }); say('  [máy chủ] botFile', p.hit, p.sec, p.name, kb + ' KB', JSON.stringify(head));
      fs.writeFileSync(path.join(OUT, p.name.replace(/[^\w. -]/g, '_')), Buffer.from(p.b64, 'base64')); return out({ ok: true, name: p.name, url: 'https://drive/x' }); }
    if (a === 'botDone') { const inf = JSON.parse(p.info || '{}'); R.done.push({ hit: p.hit, status: p.status, note: p.note, ag: (inf.agentFiles || []).length, fields: Object.keys(inf.fields || {}).length, kq: Object.keys(inf.kqFields || {}).length });
      say('  [máy chủ] botDone', p.hit, p.status, p.note, '· trường:', Object.keys(inf.fields || {}).length, '· KQ:', Object.keys(inf.kqFields || {}).length, '· cần Agent:', JSON.stringify((inf.agentFiles || []).map(a => a.name + '#' + a.fileId)).slice(0, 600));
      say('  [máy chủ] fields', JSON.stringify(inf.fields || {}).slice(0, 900)); return out({ ok: true, sum: 1 }); }
    if (a === 'botAgentList') return out({ ok: true, items: process.env.BACKLOG ? [{ hit: 'old', no: 'IB0000000001', files: [{ name: 'QĐ cũ.pdf', fileId: 'abc-123', tab: 'kq' }] }] : [] });
    if (a === 'botAgentPut') { R.agentPut.push({ orig: p.orig, err: p.err || '', kb: p.b64 ? Math.round(p.b64.length * 0.75 / 1024) : 0 }); say('  [máy chủ] botAgentPut', p.orig, p.err || 'OK'); return out({ ok: true }); }
    out({ ok: false, error: 'lệnh lạ ' + a });
  });
}).listen(8899, '127.0.0.1');

// Agent giả: chỉ nhận Origin muasamcong (giống Agent thật)
const AG = [];
if (process.env.AGENT !== '0') http.createServer((req, res) => {
  const o = req.headers.origin || '';
  const cors = { 'Access-Control-Allow-Origin': o || '*', 'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  AG.push(req.method + ' ' + req.url.slice(0, 90) + ' origin=' + o);
  if (!/fileId=/.test(req.url)) { res.writeHead(200, cors); return res.end('VNeGP'); }
  if (o !== 'https://muasamcong.mof.gov.vn') { res.writeHead(403, cors); return res.end('forbidden'); }
  res.writeHead(200, Object.assign({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="agent.pdf"' }, cors)); res.end(PDF);
}).listen(1234, '127.0.0.1');

const ctx = await chromium.launchPersistentContext(path.join(OUT, 'profile'), {
  headless: false, viewport: { width: 1366, height: 900 }, locale: 'vi-VN', acceptDownloads: true,
  args: ['--disable-extensions-except=' + EXT, '--load-extension=' + EXT, '--no-first-run'] });
let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 30000 });
say('tiện ích:', sw.url());
ctx.on('page', pg => { pg.on('console', m => { if (/error/i.test(m.type())) say('  [trang]', m.text().slice(0, 200)); }); });
await sw.evaluate(show => chrome.storage.local.set({ tk: 'test-tk', pic: 'Thử', api: 'http://127.0.0.1:8899/exec', show }), process.env.SHOW !== '0');

// app giả trên github.io? (kiểm app.js bằng trang thật của app) — mở trang app, xem thuộc tính data-mmh-ext
const app = await ctx.newPage();
await app.goto('https://manimedicalhanoi.github.io/Tender-Result/theo-doi/', { waitUntil: 'domcontentloaded' }).catch(e => say('app:', e.message));
await app.waitForTimeout(3000);
say('app thấy tiện ích:', await app.evaluate(() => document.documentElement.getAttribute('data-mmh-ext')).catch(() => '?'));

const shots = setInterval(async () => { for (const pg of ctx.pages()) if (/muasamcong/.test(pg.url())) await pg.screenshot({ path: path.join(OUT, 'live_' + Date.now() + '.png') }).catch(() => {}); }, 20000);
const t0 = Date.now();
await sw.evaluate(() => tick('thử')).catch(e => say('tick lỗi', e.message));
// lượt kế tự chạy sau 3 giây khi còn gói — chờ tới khi xong hết
for (let i = 0; i < 120 && (jobs.length || R.done.length < NOS.length); i++) {
  await new Promise(r => setTimeout(r, 5000));
  sw = ctx.serviceWorkers()[0] || sw;
  const st = await sw.evaluate(() => ({ busy: ST.busy, msg: ST.msg, job: ST.job })).catch(() => null);
  if (i % 6 === 0) say('… trạng thái', JSON.stringify(st));
  if (st && !st.busy && !jobs.length && R.done.length >= NOS.length) break;
  if (st && !st.busy && i > 3 && !jobs.length) { await sw.evaluate(() => tick('thử lại')).catch(() => {}); }
}
clearInterval(shots);
const log = await sw.evaluate(() => ST.log.slice().reverse()).catch(() => []);
say('NHẬT KÝ TIỆN ÍCH:\n' + log.join('\n'));
say('AGENT GIẢ nhận:\n' + AG.join('\n'));
say('KẾT QUẢ', JSON.stringify(R, null, 1));
say('Thời gian:', Math.round((Date.now() - t0) / 1000), 'giây');
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ R, log, AG }, null, 1));
await ctx.close();
process.exit(R.done.length ? 0 : 1);
