"""Sinh lại raw/KQTT/manifest.csv và raw/KQTT/README.md từ các file KQTT thô.

Chạy sau mỗi đợt tải mới:  python tools/kqtt_manifest.py
Đọc: raw/KQTT/<YYYY-MM-DD>/*.xlsx, raw/KQTT/keywords.csv, raw/KQTT/product_groups.csv
Không sửa file Excel nào.
"""
import csv
import datetime as dt
import hashlib
import os
import re
import sys
import unicodedata

import openpyxl

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "raw", "KQTT")
LEVELS = {"Cao": 0, "Trung bình": 1, "Thấp": 2}


def nfc(s):
    return unicodedata.normalize("NFC", s)


def read_csv(name):
    with open(os.path.join(ROOT, name), encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def keyword_of(filename):
    """'KQTT mũi khoan _01.01.20 đến 28.10.26.xlsx' -> 'mũi khoan'."""
    stem = nfc(filename)[:-5]
    stem = re.sub(r"^KQTT\s+", "", stem)
    stem = re.sub(r"\s*_?\d{2}\.\d{2}\.\d{2}\s+đến\s+\d{2}\.\d{2}\.\d{2}$", "", stem)
    return stem.strip()


def scan(path):
    rows = list(openpyxl.load_workbook(path, read_only=True).worksheets[0].iter_rows(values_only=True))
    header, data = rows[1], [r for r in rows[2:] if r and r[0] not in (None, "")]
    i_date = header.index("Ngày đăng tải KQLCNT")
    i_brand, i_maker = header.index("Nhãn hiệu"), header.index("Hãng sản xuất")
    dates = [dt.datetime.strptime(str(r[i_date]).strip(), "%d/%m/%Y") for r in data]
    mani = sum(1 for r in data if re.search(r"\bmani\b", f"{r[i_brand]} {r[i_maker]}".lower()))
    exported = str(rows[0][0]).split(": ", 1)[-1]
    with open(path, "rb") as fh:
        sha = hashlib.sha256(fh.read()).hexdigest()[:16]
    return len(data), mani, min(dates), max(dates), exported, sha


def main():
    kw = {nfc(k["tu_khoa"]).lower(): k for k in read_csv("keywords.csv")}
    groups = read_csv("product_groups.csv")
    out, missing = [], []
    for batch in sorted(d for d in os.listdir(ROOT) if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d)):
        for f in sorted(os.listdir(os.path.join(ROOT, batch)), key=lambda s: nfc(s).lower()):
            if not f.lower().endswith(".xlsx"):
                continue
            k = keyword_of(f)
            meta = kw.get(k.lower())
            if meta is None:
                missing.append(k)
                meta = {"chuyen_khoa": "", "nhom_sp_mmh": "", "muc_lien_quan": ""}
            n, mani, dmin, dmax, exported, sha = scan(os.path.join(ROOT, batch, f))
            out.append({
                "dot_tai": batch, "file": nfc(f), "tu_khoa": k,
                "chuyen_khoa": meta["chuyen_khoa"], "nhom_sp_mmh": meta["nhom_sp_mmh"],
                "muc_lien_quan": meta["muc_lien_quan"], "so_dong": n, "dong_mani": mani,
                "ty_le_mani_pct": round(100 * mani / n, 1) if n else 0,
                "ngay_dang_tai_min": dmin.strftime("%Y-%m-%d"), "ngay_dang_tai_max": dmax.strftime("%Y-%m-%d"),
                "xuat_luc": exported, "sha256_16": sha,
            })

    with open(os.path.join(ROOT, "manifest.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)

    with open(os.path.join(ROOT, "README.md"), "w", encoding="utf-8") as fh:
        fh.write(render_readme(out, groups, kw))

    print(f"{len(out)} file, {sum(r['so_dong'] for r in out):,} dòng")
    if missing:
        print("Từ khóa chưa có trong keywords.csv:", ", ".join(sorted(set(missing))))
        sys.exit(1)


def render_readme(out, groups, kw):
    total = sum(r["so_dong"] for r in out)
    batches = sorted({r["dot_tai"] for r in out})

    by_group = []
    for g in groups:
        hits = [k for k in kw.values() if g["ma_nhom"] in [x.strip() for x in k["nhom_sp_mmh"].split(";")]]
        hits.sort(key=lambda k: (LEVELS.get(k["muc_lien_quan"], 9), k["tu_khoa"].lower()))
        cells = {lv: ", ".join(k["tu_khoa"] for k in hits if k["muc_lien_quan"] == lv) or "·" for lv in LEVELS}
        by_group.append(f"| {g['chuyen_khoa']} | **{g['ten_nhom']}** `{g['ma_nhom']}` | {cells['Cao']} | "
                        f"{cells['Trung bình']} | {cells['Thấp']} |")
    broad = [k["tu_khoa"] for k in kw.values() if k["nhom_sp_mmh"].startswith("Mọi nhóm")]
    if broad:
        by_group.append(f"| Nha khoa | **Mọi nhóm nha khoa** | · | · | {', '.join(broad)} |")

    files = []
    for r in sorted(out, key=lambda r: (r["dot_tai"], r["chuyen_khoa"], LEVELS.get(r["muc_lien_quan"], 9), r["tu_khoa"].lower())):
        flag = " ⚠️ chạm trần" if r["so_dong"] >= 30000 else ""
        files.append(f"| {r['dot_tai']} | {r['tu_khoa']} | {r['chuyen_khoa']} | {r['muc_lien_quan']} | "
                     f"{r['so_dong']:,}{flag} | {r['dong_mani']:,} ({r['ty_le_mani_pct']}%) | "
                     f"{r['ngay_dang_tai_min']} → {r['ngay_dang_tai_max']} |")

    return f"""# KQTT thô (kết quả trúng thầu, muasamcong.mpi.gov.vn)

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
{chr(10).join(by_group)}

## Danh sách file ({len(batches)} đợt · {len(out)} file · {total:,} dòng)
"Dòng MANI": số dòng có chữ MANI ở cột Nhãn hiệu hoặc Hãng sản xuất (gồm MANI Hanoi, MANI Medical Germany), chỉ để tham khảo nhanh.

| Đợt | Từ khóa | Chuyên khoa | Liên quan | Số dòng | Dòng MANI | Ngày đăng tải KQLCNT |
|---|---|---|---|---|---|---|
{chr(10).join(files)}

## Định dạng file
1 sheet `Danh sách hàng hóa`. Dòng 1: thời điểm xuất. Dòng 2: tiêu đề 25 cột. Dữ liệu từ dòng 3.

Cột: STT · Tên thiết bị, vật tư y tế · Đơn vị tính · Khối lượng · Xuất xứ · Mã HS · Ký mã hiệu · Nhãn hiệu · Hãng sản xuất · Chủng loại (model) · Số lưu hành / GPNK · Năm sản xuất · Cấu hình, tính năng kỹ thuật cơ bản · Đơn giá trúng thầu · Mã định danh NT trúng thầu · Tên NT trúng thầu · Mã TBMT · Mã định danh CĐT · Tên CĐT · Hình thức LCNT · Ngày đăng tải KQLCNT · Số quyết định · Ngày ban hành quyết định · Số nhà thầu tham dự · Địa điểm

## Lưu ý khi làm sạch
- Đơn giá là chuỗi có dấu chấm ngăn nghìn (`8.800.000`); ngày dạng `dd/mm/yyyy`; năm sản xuất là chữ tự do.
- Cùng một dòng hàng nằm trong nhiều file từ khóa: đã có quy trình khử trùng và phân loại theo chuyên khoa, xem `processed/KQTT/README.md` (`tools/kqtt_merge.py`).
- **Từ khóa nhiều chữ bị khớp lẻ từng chữ**: "nội nhãn" ra cả "hệ thống nội soi", "nội nha" ra cả "hóa chất nội kiểm". Cần lọc lại theo cụm từ đầy đủ.
- Không có dòng nào trước 31/01/2023 dù khoảng tra cứu bắt đầu 01/01/2022.
- **`KQTT chỉ.xlsx` chạm trần 30.000 dòng**: chỉ có dữ liệu từ 25/04/2024; cần tải lại theo từng năm.
- "Trám" (vật liệu trám) và "Trâm" (trâm nội nha) là 2 từ khóa khác nhau. File `KQTT Commposit.xlsx` giữ tên gốc khi tải (nội dung là "Composit").
- 3 file có "01.01.20 đến 28.10.26" trong tên nhưng cùng khoảng tra cứu với các file còn lại.
"""


if __name__ == "__main__":
    main()
