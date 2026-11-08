# MMH Daily

Tờ báo buổi sáng của MMH + podcast tiếng Anh mỗi ngày.
**Ưu tiên y tế** (đấu thầu, chính sách, đầu tư công, bệnh viện lớn, thiết bị y tế), sau đó kinh tế, chính trị, xã hội Việt Nam.

## Mỗi sáng (GitHub Actions `.github/workflows/daily.yml`, 05:45 giờ VN)

1. `tools/collect.mjs`: gom tin từ ~45 kênh của báo chính thống Việt + Anh và Google News (Reuters, Bloomberg, Nikkei…), cùng văn bản mới trên vanban.chinhphu.vn.
   Chỉ nhận tin từ tên miền trong `config.json ▸ trusted`. Xếp tin vào 4 mảng, gắn nhãn y tế chuyên sâu, chấm điểm, gộp tin trùng.
2. `tools/edition.mjs`: chọn tin của số báo (không lặp tin của 3 số trước) và chương trình podcast trong ngày (`tools/shows.mjs`):
   Morning Briefing · Health Desk · Two Takes · Market Watch · Ask the Editor · The Explainer · (Chủ nhật) Week in Review.
   - (Tuỳ chọn, tốn phí) Có secret `ANTHROPIC_API_KEY`: Claude tìm thêm thông tin cho 3 tin y tế lớn nhất (web search), viết tiêu đề + tóm tắt Việt / Anh,
     "vì sao quan trọng", lời biên tập, phân tích y tế, 8 từ vựng và kịch bản podcast 9–11 phút.
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
