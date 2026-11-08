// MMH Daily — gọi Claude (chỉ khi có ANTHROPIC_API_KEY). Mặc định Claude Haiku 5.5 (gói Tiết kiệm, ~0,5 USD/tháng);
// đổi bằng biến DAILY_MODEL (vd. claude-sonnet-5-5). Trả về JSON đúng schema (structured outputs), nhận theo luồng.
export const MODEL = process.env.DAILY_MODEL || 'claude-haiku-5-5';
let client;
export async function askJson({ system, user, schema, maxTokens = 32000, effort = 'low' }) {
  if (!client) { const { default: Anthropic } = await import('@anthropic-ai/sdk'); client = new Anthropic(); }
  const stream = client.messages.stream({
    model: MODEL, max_tokens: maxTokens,
    output_config: { effort, format: { type: 'json_schema', schema } },
    system, messages: [{ role: 'user', content: user }],
  });
  const res = await stream.finalMessage();
  if (res.stop_reason === 'refusal') throw new Error('Claude từ chối: ' + (res.stop_details?.category || ''));
  if (res.stop_reason === 'max_tokens') throw new Error('Claude trả lời bị cắt (max_tokens)');
  const u = res.usage || {};
  console.log(`  Claude ${MODEL}: vào ${u.input_tokens} · ra ${u.output_tokens} token`);
  return JSON.parse(res.content.filter(b => b.type === 'text').map(b => b.text).join(''));
}
const obj = (props) => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props });
export const S = { str: { type: 'string' }, obj, arr: items => ({ type: 'array', items }) };
