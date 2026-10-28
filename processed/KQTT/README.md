# KQTT đã gộp: Nhãn khoa · Nha khoa · Ngoại khoa (Manipler)

Sinh từ dữ liệu thô `raw/KQTT/` bằng `tools/kqtt_merge.py`. **Không sửa tay các file ở đây**: sửa quy tắc rồi chạy lại script.
Số liệu lần chạy gần nhất: xem [`BAO_CAO.md`](BAO_CAO.md).

## File
| File | Nội dung |
|---|---|
| `KQTT_Nhan_khoa.xlsx` / `.csv` | Dòng thuộc nhóm dao, chỉ, trocar, kẹp vi phẫu, móc mở vùng bè |
| `KQTT_Nha_khoa.xlsx` / `.csv` | Dòng thuộc nhóm trâm tay, trâm máy, trám bít ống tủy, mũi khoan, chỉ nha khoa, composite, keo dán, tẩy trắng |
| `KQTT_Ngoai_khoa_Manipler.xlsx` / `.csv` | Dòng thuộc nhóm kìm đính da, ghim da, dụng cụ tháo ghim |
| `Loai_ra_tom_tat.csv` | Các tên hàng bị loại (không khớp nhóm nào), gộp theo tên hàng + từ khóa nguồn, xếp theo số dòng. Dùng để soát và bổ sung quy tắc |
| `KQTT_Loai_ra.xlsx` | Bản đầy đủ từng dòng bị loại (~18 MB). Chỉ sinh khi chạy script ở máy, không đưa lên git |
| `BAO_CAO.md` | Số dòng thô, không trùng, theo chuyên khoa, theo nhóm sản phẩm, dòng loại theo từ khóa |

Cột: 24 cột gốc (bỏ STT) + 9 cột thêm:

| Cột | Ý nghĩa |
|---|---|
| `chuyen_khoa` | Nhãn khoa / Nha khoa / Ngoại khoa |
| `nhom_sp_mmh`, `ten_nhom` | Nhóm sản phẩm MMH mà dòng **có thể** thuộc (mã theo `raw/KQTT/product_groups.csv`) |
| `nhom_khop_khac` | Các nhóm khác cũng khớp (nếu có), để soát |
| `hang_mani` | "Có" nếu cột Nhãn hiệu hoặc Hãng sản xuất có chữ MANI |
| `tu_khoa_nguon`, `so_file_nguon` | Dòng này xuất hiện trong những file từ khóa nào |
| `ban_sao_thu` | Thứ tự bản sao khi một dòng giống hệt lặp lại trong cùng file (vd. nhiều cỡ trâm cùng mô tả): 1, 2, 3… |
| `khoa_dong` | Mã định danh dòng sau khử trùng; các bản sao có cùng mã |

## Quy tắc khử trùng
1. Chuẩn hóa mọi ô: Unicode NFC, gộp khoảng trắng, không phân biệt hoa thường.
2. Hai dòng là **một** khi khớp đủ 24 cột (mọi cột trừ STT).
3. Dòng giống hệt nhau trong **cùng một file** là các mặt hàng khác nhau, nên giữ lại. Số bản giữ = số lần xuất hiện **nhiều nhất trong một file**, không cộng dồn giữa các file.
   Ví dụ "Trâm tay H file" BV 71 TW có 8 dòng giống hệt ở file Trâm và 8 dòng ở file Files → giữ 8, không phải 16.
4. Đợt tải sau trùng khoảng thời gian với đợt trước cũng được gộp theo cách này.

## Quy tắc phân loại (`rules/kqtt_rules.csv`)
Mỗi nhóm có 3 loại mẫu (biểu thức chính quy, không phân biệt hoa thường, đã quy đổi "thuỷ/thủy", "hoà/hòa"…):

| `loai` | Áp dụng trên | Điều kiện |
|---|---|---|
| `ten` | Tên hàng | Phải khớp ít nhất 1 mẫu |
| `ngu_canh` | Tên + cấu hình kỹ thuật + nhãn hiệu + hãng sản xuất + tên CĐT | Nếu nhóm có mẫu này: phải khớp ít nhất 1 |
| `loai_tru` | Tên hàng | Khớp bất kỳ mẫu nào → không thuộc nhóm |

Một dòng khớp nhiều nhóm → lấy nhóm **đứng trước** trong file quy tắc (vd. trâm máy xét trước trâm tay, chỉ nha khoa xét trước chỉ nhãn khoa). Các nhóm còn lại ghi ở `nhom_khop_khac`.

Ví dụ ngữ cảnh: "Mũi khoan" chỉ vào Nha khoa khi có dấu hiệu nha khoa (răng, tủy, tay khoan chậm/nhanh, hãng MANI/Dentsply…, hoặc CĐT là BV Răng Hàm Mặt); "Chỉ" chỉ vào Nhãn khoa khi có dấu hiệu mắt, cỡ 10-0/11-0 hoặc hãng chỉ nhãn khoa, và loại cỡ to (số 0 đến 3/0).

**Kiểm tra độ phủ**: số dòng hàng MANI bị loại được ghi ở cuối `BAO_CAO.md` (lần chạy đầu 353 dòng, sau khi chỉnh quy tắc còn 22 dòng, đều là vật liệu trám/xi măng, chỉ tim mạch, lưỡi dao mổ thường, không thuộc nhóm sản phẩm MMH).

## Chạy lại
```bash
pip install openpyxl
python tools/kqtt_manifest.py   # sau khi thêm file thô mới
python tools/kqtt_merge.py      # gộp + phân loại + xuất
```
Thêm hoặc sửa quy tắc: mở `rules/kqtt_rules.csv`, xem `Loai_ra_tom_tat.csv` tìm tên hàng bị loại sai (hoặc lọc cột `nhom_sp_mmh` trong file chuyên khoa tìm dòng giữ sai), sửa mẫu, chạy lại.

## Giới hạn
- Phân loại theo chữ trong tên hàng, nên là **"có thể thuộc"**, chưa phải kết luận. Tên hàng quá chung ("Mũi khoan", "Chỉ phẫu thuật không tiêu") chỉ được giữ nhờ ngữ cảnh (cấu hình, hãng, CĐT), nên có thể lẫn hoặc sót.
- Chưa làm sạch giá, đơn vị, năm sản xuất, tên CĐT/nhà thầu: phần đó thuộc bước làm sạch sau.
- `KQTT chỉ.xlsx` thô thiếu dữ liệu trước 25/04/2024 (chạm trần 30.000 dòng), nên nhóm chỉ khâu cũng thiếu giai đoạn này.
