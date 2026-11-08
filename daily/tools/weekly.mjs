// MMH Daily — BẢN TIN NỘI BỘ Chủ nhật: gom dữ liệu tuần (thứ Hai → Chủ nhật) từ các app nội bộ (chỉ đọc) ⇒ viết bản tin + kịch bản podcast
// ⇒ ghi bản RÕ vào thư mục tạm NGOÀI repo (WEEKLY_OUT) để audio.py tạo giọng ⇒ seal.mjs mã hoá rồi mới đưa vào repo.
// KHÔNG in tên người / khách hàng ra log (log GitHub Actions của kho công khai ai cũng xem được) — chỉ in số đếm.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOWS_INTERNAL, GLOSSARY } from './shows.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')).internal;
const NOW = process.env.DAILY_NOW ? new Date(process.env.DAILY_NOW) : new Date();
const vn = d => new Date(+d + 7 * 36e5);
const ymd = d => vn(d).toISOString().slice(0, 10);
// tuần kết thúc ở Chủ nhật gần nhất (hôm nay nếu là Chủ nhật)
const END = process.env.WEEK_END || (() => { const d = vn(NOW); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); })();
const START = (() => { const d = new Date(END + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 6); return d.toISOString().slice(0, 10); })();
const OD_FROM = (() => { const d = new Date(START + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 28); return d.toISOString().slice(0, 10); })();   // quá hạn: chỉ xét 4 tuần gần nhất
const NEXT_END = (() => { const d = new Date(END + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 7); return d.toISOString().slice(0, 10); })();
const OUT = process.env.WEEKLY_OUT || path.join(process.env.RUNNER_TEMP || '/tmp', 'mmh-weekly');
const inWeek = s => s && s >= START && s <= END;
const day = v => { const s = String(v || '').trim(); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]; m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
const S = v => String(v ?? '').trim();
const DONE = /done|complete|hoàn thành|xong|finished/i;

async function getJson(base, params, tries = 3) {
  const u = base + '?' + new URLSearchParams(params);
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(90000) });
      const t = await r.text();
      const j = JSON.parse(t.replace(/^[\w$.]+\(([\s\S]*)\);?\s*$/, '$1'));
      if (j && j.ok === false) throw new Error(j.error || j.code || 'lỗi');
      return j;
    } catch (e) { err = e; await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
  }
  throw err;
}

// ── 1. Report Hub: việc của các phòng ban ──
async function departments() {
  const out = [];
  for (const d of CFG.reportHub) {
    try {
      const j = await getJson(d.url, { action: 'weekly', fresh: 1 });
      const keys = j.keyTasks || [];
      const dep = { id: d.id, name: d.name, done: 0, overdue: 0, notUpdated: 0, upcoming: 0, highlights: [], events: [], trips: [], nextWeek: [] };
      for (const k of keys) {
        const rows = (k.subs || []).length ? k.subs : [k];        // key có việc con ⇒ chỉ đếm việc con (tránh đếm 2 lần)
        const isEvent = /event|sự kiện/i.test(S(k.type)) || /^E/.test(S(k.vSrc));
        for (const r of rows) {
          const name = S(r.subTask || r.name) || S(r.keyTask);
          if (!name) continue;
          const due = day(r.revised) || day(r.planned), act = day(r.actual), st = S(r.status);
          if (S(r.vSrc) === 'trip' || /^trip/i.test(S(r.vSrc))) { if (inWeek(day(r.start)) || inWeek(due)) dep.trips.push({ pic: S(r.pic), what: name }); continue; }
          if (inWeek(act) || (DONE.test(st) && inWeek(due))) {
            dep.done++;
            const res = S(r.result);
            if (res.length > 25) dep.highlights.push({ key: S(k.keyTask), task: name, pic: S(r.pic), result: res.slice(0, 320), priority: !!r.priority });
            if (isEvent) dep.events.push({ name: S(k.keyTask), task: name, pic: S(r.pic), status: 'done' });
          } else if (due && due >= OD_FROM && due < END && !DONE.test(st) && !act && !/cancel|huỷ|hủy|skip|bỏ qua/i.test(st)) {
            // trạng thái trống + 0% ⇒ "chưa cập nhật" (thường là dòng việc mẫu của sự kiện), không gộp vào quá hạn thật
            if (!st && !(+r.progress > 0)) dep.notUpdated++; else dep.overdue++;
          }
          if (due > END && due <= NEXT_END && !DONE.test(st)) { dep.upcoming++; if (dep.nextWeek.length < 8) dep.nextWeek.push({ task: name, pic: S(r.pic), due, event: isEvent }); }
          if (isEvent && inWeek(due) && !DONE.test(st)) dep.events.push({ name: S(k.keyTask), task: name, pic: S(r.pic), status: 'open' });
        }
      }
      dep.highlights.sort((a, b) => (b.priority - a.priority) || b.result.length - a.result.length);
      dep.highlights = dep.highlights.slice(0, 6);
      dep.events = dep.events.slice(0, 8);
      out.push(dep);
      console.log(`Phòng ${d.id}: xong ${dep.done} · quá hạn ${dep.overdue} · chưa cập nhật ${dep.notUpdated} · tuần sau ${dep.upcoming} · sự kiện ${dep.events.length} · công tác ${dep.trips.length}`);
    } catch (e) { console.log(`Phòng ${d.id}: lỗi ${e.message}`); }
  }
  return out;
}

// ── 2. CRM: đi địa bàn + đơn hàng ──
async function sales() {
  const out = [];
  for (const t of CFG.crm) {
    const team = { id: t.id, name: t.name, activities: 0, visits: 0, accounts: 0, byPic: {}, provinces: {}, types: {}, highlights: [], orders: 0, orderAmount: 0, orderAccounts: 0 };
    try {
      const j = await getJson(t.url, { action: 'visitFeed', from: START, to: END });
      const rows = (j.rows || []).filter(r => inWeek(day(r.start)) || inWeek(day(r.finish)));
      const acc = new Set();
      for (const r of rows) {
        const done = /complet/i.test(S(r.status));
        if (!done) continue;
        team.activities++;
        const type = S(r.typeAction) || S(r.typeTask) || 'Other';
        team.types[type] = (team.types[type] || 0) + 1;
        const isVisit = /visit|gặp|thăm/i.test(type + ' ' + S(r.typeTask));
        if (isVisit) team.visits++;
        const pic = S(r.pic); if (pic) team.byPic[pic] = (team.byPic[pic] || 0) + 1;
        const prov = S(r.accProv || r.province); if (prov) team.provinces[prov] = (team.provinces[prov] || 0) + 1;
        const a = S(r.accName || r.account); if (a) acc.add(a);
        const res = S(r.result);
        if (res.length > 60) team.highlights.push({ pic, account: a, accType: S(r.accType), province: prov, type, product: S(r.product), result: res.slice(0, 360), feedback: S(r.feedback), next: S(r.nextAction).slice(0, 160) });
      }
      team.accounts = acc.size;
      team.highlights.sort((a, b) => b.result.length - a.result.length);
      team.highlights = team.highlights.slice(0, 4);
    } catch (e) { console.log(`CRM ${t.id}: lỗi lượt gặp khách ${e.message}`); }
    if (t.orders) {
      try {
        const j = await getJson(t.url, { action: 'list', tab: 'order', from: START, to: END, limit: 500 });
        const rows = (j.rows || j.items || j.data || []).filter(r => inWeek(day(r.day)));
        const ords = new Set(), accs = new Set();
        for (const r of rows) { ords.add(S(r.orderNo) || (S(r.name) + day(r.day))); accs.add(S(r.name)); team.orderAmount += +String(r.amount || 0).replace(/[^\d.-]/g, '') || 0; }
        team.orders = ords.size; team.orderAccounts = accs.size;
      } catch (e) { console.log(`CRM ${t.id}: lỗi đơn hàng ${e.message}`); }
    }
    out.push(team);
    console.log(`CRM ${t.id}: hoạt động ${team.activities} · gặp khách ${team.visits} · khách ${team.accounts} · đơn ${team.orders}`);
  }
  return out;
}

// ── 3. Thầu: kết quả phê duyệt trong tuần (NPP Hùng Vĩ, iCare) ──
async function tenders() {
  const res = { wins: [], fails: 0, pendingNew: 0 };
  const from = START.slice(0, 7).replace('-', '');
  for (const n of CFG.tenders) {
    try {
      const j = await getJson(n.url, { action: 'winMap', from: String(+from - 1) });
      const pk = new Map();
      for (const r of j.rows || []) {
        const ap = day(r.approve);
        const key = (S(r.tbmt) || S(r.tender)) + '|' + S(r.hospital);
        if (inWeek(ap)) {
          if (!pk.has(key)) pk.set(key, { npp: n.name, hospital: S(r.hospital), city: S(r.city), tender: S(r.tender).slice(0, 140), result: S(r.result), approve: ap, products: [], value: 0 });
          const p = pk.get(key);
          if (/win/i.test(S(r.result))) { p.products.push(S(r.wonProduct || r.pcode) + (r.wonQty ? ` × ${r.wonQty}` : '')); p.value += (+r.wonQty || 0) * (+r.wonPrice || 0); p.result = 'Win'; }
        } else if (inWeek(day(r.bidOpen))) res.pendingNew++;
      }
      for (const p of pk.values()) { if (p.result === 'Win') res.wins.push({ ...p, products: [...new Set(p.products)].slice(0, 6) }); else res.fails++; }
      console.log(`Thầu ${n.id}: trúng ${[...pk.values()].filter(p => p.result === 'Win').length} gói · khác ${[...pk.values()].filter(p => p.result !== 'Win').length}`);
    } catch (e) { console.log(`Thầu ${n.id}: lỗi ${e.message}`); }
  }
  res.wins.sort((a, b) => b.value - a.value);
  return res;
}

// ── 4. Đào tạo (Training Hub) ──
async function trainings() {
  try {
    const j = await getJson(CFG.training.url, { action: 'rhSessions', rhKey: CFG.training.rhKey, from: START, to: END });
    const xs = (j.sessions || []).map(s => ({ date: s.date, topic: S(s.topic), trainer: S(s.trainer), type: S(s.type), category: S(s.category), people: (s.people || []).length, status: S(s.status) }));
    console.log(`Đào tạo: ${xs.length} buổi`);
    return xs;
  } catch (e) { console.log('Đào tạo: lỗi ' + e.message); return []; }
}

// ── viết ──
const fmtVnd = v => v >= 1e9 ? (v / 1e9).toFixed(1).replace('.0', '') + ' billion dong' : v >= 1e6 ? Math.round(v / 1e6) + ' million dong' : Math.round(v) + ' dong';
const fmtVndVi = v => v >= 1e9 ? (v / 1e9).toFixed(1).replace('.0', '').replace('.', ',') + ' tỷ đồng' : v >= 1e6 ? Math.round(v / 1e6) + ' triệu đồng' : Math.round(v) + ' đồng';
function seedRand(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507), h ^= h >>> 13, (h >>> 0) / 4294967296)); }

function pickShow() {
  const wk = Math.floor(new Date(END + 'T00:00:00Z') / (7 * 864e5));
  const ids = Object.keys(SHOWS_INTERNAL);
  return process.env.WEEKLY_SHOW || ids[wk % ids.length];
}

async function aiWrite(ed) {
  const { askJson, S: J } = await import('./ai.mjs');
  const show = SHOWS_INTERNAL[ed.podcast.show];
  const hosts = show.hosts.map(h => `${h.id} = ${h.name} (${h.role})`).join('; ');
  const out = await askJson({
    effort: 'medium',
    system: `You write "MMH This Week", the internal Sunday bulletin of MANI Medical Hanoi (MMH), a distributor of MANI surgical, ophthalmic and dental devices in Vietnam and Thailand.
Audience: MMH staff. Tone: warm, upbeat, like a colleague sharing the week's work — celebrate wins, thank people by name, mention challenges honestly but kindly.
Use ONLY the facts provided; never invent numbers, names, hospitals or outcomes. Write customer/hospital names exactly as given.`,
    schema: J.obj({
      title_vi: J.str, title_en: J.str, intro_vi: J.str, intro_en: J.str,
      sections: J.arr(J.obj({ key: { type: 'string', enum: ['tenders', 'sales', 'departments', 'events', 'training', 'next'] }, h_vi: J.str, h_en: J.str, vi: J.str, en: J.str })),
      podcast: J.obj({ title: J.str, turns: J.arr(J.obj({ sp: { type: 'string', enum: show.hosts.map(h => h.id) }, text: J.str, vi: J.str })) }),
    }),
    user: `Week: ${START} to ${END}. Show: "${show.name}" — ${show.desc} Hosts: ${hosts}.
Previous weeks' openings to avoid repeating: ${(ed.prevOpenings || []).join(' | ') || 'none'}.
1. title + intro (2–3 sentences) in Vietnamese and English.
2. sections (Vietnamese "vi" and English "en", 60–160 words each, only for sections with data): tenders (good news first: packages won, hospitals, products),
   sales (field visits: totals per team, standout visits and customer feedback, orders), departments (work done, overdue items gently, highlights),
   events (marketing events and projects), training, next (what's coming next week).
3. podcast: about 6–9 minutes (900–1,300 words). ${show.style === 'solo' ? 'One host only, talking directly to colleagues.' : 'Two hosts chatting naturally.'}
   Natural spoken English: contractions, short sentences, reactions, specific names and numbers from the data written to be spoken (e.g. "twenty visits").
   Start with the best news of the week. Vary structure and phrasing from previous weeks. Give every turn a natural Vietnamese subtitle "vi".

DATA (JSON):
${JSON.stringify(ed.facts)}`,
  });
  ed.title = { vi: out.title_vi, en: out.title_en }; ed.intro = { vi: out.intro_vi, en: out.intro_en }; ed.sections = out.sections;
  ed.podcast.title = out.podcast.title;
  ed.podcast.turns = out.podcast.turns;
  ed.writer = 'claude';
}

// Bản miễn phí: câu mẫu viết song song Anh + Việt. KHÔNG gửi dữ liệu nội bộ sang dịch máy bên ngoài.
async function templateWrite(ed) {
  const f = ed.facts, rnd = seedRand(END), pick = a => a[Math.floor(rnd() * a.length)];
  const show = SHOWS_INTERNAL[ed.podcast.show];
  const A = show.hosts[0], B = show.hosts[1] || A, duo = show.hosts.length > 1;
  const turns = [];
  const say = (h, [en, vi]) => turns.push({ sp: h.id, text: en.replace(/\s+/g, ' ').trim(), vi: vi.replace(/\s+/g, ' ').trim() });
  const any = arr => pick(arr);                       // arr = [[en, vi], …]
  const dEn = s => new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const dVi = s => `${+s.slice(8)}/${+s.slice(5, 7)}`;
  const wkEn = `${dEn(START)} to ${dEn(END)}`, wkVi = `${dVi(START)} đến ${dVi(END)}`;
  const open = any([['Hi everyone,', 'Chào cả nhà,'], ['Hello team,', 'Xin chào các bạn,'], ['Good evening, everyone,', 'Chào buổi tối mọi người,']]);
  say(A, [`${open[0]} and welcome to ${show.name}, your look back at the week at MMH, from ${wkEn}. I'm ${A.name}.`, `${open[1]} chào mừng đến với ${show.name} — nhìn lại tuần làm việc ở MMH, từ ${wkVi}. Mình là ${A.name}.`]);
  if (duo) { const c = any([['It’s been a busy week.', 'Một tuần khá bận rộn.'], ['Lots to share this week.', 'Tuần này có nhiều điều để chia sẻ.'], ['Here we go.', 'Cùng bắt đầu nhé.']]); say(B, [`And I’m ${B.name}. ${c[0]}`, `Và mình là ${B.name}. ${c[1]}`]); }
  const two = duo ? B : A;
  const wins = f.tenders.wins;
  if (wins.length) {
    const l = any([['Let’s start with some good news.', 'Bắt đầu bằng tin vui nhé.'], ['First, good news from tenders.', 'Trước hết là tin vui từ các gói thầu.'], ['We have good news on the tender front.', 'Mảng thầu tuần này có tin vui.']]);
    say(A, [`${l[0]} This week ${wins.length === 1 ? 'one package' : wins.length + ' packages'} came back as wins.`, `${l[1]} Tuần này có ${wins.length} gói thầu trúng.`]);
    wins.slice(0, 4).forEach(w => say(two, [
      `${w.hospital}${w.city ? ' in ' + w.city : ''}, through ${w.npp}${w.products.length ? ', for ' + w.products.slice(0, 3).join(', ') : ''}${w.value ? ', worth around ' + fmtVnd(w.value) : ''}.`,
      `${w.hospital}${w.city ? ' (' + w.city + ')' : ''}, qua nhà phân phối ${w.npp}${w.products.length ? ', sản phẩm ' + w.products.slice(0, 3).join(', ') : ''}${w.value ? ', trị giá khoảng ' + fmtVndVi(w.value) : ''}.`]));
  }
  const vis = f.sales.reduce((s, t) => s + t.visits, 0), act = f.sales.reduce((s, t) => s + t.activities, 0);
  if (act) {
    const l = any([['Out in the field,', 'Ngoài địa bàn,'], ['On the sales side,', 'Về phía kinh doanh,'], ['Now, field work.', 'Giờ đến hoạt động đi địa bàn.']]);
    say(A, [`${l[0]} our sales teams completed ${act} activities, including ${vis} customer visits.`, `${l[1]} các nhóm sales đã hoàn thành ${act} hoạt động, trong đó có ${vis} lượt gặp khách hàng.`]);
    f.sales.filter(t => t.activities).forEach(t => {
      const top = Object.entries(t.byPic).sort((a, b) => b[1] - a[1])[0];
      const prov = Object.entries(t.provinces).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);
      say(two, [`${t.name}: ${t.activities} activities with ${t.accounts} customers${prov.length ? ', mostly in ' + prov.join(' and ') : ''}${top ? `. ${top[0]} was the most active, with ${top[1]}` : ''}.${t.orders ? ` They also booked ${t.orders} orders, around ${fmtVnd(t.orderAmount)}.` : ''}`,
        `${t.name}: ${t.activities} hoạt động với ${t.accounts} khách hàng${prov.length ? ', tập trung ở ' + prov.join(' và ') : ''}${top ? `. Tích cực nhất là ${top[0]} với ${top[1]} hoạt động` : ''}.${t.orders ? ` Có thêm ${t.orders} đơn hàng, khoảng ${fmtVndVi(t.orderAmount)}.` : ''}`]);
    });
  }
  for (const d of f.departments) {
    if (!d.done && !d.overdue) continue;
    say(A, [`${d.name} closed ${d.done} tasks this week${d.overdue ? `, with ${d.overdue} still past due` : ''}${d.upcoming ? ` and ${d.upcoming} lined up for next week` : ''}.`,
      `${d.name} hoàn thành ${d.done} việc trong tuần${d.overdue ? `, còn ${d.overdue} việc quá hạn` : ''}${d.upcoming ? `, tuần sau có ${d.upcoming} việc đến hạn` : ''}.`]);
    const ev = d.events.filter(e => e.status === 'done').slice(0, 2);
    if (ev.length) say(two, [`Events this week included ${ev.map(e => e.name).join(' and ')}.`, `Sự kiện trong tuần có ${ev.map(e => e.name).join(' và ')}.`]);
  }
  if (f.trainings.length) say(A, [`On training, we ran ${f.trainings.length} session${f.trainings.length > 1 ? 's' : ''}: ${f.trainings.slice(0, 3).map(t => t.topic).join('; ')}.`, `Về đào tạo, tuần này có ${f.trainings.length} buổi: ${f.trainings.slice(0, 3).map(t => t.topic).join('; ')}.`]);
  const end = any([['That’s our week.', 'Đó là tuần của chúng ta.'], ['And that’s a wrap for this week.', 'Tuần này đến đây là hết.'], ['That’s all for this week.', 'Bản tin tuần này xin dừng ở đây.']]);
  const thx = any([['Thank you all for the hard work.', 'Cảm ơn mọi người đã làm việc chăm chỉ.'], ['Great job, everyone.', 'Mọi người làm tốt lắm.'], ['Thanks, team.', 'Cảm ơn cả đội.']]);
  const bye = any([['See you next Sunday.', 'Hẹn gặp lại Chủ nhật tuần sau.'], ['Have a restful Sunday.', 'Chúc mọi người Chủ nhật thư giãn.'], ['Talk to you next week.', 'Hẹn tuần sau nhé.']]);
  say(two, [`${end[0]} ${thx[0]} Full details are in the app. ${bye[0]}`, `${end[1]} ${thx[1]} Chi tiết có trong app. ${bye[1]}`]);
  ed.podcast.title = `${show.name} · ${wkEn}`;
  ed.podcast.turns = turns;
  ed.title = { vi: `Tuần ${wkVi}`, en: `Week of ${wkEn}` };
  ed.writer = 'template';
}

async function main() {
  const [departmentsF, salesF, tendersF, trainingsF] = await Promise.all([departments(), sales(), tenders(), trainings()]);
  const facts = { week: { from: START, to: END }, departments: departmentsF, sales: salesF, tenders: tendersF, trainings: trainingsF };
  const showId = pickShow();
  const S0 = SHOWS_INTERNAL[showId];
  if (process.env.WEEKLY_FACTS_ONLY) {               // phiên Claude Code: chỉ lấy số liệu, Claude tự viết (WRITING.md) ⇒ apply_in.mjs
    const prevShows = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'internal', 'index.json'), 'utf8')).weeks.slice(0, 4).map(w => w.show); } catch { return []; } })();
    const f = path.join(OUT, END + '.facts.json');
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(f, JSON.stringify({ kind: 'internal', date: END, week: { from: START, to: END }, show: { id: showId, name: S0.name, style: S0.style, desc: S0.desc,
      hosts: S0.hosts.map(h => ({ id: h.id, name: h.name, role: h.role })) }, recentShows: prevShows, facts }, null, 1));
    console.log(`Số liệu tuần ${START} → ${END} ⇒ ${f} (ngoài repo). Viết theo WRITING.md rồi: node tools/apply_in.mjs ${f} <kết quả.json>`);
    return;
  }
  const ed = { kind: 'internal', date: END, week: { from: START, to: END }, updated: new Date(NOW).toISOString(), facts,
    podcast: { show: showId, name: S0.name, hosts: S0.hosts, color: S0.color }, prevOpenings: [] };
  if (process.env.ANTHROPIC_API_KEY) { try { await aiWrite(ed); } catch (e) { console.log('Claude lỗi, dùng bản miễn phí: ' + e.message); await templateWrite(ed); } }
  else await templateWrite(ed);
  delete ed.prevOpenings;
  const text = ed.podcast.turns.map(t => t.text).join(' ').toLowerCase();
  ed.vocab = GLOSSARY.filter(([en]) => text.includes(en.toLowerCase())).slice(0, 8).map(([en, vi]) => ({ en, vi }));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, END + '.json'), JSON.stringify(ed));
  console.log(`Bản tin nội bộ ${START} → ${END} · ${ed.podcast.name} · viết bằng ${ed.writer} · ${ed.podcast.turns.length} lượt lời · tạm lưu ngoài repo`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
