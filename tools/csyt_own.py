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
    (r"^benh vien da khoa sai gon$", "Hồ Chí Minh"),      # BV Đa khoa Sài Gòn (125 Lê Lợi, Sở Y tế TP.HCM) — khác BV Tâm Trí Sài Gòn
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
    # rà 09/11/2026 (đối chiếu bảng tên chuẩn CRM VM_STD): bệnh viện tư nhân / đại học tư bị xếp nhầm công lập
    (r"phenikaa", None), (r"dai hoc nam can tho", None), (r"thanh an - thang long|thanh an thang long", None), (r"viet - bi\b|viet bi\b", None),
    (r"\bcao thang\b", "Hồ Chí Minh"), (r"phu san mekong", None), (r"da khoa 115 nghe an", None),
    (r"chuyen khoa mat vinh long", "Vĩnh Long"),          # theo CRM (VM_STD 'tn') — chưa có nguồn công khai xác nhận
]

def own_of(name, prov, t):
    k = nk(name)
    if t in ("ttyt", "pkkv", "dv"): return "cl"
    for rx, p in PUB:
        if (p is None or p == prov) and re.search(rx, k): return "cl"
    for rx, p in PRIV:
        if (p is None or p == prov) and re.search(rx, k): return "tn"
    return "cl"

# ── tên phụ (alias) do csyt_build.py gộp nhầm bên mời thầu KQTT vào cơ sở OSM khác ──
# vd. "Bệnh viện Phổi Long An" ⇐ "Bệnh viện Đa khoa tỉnh Long An", "BV ĐK Bình Tân" ⇐ "BV Quận Tân Bình", "Tâm Trí Sài Gòn" (tư) ⇐ "BV ĐK Sài Gòn" (công).
# Tên phụ sai ⇒ bỏ khỏi cơ sở đó; nếu tỉnh chưa có cơ sở nào mang tên này ⇒ thêm 1 dòng "kqtt" riêng (chưa có toạ độ, app định vị theo địa chỉ).
# soát tay 09/11/2026: tên phụ gộp nhầm mà quy tắc chưa bắt được (cơ sở, tên phụ)
BAD_ALIAS = {
    ("Trung tâm Y tế khu vực Tuyên Quang", "Bệnh Viện Đa Khoa Hà Giang Tỉnh Tuyên Quang"),
}

def _fk(s):
    return re.sub(r"\s+", "", re.sub(r"\btinh\b", " ", nk(s)))

def _toks(s):
    import csyt_build as B
    return [w for w in B.toks(re.sub(r"\bthanh pho\b", " ", B.nk(s))) if w not in ("thanh", "pho")] or B.toks(s)

def alias_bad(name, al, prov):
    import csyt_build as B
    t1, sp1, _ = B.classify(name); t2, sp2, _ = B.classify(al)
    if (t1 == "dv") != (t2 == "dv"): return "đơn vị mua sắm"
    if sp1 != sp2: return "khác chuyên khoa"
    if own_of(name, prov, t1) != own_of(al, prov, t2): return "khác công / tư"
    a, b = _toks(name), _toks(al); A, Bs = set(a), set(b)
    u = lambda L: [w for i, w in enumerate(L) if w not in L[:i]]
    if u([w for w in a if w in Bs]) != u([w for w in b if w in A]): return "khác thứ tự tên"
    if (name, al) in BAD_ALIAS: return "soát tay"
    if A != Bs and not (A <= Bs or Bs <= A): return "khác tên"
    na, nb = nk(name), nk(al); ta, tb = " thanh pho " in " %s " % na, " thanh pho " in " %s " % nb
    ot = nb if ta else na
    if ta != tb and not re.search(r"\b(ha noi|ho chi minh|hai phong|da nang|can tho|hue)\b", na if ta else nb) and \
            (re.search(r"\btinh\b", ot) or not re.search(r"\b(khu vuc|huyen|thi xa|quan|trung tam y te)\b", ot)): return "thành phố ≠ tỉnh"
    for rx in (r"\b(quan y|quan dan y|quan doi|quan khu|cong an|bo quoc phong)\b", r"\b(dai hoc|truong)\b"):
        if bool(re.search(rx, na)) != bool(re.search(rx, nb)): return "quân y / đại học"
    return ""

def fix_alias(d, show=False):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import csyt_build as B
    cols = d["cols"]; ix = {c: i for i, c in enumerate(cols)}
    rows = d["rows"]; drop = 0; add = []
    byp = {}
    for r in rows: byp.setdefault(r[ix["p"]], []).append(r)
    for r in rows:
        al = [x for x in str(r[ix["alias"]] or "").split("|") if x]
        if not al: continue
        keep = []
        for x in al:
            why = alias_bad(r[ix["n"]], x, r[ix["p"]])
            if not why: keep.append(x); continue
            drop += 1
            if show: print("bỏ tên phụ |", r[ix["n"]], "⇐", x, "|", why)
            k = _fk(x)
            have = any(_fk(o[ix["n"]]) == k or any(_fk(y) == k for y in str(o[ix["alias"]] or "").split("|") if y)
                       for o in byp.get(r[ix["p"]], []) + add if o is not r)
            if not have:
                t, sp, lv = B.classify(x)
                n = [""] * len(cols)
                n[ix["id"]] = "K" + format(B.hash_s(B.nk(x)), "x"); n[ix["n"]] = x; n[ix["t"]] = t; n[ix["sp"]] = sp; n[ix["lv"]] = lv
                n[ix["p"]] = r[ix["p"]]; n[ix["o"]] = r[ix["o"]]; n[ix["src"]] = "kqtt"
                add.append(n); byp[r[ix["p"]]].append(n)
        r[ix["alias"]] = "|".join(keep)
        if keep and r[ix["src"]] == "osm+kqtt": pass
    if add:
        rows.extend(add); rows.sort(key=lambda r: (r[ix["p"]], nk(r[ix["n"]])))
        d["n"] = len(rows)
    print("csyt.js: bỏ %d tên phụ gộp nhầm, thêm %d cơ sở KQTT riêng" % (drop, len(add)), file=sys.stderr)

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
    for r in d["rows"]:
        r[ix["own"]] = own_of(r[ix["n"]], r[ix["p"]], r[ix["t"]])
    fix_alias(d, show)
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
