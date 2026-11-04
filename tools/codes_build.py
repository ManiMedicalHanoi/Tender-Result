#!/usr/bin/env python3
"""Dựng map/codes.js — danh mục mã DAO và CHỈ KHÂU nhãn khoa MANI cho ô chọn sản phẩm (Theo dõi thầu) của Tender Map.

Nguồn (kho riêng tư ManiMedicalHanoi/mmh-library, chỉ lấy MÃ + mô tả ngắn công khai trong catalogue):
  · Ophthalmic product/Ophthalmic Knives document/Dao nhãn khoa MANI - Hồ sơ sản phẩm.md   (bảng "| Mã | Mô tả |" + dòng liệt kê mã)
  · Ophthalmic product/Ophthalmic Sutures document/Bảng mã chỉ khâu nhãn khoa (catalogue VN 2025-08).csv

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

def main():
    lib = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), "mmh-library")
    oph = os.path.join(lib, "Ophthalmic product")
    dao = knives(os.path.join(oph, "Ophthalmic Knives document", "Dao nhãn khoa MANI - Hồ sơ sản phẩm.md"))
    chi = sutures(os.path.join(oph, "Ophthalmic Sutures document", "Bảng mã chỉ khâu nhãn khoa (catalogue VN 2025-08).csv"))
    js = ("/* Mã dao + chỉ khâu nhãn khoa MANI (MMH Library: hồ sơ dao nhãn khoa, bảng mã chỉ khâu catalogue VN 2025-08) — dựng bằng tools/codes_build.py (" +
          datetime.date.today().isoformat() + "). Không sửa tay. */\nwindow.MANI_CODES=" +
          json.dumps({"dao": dao, "chi": chi}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    open(os.path.join(ROOT, "map", "codes.js"), "w", encoding="utf-8").write(js)
    print("codes.js:", len(dao), "mã dao ·", len(chi), "mã chỉ ·", round(len(js.encode()) / 1024), "KB", file=sys.stderr)

if __name__ == "__main__":
    main()
