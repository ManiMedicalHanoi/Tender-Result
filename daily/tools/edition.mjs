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
const DESK = { dental: ['dental'], eye: ['eye'], tender: ['tender', 'device'], policy: ['policy', 'insurance'], market: ['market', 'invest', 'hospital'] };
/** "Vì sao quan trọng với MMH" — câu mẫu theo nhãn (bản miễn phí; Claude viết thì thay bằng câu riêng từng tin) */
const WHY = [
  ['dental', 'Liên quan trực tiếp mảng nha khoa (trâm, mũi khoan, vật liệu) — sales Dental nên nắm.'],
  ['eye', 'Liên quan mảng nhãn khoa (dao mổ, chỉ khâu) — theo dõi nhu cầu phẫu thuật mắt và kế hoạch mua sắm của bệnh viện.'],
  ['tender', 'Ảnh hưởng cách bệnh viện mua sắm: thời gian, giá hoặc hồ sơ thầu có thể thay đổi.'],
  ['device', 'Tác động tới nhà cung cấp thiết bị, vật tư y tế: thủ tục, giá, nguồn hàng.'],
  ['insurance', 'BHYT và giá dịch vụ quyết định ngân sách mua vật tư của bệnh viện.'],
  ['market', 'Ảnh hưởng giá nhập hàng, chi phí hoặc nhu cầu thị trường của MMH.'],
  ['surgery', 'Nhu cầu phẫu thuật kéo theo nhu cầu chỉ khâu, ghim da, dụng cụ.'],
  ['policy', 'Quy định mới của ngành y — xem có ảnh hưởng giấy phép, hồ sơ hay cách bán hàng.'],
  ['invest', 'Vốn đầu tư cho y tế: bệnh viện có thêm ngân sách mua sắm.'],
  ['hospital', 'Bệnh viện lớn là khách hàng và đầu mối thầu — đáng theo dõi.'],
];
const whyOf = x => (WHY.find(([t]) => x.tags?.includes(t)) || [])[1];

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
    sections[sec] = sec === 'health' ? out.filter((x, i) => i < 6 || (x.mmh || 0) > 0) : out;
  }
  // Bàn tin Y tế: nhóm theo mức ảnh hưởng tới MMH
  const desk = {};
  for (const [g, ts] of Object.entries(DESK)) desk[g] = cand.filter(x => (x.sec === 'health' || g === 'market') && ts.some(t => x.tags?.includes(t))).slice(0, 6).map(x => x.id);
  const docs = cand.filter(x => x.docs?.length && (x.sec === 'health' || x.tags?.includes('invest') || x.kind === 'doc')).slice(0, 10);
  const lead = sections.health[0] || sections.economy[0];
  return { sections, desk, docs, lead, cand };
}

// ── chữ cho giọng đọc ──
const speech = s => String(s || '')
  .replace(/\bHCMC\b/g, 'Ho Chi Minh City').replace(/\bVND\b/g, 'dong').replace(/\bUS\$/g, '$').replace(/(\d)%/g, '$1 percent')
  .replace(/\s*\([^)]*\)/g, '').replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const sentences = (s, n) => { const t = String(s || '').replace(/(\d)\.(\d)/g, '$1\u2024$2');   // không cắt câu ở số thập phân
  return ((t.match(/[^.!?]+[.!?]+(\s|$)/g) || [t]).slice(0, n).join(' ').trim()).replace(/\u2024/g, '.'); };
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
  // Bản miễn phí: ít tin, nói như hai đồng nghiệp — mỗi tin MMH có 1 câu "liên quan gì tới mình". Tin chung chỉ điểm nhanh.
  const rnd = seedRand(DATE + ed.podcast.show);
  const usedP = new Set();
  const any = a => { const free = a.filter(x => !usedP.has(x)); const x = (free.length ? free : a)[Math.floor(rnd() * (free.length || a.length))]; usedP.add(x); return x; };
  const show = SHOWS[ed.podcast.show];
  const A = show.hosts[0], B = show.hosts[1] || show.hosts[0];
  const duo = show.hosts.length > 1;
  const turns = [];
  const say = (h, text) => { const t = speech(text).replace(/([?!…])\./g, '$1').replace(/\.\./g, '.').replace(/\s+([,.?!])/g, '$1'); if (t) turns.push({ sp: h.id, text: t }); };
  picked.read = [];
  // tiêu đề nói được: bỏ ngoặc kép, "X: Y" ⇒ "X. Y"
  const head = x => (x.lang === 'en' ? x.t : x.h_en || '').replace(/\s+/g, ' ').replace(/['"“”‘’]/g, '').replace(/\s*:\s+/, '. ').replace(/[.。]$/, '');
  // ý chính: 1 câu, tối đa ~30 từ (cắt ở dấu phẩy)
  const gist = x => {
    let t = sentences(x.lang === 'en' ? x.sum : x.s_en, 1).replace(/^(According to [^,]+, )/i, '');
    const w = t.split(/\s+/);
    if (w.length > 40) {                         // câu quá dài: cắt ở dấu phẩy gần nhất sau ~15 từ; không có ⇒ bỏ tin
      const cut = t.lastIndexOf(',', 230);
      t = cut > 90 ? t.slice(0, cut) + '.' : '';
    }
    return t;
  };
  const readHeads = [];
  const usable = x => { const h = head(x); return h && h.length < 170 && gist(x).length >= 40 && !readHeads.some(r => similar(r, h)); };
  const takeOne = x => { picked.read.push(x); readHeads.push(head(x)); return x; };
  const BIZ = ['dental', 'eye', 'tender', 'device', 'insurance', 'market', 'surgery', 'policy', 'invest', 'hospital'];
  const tagOf = x => BIZ.find(t => x.tags?.includes(t)) || 'other';
  const nMain = { healthdesk: 7, explainer: 4, weekly: 7, markets: 5 }[ed.podcast.show] || 6;
  // tin chính: ưu tiên điểm MMH, không quá 2 tin cùng nhãn
  const pool = [...new Map([...picked.sections.health, ...picked.cand.filter(x => x.sec === 'health' || x.tags?.includes('market'))].map(x => [x.id, x])).values()]
    .sort((a, b) => (b.mmh || 0) - (a.mmh || 0) || b.sc - a.sc);
  const main = [], perTag = {};
  for (const x of pool) {
    if (main.length >= nMain) break;
    const t = tagOf(x);
    if (t === 'other' || (perTag[t] || 0) >= 2 || !usable(x)) continue;
    perTag[t] = (perTag[t] || 0) + 1; main.push(takeOne(x));
  }
  // điểm nhanh: kinh tế + chính trị (1–3 tin)
  const quick = [];
  for (const sec of ['economy', 'politics', 'society']) for (const x of picked.sections[sec]) { if (quick.length >= (sec === 'economy' ? 2 : quick.length + 1) || quick.length >= 3) break; if (usable(x)) quick.push(takeOne(x)); }

  const INTRO = {
    dental: ['Okay, one for the dental team.', 'Dental news now, and it’s a useful one.', 'Something from the dental world.'],
    eye: ['Now, eye care. This one’s close to home for us.', 'Over to eye care.', 'An eye care story, and our surgical team will want to hear it.'],
    tender: ['Tender news. And honestly, this one matters.', 'Let’s talk tenders.', 'Here’s one from the procurement side.'],
    device: ['A story for anyone dealing with medical devices.', 'Device news now.', 'This one’s about equipment and supplies.'],
    insurance: ['Let’s talk money. Health insurance.', 'Now, insurance and hospital fees.', 'A health insurance story.'],
    market: ['A market story now.', 'Bit of business news that touches us.', 'This one’s about the wider market.'],
    surgery: ['From the operating room.', 'A surgery story.', 'Something from the surgical side.'],
    policy: ['A policy update from the health sector.', 'Rules and regulations now. Stay with me.', 'There’s a new policy move.'],
    invest: ['Follow the money: health investment.', 'Investment in health care now.', 'A spending story.'],
    hospital: ['From the big hospitals.', 'Hospital news now.', 'Inside the hospitals this week.'],
  };
  const ANGLE = {
    dental: ['For our dental reps, that’s a good talking point with clinics this week.', 'Worth knowing before your next clinic visit.', 'If you sell into dental clinics, keep an eye on that one.'],
    eye: ['More eye surgery means more demand for the knives and sutures we sell. So it’s one to watch.', 'For the eye care side of the business, that’s a useful signal.', 'That’s the kind of thing ophthalmologists will bring up, so good to know.'],
    tender: ['For us, it could change how hospitals write their tender files. Worth a read before the next round.', 'Anything that changes how hospitals buy changes how we sell. Simple as that.', 'If this goes ahead, timing and pricing on future tenders could shift.'],
    device: ['That affects every supplier, us included: paperwork, pricing, supply.', 'Anyone handling registrations or imports should read the full piece.', 'Good to keep in mind when hospitals ask about supply.'],
    insurance: ['Insurance money is what pays for supplies in the end. So yes, it matters to us.', 'When hospital budgets get squeezed, purchasing slows down. That’s the link.', 'Fees and insurance rules decide how much hospitals can spend.'],
    market: ['For a company importing from Japan, that’s not background noise.', 'It feeds straight into costs and demand, so it’s on our radar.', 'Worth a look for anyone planning budgets.'],
    surgery: ['More procedures, more demand for sutures and staplers.', 'Good context for the surgical team.', 'It shows where surgical care is heading.'],
    policy: ['Check whether it touches licences or tender paperwork.', 'Most of it won’t change our day. Some of it might.', 'One to file away for now.'],
    invest: ['New money usually means new purchasing plans later on.', 'Budget first, purchases later. That’s the pattern.', 'Hospitals with fresh budgets are hospitals that buy.'],
    hospital: ['These hospitals are customers, and they set the tone for everyone else.', 'When the big hospitals move, provincial ones often follow.', 'Good to know who’s doing what at the top.'],
  };
  const REACT = ['Hm.', 'Right.', 'Interesting.', 'Okay.', 'Huh.', 'Yeah.', 'That’s a big one.', 'Makes sense.'];
  const ASK = ['So what does that mean for us?', 'Why should we care?', 'And for MMH?', 'Does that affect us?', 'What’s our angle?'];
  const NEXT = ['Next one.', 'Moving on.', 'Okay, next.', 'Another one.', 'Right, what else?'];

  // mở đầu: câu móc từ tin đầu
  const L = main[0];
  const hook = L ? { dental: 'Dental clinics are in the news today.', eye: 'There’s an eye care story we can’t skip today.', tender: 'If you sell anything to a public hospital, today’s first story is for you.',
    device: 'Medical devices are in the headlines this morning.', insurance: 'Health insurance is in the spotlight today.', market: 'There’s a market story today that touches our costs.' }[tagOf(L)] || 'We’ve got a busy health news day.' : 'It’s a quieter news day.';
  const short = dateEn(DATE).replace(/^\w+, /, '');
  if (duo) {
    say(A, `${hook} ${any(['Morning, everyone.', 'Hi, good morning.', 'Hello again.'])} I’m ${A.name}, this is ${show.name}, and it’s ${short}.`);
    say(B, `${any(['And I’m', 'Hi, I’m', 'Morning, I’m'])} ${B.name}. ${any(['Let’s get into it.', 'Lots to get through.', 'Coffee in hand. Go.'])}`);
  } else say(A, `${hook} ${any(['Morning.', 'Hi there.', 'Hello.'])} I’m ${A.name}, this is ${show.name}, ${short}. ${any(['Let’s get into it.', 'Here’s what matters today.', 'Grab a coffee.'])}`);

  main.forEach((x, i) => {
    const t = tagOf(x), h = head(x), g = gist(x), ang = any(ANGLE[t] || ANGLE.policy);
    const [P, Q] = duo ? (i % 2 ? [B, A] : [A, B]) : [A, A];
    if (i && rnd() < 0.5) say(P, `${any(NEXT)} ${any(INTRO[t])}`); else say(P, any(INTRO[t]));
    say(P, `${h}.`);
    if (duo) {
      say(Q, `${any(REACT)} ${rnd() < 0.5 ? 'What’s the detail?' : 'Go on.'}`);
      say(P, g);
      if (rnd() < 0.6) { say(Q, any(ASK)); say(P, ang); } else say(Q, ang);
    } else { say(A, g); say(A, ang); }
  });
  if (quick.length) {
    say(A, any(['Before we go, the rest of the news, quickly.', 'Okay, outside health, very fast.', 'A few other headlines, thirty seconds.']));
    quick.forEach((x, i) => say(duo && i % 2 ? B : A, `${head(x)}.`));
  }
  if (!main.length && !quick.length) say(A, 'We couldn’t reach our sources this morning. Today’s paper has everything we found.');
  if (L) say(duo ? B : A, `${any(['If you remember one thing today:', 'So, the one to remember:', 'Our pick of the day:'])} ${head(L).split('. ')[0]}.`);
  say(A, `${any(['That’s it from us.', 'And that’s the show.', 'That’s all for today.'])} The full stories, in Vietnamese and English, are in today’s paper. ${any(['See you tomorrow.', 'Have a good day.', 'Talk soon.'])}`);
  if (duo) say(B, any(['Bye for now.', 'Take care, everyone.', 'See you.']));

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
  const SYSTEM = `You are the editor of MMH Daily, a morning news app for staff of MANI Medical Hanoi (MMH). Follow this house guide exactly
(it is in Vietnamese; write stories and scripts in English with Vietnamese where asked):\n\n${fs.readFileSync(path.join(ROOT, 'WRITING.md'), 'utf8')}`;
  // 1. tin song ngữ
  const st = await askJson({ system: SYSTEM, effort: 'low', schema: J.obj({ stories: J.arr(J.obj({ id: J.str, h_en: J.str, h_vi: J.str, dek_en: J.str, s_vi: J.str, s_en: J.str, why_vi: J.str })) }),
    user: `For EVERY story below write: h_en (sharp English headline), h_vi (Vietnamese headline), dek_en (one-line English standfirst),
s_vi (2–3 sentence Vietnamese summary), s_en (2–3 sentence English summary), why_vi (one Vietnamese sentence: what this means for MMH specifically — which product group,
customer or tender step; empty string if nothing useful).\n\nStories (JSON):\n${JSON.stringify(list)}` });
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
2. health: analysis for MMH (180–240 words) in English and Vietnamese: dental, eye care, tenders, devices, insurance, market — what changed, who is affected, what MMH should watch.
3. vocab: 8 useful English terms used in the script, with Vietnamese meaning and a short example from the script.
4. podcast: title, one-line desc, and turns for a 1,200–1,500 word script (about 8–10 minutes). Stories that touch MMH's business come first and deepest, each with a concrete
   'what this means for us'; general economy / politics / society only as a quick round-up at the end. ${show.style === 'solo' ? 'One anchor only.' : show.style === 'qa' ? 'A asks short listener-style questions; B answers.' : show.style === 'desk' ? 'B is the health correspondent and carries health in depth; A wraps up other news briefly.' : show.style === 'deep' ? 'Spend half the show explaining the lead story step by step, then a quick round-up.' : 'Two hosts in real conversation.'}
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

const slim = x => x && ({ id: x.id, t: x.t, u: x.u, src: x.src, d: x.d, lang: x.lang, sec: x.sec, tags: x.tags, mmh: x.mmh, docs: x.docs, img: x.img, also: x.also, kind: x.kind,
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
    lead: picked.lead?.id, sections: {}, healthDesk: { groups: picked.desk, order: Object.keys(DESK) }, docs: picked.docs.map(x => x.id),
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
    for (const x of [...Object.values(picked.sections).flat(), ...picked.cand]) if (!x.why && x.tags?.length && (x.sec === 'health' || x.tags.includes('market'))) x.why = whyOf(x);
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
