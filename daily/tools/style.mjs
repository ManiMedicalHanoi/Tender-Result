// MMH Daily — máy soát giọng văn: chặn cụm từ "kiểu AI" và lượt lời quá dài (xem WRITING.md).
export const BANNED = ['delve', 'landscape', 'navigate', 'navigating', 'tapestry', 'testament', 'pivotal', 'robust', 'seamless', 'seamlessly', 'game-changer', 'game changer',
  "it's worth noting", 'it is worth noting', 'it is important to note', "in today's fast-paced", "let's dive in", 'dive into', 'buckle up', 'stay tuned', 'unpack',
  'in conclusion', 'at the end of the day', 'a reminder that', 'shed light', 'ever-evolving', 'plays a crucial role', 'underscores', 'underscore'];
/** trả danh sách lỗi; turns = [{sp, text}] */
export function lint(turns) {
  const err = [];
  turns.forEach((t, i) => {
    const s = ' ' + String(t.text || '').toLowerCase().replace(/[’‘]/g, "'") + ' ';
    for (const b of BANNED) if (new RegExp(`[^a-z]${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z]`).test(s)) err.push(`lượt ${i}: bỏ cụm "${b}" (WRITING.md)`);
    const w = String(t.text || '').split(/\s+/).length;
    if (w > 75) err.push(`lượt ${i}: ${w} từ — quá dài, tách thành nhiều lượt (≤ 75 từ)`);
  });
  const longRuns = turns.filter((t, i) => i && t.sp === turns[i - 1].sp).length;
  if (turns.length > 10 && new Set(turns.map(t => t.sp)).size > 1 && longRuns > turns.length * 0.4) err.push('quá nhiều lượt cùng một người nói liền nhau — cho hai người trao đổi thật');
  return err;
}
