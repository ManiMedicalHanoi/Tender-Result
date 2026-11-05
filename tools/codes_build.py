#!/usr/bin/env python3
"""Dựng map/codes.js — danh mục mã DAO, CHỈ KHÂU nhãn khoa, GHIM DA (Manipler), MICRO FORCEPS của MANI cho ô chọn sản phẩm (Theo dõi thầu) của Tender Map.

Nguồn (kho riêng tư ManiMedicalHanoi/mmh-library, chỉ lấy MÃ + mô tả ngắn công khai trong catalogue):
  · Ophthalmic product/Ophthalmic Knives document/Dao nhãn khoa MANI - Hồ sơ sản phẩm.md   (bảng "| Mã | Mô tả |" + dòng liệt kê mã)
  · Ophthalmic product/Ophthalmic Sutures document/Bảng mã chỉ khâu nhãn khoa (catalogue VN 2025-08).csv
  · Surgical product/Manipler Skin Staplers document/Manipler - Hồ sơ sản phẩm.md                (mục 1. Danh mục — catalogue VN)
  · Ophthalmic product/Micro Forceps document/Micro-Forceps-Catalog_en.pdf                          (bảng Order No — cần pdftotext)
  Trabeculotomy Hook: thư viện chưa có mã đặt hàng ⇒ danh sách trống, app cho gõ tự do.

Chạy:  python3 -I tools/codes_build.py <thư mục mmh-library>
"""
import csv, datetime, json, os, re, subprocess, sys

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

def forceps(pdf):
    """Micro Forceps: mã M(SQ|RD|IL)<gauge>[A28] trong bảng Order No của catalogue."""
    try: txt = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    except Exception as e:
        print("Không đọc được catalogue Micro Forceps:", e, file=sys.stderr); return []
    tip = {"SQ": "đầu vuông", "RD": "đầu tròn", "IL": "đầu ILM"}
    rows, seen = [], set()
    for c in re.findall(r"\b(M(?:SQ|RD|IL)\d{2}(?:A\d{2})?)\b", txt):
        if c in seen: continue
        seen.add(c)
        rows.append([c, "Micro Forceps %sG %s · %s" % (c[3:5], tip[c[1:3]], "Wide Grip 28 mm" if c.endswith("A28") else "Slim Grip 33 mm")])
    rows.sort(key=lambda r: (not r[0].endswith("A28"), r[0][3:5], "SQRDIL".index(r[0][1:3])))
    return rows

def main():
    lib = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), "mmh-library")
    oph = os.path.join(lib, "Ophthalmic product")
    dao = knives(os.path.join(oph, "Ophthalmic Knives document", "Dao nhãn khoa MANI - Hồ sơ sản phẩm.md"))
    chi = sutures(os.path.join(oph, "Ophthalmic Sutures document", "Bảng mã chỉ khâu nhãn khoa (catalogue VN 2025-08).csv"))
    ghim = staplers(os.path.join(lib, "Surgical product", "Manipler Skin Staplers document", "Manipler - Hồ sơ sản phẩm.md"))
    forcep = forceps(os.path.join(oph, "Micro Forceps document", "Micro-Forceps-Catalog_en.pdf"))
    js = ("/* Mã dao + chỉ khâu nhãn khoa, ghim da Manipler, Micro Forceps MANI (MMH Library: hồ sơ dao nhãn khoa, bảng mã chỉ khâu catalogue VN 2025-08, hồ sơ Manipler, catalogue Micro Forceps) — dựng bằng tools/codes_build.py (" +
          datetime.date.today().isoformat() + "). Không sửa tay. */\nwindow.MANI_CODES=" +
          json.dumps({"dao": dao, "chi": chi, "ghim": ghim, "forcep": forcep, "hook": []}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    open(os.path.join(ROOT, "map", "codes.js"), "w", encoding="utf-8").write(js)
    print("codes.js:", len(dao), "mã dao ·", len(chi), "mã chỉ ·", len(ghim), "mã ghim da ·", len(forcep), "mã forceps ·", round(len(js.encode()) / 1024), "KB", file=sys.stderr)

if __name__ == "__main__":
    main()
