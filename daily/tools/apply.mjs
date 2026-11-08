// MMH Daily — ghi phần Claude Code viết vào số báo (kiểm tra định dạng trước khi ghi).
//   node tools/apply.mjs <ngày> <file kết quả .json>
// File kết quả: { stories:[{id,h_en,h_vi,dek_en,s_vi,s_en,why_vi}], note:{en,vi}, health:{en,vi}, vocab:[{en,vi,ex}],
//                podcast:{title, desc, turns:[{sp:'A'|'B', text, vi}]} }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [date, file] = process.argv.slice(2);
const fp = path.join(ROOT, 'data', 'editions', date + '.json');
const ed = JSON.parse(fs.readFileSync(fp, 'utf8'));
const out = JSON.parse(fs.readFileSync(file, 'utf8'));
const err = [];
const hosts = ed.podcast.hosts.map(h => h.id);
if (!Array.isArray(out.stories)) err.push('thiếu stories');
for (const s of out.stories || []) if (!ed.stories[s.id]) err.push('id lạ: ' + s.id);
const turns = out.podcast?.turns || [];
if (turns.length < 8) err.push('kịch bản quá ngắn (' + turns.length + ' lượt)');
turns.forEach((t, i) => { if (!hosts.includes(t.sp)) err.push(`lượt ${i}: người nói ${t.sp} không có trong chương trình (${hosts})`); if (!t.text || !t.vi) err.push(`lượt ${i}: thiếu text hoặc phụ đề vi`); });
const words = turns.reduce((n, t) => n + String(t.text).split(/\s+/).length, 0);
if (words < 700) err.push('kịch bản ' + words + ' từ — cần ≥ 700 (≈ 5 phút)');
if (err.length) { console.error('KHÔNG GHI — sửa lại:\n- ' + err.join('\n- ')); process.exit(1); }
const speech = s => String(s).replace(/\bHCMC\b/g, 'Ho Chi Minh City').replace(/\bVND\b/g, 'dong').replace(/(\d)%/g, '$1 percent').replace(/\s+/g, ' ').trim();
for (const s of out.stories) Object.assign(ed.stories[s.id], { h_en: s.h_en, h_vi: s.h_vi, dek: s.dek_en, s_vi: s.s_vi, s_en: s.s_en, why: s.why_vi || undefined, mt: undefined });
ed.note = out.note; ed.healthDesk.analysis = out.health; ed.vocab = out.vocab;
Object.assign(ed.podcast, { title: out.podcast.title, desc: out.podcast.desc, turns: turns.map(t => ({ sp: t.sp, text: speech(t.text), vi: t.vi })), words });
delete ed.podcast.audio;                      // GitHub sẽ tạo lại giọng đọc
ed.writer = 'claude-code'; ed.updated = new Date().toISOString();
fs.writeFileSync(fp, JSON.stringify(ed));
const ip = path.join(ROOT, 'data', 'index.json'), idx = JSON.parse(fs.readFileSync(ip, 'utf8'));
const row = idx.editions.find(e => e.date === date); if (row) Object.assign(row, { writer: 'claude-code', words, title: out.podcast.title });
idx.updated = ed.updated; fs.writeFileSync(ip, JSON.stringify(idx));
console.log(`Đã ghi số ${date}: ${out.stories.length} tin · ${turns.length} lượt lời · ${words} từ (≈ ${Math.round(words / 150)} phút). Đẩy lên main để GitHub tạo giọng + đăng trang.`);
