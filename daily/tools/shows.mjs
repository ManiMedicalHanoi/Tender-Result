// MMH Daily — các chương trình podcast (đổi theo ngày, không ngày nào giống ngày nào) + giọng đọc + bảng thuật ngữ.
// Giọng: Microsoft Edge neural (edge-tts, miễn phí). Mỗi chương trình có người dẫn riêng ⇒ nghe là nhận ra.

export const SHOWS = {
  briefing: {
    name: 'The Morning Briefing', vi: 'Bản tin sáng', style: 'solo',
    desc: 'One anchor, the day’s essential stories in about eight minutes.',
    hosts: [{ id: 'A', name: 'Andrew', voice: 'en-US-AndrewMultilingualNeural', role: 'Anchor' }],
    color: '#1F4E79',
  },
  twotakes: {
    name: 'Two Takes', vi: 'Hai góc nhìn', style: 'duo',
    desc: 'Two hosts trade views on the stories everyone will talk about today.',
    hosts: [{ id: 'A', name: 'Emma', voice: 'en-US-EmmaMultilingualNeural', role: 'Host' }, { id: 'B', name: 'Brian', voice: 'en-US-BrianMultilingualNeural', role: 'Co-host' }],
    color: '#7A3E9D',
  },
  healthdesk: {
    name: 'Health Desk', vi: 'Bàn tin Y tế', style: 'desk',
    desc: 'Tenders, policy, public investment and the big hospitals — the health sector in depth.',
    hosts: [{ id: 'A', name: 'Ava', voice: 'en-US-AvaMultilingualNeural', role: 'Host' }, { id: 'B', name: 'Ryan', voice: 'en-GB-RyanNeural', role: 'Health correspondent' }],
    color: '#0E7C6B',
  },
  markets: {
    name: 'Market Watch', vi: 'Nhịp kinh tế', style: 'duo',
    desc: 'Growth, trade, investment and the money stories behind the headlines.',
    hosts: [{ id: 'A', name: 'Christopher', voice: 'en-US-ChristopherNeural', role: 'Host' }, { id: 'B', name: 'Libby', voice: 'en-GB-LibbyNeural', role: 'Economics analyst' }],
    color: '#B8641B',
  },
  editor: {
    name: 'Ask the Editor', vi: 'Hỏi biên tập viên', style: 'qa',
    desc: 'A host puts the listener’s questions to the editor: what happened, why it matters, what next.',
    hosts: [{ id: 'A', name: 'Jenny', voice: 'en-US-JennyNeural', role: 'Host' }, { id: 'B', name: 'Thomas', voice: 'en-GB-ThomasNeural', role: 'Editor' }],
    color: '#2F6F9F',
  },
  explainer: {
    name: 'The Explainer', vi: 'Giải thích', style: 'deep',
    desc: 'One big story, unpacked step by step — then the rest of the news in brief.',
    hosts: [{ id: 'A', name: 'Michelle', voice: 'en-US-MichelleNeural', role: 'Host' }, { id: 'B', name: 'Guy', voice: 'en-US-GuyNeural', role: 'Reporter' }],
    color: '#A23B3B',
  },
  weekly: {
    name: 'Week in Review', vi: 'Nhìn lại tuần', style: 'duo',
    desc: 'Sunday edition: the week that was in health, the economy, politics and society.',
    hosts: [{ id: 'A', name: 'Natasha', voice: 'en-AU-NatashaNeural', role: 'Host' }, { id: 'B', name: 'William', voice: 'en-AU-WilliamMultilingualNeural', role: 'Co-host' }],
    color: '#3D5A3D',
  },
};

// Bản tin nội bộ Chủ nhật — xoay vòng theo tuần: lúc 1 người dẫn, lúc 2 người.
export const SHOWS_INTERNAL = {
  thisweek: { name: 'MMH This Week', vi: 'MMH tuần này', style: 'duo', desc: 'Two colleagues look back at the week across MMH.',
    hosts: [{ id: 'A', name: 'Ava', voice: 'en-US-AvaMultilingualNeural', role: 'Host' }, { id: 'B', name: 'Andrew', voice: 'en-US-AndrewMultilingualNeural', role: 'Co-host' }], color: '#8A5A00' },
  notes: { name: 'Sunday Notes', vi: 'Ghi chú Chủ nhật', style: 'solo', desc: 'One host, the week at MMH in a relaxed Sunday chat.',
    hosts: [{ id: 'A', name: 'Emma', voice: 'en-US-EmmaMultilingualNeural', role: 'Host' }], color: '#6B4E9B' },
  roundup: { name: 'The MMH Roundup', vi: 'Tổng kết tuần', style: 'duo', desc: 'Wins, field work and what’s next — the team roundup.',
    hosts: [{ id: 'A', name: 'Brian', voice: 'en-US-BrianMultilingualNeural', role: 'Host' }, { id: 'B', name: 'Sonia', voice: 'en-GB-SoniaNeural', role: 'Co-host' }], color: '#2F6F5E' },
  desk: { name: 'From the Desk', vi: 'Từ bàn làm việc', style: 'solo', desc: 'One voice, the week’s numbers and stories from every team.',
    hosts: [{ id: 'A', name: 'Andrew', voice: 'en-US-AndrewMultilingualNeural', role: 'Host' }], color: '#1F4E79' },
};

const ROTATION = ['briefing', 'healthdesk', 'twotakes', 'markets', 'editor', 'explainer'];
/** Chủ nhật = Week in Review; ngày khác xoay vòng theo số ngày, không trùng hôm trước. */
export function showFor(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (d.getUTCDay() === 0) return 'weekly';
  const n = Math.floor(d / 864e5);
  return ROTATION[n % ROTATION.length];
}

// Thuật ngữ Anh – Việt hay gặp trong tin (dùng cho mục "Học từ vựng" khi chưa có AI).
export const GLOSSARY = [
  ['public investment', 'đầu tư công'], ['disbursement', 'giải ngân'], ['tender', 'đấu thầu'], ['bidding', 'đấu thầu'], ['procurement', 'mua sắm'],
  ['contractor', 'nhà thầu'], ['medical equipment', 'trang thiết bị y tế'], ['medical supplies', 'vật tư y tế'], ['health insurance', 'bảo hiểm y tế'],
  ['decree', 'nghị định'], ['circular', 'thông tư'], ['draft law', 'dự thảo luật'], ['National Assembly', 'Quốc hội'], ['Ministry of Health', 'Bộ Y tế'],
  ['hospital autonomy', 'tự chủ bệnh viện'], ['provincial hospital', 'bệnh viện tỉnh'], ['central hospital', 'bệnh viện trung ương'], ['outbreak', 'đợt bùng phát dịch'],
  ['dengue fever', 'sốt xuất huyết'], ['vaccination', 'tiêm chủng'], ['pharmaceutical', 'dược phẩm'], ['drug shortage', 'thiếu thuốc'],
  ['GDP growth', 'tăng trưởng GDP'], ['inflation', 'lạm phát'], ['consumer price index', 'chỉ số giá tiêu dùng (CPI)'], ['exports', 'xuất khẩu'],
  ['foreign direct investment', 'đầu tư trực tiếp nước ngoài (FDI)'], ['trade surplus', 'thặng dư thương mại'], ['interest rate', 'lãi suất'],
  ['exchange rate', 'tỷ giá'], ['state budget', 'ngân sách nhà nước'], ['infrastructure', 'hạ tầng'], ['expressway', 'đường cao tốc'],
  ['real estate', 'bất động sản'], ['stock market', 'thị trường chứng khoán'], ['per capita income', 'thu nhập bình quân đầu người'],
  ['administrative reform', 'cải cách hành chính'], ['streamline', 'tinh gọn'], ['merger', 'sáp nhập'], ['resolution', 'nghị quyết'],
  ['Prime Minister', 'Thủ tướng'], ['General Secretary', 'Tổng Bí thư'], ['diplomatic ties', 'quan hệ ngoại giao'], ['comprehensive strategic partnership', 'đối tác chiến lược toàn diện'],
  ['social welfare', 'an sinh xã hội'], ['flooding', 'ngập lụt'], ['typhoon', 'bão'], ['traffic accident', 'tai nạn giao thông'], ['labor market', 'thị trường lao động'],
  ['minimum wage', 'lương tối thiểu'], ['tuition', 'học phí'], ['food safety', 'an toàn thực phẩm'], ['heritage', 'di sản'], ['festival', 'lễ hội'], ['tourism', 'du lịch'],
];
