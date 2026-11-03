# Bản đồ trúng thầu · NPP nhãn khoa (`map/`)

Trang tĩnh (GitHub Pages): `https://manimedicalhanoi.github.io/Tender-Result/map/` — **bản 3D** (`index.html`, deck.gl 9.3.11 từ unpkg / jsdelivr);
máy không có WebGL hoặc không tải được thư viện ⇒ tự chuyển **bản 2D** (`2d.html`, SVG).

## Bản 3D (`index.html`)

- Tỉnh nổi khối (màu theo NPP, cao theo giá trị), mỗi bệnh viện là cụm cột 3D — mỗi cột 1 **nhóm sản phẩm** (Dao Slit / Stab / Crescent / khác ·
  Chỉ Nylon / Polypropylene / PGA / Silk / Polyester), cao theo số lượng; thu nhỏ (< zoom 6,4) gộp theo tỉnh. Luồng phân phối chạy từ NPP (Hà Nội / TP.HCM) tới bệnh viện.
- Bảng trái: lọc nhóm sản phẩm + **bệnh viện trúng nhiều nhất** theo giá trị hoặc số lượng từng loại (top 5 có vòng vàng nhấp nháy trên bản đồ).
- Bảng phải: toàn quốc ▸ tỉnh (bệnh viện trúng, gói gần nhất, hiệu lực) ▸ bệnh viện (hợp đồng còn hiệu lực, gói trúng gần nhất, cơ cấu sản phẩm, **lịch sử trúng** mọi năm từ FY65).
- Quay lại: nút **‹** trên bản đồ, breadcrumb, Esc, bấm ra biển, nút Back trình duyệt / điện thoại (mỗi bước là 1 mục lịch sử). Điện thoại: ngăn kéo dưới 3 tab (Chi tiết · Xếp hạng BV · Bộ lọc).
- Nhóm chỉ khâu theo `products.js` (mã → chất liệu, cỡ) dựng từ "Bảng mã chỉ khâu nhãn khoa (catalogue VN 2025-08)" của MMH Library.
- Vị trí bệnh viện: quận / huyện hoặc phường / thị trấn trong địa chỉ (`vn-dist.js`), không thấy ⇒ tên quận trong tên bệnh viện ⇒ tâm tỉnh cũ; nhiều bệnh viện cùng chỗ xếp hoa hướng dương.
- Thử: Playwright + Chromium có cờ `--use-angle=swiftshader`, `page.route` trả deck.gl cục bộ (npm pack) và dữ liệu giả cho `script.google.com`; `window.WM3` (select / hosp / tab / ST).

## Bản 2D (`2d.html`)

- Bản đồ 34 tỉnh / thành (từ 01/07/2025), đường nét đứt = 63 tỉnh cũ. Màu: Hùng Vĩ (xanh dương) · iCare (xanh ngọc) · cả 2 (tím); đậm hơn = giá trị cao hơn; số trên tỉnh = số gói.
- Bấm tỉnh ⇒ phóng to, bóng tròn theo tỉnh cũ, danh sách bệnh viện ▸ gói thầu (TBMT, ngày phê duyệt, thời hạn, hết hạn, thanh tiến độ hợp đồng, sản phẩm · SL · đơn giá · thành tiền). Esc / ⌂ = toàn quốc. Link `#<Tên tỉnh>` mở thẳng tỉnh.
- Lọc: FY (từ FY67) + quý, NPP, Dao / Chỉ khâu, Trúng thầu / mọi gói tham dự.

## Quy ước

- FY67 = 09/2025 – 08/2026, FY68 = 09/2026 – 08/2027 (Q1 = T9–T11).
- Kỳ của gói = tháng **Ngày phê duyệt gói thầu**; chưa có ⇒ cột Month (giấy uỷ quyền) ⇒ ngày ký.
- Hợp đồng = Ngày phê duyệt → + Thời gian thực hiện (trống = 12 tháng). "Sắp hết hạn" = còn ≤ 6 tháng.
- Giá trị = SL trúng × đơn giá trúng (thiếu thì dùng phần chào thầu).
- Tỉnh lấy từ cột City (tên cũ hoặc mới đều nhận), không nhận ra thì dò trong địa chỉ.

## Dữ liệu

Đọc trực tiếp 2 web app Apps Script (`NPP` đầu script trong `index.html`) bằng `?action=winMap&from=202509`.
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
