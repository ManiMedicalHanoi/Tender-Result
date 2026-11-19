# MMH Tải hồ sơ thầu — tiện ích Chrome / Edge

Thay bộ cài "Máy tải Agent" (.bat + Python, bị Kaspersky chặn) và bot GitHub cần token.

**Cài 1 lần:** app Theo dõi gói thầu ▸ Tài liệu ▸ *Cài tiện ích* ⇒ tải `MMH_Tai_ho_so_thau.zip` ⇒ giải nén ⇒
`chrome://extensions` (Edge: `edge://extensions`) ▸ bật Developer mode ▸ *Load unpacked* ▸ chọn thư mục vừa giải nén.

**Chạy thế nào:** mở app MMH bất kỳ 1 lần ⇒ tiện ích nhận phiên đăng nhập email (`mmh_tk`). Mỗi phút hỏi máy chủ tender-info
(`botHello`) ⇒ có gói Chờ tải ⇒ mở muasamcong trong cửa sổ thu nhỏ, làm như `mmh-backend/tools/msc/bot.mjs` ⇒ file lên Drive.
VNeGP Client Agent đang chạy ⇒ trang muasamcong gọi Agent lấy luôn file cần Agent (HSMT, QĐ, Báo cáo đánh giá).

- `bg.js` — điều phối (service worker) · `page.js` — chạy trong trang muasamcong (chỉ cửa sổ của tiện ích, cờ `sessionStorage.mmhbot`)
- `app.js` — trên app MMH: gửi phiên đăng nhập, nhận lệnh "kick" từ app · `popup.*` — bảng trạng thái khi bấm biểu tượng

**Sửa xong:** tăng `version` trong `manifest.json`, đóng gói lại:
`cd theo-doi/tien-ich && rm -f ../MMH_Tai_ho_so_thau.zip && zip -qr ../MMH_Tai_ho_so_thau.zip . -x README.md`
(người dùng tải zip mới ▸ chrome://extensions ▸ nút tải lại của tiện ích). Thử với muasamcong thật: workflow *Thử tiện ích tải hồ sơ thầu*.
