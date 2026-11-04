#!/usr/bin/env python3
"""Gắn cột `own` (cl = công lập · tn = tư nhân) cho danh mục cơ sở y tế map/csyt.js.

Danh mục dựng từ OpenStreetMap + bên mời thầu KQTT: OSM KHÔNG ghi rõ công / tư (thiếu operator:type), bộ lọc tên ở csyt_build.py
chỉ loại được chuỗi lớn (Vinmec, Hoàn Mỹ, Tâm Anh…) ⇒ còn sót bệnh viện tư (Mắt Sài Gòn, Việt Nhật, Tâm Trí, Pháp Việt…).
Quy tắc dưới đây (theo tên + tỉnh) đánh dấu bệnh viện TƯ NHÂN; còn lại = công lập. Bảng tên chuẩn CRM (VM_STD ở backend crm-surgical)
vẫn được app ưu tiên cho khách đã có trên CRM.

Chạy:  python3 -I tools/csyt_own.py            (sửa tại chỗ map/csyt.js; csyt_build.py tự gọi sau khi dựng)
       python3 -I tools/csyt_own.py --list     (in danh sách cơ sở tư nhân để soát)
Thêm / sửa: thêm dòng vào PRIV (regex trên tên bỏ dấu, chữ thường; tỉnh mới = tuỳ chọn) hoặc PUB (ngoại lệ công lập, xét trước).
"""
import json, os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "map", "csyt.js")

def nk(s):
    s = unicodedata.normalize("NFD", str(s or "")).replace("đ", "d").replace("Đ", "D")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\- ]+", " ", s)).strip()

# Ngoại lệ CÔNG LẬP (xét trước): tên giống chuỗi tư nhân nhưng là cơ sở nhà nước
PUB = [
    (r"^benh vien sai gon$", None),                       # BV Sài Gòn (Q.1, Sở Y tế TP.HCM)
    (r"^benh vien binh dan$", "Hồ Chí Minh"),             # BV Bình Dân TP.HCM
    (r"^benh vien mat ha noi( \(|$| tru so)", None),      # BV Mắt Hà Nội (Sở Y tế HN); "Mắt Hà Nội - <tỉnh>" là chuỗi tư nhân
    (r"quan khu|quan y|quan doi|quan dan y|cong an|bo quoc phong", None),   # quân đội / công an
]
# TƯ NHÂN: (regex trên tên bỏ dấu, tỉnh mới hoặc None)
PRIV = [
    # chuỗi bệnh viện mắt / đa khoa tư nhân
    (r"sai gon", None), (r"viet nhat", None), (r"ky thuat cao", None), (r"\btam tri\b", None), (r"mat ha noi ?-", None),
    (r"hoa hao", None), (r"phap viet", None), (r"phuong nam", None), (r"tam duc", None), (r"trieu an", None), (r"van phuc", None),
    (r"nam viet", None), (r"yersin", None), (r"thanh vu", None), (r"cong ty|co phan|\bmedic\b", None), (r"duong lao", None),
    # từng cơ sở (tên + tỉnh)
    (r"\bbinh an\b", "An Giang"), (r"nhat tan", "An Giang"), (r"kinh bac", "Bắc Ninh"), (r"thien nhan", "Bắc Ninh"),
    (r"gia phuoc", "Cần Thơ"), (r"ha thanh", "Hà Nội"), (r"hong phat", "Hà Nội"), (r"trang an", "Hà Nội"), (r"duc phuc", "Hà Nội"),
    (r"song hong", "Hà Nội"), (r"lam hoa", "Hưng Yên"), (r"an sinh", "Hồ Chí Minh"), (r"duc khang", "Hồ Chí Minh"),
    (r"ngoc phu", "Hồ Chí Minh"), (r"phuoc an", "Hồ Chí Minh"), (r"hung thinh", "Lào Cai"), (r"quang khoi", "Nghệ An"),
    (r"dai an", "Thanh Hóa"), (r"hop luc", "Thanh Hóa"), (r"da khoa yen binh", "Thái Nguyên"), (r"hong hung", "Tây Ninh"),
    (r"minh duc", "Vĩnh Long"), (r"binh dan", "Đà Nẵng"), (r"nguyen van thai", "Đà Nẵng"), (r"tam hong phuoc", "Đồng Nai"),
    (r"anh duc", "Đồng Tháp"),
]

def own_of(name, prov, t):
    k = nk(name)
    if t in ("ttyt", "pkkv", "dv"): return "cl"
    for rx, p in PUB:
        if (p is None or p == prov) and re.search(rx, k): return "cl"
    for rx, p in PRIV:
        if (p is None or p == prov) and re.search(rx, k): return "tn"
    return "cl"

def load(path):
    txt = open(path, encoding="utf-8").read()
    i = txt.index("window.CSYT=")
    head, body = txt[:i], txt[i + len("window.CSYT="):].rstrip().rstrip(";")
    return head, json.loads(body)

def classify(path=PATH, show=False):
    head, d = load(path)
    cols = d["cols"]
    if "own" not in cols:
        cols.append("own")
        for r in d["rows"]: r.append("")
    ix = {c: i for i, c in enumerate(cols)}
    n = 0
    for r in d["rows"]:
        r[ix["own"]] = own_of(r[ix["n"]], r[ix["p"]], r[ix["t"]])
        if r[ix["own"]] == "tn":
            n += 1
            if show: print("tn |", r[ix["n"]], "|", r[ix["p"]], "|", r[ix["src"]])
    d["own"] = {"cl": "Công lập", "tn": "Tư nhân"}
    head = re.sub(r"Danh mục cơ sở khám chữa bệnh công lập", "Danh mục cơ sở khám chữa bệnh (cột own: cl công lập · tn tư nhân — tools/csyt_own.py)", head)
    with open(path, "w", encoding="utf-8") as f:
        f.write(head + "window.CSYT=" + json.dumps(d, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("csyt.js: %d cơ sở, %d tư nhân" % (len(d["rows"]), n), file=sys.stderr)
    return n

if __name__ == "__main__":
    classify(show="--list" in sys.argv)
