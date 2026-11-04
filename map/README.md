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
- **Chế độ Theo dõi thầu** (nút *Trúng thầu | Theo dõi thầu*): **không cần đăng nhập** (người dùng yêu cầu 04/11/2026 — ai có link cũng xem / cập nhật được).
  Người cập nhật = ô **Người cập nhật** trong hộp cập nhật (chọn trong danh sách tên nhân sự `people` do máy chủ trả, hoặc gõ), máy nhớ ở `localStorage.tm_fu_name`;
  trình duyệt đã có phiên email Report Hub / CRM (`localStorage.mmh_tk`) ⇒ dùng tên trong phiên, không hỏi.
  Ghi / đọc sheet ẨN **FOLLOW UP TENDER** của backend CRM Surgical VN (`crm-surgical/MMH_TenderFU.gs`: `fuList` / `fuSave`). Mỗi lần cập nhật = 1 dòng mới (giữ đủ lịch sử, không xoá):
  cơ sở · tên gói · TBMT · loại SP (Dao / Chỉ khâu) · mã + SL ước tính (`codes.js` từ MMH Library: 114 mã dao, 187 mã chỉ — `python3 -I tools/codes_build.py <mmh-library>`) ·
  **giai đoạn** 1 Giới thiệu → 2 Lên danh mục → 3 Chốt cấu hình → 4 Ra báo giá → 5 Ra HSMT → 6 Đang chấm thầu → 7 Đã trúng / 8 Đã trượt / 9 Huỷ · mốc dự kiến · giá trị ước tính · tình hình (chữ tự do).
  Bản đồ tô tỉnh theo số gói, chấm cơ sở theo giai đoạn; bảng bên: số gói, theo giai đoạn (bấm để lọc), tỉnh, mốc sắp tới, cập nhật gần đây; lọc Mọi PIC / Của tôi, Đang theo dõi / Đã trúng / Trượt – dừng.
  Ghi không chờ: hiện ngay, gửi nền theo hàng đợi `localStorage.tm_fu_outbox_v1` (cùng `rid`, mất mạng tự thử lại, lỗi ⇒ chip đỏ Thử lại / Bỏ).
- **Kiểm thử**: `python3 -m http.server 8771` rồi `NODE_PATH=$(npm root -g) node tools/map_test.js [thư mục ảnh]` (backend giả lập `tools/map_mock.js`; `KQTT_JSON=<file>` để dùng dữ liệu kqttMap thật — không đưa vào repo).

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
