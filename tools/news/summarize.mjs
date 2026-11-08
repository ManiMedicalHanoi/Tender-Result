// Tóm tắt tin quan trọng bằng Claude (chỉ chạy khi GitHub Actions có secret ANTHROPIC_API_KEY).
// Mỗi lượt ≤ 30 tin chưa có tóm tắt (điểm cao / liên quan MMH trước). Chỉ dựa vào tiêu đề + mô tả RSS — không bịa thêm.
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM = `Bạn là biên tập viên bản tin chính sách y tế cho MANI Medical Hanoi (MMH) — công ty phân phối trang thiết bị, vật tư y tế
(dao mổ và chỉ khâu nhãn khoa, ghim da ngoại khoa, dụng cụ nha khoa của MANI Nhật Bản), bán cho bệnh viện công qua đấu thầu và cho phòng khám tư.
Với mỗi tin (chỉ có tiêu đề + đoạn mô tả ngắn), viết bằng tiếng Việt:
- s: tóm tắt 1–2 câu, nêu điều mới / ai ban hành / áp dụng từ khi nào nếu tin có nói. KHÔNG thêm chi tiết không có trong tiêu đề / mô tả.
- m: nếu tin ảnh hưởng tới việc đấu thầu, mua sắm, cấp phép, giá, thanh toán BHYT trang thiết bị / vật tư y tế, hoặc bệnh viện mắt / răng hàm mặt / ngoại khoa,
  viết 1 câu "ý nghĩa với MMH" (việc cần theo dõi / làm). Không liên quan thì để chuỗi rỗng.
- lvl: 3 = văn bản / chính sách tác động trực tiếp tới MMH, 2 = nên biết, 1 = tin chung.`;

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['items'],
  properties: { items: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['id', 's', 'm', 'lvl'],
    properties: { id: { type: 'string' }, s: { type: 'string' }, m: { type: 'string' }, lvl: { type: 'integer', enum: [1, 2, 3] } },
  } } },
};

export async function summarize(items, cfg) {
  const todo = items.filter(x => !x.ai && (x.sc >= 5 || x.mmh))
    .sort((a, b) => (b.mmh ? 1 : 0) - (a.mmh ? 1 : 0) || b.sc - a.sc || b.d.localeCompare(a.d)).slice(0, 30);
  if (!todo.length) return 0;
  const client = new Anthropic();
  const list = todo.map(x => ({ id: x.id, nguon: x.src, ngay: x.d.slice(0, 10), tieu_de: x.t, mo_ta: (x.sum || '').slice(0, 400) }));
  const res = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: 'Các tin cần tóm tắt (JSON):\n' + JSON.stringify(list) }],
  });
  if (res.stop_reason === 'refusal') throw new Error('Claude từ chối: ' + (res.stop_details?.category || ''));
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const out = JSON.parse(text).items || [];
  const byId = new Map(items.map(x => [x.id, x]));
  let n = 0;
  for (const o of out) {
    const x = byId.get(o.id);
    if (!x || !o.s) continue;
    x.ai = { s: o.s.slice(0, 400), m: (o.m || '').slice(0, 300) || undefined, lvl: o.lvl };
    if (o.lvl === 3) x.sc += 3;
    n++;
  }
  return n;
}
