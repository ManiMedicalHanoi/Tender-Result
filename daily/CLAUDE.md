# MMH Daily — sổ tay cho Claude Code (phiên Routine "Tổng hợp ngay")

Người dùng là nhân sự MANI Medical Hanoi — **trả lời bằng tiếng Việt**, ngắn gọn. App: báo + podcast tiếng Anh (phụ đề Việt), ưu tiên y tế
(đấu thầu, chính sách, đầu tư công, bệnh viện lớn, thiết bị y tế). Máy Claude Code bị chặn các trang báo ⇒ **việc lấy tin, tạo giọng, đăng trang do GitHub Actions làm**;
Claude chỉ **viết** (dùng gói thuê bao, không gọi API).

## A. Tin hằng ngày — Claude viết (Routine "MMH Daily · Tin y tế")
1. Số báo hôm nay đã có chưa: `ls data/editions` (tên = ngày giờ VN). Chưa có / quá 6 giờ ⇒ chạy workflow **MMH Daily** (`workflow_dispatch`, `kind=daily`)
   bằng công cụ GitHub, chờ xong (≈ 5 phút), `git pull`.
2. `node tools/brief.mjs` ⇒ đọc chương trình hôm nay (người dẫn, kiểu: solo / duo / qa / desk / deep) + danh sách tin.
3. Đọc **WRITING.md** (chọn tin theo mức ảnh hưởng tới MMH + giọng nói tự nhiên). Viết file `/tmp/out.json` theo đúng mẫu ở đầu `tools/apply.mjs`:
   - **Mọi** tin trong brief: tiêu đề Anh + Việt, 1 dòng dẫn tiếng Anh, tóm tắt 2–3 câu Việt + Anh, "vì sao quan trọng với MMH" (cụ thể: nhóm sản phẩm, khách hàng, bước thầu; không có thì để trống).
   - Lời biên tập 60–90 từ (Anh + Việt); phân tích y tế 180–240 từ (Anh + Việt); 8 từ vựng có trong kịch bản.
   - Kịch bản podcast 1.200–1.500 từ (8–10 phút), đúng người dẫn / kiểu chương trình; tin ảnh hưởng tới MMH trước và sâu nhất, tin chung chỉ điểm nhanh cuối chương trình; nói tự nhiên (rút gọn, câu ngắn, phản ứng,
     chuyển lời mượt), số viết để đọc; KHÔNG bịa số liệu / tên / trích dẫn ngoài brief; không vui vẻ khi tin về tai nạn / tử vong; mở đầu khác các số gần đây;
     mỗi lượt kèm phụ đề Việt tự nhiên (`vi`).
4. `node tools/apply.mjs <ngày> /tmp/out.json` (báo lỗi ⇒ sửa rồi chạy lại) ⇒ `git add data && git commit -m "Số báo <ngày> — Claude viết" && git push origin HEAD:main`.
5. Đẩy lên main ⇒ workflow tự tạo giọng + đăng trang (≈ 5 phút). Báo người dùng: chương trình, số tin, độ dài, link trang.

## B. Bản tin nội bộ — Claude viết (Routine "MMH Daily · Nội bộ", tối Chủ nhật hoặc bấm Run now)
Cần: mạng tới `script.google.com` + `script.googleusercontent.com` (môi trường Claude Code), kho này có `data/inbox.pub.json`
(GitHub tạo khi đã có secret `DAILY_INTERNAL_KEY`). Phiên Claude KHÔNG có khoá — chỉ khoá bản tin bằng khoá công khai.
1. `NODE_USE_ENV_PROXY=1 WEEKLY_FACTS_ONLY=1 WEEKLY_OUT=/tmp/mmh-in node tools/weekly.mjs` (Node phải bật proxy mới ra mạng) ⇒ `/tmp/mmh-in/<CN>.facts.json` (số liệu Report Hub, CRM, thầu, đào tạo — ngoài repo).
   Muốn tuần khác: thêm `WEEK_END=yyyy-mm-dd` (Chủ nhật).
2. Đọc **WRITING.md** + file số liệu. Viết `/tmp/mmh-in/out.json` theo mẫu đầu `tools/apply_in.mjs`:
   tiêu đề + mở đầu (Việt + Anh), các mục (thầu · địa bàn & bán hàng · phòng ban · sự kiện · đào tạo · tuần tới), kịch bản 600–900 từ, đúng người dẫn trong `show`
   (solo = 1 người; duo = 2 người trao đổi thật), mỗi lượt có `vi`. Mở bằng tin vui nhất (vd. gói thầu trúng); khen đúng người, đúng việc; nói thẳng việc quá hạn nhưng nhẹ nhàng.
   Chỉ dùng số liệu trong facts. Mở đầu khác các tuần trước (`recentShows`). `overdue` = quá hạn thật; `notUpdated` = dòng việc (thường là việc mẫu
   của sự kiện) chưa ai cập nhật — nhắc nhẹ "nhớ cập nhật trạng thái", KHÔNG gọi là quá hạn.
3. `node tools/apply_in.mjs /tmp/mmh-in/<CN>.facts.json /tmp/mmh-in/out.json` (báo lỗi ⇒ sửa ⇒ chạy lại) ⇒ tự khoá vào `data/inbox/<CN>.sealed`, xoá bản rõ.
4. `git add data/inbox && git commit -m "Bản tin nội bộ <CN> — Claude viết" && git push origin HEAD:main` ⇒ GitHub mở hộp thư, tạo giọng, mã hoá, đăng (≈ 5 phút).
KHÔNG commit file nào trong /tmp; KHÔNG dán tên người / khách hàng vào commit message hay chat công khai.
Không có mạng tới script.google.com ⇒ chạy workflow **MMH Daily** `kind=weekly` (bản mẫu tự động) và báo người dùng.

## Quy tắc
- Chỉ sửa `data/` khi làm số báo; sửa code thì theo README.
- Không đổi lịch (cron) / người dẫn nếu người dùng không yêu cầu.
