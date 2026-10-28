# Báo cáo gộp KQTT

_Sinh tự động bởi `tools/kqtt_merge.py` lúc 28/10/2026 12:08. Đừng sửa tay._

## Khử trùng
- Dòng thô (tổng các file): **82,047**
- Dòng không trùng: **74,900** (bỏ 7,147 dòng lặp giữa các file)
- Số file từ khóa chứa cùng một dòng: 1 file: 68,132 · 2 file: 5,476 · 3 file: 637 · 4 file: 99 · 5 file: 9

## Kết quả theo chuyên khoa
| Chuyên khoa | File | Số dòng |
|---|---|---|
| Nhãn khoa | `KQTT_Nhan_khoa.xlsx` / `.csv` | 2,576 |
| Nha khoa | `KQTT_Nha_khoa.xlsx` / `.csv` | 5,343 |
| Ngoại khoa | `KQTT_Ngoai_khoa_Manipler.xlsx` / `.csv` | 106 |
| (không khớp nhóm nào) | `KQTT_Loai_ra.xlsx` (chỉ ở máy) · `Loai_ra_tom_tat.csv` | 66,875 |

## Theo nhóm sản phẩm MMH
| Mã nhóm | Nhóm | Số dòng |
|---|---|---|
| `NK-TRAM-TAY` | Trâm nội nha cầm tay | 1,498 |
| `NK-TRAM-MAY` | Trâm máy và dụng cụ máy nội nha | 159 |
| `NK-TRAM-BIT` | Dụng cụ trám bít ống tủy | 380 |
| `NK-MUI-KHOAN` | Mũi khoan nha khoa | 1,711 |
| `NK-CHI` | Chỉ khâu nha khoa | 197 |
| `NK-COMPOSITE` | Composite (MMG) | 1,054 |
| `NK-KEO-DAN` | Keo dán nha khoa (MMG) | 256 |
| `NK-TAY-TRANG` | Tẩy trắng răng (MMG) | 88 |
| `MK-DAO` | Dao phẫu thuật nhãn khoa | 1,435 |
| `MK-CHI` | Chỉ khâu nhãn khoa | 1,067 |
| `MK-TROCAR` | Trocar cắt dịch kính | 18 |
| `MK-KEP` | Kẹp vi phẫu nhãn khoa | 54 |
| `MK-MOC-BE` | Móc mở vùng bè | 2 |
| `NG-MANIPLER` | Kìm đính da | 106 |

## Dòng bị loại theo từ khóa nguồn (để soát quy tắc)
| Từ khóa | Số dòng loại ra |
|---|---|
| chỉ | 28,737 |
| kẹp | 8,351 |
| dao | 7,805 |
| Răng | 4,678 |
| Thủy tinh thể | 2,598 |
| nha khoa | 2,422 |
| kìm | 2,302 |
| Ghim | 1,973 |
| mũi khoan | 1,623 |
| Trocar | 1,572 |
| Trám | 1,460 |
| Panh | 1,263 |
| Ống tủy | 899 |
| Phaco | 807 |
| nội nhãn | 745 |
| Stapler | 665 |
| Keo dán | 634 |
| dịch kính | 415 |
| Phục hình | 339 |
| nội nha | 312 |
| phục hồi | 274 |
| Khâu da | 218 |
| Files | 216 |
| Niti | 201 |
| Composite | 188 |
| Võng mạc | 105 |
| Trâm | 89 |
| Forcep | 41 |
| Tẩy trắng | 37 |
| Carbide | 33 |
| bóc màng | 13 |
| Vùng bè | 13 |
| Glaucoma | 10 |
| Glocom | 6 |
| Commposit | 5 |
| Đính da | 3 |

Dòng có nhãn hiệu/hãng MANI nhưng bị loại: **22** (lọc cột `hang_mani` trong `Loai_ra_tom_tat.csv` để kiểm tra).
