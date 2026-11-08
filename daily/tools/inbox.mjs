// MMH Daily — "hộp thư khoá" cho bản tin nội bộ do phiên Claude Code viết.
// Phiên Claude KHÔNG giữ khoá DAILY_INTERNAL_KEY: nó khoá bản rõ bằng KHOÁ CÔNG KHAI (data/inbox.pub.json),
// chỉ GitHub Actions (có secret) mở được, tạo giọng đọc rồi mã hoá lại như bản tin thường.
// Khoá riêng X25519 = HKDF(DAILY_INTERNAL_KEY) ⇒ không cần thêm secret mới.
//   node tools/inbox.mjs pub                     (Actions, có khoá) ⇒ ghi data/inbox.pub.json
//   node tools/inbox.mjs seal <bản rõ.json>      (phiên Claude)     ⇒ data/inbox/<ngày>.sealed, XOÁ bản rõ
//   node tools/inbox.mjs open <file.sealed> <ra.json>  (Actions)   ⇒ bản rõ (thư mục tạm)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'data', 'inbox.pub.json');
const PK8 = Buffer.from('302e020100300506032b656e04220420', 'hex');      // tiền tố PKCS#8 của khoá riêng X25519
const SPKI = Buffer.from('302a300506032b656e032100', 'hex');              // tiền tố SPKI của khoá công khai X25519
const b64 = b => Buffer.from(b).toString('base64');

export function privOf(keyB64) {
  const k = Buffer.from(keyB64, 'base64');
  if (k.length !== 32) throw new Error('DAILY_INTERNAL_KEY phải là 32 byte (base64)');
  const d = Buffer.from(crypto.hkdfSync('sha256', k, 'mmh-daily', 'inbox-x25519', 32));
  return crypto.createPrivateKey({ key: Buffer.concat([PK8, d]), format: 'der', type: 'pkcs8' });
}
const rawPub = key => crypto.createPublicKey(key).export({ format: 'der', type: 'spki' }).subarray(-32);
const pubFromRaw = raw => crypto.createPublicKey({ key: Buffer.concat([SPKI, Buffer.from(raw, 'base64')]), format: 'der', type: 'spki' });
const aesKey = (shared, epk) => Buffer.from(crypto.hkdfSync('sha256', shared, epk, 'mmh-inbox-v1', 32));

export function sealTo(buf, pubB64) {
  const eph = crypto.generateKeyPairSync('x25519');
  const epk = rawPub(eph.privateKey);
  const key = aesKey(crypto.diffieHellman({ privateKey: eph.privateKey, publicKey: pubFromRaw(pubB64) }), epk);
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(buf), c.final()]);
  return { v: 1, epk: b64(epk), iv: b64(iv), tag: b64(c.getAuthTag()), ct: b64(ct) };
}
export function openWith(box, keyB64) {
  const epk = Buffer.from(box.epk, 'base64');
  const key = aesKey(crypto.diffieHellman({ privateKey: privOf(keyB64), publicKey: pubFromRaw(box.epk) }), epk);
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  d.setAuthTag(Buffer.from(box.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(box.ct, 'base64')), d.final()]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, a, b] = process.argv.slice(2);
  const KEY = process.env.DAILY_INTERNAL_KEY;
  if (cmd === 'pub') {
    if (!KEY) { console.log('Chưa có DAILY_INTERNAL_KEY — bỏ qua.'); process.exit(0); }
    const pub = b64(rawPub(privOf(KEY)));
    const kid = crypto.createHash('sha256').update('kid|' + KEY).digest('hex').slice(0, 8);
    let old = {}; try { old = JSON.parse(fs.readFileSync(PUB, 'utf8')); } catch { /* lần đầu */ }
    if (old.x25519 !== pub) { fs.writeFileSync(PUB, JSON.stringify({ x25519: pub, kid, note: 'Khoá công khai của hộp thư bản tin nội bộ. Không phải bí mật.' }, null, 1)); console.log('Đã ghi khoá công khai ' + kid); }
    else console.log('Khoá công khai không đổi.');
  } else if (cmd === 'seal') {
    let pub; try { pub = JSON.parse(fs.readFileSync(PUB, 'utf8')); } catch { console.error('Chưa có data/inbox.pub.json — Admin cần thêm secret DAILY_INTERNAL_KEY rồi chạy workflow một lần.'); process.exit(1); }
    const plain = fs.readFileSync(a), ed = JSON.parse(plain);
    const out = path.join(ROOT, 'data', 'inbox', `${ed.date}.sealed`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ date: ed.date, kid: pub.kid, ...sealTo(plain, pub.x25519) }));
    fs.rmSync(a);                                   // không để bản rõ lại trên máy
    console.log(`Đã khoá ⇒ data/inbox/${ed.date}.sealed (bản rõ đã xoá). Đẩy lên main để GitHub tạo giọng đọc + đăng.`);
  } else if (cmd === 'open') {
    if (!KEY) { console.error('Thiếu DAILY_INTERNAL_KEY'); process.exit(1); }
    fs.writeFileSync(b, openWith(JSON.parse(fs.readFileSync(a, 'utf8')), KEY));
    console.log('Đã mở hộp thư ' + path.basename(a));
  } else { console.log('Dùng: pub | seal <file> | open <file.sealed> <ra.json>'); process.exit(1); }
}
