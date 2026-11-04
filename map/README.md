# Tender Map — bản đồ trúng thầu dao / chỉ khâu nhãn khoa (`map/`)

Trang tĩnh (GitHub Pages): `https://manimedicalhanoi.github.io/Tender-Result/map/`

## Trang (`index.html`, SVG, không cần thư viện ngoài) — cài được như app

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
  cơ sở · tên gói · TBMT · loại SP (Dao / Chỉ khâu) · mã + SL ước tính (`codes.js` từ MMH Library: 114 mã dao, 187 mã chỉ — `python3 -I tools/codes_build.py <mmh-library>`) ·
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
