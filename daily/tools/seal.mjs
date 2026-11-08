// MMH Daily — mã hoá bản tin nội bộ (AES-256-GCM) bằng khoá DAILY_INTERNAL_KEY (base64, 32 byte; lấy từ Training Hub ▸ dailyKey).
// Định dạng file .enc: [12 byte IV][dữ liệu mã hoá][16 byte tag] — WebCrypto giải mã trực tiếp.
//   node tools/seal.mjs <bản rõ .json> <thư mục mp3 rõ>   ⇒ data/internal/<ngày>.json.enc, audio/internal-<ngày>.mp3.enc, data/internal/index.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function seal(buf, keyB64) {
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) throw new Error('DAILY_INTERNAL_KEY phải là 32 byte (base64)');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  return Buffer.concat([iv, c.update(buf), c.final(), c.getAuthTag()]);
}
export function open(buf, keyB64) {
  const key = Buffer.from(keyB64, 'base64'), iv = buf.subarray(0, 12), tag = buf.subarray(buf.length - 16);
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(buf.subarray(12, buf.length - 16)), d.final()]);
}
export const kidOf = k => crypto.createHash('sha256').update('kid|' + k).digest('hex').slice(0, 8);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [edPath, mp3Dir] = process.argv.slice(2);
  const key = process.env.DAILY_INTERNAL_KEY;
  if (!key) { console.log('Chưa có DAILY_INTERNAL_KEY ⇒ không đăng bản tin nội bộ (an toàn: không ghi bản rõ).'); process.exit(0); }
  const ed = JSON.parse(fs.readFileSync(edPath, 'utf8'));
  const date = ed.date, kid = kidOf(key);
  const mp3 = path.join(mp3Dir, `${date}.mp3`);
  if (fs.existsSync(mp3)) {
    fs.mkdirSync(path.join(ROOT, 'audio'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'audio', `internal-${date}.mp3.enc`), seal(fs.readFileSync(mp3), key));
    ed.podcast.audio = { ...(ed.podcast.audio || {}), file: `audio/internal-${date}.mp3.enc`, enc: true };
  }
  fs.mkdirSync(path.join(ROOT, 'data', 'internal'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'internal', `${date}.json.enc`), seal(Buffer.from(JSON.stringify(ed)), key));
  const ip = path.join(ROOT, 'data', 'internal', 'index.json');
  let idx = { weeks: [] }; try { idx = JSON.parse(fs.readFileSync(ip, 'utf8')); } catch { /* lần đầu */ }
  idx.weeks = [{ date, from: ed.week.from, kid, show: ed.podcast.show, dur: ed.podcast.audio?.dur || 0 }, ...idx.weeks.filter(w => w.date !== date)].sort((a, b) => b.date.localeCompare(a.date));
  idx.updated = new Date().toISOString(); idx.kid = kid;
  fs.writeFileSync(ip, JSON.stringify(idx));
  console.log(`Đã mã hoá bản tin nội bộ ${date} (khoá ${kid}).`);
}
