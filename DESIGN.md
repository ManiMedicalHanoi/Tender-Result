# Tender Result — hệ thống giao diện (v2.0, 02/11/2026)

Dashboard kết quả thầu = màn hình **làm việc** (Operate mode), không phải trang giới thiệu.
Tham khảo: skill `impeccable` (Operate · quieter · craft-floor) và `taste-skill` (app-screens: dữ liệu thật, màu trên dữ liệu, không "kiểu AI").
Lớp giao diện nằm ở cuối `index.html`: `<style id="ui2-css">` (token + thành phần) và `<script id="ui2-js">` (màu biểu đồ, bộ quét DOM, ngăn kéo, menu).

## Khung
- **Thanh bên trái sáng** (240px): logo M + "Kết quả thầu / Dao mổ nhãn khoa" · 5 màn hình · bộ lọc của màn hình đang mở · Nguồn dữ liệu + thời điểm dữ liệu.
- **Thanh trên** (dính khi cuộn): chọn thời gian (năm · FY · khoảng tháng) bên trái; Giá trị/Số lượng · tiền tệ · **Xuất PPT** (nút chính duy nhất) · menu `⋯`
  (ngôn ngữ, Phân khúc giá, Tải lại, Giao diện tối, In, Đăng xuất). Không đủ chỗ ⇒ hàng thời gian tự xuống dòng (`.hdr.two`).
- **Tiêu đề màn hình** = chữ 22px + kỳ đang xem + 1 dòng mô tả. Không khối navy.
- **Điện thoại (≤ 860px)**: thanh bên thành ngăn kéo (nút Bộ lọc), thanh dưới 5 màn hình (biểu tượng SVG), menu `⋯` chứa thêm Giá trị/Số lượng + tiền tệ.

## Màu (token ở `:root`, có bản tối)
- Nền `--bg #F4F6F9`, bề mặt `--sf #FFF`, thanh bên `--rail`, viền `--line #E3E7ED`, chữ `--t1/t2/t3`.
- **Màu nằm trên dữ liệu, không trên khung.** Mani = xanh MMH `#3A5CAA` (màu chính duy nhất của biểu đồ); đối thủ = bảng màu trầm `MUTED`;
  phân khúc giá = 1 dải xanh (High `#2F4E8F` → Mid `#7D97C9` → Low `#C3D0E8`); "còn lại" khi Mani được làm nổi = `#B7C1CF`.
- Màu trạng thái chỉ cho trạng thái: tốt `--pos`, xấu `--neg`, chờ `--warn`.
- Màu vàng / xanh lá / tím in sẵn trong code cũ được đổi tự động (plugin `ui2tone` của Chart.js + `fixStyles` trong `ui2-js`).

## Thành phần
- **KPI**: 1 khối chia bằng đường 1px, nhãn 13px xám, số 26px đậm vừa, không viền màu, không sparkline, không icon.
- **Nhận định (insight)**: 1 khối chia cột, không emoji, không viền trái màu.
- **Thẻ**: trắng, viền 1px, bo 10px, không đổ bóng, tiêu đề 14.5px.
- **Bảng**: tiêu đề không nền, không chữ hoa; dòng kẻ mảnh; số canh phải, tabular; hãng = chấm màu + tên (không huy hiệu tô đặc).
- **Nút chọn**: nhóm phân đoạn nền xám nhạt, mục đang chọn = nền trắng + chữ đậm. Bộ lọc thanh bên: danh sách gọn, đang chọn = nền trắng + chữ xanh.
- **Biểu đồ**: chữ Aptos 12px, lưới rất nhạt, không trục dọc, cột bo 2px, nhãn số nhỏ màu xám; đường lũy kế trên cột = màu chữ.

## Không dùng
Emoji làm biểu tượng (bộ quét tự bỏ) · gradient · chữ hoa giãn cách làm nhãn · viền màu dày bên trái/trên thẻ · bóng đổ nặng ·
chấm "live" nhấp nháy · chữ chạy (marquee) · nhiều nút tô màu trên cùng 1 màn hình.

## Kiểm thử
```
python3 -m http.server 8768
LIBS=<node_modules có chart.js, chartjs-plugin-datalabels, xlsx, pptxgenjs> NODE_PATH=$(npm root -g) node tools/test/run.js <thư mục ảnh>
LIBS=… NODE_PATH=$(npm root -g) node tools/test/shots.js <thư mục ảnh> vi
```
`tools/test/mock.js` = backend giả lập (dữ liệu GIẢ). `script.google.com` và CDN bị chặn trong môi trường Claude.
