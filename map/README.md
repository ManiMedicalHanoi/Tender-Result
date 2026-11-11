# Tender Map — bản đồ trúng thầu dao / chỉ khâu nhãn khoa (`map/`)

Trang tĩnh (GitHub Pages): `https://manimedicalhanoi.github.io/Tender-Result/map/`

## Trang (`index.html` + `app.css` + `app.js`, SVG, không cần thư viện ngoài — trừ SheetJS khi bấm Xuất Excel) — cài được như app

- **App (PWA)**: `manifest.webmanifest` + biểu tượng `app/` (bản đồ Việt Nam, chấm vàng Hà Nội / xanh TP.HCM; dựng bằng script SVG ⇒ PNG) + `sw.js` (trang / script lấy mạng trước, mất mạng ⇒ bản lưu;
  dữ liệu Apps Script không qua service worker, trang tự nhớ bản đọc gần nhất). Nút **Cài app**: Chrome / Android ⇒ hộp cài của trình duyệt, iPhone / trình duyệt trong Zalo… ⇒ hướng dẫn từng bước.
  Đổi quy tắc lưu ⇒ tăng `V` trong `sw.js`.
- **Thống kê theo Giá trị / Số lượng** (nút trên cùng) và **loại sản phẩm** (ô chọn: Dao · Slit · Stab · Crescent · Chỉ khâu · Nylon…) — áp cho màu bản đồ, số liệu, sản phẩm trúng,
  theo tháng, theo miền, tỉnh dẫn đầu, top bệnh viện, thẻ bệnh viện.
- **Bệnh viện trên bản đồ**: bấm tỉnh ⇒ chấm từng bệnh viện (vị trí theo quận / phường trong địa chỉ — `vn-dist.js`; không thấy ⇒ tâm tỉnh cũ), to theo chỉ số, vòng vàng = top 10, tên tự tránh chồng;
  bấm chấm ⇒ chi tiết. Điện thoại: bản đồ ghim trên cùng khi cuộn danh sách, 2 ngón để phóng to.

- Bản đồ 34 tỉnh / thành (từ 01/07/2025), đường nét đứt = 63 tỉnh cũ, Hoàng Sa · Trường Sa. Màu: Hùng Vĩ (xanh dương) · iCare (xanh ngọc) · cả 2 (tím); đậm hơn = giá trị cao hơn; số trên tỉnh = số gói.
- **Nhóm sản phẩm trúng**: Dao Slit / Stab / Crescent / khác · Chỉ Nylon / Polypropylene / PGA / Silk / Polyester (chỉ khâu theo `products.js` — bảng mã catalogue MANI trong MMH Library).
  Lọc nhanh: Dao / Chỉ khâu ở thanh trên, bấm 1 nhóm trong "Sản phẩm trúng" để chỉ xem nhóm đó.
- **Bệnh viện trúng nhiều nhất**: tab Giá trị · Dao · Slit · Stab · Crescent · Chỉ khâu · Nylon… (theo số lượng); rê chuột ⇒ tô viền tỉnh.
- Bấm tỉnh ⇒ phóng to, bóng tròn theo tỉnh cũ, danh sách **bệnh viện trúng** (gói, ngày trúng gần nhất, hiệu lực, sản phẩm). Bấm bệnh viện ⇒ hiệu lực hợp đồng, **gói trúng gần nhất**
  (thanh tiến độ, sản phẩm · SL · đơn giá), cơ cấu sản phẩm, **lịch sử trúng** mọi năm (từ FY65, bật xem cả gói trượt / chờ).
- Quay lại: nút **‹** ở góc bản đồ / tiêu đề bảng, Esc, bấm ra biển, nút Back trình duyệt / điện thoại. Link `#<Tỉnh>` hoặc `#<Tỉnh>/<Bệnh viện>` mở thẳng.
- Lọc: FY (từ FY67) + quý, NPP, Dao / Chỉ khâu, Trúng thầu / mọi gói tham dự. `2d.html` = chuyển hướng về `index.html` (link cũ).
- Bản 3D (deck.gl) thử ngày 03/11/2026 đã bỏ theo yêu cầu người dùng (xem lịch sử git nếu cần). Dòng ghi chú nguồn dữ liệu cuối trang đã bỏ (người dùng yêu cầu).

## Cập nhật 04/11/2026 — KQTT toàn quốc · tra cứu cơ sở y tế · Theo dõi thầu

- **Nguồn thứ 3 — KQTT thị trường** (file tender tổng `1lI1s1nE…` ▸ sheet *Data xử lý*: KQTT dao nhãn khoa MỌI hãng trên bệnh viện công lập, từ 01/2023):
  đọc qua web app Hùng Vĩ `?action=kqttMap&from=202209` (`mmh-backend/backends/tender-hungvi/MMH_KqttMap.gs`). **Bỏ trùng theo số TBMT**: gói KQTT có TBMT (bỏ hậu tố `-01`)
  đã xuất hiện ở file iCare / Hùng Vĩ ⇒ bỏ cả gói, chỉ tính theo NPP. Màu KQTT `#B4532A`. Bộ lọc nguồn: Mọi nguồn · 2 NPP · Hùng Vĩ · iCare · KQTT thị trường;
  **Hãng**: Mọi hãng · MANI · Hãng khác (NPP = MANI; KQTT theo Manufacturer / mã `M…`); kỳ thêm **Mọi năm** (từ FY64) và FY64–FY66. Khối **Hãng trúng** = thị phần theo SL / giá trị.
- **Danh mục cơ sở y tế công lập** `csyt.js` (1.233 cơ sở: bệnh viện, TTYT, PKĐK khu vực…; tên, loại, chuyên khoa, tuyến, tỉnh mới + cũ, địa chỉ, **toạ độ thật** từ OpenStreetMap).
  Dựng bằng `python3 -I tools/csyt_build.py --kqtt <file KQTT.xlsx>` (OSM bản xuất HOT + bên mời thầu KQTT + `tools/csyt_seed.csv` bệnh viện lớn OSM thiếu). Số giường / hạng: chưa có nguồn mở (cột `beds` / `rank` trống).
  Bệnh viện có gói thầu được nối với danh mục (cùng tỉnh, tên khớp gần đúng — `sameName`: bỏ dấu, mở viết tắt BV / BVĐK / TTYT, khác chuyên khoa / số hiệu ⇒ khác cơ sở) ⇒ chấm trên bản đồ theo toạ độ thật.
- **Ô tìm** (thanh trên, Ctrl/⌘ + K): bỏ dấu, hiểu viết tắt (`bv mat nghe an`, `ttyt anh son`, `bvdk tinh`), khớp tên / tỉnh mới / tỉnh cũ / địa chỉ; nhãn NPP · KQTT · Theo dõi.
  Chọn ⇒ chi tiết cơ sở: **Thông tin cơ sở** (loại, tuyến, địa chỉ, tỉnh, quy mô, lượng trúng theo FY, Google Maps) + gói trúng gần nhất + hãng trúng + lịch sử dao & chỉ khâu (mọi nguồn).
  Cơ sở chưa có gói thầu vẫn mở được (chấm xám).
- **Chế độ Theo dõi thầu** (nút *Kết quả thầu | Theo dõi thầu*): **chỉ tài khoản email công ty** @manimedicalhanoi.com / @mani.inc (người dùng chốt 04/11/2026)
  — đăng nhập email + mã 6 số qua Training Hub, phiên `localStorage.mmh_tk` dùng chung Report Hub / CRM (đã đăng nhập ở 2 app đó thì vào thẳng). Người cập nhật = tên trong phiên.
  Phần Kết quả thầu (NPP + KQTT) vẫn xem không cần đăng nhập.
  Ghi / đọc sheet ẨN **FOLLOW UP TENDER** của backend CRM Surgical VN (`crm-surgical/MMH_TenderFU.gs`: `fuList` / `fuSave`). Mỗi lần cập nhật = 1 dòng mới (giữ đủ lịch sử, không xoá):
  cơ sở · tên gói · TBMT · loại SP (Dao nhãn khoa · Chỉ khâu · Ghim da Manipler · Hook = móc mở vùng bè · Micro Forceps = kìm vi phẫu) · mã + SL ước tính (`codes.js` từ MMH Library: 114 mã dao, 187 mã chỉ, 4 mã ghim da, 10 mã kìm vi phẫu, mã Hook MTH-S — hồ sơ dịch catalogue S0017 / flyer S0038; `python3 -I tools/codes_build.py <mmh-library>`) ·
  **giai đoạn** 1 Giới thiệu → 2 Lên danh mục → 3 Chốt cấu hình → 4 Ra báo giá → 5 Ra HSMT → 6 Đang chấm thầu → 7 Đã trúng / 8 Đã trượt / 9 Huỷ · mốc dự kiến · giá trị ước tính · tình hình (chữ tự do).
  Bản đồ tô tỉnh theo số gói, chấm cơ sở theo giai đoạn; bảng bên: số gói, theo giai đoạn (bấm để lọc), tỉnh, mốc sắp tới, cập nhật gần đây; lọc Mọi PIC / Của tôi, Đang theo dõi / Đã trúng / Trượt – dừng.
  Ghi không chờ: hiện ngay, gửi nền theo hàng đợi `localStorage.tm_fu_outbox_v1` (cùng `rid`, mất mạng tự thử lại, lỗi ⇒ chip đỏ Thử lại / Bỏ).
- **Kiểm thử**: `python3 -m http.server 8771` rồi `NODE_PATH=$(npm root -g) node tools/map_test.js [thư mục ảnh]` (backend giả lập `tools/map_mock.js`; `KQTT_JSON=<file>` để dùng dữ liệu kqttMap thật — không đưa vào repo).

## Cập nhật 04/11/2026 (2) — giao diện gọn sau review

- Thanh trên: ô tìm · *Kết quả thầu | Theo dõi thầu* · **Kỳ** (ô chọn: Từ FY67 / Mọi năm / FYxx / quý) · Giá trị | Số lượng · **Bộ lọc** (nguồn, hãng, loại SP, chỉ gói trúng / mọi gói, tô màu,
  ranh giới tỉnh cũ). Bộ lọc đang bật hiện thành nhãn có × dưới thanh trên.
- **Tô màu theo thị phần MANI** (Bộ lọc ▸ Tô màu): tỉnh màu cam (hãng khác nhiều) ⇄ xanh (MANI nhiều), số trên tỉnh = % MANI; bảng bên có “Thị phần MANI theo tỉnh”.
- Chi tiết cơ sở tách **hợp đồng MANI** và **hãng khác đang có hợp đồng**, gói MANI / hãng khác trúng gần nhất, lịch sử gắn nhãn hãng. Không có gói trong kỳ ⇒ gợi ý gói gần nhất + “Xem Mọi năm”.
- Trong tỉnh: chấm xám = cơ sở y tế công lập chưa có gói (bấm xem thông tin). Chú giải thu gọn được (tự thu khi vào tỉnh). Top bệnh viện có ▲▼ so với kỳ trước và nút **+ Theo dõi**.
- Điện thoại: thanh trên gọn (logo · tìm · bộ lọc), bản đồ toàn màn hình, bảng chi tiết **trượt từ dưới lên** (kéo / bấm thanh để mở rộng).
- Hướng dẫn từng bước lần đầu mở app; nút **?** để xem lại. Bỏ ghi chú kỹ thuật về gói KQTT trùng TBMT.

## Cập nhật 04/11/2026 (3) — phân tích & xuất

- Bảng bên có tab **Tổng quan · Thầu lại · Giá trúng · Hiệu quả NPP · Dự báo** (theo toàn quốc hoặc tỉnh đang xem, áp bộ lọc):
  - **Thầu lại**: hợp đồng MANI / hãng khác hết hạn trong 12 tháng tới (+ vừa hết hạn ≤ 3 tháng), nhóm theo tháng, mời thầu dự kiến ≈ hết hạn − 3 tháng;
    nút **+ Theo dõi thầu lại** mở hộp theo dõi điền sẵn tên gói, mã + SL (hợp đồng hãng khác: SL + ghi chú hãng / mã / đơn giá đang dùng), mốc, ghi chú. Chưa đăng nhập ⇒ đăng nhập xong tự mở tiếp.
  - **Giá trúng** (dao): giá TB có trọng số MANI ⇄ hãng khác theo loại dao, theo hãng (thấp – cao), theo FY; danh sách cơ sở chuyển từ MANI sang hãng khác.
  - **Hiệu quả NPP**: Hùng Vĩ / iCare — tham dự, trúng, trượt, chờ, tỉ lệ trúng, giá trị, thị phần MANI ở miền phụ trách; theo quý, theo tỉnh.
  - **Dự báo**: hợp đồng MANI còn hiệu lực ⇒ SL ÷ số tháng thực hiện mỗi tháng (12 tháng tới), theo nguồn, theo nhóm SP — để đối chiếu file Dự trù NPP.
- **Theo dõi thầu tự khớp kết quả**: gói theo dõi có số TBMT trùng gói trúng (KQTT / NPP) — hoặc chưa có TBMT, đang ở giai đoạn 4–6 và cơ sở có gói trúng phê duyệt sau ngày bắt đầu theo dõi —
  hiện “Đã có kết quả: MANI trúng / <hãng> trúng” + nút **Ghi kết quả** (điền sẵn giai đoạn 7 / 8, hãng, mã, SL, đơn giá). Bảng bên Theo dõi có mục “Đã có kết quả thầu — cần cập nhật”.
- Nút **Xuất** (thanh trên): **Excel** (SheetJS 0.18.5 từ cdnjs, tải khi bấm) — sheet Bộ lọc, Gói thầu (từng SP), Bệnh viện, Tỉnh, Thầu lại, Giá trúng dao, Chuyển sang hãng khác,
  Hiệu quả NPP, Dự báo tiêu thụ; **ảnh bản đồ PNG** (đúng khung đang xem, tiêu đề + chú giải bộ lọc).
  Kiểm thử Excel: `XLSX_JS=<đường dẫn xlsx.full.min.js> NODE_PATH=$(npm root -g) node tools/map_test.js` (cdnjs bị chặn trong môi trường kiểm thử; `npm pack xlsx@0.18.5`).

## Cập nhật 04/11/2026 (4) — nhắc việc, CRM, tách file, CI

- **Nhắc việc Theo dõi thầu** (backend `crm-surgical/MMH_TenderFU.gs` v1.3): mỗi sáng (~08:00, trừ CN) gói có mốc dự kiến trong 3 ngày tới / quá mốc chưa cập nhật,
  hoặc ≥ 30 ngày chưa cập nhật (kèm trưởng nhóm) ⇒ thông báo ở nút **Nhắc tôi** của Report Hub / CRM; bấm ⇒ mở Tender Map `?v=fu#<Tỉnh>/<Cơ sở>` (đúng cơ sở, chế độ Theo dõi thầu).
  Thứ Hai: email danh sách gói đang theo dõi cho từng PIC + email tổng cho trưởng nhóm.
- **CRM Surgical trong chi tiết cơ sở** (đã đăng nhập): địa bàn khớp tên + tỉnh ⇒ mã, PIC, lượt gặp 12 tháng (5 lượt gần nhất, phản hồi), người liên hệ (CBC, không SĐT), đơn hàng 12 tháng (`fuCrm`).
- Mã trang tách khỏi `index.html`: `app.css` (giao diện) + `app.js` (mã). Đổi 2 file này ⇒ tăng `?v=` trong `index.html` và trong `CORE` của `sw.js` (cùng `V`).
- **Kiểm thử tự động** (GitHub Actions `.github/workflows/map-test.yml`): mỗi PR đổi `map/**` / `tools/map_*.js` chạy `tools/map_test.js` (Playwright 1.48.2 + SheetJS 0.18.5, backend giả lập); lỗi ⇒ xem ảnh chụp trong Artifacts.

## Cập nhật 05/11/2026 — màu theo tiến độ · cảnh báo hợp đồng sắp hết hiệu lực

- Chế độ **Theo dõi thầu**: tỉnh tô màu theo **giai đoạn đang theo dõi xa nhất** (1 Giới thiệu → 6 Chấm thầu: xanh nhạt → xanh đậm → cam; 7 Đã trúng xanh lá,
  8 Đã trượt đỏ, 9 Dừng xám), chấm cơ sở cùng màu; chú giải liệt kê đủ 9 giai đoạn, tooltip tỉnh đếm gói theo giai đoạn.
- **Cảnh báo**: hợp đồng MANI hết hiệu lực trong 6 tháng tới (hoặc vừa hết ≤ 3 tháng) mà cơ sở **chưa có gói theo dõi** đang chạy, hoặc gói theo dõi đã **≥ 30 ngày chưa cập nhật**
  ⇒ khối đỏ đầu bảng bên (nút **+ Theo dõi thầu lại** điền sẵn / **Cập nhật**), tỉnh có vòng đỏ nhấp nháy (tỉnh chưa có gói theo dõi hiện huy hiệu "!"),
  cơ sở có viền đỏ nét đứt, số cảnh báo trên nút *Theo dõi thầu* (cả khi đang xem Kết quả thầu). Hợp đồng hãng khác sắp hết hạn chưa ai theo dõi = mục "cơ hội" thu gọn bên dưới.
  Tab Thầu lại gắn nhãn "Chưa theo dõi". Cần đăng nhập (dữ liệu theo dõi chỉ tài khoản công ty xem được).

## Cập nhật 05/11/2026 (2) — Hoạt động Sales · cơ sở tư nhân · tự cập nhật

- Chế độ thứ 3 **Hoạt động** (nút *Kết quả thầu | Theo dõi thầu | Hoạt động*, link `?v=act`; chỉ tài khoản email công ty — ai đăng nhập cũng xem toàn bộ dữ liệu của Viet Ha và Khang):
  đọc CRM Surgical `fuVisits` (backend `crm-surgical/MMH_VisitMap.gs`): danh sách khách 1. CUSTOMER CODE + mọi lượt việc khách hàng 6. WEEKLY REPORT từ 01/09/2025.
  - Chọn **kỳ** (FY · quý · từng tháng), **PIC** (Cả nhóm · Viet Ha · Khang), **loại** (Viếng thăm | Mọi việc), **trạng thái** (Đã làm | Cả kế hoạch).
  - Chỉ tính **Viet Ha (tím xanh) và Khang (cam)** — lượt của quản lý, Admin, tài khoản TEST không lên bản đồ.
  - Tỉnh tô **màu PIC, đậm / nhạt theo số lượt viếng thăm**; chấm khách màu PIC, to theo số lượt, vòng vàng = top 10; chấm xám = khách chưa gặp trong kỳ.
  - Bảng bên: số lượt, khách được gặp / tổng, tỉnh, % lượt có ảnh, **theo PIC**, lượt theo tháng, **khách gặp nhiều nhất**, **khách lâu chưa gặp** (≥ 90 ngày), lượt gần đây.
  - Bấm chấm / tìm tên khách ⇒ **lịch sử chăm sóc** (mọi lượt: hoạt động, kết quả, phản hồi, bước tiếp theo, ảnh — `fuVisitLog`) + **lịch sử thầu** (cơ sở công lập đã nối với danh mục).
  - **Định vị khách**: ghim tay (sheet ẩn *TENDER MAP · VỊ TRÍ ĐỊA BÀN*, `fuLocSave`) > cơ sở trong danh mục (toạ độ thật) > cụm GPS ảnh viếng thăm (trung vị, ≥ 50% điểm trong 1,5 km) > phường / quận trong địa chỉ > tâm tỉnh.
    Nút **Ghim trên bản đồ** (bấm vào vị trí đúng), **Gắn cơ sở khác** (chọn cơ sở trong danh mục), **Sửa tên chuẩn**.
- **Tên chuẩn** khách hàng: bảng `VM_STD` (backend `crm-surgical/MMH_AccNames.gs`, 292 khách của 2 PIC: tên đúng ngoài đời + loại công lập / tư nhân / NPP) > cột "Tên chuẩn" sửa trên app >
  tự chuẩn hoá (viết hoa đầu từ, mở BV / BVĐK / PK / TTYT…). Tên gốc CRM vẫn tìm được.
- **Cơ sở tư nhân** (theo `VM_STD`): khách chưa có trong danh mục cơ sở công lập được thêm vào danh mục (nhãn *Tư nhân · CRM*); khách khớp bệnh viện tư trong danh mục OSM (Mắt Sài Gòn, Cao Thắng…) ⇒ đánh dấu tư nhân.
  Theo dõi thầu của cơ sở tư nhân dùng giai đoạn mua sắm riêng: **11 Giới thiệu → 12 Demo → 13 Đề xuất từ chuyên môn → 14 Ký hợp đồng → 15 Sử dụng hàng** (18 Không thành công · 19 Dừng),
  không có ô TBMT; bản đồ / chú giải / bảng bên tách *thầu công lập* và *mua sắm tư nhân*. Nút **+ Thêm cơ hội mua sắm** trong chi tiết khách tư nhân.
- **Tự cập nhật**: trang đang mở đọc lại 3 nguồn thầu (iCare, Hùng Vĩ, KQTT) + Theo dõi thầu + Hoạt động mỗi ~5 phút (và khi quay lại tab sau ≥ 2 phút); không đọc lại khi đang gõ / mở hộp thoại / đang ghim.
  Sales lưu việc trên CRM ⇒ bản đồ Hoạt động đổi ở lần đọc kế (backend đệm theo dấu của 2 tab CRM).
- Vòng nhấp nháy cảnh báo hợp đồng sắp hết hiệu lực đổi sang **đỏ hồng `#FF1F5A`** (viền sáng) — màu nâu cũ trùng màu KQTT, khó nhận ra.

## Cập nhật 08/11/2026 — độ phủ địa bàn · ảnh đi địa bàn · hiện tức thì · bảng bên gọn

- **Độ phủ** (Hoạt động ▸ *Độ phủ cơ sở trúng thầu*): các cơ sở **MANI đã trúng thầu** (hoặc **có KQTT dao / chỉ khâu, mọi hãng**) đã được Sales chăm sóc trong kỳ chưa —
  tỉnh tô cam (ít) ⇄ xanh lá (đủ), số trên tỉnh = đã chăm sóc / tổng, chấm đỏ = chưa chăm sóc; bảng bên: 4 ô số, theo tỉnh, danh sách chưa chăm sóc theo ưu tiên (hợp đồng sắp hết hạn trước).
- **Ảnh + lần gặp gần nhất**: rê chuột vào khách (Hoạt động) hoặc bệnh viện (Kết quả thầu / Theo dõi thầu) ⇒ ảnh đi địa bàn gần nhất + kết quả, bước tiếp theo; chi tiết khách / cơ sở có thẻ ảnh ở đầu.
- **Hiện tức thì**: bấm khách / bệnh viện không còn chờ máy chủ — dùng 3 lượt gần nhất có sẵn và bản lưu trên máy, đọc mới ở nền (backend `crm-surgical/MMH_VisitMap.gs` v1.1).
- **Bảng bên gọn**: số chính ở trên, dòng điểm chính thay đoạn văn, xếp hạng / biểu đồ / danh sách phụ thành mục thu gọn (nhớ mở / đóng).

## Cập nhật 11/11/2026 (4) — rà soát theo 3 mục đích: theo dõi thầu · Sales cập nhật · quản lý xem hiệu quả (v24)
- **So sánh theo Sales** (quản lý; ở Hoạt động và Theo dõi thầu khi xem cả nhóm): cột = Sales, dòng = Lượt viếng thăm · Khách phụ trách đã gặp (% và số) ·
  Gói đang theo dõi · Lần cập nhật trong kỳ · Gói > 30 ngày chưa cập nhật · NPP trúng ở địa bàn · Doanh số ước tính FY. Theo kỳ đang xem, theo tỉnh đang chọn;
  bấm tên 1 Sales ⇒ xem riêng địa bàn đó. Sales đăng nhập chỉ thấy cột của mình ("Kết quả của …").
- **Theo dõi thầu**: bảng bên xếp lại — 3 ô số (gói đang theo dõi · cơ sở · cập nhật 7 ngày) + nút to **+ Thêm gói theo dõi** ⇒ gói đã có kết quả cần cập nhật ⇒ hợp đồng sắp hết hạn
  ⇒ So sánh theo Sales ⇒ chi tiết. Bỏ ô dao / chỉ ước tính (trùng thẻ doanh số) và nút Thêm gói trùng ở thanh trên. Hàng nút giai đoạn đếm đúng tỉnh đang xem (trước đếm cả nước).
- **Chi tiết cơ sở**: nút chính to — có 1 gói đang mở ⇒ **Cập nhật gói: <giai đoạn>** + "+ Gói khác"; chưa có ⇒ **+ Thêm gói theo dõi**. Địa chỉ quá dài (file NPP dính tên gói) cắt gọn.
- **Kết quả thầu**: kỳ hiện tại chưa có gói ở tỉnh / toàn quốc (đầu FY, KQTT cập nhật chậm) ⇒ thông báo ngay đầu bảng "FY68 chưa có gói trúng ở … KQTT toàn quốc mới cập nhật đến mm/yyyy"
  + nút **Xem FY67** · **Xem mọi năm**.
- **Hoạt động**: số "khách phụ trách đã gặp" ở bảng bên = thẻ trên bản đồ (cùng bỏ NPP; trước lệch 290 / 292).

## Cập nhật 11/11/2026 (3) — đăng nhập mật khẩu · điện thoại không che bản đồ · chống nhập trùng · mở nhanh (v23)
- **Đăng nhập email + mật khẩu**: màn hình đầu có ô Email + Mật khẩu (trình duyệt / app nhớ và tự điền); chưa có / quên mật khẩu ⇒ **Nhận mã qua email** như cũ,
  đăng nhập bằng mã xong app mời **Đặt mật khẩu cho lần sau**. Chrome / Edge / Android: đã lưu mật khẩu thì phiên hết hạn tự đăng nhập lại (không hỏi).
  Phiên còn < 25 ngày tự gia hạn 30 ngày. Bấm tên ở thanh trên ⇒ Đặt / đổi mật khẩu · Đăng xuất (bấm 2 lần, không dùng hộp hỏi của trình duyệt).
  Máy chủ: Training Hub v3.43 (`rhAuthPw` / `rhAuthPwSet` / `rhAuthRenew`, mật khẩu băm + khoá bí mật, sai 5 lần khoá 15 phút; gửi bằng POST, không nằm trên URL).
- **Điện thoại**: thẻ tỷ lệ / doanh số nằm đầu bảng trượt (không nổi trên bản đồ); bỏ nút +/− (phóng to bằng 2 ngón tay), giữ ⌂.
- **Chữ dễ hiểu** thay "độ phủ": Kết quả thầu = **Đã trúng thầu ở đâu** (tỉnh đã có gói trúng · bệnh viện đã trúng), Theo dõi thầu = **Đang theo dõi ở đâu**,
  Hoạt động = **Khách đã gặp trong kỳ** (khách công lập · khách tư nhân, trên tổng khách phụ trách); nút Hoạt động "Cơ sở trúng thầu: đã gặp chưa".
- **Chống nhập trùng**: thêm gói ở cơ sở đã có gói cùng loại sản phẩm đang theo dõi (hoặc cùng số TBMT) ⇒ báo ngay, nút **Cập nhật gói này** (mang theo ghi chú đang gõ)
  hoặc tick "Đây là gói khác"; cập nhật giống hệt lần trước ⇒ không lưu lại. 2 máy cùng nhập ⇒ máy chủ báo trùng (crm-surgical MMH_TenderFU v1.10) ⇒ bảng xử lý
  **Gộp vào gói có sẵn** · Vẫn tạo gói mới · Bỏ (thay hộp confirm).
- **Form nhập trên điện thoại**: toàn màn hình, ô chữ 16px, nút giai đoạn / loại sản phẩm to, nút Lưu luôn ở chân hộp.
- **Mở nhanh**: index.html gọi sẵn 7 lệnh dữ liệu ngay khi trang mở (song song với tải app; app dùng lại qua `window.__PRE`); service worker trả bản lưu của tệp có `?v=`
  (không chờ mạng), trang chờ mạng tối đa 2,5 giây; máy chủ NPP / KQTT đệm kết quả 10 phút (MMH_WinMap v1.1, nút Tải lại bỏ đệm). Đo thật: mỗi lệnh Apps Script 3,3–5,4 giây
  (≈ 2,7 giây là thời gian khởi động của Google); điện thoại giả lập: lần mở sau có bản đồ + dữ liệu sau ~0,8–1 giây (trước ~2,1 giây).

## Cập nhật 11/11/2026 (2) — kỳ mặc định · biểu đồ tròn độ phủ · thanh trên gọn (v22)
- **Kỳ** dùng chung 1 bộ chọn gọn `‹ kỳ ▾ ›` (tab **Tuần · Tháng · Quý · Kỳ (FY)**, Hoạt động thêm **Khoảng ngày**; Kết quả / Theo dõi thêm **Mọi năm**).
  Mặc định: **Kết quả thầu** và **Theo dõi thầu** = kỳ hiện tại (hôm nay thuộc FY68 = T09/2026 – T08/2027; sang 09/2027 tự thành FY69), **Hoạt động** = tháng hiện tại. Vẫn chọn được các kỳ trước.
  Theo dõi thầu lọc theo kỳ: gói có cập nhật trong kỳ, hoặc đang mở (kỳ chứa hôm nay); kế hoạch FY hiện tại luôn tính.
- **Biểu đồ tròn độ phủ** ở thẻ trong bản đồ (thu gọn được, đổi theo tab):
  Kết quả thầu = **tỉnh có ≥ 1 kết quả trúng của NPP trong kỳ ÷ tỉnh NPP phụ trách** (Hùng Vĩ = địa bàn Viet Ha, iCare = Khang) và **bệnh viện NPP trúng trong kỳ ÷ bệnh viện có kết quả trúng ở KQTT toàn quốc** trong địa bàn;
  Theo dõi thầu = bệnh viện / tỉnh có gói theo dõi hoặc kế hoạch FY có giai đoạn (tư nhân: khách tư nhân đang theo dõi ÷ khách tư nhân trong customer list);
  Hoạt động = **khách đã chăm sóc trong kỳ ÷ khách trong customer list của Sales** (CRM Surgical ▸ 1. CUSTOMER CODE), tách công lập · tư nhân + tổng.
- Thanh trên Theo dõi thầu gọn: lọc tình trạng gói (Đang theo dõi · Thành công · Trượt / dừng · Tất cả) chuyển vào **Bộ lọc**; hàng nút giai đoạn chuyển vào bảng bên (không che bản đồ).

## Cập nhật 11/11/2026 — Mới cập nhật · nút giai đoạn · VND / USD · số TBMT theo giai đoạn (v21)
- **Mới cập nhật** (chuông ở thanh trên, có số): ① gói đang theo dõi đã có kết quả (khớp số TBMT / cùng cơ sở sau ngày bắt đầu theo dõi) + nút "Ghi kết quả";
  ② kết quả thầu mới 45 ngày từ sổ **TENDER MAP · GÓI MỚI** của backend (crm-surgical `fuNews`: mỗi giờ ghi gói lần đầu thấy ở file Hùng Vĩ / iCare / KQTT, gói NPP đổi Pending ⇒ Win / Fail),
  theo ngày, lọc MANI trúng · Hãng khác / trượt · NPP dự thầu, đánh dấu "Đang theo dõi"; ③ Sales vừa cập nhật 7 ngày. Link thông báo `?new=1` mở thẳng. Backend còn gửi RH_Notify
  (nút "Nhắc tôi" Report Hub / CRM): gói ở cơ sở đang theo dõi có kết quả ⇒ báo ngay; gói mới khác ⇒ tóm tắt hằng ngày.
- **Hàng nút giai đoạn** (Theo dõi thầu; đầu bảng bên phải / bảng trượt điện thoại — không che bản đồ): **Thầu công lập | Tư nhân · mua sắm** + mỗi giai đoạn 1 nút có số ⇒ bấm để bản đồ + danh sách theo tỉnh
  chỉ còn giai đoạn đó. Đếm cả gói Theo dõi thầu lẫn **kế hoạch FY68** (dòng ② ③ / Đang dự thầu / tư nhân của Follow up by Account đã có giai đoạn); dòng kế hoạch chưa có giai đoạn chỉ hiện ở nút
  "Chưa có giai đoạn" (không làm rối bản đồ).
- **VND | USD** ở thanh trên: mọi doanh số / giá đổi sang USD theo **tỷ giá cố định 26.400** (Excel xuất vẫn VND).
- **Số TBMT**: chỉ hỏi khi gói ở giai đoạn **Đang dự thầu (đã nộp hồ sơ)** — bắt buộc — hoặc đã có kết quả (không bắt buộc); giai đoạn trước không hiện ô này. Tên gói không bắt buộc (tự đặt theo loại SP + năm).
  Kết quả thầu cũ hơn ngày bắt đầu theo dõi (> 60 ngày) không còn bị khớp nhầm thành "Đã có kết quả".
- Gọn: cảnh báo hợp đồng sắp hết hạn 1 dòng / cơ sở (3 dòng đầu + "Xem cả"); cơ sở có kế hoạch FY68 đã có giai đoạn không bị báo "chưa theo dõi"; bảng dự báo ở chi tiết cơ sở gom mã chưa điền vào 1 dòng thu gọn;
  chú giải Theo dõi thầu mặc định thu gọn (màu đã có ở hàng nút).

## Cập nhật 09/11/2026 (2) — Doanh số ước tính · sheet "Follow up by Account" · giai đoạn bán hàng mới (v20)

- **Doanh số ước tính** (khối trong khung bản đồ, chỉ tài khoản công ty): doanh số FY68 của NPP (T09/2026 – T08/2027) + **SL dao / chỉ khâu / ghim da** trong FY,
  chọn **Kênh thầu · Tư nhân · Tất cả**, theo tỉnh đang chọn + địa bàn PIC; thanh màu ① Existing · ② Duy trì · ③ Mở mới · Đang dự thầu · Tư nhân. Điện thoại: nút thu gọn dưới thanh trên.
- Nguồn = sheet **"Follow up by Account"** của CRM Surgical (backend `MMH_FcAccount.gs`, đồng bộ mỗi giờ từ file thầu Hùng Vĩ, I-Care + KQTT toàn quốc; 1 mã / gói = 1 dòng):
  doanh số = SL ÷ hiệu lực × **giá MANI → NPP theo mã** (bảng giá đại lý 01/01/2025 + ghim da 01/10/2025) × số tháng trong FY.
- **Chi tiết cơ sở ▸ Dự báo doanh số FY68**: các mã của cơ sở (nhóm, SL / tháng, số tháng, doanh số, giai đoạn) — bấm 1 dòng để Sales sửa SL, tháng bắt đầu, hiệu lực,
  giai đoạn bán hàng, tiến độ, cơ hội, cấu hình, hãng đề xuất, tiêu chí, ghi chú (dòng ① = hợp đồng đang chạy: không sửa SL); **+ Thêm mã** cho kênh tư nhân / gói mới.
- **Theo dõi thầu**: giai đoạn = danh sách của file kế hoạch FY68 (Chưa tiếp cận → Đã giới thiệu tới chuyên môn → Đang xây cấu hình → Đã gửi báo giá → Đang dự thầu → Đã trúng thầu ·
  Trượt thầu · Không tham dự · Tạm dừng theo dõi); hộp cập nhật thêm **Bắt đầu (tháng)** + **Hiệu lực** để gói đang theo dõi vào doanh số ước tính.
- Tên chuẩn **kìm vi phẫu** (MANI Micro Forceps) theo MMH Library.

## Cập nhật 09/11/2026 — chọn kỳ tuần / tháng / quý / FY / khoảng ngày · thẻ ảnh khi rê chuột · rà công lập / tư nhân (v19)

- **Hoạt động ▸ kỳ**: thanh `‹ kỳ ▾ ›` (nút ‹ › sang kỳ trước / sau cùng loại) mở bảng chọn **Tuần · Tháng · Quý · FY · Khoảng ngày** (từ ngày – đến ngày, nhanh: 7 / 30 / 90 ngày qua, từ đầu FY).
  Lượt lọc theo **ngày** của lượt; biểu đồ tự chia cột theo ngày (≤ 14 ngày) · tuần (≤ 10 tuần) · tháng. *Viếng thăm / Mọi việc · Đã làm / Cả kế hoạch* gom vào 1 nút `▾` ⇒ thanh trên còn 1 hàng.
- **Rê chuột vào địa bàn** (khách CRM) ⇒ thẻ trắng: ảnh đi địa bàn cỡ lớn (ngày chụp, số ảnh) + tên, loại, PIC, công lập / tư nhân, số lượt trong kỳ theo PIC + **kết quả gần nhất**
  (ngày · PIC · loại việc · kết quả · phản hồi · bước tiếp theo). Rê vào **tỉnh** ⇒ ảnh mới nhất trong kỳ của tỉnh + kết quả gần nhất. Chỉ tính lượt của Sales (Viet Ha, Khang).
- **Công lập / tư nhân** (người dùng báo BV Mắt tỉnh Ninh Bình hiện tư nhân): khách tư nhân *Bệnh viện Mắt Thanh Bình* bị ghép **gần đúng** vào *BV Mắt tỉnh Ninh Bình* rồi ghi đè
  loại cơ sở thành tư nhân — cùng lỗi ở ~20 bệnh viện công (Mắt Nam Định / Thái Bình / Phú Thọ / Hải Phòng / TP.HCM, ĐK Bạc Liêu / Long An / Trà Vinh / Cà Mau / Gia Lai…).
  Nay khách CRM chỉ ghép cơ sở **cùng loại** công / tư (bảng `VM_STD`), chỉ khớp **đúng tên chính** (hoặc Sales đã ghim) mới được đổi loại cơ sở; so tên phân biệt
  *thành phố X ≠ tỉnh X*, *Tân Bình ≠ Bình Tân*, quân y / bệnh viện đại học ≠ bệnh viện thường. Danh mục `csyt.js` (`tools/csyt_own.py`): bỏ 50 tên phụ gộp nhầm
  (vd. *BV Phổi Long An ⇐ BV ĐK tỉnh Long An*, *BV Da liễu Bắc Ninh ⇐ Sở Y tế*, *Tâm Trí Sài Gòn (tư) ⇐ BV ĐK Sài Gòn (công)*) ⇒ 37 bên mời thầu KQTT thành cơ sở riêng;
  thêm tư nhân: ĐH Phenikaa, ĐH Nam Cần Thơ, Thành An – Thăng Long, Việt – Bỉ, Mắt Cao Thắng, Phụ sản Mekong, ĐK 115 Nghệ An, Chuyên khoa Mắt Vĩnh Long (theo CRM).
  `VM_STD`: *BV Mắt Hà Đông* = công lập (Sở Y tế Hà Nội, nay thuộc BV Mắt Hà Nội).

## Cập nhật 05/11/2026 (3) — đăng nhập ở màn hình đầu · địa bàn theo PIC · công lập / tư nhân · hãng · tóm tắt tỉnh

- **Đăng nhập ngay khi mở app** (màn hình đầu: bản đồ minh hoạ tô theo địa bàn 2 PIC, 3 tính năng, ô email + mã 6 số, phím Enter). Chỉ email công ty;
  phiên dùng chung Report Hub / CRM nên đã đăng nhập ở đó thì vào thẳng. Phiên hết hạn / đăng xuất ⇒ về màn hình này.
- **Địa bàn phụ trách** (chia theo **tỉnh cũ**, người dùng chốt 05/11/2026): Viet Ha = miền Bắc → hết **Đà Nẵng cũ**, Khang = từ **Quảng Nam cũ** trở vào (tỉnh Đà Nẵng mới gồm cả 2 — cơ sở xét theo tỉnh cũ: toạ độ danh mục, hoặc tên huyện / thị Quảng Nam cũ trong địa chỉ). Đăng nhập là Viet Ha / Khang ⇒ **chỉ thấy địa bàn của mình**
  (bản đồ phóng vào địa bàn, tỉnh ngoài địa bàn mờ, số liệu / tìm kiếm / theo dõi thầu / cảnh báo / Hoạt động chỉ trong địa bàn). Người khác (Giang, Nguyen Ha, Tuyen…)
  xem tất cả và chọn **Cả nhóm · Viet Ha · Khang** ở thanh trên. Nhắc việc + email thứ Hai của Theo dõi thầu gửi PIC phụ trách địa bàn (backend `MMH_TenderFU.gs` v1.6).
- **Công lập / tư nhân**: danh mục `csyt.js` có cột `own` (`tools/csyt_own.py`, 53 bệnh viện tư bị OSM ghi lẫn như Mắt Sài Gòn, Việt Nhật, Tâm Trí, Pháp Việt…);
  khách CRM theo bảng tên chuẩn `VM_STD` (ưu tiên). Cơ sở tư nhân: nhãn **Tư nhân**, "mua sắm theo **hợp đồng mua sắm** (không qua đấu thầu công)", mục **Theo dõi mua sắm**
  (giai đoạn … Ký hợp đồng mua sắm → Sử dụng hàng), chấm viền tím trên bản đồ. Bộ lọc ▸ **Cơ sở y tế**: Công lập + tư nhân · Công lập · Tư nhân (mọi chế độ).
- **Ghi theo hãng** thay tên nguồn: tooltip, top bệnh viện, thẻ bệnh viện ghi "MANI x% · <hãng lớn nhất> y% · <hãng thứ 2> z%" (theo số lượng trúng).
- **Tóm tắt địa bàn** đầu tab Tổng quan (tỉnh đang xem / toàn quốc / địa bàn PIC): số bệnh viện công lập, TTYT, PKĐK khu vực, cơ sở tư nhân (theo danh mục);
  thầu dao từ tháng đầu đến tháng cuối có dữ liệu KQTT: số cơ sở trúng thầu dao, cơ sở nhiều gói nhất (số gói, số dao); hãng chiếm tỉ trọng lớn nhất theo số lượng dao trúng trong kỳ đang lọc.

## Cập nhật 05/11/2026 (4) — rà soát toàn bộ (dữ liệu thật 2 NPP + 292 khách CRM)

- **Bộ nhớ đệm chuyển sang IndexedDB** (`tender_map` ▸ `kv`: `mmh_winmap_v1` = thầu 2 NPP + KQTT, `act` = hoạt động CRM). Trước để ở localStorage —
  vùng ~5 MB DÙNG CHUNG với Report Hub / CRM (hàng đợi ghi khi mất mạng của CRM nằm ở đó), dữ liệu KQTT toàn quốc lớn có thể làm đầy. Bản cũ ở localStorage tự chuyển sang rồi xoá.
  Mở lại app: bản đồ + Hoạt động hiện từ bộ nhớ đệm (~0,4 giây), dữ liệu mới đọc nền rồi tự thay.
- **Khớp khách CRM với danh mục bằng tên chuẩn** (VM_STD) trước tên gõ trên CRM ("BỆNH VIỆN QUÂN Y 175/BQP", "BỆNH VIỆT MẮT"…): 169 → 185 / 292 khách khớp đúng cơ sở (toạ độ thật, lịch sử thầu).
- Sales luôn thấy / tìm được khách CRM của chính mình kể cả khi nằm ngoài địa bàn chia theo tỉnh (vd. Khang có 3 khách ở Quảng Nam cũ — nay thuộc TP Đà Nẵng — và 1 ở Hà Nội).
- Bệnh viện chỉ có trong dữ liệu thầu (chưa có trong danh mục): nhận tư nhân theo tên (Vinmec, Hoàn Mỹ, quốc tế, công ty cổ phần…).
- Sửa: chú thích nổi của chế độ trước còn đọng khi đổi chế độ; dòng tóm tắt điện thoại lặp tên PIC; ngăn Bộ lọc điện thoại tràn ngang và thiếu mục Cơ sở y tế ở Theo dõi thầu;
  lỗi đọc dữ liệu có nút **Thử lại**; tóm tắt địa bàn khi chưa có dữ liệu thầu không còn hiện "từ — đến —"; nhãn ngày không xuống dòng.

## Quy ước

- FY67 = 09/2025 – 08/2026, FY68 = 09/2026 – 08/2027 (Q1 = T9–T11).
- Kỳ của gói = tháng **Ngày phê duyệt gói thầu**; chưa có ⇒ cột Month (giấy uỷ quyền) ⇒ ngày ký.
- Hợp đồng = Ngày phê duyệt → + Thời gian thực hiện (trống = 12 tháng). "Sắp hết hạn" = còn ≤ 6 tháng.
- Giá trị = SL trúng × đơn giá trúng (thiếu thì dùng phần chào thầu).
- Tỉnh lấy từ cột City (tên cũ hoặc mới đều nhận), không nhận ra thì dò trong địa chỉ.

## Dữ liệu

Đọc trực tiếp 2 web app Apps Script (`NPP` đầu script trong `index.html`) bằng `?action=winMap&from=202209` (FY65 trở đi cho lịch sử; bản đồ / số liệu chỉ tính từ FY67).
Code máy chủ ở kho riêng tư `ManiMedicalHanoi/mmh-backend` ▸ `backends/tender-icare|tender-hungvi/MMH_WinMap.gs`.
Máy chủ chưa có `winMap` ⇒ trang tự dùng feed mặc định (chỉ dao) và báo trên màn hình. Lần mở sau hiện ngay bản lưu trên máy (localStorage) rồi đọc bản mới.

## Ranh giới (`vn-geo.js`)

TopoJSON 2 lớp `new` (34) / `old` (63), dựng từ dữ liệu xã/phường của gói npm `@xdev-asia/vietnam-map-34-provinces` (MIT):

```bash
npm pack @xdev-asia/vietnam-map-34-provinces@2.1.0 && tar xzf *.tgz
# gộp package/src/core/assets/provinces/*.json thành wards.json (thuộc tính n = NEW_PROVINCE, o = OLD_PROVINCE)
npx mapshaper@0.6.102 wards.json -dissolve2 o copy-fields=n name=old -simplify 5% keep-shapes -clean -filter-slivers \
  -dissolve2 n + name=new target=old -o target=old,new format=topojson vn.topo.json quantization=30000
# vn-geo.js = "window.VN_TOPO=" + nội dung vn.topo.json
```

Quần đảo Hoàng Sa (Đà Nẵng) và Trường Sa (Khánh Hòa) vẽ bằng điểm theo toạ độ thật (`ISL` trong `index.html`).
