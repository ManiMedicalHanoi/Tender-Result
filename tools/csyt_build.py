#!/usr/bin/env python3
"""Dựng map/csyt.js — danh mục cơ sở khám chữa bệnh CÔNG LẬP (bệnh viện, trung tâm y tế, phòng khám đa khoa khu vực…)
cho Tender Map: tên, loại, tuyến, tỉnh mới (34) + tỉnh cũ (63), địa chỉ, toạ độ.

Nguồn:
  1. OpenStreetMap — bản xuất "health facilities" của HOT (raw-data-api, ODbL), tải tự động:
     https://s3.dualstack.us-east-1.amazonaws.com/production-raw-data-api/ISO3/VNM/health_facilities/{points,polygons}/…geojson.zip
  2. Bên mời thầu trong file KQTT dao toàn quốc (Excel tải từ file tender tổng, sheet "Data xử lý") — cột Buyer + Location + Province_Clean.
Tỉnh mới / cũ gán theo toạ độ bằng chính ranh giới của bản đồ (map/vn-geo.js). Bỏ trạm y tế xã / phường, phòng khám tư, nhà thuốc,
nha khoa, thẩm mỹ, chuỗi bệnh viện tư (danh sách PRIVATE). Số giường / hạng chưa có nguồn mở ⇒ để trống (cột beds / rank).

Chạy:  python3 -I tools/csyt_build.py [--kqtt <file.xlsx>] [--cache <thư mục tải OSM>]
"""
import argparse, io, json, math, os, re, sys, unicodedata, urllib.request, zipfile, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOT = "https://s3.dualstack.us-east-1.amazonaws.com/production-raw-data-api/ISO3/VNM/health_facilities/{t}/hotosm_vnm_health_facilities_{t}_geojson.zip"

NEW = [["Hà Nội",["Hà Nội"]],["Bắc Ninh",["Bắc Ninh","Bắc Giang"]],["Quảng Ninh",["Quảng Ninh"]],["Hải Phòng",["Hải Phòng","Hải Dương"]],
  ["Hưng Yên",["Hưng Yên","Thái Bình"]],["Ninh Bình",["Ninh Bình","Nam Định","Hà Nam"]],["Cao Bằng",["Cao Bằng"]],["Tuyên Quang",["Tuyên Quang","Hà Giang"]],
  ["Lào Cai",["Lào Cai","Yên Bái"]],["Thái Nguyên",["Thái Nguyên","Bắc Kạn"]],["Lạng Sơn",["Lạng Sơn"]],["Phú Thọ",["Phú Thọ","Vĩnh Phúc","Hòa Bình"]],
  ["Điện Biên",["Điện Biên"]],["Lai Châu",["Lai Châu"]],["Sơn La",["Sơn La"]],["Thanh Hóa",["Thanh Hóa"]],["Nghệ An",["Nghệ An"]],["Hà Tĩnh",["Hà Tĩnh"]],
  ["Quảng Trị",["Quảng Trị","Quảng Bình"]],["Huế",["Thừa Thiên Huế"]],["Đà Nẵng",["Đà Nẵng","Quảng Nam"]],["Quảng Ngãi",["Quảng Ngãi","Kon Tum"]],
  ["Khánh Hòa",["Khánh Hòa","Ninh Thuận"]],["Gia Lai",["Gia Lai","Bình Định"]],["Đắk Lắk",["Đắk Lắk","Phú Yên"]],["Lâm Đồng",["Lâm Đồng","Đắk Nông","Bình Thuận"]],
  ["Tây Ninh",["Tây Ninh","Long An"]],["Đồng Nai",["Đồng Nai","Bình Phước"]],["Hồ Chí Minh",["Hồ Chí Minh","Bình Dương","Bà Rịa - Vũng Tàu"]],
  ["Vĩnh Long",["Vĩnh Long","Bến Tre","Trà Vinh"]],["Đồng Tháp",["Đồng Tháp","Tiền Giang"]],["An Giang",["An Giang","Kiên Giang"]],
  ["Cần Thơ",["Cần Thơ","Hậu Giang","Sóc Trăng"]],["Cà Mau",["Cà Mau","Bạc Liêu"]]]

def nz(s):
    return nk(s).replace(" ", "")

def prov_of(*texts):
    """tên tỉnh (cũ hoặc mới, kể cả trong chuỗi địa chỉ) ⇒ (tỉnh mới, tỉnh cũ) — ưu tiên chuỗi đầu tiên nhận ra, vị trí cuối chuỗi."""
    alias = {"tphcm": "hochiminh", "hcm": "hochiminh", "thuathienhue": "thuathienhue", "hue": "thuathienhue", "brvt": "bariavungtau", "vungtau": "bariavungtau"}
    old2 = {}
    for n, olds in NEW:
        for o in olds: old2[nz(o)] = (n, o)
    for t in texts:
        k = nz(t)
        if not k: continue
        k2 = re.sub(r"^(thanhpho|tp|tinh)", "", k); k2 = alias.get(k2, k2)
        if k2 in old2: return old2[k2]
        for n, olds in NEW:
            if nz(n) == k2: return (n, olds[0] if len(olds) == 1 else "")
        best = None
        for ok, v in old2.items():
            pos = k.rfind(ok)
            if pos >= 0 and len(ok) > 3 and (best is None or pos > best[0]): best = (pos, v)
        if "hochiminh" in k and (best is None or k.rfind("hochiminh") >= best[0]): best = (k.rfind("hochiminh"), old2["hochiminh"])
        if best: return best[1]
    return ("", "")

def nk(s):
    s = unicodedata.normalize("NFD", str(s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").replace("đ", "d")
    s = re.sub(r"[^a-z0-9 ]+", " ", s).strip()
    return re.sub(r"\brang ham mat\b", "rhm", re.sub(r"\s+", " ", s))   # "Răng Hàm Mặt" ≠ "Mắt" khi đã bỏ dấu

def squash(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()

# ---------------- ranh giới (TopoJSON trong vn-geo.js) ----------------
def load_topo():
    txt = open(os.path.join(ROOT, "map", "vn-geo.js"), encoding="utf-8").read()
    topo = json.loads(txt[txt.index("{"):txt.rstrip().rstrip(";").rindex("}") + 1])
    sc, tr = topo["transform"]["scale"], topo["transform"]["translate"]
    arcs = []
    for a in topo["arcs"]:
        x = y = 0; pts = []
        for p in a:
            x += p[0]; y += p[1]; pts.append((x * sc[0] + tr[0], y * sc[1] + tr[1]))
        arcs.append(pts)
    def arc(i): return arcs[i] if i >= 0 else arcs[~i][::-1]
    def ring(ids):
        pts = []
        for k, i in enumerate(ids):
            a = arc(i); pts += a[1:] if k else a
        return pts
    out = {}
    for layer in ("new", "old"):
        L = []
        for g in topo["objects"][layer]["geometries"]:
            polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"] if g["type"] == "MultiPolygon" else []
            rings = [[ring(r) for r in p] for p in polys]
            bb = [min(x for p in rings for r in p for x, _ in r), min(y for p in rings for r in p for _, y in r),
                  max(x for p in rings for r in p for x, _ in r), max(y for p in rings for r in p for _, y in r)]
            L.append((g["properties"], rings, bb))
        out[layer] = L
    return out

def inside(pt, ring):
    x, y = pt; c = False; n = len(ring); j = n - 1
    for i in range(n):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi: c = not c
        j = i
    return c

def locate(topo, lon, lat, layer):
    best = None
    for props, polys, bb in topo[layer]:
        if not (bb[0] - .01 <= lon <= bb[2] + .01 and bb[1] - .01 <= lat <= bb[3] + .01): continue
        for p in polys:
            if inside((lon, lat), p[0]) and not any(inside((lon, lat), h) for h in p[1:]): return props
    # gần bờ / đảo nhỏ: tỉnh có tâm khung gần nhất trong 0,15°
    for props, polys, bb in topo[layer]:
        d = max(bb[0] - lon, 0, lon - bb[2]) + max(bb[1] - lat, 0, lat - bb[3])
        if d < .15 and (best is None or d < best[0]): best = (d, props)
    return best[1] if best else None

# ---------------- phân loại ----------------
PRIVATE = r"(quoc te|international|vinmec|hong ngoc|tam anh|hoan my|thu cuc|medlatec|\bfv\b|columbia|family medical|hanh phuc|van hanh|viet phap|" \
          r"phuong dong|an viet|thien hanh|hoan hao|my duc|gia an 115|xuyen a|sai gon ito|hitec|dnd|viet nga|ha noi 2|tu nhan|tu thuc|cong ty|co phan|" \
          r"\bjsc\b|\bltd\b|nha khoa|tham my|spa\b|beauty|eye wear|nha thuoc|duoc pham|medic\b|medical center|clinic|phong kham(?! da khoa khu vuc)|" \
          r"phong mach|bac si|\bbs\b|nha ho sinh|diem y te|phong y te|tram xa|tram y te|truong mam non|thu y)"
FACILITY = r"(benh vien|trung tam y te|\bttyt\b|\bbv\b|\bbvdk\b|phong kham da khoa khu vuc|benh xa|vien mat|trung tam mat|vien .*(bong|huyet hoc|lao|tim|nhi|ung buou|y hoc)|" \
           r"trung tam (mat|ung buou|tim mach|phau thuat|cap cuu|kiem soat benh tat|chan doan)|so y te|ban quan ly du an|trung tam mua sam)"
SPEC = [("mat", r"\bmat\b|nhan khoa|mat tw|vien mat"), ("sannhi", r"san nhi|phu san|\bsan\b"), ("nhi", r"\bnhi\b"), ("ub", r"ung buou|\bk\b"),
        ("phoi", r"\bphoi\b|\blao\b"), ("tt", r"tam than"), ("yhct", r"y hoc co truyen|y duoc co truyen|yhct"), ("phcn", r"phuc hoi chuc nang|dieu duong"),
        ("dl", r"da lieu"), ("nt", r"noi tiet"), ("tmh", r"tai mui hong"), ("rhm", r"\brhm\b"), ("tim", r"tim mach|\btim\b"), ("ctch", r"chan thuong|chinh hinh"),
        ("nd", r"nhiet doi|benh nhiet doi"), ("lk", r"lao khoa"), ("th", r"truyen mau|huyet hoc")]
SPEC_NAME = {"mat": "Mắt", "sannhi": "Sản – Nhi", "nhi": "Nhi", "ub": "Ung bướu", "phoi": "Phổi / Lao", "tt": "Tâm thần", "yhct": "Y học cổ truyền",
             "phcn": "Phục hồi chức năng", "dl": "Da liễu", "nt": "Nội tiết", "tmh": "Tai Mũi Họng", "rhm": "Răng Hàm Mặt", "tim": "Tim mạch",
             "ctch": "Chấn thương chỉnh hình", "nd": "Bệnh nhiệt đới", "lk": "Lão khoa", "th": "Huyết học – Truyền máu"}
CENTRAL = r"(trung uong|\btw\b|bach mai|cho ray|viet duc|huu nghi viet duc|^benh vien thong nhat$|benh vien e\b|benh vien k\b|108|175|quan y|quan doi|cong an|bo y te|" \
          r"dai hoc y|truong dai hoc|hoc vien quan y|trung uong hue|thanh nhan|xanh pon|saint paul)"

def classify(name):
    k = nk(name)
    t = "khac"
    if re.search(r"trung tam y te|\bttyt\b", k): t = "ttyt"
    elif re.search(r"phong kham da khoa khu vuc", k): t = "pkkv"
    elif re.search(r"so y te|ban quan ly|trung tam mua sam|trung tam kiem soat", k): t = "dv"
    elif re.search(r"benh vien|\bbv|benh xa|vien mat|trung tam mat", k): t = "bv"
    sp = ""
    for code, rx in SPEC:
        if re.search(rx, k): sp = code; break
    if t == "bv" and re.search(r"da khoa", k): sp = sp if sp in ("mat",) else ""
    lv = ""
    if re.search(r"quan y|quan doi|quan dan y|cong an|benh xa|giao thong van tai|buu dien|nong nghiep|than khoang san|vinacomin|cao su|dau khi|dien luc|\b19 8\b", k): lv = "Ngành"
    elif re.search(CENTRAL, k): lv = "Trung ương"
    elif t == "ttyt" or re.search(r"khu vuc|huyen|thi xa|\bquan\b", k): lv = "Khu vực"
    elif t in ("bv", "khac", "dv"): lv = "Tỉnh"
    return t, sp, lv

def is_private(name):
    return bool(re.search(PRIVATE, nk(name)))

def tidy(name):
    n = squash(name).strip(" -–,.;")
    if n.isupper() and len(n) > 6:   # TÊN VIẾT HOA ⇒ Viết Hoa Đầu Từ
        n = " ".join(w if w in ("TW", "TTYT", "BV", "ĐK", "BVĐK", "II", "III", "IV") else w.capitalize() for w in n.split(" "))
    n = re.sub(r"^b[eê]nh vi[eệ]n\b", "Bệnh viện", n, flags=re.I)
    n = re.sub(r"^trung t[aâ]m y t[eế]\b", "Trung tâm Y tế", n, flags=re.I)
    n = re.sub(r"\bBênh\b", "Bệnh", n)
    return n

STOP = {"benh", "vien", "trung", "tam", "y", "te", "da", "khoa", "tinh", "thanh", "pho", "tp", "huyen", "thi", "xa", "quan", "khu", "vuc", "so",
        "bv", "ttyt", "bvdk", "dk", "co", "cua", "va"}
def toks(name):
    k = nk(name).replace("bvdk", "bv dk")
    return [w for w in k.split() if w not in STOP]

def same(a, b):
    ta, tb = set(toks(a)), set(toks(b))
    if not ta or not tb: return False
    if ta == tb: return True
    inter = len(ta & tb); small = min(len(ta), len(tb))
    return inter >= 2 and inter == small and abs(len(ta) - len(tb)) <= 2 and (("mat" in ta) == ("mat" in tb))

def hav(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))

def centroid(geom):
    pts = []
    def walk(c):
        if isinstance(c[0], (int, float)): pts.append(c)
        else:
            for x in c: walk(x)
    walk(geom["coordinates"])
    return (sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts))

def load_osm(cache):
    feats = []
    for t in ("points", "polygons"):
        fn = os.path.join(cache, "hf_%s.zip" % t)
        if not os.path.exists(fn):
            print("Tải OSM", t, "…", file=sys.stderr)
            urllib.request.urlretrieve(HOT.format(t=t), fn)
        z = zipfile.ZipFile(fn)
        name = [n for n in z.namelist() if n.endswith(".geojson")][0]
        g = json.load(io.TextIOWrapper(z.open(name), encoding="utf-8"))
        for f in g["features"]:
            f["_t"] = t
            feats.append(f)
    return feats

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kqtt", help="file Excel KQTT (sheet 'Data xử lý')")
    ap.add_argument("--cache", default=os.path.join(ROOT, "tools", ".cache"))
    ap.add_argument("--out", default=os.path.join(ROOT, "map", "csyt.js"))
    a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True)
    topo = load_topo()
    rows = []
    # 1) OSM
    seen_drop = {"private": 0, "tram": 0, "noname": 0, "other": 0}
    for f in load_osm(a.cache):
        p = f["properties"]; name = p.get("name:vi") or p.get("name") or ""
        if not name: seen_drop["noname"] += 1; continue
        am, hc = p.get("amenity") or "", p.get("healthcare") or ""
        if am in ("pharmacy", "dentist", "veterinary") or hc in ("pharmacy", "dentist"): seen_drop["other"] += 1; continue
        k = nk(name)
        if re.search(r"tram y te|tram xa|diem y te", k): seen_drop["tram"] += 1; continue
        if not re.search(FACILITY, k): seen_drop["other"] += 1; continue
        if is_private(name) or (p.get("operator:type") or "") in ("private", "business"): seen_drop["private"] += 1; continue
        lat, lon = centroid(f["geometry"])
        if not (7 <= lat <= 24 and 102 <= lon <= 118): continue
        addr = squash(p.get("addr:full") or "")
        if not addr and p.get("addr:city"): addr = squash(p.get("addr:city"))
        rows.append({"id": "O" + ("w" if f["_t"] == "polygons" else "n") + str(p.get("osm_id")), "n": tidy(name), "a": addr,
                     "ll": [round(lat, 5), round(lon, 5)], "src": "osm", "poly": f["_t"] == "polygons"})
    # gộp trùng OSM (điểm + vùng cùng bệnh viện)
    rows.sort(key=lambda r: (not r["poly"], r["n"]))
    keep = []
    for r in rows:
        dup = next((x for x in keep if hav(x["ll"], r["ll"]) < 1.2 and same(x["n"], r["n"])), None)
        if dup:
            if not dup["a"] and r["a"]: dup["a"] = r["a"]
            continue
        keep.append(r)
    rows = keep
    for r in rows:
        pn = locate(topo, r["ll"][1], r["ll"][0], "new"); po = locate(topo, r["ll"][1], r["ll"][0], "old")
        r["p"] = pn["n"] if pn else ""
        r["o"] = next((o for n, olds in NEW for o in olds if po and nz(o) == nz(po["o"])), "") if po else ""
    rows = [r for r in rows if r["p"]]
    # 2) bên mời thầu KQTT
    kq = 0
    if a.kqtt:
        import openpyxl
        wb = openpyxl.load_workbook(a.kqtt, read_only=True, data_only=True)
        ws = wb["Data xử lý"]
        it = ws.iter_rows(values_only=True); next(it); H = [nk(h) for h in next(it)]
        ci = lambda *names: next((i for n in names for i, h in enumerate(H) if h.startswith(n)), -1)
        cB, cL, cP = ci("buyer"), ci("location"), ci("province clean", "province_clean")
        buyers = {}
        for r in it:
            if not r or cB < 0 or not r[cB]: continue
            b = tidy(r[cB]); key = nk(b)
            if key not in buyers: buyers[key] = {"n": b, "a": squash(r[cL]) if cL >= 0 and r[cL] else "", "pc": squash(r[cP]) if cP >= 0 and r[cP] else ""}
        newnames = {nk(n): n for n in [g[0]["n"] for g in topo["new"]]}
        oldmap = {nk(g[0]["o"]): g[0]["n"] for g in topo["old"]}
        for key, b in buyers.items():
            prov, oldp = prov_of(b["pc"], b["a"])
            m = next((x for x in rows if x["p"] == prov and same(x["n"], b["n"])), None) if prov else None
            if m:
                m["src"] = "osm+kqtt"; m.setdefault("alias", [])
                if nk(m["n"]) != key: m["alias"].append(b["n"])
                if not m["a"] and b["a"]: m["a"] = b["a"]
                continue
            kq += 1
            rows.append({"id": "K" + format(hash_s(key), "x"), "n": b["n"], "a": b["a"], "ll": None, "src": "kqtt", "p": prov, "o": oldp})
    # 3) danh sách hạt giống tools/csyt_seed.csv (bệnh viện lớn mà OSM chưa có) — chỉ thêm khi chưa có
    import csv
    seeds = 0
    for r in csv.DictReader(open(os.path.join(ROOT, "tools", "csyt_seed.csv"), encoding="utf-8")):
        prov, oldp = prov_of(r["province"], r["address"])
        if any(x["p"] == prov and same(x["n"], r["name"]) for x in rows): continue
        seeds += 1
        rows.append({"id": "S" + format(hash_s(nk(r["name"])), "x"), "n": r["name"], "a": r["address"], "ll": None, "src": "seed", "p": prov, "o": oldp})
    print("Hạt giống thêm", seeds, file=sys.stderr)
    # 4) phân loại + xuất
    out = []
    for r in sorted(rows, key=lambda r: (r["p"], nk(r["n"]))):
        t, sp, lv = classify(r["n"])
        out.append([r["id"], r["n"], t, sp, lv, r["p"], r["o"], r["a"], r["ll"][0] if r["ll"] else "", r["ll"][1] if r["ll"] else "",
                    "", "", r["src"], "|".join(r.get("alias", []))])
    cols = ["id", "n", "t", "sp", "lv", "p", "o", "a", "lat", "lng", "beds", "rank", "src", "alias"]
    meta = {"v": datetime.date.today().isoformat(), "n": len(out), "cols": cols, "spec": SPEC_NAME,
            "types": {"bv": "Bệnh viện", "ttyt": "Trung tâm Y tế", "pkkv": "Phòng khám ĐK khu vực", "dv": "Đơn vị mua sắm", "khac": "Cơ sở khác"},
            "src": "OpenStreetMap (HOT export, ODbL) + bên mời thầu file KQTT dao toàn quốc"}
    js = ("/* Danh mục cơ sở khám chữa bệnh công lập — dựng bằng tools/csyt_build.py (" + meta["v"] + "). Nguồn: " + meta["src"] +
          ". Toạ độ theo OSM; số giường / hạng chưa có nguồn mở (để trống). Không sửa tay — sửa tool rồi dựng lại. */\n" +
          "window.CSYT=" + json.dumps(dict(meta, rows=out), ensure_ascii=False, separators=(",", ":")) + ";\n")
    open(a.out, "w", encoding="utf-8").write(js)
    by = {}
    for o in out: by[o[2]] = by.get(o[2], 0) + 1
    print("Đã ghi", a.out, len(out), "cơ sở · theo loại", by, "· từ KQTT riêng", kq, "· bỏ", seen_drop, "· %.0f KB" % (len(js.encode()) / 1024), file=sys.stderr)

def hash_s(s):
    h = 2166136261
    for ch in s.encode("utf-8"): h = ((h ^ ch) * 16777619) & 0xFFFFFFFF
    return h

if __name__ == "__main__":
    main()
