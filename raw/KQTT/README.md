# KQTT thô (kết quả trúng thầu, muasamcong.mpi.gov.vn)

Dữ liệu **thô, chưa xử lý**: file Excel xuất nguyên trạng từ Hệ thống mạng đấu thầu quốc gia, tra theo từ khóa tên hàng hóa.
Không sửa tay các file trong thư mục này; quy trình gộp, khử trùng và làm sạch sẽ đọc từ đây và ghi ra thư mục khác.

## Cấu trúc
```
raw/KQTT/
  manifest.csv          ← 1 dòng / file: đợt tải, từ khóa, số dòng, khoảng ngày đăng tải, thời điểm xuất, mã băm
  <YYYY-MM-DD>/         ← 1 thư mục / đợt tải (ngày xuất dữ liệu)
    KQTT <từ khóa>.xlsx
```
Đợt tải mới: tạo thư mục ngày mới, giữ nguyên tên file như khi tải, thêm dòng vào `manifest.csv` và bảng dưới.

## Định dạng file
1 sheet `Danh sách hàng hóa`. Dòng 1: thời điểm xuất dữ liệu. Dòng 2: tiêu đề 25 cột. Dữ liệu từ dòng 3.

Cột: STT · Tên thiết bị, vật tư y tế · Đơn vị tính · Khối lượng · Xuất xứ · Mã HS · Ký mã hiệu · Nhãn hiệu · Hãng sản xuất · Chủng loại (model) · Số lưu hành / GPNK · Năm sản xuất · Cấu hình, tính năng kỹ thuật cơ bản · Đơn giá trúng thầu · Mã định danh NT trúng thầu · Tên NT trúng thầu · Mã TBMT · Mã định danh CĐT · Tên CĐT · Hình thức LCNT · Ngày đăng tải KQLCNT · Số quyết định · Ngày ban hành quyết định · Số nhà thầu tham dự · Địa điểm

Lưu ý khi làm sạch: đơn giá là chuỗi có dấu chấm ngăn nghìn (`8.800.000`); ngày dạng `dd/mm/yyyy`; năm sản xuất là chữ tự do; cùng một dòng hàng có thể nằm trong nhiều file từ khóa (khử trùng theo Mã TBMT + tên hàng + nhà thầu + đơn giá).

## Đợt 2026-10-28: 20 file · 72,223 dòng
Tra cứu từ ngày 01/01/2022 đến 28/10/2026.

| Nhóm | Từ khóa | File | Số dòng | Ngày đăng tải KQLCNT |
|---|---|---|---|---|
| Nha khoa | Composite | `KQTT Composite 01.01.20 đến 28.10.26.xlsx` | 1,113 | 2023-03-28 → 2026-10-24 |
| Nha khoa | Files | `KQTT Files.xlsx` | 710 | 2023-03-10 → 2026-10-16 |
| Nha khoa | mũi khoan | `KQTT mũi khoan _01.01.20 đến 28.10.26.xlsx` | 3,312 | 2023-03-08 → 2026-10-27 |
| Nha khoa | nha khoa | `KQTT nha khoa.xlsx` | 2,762 | 2023-03-28 → 2026-10-27 |
| Nha khoa | nội nha | `KQTT nội nha.xlsx` | 633 | 2023-03-28 → 2026-10-24 |
| Nha khoa | Phục hình | `KQTT Phục hình.xlsx` | 340 | 2023-04-12 → 2026-10-24 |
| Nha khoa | phục hồi | `KQTT phục hồi.xlsx` | 276 | 2023-06-09 → 2026-10-19 |
| Nha khoa | Răng | `KQTT Răng.xlsx` | 5,622 | 2023-03-08 → 2026-10-28 |
| Nha khoa | Trám | `KQTT Trám 01.01.20 đến 28.10.26.xlsx` | 1,777 | 2023-03-28 → 2026-10-24 |
| Nha khoa | Trâm | `KQTT Trâm.xlsx` | 1,143 | 2023-03-28 → 2026-10-16 |
| Nha khoa | Tẩy trắng | `KQTT Tẩy trắng.xlsx` | 105 | 2023-07-20 → 2026-10-14 |
| Nhãn khoa | bóc màng | `KQTT bóc màng.xlsx` | 55 | 2023-04-06 → 2026-07-22 |
| Nhãn khoa | dịch kính | `KQTT dịch kính.xlsx` | 448 | 2023-03-24 → 2026-10-24 |
| Nhãn khoa | Thủy tinh thể | `KQTT Thủy tinh thể.xlsx` | 2,610 | 2023-03-08 → 2026-10-26 |
| Nhãn khoa / chung | chỉ | `KQTT chỉ.xlsx` | 30,000 | 2024-04-25 → 2026-10-28 | ⚠️ chạm trần 30.000 dòng
| Nhãn khoa / chung | dao | `KQTT dao.xlsx` | 9,240 | 2023-03-02 → 2026-10-28 |
| Dụng cụ (kẹp/panh) | Forcep | `KQTT Forcep.xlsx` | 42 | 2023-09-21 → 2026-10-01 |
| Dụng cụ (kẹp/panh) | kìm | `KQTT kìm.xlsx` | 2,320 | 2023-03-27 → 2026-10-28 |
| Dụng cụ (kẹp/panh) | kẹp | `KQTT kẹp.xlsx` | 8,437 | 2023-01-31 → 2026-10-28 |
| Dụng cụ (kẹp/panh) | Panh | `KQTT Panh.xlsx` | 1,278 | 2023-03-27 → 2026-10-16 |

### Lưu ý của đợt này
- Dòng sớm nhất trong cả 20 file là **31/01/2023**, dù khoảng tra cứu bắt đầu từ 01/01/2022: hệ thống không trả về kết quả năm 2022.
- **`KQTT chỉ.xlsx` có đúng 30.000 dòng**, chạm trần xuất file của hệ thống; dòng sớm nhất là 25/04/2024. Dữ liệu từ 2023 đến 24/04/2024 bị thiếu. Cần tải lại từ khóa "chỉ" theo từng khoảng thời gian ngắn hơn (ví dụ từng năm).
- Tên file giữ như khi tải: 3 file có ghi "01.01.20 đến 28.10.26" trong tên, nhưng cùng khoảng tra cứu như các file còn lại.
- "Trám" (vật liệu trám) và "Trâm" (trâm nội nha) là 2 từ khóa khác nhau.
