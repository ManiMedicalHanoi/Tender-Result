# KQTT thô (kết quả trúng thầu, muasamcong.mpi.gov.vn)

Dữ liệu **thô, chưa xử lý**: file Excel xuất nguyên trạng từ Hệ thống mạng đấu thầu quốc gia, tra theo từ khóa tên hàng hóa.
Không sửa tay các file Excel; quy trình gộp, khử trùng và làm sạch đọc từ đây và ghi ra thư mục khác.

> README này và `manifest.csv` do `tools/kqtt_manifest.py` sinh ra. Sửa phân loại ở `keywords.csv` / `product_groups.csv` rồi chạy lại script.

## Cấu trúc
```
raw/KQTT/
  <YYYY-MM-DD>/          ← 1 thư mục / đợt tải (ngày xuất dữ liệu), giữ nguyên tên file khi tải
  product_groups.csv     ← danh mục nhóm sản phẩm MMH (mã nhóm, sản phẩm)
  keywords.csv           ← mỗi từ khóa: chuyên khoa, nhóm SP MMH có thể liên quan, mức liên quan, nhiễu chính
  manifest.csv           ← mỗi file: đợt tải, từ khóa, số dòng, số dòng MANI, khoảng ngày, thời điểm xuất, mã băm
```

**Thêm đợt tải mới:** chép file vào `raw/KQTT/<ngày tải>/`, thêm từ khóa mới vào `keywords.csv`, chạy `python tools/kqtt_manifest.py`.

## Phân loại từ khóa theo nhóm sản phẩm MMH
"Mức liên quan" là khả năng một dòng trong file thuộc đúng loại sản phẩm MMH bán (không phải thị phần MANI):
**Cao** phần lớn dòng đúng loại · **Trung bình** lẫn nhiều hàng khác · **Thấp** chủ yếu là nhiễu, cần lọc mạnh.
Một từ khóa có thể thuộc nhiều nhóm; chi tiết nhiễu từng từ khóa xem `keywords.csv`.

| Chuyên khoa | Nhóm sản phẩm MMH | Liên quan cao | Trung bình | Thấp |
|---|---|---|---|---|
| Nha khoa | **Trâm nội nha cầm tay** `NK-TRAM-TAY` | Files, Reamer, Trâm | nội nha, Ống tủy | · |
| Nha khoa | **Trâm máy và dụng cụ máy nội nha** `NK-TRAM-MAY` | Files, Reamer, Trâm | nội nha, Ống tủy | Niti |
| Nha khoa | **Dụng cụ trám bít ống tủy** `NK-TRAM-BIT` | Lentulo | nội nha, Trám, Ống tủy | · |
| Nha khoa | **Mũi khoan nha khoa** `NK-MUI-KHOAN` | mũi khoan | Carbide, Mài kẽ, nội nha | Phục hình |
| Nha khoa | **Chỉ khâu nha khoa** `NK-CHI` | · | · | chỉ |
| Nha khoa | **Composite (MMG)** `NK-COMPOSITE` | Commposit, Composite | Trám | Phục hình, phục hồi |
| Nha khoa | **Keo dán nha khoa (MMG)** `NK-KEO-DAN` | · | Keo dán | phục hồi |
| Nha khoa | **Tẩy trắng răng (MMG)** `NK-TAY-TRANG` | Tẩy trắng | · | · |
| Nhãn khoa | **Dao phẫu thuật nhãn khoa** `MK-DAO` | · | dịch kính, Glaucoma, Glocom, Phaco | dao, Thủy tinh thể |
| Nhãn khoa | **Chỉ khâu nhãn khoa** `MK-CHI` | · | dịch kính, Glaucoma, Glocom, Phaco, Võng mạc | chỉ, Thủy tinh thể |
| Nhãn khoa | **Trocar cắt dịch kính** `MK-TROCAR` | · | dịch kính, Võng mạc | nội nhãn, Trocar |
| Nhãn khoa | **Kẹp vi phẫu nhãn khoa** `MK-KEP` | bóc màng | dịch kính, Võng mạc | Forcep, kìm, kẹp, nội nhãn, Panh |
| Nhãn khoa | **Móc mở vùng bè** `MK-MOC-BE` | · | Glaucoma, Glocom | Vùng bè |
| Ngoại khoa | **Kìm đính da** `NG-MANIPLER` | Đính da | Khâu da | Ghim, kìm, Stapler |
| Ngoại khoa | **Dao ngoại khoa** `NG-DAO` | · | · | dao |
| Ngoại khoa | **Kim khâu và kim thép** `NG-KIM` | · | Khâu da | · |
| Nha khoa | **Mọi nhóm nha khoa** | · | · | Răng, nha khoa |

## Danh sách file (1 đợt · 39 file · 82,047 dòng)
"Dòng MANI": số dòng có chữ MANI ở cột Nhãn hiệu hoặc Hãng sản xuất (gồm MANI Hanoi, MANI Medical Germany), chỉ để tham khảo nhanh.

| Đợt | Từ khóa | Chuyên khoa | Liên quan | Số dòng | Dòng MANI | Ngày đăng tải KQLCNT |
|---|---|---|---|---|---|---|
| 2026-10-28 | Đính da | Ngoại khoa | Cao | 12 | 3 (25.0%) | 2023-08-08 → 2026-06-16 |
| 2026-10-28 | Khâu da | Ngoại khoa | Trung bình | 287 | 2 (0.7%) | 2023-04-25 → 2026-10-19 |
| 2026-10-28 | Ghim | Ngoại khoa | Thấp | 2,054 | 3 (0.1%) | 2023-04-10 → 2026-10-24 |
| 2026-10-28 | Stapler | Ngoại khoa | Thấp | 678 | 0 (0.0%) | 2023-04-26 → 2026-10-17 |
| 2026-10-28 | kìm | Ngoại khoa; Nhãn khoa | Thấp | 2,320 | 3 (0.1%) | 2023-03-27 → 2026-10-28 |
| 2026-10-28 | Commposit | Nha khoa | Cao | 89 | 11 (12.4%) | 2023-03-26 → 2026-10-16 |
| 2026-10-28 | Composite | Nha khoa | Cao | 1,113 | 80 (7.2%) | 2023-03-28 → 2026-10-24 |
| 2026-10-28 | Files | Nha khoa | Cao | 710 | 340 (47.9%) | 2023-03-10 → 2026-10-16 |
| 2026-10-28 | Lentulo | Nha khoa | Cao | 267 | 178 (66.7%) | 2023-05-24 → 2026-10-16 |
| 2026-10-28 | mũi khoan | Nha khoa | Cao | 3,312 | 829 (25.0%) | 2023-03-08 → 2026-10-27 |
| 2026-10-28 | Reamer | Nha khoa | Cao | 142 | 76 (53.5%) | 2023-06-01 → 2026-10-16 |
| 2026-10-28 | Trâm | Nha khoa | Cao | 1,143 | 608 (53.2%) | 2023-03-28 → 2026-10-16 |
| 2026-10-28 | Tẩy trắng | Nha khoa | Cao | 105 | 1 (1.0%) | 2023-07-20 → 2026-10-14 |
| 2026-10-28 | Carbide | Nha khoa | Trung bình | 126 | 36 (28.6%) | 2023-04-12 → 2026-10-16 |
| 2026-10-28 | Keo dán | Nha khoa | Trung bình | 848 | 57 (6.7%) | 2023-04-20 → 2026-10-24 |
| 2026-10-28 | Mài kẽ | Nha khoa | Trung bình | 7 | 0 (0.0%) | 2023-12-22 → 2026-08-04 |
| 2026-10-28 | nội nha | Nha khoa | Trung bình | 633 | 188 (29.7%) | 2023-03-28 → 2026-10-24 |
| 2026-10-28 | Trám | Nha khoa | Trung bình | 1,777 | 45 (2.5%) | 2023-03-28 → 2026-10-24 |
| 2026-10-28 | Ống tủy | Nha khoa | Trung bình | 1,327 | 246 (18.5%) | 2023-03-28 → 2026-10-24 |
| 2026-10-28 | nha khoa | Nha khoa | Thấp | 2,762 | 112 (4.1%) | 2023-03-28 → 2026-10-27 |
| 2026-10-28 | Niti | Nha khoa | Thấp | 214 | 7 (3.3%) | 2023-07-12 → 2026-10-08 |
| 2026-10-28 | Phục hình | Nha khoa | Thấp | 340 | 0 (0.0%) | 2023-04-12 → 2026-10-24 |
| 2026-10-28 | phục hồi | Nha khoa | Thấp | 276 | 0 (0.0%) | 2023-06-09 → 2026-10-19 |
| 2026-10-28 | Răng | Nha khoa | Thấp | 5,622 | 424 (7.5%) | 2023-03-08 → 2026-10-28 |
| 2026-10-28 | bóc màng | Nhãn khoa | Cao | 55 | 0 (0.0%) | 2023-04-06 → 2026-07-22 |
| 2026-10-28 | dịch kính | Nhãn khoa | Trung bình | 448 | 0 (0.0%) | 2023-03-24 → 2026-10-24 |
| 2026-10-28 | Glaucoma | Nhãn khoa | Trung bình | 11 | 1 (9.1%) | 2024-01-12 → 2026-10-20 |
| 2026-10-28 | Glocom | Nhãn khoa | Trung bình | 6 | 0 (0.0%) | 2024-10-15 → 2026-08-27 |
| 2026-10-28 | Phaco | Nhãn khoa | Trung bình | 1,266 | 53 (4.2%) | 2023-03-24 → 2026-10-26 |
| 2026-10-28 | Võng mạc | Nhãn khoa | Trung bình | 141 | 0 (0.0%) | 2023-04-06 → 2026-09-25 |
| 2026-10-28 | Forcep | Nhãn khoa | Thấp | 42 | 0 (0.0%) | 2023-09-21 → 2026-10-01 |
| 2026-10-28 | nội nhãn | Nhãn khoa | Thấp | 747 | 1 (0.1%) | 2023-04-06 → 2026-10-10 |
| 2026-10-28 | Panh | Nhãn khoa | Thấp | 1,278 | 0 (0.0%) | 2023-03-27 → 2026-10-16 |
| 2026-10-28 | Thủy tinh thể | Nhãn khoa | Thấp | 2,610 | 2 (0.1%) | 2023-03-08 → 2026-10-26 |
| 2026-10-28 | Trocar | Nhãn khoa | Thấp | 1,587 | 0 (0.0%) | 2023-04-25 → 2026-10-28 |
| 2026-10-28 | Vùng bè | Nhãn khoa | Thấp | 15 | 0 (0.0%) | 2023-07-11 → 2026-01-09 |
| 2026-10-28 | dao | Nhãn khoa; Ngoại khoa | Thấp | 9,240 | 178 (1.9%) | 2023-03-02 → 2026-10-28 |
| 2026-10-28 | kẹp | Nhãn khoa; Ngoại khoa | Thấp | 8,437 | 4 (0.0%) | 2023-01-31 → 2026-10-28 |
| 2026-10-28 | chỉ | Nhãn khoa; Nha khoa | Thấp | 30,000 ⚠️ chạm trần | 126 (0.4%) | 2024-04-25 → 2026-10-28 |

## Định dạng file
1 sheet `Danh sách hàng hóa`. Dòng 1: thời điểm xuất. Dòng 2: tiêu đề 25 cột. Dữ liệu từ dòng 3.

Cột: STT · Tên thiết bị, vật tư y tế · Đơn vị tính · Khối lượng · Xuất xứ · Mã HS · Ký mã hiệu · Nhãn hiệu · Hãng sản xuất · Chủng loại (model) · Số lưu hành / GPNK · Năm sản xuất · Cấu hình, tính năng kỹ thuật cơ bản · Đơn giá trúng thầu · Mã định danh NT trúng thầu · Tên NT trúng thầu · Mã TBMT · Mã định danh CĐT · Tên CĐT · Hình thức LCNT · Ngày đăng tải KQLCNT · Số quyết định · Ngày ban hành quyết định · Số nhà thầu tham dự · Địa điểm

## Lưu ý khi làm sạch
- Đơn giá là chuỗi có dấu chấm ngăn nghìn (`8.800.000`); ngày dạng `dd/mm/yyyy`; năm sản xuất là chữ tự do.
- Cùng một dòng hàng nằm trong nhiều file từ khóa: khử trùng theo Mã TBMT + tên hàng + nhà thầu + đơn giá.
- **Từ khóa nhiều chữ bị khớp lẻ từng chữ**: "nội nhãn" ra cả "hệ thống nội soi", "nội nha" ra cả "hóa chất nội kiểm". Cần lọc lại theo cụm từ đầy đủ.
- Không có dòng nào trước 31/01/2023 dù khoảng tra cứu bắt đầu 01/01/2022.
- **`KQTT chỉ.xlsx` chạm trần 30.000 dòng**: chỉ có dữ liệu từ 25/04/2024; cần tải lại theo từng năm.
- "Trám" (vật liệu trám) và "Trâm" (trâm nội nha) là 2 từ khóa khác nhau. File `KQTT Commposit.xlsx` giữ tên gốc khi tải (nội dung là "Composit").
- 3 file có "01.01.20 đến 28.10.26" trong tên nhưng cùng khoảng tra cứu với các file còn lại.
