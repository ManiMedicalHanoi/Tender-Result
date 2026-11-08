// MMH Daily — bản tóm gọn số báo cho phiên Claude Code (Routine) đọc trước khi viết. In JSON ra màn hình.
//   node tools/brief.mjs [ngày]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOWS } from './shows.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(ROOT, 'data', 'editions');
const date = process.argv[2] || fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().pop().replace('.json', '');
const ed = JSON.parse(fs.readFileSync(path.join(dir, date + '.json'), 'utf8'));
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index.json'), 'utf8'));
const show = SHOWS[ed.podcast.show];
console.error('Đọc WRITING.md trước khi viết. Tin xếp theo điểm liên quan MMH (mmh) cao ⇒ thấp.');
const ids = [...new Set([...Object.values(ed.sections).flat(), ...ed.docs, ...Object.values(ed.healthDesk.groups).flat()])];
console.log(JSON.stringify({
  date, show: { id: ed.podcast.show, name: show.name, style: show.style, desc: show.desc, hosts: show.hosts.map(h => ({ id: h.id, name: h.name, role: h.role })) },
  lead: ed.lead, sections: ed.sections, healthGroups: ed.healthDesk.groups,
  recentShows: idx.editions.filter(e => e.date < date).slice(0, 5).map(e => `${e.date} ${e.show}: ${e.lead}`),
  stories: ids.map(id => { const x = ed.stories[id]; return x && { id, sec: x.sec, tags: x.tags, mmh: x.mmh || 0, lang: x.lang, src: x.src, title: x.t, sum: (x.sum || '').slice(0, 450), docs: x.docs }; }).filter(Boolean)
    .sort((a, b) => b.mmh - a.mmh),
}, null, 1));
