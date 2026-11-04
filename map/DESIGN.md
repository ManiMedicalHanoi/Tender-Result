# Tender Map — tài liệu thiết kế

Bản đồ Việt Nam thể hiện gói thầu **tham dự / trúng** của 2 NPP nhãn khoa **Hùng Vĩ** (miền Bắc) và **iCare** (miền Nam), tính từ **FY67** (09/2025),
cộng **KQTT dao toàn quốc** (mọi hãng, file tender tổng, bỏ gói trùng số TBMT với NPP), **danh mục cơ sở y tế công lập** để tra cứu và chế độ **Theo dõi thầu** theo địa bàn (04/11/2026).
Web tĩnh trên GitHub Pages, cài được như app (PWA).

- Link: https://manimedicalhanoi.github.io/Tender-Result/map/
- Mã nguồn web: kho `ManiMedicalHanoi/Tender-Result` ▸ thư mục `map/`
- Mã máy chủ: kho riêng tư `ManiMedicalHanoi/mmh-backend` ▸ `backends/tender-icare/`, `backends/tender-hungvi/`

---

## 1. Kiến trúc tổng thể

```
Google Sheet NPP (do NPP tự cập nhật)                    Trình duyệt / app đã cài
 ├─ iCare  "Tender FY65-67" (tiêu đề dòng 9)             ┌──────────────────────────────┐
 └─ Hùng Vĩ "Tender FY66"   (tiêu đề dòng 7)             │ index.html (1 file, không     │
        │                                                │ thư viện ngoài, SVG)         │
        ▼                                                │  + vn-geo.js   (ranh giới)    │
Apps Script web app của từng NPP                         │  + vn-dist.js  (quận/phường)  │
 ?action=winMap&from=202209  ── JSON ──────────────────▶ │  + products.js (mã chỉ khâu)  │
 (MMH_WinMap.gs, chỉ ĐỌC sheet)                          │  + sw.js / manifest (PWA)     │
                                                         └──────────────────────────────┘
```

- **Không có máy chủ riêng**: trang gọi thẳng 2 web app Apps Script (quyền "Bất kỳ ai"), `fetch` trước, lỗi thì JSONP (`callback=`).
- **Feed cũ vẫn giữ**: gọi web app không có `action` ⇒ dữ liệu dao cho dashboard cũ `Tender-Result/index.html`. Máy chủ chưa có `winMap` ⇒ trang tự dùng feed cũ (chỉ dao) và báo trên màn hình.
- **Bộ nhớ trên máy**: lần đọc thành công lưu `localStorage.mmh_winmap_v1` ⇒ lần mở sau hiện ngay, đọc bản mới ở nền.
- Deploy máy chủ: sửa `backends/<npp>/` ở mmh-backend → PR → gộp ⇒ workflow tự deploy (URL không đổi). Web: PR → gộp `main` ⇒ GitHub Pages tự đăng.

## 2. Dữ liệu

### 2.1 Nguồn: sheet NPP (xem `mmh-backend/docs/tender-npp.md`)

| Trường | Cột iCare | Cột Hùng Vĩ |
|---|---|---|
| Số TBMT | C | C |
| Bệnh viện · Tỉnh · Địa chỉ | D · E · F | D · E · F |
| Tên gói · Dự toán | I · J | I · J |
| Ngày ký giấy uỷ quyền · FY · Month | L · M · N | L · M (tiêu đề gõ nhầm " l") · N |
| Mã SP · SL · Đơn giá · ĐVT (chào thầu) | O–R | O–R |
| Kết quả (Win / Fail / Cancel / Pending) | S | S |
| SP · SL · Đơn giá · ĐVT (trúng) | T–W | U–X (có thêm cột Brand T) |
| Ngày phê duyệt gói · Thời gian thực hiện (tháng) | Y · Z | Z · AA |

### 2.2 `MMH_WinMap.gs` (giống hệt ở 2 backend)

- Dò cột **theo tên tiêu đề** (bỏ dấu, không phân biệt hoa thường) ⇒ NPP chèn / đổi vị trí cột vẫn chạy. Cột trùng tên: lần 1 = chào thầu, lần 2 = trúng.
- Dòng gộp ô (Bệnh viện trống mà có mã SP) ⇒ lấy thông tin gói từ dòng trên.
- Chuẩn hoá ngày (Date, `yyyymmdd`, `dd/MM/yyyy`), số (dấu chấm / phẩy nghìn), kết quả, thời hạn (trống / lạ ⇒ 12 tháng).
- Trả mọi dòng có mốc ≥ `from` (mặc định 202509; web gọi `202209` để có lịch sử từ FY65).

### 2.3 Quy ước tính trên web

| Khái niệm | Cách tính |
|---|---|
| Năm tài chính | FY = năm kết thúc − 1959 (09/2025–08/2026 = FY67). Quý: Q1 = T9–T11, Q2 = T12–T2, Q3 = T3–T5, Q4 = T6–T8 |
| Kỳ của gói | Tháng **ngày phê duyệt**; chưa có ⇒ cột Month ⇒ ngày ký |
| Gói thầu | Gộp dòng theo NPP + TBMT (bỏ hậu tố `-01`, `-02`) + bệnh viện |
| Kết quả gói | Có dòng Win ⇒ Win; không thì Pending ⇒ Fail ⇒ Cancel |
| Giá trị | SL trúng × đơn giá trúng (thiếu ⇒ phần chào thầu ⇒ cột Total; Total < 100.000 coi là nghìn đồng) |
| Hiệu lực hợp đồng | Ngày phê duyệt → + thời gian thực hiện. **Còn hiệu lực** · **Sắp hết hạn** (≤ 6 tháng) · **Hết hiệu lực** · **Chưa có ngày phê duyệt** |
| Mặc định hiển thị | Từ FY67, chỉ gói trúng (bật "Mọi gói tham dự" để xem cả trượt / chờ / huỷ) |

### 2.4 Nhóm sản phẩm

| Nhóm | Quy tắc | ĐVT |
|---|---|---|
| Dao Slit · Stab · Crescent · khác | Mã bắt đầu `MSL` · `MST` · `MCU` · chữ `M…` khác | cái |
| Chỉ Nylon · Polypropylene · PGA · Silk · Polyester · khác | Mã số → `products.js` (187 mã, từ "Bảng mã chỉ khâu nhãn khoa – catalogue VN 2025-08" của MMH Library) | sợi |
| Khác | Còn lại | — |

## 3. Địa lý

- **Ranh giới** (`vn-geo.js`): TopoJSON 2 lớp — 34 tỉnh / thành mới (từ 01/07/2025) và 63 tỉnh cũ (nét đứt). Dựng từ dữ liệu xã/phường gói npm `@xdev-asia/vietnam-map-34-provinces` (MIT) bằng mapshaper (gộp + giản lược 5%). Lệnh dựng lại ở `README.md`.
- **Hoàng Sa (Đà Nẵng) · Trường Sa (Khánh Hòa)**: vẽ chấm đảo theo toạ độ thật + nhãn, luôn hiện.
- **Phép chiếu**: Mercator tự viết, khung 102,0°–117,8° Đ × 7,2°–23,5° B.
- **Tỉnh của gói**: cột City (nhận cả tên cũ lẫn mới, "TP. HCM", "Thành phố …"); không nhận ra ⇒ dò tên tỉnh trong địa chỉ. Tên cũ ⇒ tỉnh mới theo bảng sáp nhập `NEW` trong `index.html`.
- **Vị trí bệnh viện** (`vn-dist.js`: tâm 710 quận / huyện + 2.186 phường / thị trấn, trước sáp nhập):
  1. quận / huyện ghi trong địa chỉ (ưu tiên vị trí cuối chuỗi) → tinh chỉnh theo phường / thị trấn;
  2. tên quận / huyện trong tên bệnh viện (vd. "TTYT Kim Thành");
  3. không thấy ⇒ tâm tỉnh cũ.
  Nhiều bệnh viện cùng điểm ⇒ xếp kiểu hoa hướng dương cho khỏi chồng. Chỉ tìm trong các tỉnh cũ của đúng tỉnh mới ⇒ địa chỉ chép nhầm tỉnh khác không kéo bệnh viện đi sai.

## 4. Giao diện

### 4.1 Bố cục

| Máy tính (> 980 px) | Điện thoại |
|---|---|
| Thanh trên: tên · bộ lọc · Tải lại · Cài app | Thanh trên (bộ lọc cuộn ngang) |
| Trái: bản đồ · phải: bảng chi tiết (cuộn riêng) | Bản đồ **ghim trên cùng** (50 vh), bảng chi tiết cuộn bên dưới |

Phong cách MMH: nền sáng, chữ Aptos, navy `#003047`, xanh `#3A5CAA`, viền mảnh, không gradient đậm. Màu NPP: Hùng Vĩ `#3A5CAA` · iCare `#0E8C7E` · cả 2 `#6A57A8`.

### 4.2 Bộ lọc (áp cho MỌI số liệu)

- **Kỳ**: Từ FY67 · FY67 · FY68 (+ quý khi chọn 1 FY).
- **NPP**: Cả 2 · Hùng Vĩ · iCare.
- **Chỉ số**: **Giá trị | Số lượng** ⇒ màu tỉnh, ô số tổng, sản phẩm trúng, biểu đồ tháng, theo miền, tỉnh dẫn đầu, top bệnh viện, thẻ / chấm bệnh viện đều đổi theo.
- **Loại sản phẩm**: Mọi SP · Dao (tất cả / Slit / Stab / Crescent) · Chỉ khâu (tất cả / Nylon / Polypropylene / PGA…). Bấm 1 nhóm trong "Sản phẩm trúng" = chọn nhanh.
- **Kết quả**: Trúng thầu · Mọi gói tham dự.

### 4.3 Ba cấp xem

1. **Toàn quốc** — bản đồ tô màu theo NPP, đậm nhạt theo chỉ số (thang log), huy hiệu số gói; vòng cam = tỉnh có hợp đồng còn ≤ 6 tháng.
   Bảng: số tổng · sản phẩm trúng · **top 10 bệnh viện** (rê chuột ⇒ tô viền tỉnh) · theo tháng phê duyệt · theo miền · tỉnh dẫn đầu · **sắp hết hiệu lực (cơ hội thầu lại)**.
2. **Tỉnh** — phóng vào vùng có bệnh viện; **chấm từng bệnh viện** (to theo chỉ số, vòng vàng = top 10, tên tự tránh chồng); tên tỉnh cũ mờ.
   Bảng: số tổng · sản phẩm · lọc theo tỉnh cũ · tìm (tên BV / mã SP / TBMT) · thẻ bệnh viện (số gói, trúng gần nhất, hiệu lực, cơ cấu SP).
3. **Bệnh viện** — phóng sát chấm; dải hiệu lực hợp đồng · số lần trúng · **gói trúng gần nhất** (thanh tiến độ, bảng SP · SL · đơn giá · thành tiền) · cơ cấu SP · **lịch sử trúng** theo FY (bật xem cả gói trượt / chờ).

### 4.4 Điều hướng

- Vào: bấm tỉnh / chấm / dòng trong danh sách. Ra: nút **‹ Toàn quốc / ‹ Tên tỉnh** (góc bản đồ + tiêu đề bảng), **Esc**, bấm ra biển, **nút Back** trình duyệt / điện thoại (mỗi bước là 1 mục lịch sử).
- Phóng: con lăn chuột · kéo · **2 ngón** · nút + / − / ⌂.
- Link chia sẻ: `#Hà Nội` mở thẳng tỉnh, `#Hà Nội/Bệnh viện Thanh Nhàn` mở thẳng bệnh viện.
- Ô thông tin khi rê chuột chỉ có trên máy có chuột, luôn nằm trong khung; điện thoại chạm = mở chi tiết.

## 5. App (PWA)

| Thành phần | Nội dung |
|---|---|
| `manifest.webmanifest` | Tên **Tender Map**, `display: standalone`, màu navy, biểu tượng 192 / 512 + maskable |
| `app/*.png` | Bản đồ Việt Nam trắng trên nền navy, chấm vàng Hà Nội (Hùng Vĩ) + xanh TP.HCM (iCare); dựng từ chính `vn-geo.js` (SVG ⇒ PNG) |
| `sw.js` | Trang / script: **mạng trước**, mất mạng ⇒ bản lưu; ảnh: bản lưu trước. Không đụng dữ liệu Apps Script. Đổi quy tắc ⇒ tăng `V` (đang `tr-map-v2`) |
| Nút **Cài app** | Chrome / Android ⇒ hộp cài của trình duyệt; iPhone ⇒ hướng dẫn Safari ▸ Chia sẻ ▸ Thêm vào MH chính; mở trong Zalo / Facebook ⇒ nhắc "Mở bằng Chrome" trước. Ẩn khi đang chạy dạng app |

## 6. Tệp trong `map/`

| Tệp | Vai trò |
|---|---|
| `index.html` | Khung HTML (thanh trên, bản đồ, bảng bên, hộp thoại) |
| `app.css` · `app.js` | Giao diện · toàn bộ logic (không thư viện ngoài; SheetJS chỉ tải khi bấm Xuất Excel) |
| `csyt.js` · `codes.js` | Danh mục cơ sở y tế công lập · mã dao / chỉ khâu MANI (MMH Library) |
| `vn-geo.js` | Ranh giới 34 / 63 tỉnh (≈ 85 KB) |
| `vn-dist.js` | Tâm quận / huyện + phường / thị trấn (≈ 79 KB) |
| `products.js` | Mã chỉ khâu MANI ⇒ chất liệu, cỡ |
| `manifest.webmanifest`, `sw.js`, `app/` | PWA |
| `2d.html` | Chuyển hướng link cũ về `index.html` |
| `README.md`, `DESIGN.md` | Ghi chú kỹ thuật / tài liệu này |

## 7. Kiểm thử

- Playwright + Chromium, `page.route(/script\.google\.com/)` trả JSON dựng từ file Excel 2 NPP qua harness Node giả lập SpreadsheetApp (chạy chính `MMH_WinMap.gs`).
- Khung 1440 px và Pixel 7: không lỗi JS, không tràn ngang; kiểm điều hướng (bấm tỉnh → chấm → Back → ‹), bộ lọc Giá trị / Số lượng + loại SP, hộp Cài app.
- Máy chủ: workflow **Kiểm tra** ▸ ping `tender-hungvi?action=winMap&from=202509&full=1`.

## 8. Lịch sử

| Ngày | Thay đổi |
|---|---|
| 03/11/2026 | Lưu 2 file NPP vào mmh-backend; `MMH_WinMap.gs`; bản đồ 2D đầu tiên |
| 03/11/2026 | Thử bản 3D (deck.gl) — người dùng không chọn, quay lại giao diện sáng |
| 03/11/2026 | Nhóm SP, top bệnh viện, chi tiết bệnh viện (hiệu lực, gói gần nhất, lịch sử), nút quay lại / Back |
| 04/11/2026 | PWA + biểu tượng, Giá trị / Số lượng + loại SP cho mọi thống kê, chấm bệnh viện trong tỉnh, bỏ ghi chú nguồn, đổi tên **Tender Map** |
| 04/11/2026 | KQTT toàn quốc (bỏ trùng TBMT), danh mục cơ sở y tế + ô tìm, chế độ Theo dõi thầu; cùng ngày bỏ bắt đăng nhập (chọn tên người cập nhật) |
| 05/11/2026 | Sửa đăng nhập (fetch không cookie; backend v1.3.1), màu bản đồ theo tiến độ, cảnh báo hợp đồng MANI sắp hết hiệu lực chưa cập nhật theo dõi |
| 04/11/2026 | Nhắc việc Theo dõi thầu (RH_Notify + email thứ Hai), khối CRM Surgical trong chi tiết cơ sở, tách `app.css` / `app.js`, CI kiểm thử |
| 04/11/2026 | Tab Thầu lại · Giá trúng · Hiệu quả NPP · Dự báo; Theo dõi thầu tự khớp kết quả KQTT / NPP; xuất Excel + ảnh bản đồ |
| 04/11/2026 | Theo dõi thầu chỉ cho tài khoản email công ty (backend `MMH_TenderFU.gs` v1.2); giao diện gọn sau review: thanh lọc + nhãn ×, Kỳ dạng ô chọn, bảng trượt trên điện thoại, thị phần MANI, chấm cơ sở chưa có gói, ▲▼ + “+ Theo dõi”, MANI / hãng khác ở chi tiết, hướng dẫn lần đầu |

## 8b. Bổ sung 04/11/2026

| Phần | Nội dung |
|---|---|
| Nguồn KQTT | `tender-hungvi ?action=kqttMap` đọc file tender tổng *Data xử lý* (cột theo tên: KQTT Code, Buyer, Product Code, Manufacturer_Norm, Quantity, Awarded Unit Price, Month, Decision Issue Date, Province_Clean, Location, Knife Type, Contract Duration, Expiration date). Gói = KQTT Code + bên mời thầu; kỳ = cột Month; hết hạn = Expiration date ⇒ ngày quyết định + thời hạn |
| Bỏ trùng | TBMT (viết hoa, bỏ khoảng trắng, bỏ `-NN`) đã có ở file NPP ⇒ bỏ cả gói KQTT |
| Gộp tên | Khoá `hkey` (bỏ dấu, mở viết tắt, bỏ "tỉnh / thành phố") ⇒ rồi `sameName` trong cùng tỉnh (cùng loại BV / TTYT, khác nhau không có từ chuyên khoa hoặc số) |
| Danh mục cơ sở | `csyt.js` = `{cols, rows, types, spec}`; nối bệnh viện có gói thầu ⇒ toạ độ thật; `hospOf(f)` tạo "bệnh viện rỗng" cho cơ sở chưa có gói để dùng chung màn chi tiết |
| Theo dõi thầu | `FU` (trong `index.html`): **chỉ phiên email công ty** (@manimedicalhanoi.com / @mani.inc, đăng nhập mã 6 số qua Training Hub, phiên `mmh_tk` dùng chung Report Hub / CRM; backend trả `code:'AUTH'` ⇒ xoá phiên, hiện ô đăng nhập), `fuList` (JSONP / fetch), hàng đợi `fuSave` (POST JSON text/plain, dự phòng JSONP), gói = các dòng cùng *Mã theo dõi*; chế độ xem `F.view = "win" | "fu"` (`localStorage.tm_view`) đổi thống kê bản đồ (`FU.stats`), chú giải, tooltip, bảng bên |
| Tìm | `QS` — chỉ mục chữ không dấu theo từ, điểm: khớp tên, cụm liền, có lịch sử thầu / đang theo dõi, bệnh viện, chuyên khoa mắt |
| PWA | `sw.js` `tr-map-v9` (thêm `csyt.js`, `codes.js`) |

## 8c. Giao diện sau review (04/11/2026)

| Phần | Cách làm |
|---|---|
| Thanh trên (máy tính) | logo · ô tìm · **Kết quả thầu \| Theo dõi thầu** · **Kỳ** (`#f-period`: Từ FY67 / Mọi năm / FYxx / Qn FYxx) · Giá trị \| Số lượng · **Bộ lọc (n)** · tải lại · `?` · Cài app. Bộ lọc đang bật = nhãn có × (`#fchips`, `activeFilters` / `resetF`) |
| Bộ lọc (`#fdrw`, `FD`) | Nguồn · Hãng · Loại SP · Gói (Chỉ gói trúng \| Mọi gói tham dự) · **Tô màu** (Theo nguồn \| Thị phần MANI, `localStorage.tm_color`) · ranh giới 63 tỉnh cũ. Máy tính: bảng thả xuống dưới nút; điện thoại: bảng trượt từ dưới |
| Điện thoại (≤ 820px, `MQ`) | thanh trên = logo · tìm · Bộ lọc (+ dòng tóm tắt “Kết quả thầu · Từ FY67 · Giá trị ▾”); `placeCtl` chuyển `#hctl` + `#tools` vào bảng Bộ lọc. Bản đồ toàn màn hình, bảng chi tiết = **bảng trượt** `SHEET` (peek / half / full, kéo thanh `#grab` hoặc tiêu đề, bấm để đổi mức). `visArea` / `fitBox` / `homeBox` chỉ tính phần bản đồ không bị bảng che |
| Thị phần MANI | `computeStats` cộng `STAT[i].sh {m,t}` + `HSH[bệnh viện]` từ gói Win **bỏ qua bộ lọc hãng** (`pass(p,false,{nb:1})`, `itOk0`); màu `shareCol` (cam = hãng khác ⇄ xanh = MANI), số trên tỉnh = %; bảng bên “Thị phần MANI theo tỉnh”; nguồn chỉ NPP ⇒ chú giải nhắc chọn Mọi nguồn |
| Chi tiết cơ sở | `winSide(p)` tách dòng trúng MANI / hãng khác ⇒ 2 dải (`contractRibbon`): hợp đồng MANI (còn hiệu lực / sắp hết / hết) và **hãng khác đang có hợp đồng** (tên hãng, hạn); “Gói MANI trúng gần nhất” + “Gói hãng khác trúng gần nhất”; lịch sử gắn nhãn MANI / tên hãng. Không có gói trong kỳ ⇒ “Gói gần nhất: FYxx — Xem Mọi năm / Bỏ bộ lọc”. Quy mô chỉ hiện khi có số giường / hạng; địa chỉ qua `addrFmt` |
| Bản đồ tỉnh | chấm xám `.fd` = mọi cơ sở công lập có toạ độ (csyt.js) chưa có gói trong bộ lọc, bấm ⇒ chi tiết; phóng bệnh viện vừa phải (`hospBox`: + ≤ 4 cơ sở gần, tối thiểu 1/16 khung toàn quốc) |
| Chú giải | `LG`: thu gọn / mở bằng nút “Chú giải”, nhớ `localStorage.tm_legend`; vào tỉnh ⇒ tự thu gọn |
| Top bệnh viện | ▲▼ (`cmpSpan` / `spanVals`): FY / quý ⇄ cùng kỳ năm trước (kỳ đang chạy: cùng số tháng); Từ FY67 / Mọi năm ⇒ 12 tháng gần nhất ⇄ 12 tháng trước; “mới” = kỳ trước không có. Nút **+ Theo dõi** mở hộp thêm gói theo dõi (cần đăng nhập) |
| Hướng dẫn lần đầu | `TOUR` (vùng sáng + thẻ Tiếp / Trước / Bỏ qua, phím ← → Esc), tự mở 1 lần (`localStorage.tm_tour_v1`), nút `?` mở lại. Kiểm thử đặt sẵn khoá để hướng dẫn không che thao tác |
| Màu chữ | `--t3` = `#5F6E84` (≥ 4,8:1 trên nền trắng / xanh nhạt) |
| Tab phân tích | `TAB` = ov · re · px · npp · fc (`tabsHtml` / `panelHtml`, phạm vi `inScope`): `reList` / `rePre` (thầu lại, điền sẵn qua `FU.open({f, pre})`), `pxRows` / `agg` / `pxBrands` / `switchList` (giá), `nppPk` / `cnt` / `nppQuarters` (NPP), `fcData` (dự báo) — dùng chung cho Excel |
| Khớp kết quả | `FU.matchRes(c)`: TBMT (`tbNorm`) trùng gói Win của cơ sở ⇒ chắc chắn; không có TBMT + giai đoạn 4–6 ⇒ gói Win phê duyệt ≥ ngày tạo gói theo dõi (“kiểm tra lại”). Nút `data-fu-res` mở hộp cập nhật với giai đoạn 7 (MANI trúng) / 8 |
| Xuất | `XP.sheets()` (mảng 2 chiều) ⇒ SheetJS `aoa_to_sheet`; PNG = sao SVG + CSS rút gọn (`SVG_CSS`, thay `var(--land)`), vẽ lên canvas ×2 kèm tiêu đề / chú giải; tên file không dấu `TenderMap_<tỉnh>_<kỳ>_<yyyymmdd>` |
| Màu tiến độ | `FU.stats`: `STAT[i].stg` = giai đoạn tiêu biểu (`srank`: đang theo dõi 1–6 xa nhất > 7 > 8 > 9), `ns` đếm theo giai đoạn; `FU.pcol(s)` = `SC[stg]`, tô `mix(…, .8)` |
| Cảnh báo | `FU.warns()` (đệm theo `S.ver` + số gói): gói Win hết hạn trong `WARN_M` = 6 tháng / vừa hết ≤ 3 tháng, cơ sở không có gói theo dõi giai đoạn 1–6 cập nhật < `STALE_D` = 30 ngày ⇒ `{p, mani, its, end, open, c, lvl}`; MANI ⇒ `STAT.warn` + vòng `pulse wr`, `HS[...].warn` (cơ sở chưa có gói theo dõi: `wonly`) + vòng `wr`; `warnHtml` / `warnItem` (nút `data-fu-warn` ⇒ `rePre`) ; `FU.warnCount()` ⇒ số trên nút chế độ (dữ liệu theo dõi tải ngay khi đã đăng nhập) |
| CRM Surgical | `CRMX.fill(h)`: chỗ `#crmx` trong chi tiết cơ sở, đọc `fuCrm` (CRM Surgical, phiên công ty) 1 lần / cơ sở / phiên, chỉ thay khối đó (không vẽ lại cả bảng) |
| Link thông báo | `?v=fu` (hoặc `?v=win`) chọn chế độ khi mở; `#<Tỉnh>/<Cơ sở>` mở thẳng cơ sở — dùng cho RH_Notify / email nhắc việc của `MMH_TenderFU.gs` v1.3 |
| Tệp | `index.html` (khung HTML) · `app.css` · `app.js` (đổi ⇒ tăng `?v=` ở index.html + `CORE` trong `sw.js`) · CI `.github/workflows/map-test.yml` |

## 9. Việc có thể làm tiếp

- Danh mục cơ sở đầy đủ có **số giường / hạng** (file Sở Y tế / BHXH ⇒ ghép vào `tools/csyt_build.py`); OSM còn thiếu nhiều TTYT / bệnh viện tuyến huyện.

- NPP bổ sung ngày phê duyệt cho gói Win còn trống (đang hiện "Chưa có ngày phê duyệt"), sửa địa chỉ chép nhầm (vd. BV Đại học Y Hà Nội ghi địa chỉ Điện Biên), sửa tiêu đề cột FY của Hùng Vĩ.
- Toạ độ thật cho bệnh viện (thêm cột Lat/Long vào Master Hospital name) thay cho tâm quận / phường.
- Đồng bộ code iCare lên bản "v7" như Hùng Vĩ nếu muốn 2 file cùng tính năng.
