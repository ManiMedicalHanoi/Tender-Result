# MMH Daily

Tờ báo buổi sáng của MMH + podcast tiếng Anh mỗi ngày.
**Ưu tiên y tế** (đấu thầu, chính sách, đầu tư công, bệnh viện lớn, thiết bị y tế), sau đó kinh tế, chính trị, xã hội Việt Nam.

## Mỗi sáng (GitHub Actions `.github/workflows/daily.yml`, 05:45 giờ VN)

1. `tools/collect.mjs`: gom tin từ ~45 kênh của báo chính thống Việt + Anh và Google News (Reuters, Bloomberg, Nikkei…), cùng văn bản mới trên vanban.chinhphu.vn.
   Chỉ nhận tin từ tên miền trong `config.json ▸ trusted`. Xếp tin vào 4 mảng, gắn nhãn y tế chuyên sâu, chấm điểm, gộp tin trùng.
2. `tools/edition.mjs`: chọn tin của số báo (không lặp tin của 3 số trước) và chương trình podcast trong ngày (`tools/shows.mjs`):
   Morning Briefing · Health Desk · Two Takes · Market Watch · Ask the Editor · The Explainer · (Chủ nhật) Week in Review.
   - (Tuỳ chọn, ~15k đ/tháng) Có secret `ANTHROPIC_API_KEY`: Claude Haiku 5.5 (đổi bằng biến `DAILY_MODEL`) viết tiêu đề + tóm tắt Việt / Anh,
     "vì sao quan trọng", lời biên tập, phân tích y tế, 8 từ vựng, kịch bản podcast 8–10 phút + phụ đề Việt.
   - **Mặc định, 0 đồng**: dịch máy Google (miễn phí) tin Việt ⇄ Anh; podcast soạn theo mẫu từ tin tiếng Anh + tin y tế tiếng Việt đã dịch (7 kiểu chương trình, câu chuyển ý thay đổi theo ngày).
3. `tools/audio.py`: giọng đọc neural (edge-tts, miễn phí), mỗi người dẫn một giọng, có nhạc hiệu, chuẩn âm lượng, ghi mốc thời gian để phụ đề chạy theo.
4. Lưu `data/` vào git, MP3 lên Releases (`ep-yyyy-mm-dd`), đăng trang lên GitHub Pages (kèm MP3 của 21 ngày gần nhất).

## Cài đặt kho mới (1 lần)
- Settings ▸ Pages ▸ Build and deployment ▸ Source: **GitHub Actions**.
- (Khuyên dùng) Settings ▸ Secrets and variables ▸ Actions ▸ New secret `ANTHROPIC_API_KEY`.
- Actions ▸ MMH Daily ▸ Run workflow (chạy lần đầu, không cần chờ sáng mai).

## Sửa thường gặp
| Muốn | Sửa |
|---|---|
| Thêm / bỏ báo | `config.json ▸ feeds` (+ tên miền ở `trusted`) |
| Đổi từ khoá y tế / kinh tế… | `config.json ▸ health_core`, `kw` |
| Đổi chương trình, giọng, người dẫn | `tools/shows.mjs` (danh sách giọng: `edge-tts --list-voices`) |
| Số tin mỗi mảng | `config.json ▸ sections.*.quota` |
| Giờ chạy | `cron` trong workflow (giờ UTC = giờ VN − 7) |

Chạy thử tại máy: `node tools/collect.mjs && node tools/edition.mjs && python3 tools/audio.py` (cần ffmpeg, `pip install edge-tts`), rồi `python3 -m http.server` trong thư mục này.

## Bản tin nội bộ (tối Chủ nhật 19:00) — chỉ nhân sự MMH
- `tools/weekly.mjs` đọc (chỉ đọc) tuần thứ Hai → Chủ nhật: Report Hub Marketing + Back office (việc xong / quá hạn 4 tuần / tuần sau, sự kiện, công tác),
  CRM Dental · Surgical · Eyeless · Thái (hoạt động, gặp khách, khách, tỉnh, lượt nổi bật, đơn hàng), thầu Hùng Vĩ + iCare (gói có ngày phê duyệt trong tuần), Training Hub (buổi đào tạo).
  Management Task Tracker chưa đọc được (chỉ cho người đăng nhập).
- 4 chương trình xoay vòng theo tuần (`SHOWS_INTERNAL`): MMH This Week (2 người) · Sunday Notes (1 người) · The MMH Roundup (2 người) · From the Desk (1 người); phụ đề Việt.
  Có Claude ⇒ viết tự nhiên, nêu tên người / bệnh viện, mở đầu bằng tin vui; không có ⇒ câu mẫu song ngữ (KHÔNG gửi dữ liệu nội bộ sang dịch máy bên ngoài).
- **Bảo mật**: bản rõ chỉ nằm trong thư mục tạm của máy chạy; `tools/seal.mjs` mã hoá AES-256-GCM bằng secret `DAILY_INTERNAL_KEY` ⇒ `data/internal/<ngày>.json.enc` + MP3 mã hoá trên Releases.
  App ▸ **Nội bộ**: đăng nhập email công ty (dùng chung phiên Report Hub / CRM) ⇒ Training Hub `dailyKey` trả khoá ⇒ giải mã ngay trên máy.
  Log GitHub Actions chỉ in số đếm (kho công khai — ai cũng đọc được log).
- **Cài lần đầu**: Admin mở app ▸ Nội bộ ▸ *Thiết lập (Admin)* ▸ Chép khoá ⇒ Settings ▸ Secrets ▸ Actions ▸ `DAILY_INTERNAL_KEY`. Lộ khoá ⇒ xoá Script Property `DAILY_KEY` của Training Hub ⇒ khoá mới ⇒ dán lại.
- Chạy tay: Actions ▸ MMH Daily ▸ Run workflow ▸ kind = `weekly`.
