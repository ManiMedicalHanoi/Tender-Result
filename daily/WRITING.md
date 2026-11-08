# MMH Daily — cách viết (Claude đọc trước khi viết số báo / bản tin nội bộ)

Người nghe: nhân sự MMH (MANI Medical Hanoi). MMH nhập khẩu và phân phối sản phẩm của MANI (Nhật) và MMG (Đức):
**nha khoa** (trâm nội nha JIZAI, mũi khoan DIA-BURS, vật liệu MMG), **nhãn khoa** (dao mổ, chỉ khâu nhãn khoa, móc, kẹp vi phẫu),
**ngoại khoa** (chỉ khâu, ghim da Manipler). Bán cho bệnh viện công qua **đấu thầu** (qua nhà phân phối) và cho phòng khám / bệnh viện tư.
Họ nghe tiếng Anh để luyện nghe, xem phụ đề Việt khi cần.

## 1. Chọn tin — chỉ những gì chạm tới việc kinh doanh của MMH
Thứ tự ưu tiên:
1. **Nha khoa, nhãn khoa** (bệnh viện mắt, Răng Hàm Mặt, phẫu thuật mắt, phòng khám nha, xu hướng thị trường).
2. **Đấu thầu & mua sắm y tế**, giá thiết bị / vật tư, đàm phán giá, sửa Luật Đấu thầu, mua sắm tập trung.
3. **Thiết bị / vật tư y tế**: đăng ký lưu hành, nhập khẩu, quản lý giá, thiếu hàng.
4. **BHYT, giá dịch vụ kỹ thuật, tự chủ bệnh viện** (quyết định ngân sách mua vật tư).
5. **Thị trường**: Nhật Bản – Việt Nam, tỷ giá yên / USD, thuế nhập khẩu, y tế tư nhân, đầu tư bệnh viện, đầu tư công cho y tế.
6. Bệnh viện lớn: đổi lãnh đạo, kỹ thuật mới, đầu tư (khách hàng / đầu mối thầu).

Ít hoặc bỏ: ca bệnh lạ, tai nạn, an toàn thực phẩm, thuốc lá, vắc xin, chính trị / xã hội chung — chỉ điểm nhanh 1–3 tin cuối chương trình.
Brief có `mmh` (điểm liên quan) + `tags` để tham khảo; vẫn dùng đầu óc biên tập: tin điểm thấp mà thật sự quan trọng với MMH thì cứ chọn.

Mỗi tin quan trọng phải trả lời được: **"chuyện này liên quan gì tới MMH?"** — cụ thể (nhóm sản phẩm nào, khách hàng nào, bước thầu nào),
không chung chung. Không biết thì nói thẳng "chưa rõ ảnh hưởng, đáng theo dõi", không bịa.

## 2. Giọng nói — như hai đồng nghiệp nói chuyện, không như máy đọc tin
- Câu ngắn. Rút gọn (it's, we're, that's). Mỗi lượt 1–3 câu; thỉnh thoảng một lượt chỉ 1–3 từ ("Wait, really?", "Huh.", "Fair.").
- **Kể lại bằng lời mình**, không đọc lại tiêu đề / tóm tắt của báo. Không mở tin bằng tên cơ quan dài dòng.
- Hỏi – đáp thật: người kia hỏi điều người nghe đang nghĩ ("So who pays for that?", "Does that hit us?"), ngắt lời nhẹ, đồng ý / phản biện nhẹ.
- Một chút cá nhân, có chừng mực ("I had to read that twice.", "Our dental guys will like this one.").
- Số viết để đọc: "about ninety-six million dong", "three point two percent"; năm, ngày đọc tự nhiên.
- Chuyển tin bằng nối ý, không bằng câu khuôn ("Speaking of prices…", "Which brings us to…").
- Tin buồn (tử vong, tai nạn): giọng trầm, không đùa.
- Mở đầu mỗi số **khác** các số gần đây (xem `recentShows`). Không mở bằng "Welcome to…" lặp lại; có thể mở bằng chính tin hay nhất.
- Kết: 1 câu "điều đáng nhớ hôm nay" + chào ngắn.

**Cấm** (máy soát `apply.mjs` sẽ từ chối): delve, landscape, navigate/navigating, tapestry, testament, pivotal, robust, seamless, game-changer,
"it's worth noting", "it is important to note", "in today's fast-paced", "let's dive in", "dive into", "buckle up", "stay tuned", "unpack",
"in conclusion", "at the end of the day", "a reminder that", "shed light", "ever-evolving", "plays a crucial role", "underscores".

Ví dụ — **không nên**:
> A: On the policy front. The Ministry of Health has issued a draft decree on medical equipment management. It aims to improve transparency.
> B: That's a significant development that underscores the importance of regulatory compliance.

**Nên**:
> A: Okay, this one's going to land on somebody's desk at MMH.
> B: The device rules?
> A: Yeah. The Health Ministry wants hospitals to publish what they pay for equipment. Not just the winning bid, the actual price.
> B: Huh. So everyone sees everyone's prices.
> A: Pretty much. Which changes how you price a tender, right? You can't quote high in one province and low in the next.
> B: Fair. Who's affected first?
> A: Big public hospitals. So, our eye knives in the central hospitals, for a start.

## 3. Phụ đề Việt (`vi`)
Dịch **ý**, tự nhiên như người Việt nói, không dịch từng chữ. Giữ tên sản phẩm (JIZAI, MVR, phaco), tên người dẫn.
"Huh." ⇒ "Ồ."; "Fair." ⇒ "Cũng phải."; "Wait, really?" ⇒ "Khoan, thật à?".

## 4. Đúng sự thật
Chỉ dùng thông tin có trong brief (tin) / facts (nội bộ). Không bịa số, tên, trích dẫn, ngày. Ý kiến / nhận định phải nói rõ là nhận định ("My guess is…").
Bản tin nội bộ: dùng tên như trong facts; không nhắc số điện thoại, email; khách hàng chỉ nêu tên cơ sở + tỉnh.
