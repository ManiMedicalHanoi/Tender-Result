// MMH Daily — ghép phần Claude Code viết cho BẢN TIN NỘI BỘ, kiểm tra, rồi KHOÁ vào hộp thư (data/inbox/) — không ghi bản rõ vào repo.
//   node tools/apply_in.mjs <số liệu .facts.json> <kết quả .json>
// Kết quả: { title:{vi,en}, intro:{vi,en}, sections:[{key:'tenders'|'sales'|'departments'|'events'|'training'|'next', vi, en}],
//            podcast:{ title, turns:[{sp:'A'|'B', text, vi}] } }
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lint } from './style.mjs';
import { SHOWS_INTERNAL, GLOSSARY } from './shows.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [factsF, outF] = process.argv.slice(2);
const F = JSON.parse(fs.readFileSync(factsF, 'utf8')), out = JSON.parse(fs.readFileSync(outF, 'utf8'));
const show = SHOWS_INTERNAL[F.show.id], hosts = show.hosts.map(h => h.id);
const turns = out.podcast?.turns || [], err = [];
if (!out.title?.vi || !out.title?.en) err.push('thiếu title vi / en');
if (!out.intro?.vi || !out.intro?.en) err.push('thiếu intro vi / en');
for (const x of out.sections || []) if (!['tenders', 'sales', 'departments', 'events', 'training', 'next'].includes(x.key) || !x.vi || !x.en) err.push('mục lạ hoặc thiếu chữ: ' + x.key);
if (turns.length < 10) err.push('kịch bản quá ngắn (' + turns.length + ' lượt)');
turns.forEach((t, i) => { if (!hosts.includes(t.sp)) err.push(`lượt ${i}: người nói ${t.sp} không có (${hosts})`); if (!t.text || !t.vi) err.push(`lượt ${i}: thiếu text / vi`); });
err.push(...lint(turns));
const words = turns.reduce((n, t) => n + String(t.text).split(/\s+/).length, 0);
if (words < 450) err.push(`kịch bản ${words} từ — cần ≥ 450 (≈ 3–4 phút)`);
const blob = JSON.stringify(out);
if (/@[\w.-]+\.\w{2,}/.test(blob) || /\b0\d{9,10}\b/.test(blob)) err.push('có email / số điện thoại — bỏ đi');
if (err.length) { console.error('KHÔNG GHI — sửa lại:\n- ' + err.join('\n- ')); process.exit(1); }
const speech = s => String(s).replace(/\bVND\b/g, 'dong').replace(/(\d)%/g, '$1 percent').replace(/\s+/g, ' ').trim();
const text = turns.map(t => t.text).join(' ').toLowerCase();
const ed = { kind: 'internal', date: F.date, week: F.week, updated: new Date().toISOString(), writer: 'claude-code', facts: F.facts,
  title: out.title, intro: out.intro, sections: out.sections || [],
  podcast: { show: show && F.show.id, name: show.name, hosts: show.hosts, color: show.color, title: out.podcast.title || `${show.name} · ${F.week.from} – ${F.week.to}`,
    turns: turns.map(t => ({ sp: t.sp, text: speech(t.text), vi: t.vi })) },
  vocab: GLOSSARY.filter(([en]) => text.includes(en.toLowerCase())).slice(0, 8).map(([en, vi]) => ({ en, vi })) };
const tmp = path.join(path.dirname(factsF), F.date + '.json');
fs.writeFileSync(tmp, JSON.stringify(ed));
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'inbox.mjs'), 'seal', tmp], { stdio: 'inherit' });
fs.rmSync(factsF, { force: true }); fs.rmSync(outF, { force: true });
console.log(`Bản tin nội bộ ${F.date}: ${turns.length} lượt · ${words} từ (≈ ${Math.round(words / 150)} phút). Bản rõ đã xoá. git add data/inbox && commit && push origin HEAD:main`);
