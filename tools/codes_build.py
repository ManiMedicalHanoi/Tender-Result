#!/usr/bin/env python3
"""Dựng map/codes.js — danh mục mã DAO, CHỈ KHÂU nhãn khoa, GHIM DA (Manipler), MICRO FORCEPS của MANI cho ô chọn sản phẩm (Theo dõi thầu) của Tender Map.

Nguồn (kho riêng tư ManiMedicalHanoi/mmh-library, chỉ lấy MÃ + mô tả ngắn công khai trong catalogue):
  · Ophthalmic product/Ophthalmic Knives document/Dao nhãn khoa MANI - Hồ sơ sản phẩm.md   (bảng "| Mã | Mô tả |" + dòng liệt kê mã)
  · Ophthalmic product/Ophthalmic Sutures document/Bảng mã chỉ khâu nhãn khoa (catalogue VN 2025-08).csv
  · Surgical product/Manipler Skin Staplers document/Manipler - Hồ sơ sản phẩm.md                (mục 1. Danh mục — catalogue VN)
  · Ophthalmic product/Micro Forceps document/Kẹp vi phẫu MANI - Hồ sơ sản phẩm.md                (mục 2. Mã đặt hàng — bản dịch flyer S0038)
  · Ophthalmic product/Trabeculotomy Hook document/Móc mở vùng bè MANI - Hồ sơ sản phẩm.md         (mục 3. Mã đặt hàng — bản dịch catalogue S0017)

Chạy:  python3 -I tools/codes_build.py <thư mục mmh-library>
"""
import csv, datetime, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAM = [("MST", "Dao thẳng"), ("MSL", "Dao rạch"), ("MSS", "Dao rạch"), ("MSP", "Dao tạo cổng bên"), ("MVR", "Dao MVR"), ("MPK", "Dao tạo cổng"),
       ("MCU", "Dao lưỡi liềm"), ("MCD", "Dao lưỡi liềm"), ("MCS", "Dao lưỡi liềm"), ("MCB", "Dao lưỡi liềm"), ("MRS", "Dao rạch R"),
       ("MGL", "Dao golf"), ("MLR", "Dao LRI"), ("MDP", "Dao tạo rãnh")]
CODE = re.compile(r"\b(M(?:ST|SL|SS|SP|VR|PK|CU|CD|CS|CB|RS|GL|LR|DP)\d{2}[A-Z]{0,3})\b")

def knives(md):
    out = {}
    for line in open(md, encoding="utf-8"):
        if line.startswith("## 4"): break          # chỉ đọc mục 3 (danh mục & thông số), bỏ ghi chú đối chiếu tài liệu
        m = re.match(r"\|\s*(M[A-Z]{2}\d{2}[A-Z]{0,3})\s*\|\s*([^|]+)\|", line)
        if m:
            out.setdefault(m.group(1), re.sub(r"\s*·.*$", "", m.group(2)).strip())
            continue
        for c in CODE.findall(line):
            if c not in out and not re.search(r"Mã \(hãng\)|Yamazaki|\| [A-I] \|", line):
                out[c] = ""
    rows = []
    for c, d in out.items():
        fam = next((n for p, n in FAM if c.startswith(p)), "Dao")
        if not d:
            sz = re.match(r"M[A-Z]{2}(\d{2})", c).group(1)
            d = fam + (" " + sz[0] + "," + sz[1] + " mm" if c[:3] in ("MSL", "MRS", "MCU", "MCB") else "")
            if c.endswith("SK"): d += " (an toàn)"
            elif c.endswith("SH"): d += " (đầu ngắn)"
            elif c.endswith("AB"): d += " (cong)"
        rows.append([c, d])
    order = {p: i for i, (p, _) in enumerate(FAM)}
    rows.sort(key=lambda r: (order.get(r[0][:3], 99), r[0]))
    return rows

def sutures(path):
    rows = []
    for r in csv.DictReader(open(path, encoding="utf-8-sig")):
        code = (r.get("Mã đặt hàng") or "").strip()
        if not code: continue
        mat = re.sub(r",.*$", "", (r.get("Loại chỉ") or "").strip())
        rows.append([code, " · ".join(x for x in [(r.get("Cỡ chỉ (USP)") or "").strip(), mat, (r.get("Chiều dài chỉ") or "").strip(),
                                                    (r.get("Kiểu đầu kim") or "").strip(), (r.get("Chiều dài kim") or "").strip()] if x)])
    return rows

def staplers(md):
    """Manipler: bảng | Tên sản phẩm | Chủng loại | Mã đặt hàng (**mã**) | Mô tả | … của mục 1."""
    rows, on = [], False
    for line in open(md, encoding="utf-8"):
        if line.startswith("## 1."): on = True; continue
        if on and line.startswith("## "): break
        m = re.match(r"\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*\*\*([A-Z0-9-]+)\*\*\s*\|\s*([^|]*?)\s*\|", line) if on else None
        if m:
            name, kind, code, desc = m.groups()
            rows.append([code, kind or (name + (" (" + desc[0].lower() + desc[1:] + ")" if desc else ""))])
    return rows

def section(md, head):
    """Các dòng bảng | … | của mục bắt đầu bằng `## <head>` trong hồ sơ sản phẩm."""
    rows, on = [], False
    for line in open(md, encoding="utf-8"):
        if line.startswith("## "):
            if on: break
            on = line.startswith("## " + head)
            continue
        if on and line.startswith("|") and not re.match(r"\|\s*-", line):
            rows.append([c.strip().strip("*") for c in line.strip().strip("|").split("|")])
    return rows[1:]                                   # bỏ dòng tiêu đề bảng

def forceps(md):
    """Kẹp vi phẫu MANI (Micro Forceps): | Mã | Mô tả (EN) | Kiểu đầu kẹp | Gauge | Dòng |"""
    return [[r[0], "Kẹp vi phẫu %s đầu %s · %s" % (r[3], r[2] if r[2].isupper() else r[2].lower(), r[4])] for r in section(md, "2.") if re.match(r"^M[A-Z]{2}\d{2}", r[0])]

def hooks(md):
    """Móc mở vùng bè MANI (Trabeculotomy Hook): | Mã | Quy cách | Chiều dài phần móc | Tổng chiều dài |"""
    return [[r[0], "Móc mở vùng bè · móc %s, dài %s (%s)" % (r[2], r[3], r[1])] for r in section(md, "3.") if re.match(r"^[A-Z]{2,4}-?[A-Z0-9]+$", r[0])]

def main():
    lib = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), "mmh-library")
    oph = os.path.join(lib, "Ophthalmic product")
    dao = knives(os.path.join(oph, "Ophthalmic Knives document", "Dao nhãn khoa MANI - Hồ sơ sản phẩm.md"))
    chi = sutures(os.path.join(oph, "Ophthalmic Sutures document", "Bảng mã chỉ khâu nhãn khoa (catalogue VN 2025-08).csv"))
    ghim = staplers(os.path.join(lib, "Surgical product", "Manipler Skin Staplers document", "Manipler - Hồ sơ sản phẩm.md"))
    forcep = forceps(os.path.join(oph, "Micro Forceps document", "Kẹp vi phẫu MANI - Hồ sơ sản phẩm.md"))
    hook = hooks(os.path.join(oph, "Trabeculotomy Hook document", "Móc mở vùng bè MANI - Hồ sơ sản phẩm.md"))
    js = ("/* Mã dao + chỉ khâu nhãn khoa, ghim da Manipler, kẹp vi phẫu (Micro Forceps), móc mở vùng bè (Hook) MANI (MMH Library: hồ sơ dao nhãn khoa, bảng mã chỉ khâu catalogue VN 2025-08, hồ sơ Manipler, hồ sơ kẹp vi phẫu S0038, hồ sơ móc mở vùng bè S0017) — dựng bằng tools/codes_build.py (" +
          datetime.date.today().isoformat() + "). Không sửa tay. */\nwindow.MANI_CODES=" +
          json.dumps({"dao": dao, "chi": chi, "ghim": ghim, "forcep": forcep, "hook": hook}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    open(os.path.join(ROOT, "map", "codes.js"), "w", encoding="utf-8").write(js)
    print("codes.js:", len(dao), "mã dao ·", len(chi), "mã chỉ ·", len(ghim), "mã ghim da ·", len(forcep), "mã forceps ·", len(hook), "mã hook ·", round(len(js.encode()) / 1024), "KB", file=sys.stderr)

if __name__ == "__main__":
    main()
