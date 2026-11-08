# MMH Daily — sổ tay cho Claude Code (phiên Routine "Tổng hợp ngay")

Người dùng là nhân sự MANI Medical Hanoi — **trả lời bằng tiếng Việt**, ngắn gọn. App: báo + podcast tiếng Anh (phụ đề Việt), ưu tiên y tế
(đấu thầu, chính sách, đầu tư công, bệnh viện lớn, thiết bị y tế). Máy Claude Code bị chặn các trang báo ⇒ **việc lấy tin, tạo giọng, đăng trang do GitHub Actions làm**;
Claude chỉ **viết** (dùng gói thuê bao, không gọi API).

## A. Tin hằng ngày — Claude viết (Routine "MMH Daily · Tin y tế")
1. Số báo hôm nay đã có chưa: `ls data/editions` (tên = ngày giờ VN). Chưa có / quá 6 giờ ⇒ chạy workflow **MMH Daily** (`workflow_dispatch`, `kind=daily`)
   bằng công cụ GitHub, chờ xong (≈ 5 phút), `git pull`.
2. `node tools/brief.mjs` ⇒ đọc chương trình hôm nay (người dẫn, kiểu: solo / duo / qa / desk / deep) + danh sách tin.
3. Viết file `/tmp/out.json` theo đúng mẫu ở đầu `tools/apply.mjs`:
   - **Mọi** tin trong brief: tiêu đề Anh + Việt, 1 dòng dẫn tiếng Anh, tóm tắt 2–3 câu Việt + Anh, "vì sao quan trọng" (tin y tế: ý nghĩa với nhà cung cấp thiết bị / bệnh viện; không có thì để trống).
   - Lời biên tập 60–90 từ (Anh + Việt); phân tích y tế 180–240 từ (Anh + Việt); 8 từ vựng có trong kịch bản.
   - Kịch bản podcast 1.200–1.500 từ (8–10 phút), đúng người dẫn / kiểu chương trình; y tế trước và sâu nhất; nói tự nhiên (rút gọn, câu ngắn, phản ứng,
     chuyển lời mượt), số viết để đọc; KHÔNG bịa số liệu / tên / trích dẫn ngoài brief; không vui vẻ khi tin về tai nạn / tử vong; mở đầu khác các số gần đây;
     mỗi lượt kèm phụ đề Việt tự nhiên (`vi`).
4. `node tools/apply.mjs <ngày> /tmp/out.json` (báo lỗi ⇒ sửa rồi chạy lại) ⇒ `git add data && git commit -m "Số báo <ngày> — Claude viết" && git push origin HEAD:main`.
5. Đẩy lên main ⇒ workflow tự tạo giọng + đăng trang (≈ 5 phút). Báo người dùng: chương trình, số tin, độ dài, link trang.

## B. Bản tin nội bộ Chủ nhật
Hiện do GitHub Actions làm (bản câu mẫu song ngữ, mã hoá AES-256-GCM, secret `DAILY_INTERNAL_KEY`) — xem README. Bản Claude viết cần thêm quyền mạng
`script.google.com` cho môi trường Claude Code + bước mã hoá qua Training Hub (chưa làm). Dữ liệu nội bộ: KHÔNG ghi bản rõ vào repo, KHÔNG in tên người / khách ra log.

## Quy tắc
- Chỉ sửa `data/` khi làm số báo; sửa code thì theo README.
- Không đổi lịch (cron) / người dẫn nếu người dùng không yêu cầu.
