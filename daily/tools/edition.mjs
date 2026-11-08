// MMH Daily — dựng số báo hôm nay từ data/pool.json ⇒ data/editions/<ngày>.json + data/index.json.
// Chọn tin (ưu tiên Y tế: đấu thầu, chính sách, đầu tư công, bệnh viện lớn), chọn chương trình podcast của ngày,
// viết nội dung: có ANTHROPIC_API_KEY ⇒ Claude (song ngữ, phân tích, kịch bản podcast); không có ⇒ mẫu soạn sẵn từ tin tiếng Anh.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAY, vnDay, iso } from './lib.mjs';
import { SHOWS, showFor, GLOSSARY } from './shows.mjs';
import { translateStories, translate } from './translate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const NOW = process.env.DAILY_NOW ? new Date(process.env.DAILY_NOW) : new Date();
const DATE = process.env.DAILY_DATE || vnDay(NOW);
const ED_DIR = path.join(ROOT, 'data', 'editions');
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

// ── chọn tin ──
function pick(pool) {
  const prevEds = (readJson(path.join(ROOT, 'data', 'index.json'), { editions: [] }).editions || []).filter(e => e.date < DATE).slice(0, 3);
  const used = new Set(prevEds.flatMap(e => readJson(path.join(ED_DIR, e.date + '.json'), { used: [] }).used || []));
  const fresh = h => pool.items.filter(x => NOW - new Date(x.d) <= h * 36e5 && !used.has(x.id));
  let cand = fresh(30);
  if (cand.length < 40) cand = fresh(54);
  const rank = x => x.sc + (x.also?.length || 0) * 1.5 + Math.max(0, 1 - (NOW - new Date(x.d)) / (30 * 36e5)) + (x.img ? 0.3 : 0);
  cand.sort((a, b) => rank(b) - rank(a));
  const sections = {};
  for (const [sec, def] of Object.entries(CFG.sections)) {
    const all = cand.filter(x => x.sec === sec);
    // trộn tiếng Việt + tiếng Anh: tối đa 60% một ngôn ngữ
    const out = [], cap = Math.ceil(def.quota * 0.6), n = { vi: 0, en: 0 };
    for (const x of all) { if (out.length >= def.quota) break; if (n[x.lang] >= cap && all.some(y => y.lang !== x.lang && !out.includes(y))) continue; out.push(x); n[x.lang]++; }
    for (const x of all) { if (out.length >= def.quota) break; if (!out.includes(x)) out.push(x); }
    sections[sec] = out;
  }
  // Bàn tin Y tế: theo nhóm chuyên sâu
  const desk = {};
  for (const t of ['tender', 'policy', 'invest', 'hospital', 'device']) desk[t] = cand.filter(x => x.sec === 'health' && x.tags?.includes(t)).slice(0, 6).map(x => x.id);
  const docs = cand.filter(x => x.docs?.length && (x.sec === 'health' || x.tags?.includes('invest') || x.kind === 'doc')).slice(0, 10);
  const lead = sections.health[0] && (sections.health[0].sc >= (sections.economy[0]?.sc || 0) - 2) ? sections.health[0] : (sections.economy[0] || sections.health[0]);
  return { sections, desk, docs, lead, cand };
}

// ── chữ cho giọng đọc ──
const speech = s => String(s || '')
  .replace(/\bHCMC\b/g, 'Ho Chi Minh City').replace(/\bVND\b/g, 'dong').replace(/\bUS\$/g, '$').replace(/(\d)%/g, '$1 percent')
  .replace(/\s*\([^)]*\)/g, '').replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const sentences = (s, n) => (String(s || '').match(/[^.!?]+[.!?]+(\s|$)/g) || [String(s || '')]).slice(0, n).join(' ').trim();
const ordinal = d => d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');
function dateEn(ds) {
  const d = new Date(ds + 'T00:00:00Z');
  return `${d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}, ${d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })} ${ordinal(d.getUTCDate())}`;
}
function seedRand(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507), h ^= h >>> 13, (h >>> 0) / 4294967296)); }

// ── viết bằng mẫu (miễn phí, không cần AI): tin tiếng Anh + tin tiếng Việt đã dịch máy ──
const words = s => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3));
const similar = (a, b) => { const A = words(a), B = words(b); if (!A.size || !B.size) return false; let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.min(A.size, B.size) > 0.5; };

function templateWrite(ed, picked) {
  const rnd = seedRand(DATE + ed.podcast.show);
  const any = a => a[Math.floor(rnd() * a.length)];
  const show = SHOWS[ed.podcast.show];
  const A = show.hosts[0], B = show.hosts[1] || show.hosts[0];
  const duo = show.hosts.length > 1;
  const turns = [];
  const say = (h, text) => { const t = speech(text).replace(/([?!…])\./g, '$1').replace(/\.\./g, '.'); if (t) turns.push({ sp: h.id, text: t }); };
  picked.read = [];
  const head = x => (x.lang === 'en' ? x.t : x.h_en || '').replace(/\s+/g, ' ').replace(/[.。]$/, '');
  const body = (x, n) => sentences(x.lang === 'en' ? x.sum : x.s_en, n);
  const readHeads = [];
  // lấy tin có tiếng Anh (gốc hoặc dịch), bỏ tin trùng nội dung
  const take = (sec, n, filter = () => true) => {
    const pool = [...picked.sections[sec], ...picked.cand.filter(x => x.sec === sec)];
    const out = [];
    for (const x of pool) {
      if (out.length >= n) break;
      if (picked.read.includes(x) || !filter(x)) continue;
      const h = head(x), s = body(x, 2);
      if (!h || s.length < 40 || readHeads.some(r => similar(r, h))) continue;
      out.push(x); picked.read.push(x); readHeads.push(h);
    }
    return out;
  };
  const N = {
    briefing: { health: 6, economy: 5, politics: 3, society: 3 }, healthdesk: { health: 10, economy: 2, politics: 2, society: 1 },
    twotakes: { health: 5, economy: 4, politics: 3, society: 3 }, markets: { health: 4, economy: 7, politics: 2, society: 2 },
    editor: { health: 5, economy: 4, politics: 3, society: 2 }, explainer: { health: 5, economy: 3, politics: 2, society: 2 },
    weekly: { health: 6, economy: 5, politics: 3, society: 3 },
  }[ed.podcast.show];
  const order = ed.podcast.show === 'markets' ? ['economy', 'health', 'politics', 'society'] : ['health', 'economy', 'politics', 'society'];
  const sel = {};
  for (const sec of order) sel[sec] = take(sec, N[sec]);
  // y tế: xếp theo nhóm chuyên sâu
  const TAGS = [['tender', ['On tenders and procurement.', 'First, procurement and bidding.', 'Starting with tenders.']], ['policy', ['On the policy front.', 'Turning to health policy.', 'In regulation news.']],
    ['invest', ['In public investment.', 'On spending and investment in health care.', 'Following the money in health care.']], ['hospital', ['From the major hospitals.', 'Inside the hospitals.', 'At the big hospitals.']],
    ['device', ['On medical devices.', 'In the medical device market.', 'For equipment and supplies.']]];
  const groupOf = x => (TAGS.find(([t]) => x.tags?.includes(t)) || ['other'])[0];
  sel.health.sort((a, b) => TAGS.findIndex(([t]) => t === groupOf(a)) - TAGS.findIndex(([t]) => t === groupOf(b)));

  // mở đầu
  const greet = any(['Good morning.', 'Hello, and welcome.', 'Good morning, and thanks for joining us.', 'Hi there, and welcome to the show.']);
  say(A, `${greet} It's ${dateEn(DATE)}. I'm ${A.name}, and this is ${show.name} from MMH Daily${show.style === 'solo' ? ', the stories shaping Vietnam today, with a close eye on health care.' : '.'}`);
  if (duo) say(B, `${any(['And I’m', 'Hi everyone, I’m', 'Good to be here. I’m'])} ${B.name}${B.role ? `, ${B.role.toLowerCase().replace(/^co-host$/, 'your co-host')}` : ''}. ${any(['Let’s get into it.', 'We have a busy day.', 'Plenty to cover today.', 'There’s a lot going on.'])}`);
  const top = [sel.health[0], sel.economy[0], sel.politics[0]].filter(Boolean);
  if (top.length >= 2) say(A, `${any(['Coming up:', 'Here’s what’s on the agenda.', 'On today’s show:'])} ${top.map(head).join('; ')}.`);

  const SEG = { health: ['Let’s start with health.', 'First, the health desk.', 'We begin with health care.'], economy: ['Turning to the economy.', 'Now, business and the economy.', 'On the economic front.'],
    politics: ['In politics.', 'Turning to politics and government.', 'Now to politics.'], society: ['And in society news.', 'Closer to home, on the society pages.', 'Finally, society.'] };
  const NEXT = ['Also,', 'Meanwhile,', 'In other news,', 'Separately,', 'At the same time,'];

  if (show.style === 'deep' && sel.health[0]) {         // The Explainer: tin chính kể kỹ, rồi điểm tin
    const L = sel.health[0];
    say(A, `Today we take a closer look at one story: ${head(L)}.`);
    say(B, body(L, 4));
    const rel = sel.health.slice(1).filter(x => (x.tags || []).some(t => (L.tags || []).includes(t))).slice(0, 2);
    if (rel.length) { say(A, 'Is this part of a wider trend?'); rel.forEach(x => say(B, `${head(x)}. ${body(x, 2)}`)); }
    say(A, 'Now the rest of the news, in brief.');
    for (const sec of order) for (const x of (sec === 'health' ? sel.health.slice(1).filter(x => !rel.includes(x)) : sel[sec]).slice(0, 2)) say(any([A, B]), `${head(x)}.`);
  } else {
    for (const sec of order) {
      const xs = sel[sec];
      if (!xs.length) continue;
      if (ed.podcast.show === 'healthdesk' && sec !== 'health') {   // Bàn tin Y tế: tin khác chỉ đọc tiêu đề
        if (sec === order[1]) say(A, any(['Before we go, a quick look at the other headlines.', 'Now, the other headlines in brief.']));
        xs.forEach(x => say(A, `${head(x)}.`));
        continue;
      }
      if (duo && sec !== order[0] && show.style !== 'qa' && rnd() < 0.7) say(B, any(['Okay.', 'Right.', 'Got it. Let’s move on.', 'Good. What’s next?', 'Mm-hm.']));
      if (show.style === 'qa') say(A, any([`What should listeners know about ${sec === 'economy' ? 'the economy' : sec} today?`, `Let’s talk about ${sec === 'economy' ? 'the economy' : sec}. What’s the main story?`, `And on ${sec === 'economy' ? 'the economy' : sec}, what stood out?`]));
      else say(A, any(SEG[sec]));
      let lastTag = '';
      xs.forEach((x, i) => {
        if (sec === 'health' && show.style !== 'qa') { const g = groupOf(x); if (g !== lastTag && g !== 'other') { lastTag = g; if (i) say(duo ? A : A, any(TAGS.find(([t]) => t === g)[1])); } }
        const h = head(x), s = body(x, 2);
        if (show.style === 'solo') say(A, `${i ? any(NEXT) + ' ' : ''}${h}. ${s}`);
        else if (show.style === 'qa') { if (i) say(A, any(['What else?', 'Anything else on that front?', 'And the next one?', 'What’s another one to watch?'])); say(B, `${h}. ${s}`); }
        else if (show.style === 'desk' && sec === 'health') { if (i) say(A, any(['What else is on your list?', 'Tell us more.', 'And next?', 'What about this one?']) ); say(B, `${h}. ${s}`); }
        else if (i % 2 === 0) { say(A, `${h}.`); say(B, s); }
        else { say(B, `${any(['There’s also this:', 'Another one to watch:', 'And this one:'])} ${h}.`); say(A, s); }
      });
    }
  }
  const total = Object.values(sel).flat().length;
  if (!total) say(A, 'We could not reach our sources this morning. Today’s paper has everything we found.');
  say(duo ? B : A, any(['That’s all for today.', 'And that’s our show.', 'That wraps it up for today.']) + ` Every story is in today’s paper, with summaries in Vietnamese and English. ${duo ? `I'm ${B.name}.` : `I'm ${A.name}.`} ${any(['See you tomorrow.', 'Have a great day.', 'Talk to you tomorrow.'])}`);
  if (duo) say(A, `And I'm ${A.name}. ${any(['Take care.', 'Goodbye for now.', 'Have a good one.'])}`);
  ed.podcast.turns = turns;
  ed.podcast.title = `${show.name} · ${dateEn(DATE)}`;
  ed.podcast.desc = show.desc;
  const text = turns.map(t => t.text).join(' ').toLowerCase();
  ed.vocab = GLOSSARY.filter(([en]) => text.includes(en.toLowerCase())).slice(0, 10).map(([en, vi]) => ({ en, vi }));
  ed.writer = 'template';
}

// ── viết bằng Claude (gói Tiết kiệm: Haiku 5.5) — 2 lượt: tin song ngữ; podcast + phụ đề Việt + phân tích ──
async function claudeWrite(ed, picked) {
  const { askJson, S: J } = await import('./ai.mjs');
  const show = SHOWS[ed.podcast.show];
  const deskX = Object.values(picked.desk).flat().map(id => picked.cand.find(y => y.id === id)).filter(Boolean);
  const all = [...new Map(Object.values(picked.sections).flat().concat(picked.docs, deskX).map(x => [x.id, x])).values()];
  const list = all.map(x => ({ id: x.id, sec: x.sec, tags: x.tags, lang: x.lang, source: x.src, date: x.d.slice(0, 10), title: x.t, summary: (x.sum || '').slice(0, 450) }));
  const prev = (readJson(path.join(ROOT, 'data', 'index.json'), { editions: [] }).editions || []).slice(0, 5).map(e => `${e.date}: ${e.show} — ${e.lead}`);
  const SYSTEM = `You are the editor of MMH Daily, a morning news app about Vietnam for staff of MANI Medical Hanoi (MMH), a distributor of surgical,
ophthalmic and dental medical devices that sells to public hospitals through tenders. Readers are Vietnamese professionals practising English.
Health comes first and in depth (tenders and procurement, Ministry of Health policy, public investment in hospitals, the big central hospitals,
medical devices, health insurance), then the economy, politics and society. Use only the facts given; never invent numbers, names or quotes.`;

  // 1. tin song ngữ
  const st = await askJson({ system: SYSTEM, effort: 'low', schema: J.obj({ stories: J.arr(J.obj({ id: J.str, h_en: J.str, h_vi: J.str, dek_en: J.str, s_vi: J.str, s_en: J.str, why_vi: J.str })) }),
    user: `For EVERY story below write: h_en (sharp English headline), h_vi (Vietnamese headline), dek_en (one-line English standfirst),
s_vi (2–3 sentence Vietnamese summary), s_en (2–3 sentence English summary), why_vi (one Vietnamese sentence on why it matters — for health stories,
what it means for medical-device suppliers or hospitals; empty string if nothing useful).\n\nStories (JSON):\n${JSON.stringify(list)}` });
  const byId = new Map(st.stories.map(s => [s.id, s]));
  for (const x of all) { const s = byId.get(x.id); if (s) Object.assign(x, { h_en: s.h_en, h_vi: s.h_vi, dek: s.dek_en, s_vi: s.s_vi, s_en: s.s_en, why: s.why_vi || undefined }); }

  // 2. podcast + phụ đề + lời biên tập + phân tích y tế + từ vựng
  const pick = sec => (picked.sections[sec] || []).slice(0, sec === 'health' ? 8 : 4).map(x => ({ id: x.id, tags: x.tags, source: x.src, headline: x.h_en || x.t, summary: x.s_en || x.sum }));
  const hosts = show.hosts.map(h => `${h.id} = ${h.name} (${h.role})`).join('; ');
  const out = await askJson({ system: SYSTEM, effort: 'medium',
    schema: J.obj({ note: J.obj({ en: J.str, vi: J.str }), health: J.obj({ en: J.str, vi: J.str }), vocab: J.arr(J.obj({ en: J.str, vi: J.str, ex: J.str })),
      podcast: J.obj({ title: J.str, desc: J.str, turns: J.arr(J.obj({ sp: { type: 'string', enum: show.hosts.map(h => h.id) }, text: J.str, vi: J.str })) }) }),
    user: `Date: ${dateEn(DATE)} (${DATE}). Today's show: "${show.name}" — ${show.desc} Format: ${show.style}. Hosts: ${hosts}.
Recent editions (do not repeat their angle or opening): ${prev.join(' | ') || 'none'}.
1. note: editor's note (60–90 words) in English and Vietnamese.
2. health: health-sector analysis (180–240 words) in English and Vietnamese: tenders, policy, investment, hospitals — what changed, who is affected, what to watch.
3. vocab: 8 useful English terms used in the script, with Vietnamese meaning and a short example from the script.
4. podcast: title, one-line desc, and turns for a 1,200–1,500 word script (about 8–10 minutes). Open with the date and show name. Health first and deepest,
   then economy, politics, society. ${show.style === 'solo' ? 'One anchor only.' : show.style === 'qa' ? 'A asks short listener-style questions; B answers.' : show.style === 'desk' ? 'B is the health correspondent and carries health in depth; A wraps up other news briefly.' : show.style === 'deep' ? 'Spend half the show explaining the lead story step by step, then a quick round-up.' : 'Two hosts in real conversation.'}
   Sound like real people talking, not reading: contractions, short sentences, natural reactions and hand-offs, a light personal touch; numbers written to be spoken;
   no URLs or lists. Never sound cheerful about accidents or deaths. For every turn also give "vi": a natural Vietnamese subtitle of that turn.

Stories — health: ${JSON.stringify(pick('health'))}
economy: ${JSON.stringify(pick('economy'))}
politics: ${JSON.stringify(pick('politics'))}
society: ${JSON.stringify(pick('society'))}` });
  ed.note = out.note; ed.healthDesk.analysis = out.health; ed.vocab = out.vocab;
  ed.podcast.title = out.podcast.title; ed.podcast.desc = out.podcast.desc;
  ed.podcast.turns = out.podcast.turns.map(t => ({ sp: t.sp, text: speech(t.text), vi: t.vi }));
  ed.writer = 'claude';
}

const slim = x => x && ({ id: x.id, t: x.t, u: x.u, src: x.src, d: x.d, lang: x.lang, sec: x.sec, tags: x.tags, docs: x.docs, img: x.img, also: x.also, kind: x.kind,
  sum: x.sum, h_en: x.h_en, h_vi: x.h_vi, dek: x.dek, s_vi: x.s_vi, s_en: x.s_en, why: x.why, mt: x.mt });

async function main() {
  const pool = readJson(path.join(ROOT, 'data', 'pool.json'), null);
  if (!pool) throw new Error('Chưa có data/pool.json — chạy collect.mjs trước');
  const picked = pick(pool);
  let showId = process.env.DAILY_SHOW || showFor(DATE);
  const useAI = !!process.env.ANTHROPIC_API_KEY;
  const index = readJson(path.join(ROOT, 'data', 'index.json'), { editions: [] });
  const no = (index.editions.find(e => e.date === DATE)?.no) || (index.editions.length ? Math.max(...index.editions.map(e => e.no || 0)) + 1 : 1);
  const ed = {
    date: DATE, no, updated: iso(NOW), writer: '',
    lead: picked.lead?.id, sections: {}, healthDesk: { groups: picked.desk }, docs: picked.docs.map(x => x.id),
    podcast: { show: showId, name: SHOWS[showId].name, hosts: SHOWS[showId].hosts, color: SHOWS[showId].color },
    stories: {}, sources: pool.status.map(s => ({ id: s.id, lang: s.lang, ok: !!s.ok, kept: s.kept })),
  };
  const freeWrite = async () => {
    if (process.env.DAILY_MT !== '0') {
      // dịch: tin của số báo + tin dự phòng cho podcast (y tế nhiều nhất)
      const extra = ['health', 'economy', 'politics', 'society'].flatMap(sec => picked.cand.filter(x => x.sec === sec).slice(0, sec === 'health' ? 24 : 10));
      const list = [...new Map([...Object.values(picked.sections).flat(), ...picked.docs, ...Object.values(picked.desk).flat().map(id => picked.cand.find(y => y.id === id)).filter(Boolean), ...extra].map(x => [x.id, x])).values()];
      try { console.log(`Dịch máy: ${await translateStories(list)}/${list.length} tin`); } catch (e) { console.log('Bỏ qua dịch máy: ' + e.message); }
    }
    templateWrite(ed, picked);
    if (process.env.DAILY_MT !== '0') {
      try {
        const { out, ok } = await translate(ed.podcast.turns.map(t => t.text), 'en', 'vi');
        ed.podcast.turns.forEach((t, i) => { if (out[i]) t.vi = out[i]; });
        console.log(`Phụ đề Việt: ${ok}/${ed.podcast.turns.length} lượt lời`);
      } catch (e) { console.log('Bỏ qua phụ đề Việt: ' + e.message); }
    }
  };
  if (useAI) {
    try { await claudeWrite(ed, picked); }
    catch (e) { console.log('Claude lỗi, dùng bản miễn phí: ' + e.message); await freeWrite(); }
  } else await freeWrite();

  const keep = new Map();
  for (const [sec, arr] of Object.entries(picked.sections)) { ed.sections[sec] = arr.map(x => x.id); arr.forEach(x => keep.set(x.id, x)); }
  picked.docs.forEach(x => keep.set(x.id, x));
  (picked.read || []).forEach(x => keep.set(x.id, x));
  for (const ids of Object.values(picked.desk)) ids.forEach(id => { const x = picked.cand.find(y => y.id === id); if (x) keep.set(id, x); });
  for (const [id, x] of keep) ed.stories[id] = slim(x);
  ed.used = [...keep.keys()];
  const words = ed.podcast.turns.reduce((s, t) => s + t.text.split(/\s+/).length, 0);
  ed.podcast.words = words;

  fs.mkdirSync(ED_DIR, { recursive: true });
  fs.writeFileSync(path.join(ED_DIR, DATE + '.json'), JSON.stringify(ed));
  const lead = ed.stories[ed.lead];
  const row = { date: DATE, no, show: showId, title: ed.podcast.title, lead: lead ? (lead.h_en || lead.t) : '', writer: ed.writer, words };
  index.editions = [row, ...index.editions.filter(e => e.date !== DATE)].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 400);
  index.updated = iso(NOW);
  fs.writeFileSync(path.join(ROOT, 'data', 'index.json'), JSON.stringify(index));
  console.log(`Số ${no} · ${DATE} · ${SHOWS[showId].name} · viết bằng ${ed.writer} · ${words} từ · ${Object.keys(ed.stories).length} tin`);
}
main().catch(e => { console.error(e); process.exit(1); });
