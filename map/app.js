/* Tender Map — mã trang (tách từ index.html 04/11/2026). Đọc dữ liệu (winMap / kqttMap / fuList), bản đồ SVG, bảng bên, Theo dõi thầu, xuất. Xem DESIGN.md. */
(function(){
"use strict";
/* ═════════ CẤU HÌNH ═════════ */
var NPP = {
  HUNGVI:{ name:"Hùng Vĩ", area:"Miền Bắc", color:"#3A5CAA",
    url:"https://script.google.com/macros/s/AKfycbyL5FRVXl0Zr35ndE1PGJMGXzHOYzHjdsyQK7vHwIYhqe5owjSg3o1QtH-i8qGNBKJ-/exec" },
  ICARE: { name:"iCare",   area:"Miền Nam", color:"#0E8C7E",
    url:"https://script.google.com/macros/s/AKfycbx8xuGaBOVgLxb8JtaH25t1pcisacigDecTMLKOVaBucuDWZ7hw2W_W4IngA1nSODg4/exec" },
  /* KQTT dao toàn quốc (mọi hãng) — file tender tổng "Data xử lý", đọc qua web app Hùng Vĩ ?action=kqttMap (MMH_KqttMap.gs) */
  KQTT:  { name:"KQTT thị trường", area:"Toàn quốc", color:"#B4532A",
    url:"https://script.google.com/macros/s/AKfycbyL5FRVXl0Zr35ndE1PGJMGXzHOYzHjdsyQK7vHwIYhqe5owjSg3o1QtH-i8qGNBKJ-/exec" }
};
var SRCS = ["HUNGVI","ICARE","KQTT"], NPPS = ["HUNGVI","ICARE"];
var BOTH = "#6A57A8";                                   // tỉnh có cả 2 NPP
/* Theo dõi thầu: ghi sheet ẩn "FOLLOW UP TENDER" của backend CRM Surgical VN (MMH_TenderFU.gs) · đăng nhập email qua Training Hub */
var CRM_SURG = "https://script.google.com/macros/s/AKfycbxxckrqwkfhE0fszm1XVdpYyEHU_PCKQWMKE_2wBnMTgoJCZ-1nRZ_fhOCPXXsVfEE/exec";
var TRAINING_HUB = "https://script.google.com/macros/s/AKfycbwsX4cQEoH4LNlmcNfe8qWIM9K6EiDEXy7PjhP9bHY2citL6xHn5L1unsAlQJHyL9EP/exec";
var FY_MIN = 64;                  // KQTT có từ 01/2023 (FY64)
var FY_FROM = 67;                 // FY67 = 09/2025 – 08/2026 (mặc định "Từ FY67"; "Mọi năm" = từ FY64)
var SOON_MONTHS = 6;              // "sắp hết hạn" = còn ≤ 6 tháng
var LS_KEY = "mmh_winmap_v1";
/* Bộ nhớ đệm dữ liệu lớn (thầu 2 NPP + KQTT, hoạt động CRM) để ở IndexedDB, KHÔNG ở localStorage: localStorage chỉ ~5 MB và DÙNG CHUNG với
   Report Hub / CRM trên cùng tên miền (hàng đợi ghi khi mất mạng của CRM nằm ở đó) — dữ liệu KQTT toàn quốc lớn có thể làm đầy, CRM không lưu được. */
var IDB=(function(){
  var dbp=null;
  function db(){ if(!dbp) dbp=new Promise(function(res,rej){ try{ var r=indexedDB.open("tender_map",1); r.onupgradeneeded=function(){ r.result.createObjectStore("kv"); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }); return dbp; }
  function get(k){ return db().then(function(d){ return new Promise(function(res){ try{ var q=d.transaction("kv").objectStore("kv").get(k); q.onsuccess=function(){ res(q.result||null); }; q.onerror=function(){ res(null); }; }catch(_){ res(null); } }); }).catch(function(){ return null; }); }
  function set(k,v){ return db().then(function(d){ return new Promise(function(res){ try{ var t=d.transaction("kv","readwrite"); t.objectStore("kv").put(v,k); t.oncomplete=function(){ res(true); }; t.onerror=function(){ res(false); }; }catch(_){ res(false); } }); }).catch(function(){ return false; }); }
  return { get:get, set:set };
})();
var NETDONE=false, CACHE_NPP=IDB.get(LS_KEY), CACHE_ACT=IDB.get("act");   /* đọc bộ nhớ đệm ngay từ đầu, song song với dựng bản đồ */

/* 34 tỉnh / thành (NQ 202/2025/QH15, hiệu lực 01/07/2025) ⇐ tỉnh cũ */
var NEW = [
 ["Hà Nội","B",["Hà Nội"]],["Bắc Ninh","B",["Bắc Ninh","Bắc Giang"]],["Quảng Ninh","B",["Quảng Ninh"]],
 ["Hải Phòng","B",["Hải Phòng","Hải Dương"]],["Hưng Yên","B",["Hưng Yên","Thái Bình"]],["Ninh Bình","B",["Ninh Bình","Nam Định","Hà Nam"]],
 ["Cao Bằng","B",["Cao Bằng"]],["Tuyên Quang","B",["Tuyên Quang","Hà Giang"]],["Lào Cai","B",["Lào Cai","Yên Bái"]],
 ["Thái Nguyên","B",["Thái Nguyên","Bắc Kạn"]],["Lạng Sơn","B",["Lạng Sơn"]],["Phú Thọ","B",["Phú Thọ","Vĩnh Phúc","Hòa Bình"]],
 ["Điện Biên","B",["Điện Biên"]],["Lai Châu","B",["Lai Châu"]],["Sơn La","B",["Sơn La"]],
 ["Thanh Hóa","T",["Thanh Hóa"]],["Nghệ An","T",["Nghệ An"]],["Hà Tĩnh","T",["Hà Tĩnh"]],["Quảng Trị","T",["Quảng Trị","Quảng Bình"]],
 ["Huế","T",["Thừa Thiên Huế"]],["Đà Nẵng","T",["Đà Nẵng","Quảng Nam"]],["Quảng Ngãi","T",["Quảng Ngãi","Kon Tum"]],
 ["Khánh Hòa","T",["Khánh Hòa","Ninh Thuận"]],["Gia Lai","T",["Gia Lai","Bình Định"]],["Đắk Lắk","T",["Đắk Lắk","Phú Yên"]],
 ["Lâm Đồng","T",["Lâm Đồng","Đắk Nông","Bình Thuận"]],
 ["Tây Ninh","N",["Tây Ninh","Long An"]],["Đồng Nai","N",["Đồng Nai","Bình Phước"]],["Hồ Chí Minh","N",["Hồ Chí Minh","Bình Dương","Bà Rịa - Vũng Tàu"]],
 ["Vĩnh Long","N",["Vĩnh Long","Bến Tre","Trà Vinh"]],["Đồng Tháp","N",["Đồng Tháp","Tiền Giang"]],["An Giang","N",["An Giang","Kiên Giang"]],
 ["Cần Thơ","N",["Cần Thơ","Hậu Giang","Sóc Trăng"]],["Cà Mau","N",["Cà Mau","Bạc Liêu"]]
];
var REGION = { B:"Miền Bắc", T:"Miền Trung", N:"Miền Nam" };
var ALIAS = { "tphcm":"hochiminh","hcm":"hochiminh","saigon":"hochiminh","thuathien":"thuathienhue","hue":"thuathienhue",
  "brvt":"bariavungtau","vungtau":"bariavungtau","daklak":"daklak","daknong":"daknong","hoabinh":"hoabinh" };

/* ═════════ TIỆN ÍCH ═════════ */
function nk(s){
  s = String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]/g,"");
  s = s.replace(/^(thanhpho|tp|tinh)/,"");
  s = s.replace(/^dac/,"dak").replace(/^dak(lak|nong)$/,"dak$1");
  return ALIAS[s] || s;
}
/* tên cơ sở y tế: bỏ dấu, mở viết tắt (BV, BVĐK, TTYT, ĐK, TW) ⇒ khoá gộp; tok() = từ có nghĩa để so khớp gần đúng */
function nw(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]+/g," ").trim()
  .replace(/\brang ham mat\b/g,"rhm").replace(/\bbvdk\b/g,"benh vien da khoa").replace(/\bbvd?\b/g,"benh vien").replace(/\bttyt\b/g,"trung tam y te")
  .replace(/\bdk\b/g,"da khoa").replace(/\btw\b/g,"trung uong").replace(/\btp\b/g,"thanh pho").replace(/\bhcm\b/g,"ho chi minh").replace(/\bpk\b/g,"phong kham"); }
function hkey(s){ return nw(s).replace(/\b(tinh|thanh pho)\b/g," ").replace(/\s+/g,""); }
/* khoá chặt hơn để ghép khách CRM ⇄ danh mục: giữ "thành phố" (BV ĐK thành phố Hà Tĩnh ≠ BV ĐK tỉnh Hà Tĩnh) */
function fkey(s){ return nw(s).replace(/\btinh\b/g," ").replace(/\s+/g,""); }
var STOPW = {benh:1,vien:1,trung:1,tam:1,y:1,te:1,da:1,khoa:1,tinh:1,huyen:1,thi:1,xa:1,quan:1,khu:1,vuc:1,so:1,co:1,cua:1,va:1};
var SPECW = /^(mat|san|nhi|ung|buou|phoi|lao|than|tiet|lieu|rhm|mui|hong|tim|mach|chan|thuong|truyen|phuc|nhiet|cong|huyet|dieu|duong|uong|\d+)$/;
/* "thành phố" bỏ cả cụm (không bỏ riêng chữ "thanh": Mắt Thanh Bình ≠ Mắt Ninh Bình) */
function tok(s){ return nw(s).replace(/\bthanh pho\b/g," ").split(" ").filter(function(w){ return w && !STOPW[w]; }); }
function kindOf(s){ var k=nw(s); return /trung tam y te/.test(k)?"tt":/benh vien|benh xa/.test(k)?"bv":"x"; }
var NAMEF=[/\b(quan y|quan dan y|quan doi|quan khu|cong an|bo quoc phong)\b/, /\b(dai hoc|truong)\b/];
function sameName(a,b){
  if(kindOf(a)!==kindOf(b)) return false;
  var A={}, B={}, ia=0, ib=0, inter=0, diff=[];
  tok(a).forEach(function(w){ if(!A[w]){ A[w]=1; ia++; } }); tok(b).forEach(function(w){ if(!B[w]){ B[w]=1; ib++; } });
  if(!ia||!ib) return false;
  var na=nw(a), nb=nw(b), ta=/\bthanh pho\b/.test(na), tb=/\bthanh pho\b/.test(nb);
  if(ta!==tb && !/\b(ha noi|ho chi minh|hai phong|da nang|can tho|hue)\b/.test(ta?na:nb) && (/\btinh\b/.test(ta?nb:na) || !/\b(khu vuc|huyen|thi xa|quan|trung tam y te)\b/.test(ta?nb:na))) return false;   // "BV thành phố X" ≠ "BV (tỉnh) X" (trừ 6 TP trực thuộc TW; TTYT / khu vực đổi tên lên thành phố vẫn khớp)
  if(NAMEF.some(function(rx){ return rx.test(na)!==rx.test(nb); })) return false;    // quân y / công an, bệnh viện đại học ≠ bệnh viện thường
  var oa=tok(a).filter(function(w){ return B[w]; }), ob=tok(b).filter(function(w){ return A[w]; });
  if(oa.filter(function(w,i){ return oa.indexOf(w)===i; }).join(" ")!==ob.filter(function(w,i){ return ob.indexOf(w)===i; }).join(" ")) return false;   // Tân Bình ≠ Bình Tân
  Object.keys(A).forEach(function(w){ if(B[w]) inter++; else diff.push(w); }); Object.keys(B).forEach(function(w){ if(!A[w]) diff.push(w); });
  if(!diff.length) return true;
  if(diff.some(function(w){ return SPECW.test(w); })) return false;   // khác chuyên khoa / số hiệu ⇒ khác cơ sở
  return inter>=2 && inter===Math.min(ia,ib) && Math.abs(ia-ib)<=2;
}
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
/* đơn vị tiền (người dùng 11/11/2026): VND ⇄ USD, tỷ giá CỐ ĐỊNH 1 USD = 26.400 VND — nút ở thanh trên, nhớ lựa chọn (localStorage tm_cur) */
var USD_RATE=26400, CUR="vnd"; try{ CUR=localStorage.getItem("tm_cur")==="usd"?"usd":"vnd"; }catch(_){}
function usd(v){ var u=(+v||0)/USD_RATE, a=Math.abs(u);
  if(a>=1e6) return "$"+(u/1e6).toFixed(a>=1e7?1:2).replace(/\.?0+$/,"")+"M";
  if(a>=1e4) return "$"+(u/1e3).toFixed(a>=1e5?0:1).replace(/\.0$/,"")+"K";
  if(a>=100) return "$"+Math.round(u).toLocaleString("en-US");
  return "$"+u.toFixed(2); }
function prc(v){ return CUR==="usd" ? usd(v) : nfmt(Math.round(+v||0))+" đ"; }     /* đơn giá có đơn vị */
function prn(v){ return CUR==="usd" ? usd(v) : nfmt(Math.round(+v||0)); }          /* đơn giá trong bảng (tiêu đề cột ghi đơn vị) */
function curU(){ return CUR==="usd" ? "USD" : "đ"; }
function vnd(v){ if(CUR==="usd") return usd(v); v=+v||0; if(v>=1e9) return (v/1e9).toFixed(v>=1e10?1:2).replace(".",",").replace(/,?0+$/,"")+" tỷ"; if(v>=1e6) return Math.round(v/1e6).toLocaleString("vi-VN")+" tr"; return Math.round(v).toLocaleString("vi-VN")+" đ"; }
function nfmt(v){ return (+v||0).toLocaleString("vi-VN"); }
function d2(iso){ if(!iso) return "—"; var p=iso.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
function monKey(iso){ return iso ? (+iso.slice(0,4))*100 + (+iso.slice(5,7)) : 0; }
function fyOf(k){ if(!k) return 0; var y=Math.floor(k/100), m=k%100; return (m>=9 ? y+1 : y) - 1959; }   // 2025-09 → 67
function qOf(k){ var m=k%100; return Math.floor(((m+3)%12)/3)+1; }                                       // T9–11 = Q1
function addMonths(iso,n){ var d=new Date(iso+"T00:00:00"); var day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n); var last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(day,last)); d.setDate(d.getDate()-1); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function today(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function monthsBetween(a,b){ var A=new Date(a+"T00:00:00"),B=new Date(b+"T00:00:00"); return (B-A)/(30.44*864e5); }
var NOW = today(), NOWK = monKey(NOW), FY_NOW = fyOf(NOWK);
var HOVER = matchMedia("(hover: hover) and (pointer: fine)").matches;
var MQ = matchMedia("(max-width:820px)");    // điện thoại: thanh trên gọn + bảng chi tiết trượt từ dưới lên (giống CSS)
function addrFmt(s){ return String(s||"").replace(/\s*,\s*/g,", ").replace(/\s{2,}/g," ").replace(/^,\s*|,\s*$/g,"").trim(); }

/* tỉnh cũ / mới ⇒ chỉ số */
var OLD2NEW = {}, NEWIDX = {};
NEW.forEach(function(p,i){ NEWIDX[nk(p[0])]=i; p[2].forEach(function(o){ OLD2NEW[nk(o)]=i; }); });
NEWIDX[nk("Thừa Thiên Huế")] = NEWIDX[nk("Huế")];
function provOf(city, addr){
  var r=provOf0(city, addr);
  if(r && r.n===DNI && r.o!=="quangnam" && QNAM_RE.test(nw(addr))) r.o="quangnam";
  return r;
}
function provOf0(city, addr){
  var c=nk(city), i;
  if(c in OLD2NEW) return {n:OLD2NEW[c], o:c};
  if(c in NEWIDX){ i=NEWIDX[c]; return {n:i, o:oldIn(i, addr) || nk(NEW[i][2][0])}; }
  // không nhận ra ⇒ dò trong địa chỉ (tên tỉnh thường ở cuối)
  var a=nk(addr), best=null, pos=-1;
  Object.keys(OLD2NEW).forEach(function(k){ var p=a.lastIndexOf(k); if(p>pos && k.length>3){ pos=p; best=k; } });
  if(best) return {n:OLD2NEW[best], o:best};
  return null;
}
function oldIn(i, addr){
  var a=nk(addr), best=null, pos=-1;
  NEW[i][2].forEach(function(o){ var k=nk(o), p=a.lastIndexOf(k); if(p>pos){ pos=p; best=k; } });
  return best;
}

/* ═════════ DỮ LIỆU ═════════ */
var RAW = { HUNGVI:null, ICARE:null, KQTT:null }, META = { HUNGVI:null, ICARE:null, KQTT:null }, PKGS = [], UNMAPPED = [], HOSP = [], HK = {};

/* nhóm sản phẩm: dao theo tiền tố mã, chỉ khâu theo bảng mã catalogue MANI (products.js) */
var GR = [
  {k:"slit", top:"dao", name:"Dao Slit",       sub:"MSL", c:"#0EA5E9", u:"cái"},
  {k:"stab", top:"dao", name:"Dao Stab",       sub:"MST", c:"#6366F1", u:"cái"},
  {k:"cres", top:"dao", name:"Dao Crescent",   sub:"MCU", c:"#A855F7", u:"cái"},
  {k:"dao_o",top:"dao", name:"Dao khác",       sub:"",    c:"#06B6D4", u:"cái"},
  {k:"nylon",top:"chi", name:"Chỉ Nylon",      sub:"",    c:"#F59E0B", u:"sợi"},
  {k:"pp",   top:"chi", name:"Chỉ Polypropylene",sub:"",  c:"#10B981", u:"sợi"},
  {k:"pga",  top:"chi", name:"Chỉ PGA tự tiêu",sub:"",    c:"#EC4899", u:"sợi"},
  {k:"silk", top:"chi", name:"Chỉ Silk",       sub:"",    c:"#F97316", u:"sợi"},
  {k:"poly", top:"chi", name:"Chỉ Polyester",  sub:"",    c:"#84CC16", u:"sợi"},
  {k:"chi_o",top:"chi", name:"Chỉ khác",       sub:"",    c:"#CA8A04", u:"sợi"},
  {k:"other",top:"khac",name:"Sản phẩm khác",  sub:"",    c:"#94A3B8", u:""}
];
var GK={}; GR.forEach(function(g){ GK[g.k]=g; });
var TOPS={dao:{name:"Dao nhãn khoa",u:"cái"},chi:{name:"Chỉ khâu nhãn khoa",u:"sợi"},khac:{name:"Khác",u:""}};
function sutOf(code){ var m=String(code||"").toUpperCase().match(/^(\d{3,5}[A-Z]?)/); if(!m||!window.MANI_SUT) return null; return window.MANI_SUT[m[1]]||window.MANI_SUT[m[1].replace(/[A-Z]$/,"")]||null; }
function grpOf(code){
  var s=String(code||"").trim().toUpperCase();
  if(/^M[A-Z]/.test(s)){ if(/^MSL/.test(s)) return "slit"; if(/^MST/.test(s)) return "stab"; if(/^MCU/.test(s)) return "cres"; return "dao_o"; }
  if(/^\d/.test(s)){ var e=sutOf(s); return e ? ({N:"nylon",P:"pp",G:"pga",S:"silk",E:"poly"}[e[0]]||"chi_o") : "chi_o"; }
  return "other";
}
function catOf(code){ return GK[grpOf(code)].top; }
function knifeOf(code){
  var s=String(code||"").toUpperCase(), t=[];
  if(/MSL/.test(s)) t.push("Slit"); if(/MST/.test(s)) t.push("Stab"); if(/MCU/.test(s)) t.push("Crescent"); if(/MVR/.test(s)) t.push("MVR");
  return t.join(" · ");
}
/* hàng của action=winMap (đủ dao + chỉ) hoặc feed mặc định (chỉ dao) ⇒ dạng chung */
function normRow(r, npp){
  if(r.approveISO !== undefined || r.pcodeRaw !== undefined){
    return { npp:npp, tbmt:r.tbmtRaw||r.tbmt||"", hospital:r.hospital, city:r.city, address:"", tender:"", project:"",
      approve:r.approveISO||"", month:+r.month||0, signed:"", dur:+r.durationMonths||12, pcode:r.pcodeRaw||"",
      qty:+r.qty||0, price:+r.price||0, unit:"Cái", result:r.result||"", wonQty:+r.qty||0, wonPrice:+r.price||0, total:0,
      bidOpen:r.effISO||"", bidClose:"", note:"", link:"", row:r.row };
  }
  var o={}; for(var k in r) o[k]=r[k]; o.npp=npp; return o;
}
function tbNorm(t){ return String(t||"").replace(/\s+/g,"").toUpperCase().replace(/-\d{1,2}$/,""); }
var MANI_RE=/^M(SL|ST|SS|SP|VR|PK|CU|CD|CS|CB|RS|GL|LR|DP)\d/i;
function isMani(it){ return /mani/i.test((it.mfr||"")+" "+(it.brand||"")) || MANI_RE.test(String(it.code||"")); }
/* hàng KQTT (cols + rows mảng) ⇒ đối tượng */
function kqRows(){
  var d=RAW.KQTT; if(!d || !Array.isArray(d.cols) || !Array.isArray(d.rows)) return [];
  var C={}; d.cols.forEach(function(c,i){ C[c]=i; });
  return d.rows.map(function(r){ var o={}; for(var k in C) o[k]=r[C[k]]; return o; });
}
function kqGrp(type, code){
  if(/^M(SL|ST|CU)/i.test(String(code||""))) return grpOf(code);
  var s=String(type||"").toLowerCase();
  return /slit/.test(s)?"slit" : /stab|straight/.test(s)?"stab" : /cres/.test(s)?"cres" : "dao_o";
}
var KQ_SKIP=0, HBYP={};
function buildPackages(){
  PKGS=[]; UNMAPPED=[]; HOSP=[]; HK={}; HBYP={};
  var map={}, nppTb={};
  NPPS.forEach(function(n){
    (RAW[n]||[]).forEach(function(r0){
      var r=normRow(r0,n);
      var tb=String(r.tbmt||"").replace(/\s+/g,"").replace(/-\d{1,2}$/,"");
      if(tb) nppTb[tbNorm(tb)]=1;
      var key=n+"|"+(tb||"H:"+nk(r.hospital))+"|"+nk(r.hospital);
      var p=map[key];
      if(!p){
        p=map[key]={ key:key, npp:n, tbmt:tb, tbmtRaw:[], hospital:r.hospital||"(chưa ghi bệnh viện)", city:r.city, address:r.address||"",
          tender:r.tender||"", project:r.project||"", approve:"", month:0, signed:r.signed||"", dur:0, bidOpen:r.bidOpen||"",
          items:[], results:{}, link:r.link||"", note:"" };
        PKGS.push(p);
      }
      if(r.tbmt && p.tbmtRaw.indexOf(r.tbmt)<0) p.tbmtRaw.push(r.tbmt);
      if(!p.approve && r.approve) p.approve=r.approve;
      if(!p.month && r.month) p.month=+r.month;
      if(!p.dur && r.dur) p.dur=+r.dur;
      if(!p.link && r.link) p.link=r.link;
      if(!p.address && r.address) p.address=r.address;
      if(!p.tender && r.tender) p.tender=r.tender;
      if(r.note && p.note.indexOf(r.note)<0) p.note += (p.note?" · ":"")+r.note;
      var won = r.result==="Win";
      var q = won ? (+r.wonQty||+r.qty||0) : (+r.qty||0);
      var pr= won ? (+r.wonPrice||+r.price||0) : (+r.price||0);
      var tot = +r.total||0; if(tot && tot<1e5) tot*=1000;   // cột Total Amount: Sheet trả đồng, bản xuất Excel ghi nghìn đồng
      var val = q*pr || tot;
      var g=grpOf(r.pcode||r.wonProduct);
      p.items.push({ code: (won && r.wonProduct) ? r.wonProduct : r.pcode, offer:r.pcode, qty:q, price:pr, value:val, unit:r.unit||"",
        result:r.result||"", g:g, cat:GK[g].top, knife:knifeOf(r.pcode), mfr:"MANI" });
      p.results[r.result||"(trống)"]=1;
    });
  });
  /* KQTT toàn quốc: bỏ cả gói khi số TBMT đã có ở file NPP (iCare / Hùng Vĩ) */
  var skip={};
  kqRows().forEach(function(r){
    var tb=tbNorm(r.tbmt);
    if(tb && nppTb[tb]){ skip[tb]=1; return; }
    var key="KQTT|"+(tb||"H:"+hkey(r.buyer))+"|"+hkey(r.buyer), p=map[key];
    if(!p){
      p=map[key]={ key:key, npp:"KQTT", tbmt:tb, tbmtRaw:tb?[tb]:[], hospital:r.buyer||"(chưa ghi bên mời thầu)", city:r.prov||"", address:r.loc||"",
        tender:"", project:"", approve:"", month:0, signed:"", dur:0, bidOpen:"", items:[], results:{Win:1}, link:"", note:"",
        kq:{ method:r.method||"", decNo:r.decNo||"", bidders:+r.bidders||0, pub:r.pub||"", exp:"" } };
      PKGS.push(p);
    }
    if(!p.approve && (r.dec||r.pub)) p.approve=r.dec||r.pub;
    if(+r.month > p.month) p.month=+r.month;
    if(!p.dur && +r.dur) p.dur=+r.dur;
    if(r.exp && r.exp>p.kq.exp) p.kq.exp=r.exp;
    if(!p.kq.decNo && r.decNo) p.kq.decNo=r.decNo;
    var q=+r.qty||0, pr=+r.price||0, g=kqGrp(r.ktype, r.pcode);
    p.items.push({ code:String(r.pcode||"").trim()||"—", offer:r.pcode, qty:q, price:pr, value:q*pr, unit:r.unit||"", result:"Win", g:g, cat:"dao",
      knife:String(r.ktype||"").replace(/\s*knife/i,"").replace(/^cresent$/i,"Crescent"), mfr:r.mfr||"", brand:r.brand||"", pname:r.pname||"", country:r.country||"" });
  });
  KQ_SKIP=Object.keys(skip).length;
  PKGS.forEach(function(p){
    if(p.npp==="KQTT") p.tender = "KQTT "+(p.tbmt||"")+(p.kq.decNo?" · QĐ "+p.kq.decNo:"");
    p.dur = p.dur || 12;
    var sk = p.npp==="KQTT" ? (p.month || monKey(p.approve)) : (p.approve ? monKey(p.approve) : (p.month || (p.signed ? monKey(p.signed) : 0)));
    p.sk = sk; p.fy = fyOf(sk); p.q = sk ? qOf(sk) : 0;
    p.res = p.results.Win ? "Win" : p.results.Pending ? "Pending" : p.results.Fail ? "Fail" : p.results.Cancel ? "Cancel" : "";
    p.end = (p.kq && p.kq.exp) ? p.kq.exp : p.approve ? addMonths(p.approve, p.dur) : "";
    if(p.res!=="Win") p.status = "";
    else if(!p.end) p.status = "na";
    else if(p.end < NOW) p.status = "bad";
    else if(monthsBetween(NOW,p.end) <= SOON_MONTHS) p.status = "warn";
    else p.status = "ok";
    var pv = provOf(p.city, p.address);
    if(pv){ p.ni=pv.n; p.oi=pv.o; p.reg=NEW[pv.n][1]; } else { p.ni=-1; UNMAPPED.push(p); return; }
    var hk=p.ni+"|"+hkey(p.hospital), h=HK[hk];
    if(!h){ h=(HBYP[p.ni]||[]).filter(function(x){ return sameName(x.name, p.hospital); })[0]; if(h) HK[hk]=h; }   // tên gần đúng ⇒ cùng cơ sở
    if(!h){ h=HK[hk]={key:hk, name:p.hospital, ni:p.ni, oi:p.oi, address:p.address, pk:[], npps:{}}; HOSP.push(h); (HBYP[p.ni]=HBYP[p.ni]||[]).push(h); }
    if(!h.address && p.address) h.address=p.address;
    h.pk.push(p); h.npps[p.npp]=1; p.h=h;
  });
  buildFac();
  placeHosp();
}
/* ═════════ DANH MỤC CƠ SỞ Y TẾ (csyt.js) — nối với bệnh viện có gói thầu ═════════ */
var FAC=[], FBYP={}, FID={};
var CT = (window.CSYT&&CSYT.types)||{bv:"Bệnh viện",ttyt:"Trung tâm Y tế",pkkv:"Phòng khám ĐK khu vực",dv:"Đơn vị mua sắm",khac:"Cơ sở khác"};
/* CÔNG LẬP / TƯ NHÂN (người dùng 05/11/2026): danh mục csyt.js cột own (tools/csyt_own.py) + bảng tên chuẩn CRM (VM_STD ⇒ ACT.build).
   Tư nhân mua sắm theo HỢP ĐỒNG MUA SẮM (không qua đấu thầu công) ⇒ theo dõi bằng giai đoạn mua sắm 11–19, không hiện "hợp đồng thầu". */
var PVCOL="#7C3AED";
function isPv(f){ return !!f && (f.t==="tn" || !!f.pv); }
var PVNAME=/\b(quoc te|international|vinmec|hoan my|tam anh|hong ngoc|thu cuc|medlatec|cong ty|co phan|columbia|family medical|hanh phuc|phuong dong|an viet|thien hanh|xuyen a|hitec|dnd|viet nhat|ky thuat cao|tam tri|phap viet|trieu an|van phuc|nam viet|yersin|sai gon ito|mat sai gon)\b/;
function ownOk(pv){ return F.own==="all" || (pv ? F.own==="tn" : F.own==="cl"); }
var CSP = (window.CSYT&&CSYT.spec)||{};
function facAdd(f){ FAC.push(f); FID[f.id]=f; (FBYP[f.ni]=FBYP[f.ni]||[]).push(f); return f; }
function buildFac(){
  FAC=[]; FBYP={}; FID={};
  var C=window.CSYT;
  if(C && C.rows){
    var ix={}; C.cols.forEach(function(c,i){ ix[c]=i; });
    C.rows.forEach(function(r){
      var ni=NEWIDX[nk(r[ix.p])]; if(ni==null) return;
      facAdd({ id:r[ix.id], name:r[ix.n], t:r[ix.t]||"khac", sp:r[ix.sp]||"", lv:r[ix.lv]||"", ni:ni, oi:r[ix.o]?nk(r[ix.o]):"", addr:r[ix.a]||"",
        ll:(r[ix.lat]!==""&&r[ix.lat]!=null)?[+r[ix.lng],+r[ix.lat]]:null, beds:r[ix.beds]||"", rank:r[ix.rank]||"", src:r[ix.src]||"",
        alias:r[ix.alias]?String(r[ix.alias]).split("|"):[], h:null, pv:r[ix.own]==="tn"?1:0, pv0:r[ix.own]==="tn"?1:0 });
    });
  }
  HOSP.forEach(function(h){
    var list=FBYP[h.ni]||[], k=hkey(h.name);
    var k2=fkey(h.name), f=list.filter(function(x){ return fkey(x.name)===k2; })[0] || list.filter(function(x){ return x.alias.some(function(a){ return fkey(a)===k2; }); })[0]
       || list.filter(function(x){ return hkey(x.name)===k; })[0] || list.filter(function(x){ return x.alias.some(function(a){ return hkey(a)===k; }); })[0]
       || list.filter(function(x){ return sameName(x.name, h.name); })[0];
    if(!f) f=facAdd({ id:"H:"+h.key, name:h.name, t:kindOf(h.name)==="tt"?"ttyt":kindOf(h.name)==="bv"?"bv":"khac", sp:"", lv:"", ni:h.ni, oi:h.oi, addr:h.address||"", ll:null, src:"tender", alias:[], h:null, pv:PVNAME.test(nw(h.name))?1:0 });
    if(!f.h) f.h=h;
    h.f=f;
    if(f.addr && (!h.address || /^(tỉnh|thành phố)\b/i.test(h.address))) h.address=f.addr;
  });
}
/* cơ sở chưa có gói thầu ⇒ tạo "bệnh viện" rỗng để mở cùng một màn hình chi tiết */
function hospOf(f){
  if(f.h) return f.h;
  var h={ key:"F|"+f.id, name:f.name, ni:f.ni, oi:f.oi||nk(NEW[f.ni][2][0]), address:f.addr||"", pk:[], npps:{}, f:f, empty:true };
  var a = f.ll ? {ll:f.ll, o:f.oi||h.oi} : anchorOf(h);
  if(a.o) h.oi=a.o;
  h.xy = a.ll ? [px(a.ll[0]),py(a.ll[1])] : (PROV[h.ni]?PROV[h.ni].info.c.slice():[500,500]);
  f.h=h; HK[h.key]=h; return h;
}
/* vị trí bệnh viện: quận / huyện hoặc phường / thị trấn trong địa chỉ (vn-dist.js) ⇒ tên quận trong tên BV ⇒ tâm tỉnh cũ */
var WCACHE={};
function wardsOf(o){ if(WCACHE[o]) return WCACHE[o]; var str=(window.VN_WARD||{})[o]||""; WCACHE[o]=str?str.split(";").map(function(x){ var f=x.split(","); return {t:f[0][0], w:f[0].slice(1), d:+f[1], ll:[+f[2],+f[3]]}; }):[]; return WCACHE[o]; }
function lastPos(a,key){ var re=new RegExp(key+(/\d$/.test(key)?"(?!\\d)":""),"g"), m, p=-1; while((m=re.exec(a))){ p=m.index; } return p; }
function anchorOf(h){
  var olds=[h.oi].concat(NEW[h.ni][2].map(nk).filter(function(k){ return k!==h.oi; })), D=window.VN_DIST||{};
  var a=nk(h.address).replace(/(phuong|quan)0+(\d)/g,"$1$2"), n=nk(h.name), best=null, ward=null;
  olds.forEach(function(o){ (D[o]||[]).forEach(function(d,di){ if(d[0].length<3) return; var p=lastPos(a,d[0]); if(p>=0&&(!best||p>best.p||(p===best.p&&d[0].length>best.d[0].length))) best={p:p,d:d,di:di,o:o}; }); });
  olds.forEach(function(o){ wardsOf(o).forEach(function(w){ if(best&&(o!==best.o||w.d!==best.di)) return; var p=lastPos(a,(w.t==="p"?"phuong":"thitran")+w.w); if(p>=0&&(!ward||p>ward.p)) ward={p:p,w:w,o:o}; }); });
  if(ward) return {key:ward.o+"|"+ward.w.d+"|"+ward.w.w, ll:ward.w.ll, o:ward.o};
  if(best) return {key:best.o+"|"+best.d[0], ll:[best.d[1],best.d[2]], o:best.o};
  var bn=null; olds.forEach(function(o){ (D[o]||[]).forEach(function(d){ if(d[0].length>=4&&n.indexOf(d[0])>=0&&(!bn||d[0].length>bn.d[0].length)) bn={d:d,o:o}; }); });
  if(bn) return {key:bn.o+"|"+bn.d[0], ll:[bn.d[1],bn.d[2]], o:bn.o};
  return {key:"o|"+h.oi, ll:null, o:h.oi};
}
function placeHosp(){
  var spots={};
  HOSP.forEach(function(h){
    var a = (h.f && h.f.ll) ? {key:"ll|"+h.f.ll.join(","), ll:h.f.ll, o:(h.f.oi && NEW[h.ni][2].some(function(o){ return nk(o)===h.f.oi; })) ? h.f.oi : h.oi} : anchorOf(h);   // toạ độ thật (danh mục cơ sở y tế) ⇒ quận / phường trong địa chỉ
    if(a.o!==h.oi){ h.oi=a.o; h.pk.forEach(function(p){ p.oi=a.o; }); }
    var xy=a.ll?[px(a.ll[0]),py(a.ll[1])]:null;
    if(!xy){ var op=OLDP.filter(function(o){ return o.k===h.oi; })[0]; xy=op&&op.info.c?op.info.c.slice():(PROV[h.ni]?PROV[h.ni].info.c.slice():[500,500]); }
    (spots[a.key]=spots[a.key]||{xy:xy,list:[]}).list.push(h);
  });
  Object.keys(spots).forEach(function(k){ var sp=spots[k]; sp.list.sort(function(a,b){ return b.pk.length-a.pk.length; });
    sp.list.forEach(function(h,j){ if(sp.list.length===1){ h.xy=sp.xy; return; } var r=1.25*Math.sqrt(j+0.6), t=j*2.39996; h.xy=[sp.xy[0]+r*Math.cos(t), sp.xy[1]+r*Math.sin(t)]; }); });
}

/* ═════════ BỘ LỌC ═════════ */
var F = { fy:String(FY_NOW), q:0, pk:"fy"+FY_NOW, rng:null, npp:"all", cat:"all", res:"win", sub:null, m:"v", type:"all", brand:"all", view:"win", color:"src", own:"all" };
try{ var tv0=localStorage.getItem("tm_view"); if(tv0==="fu"||tv0==="act") F.view=tv0; if(localStorage.getItem("tm_color")==="mani") F.color="mani";
  var ow0=localStorage.getItem("tm_own"); if(ow0==="cl"||ow0==="tn") F.own=ow0; }catch(_){}

/* ═════════ ĐỊA BÀN PHỤ TRÁCH (người dùng 05/11/2026) ═════════
   Viet Ha: miền Bắc → hết Đà Nẵng · Khang: Quảng Ngãi → miền Nam (backend MMH_TenderFU v1.6 nhắc việc theo đúng địa bàn này).
   Đăng nhập là Viet Ha / Khang ⇒ chỉ thấy địa bàn + hoạt động của mình (khoá); người khác (Giang, Nguyen Ha, Tuyen…) xem tất cả và chọn xem theo PIC (#f-pic).
   Lọc ở app (pass / FU.pass / ACT.rowsF / tìm kiếm / khung bản đồ) — dữ liệu backend không đổi. */
var DNI=NEW.map(function(x){ return x[0]; }).indexOf("Đà Nẵng");
var TERR=(function(){   /* ni[i] = 1 (cả tỉnh) hoặc {tỉnh cũ: 1} (một phần tỉnh mới) — người dùng chốt 05/11/2026: chia theo tỉnh cũ */
  var a={}, b={};
  NEW.forEach(function(x,i){ if(i<DNI) a[i]=1; else if(i>DNI) b[i]=1; });
  a[DNI]={danang:1}; b[DNI]={quangnam:1};
  return [{ pic:"Viet Ha", lbl:"Miền Bắc → Đà Nẵng (cũ)", ni:a, col:"#4F46E5" }, { pic:"Khang", lbl:"Quảng Nam (cũ) → miền Nam", ni:b, col:"#D97706" }];
})();
/* địa chỉ ghi "TP Đà Nẵng" sau sáp nhập nhưng thuộc Quảng Nam cũ ⇒ nhận qua tên huyện / thị cũ */
var QNAM_RE=/\b(quang nam|tam ky|hoi an|dien ban|duy xuyen|que son|thang binh|nui thanh|phu ninh|dai loc|nong son|hiep duc|tien phuoc|tra my|phuoc son|nam giang|dong giang|tay giang|chu lai)\b/;
var SCOPE=(function(){
  var LS="tm_scope";
  function me(){ var a=(typeof FU!=="undefined" && FU && FU.auth) ? FU.auth() : null; return a && a.user ? String(a.user.pic||"") : ""; }
  function lockT(){ var k=nk(me()); if(!k) return null; for(var i=0;i<TERR.length;i++) if(nk(TERR[i].pic)===k) return TERR[i]; return null; }
  function chosen(){ var v=""; try{ v=localStorage.getItem(LS)||""; }catch(_){} return TERR.some(function(t){ return t.pic===v; }) ? v : ""; }
  function terr(){ var L=lockT(); if(L) return L; var v=chosen(); return v ? TERR.filter(function(t){ return t.pic===v; })[0] : null; }
  function pic(){ var t=terr(); return t ? t.pic : ""; }
  /* oi = tỉnh cũ (khoá nk) — cần cho tỉnh mới chia đôi; không rõ tỉnh cũ ⇒ coi như thuộc */
  function inProv(ni, oi){ var t=terr(); if(!t) return true; if(ni==null || ni<0) return false; var v=t.ni[ni]; if(!v) return false; return v===1 || !oi || !!v[oi]; }
  /* PIC phụ trách theo tỉnh mới + tỉnh cũ (không xét người đang xem) */
  function ownerOf(ni, oi){ for(var i=0;i<TERR.length;i++){ var v=TERR[i].ni[ni]; if(v===1 || (v && oi && v[oi])) return TERR[i].pic; } return ""; }
  function place(){ var t=terr(); return t ? t.lbl : "toàn quốc"; }
  function bbox(){
    var t=terr(); if(!t || !PROV || !PROV.length) return null; var b=null;
    var add=function(q){ if(q) b = b ? [Math.min(b[0],q[0]), Math.min(b[1],q[1]), Math.max(b[2],q[2]), Math.max(b[3],q[3])] : q.slice(); };
    Object.keys(t.ni).forEach(function(i){ var v=t.ni[i], P=PROV[i];
      if(v===1){ if(P && P.info) add(P.info.bb); }
      else OLDP.forEach(function(o){ if(o.n===+i && v[o.k]) add(o.info.bb); }); });
    return b;
  }
  /* đổi phạm vi ⇒ về khung địa bàn mới (đang xem tỉnh ngoài địa bàn ⇒ về toàn địa bàn) */
  function apply(){
    if(!svg || !PROV.length){ renderFilters(); return; }
    if(sel>=0 && !inProv(sel)) selectProv(-1);
    else if(sel<0){ VB0=homeBox(); animateTo(VB0); }
    crumbSet(); renderFilters(); refresh();
  }
  function set(v){ if(lockT()) return; try{ localStorage.setItem(LS, v||""); }catch(_){} apply(); }
  function ui(){
    var el=document.getElementById("f-pic"); if(!el) return;
    var m=me(); el.hidden=!m; if(!m){ el.innerHTML=""; return; }
    var L=lockT();
    if(L){ el.classList.add("lock"); el.onclick=null;
      el.innerHTML='<span class="scl" title="Địa bàn phụ trách của bạn — bản đồ, gói thầu, theo dõi và hoạt động chỉ trong địa bàn này"><i class="dot" style="background:'+L.col+'"></i>'+esc(L.pic)+' · '+esc(L.lbl)+'</span>'; return; }
    el.classList.remove("lock");
    var cur=pic();
    el.innerHTML=[["","Cả nhóm","Toàn quốc — mọi PIC",""]].concat(TERR.map(function(t){ return [t.pic, t.pic, t.lbl, t.col]; })).map(function(o){
      var on=cur===o[0]; return '<button type="button" data-v="'+esc(o[0])+'" class="'+(on?"on":"")+'" aria-pressed="'+on+'" title="'+esc(o[2])+'">'+(o[3]?'<i class="dot" style="background:'+o[3]+';margin-right:5px"></i>':'')+esc(o[1])+'</button>'; }).join("");
    el.onclick=function(e){ var b=e.target.closest("button"); if(!b) return; set(b.dataset.v); };
  }
  return { terr:terr, pic:pic, inProv:inProv, ownerOf:ownerOf, place:place, bbox:bbox, set:set, ui:ui, apply:apply, me:me, locked:function(){ return !!lockT(); } };
})();
try{ var qv0=new URLSearchParams(location.search).get("v"); if(qv0==="fu"||qv0==="win"||qv0==="act") F.view=qv0; }catch(_){}   // link từ nút "Nhắc tôi" / email: ?v=fu#<Tỉnh>/<Cơ sở>
function setType(t){ F.type=t; if(t==="all"){ F.cat="all"; F.sub=null; } else if(t==="dao"||t==="chi"){ F.cat=t; F.sub=null; } else { F.cat=GK[t].top; F.sub=t; } }
function unitNow(){ return F.sub ? GK[F.sub].u : F.cat==="dao" ? "cái" : F.cat==="chi" ? "sợi" : "SP"; }
function typeLabel(){ return F.sub ? GK[F.sub].name : F.cat==="dao" ? "Dao" : F.cat==="chi" ? "Chỉ khâu" : "mọi sản phẩm"; }
function fm(v){ return F.m==="q" ? nfmt(Math.round(v))+" "+unitNow() : vnd(v); }   // định dạng theo chỉ số đang chọn
function mLabel(){ return F.m==="q" ? "Số lượng" : "Giá trị"; }
function itOk0(it){ return (F.cat==="all" || it.cat===F.cat) && (!F.sub || it.g===F.sub); }                 // bỏ qua bộ lọc hãng
function itOk(it){ return itOk0(it) && (F.brand==="all" || (F.brand==="mani")===isMani(it)); }
function inPeriod(p){
  if(F.fy==="rng"){ var d=pDate(p); return !!d && d>=F.rng[0] && d<=F.rng[1]; }
  if(F.fy==="every"){ if(p.fy < FY_MIN) return false; }
  else if(p.fy < FY_FROM) return false;
  if(F.fy!=="all" && F.fy!=="every" && p.fy!==+F.fy) return false;
  if(F.q && p.q!==F.q) return false;
  return true;
}
/* o.np = bỏ qua kỳ · o.nb = bỏ qua hãng (thị phần) */
function pass(p, ignoreRes, o){
  o=o||{};
  if(!SCOPE.inProv(p.ni, p.oi)) return false;                             /* địa bàn PIC (Sales chỉ thấy địa bàn của mình) */
  if(F.own!=="all" && !ownOk(isPv(p.h&&p.h.f))) return false;
  if(!o.np && !inPeriod(p)) return false;
  if(F.npp==="NPP" ? p.npp==="KQTT" : (F.npp!=="all" && p.npp!==F.npp)) return false;
  if(!ignoreRes && F.res==="win" && p.res!=="Win") return false;
  if(!p.items.some(o.nb ? itOk0 : itOk)) return false;
  return true;
}
function pkgValue(p){
  return p.items.reduce(function(s,it){
    if(!itOk(it)) return s;
    if(p.res==="Win" && it.result!=="Win") return s;
    return s+it.value; },0);
}
function pkgQty(p){
  return p.items.reduce(function(s,it){ if(!itOk(it) || (p.res==="Win" && it.result!=="Win")) return s; return s+(+it.qty||0); },0);
}
function mv(p){ return F.m==="q" ? pkgQty(p) : pkgValue(p); }
/* kỳ: yyyymm của tháng đầu FY / quý */
function fyStartK(fy){ return (fy+1958)*100+9; }
function qStartK(fy,q){ var m0=[9,12,3,6][q-1]; return (m0>=9 ? fy+1958 : fy+1959)*100+m0; }
function addK(k,n){ var y=Math.floor(k/100), m=k%100-1+n; y+=Math.floor(m/12); m=((m%12)+12)%12; return y*100+m+1; }
function qShort(fy,q){ var a=qStartK(fy,q), b=addK(a,2); return "T"+(a%100)+"–"+(b%100)+"/"+Math.floor(b/100); }
function periodList(){
  var o=[["all","Từ FY67 đến nay"],["every","Mọi năm (từ FY"+FY_MIN+")"]];
  for(var f=Math.max(FY_NOW,FY_FROM); f>=FY_MIN; f--){
    o.push([String(f), "FY"+f+(f===FY_NOW?" đến nay":" cả năm")]);
    for(var q=1;q<=4;q++){ if(qStartK(f,q)<=NOWK) o.push([f+"q"+q, "   Q"+q+" FY"+f+" · "+qShort(f,q)]); }
  }
  return o;
}
function periodVal(){ return (F.fy==="all"||F.fy==="every") ? F.fy : F.fy+(F.q?"q"+F.q:""); }
function setPeriod(v){ var m=/^(\d+)(?:q(\d))?$/.exec(String(v)); if(m) v=m[2]?"q"+m[1]+"-"+m[2]:"fy"+m[1]; setPk(String(v)); }
function periodLabel(){ return F.fy==="all" ? "Từ FY67" : F.fy==="every" ? "Mọi năm" : F.fy==="rng" ? PERX.label(F.pk,true) : "FY"+F.fy+(F.q?" Q"+F.q:""); }
/* ═════════ KỲ DÙNG CHUNG (người dùng 11/11/2026): Tuần · Tháng · Quý · Kỳ (FY) [· Khoảng ngày] — 1 nút [‹ kỳ ▾ ›] ở thanh trên ═════════
   Khoá: "fy68" · "q68-1" · "m202611" · "w2026-11-09" (thứ Hai) · "c2026-10-01~2026-11-09" · "all" (từ FY67) · "every" (mọi năm, từ FY64).
   Kết quả thầu + Theo dõi thầu dùng F.pk — mặc định KỲ HIỆN TẠI (FY_NOW tính theo ngày hôm nay ⇒ tự sang FY69 từ 09/2027); Hoạt động mặc định THÁNG HIỆN TẠI.
   Không nhớ qua lần mở app sau (người dùng: mở ra luôn là kỳ / tháng hiện tại). */
var PERX=(function(){
  function p2(n){ return (n<10?"0":"")+n; }
  function isoD(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
  function kS(k){ return Math.floor(k/100)+"-"+p2(k%100)+"-01"; }
  function kE(k){ return isoD(new Date(Math.floor(k/100), k%100, 0)); }
  function addD(s0,n){ var d=new Date(s0+"T00:00:00"); d.setDate(d.getDate()+n); return isoD(d); }
  function monOf(s0){ var d=new Date(s0+"T00:00:00"); return addD(s0, -((d.getDay()+6)%7)); }
  function dm(s0){ return s0.slice(8,10)+"/"+s0.slice(5,7); }
  function dmy(s0){ return dm(s0)+"/"+s0.slice(0,4); }
  function days(a,b){ return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5); }
  function mf(o){ return (o && o.min) || FY_FROM; }
  function span(p){
    var m; p=p||("fy"+FY_NOW);
    if(p==="all") return [kS(fyStartK(FY_FROM)), NOW, "all"];
    if(p==="every") return [kS(fyStartK(FY_MIN)), NOW, "all"];
    if((m=/^fy(\d+)$/.exec(p))){ var a=fyStartK(+m[1]); return [kS(a), kE(addK(a,11)), "fy"]; }
    if((m=/^q(\d+)-(\d)$/.exec(p))){ var b=qStartK(+m[1],+m[2]); return [kS(b), kE(addK(b,2)), "q"]; }
    if((m=/^m(\d{6})$/.exec(p))) return [kS(+m[1]), kE(+m[1]), "m"];
    if((m=/^w(\d{4}-\d\d-\d\d)$/.exec(p))) return [m[1], addD(m[1],6), "w"];
    if((m=/^c(\d{4}-\d\d-\d\d)~(\d{4}-\d\d-\d\d)$/.exec(p))) return m[1]<=m[2] ? [m[1], m[2], "c"] : [m[2], m[1], "c"];
    var c=fyStartK(FY_NOW); return [kS(c), kE(addK(c,11)), "fy"];
  }
  /* kỳ liền trước / sau cùng loại (nút ‹ ›): không trước FY đầu, không sau kỳ hiện tại (tuần: cho xem tuần sau ⇒ kế hoạch) */
  function mv(p, dir, o){
    var m, F0=mf(o), D0=kS(fyStartK(F0));
    if(p==="all" || p==="every") return null;
    if((m=/^fy(\d+)$/.exec(p))){ var f=+m[1]+dir; return f>=F0 && f<=FY_NOW ? "fy"+f : null; }
    if((m=/^q(\d+)-(\d)$/.exec(p))){ var f2=+m[1], q=+m[2]+dir; if(q<1){ q=4; f2--; } if(q>4){ q=1; f2++; } var k=qStartK(f2,q); return f2>=F0 && k<=NOWK ? "q"+f2+"-"+q : null; }
    if((m=/^m(\d{6})$/.exec(p))){ var k2=addK(+m[1],dir); return k2>=fyStartK(F0) && k2<=NOWK ? "m"+k2 : null; }
    if((m=/^w(.+)$/.exec(p))){ var w=addD(m[1],7*dir); return addD(w,6)>=D0 && w<=addD(monOf(NOW),7) ? "w"+w : null; }
    var s0=span(p); if(s0[2]==="c"){ var L=days(s0[0],s0[1])+1, a=addD(s0[0],L*dir), b=addD(s0[1],L*dir); return b>=D0 && a<=NOW ? "c"+a+"~"+b : null; }
    return null;
  }
  function label(p, short){
    var m, s0=span(p); p=p||("fy"+FY_NOW);
    if(p==="all") return "Từ FY"+FY_FROM+" đến nay"; if(p==="every") return "Mọi năm (từ FY"+FY_MIN+")";
    if((m=/^fy(\d+)$/.exec(p))) return "FY"+m[1]+(+m[1]===FY_NOW?" đến nay":"");
    if((m=/^q(\d+)-(\d)$/.exec(p))) return "Q"+m[2]+" FY"+m[1]+(short?"":" · "+qShort(+m[1],+m[2]));
    if((m=/^m(\d{6})$/.exec(p))) return "Tháng "+(+m[1]%100)+"/"+Math.floor(+m[1]/100);
    if(s0[2]==="w") return (s0[0]===monOf(NOW)?"Tuần này":"Tuần")+" "+dm(s0[0])+" – "+dm(s0[1])+(short?"":"/"+s0[1].slice(0,4));
    return (s0[0].slice(0,4)===s0[1].slice(0,4) ? dm(s0[0]) : dmy(s0[0]))+" – "+dmy(s0[1]);
  }
  var PK={ w:"Tuần", m:"Tháng", q:"Quý", fy:"Kỳ (FY)", c:"Khoảng ngày" };
  function opts(k, o){
    var out=[], f, q, k0, F0=mf(o), D0=kS(fyStartK(F0));
    if(k==="w"){ var w=monOf(NOW); for(var i=0;i<12;i++){ if(addD(w,6)<D0) break; out.push(["w"+w, (i===0?"Tuần này · ":i===1?"Tuần trước · ":"")+dm(w)+" – "+dm(addD(w,6))]); w=addD(w,-7); } }
    if(k==="m"){ for(var k1=NOWK, n=0; k1>=fyStartK(F0) && n<36; k1=addK(k1,-1), n++) out.push(["m"+k1, "T"+(k1%100)+"/"+String(Math.floor(k1/100)).slice(2)+(k1===NOWK?" · tháng này":"")]); }
    if(k==="q"){ for(f=FY_NOW; f>=F0; f--) for(q=4;q>=1;q--){ k0=qStartK(f,q); if(k0<=NOWK) out.push(["q"+f+"-"+q, "Q"+q+" FY"+f+" · "+qShort(f,q)]); } }
    if(k==="fy"){ for(f=FY_NOW; f>=F0; f--) out.push(["fy"+f, "FY"+f+(f===FY_NOW?" (kỳ hiện tại)":"")+" · "+(fyStartK(f)%100)+"/"+Math.floor(fyStartK(f)/100)+" – "+(addK(fyStartK(f),11)%100)+"/"+Math.floor(addK(fyStartK(f),11)/100)]);
      if(o && o.extra) out.push(["all","Từ FY"+FY_FROM+" đến nay"],["every","Mọi năm (từ FY"+FY_MIN+")"]); }
    return out;
  }
  function pop(el, o){
    var p=o.get(), sp=span(p), cur=sp[2]==="all"?"fy":sp[2], tab=el._tab||cur;
    var h='<div class="seg ptab" role="tablist">'+o.kinds.map(function(k){ return '<button type="button" role="tab" data-ptab="'+k+'" class="'+(k===tab?"on":"")+'" aria-selected="'+(k===tab)+'">'+PK[k]+'</button>'; }).join("")+'</div>';
    if(tab==="c"){
      var a=cur==="c"?sp[0]:addD(NOW,-29), b=cur==="c"?sp[1]:NOW, D0=kS(fyStartK(mf(o)));
      h+='<div class="pcus"><label>Từ ngày<input type="date" class="pd0" value="'+a+'" min="'+D0+'" max="'+NOW+'"></label><label>Đến ngày<input type="date" class="pd1" value="'+b+'" min="'+D0+'"></label>'+
        '<button type="button" class="btn pri" data-pgo="1">Xem</button></div><div class="pq">'+[[7,"7 ngày qua"],[30,"30 ngày qua"],[90,"90 ngày qua"]].map(function(x){ return '<button type="button" data-per="c'+addD(NOW,1-x[0])+'~'+NOW+'">'+x[1]+'</button>'; }).join("")+
        '<button type="button" data-per="c'+kS(fyStartK(FY_NOW))+'~'+NOW+'">Từ đầu FY'+FY_NOW+'</button></div>';
    } else h+='<div class="pls p-'+tab+'">'+opts(tab,o).map(function(x){ return '<button type="button" data-per="'+x[0]+'" class="'+(x[0]===p?"on":"")+'">'+x[1]+'</button>'; }).join("")+'</div>';
    return h;
  }
  var CHEV='<svg class="cv" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function popOpen(box, html){ var pp=box.querySelector(".pop"), b=box.querySelector(".pb"), was=!pp.hidden;
    document.querySelectorAll(".pick .pop").forEach(function(x){ x.hidden=true; var bb=x.parentNode.querySelector(".pb"); if(bb) bb.setAttribute("aria-expanded","false"); });
    if(was && html==null) return; pp.innerHTML=html||pp.innerHTML; pp.hidden=false; b.setAttribute("aria-expanded","true");
    pp.style.left=""; if(getComputedStyle(pp).position==="absolute"){ var rr=pp.getBoundingClientRect(), ov=rr.right-(window.innerWidth-8); if(ov>0) pp.style.left=(-ov)+"px"; } }
  function popClose(){ document.querySelectorAll(".pick .pop").forEach(function(x){ x.hidden=true; if(x.parentNode) x.parentNode._tab=""; }); document.querySelectorAll(".pick .pb").forEach(function(x){ x.setAttribute("aria-expanded","false"); }); }
  document.addEventListener("click",function(e){ if(!e.target.closest(".pick")) popClose(); });
  document.addEventListener("keydown",function(e){ if(e.key==="Escape" && document.querySelector(".pick .pop:not([hidden])")) popClose(); });
  /* o = { get(), set(p), kinds:[…], min:FY đầu, extra:bool (Từ FY67 / Mọi năm), title } — set() tự renderFilters + refresh */
  function render(el, o){
    var p=o.get(), prv=mv(p,-1,o), nxt=mv(p,1,o);
    el.innerHTML='<button type="button" class="pa" data-mv="-1" aria-label="Kỳ trước"'+(prv?'':' disabled')+'>‹</button>'+
      '<button type="button" class="pb" aria-haspopup="dialog" aria-expanded="false" title="'+esc(o.title||"Chọn kỳ: tuần · tháng · quý · kỳ (FY)")+'">'+esc(label(p,true))+CHEV+'</button>'+
      '<button type="button" class="pa" data-mv="1" aria-label="Kỳ sau"'+(nxt?'':' disabled')+'>›</button><div class="pop pper" hidden role="dialog" aria-label="Chọn kỳ"></div>';
    el.onclick=function(e){
      var b=e.target.closest("button"); if(!b) return; e.stopPropagation();
      if(b.dataset.mv){ var q=mv(o.get(),+b.dataset.mv,o); if(q) o.set(q); return; }
      if(b.classList.contains("pb")){ el._tab=""; popOpen(el, pop(el,o)); var on1=el.querySelector(".pls .on"); if(on1) on1.scrollIntoView({block:"nearest"}); return; }
      if(b.dataset.ptab){ el._tab=b.dataset.ptab; el.querySelector(".pop").innerHTML=pop(el,o); return; }
      if(b.dataset.per){ popClose(); o.set(b.dataset.per); return; }
      if(b.dataset.pgo){ var a=el.querySelector(".pd0").value, c=el.querySelector(".pd1").value; if(!a||!c) return; popClose(); o.set("c"+(a<=c?a+"~"+c:c+"~"+a)); }
    };
    el.onkeydown=function(e){ if(e.key==="Enter" && e.target.type==="date"){ e.preventDefault(); var g=el.querySelector("[data-pgo]"); if(g) g.click(); } };
  }
  return { span:span, mv:mv, label:label, opts:opts, render:render, popOpen:popOpen, popClose:popClose, kS:kS, kE:kE, addD:addD, monOf:monOf, dm:dm, dmy:dmy, isoD:isoD, CHEV:CHEV };
})();
/* Kết quả thầu / Theo dõi thầu: F.pk ⇒ F.fy / F.q (FY, quý: giữ cách tính cũ) hoặc F.fy = "rng" + F.rng = [từ, đến] (tuần, tháng, khoảng ngày) */
function setPk(p){
  var m; F.pk=p||("fy"+FY_NOW); F.rng=null;
  if(F.pk==="all"||F.pk==="every"){ F.fy=F.pk; F.q=0; return; }
  if((m=/^fy(\d+)$/.exec(F.pk))){ F.fy=m[1]; F.q=0; return; }
  if((m=/^q(\d+)-(\d)$/.exec(F.pk))){ F.fy=m[1]; F.q=+m[2]; return; }
  var sp=PERX.span(F.pk); F.fy="rng"; F.q=0; F.rng=[sp[0], sp[1]];
}
/* ngày của 1 gói để lọc theo tuần / tháng: ngày phê duyệt ⇒ tháng (ngày 01) ⇒ ngày ký */
function pDate(p){ return p.approve || (p.sk ? PERX.kS(p.sk) : "") || p.signed || ""; }
function seg(id, opts, key, cb){
  var el=document.getElementById(id);
  el.innerHTML=opts.map(function(o){ var on=String(F[key])===String(o[0]); return '<button type="button" data-v="'+o[0]+'" class="'+(on?"on":"")+'" aria-pressed="'+on+'">'+o[1]+'</button>'; }).join("");
  el.onclick=function(e){ var b=e.target.closest("button"); if(!b) return; F[key]=(key==="q")?+b.dataset.v:b.dataset.v; if(cb) cb(); renderFilters(); refresh(); };
}
var NPPL={NPP:"2 NPP",HUNGVI:"Hùng Vĩ",ICARE:"iCare",KQTT:"KQTT thị trường"};
function activeFilters(){
  var a=[];
  if(F.npp!=="all") a.push(["npp","Nguồn",NPPL[F.npp]]);
  if(F.brand!=="all") a.push(["brand","Hãng",F.brand==="mani"?"MANI":"Hãng khác"]);
  if(F.type!=="all") a.push(["type","Sản phẩm",typeLabel()]);
  if(F.res!=="win") a.push(["res","Gói","mọi gói tham dự"]);
  if(F.color!=="src") a.push(["color","Tô màu","thị phần MANI"]);
  return a;
}
function ownChip(){ return F.own==="all" ? [] : [["own","Cơ sở",F.own==="tn"?"tư nhân":"công lập"]];
}
function resetF(k){
  var all=k==="*";
  if(all||k==="npp") F.npp="all";
  if(all||k==="brand") F.brand="all";
  if(all||k==="type") setType("all");
  if(all||k==="res") F.res="win";
  if(all||k==="color"){ F.color="src"; try{ localStorage.setItem("tm_color","src"); }catch(_){} }
  if(all||k==="own"){ F.own="all"; try{ localStorage.setItem("tm_own","all"); }catch(_){} }
}
var ICON_F='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 3.5h12M4.5 8h7M7 12.5h2"/></svg>';
function fchips(){
  var box=document.getElementById("fchips"), fu=F.view==="fu", a=(F.view!=="win"?[]:activeFilters()).concat(ownChip()), b=document.getElementById("f-more");
  b.innerHTML=ICON_F+'<span class="tx">Bộ lọc</span>'+(a.length?'<span class="n">'+a.length+'</span>':'');
  b.classList.toggle("on", !!a.length); b.title = a.length ? a.length+" bộ lọc đang bật" : "Nguồn, hãng, loại sản phẩm, tô màu";
  var sum = (fu ? ["Theo dõi thầu"].concat(FU.sum()) : F.view==="act" ? ["Hoạt động"].concat(ACT.sum()) : ["Kết quả thầu", periodLabel(), mLabel()]).concat(SCOPE.pic() && F.view!=="act" ? [SCOPE.pic()] : []);
  box.innerHTML='<button class="fc sum" type="button" data-fopen="1">'+esc(sum.join(" · "))+' ▾</button>'+
    a.map(function(x){ return '<span class="fc"><span>'+x[1]+': <b>'+esc(x[2])+'</b></span><button type="button" data-fx="'+x[0]+'" aria-label="Bỏ lọc '+x[1]+'" title="Bỏ lọc">×</button></span>'; }).join("")+
    (a.length>1?'<button class="lnk fcx" type="button" data-fx="*">Bỏ tất cả</button>':'');
  box.hidden = !a.length && !MQ.matches;
  hdrH();
}
function hdrH(){ var t=document.getElementById("top"); if(t) document.documentElement.style.setProperty("--hdr", t.offsetHeight+"px"); }
function curSeg(hide){
  var el=document.getElementById("f-cur"); if(!el) return; el.hidden=!!hide;
  el.title="Đơn vị tiền · tỷ giá cố định 1 USD = "+nfmt(USD_RATE)+" VND";
  el.innerHTML=[["vnd","VND"],["usd","USD"]].map(function(o){ var on=CUR===o[0]; return '<button type="button" data-v="'+o[0]+'" class="'+(on?"on":"")+'" aria-pressed="'+on+'">'+o[1]+'</button>'; }).join("");
  el.onclick=function(e){ var b=e.target.closest("button"); if(!b || b.dataset.v===CUR) return; CUR=b.dataset.v; try{ localStorage.setItem("tm_cur",CUR); }catch(_){} renderFilters(); refresh(); };
}
function renderFilters(){
  var fu=F.view==="fu", act=F.view==="act", win=!fu && !act;
  document.body.classList.toggle("fu", fu); document.body.classList.toggle("act", act);
  var wn=FU.warnCount();
  seg("f-view", [["win","Kết quả thầu"],["fu","Theo dõi thầu"+(wn?'<span class="wb" title="'+wn+' hợp đồng MANI sắp hết hiệu lực chưa cập nhật theo dõi">'+wn+'</span>':'')],["act","Hoạt động"]], "view", function(){ try{ localStorage.setItem("tm_view",F.view); }catch(_){} if(F.view==="fu") FU.ensure(); if(F.view==="act") ACT.ensure(); });
  document.getElementById("f-period").hidden=true; document.getElementById("f-m").hidden=!win;
  SCOPE.ui();
  seg("f-own", [["all","Công lập + tư nhân"],["cl","Công lập"],["tn","Tư nhân"]], "own", function(){ try{ localStorage.setItem("tm_own",F.own); }catch(_){} });
  ACT.filters();
  document.getElementById("fu-add").hidden=!fu;
  FU.filters();
  var pe=document.getElementById("va-per");                                     /* kỳ chung: Kết quả thầu + Theo dõi thầu (Hoạt động: ACT.filters) */
  if(!act){ pe.hidden=false; PERX.render(pe, { get:function(){ return F.pk; }, set:function(p){ setPk(p); renderFilters(); refresh(); }, kinds:["w","m","q","fy"], min:FY_MIN, extra:true,
    title:"Chọn kỳ: tuần · tháng · quý · kỳ (FY) — mặc định kỳ hiện tại FY"+FY_NOW }); }
  seg("f-m", [["v","Giá trị"],["q","Số lượng"]], "m");
  curSeg(act);
  seg("f-npp", [["all","Mọi nguồn"],["NPP","2 NPP"],["HUNGVI","Hùng Vĩ"],["ICARE","iCare"],["KQTT","KQTT thị trường"]], "npp");
  seg("f-brand", [["all","Mọi hãng"],["mani","MANI"],["other","Hãng khác"]], "brand");
  var ts=document.getElementById("f-type"), opts=[["all","Mọi sản phẩm",0],["dao","Dao — tất cả",0]];
  GR.forEach(function(g){ if(g.top==="dao") opts.push([g.k,g.name+(g.sub?" ("+g.sub+")":""),1]); });
  opts.push(["chi","Chỉ khâu — tất cả",0]); GR.forEach(function(g){ if(g.top==="chi") opts.push([g.k,g.name,1]); });
  ts.innerHTML=opts.map(function(o){ return '<option value="'+o[0]+'"'+(F.type===o[0]?" selected":"")+'>'+(o[2]?"  · ":"")+o[1]+'</option>'; }).join("");
  ts.onchange=function(){ setType(ts.value); renderFilters(); refresh(); };
  seg("f-res", [["win","Chỉ gói trúng"],["all","Mọi gói tham dự"]], "res");
  seg("f-color", [["src","Theo nguồn"],["mani","Thị phần MANI"]], "color", function(){ try{ localStorage.setItem("tm_color",F.color); }catch(_){} });
  document.getElementById("f-color-h").textContent = F.color==="mani" ? "Tỉnh tô theo % MANI trong gói trúng (MANI ⇄ hãng khác, theo "+mLabel().toLowerCase()+"). So sánh đủ khi nguồn gồm KQTT thị trường." : "Hùng Vĩ · iCare · cả 2 NPP · KQTT thị trường; đậm hơn = "+mLabel().toLowerCase()+" cao hơn.";
  var ot=document.getElementById("oldtog"); if(ot && G.old) ot.checked=!G.old.classList.contains("off");
  fchips();
}

/* ═════════ BẢN ĐỒ ═════════ */
var svg=document.getElementById("map"), NS="http://www.w3.org/2000/svg";
var G = {}, PROV=[], OLDP=[], VB0, vb, sel=-1, selOld=null;
var LON0=102.0, LON1=117.8, LAT0=7.2, LAT1=23.5;
function my(lat){ return Math.log(Math.tan(Math.PI/4 + lat*Math.PI/360)); }
var SC = 1000/((LON1-LON0)*Math.PI/180), Y1=my(LAT1);
function px(lon){ return (lon-LON0)*Math.PI/180*SC; }
function py(lat){ return (Y1-my(lat))*SC; }
var W=1000, H=Math.round(py(LAT0));

function topoDecode(topo, name){
  var tf=topo.transform, arcs=topo.arcs.map(function(a){
    var x=0,y=0; return a.map(function(p){ x+=p[0]; y+=p[1]; return [x*tf.scale[0]+tf.translate[0], y*tf.scale[1]+tf.translate[1]]; });
  });
  function arc(i){ var a = i<0 ? arcs[~i].slice().reverse() : arcs[i]; return a; }
  function ring(ids){ var pts=[]; ids.forEach(function(i,k){ var a=arc(i); pts=pts.concat(k? a.slice(1):a); }); return pts; }
  return topo.objects[name].geometries.map(function(g){
    var polys = g.type==="Polygon" ? [g.arcs] : g.type==="MultiPolygon" ? g.arcs : [];
    return { props:g.properties||{}, polys:polys.map(function(p){ return p.map(ring); }) };
  });
}
function pathOf(polys){
  var d=""; polys.forEach(function(p){ p.forEach(function(r){
    r.forEach(function(pt,i){ d += (i?"L":"M") + px(pt[0]).toFixed(1)+","+py(pt[1]).toFixed(1); }); d+="Z"; }); });
  return d;
}
function geoInfo(polys){
  var best=null, bestA=0, x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  polys.forEach(function(p){
    var r=p[0], A=0, cx=0, cy=0;
    for(var i=0;i<r.length;i++){ var a=r[i], b=r[(i+1)%r.length]; var X0=px(a[0]),Y0=py(a[1]),X1=px(b[0]),Y1_=py(b[1]); var c=X0*Y1_-X1*Y0; A+=c; cx+=(X0+X1)*c; cy+=(Y0+Y1_)*c;
      x0=Math.min(x0,X0); y0=Math.min(y0,Y0); x1=Math.max(x1,X0); y1=Math.max(y1,Y0); }
    A/=2; if(Math.abs(A)>bestA){ bestA=Math.abs(A); best=[cx/(6*A), cy/(6*A)]; }
  });
  return { c:best, bb:[x0,y0,x1,y1], area:bestA };
}
function el(tag, attrs, parent){ var e=document.createElementNS(NS,tag); for(var k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e; }

/* điểm neo nhãn tay cho tỉnh hẹp / đảo (lon, lat) */
var LBL_FIX = { "Hồ Chí Minh":[106.75,10.95], "Hải Phòng":[106.45,20.85], "Đà Nẵng":[107.95,15.75], "Khánh Hòa":[108.95,12.0], "Quảng Ninh":[107.3,21.25], "Hà Nội":[105.75,21.05], "Cà Mau":[105.1,9.1], "An Giang":[105.15,10.35] };
var ISL = [
  ["QĐ. Hoàng Sa","(Đà Nẵng)",[[112.34,16.83],[111.61,16.53],[111.20,15.78],[112.73,16.67],[111.51,16.45],[112.25,16.97],[111.75,16.45],[112.53,16.98],[111.90,16.55]]],
  ["QĐ. Trường Sa","(Khánh Hòa)",[[111.92,8.65],[114.33,11.43],[114.36,10.18],[114.33,9.88],[113.20,7.89],[114.48,10.38],[113.69,8.97],[113.30,8.18],[114.95,10.55],[115.80,10.40],[112.90,8.85],[114.65,11.05],[116.15,9.75],[115.35,8.45]]]
];

function buildMap(){
  var newG = topoDecode(window.VN_TOPO,"new"), oldG = topoDecode(window.VN_TOPO,"old");
  VB0 = homeBox(); vb = Object.assign({},VB0);
  svg.setAttribute("viewBox", vb.x+" "+vb.y+" "+vb.w+" "+vb.h);
  svg.setAttribute("preserveAspectRatio","xMidYMid meet");
  var defs = el("defs",{},svg);
  defs.innerHTML='<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#CFE2F3"/><line x1="0" y1="0" x2="0" y2="6" stroke="#9DB6D6" stroke-width="2"/></pattern>';
  G.root = el("g",{},svg);
  G.sea  = el("g",{},G.root);
  G.seaT = el("text",{x:px(111.6),y:py(13.6),"class":"sea"},G.sea); G.seaT.textContent="BIỂN ĐÔNG";
  G.prov = el("g",{},G.root);
  G.old  = el("g",{},G.root);
  G.isl  = el("g",{"class":"isl"},G.root);
  G.pulse= el("g",{},G.root);
  G.lbl  = el("g",{},G.root);
  G.bub  = el("g",{},G.root);
  G.hm   = el("g",{},G.root);

  newG.forEach(function(g){
    var i = NEWIDX[nk(g.props.n)]; if(i==null) return;
    var info = geoInfo(g.polys);
    var fix = LBL_FIX[NEW[i][0]]; if(fix) info.c=[px(fix[0]),py(fix[1])];
    var p = el("path",{d:pathOf(g.polys),"class":"prov","data-i":i,fill:"var(--land)"},G.prov);
    PROV[i] = { el:p, info:info };
  });
  oldG.forEach(function(g){
    var k = nk(g.props.o), info = geoInfo(g.polys);
    var pe=el("path",{d:pathOf(g.polys),"class":"old"},G.old);
    OLDP.push({ k:k, n:OLD2NEW[k], info:info, name:oldName(k), d:pe.getAttribute("d") });
  });
  ISL.forEach(function(s){
    var xs=0, ys=0;
    s[2].forEach(function(pt){ el("circle",{cx:px(pt[0]),cy:py(pt[1]),r:1.6},G.isl); xs+=px(pt[0]); ys+=py(pt[1]); });
    var cx=xs/s[2].length, cy=ys/s[2].length;
    var up=s[0].indexOf("Hoàng")>=0;
    var t=el("text",{x:cx,y:cy,"data-dy":up?-22:26},G.isl); t.textContent=s[0];
    var t2=el("text",{x:cx,y:cy,"data-dy":up?-9:39,"data-s":"1"},G.isl); t2.textContent=s[1];
    s.txt=[t,t2]; s.cy=cy;
  });
  wireMap();
}
/* phần bản đồ nhìn thấy: điện thoại trừ bảng chi tiết trượt từ dưới (khung đích, không phải lúc đang trượt) */
function visArea(){ var r=svg.getBoundingClientRect(), W0=r.width||800, H0=r.height||700, vh=H0; if(MQ.matches && SHEET) vh=Math.max(150, H0-SHEET.target()); return {w:W0, h:vh, H:H0}; }
function homeBox(){
  var bb=[px(102.1), py(23.45), px(116.4), py(7.6)], tb=SCOPE.bbox();
  if(tb) bb=[tb[0]-(tb[2]-tb[0])*0.06, tb[1]-(tb[3]-tb[1])*0.04, tb[2]+(tb[2]-tb[0])*0.06, tb[3]+(tb[3]-tb[1])*0.04];
  var v=visArea(), ar=v.w/Math.max(1,v.h);
  var w=bb[2]-bb[0], h=bb[3]-bb[1]; w*=1.04; h*=1.04;
  if(w/h < ar) w=h*ar; else h=w/ar;
  return { x:(bb[0]+bb[2])/2-w/2 - (ar>1.25 ? w*0.06 : 0), y:(bb[1]+bb[3])/2-h/2, w:w, h:h*v.H/v.h };
}
function oldName(k){ for(var i=0;i<NEW.length;i++) for(var j=0;j<NEW[i][2].length;j++) if(nk(NEW[i][2][j])===k) return NEW[i][2][j]; return k; }

/* ── màu ── */
function mix(hex, t){ // t 0..1: trộn từ nền nhạt tới màu đậm
  var a=[0xE9,0xEE,0xF4], b=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
  return "#"+a.map(function(v,i){ return Math.round(v+(b[i]-v)*t).toString(16).padStart(2,"0"); }).join("");
}
/* thị phần MANI: hãng khác (cam) ⇄ 50% ⇄ MANI (xanh) */
var SH_M="#1F4E8C", SH_O="#C2410C";
function shareCol(t){ var d=t-0.5; return d>=0 ? mix(SH_M, 0.3+1.26*d) : mix(SH_O, 0.3+1.26*(-d)); }
function cmOn(){ return F.view==="win" && F.color==="mani"; }
var STAT = [];
var HS = {}, HSH = {}, TAB = "ov";
/* màu theo nguồn: cả 2 NPP ⇒ tím · có NPP ⇒ màu NPP (trừ khi KQTT lớn hơn hẳn) · chỉ KQTT ⇒ màu KQTT */
function colOf(byN, by){
  if(byN.FU) return FU.color;
  by=by||{}; var hv=byN.HUNGVI||0, ic=byN.ICARE||0, kq=byN.KQTT||0;
  if(hv && ic) return BOTH;
  if(hv || ic){ if(kq && (by.KQTT||0) > (by.HUNGVI||0)+(by.ICARE||0)) return NPP.KQTT.color; return hv ? NPP.HUNGVI.color : NPP.ICARE.color; }
  return kq ? NPP.KQTT.color : "#94A3B8";
}
function srcLabel(){ return {all:"Hùng Vĩ + iCare + KQTT thị trường", NPP:"Hùng Vĩ + iCare"}[F.npp] || NPP[F.npp].name; }
function segBar(by, max){ return SRCS.map(function(k){ return by[k] ? '<i style="width:'+(by[k]/max*100)+'%;background:'+NPP[k].color+'"></i>' : ""; }).join(""); }
function computeStats(){
  if(F.view==="fu"){ FU.stats(); return; }
  if(F.view==="act"){ ACT.stats(); return; }
  STAT = NEW.map(function(){ return { n:0, v:0, val:0, qty:0, by:{}, byN:{}, hosp:{}, soon:0, list:[], q:{}, gv:{}, sh:{m:0,t:0} }; });
  HS = {}; HSH = {};
  PKGS.forEach(function(p){
    if(p.ni<0) return;
    if(p.res==="Win" && pass(p,false,{nb:1})){
      var s0=STAT[p.ni], hs=p.h ? (HSH[p.h.key]=HSH[p.h.key]||{m:0,t:0}) : null;
      p.items.forEach(function(it){ if(!itOk0(it) || it.result!=="Win") return; var v0=F.m==="q"?(+it.qty||0):(+it.value||0), mn=isMani(it);
        s0.sh.t+=v0; if(mn) s0.sh.m+=v0; if(hs){ hs.t+=v0; if(mn) hs.m+=v0; } });
    }
    if(!pass(p)) return;
    var s=STAT[p.ni], v=mv(p), x=HS[p.h.key]||(HS[p.h.key]={h:p.h, n:0, v:0, val:0, qty:0, q:{}, gv:{}, last:null, act:0, soon:0, list:[]});
    var pval=pkgValue(p), pq=pkgQty(p);
    s.n++; s.v+=v; s.val+=pval; s.qty+=pq; s.hosp[nk(p.hospital)]=1; s.list.push(p); x.val+=pval; x.qty+=pq;
    s.by[p.npp]=(s.by[p.npp]||0)+v; s.byN[p.npp]=(s.byN[p.npp]||0)+1;
    if(p.status==="warn") s.soon++;
    p.items.forEach(function(it){ if(!itOk(it) || (p.res==="Win" && it.result!=="Win")) return; s.q[it.g]=(s.q[it.g]||0)+it.qty; x.q[it.g]=(x.q[it.g]||0)+it.qty; s.gv[it.g]=(s.gv[it.g]||0)+it.value; x.gv[it.g]=(x.gv[it.g]||0)+it.value; });
    x.n++; x.v+=v; x.list.push(p);
    if(p.res==="Win" && (!x.last || (p.approve||String(p.sk)) > (x.last.approve||String(x.last.sk)))) x.last=p;
    if(p.status==="ok"||p.status==="warn") x.act++; if(p.status==="warn") x.soon++;
  });
  Object.keys(HS).forEach(function(k){ var x=HS[k]; x.dao=0; x.chi=0; GR.forEach(function(g){ var q=x.q[g.k]||0; if(g.top==="dao") x.dao+=q; else if(g.top==="chi") x.chi+=q; }); });
}
function tabVal(x,t){ return x.v; }
function tabUnit(t){ return t==="value" ? "" : t==="dao" ? "cái" : t==="chi" ? "sợi" : (GK[t]?GK[t].u:""); }
function rankList(){ return Object.keys(HS).map(function(k){ return HS[k]; }).filter(function(x){ return x.v>0; }).sort(function(a,b){ return b.v-a.v || b.n-a.n; }); }
function paintMap(){
  var vals = STAT.map(function(s){ return s.v; }).filter(function(v){ return v>0; });
  var max = Math.max.apply(null, vals.concat([1])), min = Math.min.apply(null, vals.concat([max]));
  var lmin=Math.log(min), lspan=Math.max(1e-9, Math.log(max)-lmin);
  var cm=cmOn();
  PROV.forEach(function(P,i){
    if(!P) return;
    var s=STAT[i], fill="var(--land)";
    if(cm){ if(s.sh.t>0) fill=shareCol(s.sh.m/s.sh.t); }
    else if(s.n && F.view==="fu") fill = mix(FU.pcol(s), 0.8);                     /* Theo dõi thầu: màu = tiến độ (giai đoạn) */
    else if(ACT.cov()){ if(s.ct) fill=ACT.covCol(s.cv/s.ct); }                    /* Độ phủ: % cơ sở trúng thầu được chăm sóc */
    else if(s.n){
      var col = F.view==="act" ? ACT.pcol(s) : colOf(s.byN, s.by);       /* Hoạt động: màu PIC (nhiều lượt nhất ở tỉnh), đậm / nhạt theo số lượt */
      var t = s.v ? 0.34 + 0.6*(vals.length>1 ? (Math.log(s.v)-lmin)/lspan : 1) : 0.34;
      fill = mix(col, Math.min(t,0.95));
    }
    P.el.setAttribute("fill", fill);
    P.el.classList.toggle("sel", i===sel);
    P.el.classList.toggle("dim", sel>=0 && i!==sel);
    P.el.classList.toggle("out", !SCOPE.inProv(i) && !(F.view==="act" && s.n));      /* Hoạt động: tỉnh ngoài địa bàn mà PIC có lượt viếng thăm ⇒ không làm mờ */
  });
  // nhãn (huy hiệu số gói) + vòng nhắc hết hạn — cỡ tính theo điểm ảnh màn hình
  G.lbl.innerHTML=""; G.pulse.innerHTML="";
  var u0 = unitPx();
  G.seaT.setAttribute("font-size",(15*u0).toFixed(2)); G.seaT.setAttribute("letter-spacing",(5*u0).toFixed(2));
  [].forEach.call(G.isl.querySelectorAll("text"),function(t){ t.setAttribute("font-size",((t.dataset.s?10:11.5)*u0).toFixed(2)); t.setAttribute("stroke-width",(3*u0).toFixed(2));
    t.setAttribute("y",(ISL[t.textContent.indexOf("Hoàng")>=0||t.textContent==="(Đà Nẵng)"?0:1].cy+ (+t.dataset.dy)*u0).toFixed(2)); });
  [].forEach.call(G.isl.querySelectorAll("circle"),function(c){ c.setAttribute("r",(2*u0).toFixed(2)); });
  var u = u0, k = VB0.w/vb.w, motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  PROV.forEach(function(P,i){
    if(!P || !P.info.c) return;
    var s=STAT[i], c=P.info.c, showName = k>1.7 || i===sel;
    if(i===sel){ if(!s.n && showName){ var z=el("text",{x:c[0],y:c[1],"class":"lbl mute","font-size":(12*u).toFixed(2),"stroke-width":(3*u).toFixed(2)},G.lbl); z.textContent=NEW[i][0]; } return; }
    var fuv = F.view==="fu";
    if(cm ? s.sh.t>0 : (s.n || (fuv && s.warn))){
      var cov=ACT.cov(), col = cm ? shareCol(s.sh.m/s.sh.t) : cov ? ACT.covCol(s.cv/s.ct) : fuv ? (s.n ? FU.pcol(s) : "#B42318") : F.view==="act" ? ACT.pcol(s) : colOf(s.byN, s.by), lab = cm ? Math.round(s.sh.m/s.sh.t*100)+"%" : cov ? s.cv+"/"+s.ct : s.n ? String(s.n) : "!";
      var r = (cm ? 13 : s.n>=10? 12 : 10)*u;
      if(s.soon && motion && !cm) el("circle",{cx:c[0],cy:c[1],r:r.toFixed(2),"class":"pulse"+(fuv?" wr":"")},G.pulse);
      var g=el("g",{"class":"bdg"},G.lbl);
      el("circle",{cx:c[0],cy:c[1],r:r.toFixed(2),stroke:col},g);
      var t=el("text",{x:c[0],y:(c[1]+(lab.length>3?3.4:4)*u).toFixed(2),"font-size":((lab.length>3?9:lab.length>2?10:11.5)*u).toFixed(2)},g); t.textContent=lab;
      if(showName){ var n=el("text",{x:c[0],y:(c[1]+r+15*u).toFixed(2),"class":"lbl","font-size":(12*u).toFixed(2),"stroke-width":(3*u).toFixed(2)},G.lbl); n.textContent=NEW[i][0]; }
    } else if(k>2.2 && (sel<0 || i===sel)){
      var m=el("text",{x:c[0],y:c[1],"class":"lbl mute","font-size":(11.5*u).toFixed(2),"stroke-width":(3*u).toFixed(2)},G.lbl); m.textContent=NEW[i][0];
    }
  });
  paintBubbles();
  paintLegend();
}
function paintBubbles(){
  G.bub.innerHTML=""; G.hm.innerHTML=""; svg.parentNode.classList.toggle("zoomed", sel>=0);
  if(sel<0) return;
  var u = unitPx();
  if(NEW[sel][2].length>1) OLDP.forEach(function(o){
    if(o.n!==sel || !o.info.c) return;
    var t=el("text",{x:o.info.c[0],y:o.info.c[1],"class":"oldlbl","font-size":(11*u).toFixed(2),"stroke-width":(3*u).toFixed(2)},G.bub); t.textContent=o.name+" (cũ)";
  });
  var xs=Object.keys(HS).map(function(k){ return HS[k]; }).filter(function(x){ return x.h.ni===sel && x.h.xy && (!selOld || x.h.oi===selOld); });
  if(selH && selH.ni===sel && selH.xy && !HS[selH.key]) xs.push({h:selH, v:0, n:0, top:0, fu:[]});   // cơ sở đang xem chưa có gói trong bộ lọc
  /* chấm xám = cơ sở y tế công lập (danh mục csyt.js, có toạ độ) chưa có gói trong bộ lọc — bấm để xem thông tin */
  var have={}; xs.forEach(function(x){ have[x.h.key]=1; });
  if(F.view!=="act") (FBYP[sel]||[]).forEach(function(f){
    if(!f.ll || (selOld && f.oi && f.oi!==selOld) || (f.h && have[f.h.key]) || !ownOk(isPv(f))) return;
    var g=el("g",{"class":"fd"+(isPv(f)?" pv":""),"data-f":f.id},G.hm); el("circle",{cx:px(f.ll[0]).toFixed(2),cy:py(f.ll[1]).toFixed(2),r:((MQ.matches?4.2:3.4)*u).toFixed(2)},g);
  });
  if(!xs.length) return;
  var mx=Math.max.apply(null, xs.map(function(x){ return x.v; }).concat([1])), rk={};
  if(F.view!=="fu" && !ACT.cov()) rankList().slice(0,10).forEach(function(y,i){ rk[y.h.key]=i+1; });
  xs.sort(function(a,b){ return a.v-b.v; });                       // nhỏ vẽ trước, lớn đè lên
  var boxes=[], lab=xs.slice().sort(function(a,b){ return (selH&&b.h===selH?1e18:0)-(selH&&a.h===selH?1e18:0) || b.v-a.v; });
  var fs=11.5*u, showN=lab.length<=14?lab.length:Math.max(8, Math.round(14*Math.min(2, (VB0.w/vb.w)/8)));
  var place={};
  lab.forEach(function(x,i){
    if(i>=showN && !(selH&&x.h===selH)) return;
    var r=(6.5+9*Math.sqrt(x.v/mx))*u, nm=short(x.h.name), w=nm.length*fs*0.56, hgt=fs*1.2;
    var bx=[x.h.xy[0]+r+3*u, x.h.xy[1]-hgt/2, x.h.xy[0]+r+3*u+w, x.h.xy[1]+hgt/2];
    if(bx[2]>vb.x+vb.w) bx=[x.h.xy[0]-r-3*u-w, bx[1], x.h.xy[0]-r-3*u, bx[3]];
    for(var j=0;j<boxes.length;j++){ var o=boxes[j]; if(!(bx[2]<o[0]||bx[0]>o[2]||bx[3]<o[1]||bx[1]>o[3])) return; }
    boxes.push(bx); place[x.h.key]=bx;
  });
  xs.forEach(function(x){
    var r=(F.view==="act" && !x.v ? (x.cov===false?5.4:4.2) : 6.5+9*Math.sqrt(x.v/mx))*u, h=x.h, hs=HSH[h.key], col=F.view==="act" ? ACT.col(x) : F.view==="fu" ? FU.col(x) : (cmOn() && hs && hs.t>0) ? shareCol(hs.m/hs.t) : colOf(h.npps);
    var g=el("g",{"class":"hm"+(rk[h.key]?" top":"")+(selH&&selH===h?" on":""),"data-h":h.key},G.hm);
    if(rk[h.key] || (selH&&selH===h)) el("circle",{cx:h.xy[0],cy:h.xy[1],r:(r+4*u).toFixed(2),"class":"ring"},g);
    if(F.view==="fu" && x.warn) el("circle",{cx:h.xy[0],cy:h.xy[1],r:(r+(selH===h?7.5:4)*u).toFixed(2),"class":"wr"},g);
    el("circle",{cx:h.xy[0],cy:h.xy[1],r:r.toFixed(2),"class":"c",stroke:col},g);
    el("circle",{cx:h.xy[0],cy:h.xy[1],r:(r*0.45).toFixed(2),fill:col,stroke:"none"},g);
    var bx=place[h.key];
    if(bx){ var t=el("text",{x:bx[0].toFixed(2),y:(h.xy[1]+fs*0.36).toFixed(2),"font-size":fs.toFixed(2),"stroke-width":(3*u).toFixed(2)},g);
      t.textContent=(rk[h.key]?"#"+rk[h.key]+" ":"")+short(h.name); }
  });
}
function short(n){ n=String(n||""); n=n.replace(/^bệnh viện\s+/i,"BV ").replace(/^trung tâm y tế\s+/i,"TTYT ").replace(/đa khoa/ig,"ĐK"); return n.length>30?n.slice(0,28)+"…":n; }
/* chú giải: thu gọn được; tự thu gọn khi phóng to vào 1 tỉnh (không che chấm bệnh viện), bấm "Chú giải" để mở */
var LG={ user:null, tmp:null,
  eff:function(){ if(LG.user==null){ var v=null; try{ v=localStorage.getItem("tm_legend"); }catch(_){} LG.user = v ? v==="1" : !MQ.matches; }
    return LG.tmp!=null ? LG.tmp : (sel<0 && F.view!=="fu" ? LG.user : false); },
  toggle:function(){ var now=!LG.eff(); if(sel<0){ LG.user=now; LG.tmp=null; try{ localStorage.setItem("tm_legend", now?"1":"0"); }catch(_){} } else LG.tmp=now; paintLegend(); } };
function lgWrap(L, inner){
  var open=LG.eff();
  L.className="legend"+(open?"":" min");
  L.innerHTML='<button class="lgt" type="button" id="lg-t" aria-expanded="'+open+'">Chú giải <i aria-hidden="true">▾</i></button><div class="lgb">'+inner+'</div>';
  document.getElementById("lg-t").onclick=LG.toggle;
}
function paintLegend(){
  var L=document.getElementById("legend");
  var dotRow = sel>=0 ? (F.own!=="tn"?'<div class="row"><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="3.6" fill="#A3AFBF" stroke="#fff"/></svg> Cơ sở công lập chưa có gói (trong bộ lọc)</div>':'')+
    (F.own!=="cl"?'<div class="row"><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="3.6" fill="#fff" stroke="'+PVCOL+'" stroke-width="1.8"/></svg> Cơ sở tư nhân · mua sắm theo hợp đồng</div>':'') : '';
  if(F.view==="fu") return lgWrap(L, FU.legend()+dotRow);
  if(F.view==="act") return lgWrap(L, ACT.legend());
  var ramp=function(c){ return '<span class="ramp">'+[0.3,0.48,0.66,0.84,0.95].map(function(t){ return '<i style="background:'+mix(c,t)+'"></i>'; }).join("")+'</span>'; };
  var bub = sel>=0 ? '<div class="row"><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="#fff" stroke="'+NPP.HUNGVI.color+'" stroke-width="2.5"/><circle cx="9" cy="9" r="2.6" fill="'+NPP.HUNGVI.color+'"/></svg> Bệnh viện (to = '+(F.m==="q"?"nhiều SL":"giá trị lớn")+', vòng vàng = top 10)</div>'+dotRow : '';
  if(cmOn()){
    var warn = (F.npp!=="all" && F.npp!=="KQTT") ? '<div class="row" style="color:var(--warn)">Nguồn đang lọc chỉ có NPP (= MANI). Chọn Mọi nguồn để so với hãng khác.</div>'
      : F.cat==="chi" ? '<div class="row" style="color:var(--warn)">KQTT thị trường hiện chỉ có dao — chỉ khâu chưa so được.</div>' : '';
    return lgWrap(L,
      '<div class="row"><span class="ramp" style="width:150px">'+[0,0.15,0.3,0.45,0.55,0.7,0.85,1].map(function(t){ return '<i style="background:'+shareCol(t)+'"></i>'; }).join("")+'</span></div>'+
      '<div class="row" style="justify-content:space-between;width:150px;margin-top:0"><span>Hãng khác</span><span>MANI</span></div>'+
      '<div class="row">Số trên tỉnh = % MANI theo '+(F.m==="q"?"số lượng":"giá trị")+' trúng</div>'+warn+bub);
  }
  lgWrap(L,
    '<div class="row">'+ramp(NPP.HUNGVI.color)+' Hùng Vĩ</div>'+
    '<div class="row">'+ramp(NPP.ICARE.color)+' iCare</div>'+
    '<div class="row"><span class="ramp" style="width:18px"><i style="background:'+mix(BOTH,.7)+'"></i></span> Cả 2 NPP</div>'+
    '<div class="row">'+ramp(NPP.KQTT.color)+' KQTT thị trường</div>'+
    '<div class="row" style="color:var(--t3)">Đậm hơn = '+(F.m==="q"?"số lượng":"giá trị")+' cao hơn · số = số gói</div>'+
    '<div class="row"><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="#FF1F5A" stroke-width="2.4"/></svg> Có hợp đồng còn ≤ '+SOON_MONTHS+' tháng</div>'+bub);
}

/* ── phóng to / kéo ── */
function unitPx(){ var r=svg.getBoundingClientRect(); var s=Math.min(r.width/vb.w, r.height/vb.h); return (s>0 ? 1/s : 1) * (r.width<600 ? 0.8 : 1); }
var anim=null;
function setVB(v){ if(!(v.w>0 && v.h>0 && isFinite(v.x) && isFinite(v.y))) return; vb=v; svg.setAttribute("viewBox", v.x+" "+v.y+" "+v.w+" "+v.h); }
function animateTo(t, ms){
  if(anim) cancelAnimationFrame(anim);
  var s=Object.assign({},vb), t0=performance.now(); ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : (ms||650);
  (function step(now){
    var u=Math.max(0, Math.min(1,(now-t0)/ms)), e=   /* mốc khung hình đầu có thể sớm hơn t0 (máy chậm) ⇒ u âm ⇒ khung nhìn âm */
      u<.5? 4*u*u*u : 1-Math.pow(-2*u+2,3)/2;
    setVB({x:s.x+(t.x-s.x)*e, y:s.y+(t.y-s.y)*e, w:s.w+(t.w-s.w)*e, h:s.h+(t.h-s.h)*e});
    if(u<1) anim=requestAnimationFrame(step); else { anim=null; paintMap(); }
  })(t0);
}
function fitBox(bb, pad, minDiv){
  var v=visArea(), ar=v.w/Math.max(1,v.h);
  var w=bb[2]-bb[0], h=bb[3]-bb[1]; pad=pad||.18;
  w*= (1+pad*2); h*=(1+pad*2);
  if(w/h < ar) w=h*ar; else h=w/ar;
  var minW = VB0.w/(minDiv||10); if(w<minW){ h*=minW/w; w=minW; }
  return { x:(bb[0]+bb[2])/2-w/2, y:(bb[1]+bb[3])/2-h/2, w:w, h:h*v.H/v.h };   // phần dưới (bị bảng trượt che) để trống
}
function zoomBy(f, cx, cy){
  var nw=Math.max(VB0.w/14, Math.min(VB0.w*1.2, vb.w*f)), nh=vb.h*nw/vb.w;
  if(cx==null){ cx=vb.x+vb.w/2; cy=vb.y+vb.h/2; }
  var nx=cx-(cx-vb.x)*nw/vb.w, ny=cy-(cy-vb.y)*nh/vb.h;
  setVB({x:nx,y:ny,w:nw,h:nh}); schedPaint();
}
var pt=null; function schedPaint(){ if(pt) return; pt=requestAnimationFrame(function(){ pt=null; paintMap(); }); }
function svgPt(e){ var r=svg.getBoundingClientRect(); var sx=vb.w/r.width, sy=vb.h/r.height, s=Math.max(sx,sy);
  var ox=(r.width*s-vb.w)/2, oy=(r.height*s-vb.h)/2; return { x:vb.x+(e.clientX-r.left)*s-ox, y:vb.y+(e.clientY-r.top)*s-oy, s:s }; }

function wireMap(){
  var tip=document.getElementById("tip"), card=svg.parentNode, drag=null, moved=false;
  svg.addEventListener("wheel",function(e){ e.preventDefault(); var p=svgPt(e); zoomBy(e.deltaY>0?1.18:1/1.18, p.x, p.y); },{passive:false});
  var pts={}, pinch=null;
  function npts(){ return Object.keys(pts).length; }
  svg.addEventListener("pointerdown",function(e){
    pts[e.pointerId]={x:e.clientX,y:e.clientY};
    if(npts()===2){ var k=Object.keys(pts), a=pts[k[0]], b=pts[k[1]]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1}; drag=null; moved=true; return; }
    drag={x:e.clientX,y:e.clientY,vb:Object.assign({},vb),s:svgPt(e).s}; moved=false; });
  window.addEventListener("pointermove",function(e){
    if(pts[e.pointerId]) pts[e.pointerId]={x:e.clientX,y:e.clientY};
    if(pinch && npts()===2){ var k=Object.keys(pts), a=pts[k[0]], b=pts[k[1]], d=Math.hypot(a.x-b.x,a.y-b.y)||1, m=svgPt({clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2});
      zoomBy(pinch.d/d, m.x, m.y); pinch.d=d; return; }
    if(drag){ var dx=e.clientX-drag.x, dy=e.clientY-drag.y; if(Math.abs(dx)+Math.abs(dy)>6){ moved=true; svg.classList.add("drag"); }
      if(moved) setVB({x:drag.vb.x-dx*drag.s, y:drag.vb.y-dy*drag.s, w:drag.vb.w, h:drag.vb.h}); }
  });
  function up(e){ delete pts[e.pointerId]; if(npts()<2) pinch=null; if(drag && moved) schedPaint(); drag=null; svg.classList.remove("drag"); if(!npts()) setTimeout(function(){ moved=false; },0); }
  window.addEventListener("pointerup",up); window.addEventListener("pointercancel",up);
  svg.addEventListener("mousemove",function(e){
    var hmk=e.target.closest(".hm");
    if(hmk && HOVER && !(drag&&moved)){ var x=HS[hmk.dataset.h], r0=card.getBoundingClientRect(), tk=F.view+(ACT.cov()?"c":"")+"|h|"+hmk.dataset.h;
      if(x && tip._k!==tk){ tip._k=tk;
        if(F.view==="act" && ACT.cov() && !x.h.acc) tip.innerHTML=ACT.tipCov(x);
        else if(F.view==="act" && x.h.acc) tip.innerHTML=ACT.tipH(x);
        else if(F.view==="fu") tip.innerHTML=FU.tipH(x)+ACT.tipFac(x.h.f);
        else { var btx=brandTxt(x.list&&x.list.length?x.list:x.h.pk); tip.innerHTML='<b>'+esc(x.h.name)+'</b><br><span class="m">'+esc(NEW[x.h.ni][0])+(isPv(x.h.f)?' · tư nhân':' · công lập')+'</span>'+(btx?'<br><span class="bm">'+btx+'</span>':'')+'<br>'+x.n+' gói · '+vnd(x.val)+' · '+nfmt(x.qty)+' '+unitNow()+(x.last?'<br><span class="m">Trúng gần nhất '+lastD(x.last)+'</span>':'')+ACT.tipFac(x.h.f)+'<div class="m">Bấm để xem chi tiết</div>'; }
        tip.classList.toggle("card", !!tip.querySelector(".pvc"));
        if(!x.h.acc) CRMX.warm(x.h);
      }
      if(x){
        var tw=tip.offsetWidth||260, th=tip.offsetHeight||110, tx=e.clientX-r0.left+14, ty=e.clientY-r0.top+14;
        if(tx+tw>r0.width-6) tx=e.clientX-r0.left-tw-14; if(ty+th>r0.height-6) ty=e.clientY-r0.top-th-14; tip.style.left=Math.max(6,tx)+"px"; tip.style.top=Math.max(6,ty)+"px"; tip.style.opacity=1; return; } }
    var fdk=e.target.closest(".fd");
    if(fdk && HOVER && !(drag&&moved) && FID[fdk.dataset.f]){ var ff=FID[fdk.dataset.f], r1=card.getBoundingClientRect();
      if(tip._k!=="f|"+ff.id){ tip._k="f|"+ff.id;
      tip.classList.remove("card"); tip.innerHTML='<b>'+esc(ff.name)+'</b><br><span class="m">'+esc(CT[ff.t]||"Cơ sở y tế")+(isPv(ff)?' · <b style="color:'+PVCOL+'">tư nhân</b>':(ff.lv?' · '+esc(ff.lv):'')+' · công lập')+'</span><br><span class="m">'+(isPv(ff)?'Mua sắm theo hợp đồng mua sắm (không đấu thầu) — bấm để xem':'Chưa có gói trong bộ lọc — bấm để xem thông tin')+'</span>'+ACT.tipFac(ff); }
      var tw1=tip.offsetWidth||260, th1=tip.offsetHeight||80, tx1=e.clientX-r1.left+14, ty1=e.clientY-r1.top+14;
      if(tx1+tw1>r1.width-6) tx1=e.clientX-r1.left-tw1-14; if(ty1+th1>r1.height-6) ty1=e.clientY-r1.top-th1-14; tip.style.left=Math.max(6,tx1)+"px"; tip.style.top=Math.max(6,ty1)+"px"; tip.style.opacity=1; return; }
    var t=e.target.closest(".prov"); if(!t || drag&&moved || !HOVER){ tip.style.opacity=0; tip._k=null; return; }
    var i=+t.dataset.i, s=STAT[i], r=card.getBoundingClientRect();
    if(tip._k===F.view+"|p|"+i){ var tw2=tip.offsetWidth||260, th2=tip.offsetHeight||110, x2=e.clientX-r.left+14, y2=e.clientY-r.top+14;
      if(x2+tw2>r.width-6) x2=e.clientX-r.left-tw2-14; if(y2+th2>r.height-6) y2=e.clientY-r.top-th2-14; tip.style.left=Math.max(6,x2)+"px"; tip.style.top=Math.max(6,y2)+"px"; tip.style.opacity=1; return; }
    tip._k=F.view+"|p|"+i;
    if(F.view==="act") tip.innerHTML=ACT.tipP(i); else if(F.view==="fu") tip.innerHTML=FU.tipP(i); else
    tip.innerHTML='<b>'+esc(NEW[i][0])+'</b> <span class="m">· '+REGION[NEW[i][1]]+'</span><br>'+
      (NEW[i][2].length>1||NEW[i][2][0]!==NEW[i][0] ? '<span class="m">Gồm: '+esc(NEW[i][2].join(", "))+'</span><br>' : '')+
      (s.n ? (F.res==="win"?'Gói trúng: ':'Gói tham dự: ')+'<b>'+s.n+'</b> · '+Object.keys(s.hosp).length+' bệnh viện<br>Giá trị: <b>'+vnd(s.val)+'</b> · SL: <b>'+nfmt(s.qty)+' '+unitNow()+'</b>'+
        '<br><span class="m">'+SRCS.filter(function(k){ return s.byN[k]; }).map(function(k){ return NPP[k].name+" "+s.byN[k]; }).join(" · ")+'</span>'+(s.soon?'<br><span style="color:#FFD08A">'+s.soon+' hợp đồng sắp hết hạn</span>':'')
        : '<span class="m">Chưa có gói '+(F.res==="win"?"trúng":"tham dự")+' trong kỳ lọc</span>')+
      (s.sh.t>0 && (cmOn() || F.npp==="all" || F.npp==="KQTT") ? '<br>Thị phần MANI: <b>'+Math.round(s.sh.m/s.sh.t*100)+'%</b> <span class="m">('+(F.m==="q"?"số lượng":"giá trị")+' trúng)</span>' : '');
    tip.classList.toggle("card", !!tip.querySelector(".pvc"));
    var tw=tip.offsetWidth||260, th=tip.offsetHeight||110, x=e.clientX-r.left+14, y=e.clientY-r.top+14;
    if(x+tw>r.width-6) x=e.clientX-r.left-tw-14; if(y+th>r.height-6) y=e.clientY-r.top-th-14; x=Math.max(6,x); y=Math.max(6,y);
    tip.style.left=x+"px"; tip.style.top=y+"px"; tip.style.opacity=1;
  });
  svg.addEventListener("mouseleave",function(){ tip.style.opacity=0; tip._k=null; });
  svg.addEventListener("click",function(e){
    if(moved) return;
    if(ACT.picking()){ var pp=svgPt(e); tip.style.opacity=0; ACT.pickAt(pp.x, pp.y); return; }     /* đang ghim vị trí khách hàng */
    var hmk=e.target.closest(".hm"); if(hmk && HK[hmk.dataset.h]){ tip.style.opacity=0; selectHosp(HK[hmk.dataset.h]); return; }
    var fdk=e.target.closest(".fd"); if(fdk && FID[fdk.dataset.f]){ tip.style.opacity=0; selectHosp(hospOf(FID[fdk.dataset.f])); return; }
    tip.style.opacity=0;
    var t=e.target.closest(".prov"); if(!t){ if(sel>=0) goUp(); return; }   // bấm ra biển ⇒ lùi 1 cấp
    selectProv(+t.dataset.i);
  });
  document.getElementById("zin").onclick=function(){ zoomBy(1/1.4); };
  document.getElementById("zout").onclick=function(){ zoomBy(1.4); };
  document.getElementById("zhome").onclick=function(){ selectProv(-1); };
  window.addEventListener("resize",function(){ hdrH(); if(SHEET) SHEET.apply(); var was=(sel<0 && Math.abs(vb.w-VB0.w)<1); VB0=homeBox(); if(was) setVB(VB0); });
  window.addEventListener("keydown",function(e){ if(e.key==="Escape" && !e.target.matches("input")) goUp(); });
  window.addEventListener("resize",function(){ schedPaint(); });
}
function crumbSet(){
  var c=document.getElementById("crumb"), i=sel;
  var home=SCOPE.pic() ? "Địa bàn "+SCOPE.pic() : "Toàn quốc";
  if(i<0){ c.innerHTML="<b>"+esc(home)+"</b>"; return; }
  if(selH) c.innerHTML='<button class="bk" id="cr-up" type="button" title="Về '+esc(NEW[i][0])+' (Esc)">‹ '+esc(NEW[i][0])+'</button> <b>'+esc(selH.name.length>34?selH.name.slice(0,32)+"…":selH.name)+'</b>';
  else c.innerHTML='<button class="bk" id="cr-up" type="button" title="Về '+esc(home.toLowerCase())+' (Esc)">‹ '+esc(home)+'</button> <b>'+esc(NEW[i][0])+'</b>';
  document.getElementById("cr-up").onclick=goUp;
}
function goUp(){ if(selH) selectProv(sel); else if(sel>=0) selectProv(-1); }
function histSet(how){
  if(how==="none") return;
  try{ var url=sel<0 ? location.pathname+location.search : "#"+encodeURIComponent(NEW[sel][0])+(selH?"/"+encodeURIComponent(selH.name):""), st={wm:1,p:sel,h:selH?selH.key:null}, cur=history.state;
    if(how==="replace"||(cur&&cur.wm&&cur.p===st.p&&cur.h===st.h)) history.replaceState(st,"",url); else history.pushState(st,"",url); }catch(_){}
}
function provBox(i){   // khung: nơi có bệnh viện trúng (dễ đọc tên); không có ⇒ cả tỉnh
  var xs=Object.keys(HS).map(function(k){ return HS[k]; }).filter(function(x){ return x.h.ni===i && x.h.xy; });
  if(xs.length<2) return {bb:PROV[i].info.bb.slice(), d:10};
  var b=[1e9,1e9,-1e9,-1e9]; xs.forEach(function(x){ b[0]=Math.min(b[0],x.h.xy[0]); b[1]=Math.min(b[1],x.h.xy[1]); b[2]=Math.max(b[2],x.h.xy[0]); b[3]=Math.max(b[3],x.h.xy[1]); });
  var pb=PROV[i].info.bb, cw=Math.max(b[2]-b[0],8), ch=Math.max(b[3]-b[1],6), cx=(b[0]+b[2])/2, cy=(b[1]+b[3])/2;
  if(cw>(pb[2]-pb[0])*0.55||ch>(pb[3]-pb[1])*0.55) return {bb:pb.slice(), d:10};      // bệnh viện rải khắp tỉnh ⇒ xem cả tỉnh
  return {bb:[cx-cw/2-6,cy-ch/2-4,cx+cw/2+12,cy+ch/2+4], d:18};
}
function mobScroll(){
  if(MQ.matches) return;               // điện thoại: bảng trượt đã mở sẵn (SHEET)
  if(window.innerWidth>980) return;
  var sd=document.querySelector(".side"), mc=document.querySelector(".mapcard"); if(!sd||!mc) return;
  var y=sd.getBoundingClientRect().top+window.scrollY-mc.offsetHeight-6;
  if(Math.abs(window.scrollY-y)>4) window.scrollTo({top:Math.max(0,y),behavior:"smooth"});
}
function selectProv(i,how){
  if(typeof NEWS!=="undefined") NEWS.close(true);
  var same = (i===sel && i>=0 && !selH);
  if(i!==sel) LG.tmp=null;
  sel=i; selOld=null; selH=null; query="";
  if(MQ.matches) SHEET.to(i<0 ? "peek" : "half");
  crumbSet();
  if(i<0){ VB0=homeBox(); animateTo(VB0); } else if(!same){ var pb=provBox(i); animateTo(fitBox(pb.bb,0.12,pb.d)); }
  paintMap(); renderSide(); SB.scrollTop=0; histSet(how);
  if(i>=0) mobScroll(); else if(window.innerWidth<=980 && !MQ.matches) window.scrollTo({top:0,behavior:"smooth"});
}
/* phóng vừa phải: thấy cơ sở + vài cơ sở gần (cùng tỉnh) để còn định hướng */
function hospBox(h){
  var bb=[h.xy[0]-4,h.xy[1]-3,h.xy[0]+4,h.xy[1]+3];
  Object.keys(HS).map(function(k){ return HS[k]; }).filter(function(x){ return x.h!==h && x.h.ni===h.ni && x.h.xy; })
    .map(function(x){ return [Math.hypot(x.h.xy[0]-h.xy[0], x.h.xy[1]-h.xy[1]), x.h.xy]; }).filter(function(a){ return a[0]<22; })
    .sort(function(a,b){ return a[0]-b[0]; }).slice(0,4)
    .forEach(function(a){ bb[0]=Math.min(bb[0],a[1][0]); bb[1]=Math.min(bb[1],a[1][1]); bb[2]=Math.max(bb[2],a[1][0]); bb[3]=Math.max(bb[3],a[1][1]); });
  return bb;
}
function selectHosp(h,how){
  if(!h) return;
  if(typeof NEWS!=="undefined") NEWS.close(true);
  if(h.ni!==sel) LG.tmp=null;
  sel=h.ni; selH=h; selOld=null;
  if(MQ.matches) SHEET.to("half");
  crumbSet();
  if(h.xy) animateTo(fitBox(hospBox(h),0.3,16)); else { var pb=provBox(sel); animateTo(fitBox(pb.bb,0.12,pb.d)); }
  paintMap(); renderSide(); histSet(how); mobScroll();
}
/* ═════════ BẢNG TRƯỢT (điện thoại) ═════════ 3 mức: peek (tiêu đề + số tổng) · half · full; kéo thanh / tiêu đề, bấm thanh để đổi mức */
var SHEET=(function(){
  var side=document.querySelector(".side"), grab=document.getElementById("grab"), hd=side.querySelector(".sidehd"), st="peek", d=null;
  function avail(){ return window.innerHeight - document.getElementById("top").offsetHeight - 6; }
  function hOf(x){ var a=avail(); return x==="full" ? a : x==="half" ? Math.round(a*0.52) : Math.min(200, Math.round(a*0.3)); }
  function apply(){ if(!MQ.matches){ side.style.removeProperty("--sh"); return; } side.style.setProperty("--sh", hOf(st)+"px"); }
  function to(x){ st=x; apply(); }
  function target(){ return MQ.matches ? hOf(st) : 0; }
  function down(e){
    if(!MQ.matches || (e.target.closest("button,a,input,select") && e.target!==grab)) return;
    d={ y:e.clientY, h:side.offsetHeight, t:Date.now(), moved:false, id:e.pointerId };
    side.classList.add("drag"); try{ (e.currentTarget).setPointerCapture(e.pointerId); }catch(_){}
  }
  function move(e){
    if(!d || e.pointerId!==d.id) return;
    var dy=d.y-e.clientY; if(Math.abs(dy)>5) d.moved=true;
    if(d.moved){ var h=Math.max(hOf("peek")-40, Math.min(avail(), d.h+dy)); side.style.setProperty("--sh", h+"px"); }
  }
  function up(e){
    if(!d || e.pointerId!==d.id) return;
    side.classList.remove("drag");
    var h=side.offsetHeight, v=(d.y-e.clientY)/Math.max(1,Date.now()-d.t), was=st;
    if(!d.moved){ if(e.target===grab || e.target.closest(".sidehd")) st = st==="peek" ? "half" : st==="half" ? "full" : "half"; }
    else if(v>0.5) st = st==="peek" ? "half" : "full";
    else if(v<-0.5) st = st==="full" ? "half" : "peek";
    else { var c=["peek","half","full"].map(function(x){ return [Math.abs(hOf(x)-h), x]; }).sort(function(a,b){ return a[0]-b[0]; }); st=c[0][1]; }
    d=null; apply();
    if(was!==st && st==="peek") SB.scrollTop=0;
  }
  [grab, hd].forEach(function(n){ n.addEventListener("pointerdown",down); n.addEventListener("pointermove",move); n.addEventListener("pointerup",up); n.addEventListener("pointercancel",up); });
  grab.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); to(st==="peek"?"half":st==="half"?"full":"peek"); } });
  return { to:to, apply:apply, target:target, state:function(){ return st; } };
})();
window.addEventListener("popstate",function(e){ var st=e.state; if(st&&st.wm&&st.h&&HK[st.h]) selectHosp(HK[st.h],"none"); else selectProv(st&&st.wm?st.p:-1,"none"); });
try{ history.replaceState({wm:1,p:-1},"",location.href); }catch(_){}

/* ═════════ BẢNG BÊN ═════════ */
var SB=document.getElementById("sb"), openHosp={}, query="";
function statusTag(p){
  if(p.res!=="Win") return '<span class="st '+(p.res==="Fail"?"fail":p.res==="Cancel"?"mute":"pend")+'">'+({Fail:"Trượt",Cancel:"Huỷ",Pending:"Chờ kết quả"}[p.res]||p.res||"—")+'</span>';
  var m={ok:["ok","Đang thực hiện"],warn:["warn","Sắp hết hạn"],bad:["bad","Đã hết hạn"],na:["mute","Chưa có ngày phê duyệt"]}[p.status];
  return '<span class="st '+m[0]+'">'+m[1]+'</span>';
}
function timeline(p){
  if(p.res!=="Win" || !p.approve) return "";
  var tot=monthsBetween(p.approve,p.end), done=Math.max(0,Math.min(tot,monthsBetween(p.approve,NOW)));
  var pct=tot>0? done/tot*100 : 100, col={ok:"var(--ok)",warn:"var(--warn)",bad:"var(--mute)"}[p.status]||"var(--sky)";
  var left=monthsBetween(NOW,p.end);
  return '<div class="tl" title="Đã thực hiện '+Math.round(pct)+'%"><i style="width:'+pct.toFixed(1)+'%;background:'+col+'"></i></div>'+
    '<div class="tld"><span>'+d2(p.approve)+'</span><span>'+(left>0? "còn "+(left>=1? Math.round(left)+" tháng" : Math.round(left*30.44)+" ngày") : "hết hạn "+Math.round(-left)+" tháng trước")+'</span><span>'+d2(p.end)+'</span></div>';
}
function pkgHtml(p, filt){
  var items=p.items.filter(filt||itOk);
  var rows=items.map(function(it){
    var g=GK[it.g]||GK.other, e=g.top==="chi"?sutOf(it.code):null;
    return '<tr><td'+(it.pname?' title="'+esc(it.pname)+'"':'')+'><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:'+g.c+';margin-right:5px"></i>'+esc(it.code||"—")+(p.npp==="KQTT"&&it.mfr?' <span class="it-mfr">'+esc(it.mfr)+(it.country?' · '+esc(it.country):'')+'</span>':'')+' <span style="color:var(--t3)">'+(g.top==="dao"?(it.knife||g.name.replace("Dao ","")):((e?e[1]+" ":"")+g.name.replace("Chỉ ","")))+'</span>'+(it.result&&it.result!==p.res?' <span class="st '+(it.result==="Win"?"win":it.result==="Fail"?"fail":"pend")+'">'+esc(it.result)+'</span>':'')+'</td>'+
      '<td class="r">'+nfmt(it.qty)+(it.unit?' '+esc(it.unit.toLowerCase()):'')+'</td><td class="r">'+(it.price?prn(it.price):"—")+'</td><td class="r">'+(it.value?vnd(it.value):"—")+'</td></tr>';
  }).join("");
  return '<div class="pkg">'+
    '<div class="t">'+esc(p.tender || ("Gói thầu "+(p.tbmtRaw[0]||p.tbmt||"")))+'</div>'+
    '<div class="meta"><span>'+statusTag(p)+'</span>'+
      '<span class="npp"><i class="dot" style="background:'+NPP[p.npp].color+'"></i>'+NPP[p.npp].name+'</span>'+
      (p.tbmtRaw.length?'<span>TBMT <b>'+esc(p.tbmtRaw.join(", "))+'</b></span>':'')+
      '<span>FY'+p.fy+(p.q?' · Q'+p.q:'')+'</span>'+
      (p.approve?'<span>Phê duyệt <b>'+d2(p.approve)+'</b></span>':'')+
      '<span>Thời hạn <b>'+p.dur+' tháng</b></span>'+
      (p.kq&&p.kq.method?'<span>'+esc(p.kq.method)+'</span>':'')+(p.kq&&p.kq.bidders?'<span>'+String(Math.round(p.kq.bidders*10)/10).replace(".",",")+' nhà thầu / mặt hàng</span>':'')+
      (p.end?'<span>Hết hạn <b>'+d2(p.end)+'</b></span>':'')+
    '</div>'+ timeline(p)+
    '<table class="pr"><thead><tr><th>Sản phẩm</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    (p.project && p.project!==p.tender ? '<div class="meta" style="margin-top:6px">Dự toán: '+esc(p.project)+'</div>':'')+
    (p.note?'<div class="meta" style="margin-top:4px">Ghi chú: '+esc(p.note)+'</div>':'')+
    (p.link?'<div class="meta" style="margin-top:4px"><a href="'+esc(p.link)+'" target="_blank" rel="noopener">Mở hồ sơ</a></div>':'')+
  '</div>';
}
function hospList(list){
  var q=nk(query), keys={}, rk={};
  rankList().slice(0,10).forEach(function(y,i){ rk[y.h.key]=i+1; });
  list.forEach(function(p){ if(!q || nk(p.hospital+" "+p.tender+" "+p.tbmtRaw.join(" ")+" "+p.items.map(function(i){return i.code;}).join(" ")).indexOf(q)>=0) keys[p.h.key]=1; });
  var xs=Object.keys(keys).map(function(k){ return HS[k]; }).filter(Boolean).sort(function(a,b){ return b.v-a.v; });
  if(!xs.length) return '<div class="empty">Không có bệnh viện phù hợp bộ lọc.</div>';
  return xs.map(function(x){ return hcard(x, rk[x.h.key]); }).join("");
}
function kpiBlock(list){
  var v=0, qn=0, hosp={}, prov={}, ok=0, soon=0;
  list.forEach(function(p){ v+=pkgValue(p); qn+=pkgQty(p); hosp[nk(p.hospital)]=1; if(p.ni>=0) prov[p.ni]=1; if(p.status==="ok") ok++; if(p.status==="warn") soon++; });
  var win = F.res==="win";
  return '<div class="kpis">'+
    '<div class="kpi"><b>'+list.length+'</b><span>'+(win?"Gói trúng thầu":"Gói tham dự")+'</span></div>'+
    (F.m==="q" ? '<div class="kpi"><b>'+nfmt(qn)+'</b><span>Số lượng ('+unitNow()+') · '+vnd(v)+'</span></div>'
               : '<div class="kpi"><b>'+vnd(v)+'</b><span>Giá trị · '+nfmt(qn)+' '+unitNow()+'</span></div>')+
    '<div class="kpi"><b>'+Object.keys(hosp).length+'</b><span>Bệnh viện / cơ sở</span></div>'+
    (sel<0?'<div class="kpi"><b>'+Object.keys(prov).length+'<span style="font-size:13px;color:var(--t3)">/'+NEW.filter(function(x,i){ return SCOPE.inProv(i); }).length+'</span></b><span>Tỉnh / thành</span></div>':'')+
    '<div class="kpi"><b>'+ok+'</b><span>Hợp đồng đang chạy</span></div>'+
    '<div class="kpi warn"><b>'+soon+'</b><span>Còn ≤ '+SOON_MONTHS+' tháng</span></div>'+
  '</div>';
}
function monthChart(list){
  var start = F.fy==="every" ? 202209 : F.fy==="rng" ? monKey(F.rng[0]) : (F.fy==="all" ? 202509 : (+F.fy+1958)*100+9);
  var ks=[]; var y=Math.floor(start/100), m=start%100; while(y*100+m <= Math.max(NOWK, 202508)){ ks.push(y*100+m); m++; if(m>12){m=1;y++;} }
  if(F.fy==="every"){ var first=list.reduce(function(a,p){ return p.sk && p.sk<a ? p.sk : a; }, NOWK); ks=ks.filter(function(k){ return k>=first; }); }
  if(F.fy==="rng"){ var e1=monKey(F.rng[1]); ks=ks.filter(function(k){ return k<=e1; }); }
  else if(F.fy!=="all" && F.fy!=="every"){ ks=ks.filter(function(k){ return fyOf(k)===+F.fy; }); }
  if(F.q){ ks=ks.filter(function(k){ return qOf(k)===F.q; }); }
  var d={}; ks.forEach(function(k){ d[k]={HUNGVI:0,ICARE:0,KQTT:0}; });
  list.forEach(function(p){ if(d[p.sk]) d[p.sk][p.npp]+=mv(p); });
  var tot=function(k){ return d[k].HUNGVI+d[k].ICARE+d[k].KQTT; };
  var max=Math.max.apply(null, ks.map(tot).concat([1])), many=ks.length>24;
  return '<div class="monwrap"><div class="mon" role="img" aria-label="Giá trị trúng thầu theo tháng">'+ks.map(function(k,i){
    var fy=(k%100)===9||i===0;
    var tt=String(k%100).padStart(2,"0")+"/"+Math.floor(k/100)+" — "+SRCS.map(function(s){ return NPP[s].name+" "+fm(d[k][s]); }).join(" · ");
    return '<div class="c'+(fy?" fy":"")+(k===NOWK?" now":"")+'" title="'+tt+'">'+
      ["KQTT","ICARE","HUNGVI"].map(function(s){ return d[k][s] ? '<i style="height:'+(d[k][s]/max*82).toFixed(1)+'%;background:'+NPP[s].color+'"></i>' : ""; }).join("")+
      '<span class="m">'+(many && (k%100)%3!==0 ? "" : (k%100))+'</span>'+(fy?'<span class="f">FY'+fyOf(k)+'</span>':'')+'</div>';
  }).join("")+'</div></div>';
}
/* thị phần theo hãng (SL dao trúng): MANI và các hãng khác — từ KQTT + NPP (NPP = MANI) */
function brandShare(list){
  var b={};
  list.forEach(function(p){ p.items.forEach(function(it){ if(!itOk(it) || (p.res==="Win" && it.result!=="Win")) return;
    var k = isMani(it) ? "MANI" : (String(it.mfr||it.brand||"Khác").trim() || "Khác"); k = k.length>22 ? k.slice(0,20)+"…" : k;
    b[k]=(b[k]||0)+(F.m==="q" ? (+it.qty||0) : (+it.value||0)); }); });
  return Object.keys(b).map(function(k){ return [k,b[k]]; }).filter(function(x){ return x[1]>0; }).sort(function(a,c){ return c[1]-a[1]; });
}
var BRC=["#B4532A","#64748B","#0EA5E9","#A855F7","#10B981","#F59E0B","#EC4899","#84CC16"];
function brandHtml(list){
  var a=brandShare(list); if(!a.length) return '<div class="empty">Chưa có dữ liệu hãng trong bộ lọc.</div>';
  var tot=a.reduce(function(s,x){ return s+x[1]; },0)||1, top=a.slice(0,7), rest=a.slice(7).reduce(function(s,x){ return s+x[1]; },0);
  if(rest) top.push(["Khác",rest]);
  var col=function(k,i){ return k==="MANI" ? "#003047" : BRC[i%BRC.length]; };
  return '<div class="shr">'+top.map(function(x,i){ return '<i title="'+esc(x[0])+': '+fm(x[1])+'" style="width:'+(x[1]/tot*100).toFixed(2)+'%;background:'+col(x[0],i)+'"></i>'; }).join("")+'</div>'+
    '<div class="shl">'+top.map(function(x,i){ return '<span><i style="background:'+col(x[0],i)+'"></i>'+esc(x[0])+' <b>'+Math.round(x[1]/tot*100)+'%</b></span>'; }).join("")+'</div>';
}
function mixHtml(q, gv, click){
  gv=gv||{}; var M=F.m==="q"?q:gv;
  var gs=GR.filter(function(g){ return q[g.k]; }); if(!gs.length) return '<div class="empty">Không có sản phẩm trong bộ lọc.</div>';
  var out="", f=function(v){ return F.m==="q" ? nfmt(v) : vnd(v); };
  ["dao","chi","khac"].forEach(function(t){ var gg=gs.filter(function(g){ return g.top===t; }); if(!gg.length) return; var sum=gg.reduce(function(a,g){ return a+(M[g.k]||0); },0);
    out+='<div class="mixh"><span>'+TOPS[t].name+'</span><span>'+(F.m==="q"?nfmt(sum)+' '+TOPS[t].u:vnd(sum))+'</span></div><div class="mix">'+gg.map(function(g){ return '<i title="'+g.name+': '+f(M[g.k]||0)+'" style="width:'+((M[g.k]||0)/(sum||1)*100)+'%;background:'+g.c+'"></i>'; }).join("")+'</div>'+
      '<div class="mixl">'+gg.map(function(g){ return '<span class="g'+(F.sub===g.k?" on":"")+'"'+(click?' data-sub="'+g.k+'" role="button" tabindex="0" title="Bấm để chỉ xem '+g.name+'"':'')+'><i style="background:'+g.c+'"></i>'+g.name+(g.sub?' ('+g.sub+')':'')+'</span><b>'+f(M[g.k]||0)+'</b>'; }).join("")+'</div>'; });
  return out;
}
/* so sánh kỳ: FY / quý đang chọn ⇄ cùng kỳ năm trước (kỳ đang chạy: cùng số tháng); "Từ FY67" / "Mọi năm" ⇒ 12 tháng gần nhất ⇄ 12 tháng trước đó */
function cmpSpan(){
  var fy, q, a, b, ongoing;
  if(F.fy==="all"||F.fy==="every"){ b=NOWK; a=addK(b,-11); return {cur:[a,b], prev:[addK(a,-12),addK(b,-12)], lbl:"12 tháng gần nhất so với 12 tháng trước đó"}; }
  if(F.fy==="rng"){ a=monKey(F.rng[0]); b=Math.min(monKey(F.rng[1]), NOWK); return {cur:[a,b], prev:[addK(a,-12),addK(b,-12)], lbl:PERX.label(F.pk,true)+" so với cùng kỳ năm trước"}; }
  fy=+F.fy; q=F.q; a=q?qStartK(fy,q):fyStartK(fy); b=addK(a, q?2:11); ongoing=b>NOWK; if(ongoing) b=NOWK;
  var nm=(q?"Q"+q+" ":"")+"FY";
  return {cur:[a,b], prev:[a-100,b-100], lbl:nm+fy+(ongoing?" đến nay":"")+" so với "+(ongoing?"cùng kỳ ":"")+nm+(fy-1)};
}
function spanVals(a,b){ var o={}; PKGS.forEach(function(p){ if(p.ni<0 || !p.h || !p.sk || p.sk<a || p.sk>b || !pass(p,false,{np:1})) return; o[p.h.key]=(o[p.h.key]||0)+mv(p); }); return o; }
function rankHtml(){
  var rk=rankList().slice(0,10), mx=rk.length?rk[0].v:1, col=F.sub?GK[F.sub].c:F.cat==="dao"?"#0EA5E9":F.cat==="chi"?"#F59E0B":"var(--blue)";
  if(!rk.length) return '<div class="empty">Chưa có bệnh viện trong bộ lọc.</div>';
  var cs=cmpSpan(), cur=spanVals(cs.cur[0],cs.cur[1]), prev=spanVals(cs.prev[0],cs.prev[1]);
  function dl(k){ var c=cur[k]||0, p=prev[k]||0, tt=esc(cs.lbl+": "+fm(c)+" / "+fm(p));
    if(!c && !p) return "";
    if(!p) return '<span class="dl nw" title="'+tt+'">mới</span>';
    var d=(c-p)/p; if(Math.abs(d)<0.005) return '<span class="dl eq" title="'+tt+'">= kỳ trước</span>';
    return '<span class="dl '+(d>0?"up":"dn")+'" title="'+tt+'">'+(d>0?"▲":"▼")+' '+Math.min(999,Math.round(Math.abs(d)*100))+'%</span>'; }
  return '<div class="cmpn">▲▼ '+esc(cs.lbl)+'</div><ol class="rank">'+rk.map(function(x,i){
      return '<li data-h="'+esc(x.h.key)+'" data-pv="'+x.h.ni+'" role="button" tabindex="0"><span class="no">'+(i+1)+'</span><span class="nm">'+esc(x.h.name)+'</span><span class="q">'+(F.m==="q"?nfmt(x.v):vnd(x.v))+'<small>'+(F.m==="q"?unitNow()+" · "+vnd(x.val):x.n+" gói · "+nfmt(x.qty)+" "+unitNow())+'</small></span>'+
        '<span class="rb"><b style="width:'+(x.v/mx*100).toFixed(1)+'%;background:'+col+'"></b></span><span class="pv"><span>'+esc(NEW[x.h.ni][0])+' · '+brandTxt(x.list)+(x.last?' · trúng gần nhất '+lastD(x.last):'')+'</span>'+dl(x.h.key)+
        '<button class="fua" type="button" data-fu-new="'+esc(x.h.key)+'" title="Thêm gói theo dõi thầu ở cơ sở này">+ Theo dõi</button></span></li>'; }).join("")+'</ol>';
}
function lastD(p){ return p.approve ? d2(p.approve) : p.sk ? "T"+(p.sk%100)+"/"+Math.floor(p.sk/100) : "—"; }
/* HÃNG trúng ở 1 cơ sở (người dùng 05/11/2026): theo SL trúng, mọi nguồn đã bỏ trùng TBMT — luôn nêu MANI + 1–2 hãng khác lớn nhất,
   thay cho tên nguồn (Hùng Vĩ / iCare / KQTT thị trường) */
function brandMix(list){ var by={}, t=0; list.forEach(function(p){ if(p.res!=="Win") return; p.items.forEach(function(it){ if(it.result!=="Win" || !itOk0(it)) return; var q=+it.qty||0; if(!q) return; var b=brandOf(it); by[b]=(by[b]||0)+q; t+=q; }); }); return { by:by, t:t }; }
function brandTxt(list, n){
  var m=brandMix(list||[]); if(!m.t) return "";
  var pct=function(b){ var v=m.by[b]/m.t*100; return v<1 ? "<1%" : Math.round(v)+"%"; };
  var o=Object.keys(m.by).filter(function(b){ return b!=="MANI"; }).sort(function(a,b){ return m.by[b]-m.by[a]; }).slice(0, n||2);
  return (m.by.MANI ? ['<b class="bm-m">MANI '+pct("MANI")+'</b>'] : ['<span class="bm-n">MANI chưa trúng</span>']).concat(o.map(function(b){ return esc(b)+' '+pct(b); })).join(" · ");
}
function hcard(x, rk){
  var h=x.h, gs=GR.filter(function(g){ return x.q[g.k]; }), tq=gs.reduce(function(a,g){ return a+x.q[g.k]; },0)||1;
  return '<div class="hcard" data-h="'+esc(h.key)+'" role="button" tabindex="0"><div class="top1"><span class="nm">'+(rk?'<span class="gold">#'+rk+'</span> ':'')+esc(h.name)+'</span><span class="v">'+fm(x.v)+'</span></div>'+
    (function(){ var b=brandTxt(x.list); return b?'<div class="bm">'+b+'</div>':''; })()+
    '<div class="meta"><span>'+x.n+' gói</span>'+(NEW[h.ni][2].length>1?'<span>'+esc(oldName(h.oi))+' (cũ)</span>':'')+(x.last?'<span>Trúng gần nhất <b>'+lastD(x.last)+'</b></span>'+statusTag(x.last):'')+'</div>'+
    '<div class="pchips">'+gs.map(function(g){ return '<span class="pc"><i style="background:'+g.c+'"></i>'+g.name.replace("Dao ","").replace("Chỉ ","")+' '+nfmt(x.q[g.k])+'</span>'; }).join("")+'</div>'+
    '<div class="minimix">'+gs.map(function(g){ return '<i style="width:'+(x.q[g.k]/tq*100)+'%;background:'+g.c+'"></i>'; }).join("")+'</div></div>';
}
var selH=null, showAllHist=false;
function facInfo(h){
  var f=h.f||{}, pv=isPv(f), html='<h3>Thông tin cơ sở</h3><dl class="finfo">';
  var typ=(f.t==="tn"?"Cơ sở y tế":(CT[f.t]||"Cơ sở y tế"))+(f.sp&&CSP[f.sp]?' · chuyên khoa '+esc(CSP[f.sp]):'');
  html+='<dt>Loại</dt><dd>'+typ+'</dd>';
  html+='<dt>Công / tư</dt><dd>'+(pv?'<span class="own pv">Tư nhân</span> mua sắm theo <b>hợp đồng mua sắm</b> (không qua đấu thầu công)':'<span class="own cl">Công lập</span> mua sắm qua <b>đấu thầu</b> (KQTT)')+'</dd>';
  if(!pv) html+='<dt>Tuyến</dt><dd>'+(f.lv?esc(f.lv):'<span class="na">chưa rõ</span>')+'</dd>';
  html+='<dt>Địa chỉ</dt><dd>'+(h.address?esc(addrFmt(h.address)):'<span class="na">chưa có</span>')+'</dd>';
  var olds=NEW[h.ni][2];
  html+='<dt>Tỉnh / thành</dt><dd>'+esc(NEW[h.ni][0])+(olds.length>1||olds[0]!==NEW[h.ni][0]?' <span class="na">(trước 07/2025: '+esc(oldName(h.oi))+')</span>':'')+' · '+REGION[NEW[h.ni][1]]+'</dd>';
  if(f.beds||f.rank) html+='<dt>Quy mô</dt><dd>'+[f.beds?esc(f.beds)+' giường':'', f.rank?'hạng '+esc(f.rank):''].filter(Boolean).join(' · ')+'</dd>';
  var by={}; h.pk.forEach(function(p){ if(p.res!=="Win") return; p.items.forEach(function(it){ if(it.result!=="Win") return; var c=it.cat; if(c!=="dao"&&c!=="chi") return; var o=by[p.fy]=by[p.fy]||{dao:0,chi:0}; o[c]+=+it.qty||0; }); });
  var fys=Object.keys(by).map(Number).filter(Boolean).sort(function(a,b){ return b-a; }).slice(0,3);
  if(pv){ var pcs=FU.byFac(f), sg=pcs.filter(function(c){ return c.stage===14||c.stage===15; }).length, op=pcs.filter(function(c){ return c.stage>=11&&c.stage<=13; }).length;
    html+='<dt>Hợp đồng mua sắm</dt><dd>'+(sg?sg+' đã ký':'<span class="na">chưa ký</span>')+(op?' · '+op+' cơ hội đang theo dõi':'')+'</dd>'; }
  if(!pv || fys.length) html+='<dt>Lượng trúng</dt><dd>'+(fys.length?fys.map(function(y){ var o=by[y]; return 'FY'+y+': '+[o.dao?nfmt(o.dao)+' dao':'', o.chi?nfmt(o.chi)+' chỉ khâu':''].filter(Boolean).join(' · '); }).join('<br>'):'<span class="na">chưa có gói trúng dao / chỉ khâu</span>')+'</dd>';
  var q = f.ll ? f.ll[1]+","+f.ll[0] : h.name+" "+NEW[h.ni][0];
  html+='<dt>Bản đồ</dt><dd><a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q)+'" target="_blank" rel="noopener">Mở Google Maps</a>'+(f.ll?'':' <span class="na">(tìm theo tên)</span>')+'</dd>';
  return html+'</dl>';
}
/* gói trúng: phần MANI (NPP = MANI; KQTT theo hãng / mã M…) và phần hãng khác */
function winSide(p){ var o={m:0,o:0,ob:{}}; if(p.res!=="Win") return o; p.items.forEach(function(it){ if(it.result!=="Win") return; if(isMani(it)) o.m++; else { o.o++; var b=String(it.mfr||it.brand||"").trim()||"Hãng khác"; o.ob[b]=1; } }); return o; }
function byNewest(a,b){ return (b.approve||String(b.sk)).localeCompare(a.approve||String(a.sk)); }
function contractRibbon(list, mani){
  var latest=list[0], act=list.filter(function(p){ return p.status==="ok"||p.status==="warn"; });
  var endMax=act.reduce(function(a,p){ return p.end>a?p.end:a; },"");
  var brands={}; (act.length?act:[latest]).forEach(function(p){ Object.assign(brands, winSide(p).ob); });
  var bl=Object.keys(brands).slice(0,3).join(", ")+(Object.keys(brands).length>3?"…":"");
  if(!mani){
    return '<div class="ribbon comp"><b>'+(act.length?'Hãng khác đang có hợp đồng: ':'Hãng khác trúng gần nhất: ')+esc(bl||"—")+'</b><span>'+
      (act.length ? act.length+' gói còn hiệu lực · xa nhất đến '+d2(endMax) : lastD(latest)+(latest.end?' · '+(latest.end<NOW?'đã hết hạn ':'hết hạn ')+d2(latest.end):''))+'</span></div>';
  }
  var rst = act.length ? (act.some(function(p){ return p.status==="ok"; }) ? "ok" : "warn") : (latest.status||"mute");
  return '<div class="ribbon '+rst+'"><b>'+({ok:"MANI đang có hợp đồng còn hiệu lực",warn:"Hợp đồng MANI sắp hết hạn",bad:"Hợp đồng MANI gần nhất đã hết hiệu lực",na:"Gói MANI trúng gần nhất chưa có ngày phê duyệt",mute:"—"}[rst])+'</b><span>'+
    (act.length ? act.length+' gói còn hiệu lực · xa nhất đến '+d2(endMax)+(rst==="warn"?' — nên chuẩn bị thầu lại':'') : latest.end ? 'Hết hạn '+d2(latest.end) : 'Cần bổ sung ngày phê duyệt trên file NPP')+'</span></div>';
}
function renderHosp(){
  if(selH.acc) return ACT.accHtml(selH);
  var h=selH, x=HS[h.key]||{q:{},gv:{},list:[],n:0,v:0}, t=document.getElementById("sh-t"), s=document.getElementById("sh-s");
  var fu=F.view==="fu", rk={}; if(!fu) rankList().slice(0,10).forEach(function(y,i){ rk[y.h.key]=i+1; });
  t.innerHTML='<button class="sbk" data-up="1" title="Về '+esc(NEW[h.ni][0])+'">‹</button>'+(rk[h.key]?'<span class="gold">#'+rk[h.key]+'</span> ':'')+esc(h.name);
  s.textContent=addrFmt(h.address||oldName(h.oi))+" · "+NEW[h.ni][0];
  var html = fu ? FU.hospHtml(h) : "";
  var wins=h.pk.filter(function(p){ return p.res==="Win"; }).sort(byNewest);
  var mw=wins.filter(function(p){ return winSide(p).m; }), ow=wins.filter(function(p){ return winSide(p).o; });
  if(!fu && h.pk.length){
    html += mw.length ? contractRibbon(mw, true) : '<div class="ribbon mute"><b>MANI chưa có gói trúng ở cơ sở này</b><span>Trong dữ liệu 2 NPP và KQTT toàn quốc (từ 01/2023)</span></div>';
    if(ow.length) html += contractRibbon(ow, false);
    html+='<div class="kpis"><div class="kpi"><b>'+mw.length+'</b><span>Lần MANI trúng (mọi năm)</span></div>'+
      (ow.length||h.npps.KQTT ? '<div class="kpi"><b>'+ow.length+'</b><span>Lần hãng khác trúng</span></div>' : '<div class="kpi"><b>'+x.n+'</b><span>Gói trong kỳ lọc</span></div>')+
      '<div class="kpi"><b>'+(x.n?fm(F.m==="q"?(x.qty||0):(x.val||0)):"—")+'</b><span>'+mLabel()+' (kỳ lọc)</span></div></div>';
    if(!x.n){
      var la=h.pk.slice().sort(byNewest)[0], af=activeFilters().length;
      html+='<div class="note">Không có gói '+(F.res==="win"?"trúng":"tham dự")+' trong kỳ <b>'+esc(periodLabel())+'</b>'+(af?' và bộ lọc đang bật':'')+'. Gói gần nhất: <b>FY'+(la.fy||"?")+'</b> ('+lastD(la)+'). '+
        (F.fy!=="every"?'<button class="lnk" type="button" data-every="1">Xem Mọi năm</button>':'')+(af?(F.fy!=="every"?' · ':'')+'<button class="lnk" type="button" data-fx-all="1">Bỏ bộ lọc</button>':'')+'</div>';
    }
  }
  var pvF=isPv(h.f);
  if(!fu && pvF && !h.pk.length) html+='<div class="ribbon pv"><b>Cơ sở tư nhân · mua sắm theo hợp đồng mua sắm</b><span>Không qua đấu thầu công nên không có trong dữ liệu thầu (2 NPP, KQTT). Theo dõi cơ hội và hợp đồng mua sắm ở mục "Theo dõi mua sắm" bên dưới.</span></div>';
  html+='<div class="crmx" id="crmx"></div>'+FA.hospHtml(h)+facInfo(h);              /* CRM (ảnh + lần gặp gần nhất) · dự báo doanh số trước thông tin cơ sở */
  if(!h.pk.length){ if(!pvF) html+='<div class="note">Chưa có gói trúng thầu dao / chỉ khâu của cơ sở này trong dữ liệu 2 NPP và KQTT toàn quốc.</div>'; }
  else {
    var m0=mw[0], o0=ow[0];
    if(m0 && m0===o0) html+='<h3>Gói trúng gần nhất · MANI + hãng khác</h3><div class="hosp">'+pkgHtml(m0, function(){ return true; })+'</div>';
    else {
      if(m0) html+='<h3>Gói MANI trúng gần nhất</h3><div class="hosp">'+pkgHtml(m0, function(it){ return isMani(it); })+'</div>';
      if(o0) html+='<h3>Gói hãng khác trúng gần nhất</h3><div class="hosp">'+pkgHtml(o0, function(it){ return !isMani(it); })+'</div>';
    }
    if(!fu && x.n) html+='<h3>Sản phẩm trúng (kỳ lọc) · '+mLabel().toLowerCase()+'</h3>'+mixHtml(x.q,x.gv,false);
    if(h.npps.KQTT) html+='<h3>Hãng trúng · mọi năm</h3>'+brandHtml(wins);
    var hist=h.pk.filter(function(p){ return showAllHist||p.res==="Win"; }).sort(byNewest);
    html+='<h3>Lịch sử '+(showAllHist?"tham dự":"trúng thầu")+' · dao &amp; chỉ khâu · <button class="lnk" id="hist-t">'+(showAllHist?"chỉ gói trúng":"hiện cả gói trượt / chờ")+'</button></h3>';
    if(hist.length){
      var cur=null; html+='<div class="hist">';
      hist.forEach(function(p){
        if(p.fy!==cur){ cur=p.fy; html+='<div class="fyh">FY'+(p.fy||"?")+(p.fy&&p.fy<FY_FROM?' · trước FY67':'')+'</div>'; }
        var its=p.items.filter(function(it){ return p.res!=="Win"||it.result==="Win"; }), val=its.reduce(function(a,it){ return a+it.value; },0), ws=winSide(p);
        var who = p.res!=="Win" ? '' : (ws.m?'<span class="tag2 m">MANI</span> ':'')+(ws.o?'<span class="tag2 o">'+esc(Object.keys(ws.ob).slice(0,2).join(", "))+'</span> ':'');
        html+='<div class="ev '+(p.res==="Win"?"win":p.res==="Fail"?"fail":"pend")+'"><div class="d">'+(p.approve?d2(p.approve):p.sk?"T"+(p.sk%100)+"/"+Math.floor(p.sk/100):"—")+' · '+NPP[p.npp].name+' · '+statusTag(p)+'</div>'+
          '<div class="tt">'+who+esc(p.tender||("Gói "+(p.tbmtRaw[0]||"")))+'</div><div class="pchips">'+its.map(function(it){ var g=GK[it.g]||GK.other; return '<span class="pc"><i style="background:'+g.c+'"></i>'+esc(it.code)+(p.npp==="KQTT"&&it.mfr?' · '+esc(it.mfr):'')+' × '+nfmt(it.qty)+'</span>'; }).join("")+'</div>'+
          (p.res==="Win"?'<div class="meta"><span>'+vnd(val)+'</span><span>'+p.dur+' tháng</span>'+(p.end?'<span>đến '+d2(p.end)+'</span>':'')+'</div>':'')+'</div>';
      });
      html+='</div>';
    } else html+='<div class="empty">Chưa có lịch sử.</div>';
  }
  if(!fu) html+=FU.hospHtml(h);
  SB.innerHTML=html;
  CRMX.fill(h);
  var ht=document.getElementById("hist-t"); if(ht) ht.onclick=function(){ showAllHist=!showAllHist; renderHosp(); };
  if(SB._hk!==h.key){ SB.scrollTop=0; SB._hk=h.key; }
}
/* TÓM TẮT ĐỊA BÀN (người dùng 05/11/2026) — đầu bảng bên, tab Tổng quan, cho tỉnh đang xem (hoặc toàn quốc / địa bàn PIC):
   ① số cơ sở theo danh mục (bệnh viện công lập, TTYT, PKĐK khu vực, tư nhân) ② thầu DAO mọi thời gian có dữ liệu (KQTT thị trường + 2 NPP, bỏ trùng TBMT):
   số cơ sở có gói trúng dao, cơ sở nhiều gói nhất (số gói, số dao) ③ hãng chiếm tỉ trọng lớn nhất theo SỐ LƯỢNG dao trúng trong kỳ đang lọc (bỏ qua bộ lọc nguồn / hãng). */
function monTxt(k){ return k ? "tháng "+(k%100)+"/"+Math.floor(k/100) : "—"; }
function psumHtml(){
  var inP=function(ni, oi){ return ni!=null && ni>=0 && SCOPE.inProv(ni, oi) && (sel<0 || (ni===sel)); };
  var nb=0, nt=0, nk2=0, npv=0;
  FAC.forEach(function(f){ if(!inP(f.ni, f.oi) || (sel>=0 && selOld && f.oi && f.oi!==selOld)) return; if(isPv(f)) npv++; else if(f.t==="bv") nb++; else if(f.t==="ttyt") nt++; else if(f.t==="pkkv") nk2++; });
  var fr=function(k,v){ return '<div class="fr"><span class="fk">'+k+'</span><span class="fv">'+v+'</span></div>'; };
  var html='<div class="facts">'+fr("Cơ sở y tế", '<b>'+nfmt(nb)+'</b> BV công lập · <b>'+nfmt(nt)+'</b> TTYT'+(nk2?' · '+nfmt(nk2)+' PKĐK KV':'')+(npv?' · <b>'+nfmt(npv)+'</b> tư nhân':''));
  if(!PKGS.length) return html+fr("Thầu dao", '<span class="na">Đang đọc dữ liệu thầu…</span>')+'</div>';
  var a0=0, a1=0, fac={}, pk={}, q={}, by={}, tq=0;
  PKGS.forEach(function(p){
    if(p.npp==="KQTT" && p.sk){ if(!a0||p.sk<a0) a0=p.sk; if(p.sk>a1) a1=p.sk; }
    if(p.res!=="Win" || !p.h || !inP(p.ni, p.oi) || (sel>=0 && selOld && p.oi!==selOld)) return;
    var kq=0, inK=inPeriod(p);
    p.items.forEach(function(it){ if(it.result!=="Win" || it.cat!=="dao") return; var v=+it.qty||0; kq+=v; if(inK){ var b=brandOf(it); by[b]=(by[b]||0)+v; tq+=v; } });
    if(!kq) return; var k=p.h.key; fac[k]=p.h; pk[k]=(pk[k]||0)+1; q[k]=(q[k]||0)+kq;
  });
  var keys=Object.keys(fac).sort(function(a,b){ return pk[b]-pk[a] || q[b]-q[a]; }), top=keys[0], mt=function(k){ return k ? String(k%100).padStart(2,"0")+"/"+Math.floor(k/100) : "—"; };
  html+=fr("Thầu dao", '<b>'+keys.length+'</b> cơ sở trúng dao · KQTT '+mt(a0)+' – '+mt(a1));
  if(keys.length) html+=fr("Dẫn đầu", '<button class="lnk" type="button" data-h="'+esc(top)+'">'+esc(fac[top].name)+'</button> · <b>'+pk[top]+'</b> gói · <b>'+nfmt(q[top])+'</b> dao');
  var bs=Object.keys(by).sort(function(a,b){ return by[b]-by[a]; });
  if(tq){ var pc=function(b){ var v=by[b]/tq*100; return v<1?"<1%":Math.round(v)+"%"; }, b0=bs[0];
    html+=fr("Hãng dẫn đầu", '<b>'+esc(b0)+' '+pc(b0)+'</b>'+(b0!=="MANI" ? (by.MANI ? ' · MANI '+pc("MANI") : ' · MANI chưa trúng') : (bs[1] ? ' · '+esc(bs[1])+' '+pc(bs[1]) : ''))+' <span class="na">· SL dao trúng, '+esc(periodLabel())+'</span>');
  } else html+=fr("Hãng dẫn đầu", '<span class="na">Kỳ '+esc(periodLabel())+' chưa có dao trúng</span>');
  return html+'</div>';
}
function renderSide(){
  if(typeof FA!=="undefined") setTimeout(FA.box, 0);                 /* khối doanh số ước tính theo tỉnh đang chọn */
  if(typeof NEWS!=="undefined" && NEWS.on()) return NEWS.side();     /* mục Mới cập nhật */
  if(selH && (F.view==="act") !== !!selH.acc && !(F.view==="act" && ACT.cov())){ selH=null; crumbSet(); }        /* đổi chế độ: chi tiết khách CRM ⇄ cơ sở thầu (Độ phủ: xem được cơ sở thầu) */
  if(selH && sel===selH.ni) return renderHosp();
  if(F.view==="fu") return FU.side();
  if(F.view==="act") return ACT.side();
  var t=document.getElementById("sh-t"), s=document.getElementById("sh-s");
  var all=PKGS.filter(function(p){ return pass(p); });
  var period = F.fy==="all" ? "Từ FY67 (09/2025) đến nay" : F.fy==="every" ? "Mọi năm (từ FY"+FY_MIN+")" : F.fy==="rng" ? PERX.label(F.pk) : ("FY"+F.fy+(F.q?" · Q"+F.q:"")+" ("+fyRange(+F.fy,F.q)+")");
  if(sel<0){
    t.textContent=SCOPE.pic() ? "Địa bàn "+SCOPE.pic() : "Toàn quốc";
    s.textContent=period+" · "+srcLabel()+(F.brand!=="all"?" · "+(F.brand==="mani"?"MANI":"hãng khác"):"");
    if(TAB!=="ov"){ SB.innerHTML=noteHtml()+tabsHtml()+panelHtml(); return; }
    var reg={B:{v:0,n:0,by:{}},T:{v:0,n:0,by:{}},N:{v:0,n:0,by:{}}};
    all.forEach(function(p){ if(!p.reg) return; var v=mv(p); reg[p.reg].v+=v; reg[p.reg].n++; reg[p.reg].by[p.npp]=(reg[p.reg].by[p.npp]||0)+v; });
    var rmax=Math.max(reg.B.v,reg.T.v,reg.N.v,1);
    var regHtml='<div class="bars">'+["B","T","N"].map(function(k){ var r=reg[k];
      return '<div class="r"><span>'+REGION[k]+'</span><span class="bar">'+segBar(r.by,rmax)+'</span><span class="num">'+fm(r.v)+' · '+r.n+'</span></div>'; }).join("")+'</div>';
    var top=STAT.map(function(x,i){ return {i:i,s:x}; }).filter(function(o){ return o.s.n; }).sort(function(a,b){ return b.s.v-a.s.v || b.s.n-a.s.n; });
    var tmax=top.length? Math.max(top[0].s.v,1):1;
    var topHtml = top.length ? '<div class="bars">'+top.slice(0,12).map(function(o){
      return '<div class="r click" data-p="'+o.i+'" role="button" tabindex="0"><span>'+esc(NEW[o.i][0])+'</span><span class="bar">'+segBar(o.s.by,tmax)+'</span><span class="num">'+fm(o.s.v)+' · '+o.s.n+'</span></div>'; }).join("")+'</div>'
      : '<div class="empty">Chưa có tỉnh nào trong kỳ lọc.</div>';
    var soon=all.filter(function(p){ return p.status==="warn"; }).sort(function(a,b){ return a.end.localeCompare(b.end); });
    var expHtml = soon.length ? '<div class="exp">'+soon.slice(0,15).map(function(p){
      return '<div class="it" data-p="'+p.ni+'" role="button" tabindex="0"><span class="a">'+esc(p.hospital)+'</span><span class="st warn">'+d2(p.end)+'</span><span class="b">'+(p.ni>=0?esc(NEW[p.ni][0])+' · ':'')+NPP[p.npp].name+' · '+fm(mv(p))+'</span><span class="b">'+p.dur+' tháng</span></div>'; }).join("")+'</div>'
      : '<div class="empty">Không có hợp đồng nào hết hạn trong '+SOON_MONTHS+' tháng tới.</div>';
    var qall={}, gall={}; STAT.forEach(function(x){ for(var g in x.q) qall[g]=(qall[g]||0)+x.q[g]; for(var g2 in x.gv) gall[g2]=(gall[g2]||0)+x.gv[g2]; });
    var ml=mLabel().toLowerCase(), tl=esc(typeLabel());
    var srcLeg='<div style="display:flex;gap:14px;margin-top:2px;flex-wrap:wrap">'+SRCS.map(function(k){ return '<span class="npp"><i class="dot" style="background:'+NPP[k].color+'"></i>'+NPP[k].name+'</span>'; }).join("")+'</div>';
    SB.innerHTML = noteHtml() + tabsHtml() + kpiBlock(all) + psumHtml() +
      (cmOn() ? sec("ov-share", "Thị phần MANI theo tỉnh", ml+" trúng · "+tl, shareProvHtml(), true) : '') +
      sec("ov-mix", "Sản phẩm trúng", ml, (F.type!=="all"?'<div class="cap" style="margin:0 0 6px"><button class="lnk" type="button" data-sub="">Bỏ lọc '+tl+'</button></div>':'')+mixHtml(qall,gall,true), true) +
      sec("ov-top", "Bệnh viện trúng nhiều nhất", "top 10 · "+ml, rankHtml(), false) +
      sec("ov-mon", "Trúng theo tháng phê duyệt", ml+" · "+tl, monthChart(all.filter(function(p){ return p.res==="Win"; }))+srcLeg, false) +
      sec("ov-brand", "Hãng trúng", ml+" · "+tl, brandHtml(all), false) +
      sec("ov-reg", "Theo miền", ml, regHtml, false) +
      sec("ov-prov", "Tỉnh / thành dẫn đầu", ml, topHtml, false) +
      sec("ov-exp", "Sắp hết hạn — cơ hội thầu lại", soon.length+" hợp đồng", expHtml+'<div class="cap" style="margin-top:6px"><button class="lnk" type="button" data-tab="re">Mở Lịch thầu lại ›</button></div>', false) +
      (UNMAPPED.length? '<div class="note">'+UNMAPPED.length+' gói chưa xác định được tỉnh (cột City trống / lạ): '+esc(UNMAPPED.slice(0,5).map(function(p){ return p.hospital+(p.city?" ("+p.city+")":""); }).join("; "))+(UNMAPPED.length>5?"…":"")+'</div>':'')+
      footHtml();
  } else {
    var st=STAT[sel], list=st.list.slice();
    t.textContent=NEW[sel][0];
    s.textContent=REGION[NEW[sel][1]]+(NEW[sel][2].length>1||NEW[sel][2][0]!==NEW[sel][0]?" · gồm "+NEW[sel][2].join(", "):"")+" · "+period;
    if(TAB!=="ov"){ SB.innerHTML=noteHtml()+tabsHtml()+panelHtml(); return; }
    var olds=NEW[sel][2].map(function(o){ var k=nk(o); return {k:k,name:o,n:list.filter(function(p){ return p.oi===k; }).length}; });
    var chips = olds.length>1 ? '<div class="chips">'+'<button class="chip'+(selOld?"":" on")+'" data-o="">Tất cả<em>'+list.length+'</em></button>'+
      olds.map(function(o){ return '<button class="chip'+(selOld===o.k?" on":"")+'" data-o="'+o.k+'">'+esc(o.name)+'<em>'+o.n+'</em></button>'; }).join("")+'</div>' : '';
    if(selOld) list=list.filter(function(p){ return p.oi===selOld; });
    var sh=st.sh, shr=sh.t>0 ? sh.m/sh.t : null;
    SB.innerHTML = tabsHtml() + kpiBlock(list) + psumHtml() + (shr!=null && (cmOn() || F.npp==="all" || F.npp==="KQTT") ? '<h3>Thị phần MANI ở '+esc(NEW[sel][0])+' · '+mLabel().toLowerCase()+' trúng</h3><div class="shp"><span class="ms"><i style="width:'+(shr*100).toFixed(1)+'%"></i></span><b>'+Math.round(shr*100)+'%</b><span style="color:var(--t2)">/ '+fm(sh.t)+'</span></div>' : '') +
      sec("pv-mix", "Sản phẩm trúng", mLabel().toLowerCase(), mixHtml(st.q,st.gv,true), true) +
      sec("pv-hosp", "Bệnh viện trúng thầu", Object.keys(st.hosp||{}).length+" cơ sở", chips +
        '<input class="search" id="q" type="search" placeholder="Tìm bệnh viện, mã sản phẩm, số TBMT…" value="'+esc(query)+'" aria-label="Tìm trong tỉnh">'+
        '<div id="hl">'+hospList(list)+'</div>', true)+
      (st.n? "" : '<div class="note">Kỳ lọc hiện tại chưa có gói '+(F.res==="win"?"trúng":"tham dự")+' ở '+esc(NEW[sel][0])+'.</div>');
    var qi=document.getElementById("q");
    qi.oninput=function(){ query=qi.value; document.getElementById("hl").innerHTML=hospList(list); };
  }
}
/* MỤC THU GỌN ở bảng bên (người dùng 08/11/2026: bảng bên chỉ hiện số chính, xếp hạng / biểu đồ / danh sách phụ thu gọn) — nhớ mở / đóng theo id */
var SECS={}; try{ SECS=JSON.parse(localStorage.getItem("tm_secs")||"{}")||{}; }catch(_){ SECS={}; }
function sec(id, title, meta, body, def){
  var open = Object.prototype.hasOwnProperty.call(SECS, id) ? !!SECS[id] : !!def;
  return '<details class="sec" data-sec="'+id+'"'+(open?' open':'')+'><summary><span class="stt">'+title+'</span>'+(meta!==""&&meta!=null?'<span class="sm">'+meta+'</span>':'')+'</summary><div class="sb2">'+body+'</div></details>';
}
document.addEventListener("toggle",function(e){ var d=e.target; if(d && d.matches && d.matches("details.sec")){ SECS[d.dataset.sec]=d.open; try{ localStorage.setItem("tm_secs", JSON.stringify(SECS)); }catch(_){} } }, true);
/* ═════════ PHÂN TÍCH (tab trong bảng bên): Thầu lại · Giá trúng · Hiệu quả NPP · Dự báo ═════════ */
var TABS=[["ov","Tổng quan"],["re","Thầu lại"],["px","Giá trúng"],["npp","Hiệu quả NPP"],["fc","Dự báo"]];
function tabsHtml(){ if(!TABS.some(function(t){ return t[0]===TAB; })) TAB="ov";
  return '<div class="tabs stabs" role="tablist">'+TABS.map(function(t){ return '<button class="tab'+(TAB===t[0]?" on":"")+'" type="button" role="tab" aria-selected="'+(TAB===t[0])+'" data-tab="'+t[0]+'">'+t[1]+'</button>'; }).join("")+'</div>'; }
function panelHtml(){ return TAB==="re" ? reHtml() : TAB==="px" ? pxHtml() : TAB==="npp" ? nppHtml() : TAB==="fc" ? fcHtml() : ""; }
function inScope(p){ return SCOPE.inProv(p.ni, p.oi) && (sel<0 || (p.ni===sel && (!selOld || p.oi===selOld))); }
function provOfP(p){ return p.ni>=0 ? NEW[p.ni][0] : (p.city||"—"); }
function monLbl(k){ return "T"+(k%100)+"/"+Math.floor(k/100); }
function brandOf(it){ return isMani(it) ? "MANI" : (String(it.mfr||it.brand||"").trim()||"Hãng khác"); }
function itemsTxt(its){ var g={}, o=[]; its.forEach(function(it){ var k=it.cat==="dao" ? (it.knife||GK[it.g].name.replace("Dao ","")) : GK[it.g].name.replace("Chỉ ","Chỉ "); if(!(k in g)) o.push(k); g[k]=(g[k]||0)+(+it.qty||0); }); return o.map(function(k){ return k+" "+nfmt(g[k]); }).join(" · "); }
function scopeTxt(){ return sel>=0 ? " ở "+NEW[sel][0] : ""; }

/* ── Lịch thầu lại: hợp đồng (MANI / hãng khác) hết hạn trong 12 tháng tới + vừa hết hạn ≤ 3 tháng; mời thầu dự kiến ≈ hết hạn − 3 tháng ── */
var RE={ who:"all", last:[] };
function reList(){
  var lo=addMonths(NOW,-3), hi=addMonths(NOW,12), out=[];
  PKGS.forEach(function(p){
    if(p.res!=="Win" || !p.end || p.end<lo || p.end>hi || p.ni<0 || !p.h || !inScope(p) || !pass(p,false,{np:1,nb:1})) return;
    [true,false].forEach(function(mani){
      var its=p.items.filter(function(it){ return it.result==="Win" && itOk0(it) && isMani(it)===mani; }); if(!its.length) return;
      var bs={}; its.forEach(function(it){ bs[brandOf(it)]=1; });
      var op=addMonths(p.end,-3);
      out.push({ p:p, mani:mani, its:its, end:p.end, open:op<NOW?NOW:op, brands:Object.keys(bs),
        qty:its.reduce(function(a,it){ return a+(+it.qty||0); },0), val:its.reduce(function(a,it){ return a+(+it.value||0); },0) });
    });
  });
  return out.sort(function(a,b){ return a.end.localeCompare(b.end) || (b.mani-a.mani); });
}
function rePre(e){
  var p=e.p, nm=p.npp==="KQTT" ? "gói "+(p.tbmtRaw[0]||p.tbmt||"") : (p.tender||"gói "+(p.tbmtRaw[0]||""));
  return { pkg:"Thầu lại · "+nm, stage:1, due:e.open, value:e.mani?Math.round(e.val):"",
    lines:e.its.map(function(it){ return { code:e.mani?String(it.code||"").toUpperCase():"", qty:String(it.qty||""), kind:it.cat==="chi"?"chi":"dao" }; }),
    note: e.mani ? "Hợp đồng MANI ("+NPP[p.npp].name+(p.tbmtRaw.length?", TBMT "+p.tbmtRaw.join(", "):"")+") hết hạn "+d2(p.end)+" — chuẩn bị thầu lại. Mời thầu dự kiến ~ "+monLbl(monKey(e.open))+"."
      : "Hãng khác đang dùng: "+e.its.map(function(it){ return brandOf(it)+" "+it.code+" × "+nfmt(it.qty)+(it.price?" ("+prc(it.price)+")":""); }).join("; ")+". Hợp đồng hết hạn "+d2(p.end)+" — cơ hội chuyển sang MANI." };
}
function reHtml(){
  var all=reList(), L=all.filter(function(e){ return RE.who==="all" || (RE.who==="mani")===e.mani; });
  RE.last=L;
  var m=all.filter(function(e){ return e.mani && e.end>=NOW; }), o=all.filter(function(e){ return !e.mani && e.end>=NOW; }), ex=all.filter(function(e){ return e.end<NOW; });
  var html='<div class="kpis"><div class="kpi warn"><b>'+m.length+'</b><span>Hợp đồng MANI hết hạn trong 12 tháng</span></div>'+
    '<div class="kpi"><b>'+o.length+'</b><span>Hãng khác hết hạn — cơ hội chuyển sang MANI</span></div><div class="kpi"><b>'+ex.length+'</b><span>Vừa hết hạn (≤ 3 tháng)</span></div></div>';
  html+='<div class="cap">Mời thầu dự kiến ≈ 3 tháng trước khi hợp đồng hết hạn'+esc(scopeTxt())+'. “+ Theo dõi thầu lại” tạo gói theo dõi điền sẵn sản phẩm, số lượng và mốc dự kiến.</div>';
  html+='<div class="segs">'+[["all","Tất cả"],["mani","MANI"],["other","Hãng khác"]].map(function(x){ return '<button type="button" data-rew="'+x[0]+'" class="'+(RE.who===x[0]?"on":"")+'">'+x[1]+'</button>'; }).join("")+'</div>';
  if(!L.length) return html+'<div class="empty">Không có hợp đồng hết hạn trong 12 tháng tới (trong bộ lọc).</div>';
  var cur=null, logged=!!FU.auth();
  L.forEach(function(e,i){
    var g=e.end<NOW ? "exp" : e.end.slice(0,7);
    if(g!==cur){ cur=g; var n=L.filter(function(x){ return (x.end<NOW?"exp":x.end.slice(0,7))===g; }).length;
      html+='<div class="mg"><span>'+(g==="exp"?"Đã hết hạn (≤ 3 tháng)":"Hết hạn "+monLbl(monKey(e.end)))+'</span><span>'+n+' hợp đồng</span></div>'; }
    var cs=logged ? FU.byFac(e.p.h.f).filter(function(c){ return c.stage<=6; }) : [];
    html+='<div class="ri"><span class="a" data-h="'+esc(e.p.h.key)+'" role="button" tabindex="0">'+esc(e.p.h.name)+'</span><span class="st '+(e.end<NOW?"bad":"warn")+'">'+d2(e.end)+'</span>'+
      '<span class="b">'+(e.mani?'<span class="tag2 m">MANI</span>':'<span class="tag2 o">'+esc(e.brands.slice(0,2).join(", "))+'</span>')+'<span>'+esc(provOfP(e.p))+' · '+NPP[e.p.npp].name+'</span><span>'+esc(itemsTxt(e.its))+'</span><span>'+vnd(e.val)+'</span><span>Mời thầu dự kiến ~ <b>'+monLbl(monKey(e.open))+'</b></span></span>'+
      '<span class="act">'+(cs.length?'<span class="fuon">Đang theo dõi · '+esc(FU.ST[cs[0].stage])+'</span>':(logged && e.end<=addMonths(NOW,6)?'<span class="wtag">Chưa theo dõi</span>':''))+'<button class="fua" type="button" data-re="'+i+'">+ Theo dõi thầu lại</button></span></div>';
  });
  return html;
}

/* ── Giá trúng: dao MANI ⇄ hãng khác (giá TB có trọng số), theo hãng, theo FY, cơ sở chuyển sang hãng khác ── */
var PX={ k:"all" };
function pxRows(np){
  var out=[];
  PKGS.forEach(function(p){ if(p.res!=="Win" || p.ni<0 || !inScope(p) || !pass(p,false,{nb:1,np:np})) return;
    p.items.forEach(function(it){ if(it.result!=="Win" || it.cat!=="dao" || !itOk0(it) || !(+it.price>0) || !(+it.qty>0)) return; out.push({ p:p, it:it, m:isMani(it), b:brandOf(it) }); }); });
  return out;
}
function agg(rows){ var v=0,q=0,mn=Infinity,mx=0,pk={}; rows.forEach(function(r){ v+=r.it.price*r.it.qty; q+=+r.it.qty; mn=Math.min(mn,+r.it.price); mx=Math.max(mx,+r.it.price); pk[r.p.key]=1; });
  return { avg:q?v/q:0, q:q, mn:q?mn:0, mx:mx, n:Object.keys(pk).length }; }
function pct(a,b){ if(!a||!b) return ""; var d=(a-b)/b*100; return (d>0?"+":"")+Math.round(d)+"%"; }
function pctCls(d){ return d ? (d[0]==="+" ? "up2" : "dn2") : ""; }
function pxTypes(R){ return GR.filter(function(g){ return g.top==="dao"; }).map(function(g){ var r=R.filter(function(x){ return x.it.g===g.k; }); return { g:g, a:agg(r.filter(function(x){ return x.m; })), b:agg(r.filter(function(x){ return !x.m; })) }; }).filter(function(x){ return x.a.q||x.b.q; }); }
function pxBrands(R){ var by={}; R.forEach(function(x){ (by[x.b]=by[x.b]||[]).push(x); }); return Object.keys(by).map(function(b){ return [b, agg(by[b])]; }).sort(function(a,c){ return c[1].q-a[1].q; }); }
function pxHtml(){
  if(F.cat==="chi") return '<div class="note">So sánh giá giữa các hãng hiện chỉ có cho dao (KQTT thị trường chưa có chỉ khâu). Chọn Dao trong Bộ lọc ▸ Loại sản phẩm.</div>';
  var R=pxRows(false), html='<div class="cap">Giá trung bình có trọng số = tổng thành tiền ÷ tổng SL ('+curU()+' / cái), gói trúng trong kỳ '+esc(periodLabel())+esc(scopeTxt())+'. Chênh = MANI so với hãng khác (đỏ = MANI cao hơn). Bấm 1 loại dao để xem theo hãng.</div>';
  if(!R.length) return html+'<div class="empty">Chưa có dòng dao trúng có đơn giá trong bộ lọc.</div>';
  html+='<table class="tb2"><thead><tr><th>Loại dao</th><th class="r">MANI</th><th class="r">Hãng khác</th><th class="r">Chênh</th><th class="r">SL</th></tr></thead><tbody>'+pxTypes(R).map(function(x){ var d=pct(x.a.avg,x.b.avg);
    return '<tr class="click'+(PX.k===x.g.k?" m":"")+'" data-pxk="'+x.g.k+'"><td><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:'+x.g.c+';margin-right:5px"></i>'+esc(x.g.name.replace("Dao ",""))+'</td><td class="r">'+(x.a.q?prn(x.a.avg):"—")+'</td><td class="r">'+(x.b.q?prn(x.b.avg):"—")+'</td><td class="r '+pctCls(d)+'">'+(d||"—")+'</td><td class="r">'+nfmt(x.a.q+x.b.q)+'</td></tr>'; }).join("")+'</tbody></table>';
  var k=PX.k, kn=k==="all"?"mọi loại dao":GK[k].name, rk=k==="all"?R:R.filter(function(x){ return x.it.g===k; });
  html+='<h3>Theo hãng · '+esc(kn)+(k!=="all"?' · <button class="lnk" type="button" data-pxk="all">mọi loại</button>':'')+'</h3>';
  html+=rk.length ? '<table class="tb2"><thead><tr><th>Hãng</th><th class="r">Giá TB</th><th class="r">Thấp – cao</th><th class="r">SL</th><th class="r">Gói</th></tr></thead><tbody>'+pxBrands(rk).slice(0,12).map(function(x){ var a=x[1];
    return '<tr'+(x[0]==="MANI"?' class="m"':'')+'><td>'+esc(x[0])+'</td><td class="r">'+prn(a.avg)+'</td><td class="r">'+prn(a.mn)+' – '+prn(a.mx)+'</td><td class="r">'+nfmt(a.q)+'</td><td class="r">'+a.n+'</td></tr>'; }).join("")+'</tbody></table>' : '<div class="empty">Không có dòng.</div>';
  var RA=pxRows(true).filter(function(x){ return k==="all" || x.it.g===k; }), fys={};
  RA.forEach(function(x){ if(x.p.fy>=FY_MIN) (fys[x.p.fy]=fys[x.p.fy]||[]).push(x); });
  var fl=Object.keys(fys).map(Number).sort(function(a,b){ return a-b; });
  if(fl.length) html+='<h3>Giá theo FY · '+esc(kn)+' · mọi năm</h3><table class="tb2"><thead><tr><th>FY</th><th class="r">MANI</th><th class="r">Hãng khác</th><th class="r">Chênh</th></tr></thead><tbody>'+fl.map(function(f){
    var a=agg(fys[f].filter(function(x){ return x.m; })), b=agg(fys[f].filter(function(x){ return !x.m; })), d=pct(a.avg,b.avg);
    return '<tr><td>FY'+f+'</td><td class="r">'+(a.q?prn(a.avg):"—")+'</td><td class="r">'+(b.q?prn(b.avg):"—")+'</td><td class="r '+pctCls(d)+'">'+(d||"—")+'</td></tr>'; }).join("")+'</tbody></table>';
  html+='<h3>Cơ sở chuyển từ MANI sang hãng khác · mọi năm</h3>'+switchHtml();
  return html;
}
function switchList(){
  var out=[];
  HOSP.forEach(function(h){
    if(sel>=0 && h.ni!==sel) return;
    var w=h.pk.filter(function(p){ return p.res==="Win" && p.items.some(function(it){ return it.result==="Win" && it.cat==="dao"; }); }).sort(byNewest);
    if(w.length<2) return;
    var last=w[0], ls=winSide(last); if(ls.m || !ls.o) return;
    var prevM=w.filter(function(p){ return winSide(p).m; })[0]; if(!prevM) return;
    var its=last.items.filter(function(it){ return it.result==="Win" && !isMani(it) && it.cat==="dao"; }), q=its.reduce(function(a,it){ return a+(+it.qty||0); },0);
    out.push({ h:h, last:last, prevM:prevM, brands:Object.keys(ls.ob), price:q?Math.round(its.reduce(function(a,it){ return a+(+it.value||0); },0)/q):0 });
  });
  return out.sort(function(a,b){ return byNewest(a.last,b.last); });
}
function switchHtml(){
  var L=switchList(); if(!L.length) return '<div class="empty">Chưa thấy cơ sở nào có gói dao trúng gần nhất là hãng khác trong khi trước đó MANI trúng.</div>';
  return L.slice(0,15).map(function(x){ return '<div class="ri"><span class="a" data-h="'+esc(x.h.key)+'" role="button" tabindex="0">'+esc(x.h.name)+'</span><span class="st bad">'+lastD(x.last)+'</span>'+
    '<span class="b"><span>'+esc(NEW[x.h.ni][0])+'</span><span>MANI gần nhất '+lastD(x.prevM)+' → <b>'+esc(x.brands.slice(0,2).join(", "))+'</b>'+(x.price?' · '+prc(x.price)+' / cái':'')+'</span></span></div>'; }).join("");
}

/* ── Hiệu quả NPP: tỉ lệ trúng (trúng ÷ (trúng + trượt)) theo NPP, quý, tỉnh ── */
function nppPk(k){ return PKGS.filter(function(p){ return p.npp===k && inScope(p) && inPeriod(p) && p.items.some(itOk0); }); }
function wonVal(p){ return p.res!=="Win" ? 0 : p.items.reduce(function(a,it){ return a+(it.result==="Win" && itOk0(it) ? (+it.value||0) : 0); },0); }
function cnt(L){ var c={n:L.length,Win:0,Fail:0,Pending:0,Cancel:0,val:0}; L.forEach(function(p){ if(p.res in c) c[p.res]++; c.val+=wonVal(p); }); c.rt=(c.Win+c.Fail)?c.Win/(c.Win+c.Fail):null; return c; }
function rtTxt(c){ return c.rt==null ? "—" : Math.round(c.rt*100)+"%"; }
function nppQuarters(){ var qs=[]; for(var f=FY_MIN; f<=FY_NOW; f++) for(var q=1;q<=4;q++){ if(qStartK(f,q)>NOWK) continue; if(inPeriod({fy:f,q:q})) qs.push([f,q]); } return qs.reverse(); }
function nppHtml(){
  if(F.npp==="KQTT") return '<div class="note">Nguồn đang lọc là KQTT thị trường — chọn Mọi nguồn hoặc 2 NPP trong Bộ lọc để xem hiệu quả NPP.</div>';
  var ks=NPPS.filter(function(k){ return F.npp==="all" || F.npp==="NPP" || F.npp===k; }), reg={HUNGVI:"B", ICARE:"N"}, P={};
  var html='<div class="cap">Theo file thầu của NPP, gói tham dự trong kỳ '+esc(periodLabel())+esc(scopeTxt())+'. Tỉ lệ trúng = trúng ÷ (trúng + trượt); gói chờ kết quả / huỷ không tính.</div>';
  ks.forEach(function(k){
    var L=P[k]=nppPk(k), c=cnt(L), sm=0, st=0;
    if(sel<0) STAT.forEach(function(x,i){ if(NEW[i][1]===reg[k]){ sm+=x.sh.m; st+=x.sh.t; } });
    var w=function(v){ return (L.length?v/L.length*100:0).toFixed(1)+"%"; };
    html+='<div class="ncard"><div class="h"><b><i class="dot" style="background:'+NPP[k].color+'"></i> '+NPP[k].name+' <span style="font-weight:400;color:var(--t2);font-size:12px">· '+NPP[k].area+'</span></b><span class="rt" title="Tỉ lệ trúng">'+rtTxt(c)+'</span></div>'+
      '<div class="wr" aria-hidden="true"><i style="width:'+w(c.Win)+';background:var(--ok)"></i><i style="width:'+w(c.Fail)+';background:#E4A29B"></i><i style="width:'+w(c.Pending)+';background:#F3D19C"></i></div>'+
      '<div class="meta"><span><b>'+c.n+'</b> gói tham dự</span><span style="color:var(--ok)"><b>'+c.Win+'</b> trúng</span><span style="color:var(--bad)"><b>'+c.Fail+'</b> trượt</span><span><b>'+c.Pending+'</b> chờ</span>'+(c.Cancel?'<span><b>'+c.Cancel+'</b> huỷ</span>':'')+
      '<span>Giá trị trúng <b>'+vnd(c.val)+'</b></span>'+(st>0 && F.npp==="all" ? '<span>Thị phần MANI '+REGION[reg[k]].toLowerCase()+' <b>'+Math.round(sm/st*100)+'%</b></span>' : '')+'</div></div>';
  });
  var qs=nppQuarters().slice(0,8);
  if(qs.length>1) html+='<h3>Theo quý · trúng / tham dự</h3><table class="tb2"><thead><tr><th>Quý</th>'+ks.map(function(k){ return '<th class="r">'+NPP[k].name+'</th>'; }).join("")+'</tr></thead><tbody>'+qs.map(function(fq){
    return '<tr><td>Q'+fq[1]+' FY'+fq[0]+'</td>'+ks.map(function(k){ var c=cnt(P[k].filter(function(p){ return p.fy===fq[0] && p.q===fq[1]; })); return '<td class="r">'+(c.n?c.Win+' / '+c.n+' · <b>'+rtTxt(c)+'</b>':'—')+'</td>'; }).join("")+'</tr>'; }).join("")+'</tbody></table>';
  if(sel<0){
    var rows=[]; ks.forEach(function(k){ var by={}; P[k].forEach(function(p){ if(p.ni>=0) (by[p.ni]=by[p.ni]||[]).push(p); }); Object.keys(by).forEach(function(i){ rows.push([k,+i,cnt(by[i])]); }); });
    rows.sort(function(a,b){ return b[2].n-a[2].n; });
    if(rows.length) html+='<h3>Theo tỉnh / thành</h3><table class="tb2"><thead><tr><th>Tỉnh</th><th>NPP</th><th class="r">Tham dự</th><th class="r">Trúng</th><th class="r">Tỉ lệ</th><th class="r">Giá trị</th></tr></thead><tbody>'+rows.slice(0,14).map(function(r){ var c=r[2];
      return '<tr class="click" data-p="'+r[1]+'"><td>'+esc(NEW[r[1]][0])+'</td><td><i class="dot" style="background:'+NPP[r[0]].color+'"></i> '+NPP[r[0]].name+'</td><td class="r">'+c.n+'</td><td class="r">'+c.Win+'</td><td class="r"><b>'+rtTxt(c)+'</b></td><td class="r">'+vnd(c.val)+'</td></tr>'; }).join("")+'</tbody></table>';
  }
  return html;
}

/* ── Dự báo tiêu thụ: hợp đồng MANI còn hiệu lực, SL ÷ số tháng thực hiện, chia đều mỗi tháng ── */
function fcData(){
  var months=[], M={}, n=0; for(var i=0;i<12;i++){ var k=addK(NOWK,i); months.push(k); M[k]={dao:0,chi:0,src:{},g:{}}; }
  PKGS.forEach(function(p){
    if(p.res!=="Win" || !(p.status==="ok"||p.status==="warn") || !p.approve || !p.end || p.ni<0 || !inScope(p) || !pass(p,false,{np:1,nb:1})) return;
    var its=p.items.filter(function(it){ return it.result==="Win" && isMani(it) && itOk0(it) && +it.qty>0; }); if(!its.length) return;
    var a=monKey(p.approve), b=monKey(p.end), dur=Math.max(1,p.dur||12); n++;
    its.forEach(function(it){ var r=it.qty/dur, c=it.cat==="chi"?"chi":"dao";
      months.forEach(function(k){ if(k<a || k>b) return; var m=M[k]; m[c]+=r; m.src[p.npp+"|"+c]=(m.src[p.npp+"|"+c]||0)+r; m.g[it.g]=(m.g[it.g]||0)+r; }); });
  });
  return { months:months, M:M, n:n };
}
function fcHtml(){
  var d=fcData(), html='<div class="cap">Từ hợp đồng MANI còn hiệu lực'+esc(scopeTxt())+' (2 NPP + dòng MANI trong KQTT): SL hợp đồng ÷ số tháng thực hiện, chia đều từng tháng tới khi hết hạn. Chưa trừ phần bệnh viện đã lấy — dùng để đối chiếu file Dự trù NPP.</div>';
  if(!d.n) return html+'<div class="empty">Không có hợp đồng MANI còn hiệu lực trong bộ lọc.</div>';
  var sum=function(f){ return d.months.reduce(function(a,k){ return a+f(d.M[k]); },0); }, r=function(v){ return nfmt(Math.round(v)); };
  var td=sum(function(m){ return m.dao; }), tc=sum(function(m){ return m.chi; }), mx=Math.max.apply(null,[1].concat(d.months.map(function(k){ return d.M[k].dao+d.M[k].chi; })));
  html+='<div class="kpis"><div class="kpi"><b>'+d.n+'</b><span>Hợp đồng MANI còn hiệu lực</span></div><div class="kpi"><b>'+r(td)+'</b><span>Dao · 12 tháng tới (cái)</span></div><div class="kpi"><b>'+r(tc)+'</b><span>Chỉ khâu · 12 tháng tới (sợi)</span></div></div>';
  html+='<table class="tb2"><thead><tr><th>Tháng</th><th class="r">Dao (cái)</th><th class="r">Chỉ khâu (sợi)</th><th style="width:34%"></th></tr></thead><tbody>'+d.months.map(function(k){ var m=d.M[k];
    return '<tr><td>'+monLbl(k)+'</td><td class="r">'+r(m.dao)+'</td><td class="r">'+r(m.chi)+'</td><td><span class="bar" style="display:flex"><i style="width:'+(m.dao/mx*100).toFixed(1)+'%;background:#0EA5E9"></i><i style="width:'+(m.chi/mx*100).toFixed(1)+'%;background:#F59E0B"></i></span></td></tr>'; }).join("")+'</tbody></table>';
  var srcs=[["HUNGVI","Hùng Vĩ"],["ICARE","iCare"],["KQTT","MANI qua KQTT (NPP khác)"]];
  html+='<h3>Theo nguồn · 12 tháng tới</h3><table class="tb2"><thead><tr><th>Nguồn</th><th class="r">Dao</th><th class="r">Chỉ khâu</th><th class="r">Dao / tháng (3 tháng tới)</th></tr></thead><tbody>'+srcs.map(function(x){
    var a=sum(function(m){ return m.src[x[0]+"|dao"]||0; }), b=sum(function(m){ return m.src[x[0]+"|chi"]||0; }); if(!a && !b) return "";
    var a3=d.months.slice(0,3).reduce(function(s2,k){ return s2+(d.M[k].src[x[0]+"|dao"]||0); },0)/3;
    return '<tr><td><i class="dot" style="background:'+NPP[x[0]].color+'"></i> '+x[1]+'</td><td class="r">'+r(a)+'</td><td class="r">'+r(b)+'</td><td class="r">'+r(a3)+'</td></tr>'; }).join("")+'</tbody></table>';
  var gs=GR.map(function(g){ return [g, sum(function(m){ return m.g[g.k]||0; })]; }).filter(function(x){ return x[1]>0; });
  if(gs.length) html+='<h3>Theo nhóm sản phẩm · 12 tháng tới</h3><div class="mixl">'+gs.map(function(x){ return '<span class="g"><i style="background:'+x[0].c+'"></i>'+esc(x[0].name)+'</span><b>'+r(x[1])+' '+x[0].u+'</b>'; }).join("")+'</div>';
  return html;
}
function shareProvHtml(){
  var a=STAT.map(function(x,i){ return {i:i,s:x}; }).filter(function(o){ return o.s.sh.t>0; }).sort(function(x,y){ return y.s.sh.t-x.s.sh.t; }).slice(0,15);
  if(!a.length) return '<div class="empty">Chưa có dữ liệu thị phần trong bộ lọc (cần nguồn KQTT thị trường).</div>';
  return '<div class="bars shb">'+a.map(function(o){ var r=o.s.sh.m/o.s.sh.t;
    return '<div class="r click" data-p="'+o.i+'" role="button" tabindex="0"><span>'+esc(NEW[o.i][0])+'</span><span class="ms" title="MANI '+Math.round(r*100)+'% · hãng khác '+(100-Math.round(r*100))+'%"><i style="width:'+(r*100).toFixed(1)+'%"></i></span><span class="num">'+Math.round(r*100)+'% · '+fm(o.s.sh.t)+'</span></div>'; }).join("")+'</div>'+
    '<div class="shl" style="margin-top:4px"><span><i style="background:#1F4E8C"></i>MANI</span><span><i style="background:#EBC3AE"></i>Hãng khác</span><span style="color:var(--t3)">· số = % MANI · tổng thị trường</span></div>';
}
function fyRange(fy,q){
  var y0=fy+1958; // FY67 → 2025
  if(!q) return "09/"+y0+" – 08/"+(y0+1);
  var m0=[9,12,3,6][q-1], yA = m0>=9? y0 : y0+1, m1=m0+2, yB=yA; if(m1>12){ m1-=12; yB++; }
  return String(m0).padStart(2,"0")+"/"+yA+" – "+String(m1).padStart(2,"0")+"/"+yB;
}
SB.addEventListener("click",function(e){
  var rl=e.target.closest("[data-reload]"); if(rl){ LOADERR=""; renderSide(); load(true); if(FU.auth()){ FU.load(); ACT.load(); } return; }
  var ev=e.target.closest("[data-every]"); if(ev){ F.fy="every"; F.q=0; renderFilters(); refresh(); return; }
  var ao=e.target.closest("[data-act-open]"); if(ao){ ACT.openCode(ao.dataset.actOpen); return; }
  var re=e.target.closest("[data-re]"); if(re){ var en=RE.last[+re.dataset.re]; if(en && en.p.h) FU.open({f:en.p.h.f, pre:rePre(en)}); return; }
  var rw=e.target.closest("[data-rew]"); if(rw){ RE.who=rw.dataset.rew; renderSide(); return; }
  var pk=e.target.closest("[data-pxk]"); if(pk){ PX.k=pk.dataset.pxk; renderSide(); return; }
  var fx=e.target.closest("[data-fx-all]"); if(fx){ resetF("*"); renderFilters(); refresh(); return; }
  var tb=e.target.closest("[data-tab]"); if(tb){ TAB=tb.dataset.tab; renderSide(); return; }
  var sb=e.target.closest("[data-sub]"); if(sb){ setType((!sb.dataset.sub || F.sub===sb.dataset.sub) ? "all" : sb.dataset.sub); renderFilters(); refresh(); return; }
  var hc=e.target.closest("[data-h]"); if(hc && HK[hc.dataset.h]){ selectHosp(HK[hc.dataset.h]); return; }
  var p=e.target.closest("[data-p]"); if(p && +p.dataset.p>=0){ selectProv(+p.dataset.p); return; }
  var c=e.target.closest(".chip[data-o]"); if(c){ selOld=c.dataset.o||null; paintBubbles(); renderSide(); }
});
SB.addEventListener("mouseover",function(e){ var r=e.target.closest(".rank li[data-pv]"); var i=r?+r.dataset.pv:-1; PROV.forEach(function(P,k){ if(P) P.el.classList.toggle("hl",k===i); }); });
SB.addEventListener("mouseleave",function(){ PROV.forEach(function(P){ if(P) P.el.classList.remove("hl"); }); });
document.getElementById("sh-t").addEventListener("click",function(e){ if(e.target.closest("[data-up]")) selectProv(sel); });
SB.addEventListener("keydown",function(e){ if((e.key==="Enter"||e.key===" ") && e.target.matches("[role=button]")){ e.preventDefault(); e.target.click(); } });

var LOADERR="";
function noteHtml(){
  var n=[];
  if(LOADERR) n.push('<div class="note err">'+esc(LOADERR)+' <button class="lnk" type="button" data-reload="1">Thử lại</button></div>');
  var lite=NPPS.filter(function(k){ return META[k] && META[k].lite; });
  if(lite.length) n.push('<div class="note">'+lite.map(function(k){ return NPP[k].name; }).join(", ")+': máy chủ chưa có bản đọc đầy đủ — đang hiện DAO, chưa có chỉ khâu.</div>');
  if(META.cached) n.push('<div class="note">Đang hiện dữ liệu lưu lần trước ('+esc(META.cached)+'), đang đọc bản mới…</div>');
  return n.join("");
}
function footHtml(){ return ""; }
function footHtmlOld(){
  var t=["HUNGVI","ICARE"].map(function(k){ return META[k] ? NPP[k].name+": "+(RAW[k]||[]).length+" dòng · đọc lúc "+esc(META[k].exported||"") : NPP[k].name+": chưa đọc được"; }).join("<br>");
  return '<div class="foot">Nguồn: file "Tender Authorization list" của 2 NPP (Google Sheet), FY67 bắt đầu 09/2025. Kỳ của gói = tháng phê duyệt (chưa có thì theo tháng giấy uỷ quyền). Hợp đồng = ngày phê duyệt + thời gian thực hiện (trống = 12 tháng). Ranh giới theo 34 tỉnh / thành từ 01/07/2025.<br>'+t+'</div>';
}

/* ═════════ TÌM CƠ SỞ Y TẾ (ô tìm ở thanh trên, Ctrl/⌘ + K) ═════════
   Bỏ dấu, hiểu viết tắt (bv, bvđk, ttyt, đk, tw, tp, hcm), mỗi từ gõ phải khớp đầu 1 từ trong tên / tỉnh mới / tỉnh cũ / địa chỉ. */
var QS=(function(){
  function idx(f){ if(!f._q) f._q=" "+nw(f.name+" "+f.alias.join(" ")+" "+NEW[f.ni][0]+" "+NEW[f.ni][2].join(" ")+" "+(f.addr||""))+" "; return f._q; }
  function search(q, lim, pool){
    var t=nw(q).split(" ").filter(Boolean); if(!t.length) return [];
    var out=[];
    var sp=SCOPE.pic();
    (pool||FAC).forEach(function(f){
      if(!SCOPE.inProv(f.ni, f.oi) && !(sp && ((f.acc && f.acc.pic===sp) || ACT.byFac(f).some(function(a){ return a.pic===sp; })))) return;   /* ngoài địa bàn: chỉ khách CRM của chính PIC */
      var w=idx(f); if(!t.every(function(x){ return w.indexOf(" "+x)>=0; })) return;
      var nm=" "+nw(f.name)+" ", sc=0;
      t.forEach(function(x){ if(nm.indexOf(" "+x)>=0) sc+=3; });
      if(nm.indexOf(" "+t.join(" "))>=0) sc+=6;
      if(f.h && f.h.pk && f.h.pk.length) sc+=2;
      if(FU.byFac(f).length) sc+=2;
      if(f.t==="bv") sc+=1; if(f.sp==="mat") sc+=1;
      out.push([sc,f]);
    });
    out.sort(function(a,b){ return b[0]-a[0] || a[1].name.length-b[1].name.length; });
    return out.slice(0, lim||12).map(function(x){ return x[1]; });
  }
  function mark(name, q){
    var t=nw(q).split(" ").filter(Boolean), words=String(name).split(/(\s+)/);
    return words.map(function(w){ var k=nw(w); return k && t.some(function(x){ return k.indexOf(x)===0; }) ? '<mark>'+esc(w)+'</mark>' : esc(w); }).join("");
  }
  function tags(f){
    var h=f.h, o=[];
    o.push(isPv(f) ? '<span class="tg1 pv">Tư nhân</span>' : '<span class="tg1 cl">Công lập</span>');
    if(f.acc || ACT.byFac(f).length) o.push('<span class="tg1 c">CRM</span>');
    if(h && h.pk && h.pk.length){ if(h.npps.HUNGVI||h.npps.ICARE) o.push('<span class="tg1 n">NPP</span>'); if(h.npps.KQTT) o.push('<span class="tg1 k">KQTT</span>'); }
    if(FU.byFac(f).length) o.push('<span class="tg1 f">Theo dõi</span>');
    return o.join("");
  }
  function itemHtml(f, q, i, on){
    return '<div class="it'+(on?" on":"")+'" role="option" data-i="'+i+'"><span class="nm">'+mark(f.name,q)+'</span><span class="tg">'+tags(f)+'</span>'+
      '<span class="sb">'+esc(CT[f.t]||"Cơ sở y tế")+(f.sp&&CSP[f.sp]&&f.t!=="ttyt"?' '+esc(CSP[f.sp].toLowerCase()):'')+' · '+esc(NEW[f.ni][0])+(f.addr?' · '+esc((function(a){ return a.length>60?a.slice(0,58)+"…":a; })(addrFmt(f.addr))):'')+'</span></div>';
  }
  /* gắn ô tìm: inp = <input>, box = khung kết quả, pick(f) khi chọn; extra = mục cuối (vd. "Thêm cơ sở mới") */
  function wire(inp, box, pick, extra){
    var res=[], on=0;
    function draw(){
      var q=inp.value.trim();
      if(q.length<2){ box.hidden=true; return; }
      res=search(q, 12); on=Math.min(on, Math.max(0,res.length-1));
      box.innerHTML=(res.length? '<div class="hd">'+res.length+(res.length>=12?"+":"")+' cơ sở · '+FAC.length.toLocaleString("vi-VN")+' cơ sở trong danh mục</div>'+res.map(function(f,i){ return itemHtml(f,q,i,i===on); }).join("")
        : '<div class="hd">Không thấy "'+esc(q)+'" trong danh mục.</div>')+(extra?'<div class="it add" data-x="1">'+extra(q)+'</div>':'');
      box.hidden=false;
    }
    inp.addEventListener("input",function(){ on=0; draw(); });
    inp.addEventListener("focus",draw);
    inp.addEventListener("keydown",function(e){
      if(box.hidden) return;
      if(e.key==="ArrowDown"||e.key==="ArrowUp"){ e.preventDefault(); on=(on+(e.key==="ArrowDown"?1:-1)+res.length)%Math.max(1,res.length); draw(); }
      else if(e.key==="Enter"){ e.preventDefault(); if(res[on]){ box.hidden=true; pick(res[on]); } }
      else if(e.key==="Escape"){ box.hidden=true; inp.blur(); e.stopPropagation(); }
    });
    box.addEventListener("mousedown",function(e){ e.preventDefault(); });
    box.addEventListener("click",function(e){
      var it=e.target.closest(".it"); if(!it) return;
      if(it.dataset.x){ box.hidden=true; if(extra) extra(inp.value.trim(), true); return; }
      var f=res[+it.dataset.i]; if(f){ box.hidden=true; pick(f); }
    });
    document.addEventListener("click",function(e){ if(!box.contains(e.target) && e.target!==inp) box.hidden=true; });
  }
  function open(f){
    if(F.view==="act"){ var ac=f.acc || ACT.byFac(f)[0]; if(ac && ac.h){ selectHosp(ac.h); return; } }
    var h=hospOf(f); selectHosp(h);
  }
  return { search:search, wire:wire, open:open, mark:mark };
})();

/* ═════════ THEO DÕI THẦU (sheet ẩn "FOLLOW UP TENDER" — backend CRM Surgical VN) ═════════
   Mỗi lần cập nhật = 1 dòng mới (không sửa / xoá dòng cũ). Gói = các dòng cùng "Mã theo dõi"; trạng thái = dòng mới nhất.
   Đăng nhập: phiên email công ty (localStorage.mmh_tk — dùng chung Report Hub / CRM cùng trang manimedicalhanoi.github.io).
   Ghi: hàng đợi trên máy (tm_fu_outbox_v1) — hiện ngay, gửi nền theo thứ tự, lỗi mạng tự thử lại cùng mã yêu cầu (rid). */
var FU=(function(){
  /* 1–9: thầu công lập · 11–19: mua sắm cơ sở TƯ NHÂN (Giới thiệu → Demo → Đề xuất từ chuyên môn → Ký hợp đồng → Sử dụng hàng) — backend MMH_TenderFU v1.5 */
  /* 09/11/2026 (backend v1.9): giai đoạn bán hàng theo file kế hoạch FY68 của NPP — 6 bỏ trống (dòng cũ máy chủ tự đổi số), 10 = Không tham dự */
  var ST=["","Chưa tiếp cận","Đã giới thiệu tới chuyên môn","Đang xây cấu hình","Đã gửi báo giá","Đang dự thầu","","Đã trúng thầu","Trượt thầu","Tạm dừng theo dõi","Không tham dự",
          "Giới thiệu","Demo","Đề xuất từ chuyên môn","Ký hợp đồng mua sắm","Sử dụng hàng","","","Không thành công","Dừng theo dõi"];
  var SH=["","Chưa tiếp cận","Đã giới thiệu","Xây cấu hình","Đã báo giá","Đang dự thầu","","Đã trúng","Trượt thầu","Tạm dừng","Không tham dự",
          "Giới thiệu","Demo","Đề xuất chuyên môn","Ký HĐ mua sắm","Sử dụng hàng","","","Không thành công","Dừng"];
  var SC=["","#B9CCE4","#8DB3E2","#5B8FCF","#2F68B3","#C77700","#B45309","#2E7D32","#B42318","#98A2B3","#B7BFCA",
          "#C4B5FD","#A78BFA","#8B5CF6","#6D28D9","#2E7D32","","","#B42318","#98A2B3"];
  var TEND=[1,2,3,4,5,7,8,10,9], PRIV=[11,12,13,14,15,18,19], TBST={5:1,7:1,8:1};
  function isOpen(st){ return (st>=1&&st<=6) || (st>=11&&st<=14); }
  function isWon(st){ return st===7 || st===15; }
  function isPriv(f){ return isPv(f); }
  var FUCOL="#2F68B3";
  var COLS=["at","id","rev","pic","mail","fid","hosp","prov","addr","pkg","tbmt","ptype","itemsTxt","qty","value","stage","stageName","due","note","items","rid","src","ll"];
  var LS_TK="mmh_tk", LS_MAIL="mmh_last_email", LS_DATA="tm_fu_v1", LS_OB="tm_fu_outbox_v1";
  var S={ rows:[], loaded:false, loading:false, err:"", me:null, who:"all", stf:"open", stage:0, at:"", ver:0, q:"", kind:"pub" };
  try{ S.kind=localStorage.getItem("tm_fu_kind")==="pv"?"pv":"pub"; }catch(_){}
  var CASES=null, BYF=null, OB=[], obBusy=false, obTimer=null, lg={step:"email", email:"", busy:false, err:"", wait:0};
  try{ OB=JSON.parse(localStorage.getItem(LS_OB)||"[]")||[]; }catch(_){ OB=[]; }
  try{ var c0=JSON.parse(localStorage.getItem(LS_DATA)||"null"); if(c0 && c0.rows){ S.rows=c0.rows; S.at=c0.at; S.me=c0.me||null; } }catch(_){}

  /* ── đăng nhập (Training Hub rhAuthStart / rhAuthVerify, như Report Hub / CRM) ── */
  function auth(){ try{ var o=JSON.parse(localStorage.getItem(LS_TK)||"null"); if(!o||!o.tk||!o.user||!o.user.pic) return null; if(o.exp && Date.now()>o.exp) return null; return o; }catch(_){ return null; } }
  function tk(){ var a=auth(); return a?a.tk:""; }
  /* máy chủ từ chối phiên: CHỈ xoá phiên (dùng chung Report Hub / CRM trên trình duyệt này) khi phiên thật sự hết hạn / không hợp lệ / bị khoá;
     lỗi khác ⇒ giữ phiên, hiện lý do (trước đây xoá ngay ⇒ quay lại ô nhập email, không rõ vì sao, và đăng xuất luôn Report Hub / CRM) */
  function authFail(msg){
    if(/hết hạn|không hợp lệ|đăng xuất|bị khoá|không có trong RH_Users/i.test(String(msg||""))){ try{ localStorage.removeItem(LS_TK); }catch(_){} lg.step="email"; lg.err=msg; if((typeof GATE!=="undefined"&&GATE)) GATE.show(); }
    user();
  }
  function qs(o){ return Object.keys(o).map(function(k){ return encodeURIComponent(k)+"="+encodeURIComponent(o[k]==null?"":o[k]); }).join("&"); }
  /* đọc bằng fetch KHÔNG kèm cookie Google trước (getJSON): Chrome / điện thoại đăng nhập Gmail khác hoặc nhiều tài khoản thì thẻ <script>
     bị Google chuyển sang trang "chọn tài khoản" ⇒ "không tải được" (cùng lỗi Report Hub đã sửa ở v16.7) */
  function hub(action, params){ return getJSON(TRAINING_HUB+"?"+qs(Object.assign({action:action}, params||{}))); }
  function lgUi(){ side(); if((typeof GATE!=="undefined"&&GATE)) GATE.paint(); }
  function lgSend(again){
    if(lg.busy) return;
    var i=document.getElementById("lg-email"); if(i) lg.email=String(i.value||"").trim().toLowerCase().replace(/\s+/g,"");
    if(lg.email && lg.email.indexOf("@")<0) lg.email+="@manimedicalhanoi.com";
    if(!/^[a-z0-9._%+\-]+@(mani\.inc|manimedicalhanoi\.com)$/.test(lg.email)){ lg.err="Nhập email công ty: …@manimedicalhanoi.com hoặc …@mani.inc"; lgUi(); return; }
    try{ localStorage.setItem(LS_MAIL, lg.email); }catch(_){}
    lg.busy=true; lg.err=""; lgUi();
    hub("rhAuthStart",{email:lg.email}).then(function(d){
      lg.busy=false;
      if(d && (d.ok || d.code==="WAIT")){ lg.step="code"; lg.err=d.ok?(again?"Đã gửi mã mới.":""):(d.error||""); }
      else lg.err=(d&&d.error)||"Chưa gửi được mã.";
      lgUi(); var c=document.getElementById("lg-code"); if(c) c.focus();
    },function(e){ lg.busy=false; lg.err="Không kết nối được máy chủ đăng nhập ("+e.message+"). Kiểm tra mạng rồi bấm Gửi mã lại."; lgUi(); });
  }
  function lgVerify(){
    if(lg.busy) return;
    var c=document.getElementById("lg-code"), code=c?String(c.value||"").replace(/\D/g,""):"";
    if(code.length!==6){ lg.err="Nhập đủ 6 số trong email."; lgUi(); return; }
    lg.busy=true; lg.err=""; lgUi();
    hub("rhAuthVerify",{email:lg.email, code:code}).then(function(d){
      lg.busy=false;
      if(d && d.ok && d.token && d.user){
        try{ localStorage.setItem(LS_TK, JSON.stringify({tk:d.token, exp:d.exp, user:d.user, at:Date.now()})); }catch(_){}
        lg={step:"email", email:lg.email, busy:false, err:"", wait:0, open:false}; user(); load(); obRun();
        if(PEND){ var o2=PEND; PEND=null; setTimeout(function(){ open(o2); }, 60); }
        ONL.forEach(function(fn){ try{ fn(); }catch(_){} });
        return;
      }
      lg.err=(d&&d.error)||"Mã chưa đúng."; lgUi();
    },function(e){ lg.busy=false; lg.err=e.message; lgUi(); });
  }
  function loginHtml(compact){
    var gate=compact==="gate";
    if(!gate && (typeof GATE!=="undefined"&&GATE) && GATE.on()) return '<div class="note">Đăng nhập bằng email công ty ở màn hình đầu để xem.</div>';
    var em=lg.email; if(!em){ try{ em=localStorage.getItem(LS_MAIL)||""; }catch(_){} }
    return '<div class="lgbox'+(gate?' lgg':'')+'"><h4>'+(gate?'Đăng nhập bằng email công ty':'Đăng nhập để '+(compact?'xem / cập nhật theo dõi thầu':'dùng Theo dõi thầu'))+'</h4>'+
      (compact?'':'<p>Dành cho nhân sự MMH. Dùng email công ty như Report Hub / CRM — đã đăng nhập ở 2 app đó trên trình duyệt này thì vào thẳng.</p>')+
      (lg.step==="email"
        ? '<div class="row"><input class="inp" id="lg-email" type="email" inputmode="email" autocomplete="email" placeholder="ten@manimedicalhanoi.com" value="'+esc(em)+'"><button class="btn pri" data-lg="send" type="button"'+(lg.busy?" disabled":"")+'>'+(lg.busy?"Đang gửi…":"Gửi mã")+'</button></div>'
        : '<p style="margin-bottom:6px">Mã 6 số đã gửi tới <b>'+esc(lg.email)+'</b>.</p><div class="row"><input class="inp" id="lg-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 số"><button class="btn pri" data-lg="verify" type="button"'+(lg.busy?" disabled":"")+'>'+(lg.busy?"Đang kiểm tra…":"Đăng nhập")+'</button></div>'+
          '<div style="margin-top:6px;font-size:12.5px"><button class="lnk" data-lg="resend" type="button">Gửi lại mã</button> · <button class="lnk" data-lg="back" type="button">Đổi email</button></div>')+
      '<div class="lgerr">'+esc(lg.err)+'</div></div>';
  }
  function user(){
    var u=document.getElementById("uchip"), a=auth();
    if(!a){ u.innerHTML=""; return; }
    var n=a.user.pic||"", ini=n.split(/\s+/).map(function(w){ return w[0]; }).join("").slice(-2).toUpperCase();
    u.innerHTML='<button class="uchip" type="button" id="uc-b" title="'+esc((a.user.email||"")+" — bấm để đăng xuất khỏi Tender Map")+'"><i>'+esc(ini)+'</i>'+esc(n)+'</button>';
    document.getElementById("uc-b").onclick=function(){
      if(window.confirm("Đăng xuất "+n+"? (Report Hub / CRM mở trên trình duyệt này cũng phải đăng nhập lại)")){ try{ localStorage.removeItem(LS_TK); }catch(_){} S.me=null; user(); renderFilters(); refresh(); if((typeof GATE!=="undefined"&&GATE)) GATE.show(); }
    };
  }

  /* ── đọc dữ liệu ── */
  function rowObj(a){ var o={}; COLS.forEach(function(c,i){ o[c]=a[i]; }); try{ o.it=JSON.parse(o.items||"[]")||[]; }catch(_){ o.it=[]; } o.stage=+o.stage||0; o.rev=+o.rev||1; return o; }
  function load(){
    var t=tk(); if(!t){ side(); return Promise.resolve(); }
    if(S.loading) return Promise.resolve();
    S.loading=true; S.err="";
    return getJSON(CRM_SURG+"?action=fuList&tk="+encodeURIComponent(t)).then(function(d){
      S.loading=false;
      if(d && d.ok){ if(Array.isArray(d.cols)) COLS=d.cols; S.rows=d.rows||[]; S.me=d.me||null; S.loaded=true; S.at=new Date().toLocaleString("vi-VN");
        try{ localStorage.setItem(LS_DATA, JSON.stringify({rows:S.rows, at:S.at, me:S.me})); }catch(_){} }
      else if(d && d.code==="AUTH"){ S.err=d.error||"Phiên đăng nhập hết hạn — đăng nhập lại."; authFail(S.err); }
      else S.err=(d&&d.error)||"Không đọc được dữ liệu theo dõi thầu.";
      inval(); renderFilters(); if(F.view==="fu"||selH) refresh();
    },function(e){ S.loading=false; S.err="Không đọc được dữ liệu theo dõi thầu ("+e.message+")."; if(F.view==="fu") refresh(); });
  }
  function inval(){ CASES=null; BYF=null; S.ver++; }
  function rowsAll(){
    var seen={}; S.rows.forEach(function(r){ if(r[COLS.indexOf("rid")]) seen[r[COLS.indexOf("rid")]]=1; });
    var out=S.rows.map(rowObj);
    OB.forEach(function(o){ if(!seen[o.rid]){ var r=rowObj(o.row); r.pend=o.err?"err":"wait"; r.pendErr=o.err||""; out.push(r); } });
    return out;
  }
  /* gói = các dòng cùng Mã theo dõi ⇒ nối với cơ sở y tế (mã cơ sở ⇒ tên + tỉnh ⇒ tạo cơ sở mới) */
  function cases(){
    if(CASES) return CASES;
    var g={}; rowsAll().forEach(function(r){ if(!r.id) return; (g[r.id]=g[r.id]||[]).push(r); });
    CASES=[]; BYF={};
    Object.keys(g).forEach(function(id){
      var rs=g[id].sort(function(a,b){ return a.rev-b.rev || String(a.at).localeCompare(String(b.at)); }), L=rs[rs.length-1];
      var f=facOfRow(L); if(!f) return;
      var c={ id:id, revs:rs, last:L, first:rs[0], f:f, stage:L.stage, pic:L.pic, at:L.at, pend:rs.some(function(r){ return r.pend; }) };
      CASES.push(c); (BYF[f.id]=BYF[f.id]||[]).push(c);
    });
    CASES.sort(function(a,b){ return String(b.at).localeCompare(String(a.at)); });
    return CASES;
  }
  function facOfRow(r){
    if(r.fid && FID[r.fid]) return FID[r.fid];
    var ni=NEWIDX[nk(r.prov)]; if(ni==null){ var pv=provOf(r.prov, r.addr); ni=pv?pv.n:null; }
    if(ni==null) return null;
    var f=(FBYP[ni]||[]).filter(function(x){ return hkey(x.name)===hkey(r.hosp) || sameName(x.name, r.hosp); })[0];
    if(f) return f;
    var uid="U:"+ni+"|"+hkey(r.hosp); if(FID[uid]) return FID[uid];
    var ll=null, m=/^(-?[\d.]+),(-?[\d.]+)$/.exec(String(r.ll||"")); if(m) ll=[+m[2],+m[1]];
    var oi=r.own ? (TERR.filter(function(t){ return t.pic===r.own; }).map(function(t){ var v=t.ni[ni]; return v && v!==1 ? Object.keys(v)[0] : ""; })[0]||"") : ((provOf(r.prov, r.addr)||{}).o||"");
    return facAdd({ id:uid, name:r.hosp, t:kindOf(r.hosp)==="tt"?"ttyt":kindOf(r.hosp)==="bv"?"bv":"khac", sp:"", lv:"", ni:ni, oi:oi, addr:r.addr||"", ll:ll, src:"fu", alias:[], h:null });
  }
  function byFac(f){ cases(); return (BYF && BYF[f.id]) || []; }
  function mine(c){ var a=auth(); return !!a && String(c.pic).toLowerCase()===String(a.user.pic).toLowerCase(); }
  /* ── KẾ HOẠCH FY68 (sheet Follow up by Account, 11/11/2026): dòng ② Duy trì · ③ Mở mới · Đang dự thầu · tư nhân gộp theo gói ⇒ "mục" giống gói theo dõi
        (cùng tô bản đồ / đếm theo giai đoạn). Bỏ dòng ① (hợp đồng đang chạy), dòng Sales S| (= gói Theo dõi thầu), dòng đã được thay.
        Mục chưa có giai đoạn (stage 0) chỉ hiện khi chọn nút "Chưa có giai đoạn" — không làm rối bản đồ. ── */
  var STN=null, PLC=null;
  function stNum(nm){ if(!STN){ STN={}; ST.forEach(function(x,i){ if(x) STN[x]=i; }); } return STN[String(nm||"").trim()]||0; }
  function plans(){
    var fr=(typeof FA!=="undefined" && FA.rows) ? FA.rows() : [], key=S.ver+"|"+(FA.ver?FA.ver():0)+"|"+fr.length;
    if(PLC && PLC.k===key) return PLC.v;
    var g={}, order=[], out=[];
    fr.forEach(function(r){
      if(/^S\|/.test(r.id) || r.g==="①" || /Thay bằng|Gói đã thay/.test(r.inFc||"")) return;
      var k=r.caseId||r.id; if(!g[k]){ g[k]=[]; order.push(k); } g[k].push(r);
    });
    order.forEach(function(k){
      var rs=g[k], r0=rs[0], f=facOfRow({fid:r0.fid, hosp:r0.hosp, prov:r0.prov, addr:"", ll:""}); if(!f) return;
      var cnt={}; rs.forEach(function(r){ var n=stNum(r.stage); if(n) cnt[n]=(cnt[n]||0)+1; });
      var st=+(Object.keys(cnt).sort(function(a,b){ return cnt[b]-cnt[a] || b-a; })[0]||0), pv=r0.kenh==="Tư nhân";
      var at=rs.map(function(r){ return String(r.at||""); }).sort().pop()||"";
      out.push({ id:"P:"+k, plan:true, pv:pv, f:f, stage:st, pic:r0.pic||"", at:at, grp:r0.g, rows:rs, revs:[], first:{at:""},
        last:{ pkg:(FA.gname?FA.gname(r0.g):r0.grp)+(r0.npp?" · "+r0.npp:""), it:rs.map(function(r){ return {code:r.code, qty:r.qty, kind:r.kind||"dao"}; }), tbmt:r0.tbmt||"",
          note:rs.map(function(r){ return r.note; }).filter(Boolean)[0]||"", due:rs.map(function(r){ return r.due; }).filter(Boolean).sort()[0]||"", pic:r0.pic||"", at:at, value:0 } });
    });
    PLC={k:key, v:out}; return out;
  }
  function items(){ return cases().concat(plans()); }
  /* độ phủ theo dõi (COV): bệnh viện / tỉnh có gói theo dõi hoặc kế hoạch có giai đoạn (trong kỳ, địa bàn) ÷ thị trường */
  function covData(){
    if(!auth()) return null;
    var pv=S.kind==="pv", mk={}, fol={}, pF={}, pT={};
    if(!pv) PKGS.forEach(function(p){ if(p.res!=="Win" || !p.h || !SCOPE.inProv(p.ni, p.oi) || (sel>=0 && p.ni!==sel) || isPv(p.h.f)) return; mk[p.h.key]=1; });
    items().forEach(function(c){
      if(!c.f || (sel>=0 && c.f.ni!==sel) || !pass(c,true,{nf:1})) return;
      if(!c.stage || c.stage===8 || c.stage===9 || c.stage===10 || c.stage===18 || c.stage===19) return;
      var k=hospOf(c.f).key; fol[k]=1; if(!pv) mk[k]=1; pF[c.f.ni]=1;
    });
    NEW.forEach(function(x,i){ if((sel<0 || i===sel) && SCOPE.inProv(i, "")) pT[i]=1; });
    var nf=Object.keys(fol).length;
    if(pv){ var np=(typeof ACT!=="undefined" && ACT.privN) ? ACT.privN() : 0; return { pv:true, h:[nf, Math.max(nf, np)], p:[Object.keys(pF).length, Object.keys(pT).length] }; }
    return { pv:false, h:[nf, Object.keys(mk).length], p:[Object.keys(pF).length, Object.keys(pT).length] };
  }
  function isPvItem(c){ return c.plan ? !!c.pv : (c.stage>=11 || isPriv(c.f)); }
  /* kỳ (F.pk, mặc định kỳ hiện tại): gói có cập nhật trong kỳ, hoặc gói còn đang theo dõi khi kỳ chưa kết thúc; kế hoạch FY68 = FY hiện tại */
  function inPer(c){
    if(F.fy==="all" || F.fy==="every") return true;
    var sp=PERX.span(F.pk);
    if(c.plan){ var a=PERX.kS(fyStartK(FY_NOW)), b=PERX.kE(addK(fyStartK(FY_NOW),11)); return !(b<sp[0] || a>sp[1]); }
    if(c.revs.some(function(r){ var d=String(r.at||"").slice(0,10); return d>=sp[0] && d<=sp[1]; })) return true;
    return isOpen(c.stage) && sp[1]>=NOW && String(c.first.at||"").slice(0,10)<=sp[1];
  }
  /* o.nk = bỏ qua Công lập / Tư nhân · o.nf = bỏ qua trạng thái (Đang theo dõi / Thành công…) — dùng để đếm cho hàng nút */
  function pass(c, noStage, o){
    o=o||{};
    if(c.f && !SCOPE.inProv(c.f.ni, c.f.oi) && !(SCOPE.locked() && mine(c))) return false;   /* địa bàn PIC (+ gói chính Sales đó tạo ngoài địa bàn) */
    if(c.f && F.own!=="all" && !ownOk(isPv(c.f))) return false;
    if(!o.nk && c.f && (S.kind==="pv")!==isPvItem(c)) return false;
    if(!inPer(c)) return false;
    var s=c.stage;
    if(c.plan && !s) return S.stage===-1;                                                     /* kế hoạch chưa có giai đoạn: chỉ khi chọn nút đó */
    if(!noStage && S.stage===-1) return false;
    if(!o.nf && !(!noStage && S.stage)){
      if(S.stf==="open" && !isOpen(s)) return false;
      if(S.stf==="won" && !isWon(s)) return false;
      if(S.stf==="lost" && !(s===8||s===9||s===10||s===18||s===19)) return false;
    }
    if(!noStage && S.stage>0 && s!==S.stage) return false;
    return true;
  }
  /* ── HÀNG NÚT GIAI ĐOẠN (người dùng 11/11/2026): Thầu công lập | Tư nhân + mỗi giai đoạn 1 nút có số — bấm ⇒ bản đồ + danh sách chỉ còn giai đoạn đó.
        Nằm ở ĐẦU BẢNG BÊN (máy tính + điện thoại) — người dùng: không để che bản đồ. ── */
  function barHtml(){
    var all=items(), cnt={}, n0=0, tot=0;
    all.forEach(function(c){
      if(c.plan && !c.stage){ if(pass(Object.assign({},c,{stage:1}),true,{nf:1})) n0++; return; }
      if(!pass(c,true,{nf:1})) return; tot++; cnt[c.stage]=(cnt[c.stage]||0)+1; });
    var ks=S.kind==="pv"?PRIV:TEND, b=function(k,lab,n,col){ var on=S.stage===k; return '<button type="button" data-stc="'+k+'" class="stc'+(on?" on":"")+(n?"":" z")+'" aria-pressed="'+on+'">'+(col?'<i style="background:'+col+'"></i>':'')+esc(lab)+'<b>'+n+'</b></button>'; };
    return '<div class="seg stk" role="tablist" aria-label="Loại cơ sở">'+[["pub","Thầu công lập"],["pv","Tư nhân · mua sắm"]].map(function(o){ var on=S.kind===o[0]; return '<button type="button" data-stk="'+o[0]+'" class="'+(on?"on":"")+'" aria-pressed="'+on+'">'+o[1]+'</button>'; }).join("")+'</div>'+
      '<div class="stcs">'+b(0,"Tất cả",tot,"")+ks.map(function(k){ return b(k,SH[k],cnt[k]||0,SC[k]); }).join("")+b(-1,"Chưa có giai đoạn",n0,"#D0D5DD")+'</div>';
  }
  function bar(){
    var el=document.getElementById("stbar"); if(!el) return;
    el.hidden=true;                                                                          /* không nổi trên bản đồ nữa */
  }
  function barClick(e){
    var b=e.target.closest("[data-stk],[data-stc]"); if(!b) return false;
    if(b.dataset.stk){ if(S.kind===b.dataset.stk) return true; S.kind=b.dataset.stk; S.stage=0; try{ localStorage.setItem("tm_fu_kind",S.kind); }catch(_){} }
    else { var k=+b.dataset.stc; S.stage = (S.stage===k && k) ? 0 : k; }
    filters(); refresh(); return true;
  }
  document.addEventListener("click",function(e){ if(e.target.closest(".stbar")) barClick(e); });
  function qtyOf(c, kind){ return (c.last.it||[]).reduce(function(a,it){ return a+((it.kind||"dao")===kind ? (+it.qty||0) : 0); },0); }

  /* ── bộ lọc ở thanh trên ── */
  function segH(id, opts, cur, cb){
    var el=document.getElementById(id);
    el.innerHTML=opts.map(function(o){ return '<button type="button" data-v="'+o[0]+'" class="'+(cur===o[0]?"on":"")+'">'+o[1]+'</button>'; }).join("");
    el.onclick=function(e){ var b=e.target.closest("button"); if(!b) return; cb(b.dataset.v); renderFilters(); refresh(); };
  }
  function filters(){
    segH("fu-st", [["open","Đang theo dõi"],["won","Thành công"],["lost","Trượt / dừng"],["all","Tất cả"]], S.stf, function(v){ S.stf=v; S.stage=0; });
    document.getElementById("fu-add").onclick=function(){ open({}); };
    user(); obChip();
  }

  /* ── bản đồ: tỉnh tô theo số gói, chấm cơ sở theo giai đoạn ── */
  /* tiến độ tiêu biểu của 1 tỉnh: giai đoạn ĐANG theo dõi xa nhất (1–6); không còn gói đang theo dõi ⇒ Đã trúng > Đã trượt > Dừng */
  function srank(st){ return st>=1 && st<=6 ? 10+st : st>=11 && st<=14 ? 10+(st-10)*1.5 : isWon(st) ? 5 : (st===8||st===18) ? 4 : (st===9||st===10||st===19) ? 3 : 0; }
  function stats(){
    STAT = NEW.map(function(){ return { n:0, v:0, val:0, qty:0, by:{}, byN:{}, hosp:{}, soon:0, list:[], q:{}, gv:{}, sh:{m:0,t:0}, stg:0, ns:{}, warn:0 }; });
    HS={};
    if(!auth()) return;
    items().forEach(function(c){
      if(!pass(c)) return;
      var h=hospOf(c.f); if(!h || h.ni<0) return;
      var s=STAT[h.ni], x=HS[h.key]||(HS[h.key]={h:h, n:0, v:0, val:0, qty:0, q:{}, gv:{}, last:null, act:0, soon:0, list:[], fu:[], top:0});
      s.n++; s.v++; s.byN.FU=(s.byN.FU||0)+1; s.by.FU=(s.by.FU||0)+1; s.hosp[h.key]=1; s.qty+=KD.reduce(function(a,x){ return a+qtyOf(c,x.k); },0);
      s.ns[c.stage]=(s.ns[c.stage]||0)+1; if(srank(c.stage)>srank(s.stg)) s.stg=c.stage;
      x.n++; x.v++; x.fu.push(c); if(srank(c.stage)>srank(x.top)) x.top=c.stage;
    });
    /* cảnh báo: hợp đồng MANI sắp hết hiệu lực chưa có gói theo dõi được cập nhật ⇒ vòng đỏ nhấp nháy ở tỉnh, chấm viền đỏ nét đứt ở cơ sở */
    warns().filter(function(w){ return w.mani; }).forEach(function(w){
      var h=w.p.h, s=STAT[h.ni]; s.warn++; s.soon++;
      var x=HS[h.key]||(HS[h.key]={h:h, n:0, v:0, val:0, qty:0, q:{}, gv:{}, last:null, act:0, soon:0, list:[], fu:[], top:0, wonly:true});
      (x.warn=x.warn||[]).push(w);
    });
  }
  function col(x){ return x.wonly ? "#B42318" : (SC[x.top]||(S.stage===-1?"#98A2B3":FUCOL)); }
  function pcol(s){ return SC[s.stg]||(S.stage===-1?"#98A2B3":FUCOL); }
  /* ── cảnh báo: hợp đồng (gói trúng) hết hiệu lực trong WARN_M tháng tới / vừa hết ≤ 3 tháng mà cơ sở CHƯA có gói theo dõi đang chạy (giai đoạn 1–6)
        được cập nhật trong STALE_D ngày ⇒ dễ lỡ thầu lại. MANI = rủi ro mất hợp đồng; hãng khác = cơ hội chưa ai theo. ── */
  var WARN_M=6, STALE_D=30, WC=null;
  function ageD(c){ var d=Date.parse(String(c.at||"").replace(" ","T")+"+07:00"); return isNaN(d) ? 999 : Math.floor((Date.now()-d)/864e5); }
  function warns(){
    if(!auth() || !S.loaded) return [];
    var key=S.ver+"|"+PKGS.length+"|"+SCOPE.pic()+"|"+(typeof FA!=="undefined"&&FA.ver?FA.ver():0); if(WC && WC.k===key) return WC.v;
    var PF={}; plans().forEach(function(c){ if(c.f && c.stage>=1 && c.stage<=5 && (!c.at || ageD(c)<STALE_D)) (PF[c.f.id]=PF[c.f.id]||[]).push(c); });
    var lo=addMonths(NOW,-3), hi=addMonths(NOW,WARN_M), out=[];
    PKGS.forEach(function(p){
      if(p.res!=="Win" || !p.end || p.end<lo || p.end>hi || p.ni<0 || !p.h || !p.h.f || !SCOPE.inProv(p.ni, p.oi)) return;
      var ws=winSide(p), cs=byFac(p.h.f).filter(function(c){ return c.stage>=1 && c.stage<=6; });
      if(cs.some(function(c){ return ageD(c)<STALE_D; })) return;                       /* đang được cập nhật ⇒ ổn */
      if(!cs.length && PF[p.h.f.id]) return;                                              /* kế hoạch FY68 đã có giai đoạn ⇒ đang theo dõi */
      cs.sort(function(a,b){ return String(b.at).localeCompare(String(a.at)); });
      [true,false].forEach(function(mani){
        if(mani ? !ws.m : !ws.o) return;
        var its=p.items.filter(function(it){ return it.result==="Win" && isMani(it)===mani; }), op=addMonths(p.end,-3);
        out.push({ p:p, mani:mani, its:its, end:p.end, open:op<NOW?NOW:op, val:its.reduce(function(a,it){ return a+(+it.value||0); },0),
          brands:mani?["MANI"]:Object.keys(ws.ob), c:cs[0]||null, lvl: cs.length ? "stale" : (p.end<addMonths(NOW,3) ? "high" : "mid") });
      });
    });
    out.sort(function(a,b){ return a.end.localeCompare(b.end); });
    WC={k:key, v:out}; return out;
  }
  function warnCount(){ return warns().filter(function(w){ return w.mani; }).length; }
  var WL=[];
  function warnItem(w,i){
    var left=monthsBetween(NOW,w.end), lt = left<0 ? "hết hạn "+Math.max(1,Math.round(-left))+" tháng trước" : left<1 ? "còn "+Math.max(1,Math.round(left*30.44))+" ngày" : "còn "+Math.round(left)+" tháng";
    return '<div class="ri"><span class="a" data-fh="'+esc(w.p.h.key)+'" role="button" tabindex="0">'+esc(w.p.h.name)+'</span><span class="st '+(w.lvl==="high"||w.end<NOW?"bad":"warn")+'">'+d2(w.end)+'</span>'+
      '<span class="b">'+(w.mani?'<span class="tag2 m">MANI</span>':'<span class="tag2 o">'+esc(w.brands.slice(0,2).join(", "))+'</span>')+'<span>'+esc(NEW[w.p.ni][0])+' · '+NPP[w.p.npp].name+'</span><span>'+esc(itemsTxt(w.its))+'</span><span><b>'+lt+'</b></span></span>'+
      '<span class="act"><span class="wtag">'+(w.c ? 'Theo dõi “'+esc(SH[w.c.stage])+'” · '+ageD(w.c)+' ngày chưa cập nhật' : 'Chưa có gói theo dõi')+'</span>'+
      (w.c ? '<button class="fua" type="button" data-fu-up="'+esc(w.c.id)+'">Cập nhật</button>' : '<button class="fua" type="button" data-fu-warn="'+i+'">+ Theo dõi thầu lại</button>')+'</span></div>';
  }
  var ICW='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8l6.6 11.6H1.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 6.2v3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.6" r=".9" fill="currentColor"/></svg>';
  /* 11/11/2026 (người dùng: phần gói chưa điền quá chi tiết, rối): mỗi hợp đồng 1 dòng, 3 dòng đầu + "Xem cả n" */
  function warnLine(w,i){
    var left=monthsBetween(NOW,w.end), lt = left<0 ? "hết hạn "+Math.max(1,Math.round(-left))+" th trước" : left<1 ? "còn "+Math.max(1,Math.round(left*30.44))+" ngày" : "còn "+Math.round(left)+" th";
    return '<div class="wl"><span class="a" data-fh="'+esc(w.p.h.key)+'" role="button" tabindex="0" title="'+esc(NEW[w.p.ni][0]+" · "+NPP[w.p.npp].name+" · "+itemsTxt(w.its))+'">'+esc(w.p.h.name)+'</span>'+
      '<span class="st '+(w.lvl==="high"||w.end<NOW?"bad":"warn")+'">'+lt+'</span>'+
      (w.c ? '<button class="fua" type="button" data-fu-up="'+esc(w.c.id)+'" title="Theo dõi “'+esc(SH[w.c.stage])+'” · '+ageD(w.c)+' ngày chưa cập nhật">Cập nhật</button>' : '<button class="fua" type="button" data-fu-warn="'+i+'">+ Theo dõi</button>')+'</div>';
  }
  function warnHtml(scope){
    var all=warns().filter(function(w){ return scope<0 || w.p.ni===scope; }), m=all.filter(function(w){ return w.mani; }), o=all.filter(function(w){ return !w.mani; }), html="", N=S.wAll?999:3;
    WL=[];
    if(m.length){
      html+='<div class="wbox"><h3 title="Hết hạn trong '+WARN_M+' tháng tới (hoặc vừa hết ≤ 3 tháng) mà cơ sở chưa có gói theo dõi thầu lại / kế hoạch FY68 có giai đoạn, hoặc gói theo dõi đã '+STALE_D+'+ ngày chưa cập nhật.">'+ICW+'Hợp đồng MANI sắp hết hạn, chưa theo dõi · '+m.length+'</h3>'+
        m.slice(0,N).map(function(w){ WL.push(w); return warnLine(w, WL.length-1); }).join("")+(m.length>N?'<div class="cap" style="margin-top:4px"><button class="lnk" type="button" data-fu-wall="1">Xem cả '+m.length+' hợp đồng</button></div>':'')+'</div>';
    }
    if(o.length) html+='<details class="wbox opp"><summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--t2);padding:4px 0">Hợp đồng hãng khác sắp hết hạn — cơ hội · '+o.length+'</summary>'+
      o.slice(0,10).map(function(w){ WL.push(w); return warnLine(w, WL.length-1); }).join("")+(o.length>10?'<div class="cap" style="margin-top:6px">Xem đủ ở Kết quả thầu ▸ tab Thầu lại.</div>':'')+'</details>';
    return html;
  }
  function sum(){ return [periodLabel(), {open:"Đang theo dõi",won:"Đã trúng",lost:"Trượt / dừng",all:"Tất cả"}[S.stf]]; }
  function legend(){
    var stl=TEND.map(function(k){ return '<span><i style="background:'+mix(SC[k],.8)+'"></i>'+k+'. '+SH[k]+'</span>'; }).join("");
    var stp=PRIV.map(function(k){ return '<span><i style="background:'+mix(SC[k],.8)+'"></i>'+(k-10)+'. '+SH[k]+'</span>'; }).join("");
    return '<div class="row" style="font-weight:600;color:var(--navy)">Tô màu theo tiến độ · thầu công lập</div><div class="stl">'+stl+'</div>'+
      '<div class="row" style="font-weight:600;color:var(--navy);margin-top:6px">Mua sắm cơ sở tư nhân</div><div class="stl">'+stp+'</div>'+
      '<div class="row" style="color:var(--t3)">Tỉnh: giai đoạn đang theo dõi xa nhất · số = số gói</div>'+
      '<div class="row"><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="#B42318" stroke-width="2"/></svg> Hợp đồng MANI sắp hết hiệu lực chưa cập nhật theo dõi</div>'+
      (sel>=0?'<div class="row"><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="7" fill="none" stroke="#B42318" stroke-width="2" stroke-dasharray="3 2"/><circle cx="9" cy="9" r="3" fill="#B42318"/></svg> Cơ sở cần cảnh báo</div>':'');
  }
  function tipP(i){
    var s=STAT[i];
    var by=TEND.concat(PRIV).filter(function(k){ return s.ns && s.ns[k]; }).map(function(k){ return SH[k]+" "+s.ns[k]; }).join(" · ");
    return '<b>'+esc(NEW[i][0])+'</b> <span class="m">· '+REGION[NEW[i][1]]+'</span><br>'+(s.n?'<b>'+s.n+'</b> gói theo dõi · '+Object.keys(s.hosp).length+' cơ sở<br><span class="m">'+esc(by)+'</span>':'<span class="m">Chưa có gói theo dõi trong bộ lọc</span>')+
      (s.warn?'<br><span style="color:#FFB4A9">'+s.warn+' hợp đồng MANI sắp hết hiệu lực chưa cập nhật theo dõi</span>':'');
  }
  function tipH(x){
    return '<b>'+esc(x.h.name)+'</b><br><span class="m">'+esc(NEW[x.h.ni][0])+'</span><br>'+x.fu.map(function(c){ return esc(SH[c.stage])+' · '+esc(c.last.pkg||c.id); }).slice(0,4).join("<br>")+
      (x.warn?(x.fu.length?'<br>':'')+x.warn.map(function(w){ return '<span style="color:#FFB4A9">Hợp đồng MANI hết hạn '+d2(w.end)+' — '+(w.c?'theo dõi chưa cập nhật '+ageD(w.c)+' ngày':'chưa có gói theo dõi')+'</span>'; }).slice(0,3).join("<br>"):'')+
      '<br><span class="m">Bấm để xem chi tiết</span>';
  }

  /* ── khớp kết quả thầu (KQTT toàn quốc / file NPP) với gói đang theo dõi ── */
  function matchRes(c){
    if(!c || c.plan || c.stage>6) return null;
    var h=c.f && c.f.h; if(!h || !h.pk) return null;
    var wins=h.pk.filter(function(p){ return p.res==="Win"; }), tb=tbNorm(c.last.tbmt||""), how="tbmt";
    var f0=String(c.first.at||"").slice(0,10), lo=/^\d{4}-\d{2}-\d{2}$/.test(f0) ? new Date(Date.parse(f0+"T00:00:00Z")-60*864e5).toISOString().slice(0,10) : "";
    var m = tb ? wins.filter(function(p){ return p.tbmt && tbNorm(p.tbmt)===tb && !(lo && p.approve && p.approve<lo); }) : [];
    if(!m.length && !tb && c.stage>=4){ var t0=String(c.first.at||"").slice(0,10); m=wins.filter(function(p){ return p.approve && p.approve>=t0; }); how="time"; }
    if(!m.length) return null;
    var p=m.sort(byNewest)[0], ws=winSide(p), its=p.items.filter(function(it){ return it.result==="Win"; });
    return { p:p, mani:ws.m>0, brands:Object.keys(ws.ob), how:how, its:its };
  }
  function resTxt(r){ return (r.mani ? "MANI trúng" : (r.brands.slice(0,2).join(", ")||"Hãng khác")+" trúng")+" · "+NPP[r.p.npp].name+(r.p.tbmtRaw.length?" · TBMT "+r.p.tbmtRaw[0]:"")+(r.p.approve?" · quyết định "+d2(r.p.approve):""); }
  function resHtml(c, r){
    return '<div class="kqm'+(r.mani?'':' lost')+'"><b>Đã có kết quả: '+esc(r.mani?"MANI trúng":(r.brands.slice(0,2).join(", ")||"hãng khác")+" trúng")+'</b>'+
      '<span>'+(r.how==="tbmt"?'Khớp số TBMT':'Cùng cơ sở, quyết định sau ngày bắt đầu theo dõi — kiểm tra lại')+' · '+NPP[r.p.npp].name+(r.p.approve?' · '+d2(r.p.approve):'')+'</span><br>'+
      '<span>'+esc(r.its.slice(0,4).map(function(it){ return brandOf(it)+" "+it.code+" × "+nfmt(it.qty)+(it.price?" · "+prc(it.price):""); }).join("; "))+'</span>'+
      (auth()?'<div class="acts"><button class="btn sm pri" type="button" data-fu-res="'+esc(c.id)+'">Ghi kết quả: '+(r.mani?"Đã trúng thầu":"Đã trượt thầu")+'</button></div>':'')+'</div>';
  }
  /* ── bảng bên ── */
  function stg(c){ return '<span class="sgt s'+c.stage+'">'+esc(ST[c.stage]||"—")+'</span>'; }
  function stepper(st){
    var pv=st>=11, base=pv?10:0, last=pv?5:7, s0=st-base, cl=isWon(st)?" win":(st===8||st===18)?" lost":(st===9||st===10||st===19)?" stop":"", n=s0>=last?last:s0;
    var o='<div class="stp'+cl+'" title="'+esc(ST[st]||"")+'">'; for(var k=1;k<=last;k++) o+='<i class="'+(k<=n?"on":"")+'"></i>'; return o+'</div>'; }
  function when(at){ if(!at) return ""; var m=/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(at); return m ? m[3]+"/"+m[2]+"/"+m[1]+(m[4]?" "+m[4]+":"+m[5]:"") : at; }
  function itemsHtml(it){ return (it||[]).length ? '<div class="pchips">'+it.map(function(x){ var g=KDK[x.kind]&&KDK[x.kind].c ? {c:KDK[x.kind].c} : x.kind==="chi"?GK[grpOf(x.code)]||GK.chi_o:GK[grpOf(x.code)]||GK.dao_o; return '<span class="pc"><i style="background:'+g.c+'"></i>'+esc(x.code)+' × '+(x.qty?nfmt(x.qty):"?")+'</span>'; }).join("")+'</div>' : ""; }
  function caseHtml(c, full){
    var L=c.last, a=auth();
    var head='<div class="t">'+esc(L.pkg||"Gói theo dõi "+c.id)+'</div>'+
      '<div class="mt">'+stg(c)+' · '+esc(L.pic||"")+' · cập nhật '+when(L.at)+(L.due?' · dự kiến '+d2(L.due):'')+(L.tbmt?' · TBMT '+esc(L.tbmt):'')+
      (c.pend?' · <b style="color:'+(L.pend==="err"?"var(--bad)":"var(--warn)")+'">'+(L.pend==="err"?"chưa lưu được":"đang lưu…")+'</b>':'')+'</div>';
    var mr=matchRes(c);
    if(c.plan) return '<div class="fuc plan" data-fh="'+esc(hospOf(c.f).key)+'" role="button" tabindex="0"><div class="t">'+esc(c.f.name)+'</div>'+
      '<div class="mt">'+(c.stage?stg(c)+' · ':'<span class="sgt s0">Chưa có giai đoạn</span> · ')+esc(NEW[c.f.ni][0])+' · '+esc(L.pkg)+(L.pic?' · '+esc(L.pic):'')+(L.due?' · mốc '+d2(L.due):'')+'</div>'+
      '<div class="mt">'+esc(L.it.slice(0,4).map(function(x){ return x.code+(x.qty?" × "+nfmt(x.qty):""); }).join(" · ")+(L.it.length>4?" …":""))+(L.note?' — '+esc(L.note.length>80?L.note.slice(0,78)+"…":L.note):'')+'</div></div>';
    if(!full) return '<div class="fuc'+(c.pend?" pend":"")+'" data-fh="'+esc(hospOf(c.f).key)+'" role="button" tabindex="0">'+head+'<div class="mt">'+esc(c.f.name)+' · '+esc(NEW[c.f.ni][0])+(mr?' · <b style="color:'+(mr.mani?"var(--ok)":"var(--bad)")+'">có kết quả: '+esc(mr.mani?"MANI trúng":"hãng khác trúng")+'</b>':'')+'</div>'+stepper(c.stage)+'</div>';
    var log=c.revs.slice().reverse().map(function(r){
      return '<div class="ev"><div class="d">'+when(r.at)+' · '+esc(r.pic||"")+' · <b>'+esc(ST[r.stage]||"")+'</b>'+(r.pend?' · '+(r.pend==="err"?"chưa lưu được":"đang lưu…"):'')+'</div>'+
        (r.note?'<div class="x">'+esc(r.note)+'</div>':'')+itemsHtml(r.it)+(r.due?'<div class="d">Dự kiến: '+d2(r.due)+'</div>':'')+'</div>'; }).join("");
    return '<div class="fuc'+(c.pend?" pend":"")+'">'+head+stepper(c.stage)+(mr?resHtml(c,mr):'')+itemsHtml(L.it)+(L.value?'<div class="mt">Giá trị ước tính: <b>'+vnd(L.value)+'</b></div>':'')+
      (L.note?'<div class="nt">'+esc(L.note)+'</div>':'')+
      '<div class="acts">'+(a?'<button class="btn sm pri" type="button" data-fu-up="'+esc(c.id)+'">Cập nhật giai đoạn</button>':'')+'</div>'+
      '<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12.5px;color:var(--blue)">Lịch sử '+c.revs.length+' lần cập nhật</summary><div class="fulog">'+log+'</div></details></div>';
  }
  function hospHtml(h){
    var a=auth(), f=h.f||{id:""};
    var cs=a ? byFac(f) : [], pv=isPriv(f);
    var html='<h3>'+(pv?'Theo dõi mua sắm · hợp đồng mua sắm':'Theo dõi thầu')+(cs.length?' · '+cs.length+(pv?' cơ hội':' gói'):'')+(a?' · <button class="lnk" type="button" data-fu-new="'+esc(h.key)+'">'+(pv?'+ Thêm cơ hội mua sắm':'+ Thêm gói theo dõi')+'</button>':'')+'</h3>';
    if(a && !pv){ var wf=warns().filter(function(w){ return w.p.h===h; }); if(wf.length){ WL=wf.slice(); html+='<div class="wbox"><h3>'+ICW+'Cần chú ý</h3>'+wf.map(function(w,i){ return warnItem(w,i); }).join("")+'</div>'; } }
    if(!a) return html+((lg.open || F.view==="fu") ? loginHtml(true) : '<div class="note">Gói theo dõi ở cơ sở này chỉ hiện với tài khoản email công ty (@manimedicalhanoi.com, @mani.inc). <button class="lnk" type="button" data-lg="open">Đăng nhập</button></div>');
    if(S.loading && !S.loaded) html+='<div class="empty">Đang đọc dữ liệu theo dõi thầu…</div>';
    if(S.err) html+='<div class="note err">'+esc(S.err)+'</div>';
    if(!cs.length) return html+'<div class="empty">'+(pv?'Chưa có cơ hội mua sắm nào đang theo dõi ở cơ sở tư nhân này (Giới thiệu → Demo → Đề xuất từ chuyên môn → Ký hợp đồng mua sắm → Sử dụng hàng).':'Chưa có gói nào đang theo dõi ở cơ sở này.')+'</div>';
    return html+cs.slice().sort(function(x,y){ return (x.stage>=7)-(y.stage>=7) || String(y.at).localeCompare(String(x.at)); }).map(function(c){ return caseHtml(c,true); }).join("");
  }
  function side(){
    if(F.view!=="fu") { if(selH) renderHosp(); else if(F.view==="act") ACT.side(); return; }
    if(selH && sel===selH.ni) return renderHosp();
    var t=document.getElementById("sh-t"), sub=document.getElementById("sh-s"), a=auth();
    t.textContent = "Theo dõi thầu · "+(sel>=0 ? NEW[sel][0] : SCOPE.place());
    sub.textContent = "Gói thầu / mua sắm đang theo dõi theo địa bàn"+(S.at?" · đọc lúc "+S.at:"");
    if(!a){ SB.innerHTML=loginHtml(false)+'<div class="note">Mỗi lần cập nhật được lưu thành 1 dòng mới (giữ đủ lịch sử từng giai đoạn) trong sheet ẩn "FOLLOW UP TENDER" của file CRM Surgical.</div>'; return; }
    var all=items(), inProv=function(c){ return sel<0 || c.f.ni===sel; };
    var base=all.filter(function(c){ return pass(c,true) && inProv(c); }), list=base.filter(function(c){ return pass(c); });
    var html='<div class="stbar in">'+barHtml()+'</div>'+(S.err?'<div class="note err">'+esc(S.err)+'</div>':'')+(S.loading&&!S.loaded?'<div class="note">Đang đọc dữ liệu theo dõi thầu…</div>':'');
    var fac={}, dao=0, chi=0, oth=0, wk=0, t7=Date.now()-7*864e5;
    list.forEach(function(c){ fac[c.f.id]=1; dao+=qtyOf(c,"dao"); chi+=qtyOf(c,"chi"); oth+=qtyOf(c,"ghim")+qtyOf(c,"hook")+qtyOf(c,"forcep"); });
    all.forEach(function(c){ if(!inProv(c) || !pass(c,true)) return; c.revs.forEach(function(r){ var d=Date.parse(String(r.at).replace(" ","T")); if(d>t7) wk++; }); });
    if(!S.stage) html+=warnHtml(sel);
    if(!S.stage) html+='<div class="kpis"><div class="kpi"><b>'+list.length+'</b><span>Gói '+({open:"đang theo dõi",won:"đã trúng",lost:"trượt / dừng",all:"(mọi trạng thái)"}[S.stf])+'</span></div>'+
      '<div class="kpi"><b>'+Object.keys(fac).length+'</b><span>Cơ sở y tế</span></div><div class="kpi"><b>'+wk+'</b><span>Lần cập nhật 7 ngày qua</span></div>'+
      '<div class="kpi"><b>'+nfmt(dao)+'</b><span>Dao ước tính (cái)</span></div><div class="kpi"><b>'+nfmt(chi)+'</b><span>Chỉ khâu ước tính (sợi)</span></div>'+
      (oth?'<div class="kpi"><b>'+nfmt(oth)+'</b><span>Ghim da · Hook · Forceps (cái)</span></div>':'')+
      '<div class="kpi"><button class="btn pri sm" type="button" data-fu-new="'+(sel>=0?"P|"+sel:"")+'" style="width:100%">+ Thêm gói</button></div></div>';
    var withRes=all.filter(function(c){ return inProv(c) && pass(c,true) && matchRes(c); });
    if(withRes.length) html+='<h3>Đã có kết quả thầu — cần cập nhật · '+withRes.length+'</h3><div class="exp">'+withRes.slice(0,10).map(function(c){ var r=matchRes(c);
      return '<div class="it" data-fh="'+esc(hospOf(c.f).key)+'" role="button" tabindex="0"><span class="a">'+esc(c.f.name)+'</span><span class="st '+(r.mani?"ok":"bad")+'">'+(r.mani?"MANI trúng":"Hãng khác trúng")+'</span><span class="b">'+esc(c.last.pkg||c.id)+' · '+esc(c.pic)+'</span><span class="b">'+esc(resTxt(r))+'</span></div>'; }).join("")+'</div>';
    if(S.stage && sel<0){                                                                    /* đã chọn 1 nút giai đoạn ⇒ danh sách theo tỉnh */
      var byP={}; list.forEach(function(c){ (byP[c.f.ni]=byP[c.f.ni]||[]).push(c); });
      var ps=Object.keys(byP).sort(function(a,b){ return byP[b].length-byP[a].length; }), lab=S.stage===-1?"Chưa có giai đoạn":ST[S.stage];
      html+='<h3>'+esc(lab)+' · '+list.length+' · '+ps.length+' tỉnh · <button class="lnk" type="button" data-fu-stage="0">bỏ lọc</button></h3>'+(ps.length?ps.map(function(k){
        return '<div class="fpg"><div class="fph" data-p="'+k+'" role="button" tabindex="0">'+esc(NEW[k][0])+' <b>'+byP[k].length+'</b></div>'+byP[k].slice(0,25).map(function(c){ return caseHtml(c,false); }).join("")+(byP[k].length>25?'<div class="cap">… và '+(byP[k].length-25)+' mục — bấm tên tỉnh để xem hết.</div>':'')+'</div>'; }).join(""):'<div class="empty">Không có mục nào ở giai đoạn này trong phạm vi đang xem.</div>');
    }
    if(sel<0 && !S.stage){
      var pv={}; list.forEach(function(c){ pv[c.f.ni]=(pv[c.f.ni]||0)+1; });
      var top=Object.keys(pv).map(function(k){ return [+k,pv[k]]; }).sort(function(x,y){ return y[1]-x[1]; }), tm=top.length?top[0][1]:1;
      html+=sec("fu-prov","Tỉnh / thành",top.length+" tỉnh",(top.length?'<div class="bars">'+top.slice(0,12).map(function(o){ return '<div class="r click" data-p="'+o[0]+'" role="button" tabindex="0"><span>'+esc(NEW[o[0]][0])+'</span><span class="bar"><i style="width:'+(o[1]/tm*100)+'%;background:'+FUCOL+'"></i></span><span class="num">'+o[1]+' gói</span></div>'; }).join("")+'</div>':'<div class="empty">Chưa có gói nào trong bộ lọc. Bấm "+ Thêm gói" hoặc tìm bệnh viện ở ô tìm kiếm để bắt đầu.</div>'), false);
      var due=list.filter(function(c){ return c.last.due && isOpen(c.stage); }).sort(function(x,y){ return String(x.last.due).localeCompare(String(y.last.due)); }).slice(0,10);
      if(due.length) html+='<h3>Mốc dự kiến sắp tới</h3><div class="exp">'+due.map(function(c){ return '<div class="it" data-fh="'+esc(hospOf(c.f).key)+'" role="button" tabindex="0"><span class="a">'+esc(c.f.name)+'</span><span class="st '+(c.last.due<NOW?"bad":"warn")+'">'+d2(c.last.due)+'</span><span class="b">'+esc(SH[c.stage])+' · '+esc(c.last.pkg||c.id)+'</span><span class="b">'+esc(c.pic)+'</span></div>'; }).join("")+'</div>';
    } else if(sel>=0){
      html+='<input class="search" id="fu-q" type="search" placeholder="Lọc theo tên cơ sở, gói, mã sản phẩm, PIC…" value="'+esc(S.q)+'" aria-label="Lọc gói theo dõi">';
    }
    var feed=[]; all.forEach(function(c){ if(!inProv(c) || !pass(c,true)) return; c.revs.forEach(function(r){ feed.push([r,c]); }); });
    feed.sort(function(x,y){ return String(y[0].at).localeCompare(String(x[0].at)) || (y[0].rev-x[0].rev); });
    if(sel>=0){
      var qq=nw(S.q), shown=list.filter(function(c){ return !qq || nw(c.f.name+" "+c.last.pkg+" "+c.last.itemsTxt+" "+c.pic+" "+c.last.tbmt).indexOf(qq)>=0; });
      html+='<h3>'+(S.stage?esc(S.stage===-1?"Chưa có giai đoạn":ST[S.stage]):'Gói theo dõi · kế hoạch FY68')+' · '+shown.length+'</h3><div id="fu-list">'+(shown.length?shown.map(function(c){ return caseHtml(c,false); }).join(""):'<div class="empty">Không có gói phù hợp.</div>')+'</div>';
    }
    html+=sec("fu-feed","Cập nhật gần đây",feed.length?Math.min(15,feed.length)+" lần gần nhất":"",(feed.length?'<div class="feed">'+feed.slice(0,15).map(function(o){ var r=o[0], c=o[1];
      return '<div class="it" data-fh="'+esc(hospOf(c.f).key)+'" role="button" tabindex="0"><span class="a">'+esc(c.f.name)+'</span><span>'+stg({stage:r.stage})+'</span><span class="b">'+when(r.at)+' · '+esc(r.pic)+' · '+esc(r.pkg||c.id)+(r.note?' — '+esc(r.note.length>90?r.note.slice(0,88)+"…":r.note):'')+'</span></div>'; }).join("")+'</div>':'<div class="empty">Chưa có cập nhật.</div>'), false);
    SB.innerHTML=html;
    var q=document.getElementById("fu-q"); if(q) q.oninput=function(){ S.q=q.value; var pos=q.selectionStart; side(); var q2=document.getElementById("fu-q"); if(q2){ q2.focus(); try{ q2.setSelectionRange(pos,pos); }catch(_){} } };
  }

  /* ── hộp Thêm / Cập nhật gói ── */
  var DLG=document.getElementById("fudlg"), FB=document.getElementById("fu-b"), M=null;
  var CODES=window.MANI_CODES||{dao:[],chi:[]}, CDESC={};
  /* loại sản phẩm Sales Surgical phụ trách — người dùng bổ sung 05/11/2026: ghim da (Manipler), Hook = móc mở vùng bè MANI (MTH-S), Micro Forceps = kìm vi phẫu MANI
     (tên chuẩn theo hồ sơ dịch catalogue S0017 / flyer S0038 trong MMH Library; backend MMH_TenderFU v1.8) */
  var KD=[{k:"dao", n:"Dao nhãn khoa", add:"Mã dao", ph:"Mã dao, vd. MSL28SH", u:"cái", pt:"Dao", re:/dao/i},
          {k:"chi", n:"Chỉ khâu", add:"Mã chỉ khâu", ph:"Mã chỉ, vd. 1406", u:"sợi", pt:"Chỉ khâu", re:/chỉ|\bchi\b/i},
          {k:"ghim", n:"Ghim da (Manipler)", add:"Mã ghim da", ph:"Mã ghim da, vd. AZ35WS", u:"cái", pt:"Ghim da", re:/ghim|manipler/i, c:"#0F766E"},
          {k:"hook", n:"Hook (móc mở vùng bè)", add:"Mã Hook", ph:"Mã Hook, vd. MTH-S", u:"cái", pt:"Hook", re:/hook|móc mở/i, c:"#B45309"},
          {k:"forcep", n:"Micro Forceps (kìm vi phẫu)", add:"Mã forceps", ph:"Mã forceps, vd. MSQ25A28", u:"cái", pt:"Micro Forceps", re:/forcep|kẹp vi phẫu/i, c:"#7C3AED"}];
  var KDK={}; KD.forEach(function(x){ KDK[x.k]=x; CODES[x.k]=CODES[x.k]||[]; CODES[x.k].forEach(function(r){ CDESC[r[0]]=r[1]; }); });
  function kdOf(k){ return KDK[k]||KD[0]; }
  /* mô tả dưới ô mã: theo danh mục; loại chưa có danh mục mã (Hook) ⇒ để trống */
  function dscOf(code, kd){ var c=String(code||"").trim().toUpperCase(); return CDESC[c] || (c && CODES[kd] && CODES[kd].length ? "Mã ngoài danh mục MMH Library" : ""); }
  var PEND=null, ONL=[];
  function open(o){
    if(!auth()){ PEND=o; F.view="fu"; try{ localStorage.setItem("tm_view","fu"); }catch(_){} renderFilters(); refresh(); return; }
    var c=o.caseId ? cases().filter(function(x){ return x.id===o.caseId; })[0] : null, L=c?c.last:null;
    var f=o.f || (c?c.f:null);
    var kinds={}; ((L&&L.it)||[]).forEach(function(it){ kinds[it.kind||"dao"]=1; });
    if(!Object.keys(kinds).length && L && L.ptype) KD.forEach(function(x){ if(x.re.test(L.ptype)) kinds[x.k]=1; });
    if(!Object.keys(kinds).length) kinds.dao=1;
    M={ c:c, f:f, newFac:null, prov:o.prov!=null?o.prov:-1, pkg:L?L.pkg:"", tbmt:L?L.tbmt:"", kinds:kinds,
        lines:((L&&L.it)||[]).map(function(it){ return {code:it.code, qty:it.qty||"", kind:it.kind||"dao"}; }),
        stage:c ? (c.stage<5 ? c.stage+1 : (c.stage>=11 && c.stage<14) ? c.stage+1 : c.stage) : (isPriv(f)?11:1), due:"", value:L&&L.value?L.value:"", note:"", err:"",
        start:L&&L.fcStart?String(L.fcStart).slice(0,7):"", dur:L&&+L.fcDur?String(L.fcDur):"12" };
    if(o.pre){ var P=o.pre; if(P.pkg && !c) M.pkg=P.pkg; if(P.tbmt) M.tbmt=P.tbmt; if(P.stage) M.stage=P.stage; if(P.due) M.due=P.due; if(P.value) M.value=String(P.value); if(P.note) M.note=P.note;
      if(P.lines && P.lines.length){ M.lines=P.lines.map(function(l){ return {code:l.code||"", qty:l.qty||"", kind:l.kind||"dao"}; }); M.kinds={}; M.lines.forEach(function(l){ M.kinds[l.kind]=1; }); } }
    if(!M.lines.length) M.lines=[{code:"",qty:"",kind:Object.keys(kinds)[0]}];
    document.getElementById("fu-t").textContent = isPriv(f) ? (c ? "Cập nhật cơ hội mua sắm (tư nhân)" : "Thêm cơ hội mua sắm · cơ sở tư nhân") : (c ? "Cập nhật gói đang theo dõi" : "Thêm gói thầu theo dõi");
    draw(); DLG.hidden=false;
    var first=DLG.querySelector(c?'#fm-note':(f?'#fm-pkg':'#fm-fq')); if(first) setTimeout(function(){ first.focus(); },30);
  }
  function close(){ DLG.hidden=true; M=null; }
  function provOpts(cur){ return '<option value="">— Chọn tỉnh / thành —</option>'+NEW.map(function(p,i){ return '<option value="'+i+'"'+(+cur===i?" selected":"")+'>'+esc(p[0])+'</option>'; }).join(""); }
  function draw(){
    var c=M.c, f=M.f, L=c?c.last:null, html='<div class="fm">';
    if(f) html+='<div><label class="l">Cơ sở y tế</label><div class="fsel"><div><b>'+esc(f.name)+'</b><br><span>'+esc(NEW[f.ni][0])+(f.addr?' · '+esc(addrFmt(f.addr)):'')+'</span></div>'+(c?'':'<button class="lnk" type="button" data-fm="chg">Đổi</button>')+'</div></div>';
    else if(M.newFac) html+='<div><label class="l">Cơ sở y tế mới (chưa có trong danh mục)</label><input class="inp" id="fm-nn" placeholder="Tên đầy đủ, vd. Bệnh viện Đa khoa tỉnh …" value="'+esc(M.newFac.name)+'">'+
      '<div class="two" style="margin-top:6px"><select class="inp" id="fm-np">'+provOpts(M.newFac.ni)+'</select><input class="inp" id="fm-na" placeholder="Địa chỉ (nếu biết)" value="'+esc(M.newFac.addr)+'"></div>'+
      '<div class="hint"><button class="lnk" type="button" data-fm="pick">‹ Chọn trong danh mục</button></div></div>';
    else html+='<div class="fmq"><label class="l" for="fm-fq">Cơ sở y tế</label><input class="inp" id="fm-fq" type="search" autocomplete="off" placeholder="Gõ tên bệnh viện / TTYT, vd. mat nghe an"><div class="qsr" id="fm-fr" hidden></div>'+
      '<div class="hint">Tìm trong '+FAC.length.toLocaleString("vi-VN")+' cơ sở. Không thấy? Chọn dòng "Thêm cơ sở mới" cuối danh sách.</div></div>';
    var pv=isPriv(f) || (c && c.stage>=11);
    /* 11/11/2026 (người dùng): số TBMT chỉ hỏi khi gói đã nộp hồ sơ (Đang dự thầu) — bắt buộc — hoặc đã có kết quả (không bắt buộc); các giai đoạn trước không hiện */
    var tbOn=!pv && TBST[M.stage];
    html+= pv ? '<div><label class="l" for="fm-pkg">Nội dung mua sắm <span class="opt">(không bắt buộc)</span></label><input class="inp" id="fm-pkg" placeholder="vd. Dao Slit + chỉ Nylon cho phòng mổ Phaco" value="'+esc(M.pkg)+'"></div>'
      : '<div class="'+(tbOn?"two":"")+'"><div><label class="l" for="fm-pkg">Tên gói thầu / nội dung <span class="opt">(không bắt buộc)</span></label><input class="inp" id="fm-pkg" placeholder="vd. Vật tư tiêu hao nhãn khoa 2027" value="'+esc(M.pkg)+'"></div>'+
      (tbOn?'<div><label class="l" for="fm-tb">Số TBMT'+(M.stage===5?' <b class="req">*</b>':' <span class="opt">(nếu có)</span>')+'</label><input class="inp" id="fm-tb" placeholder="IB…" value="'+esc(M.tbmt)+'"></div>':'')+'</div>'+
      (tbOn&&M.stage===5?'<div class="hint" style="margin-top:-4px">Gói đã nộp hồ sơ: nhập số TBMT để hệ thống tự khớp và báo khi có kết quả.</div>':'');
    html+='<div><label class="l">Loại sản phẩm</label><div class="kd">'+KD.map(function(x){ return '<button type="button" data-kind="'+x.k+'" class="'+(M.kinds[x.k]?"on":"")+'">'+x.n+'</button>'; }).join("")+'</div></div>';
    html+='<div class="lines"><label class="l">Mã sản phẩm · SL ước tính</label>'+M.lines.map(function(ln,i){
      var kd=M.kinds[ln.kind]?ln.kind:Object.keys(M.kinds)[0];
      return '<div class="ln"><input class="inp" data-ln="code" data-i="'+i+'" list="dl-'+kd+'" placeholder="'+esc(kdOf(kd).ph)+'" value="'+esc(ln.code)+'">'+
        '<input class="inp" data-ln="qty" data-i="'+i+'" inputmode="numeric" placeholder="SL ('+kdOf(kd).u+')" value="'+esc(ln.qty)+'">'+
        '<button class="x" type="button" data-rm="'+i+'" title="Bỏ dòng" aria-label="Bỏ dòng">×</button>'+
        '<div class="dsc">'+esc(dscOf(ln.code, kd))+'</div></div>'; }).join("")+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+Object.keys(M.kinds).map(function(k){ return '<button class="btn sm" type="button" data-add="'+k+'">+ '+kdOf(k).add+'</button>'; }).join("")+'</div></div>';
    if(pv && M.stage<11) M.stage=11; else if(!pv && M.stage>=11) M.stage=1;
    html+='<div><label class="l">Giai đoạn'+(pv?' · mua sắm cơ sở tư nhân':'')+(c?' <span style="font-weight:400;color:var(--t3)">· hiện tại: '+esc(ST[c.stage])+'</span>':'')+'</label><div class="stg">'+(pv?PRIV:TEND).map(function(k){
      return '<button type="button" data-st="'+k+'" class="'+(M.stage===k?"on":"")+(c&&k<c.stage&&isOpen(k)?" done":"")+'"><span class="n">'+(k>10?k-10:k)+'</span>'+esc(ST[k])+'</button>'; }).join("")+'</div></div>';
    html+='<div class="two"><div><label class="l" for="fm-start">'+(pv?'Bắt đầu sử dụng (tháng)':'Hợp đồng dự kiến bắt đầu (tháng)')+'</label><input class="inp" id="fm-start" type="month" value="'+esc(M.start)+'"></div>'+
      '<div><label class="l" for="fm-dur">'+(pv?'Thời gian dùng SL trên (tháng)':'Hiệu lực hợp đồng (tháng)')+'</label><input class="inp" id="fm-dur" inputmode="numeric" value="'+esc(M.dur)+'"></div></div>'+
      '<div class="hint" style="margin-top:-4px">Dùng để tính <b>doanh số ước tính</b> (sheet Follow up by Account): SL ÷ số tháng × giá NPP × số tháng nằm trong FY.</div>';
    html+='<div class="two"><div><label class="l" for="fm-due">Mốc dự kiến tiếp theo</label><input class="inp" id="fm-due" type="date" value="'+esc(M.due)+'"></div>'+
      '<div><label class="l" for="fm-val">Giá trị ước tính (VND, nếu có)</label><input class="inp" id="fm-val" inputmode="numeric" placeholder="vd. 250000000" value="'+esc(M.value)+'"></div></div>';
    html+='<div><label class="l" for="fm-note">Tình hình</label><textarea class="inp" id="fm-note" rows="4" placeholder="Đã gặp ai, kết quả, khó khăn, đối thủ, bước tiếp theo…">'+esc(M.note)+'</textarea>'+
      '<div class="hint">Lưu thành 1 lần cập nhật mới kèm thời gian — các lần trước vẫn giữ nguyên.</div></div>';
    html+='</div><div class="ft2"><span class="er">'+esc(M.err)+'</span><button class="btn" type="button" data-fm="cancel">Huỷ</button><button class="btn pri" type="button" data-fm="save">Lưu</button></div>';
    html+=KD.map(function(x){ return '<datalist id="dl-'+x.k+'">'+CODES[x.k].map(function(r){ return '<option value="'+esc(r[0])+'">'+esc(r[1])+'</option>'; }).join("")+'</datalist>'; }).join("");
    FB.innerHTML=html;
    var fq=document.getElementById("fm-fq");
    if(fq) QS.wire(fq, document.getElementById("fm-fr"), function(x){ grab(); M.f=x; draw(); var p=document.getElementById("fm-pkg"); if(p) p.focus(); },
      function(q, go){ if(go){ grab(); M.newFac={name:q, ni:M.prov>=0?M.prov:"", addr:""}; draw(); var n=document.getElementById("fm-nn"); if(n) n.focus(); return; } return '+ Thêm cơ sở mới'+(q?' "'+esc(q)+'"':'')+' (chưa có trong danh mục)'; });
  }
  function grab(){
    if(!M) return;
    var v=function(id){ var e=document.getElementById(id); return e?e.value:null; };
    if(v("fm-pkg")!=null) M.pkg=v("fm-pkg").trim(); if(v("fm-tb")!=null) M.tbmt=v("fm-tb").trim();
    if(v("fm-start")!=null) M.start=v("fm-start"); if(v("fm-dur")!=null) M.dur=v("fm-dur").replace(/[^\d]/g,"");
    if(v("fm-due")!=null) M.due=v("fm-due"); if(v("fm-val")!=null) M.value=v("fm-val").replace(/[^\d]/g,""); if(v("fm-note")!=null) M.note=v("fm-note");
    if(M.newFac){ if(v("fm-nn")!=null) M.newFac.name=v("fm-nn").trim(); if(v("fm-np")!=null) M.newFac.ni=v("fm-np"); if(v("fm-na")!=null) M.newFac.addr=v("fm-na").trim(); }
    [].forEach.call(FB.querySelectorAll("[data-ln]"),function(e){ var ln=M.lines[+e.dataset.i]; if(!ln) return; if(e.dataset.ln==="code") ln.code=e.value.trim().toUpperCase(); else ln.qty=e.value.replace(/[^\d]/g,""); });
  }
  FB.addEventListener("input",function(e){
    var t=e.target; if(t.dataset && t.dataset.ln==="code"){ var d=t.parentNode.querySelector(".dsc"); var k=t.value.trim().toUpperCase(); if(d) d.textContent=dscOf(k, String(t.getAttribute("list")||"").slice(3)); }
  });
  FB.addEventListener("click",function(e){
    var b=e.target.closest("button"); if(!b || !M) return;
    if(b.dataset.kind){ grab(); var k=b.dataset.kind; if(M.kinds[k] && Object.keys(M.kinds).length>1){ delete M.kinds[k]; M.lines=M.lines.filter(function(l){ return l.kind!==k; }); } else M.kinds[k]=1;
      if(!M.lines.some(function(l){ return l.kind===k; }) && M.kinds[k]) M.lines.push({code:"",qty:"",kind:k}); if(!M.lines.length) M.lines.push({code:"",qty:"",kind:Object.keys(M.kinds)[0]}); draw(); return; }
    if(b.dataset.add){ grab(); M.lines.push({code:"",qty:"",kind:b.dataset.add}); draw(); var ins=FB.querySelectorAll('[data-ln="code"]'); if(ins.length) ins[ins.length-1].focus(); return; }
    if(b.dataset.rm!=null){ grab(); M.lines.splice(+b.dataset.rm,1); if(!M.lines.length) M.lines.push({code:"",qty:"",kind:Object.keys(M.kinds)[0]}); draw(); return; }
    if(b.dataset.st){ grab(); M.stage=+b.dataset.st; draw(); return; }
    var a=b.dataset.fm;
    if(a==="cancel") close();
    else if(a==="chg"){ grab(); M.f=null; draw(); }
    else if(a==="pick"){ grab(); M.newFac=null; draw(); }
    else if(a==="save") save();
  });
  DLG.addEventListener("click",function(e){ if(e.target===DLG) close(); });
  DLG.addEventListener("keydown",function(e){ if(e.key==="Escape"){ e.stopPropagation(); close(); } });
  function rid(){ return "fu"+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function save(){
    grab(); M.err="";
    var a=auth(); if(!a){ M.err="Phiên đăng nhập đã hết — đăng nhập lại."; draw(); return; }
    var f=M.f, hosp, ni, addr, fid="", ll="";
    if(f){ hosp=f.name; ni=f.ni; addr=f.addr||""; fid=/^U:/.test(f.id)?"":f.id; if(f.ll) ll=f.ll[1].toFixed(5)+","+f.ll[0].toFixed(5); }
    else if(M.newFac){ hosp=M.newFac.name; ni=M.newFac.ni===""?-1:+M.newFac.ni; addr=M.newFac.addr; if(!hosp){ M.err="Nhập tên cơ sở y tế."; draw(); return; } if(!(ni>=0)){ M.err="Chọn tỉnh / thành của cơ sở."; draw(); return; } }
    else { M.err="Chọn cơ sở y tế."; draw(); return; }
    var lines=M.lines.filter(function(l){ return l.code; }).map(function(l){ return {code:l.code, qty:+l.qty||0, kind:M.kinds[l.kind]?l.kind:Object.keys(M.kinds)[0], name:CDESC[l.code]||""}; });
    if(!lines.length){ M.err="Chọn ít nhất 1 mã sản phẩm và số lượng ước tính."; draw(); return; }
    if(lines.some(function(l){ return !l.qty; })){ M.err="Nhập số lượng ước tính cho mọi mã."; draw(); return; }
    var pvS=M.stage>=11, ptype=KD.filter(function(x){ return M.kinds[x.k]; }).map(function(x){ return x.pt; }).join(" + ");
    if(!pvS && M.stage===5 && !M.tbmt){ M.err="Gói đã nộp hồ sơ (Đang dự thầu): nhập số TBMT."; draw(); var tbi=document.getElementById("fm-tb"); if(tbi) tbi.focus(); return; }
    if(!M.c && !M.pkg) M.pkg=(pvS?"Mua sắm ":"Gói ")+ptype.toLowerCase()+" "+(M.start?M.start.slice(0,4):new Date().getFullYear());
    var r=rid(), now=new Date(), at=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0")+" "+String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0")+":"+String(now.getSeconds()).padStart(2,"0");
    var cid=M.c?M.c.id:"tmp-"+r, rev=M.c?M.c.revs.length+1:1, qty=lines.reduce(function(s2,l){ return s2+l.qty; },0);
    var body={ action:"fuSave", rid:r, "case":M.c?M.c.id:"", fid:fid, hosp:hosp, prov:NEW[ni][0], addr:addr, own:SCOPE.ownerOf(ni, (f&&f.oi) || ((provOf(NEW[ni][0], addr)||{}).o) || ""), pkg:M.pkg, tbmt:M.tbmt, ptype:ptype, items:lines,
               value:M.value||"", stage:M.stage, due:M.due, note:M.note.trim(), ll:ll, src:"Tender Map", start:M.start||"", dur:M.dur||"" };
    var row=[at, cid, rev, a.user.pic, "", fid, hosp, NEW[ni][0], addr, M.pkg, M.tbmt, ptype, lines.map(function(l){ return l.code+" × "+l.qty; }).join("; "), qty, +M.value||0, M.stage, ST[M.stage], M.due, M.note.trim(), JSON.stringify(lines), r, "Tender Map", ll];
    OB.push({rid:r, body:body, row:row, tmp:M.c?"":cid, tries:0, err:""}); obSave();
    var fx=f || null; close(); inval();
    if(!fx){ var cs=cases().filter(function(x){ return x.id===cid; })[0]; fx=cs?cs.f:null; }
    computeStats();
    if(fx) selectHosp(hospOf(fx)); else refresh();
    obRun();
  }

  /* ── hàng đợi ghi ── */
  function obSave(){ try{ localStorage.setItem(LS_OB, JSON.stringify(OB)); }catch(_){} obChip(); }
  function obChip(){
    var b=document.getElementById("obx"); if(!b) return;
    var err=OB.filter(function(o){ return o.err; }).length, n=OB.length;
    if(!n){ b.hidden=true; return; }
    b.hidden=false; b.className="obx"+(err?" err":"");
    b.textContent = err ? err+" cập nhật chưa lưu được — bấm để thử lại" : "Đang lưu "+n+" cập nhật…";
    b.onclick=function(){
      if(!err) return;
      var o=OB.filter(function(x){ return x.err; })[0];
      if(window.confirm(o.err+"\n\nThử gửi lại? (Bấm Huỷ để chọn bỏ cập nhật này)")){ OB.forEach(function(x){ x.err=""; x.tries=0; }); obSave(); obRun(); }
      else if(window.confirm("Bỏ cập nhật chưa lưu được của "+o.body.hosp+"?")){ OB=OB.filter(function(x){ return x!==o; }); obSave(); inval(); refresh(); }
    };
  }
  function post(body){
    return fetch(CRM_SURG,{ method:"POST", body:JSON.stringify(body), headers:{"Content-Type":"text/plain;charset=utf-8"}, redirect:"follow", credentials:"omit" })
      .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
      .catch(function(e){
        var url=CRM_SURG+"?"+qs(Object.assign({}, body, {items:JSON.stringify(body.items)}));
        if(url.length<7500) return jsonp(url, 40000);
        throw e;
      });
  }
  function obRun(){
    if(obBusy || !OB.length) return;
    var o=null;
    for(var i=0;i<OB.length;i++){ var x=OB[i], cs=x.body["case"]; if(x.err) continue;
      if(/^tmp-/.test(cs) && OB.some(function(y){ return y!==x && y.tmp===cs; })) continue;   // chờ dòng tạo gói được lưu trước
      o=x; break; }
    if(!o) return;
    var t=tk(); if(!t){ o.err="Cần đăng nhập lại để lưu."; obSave(); inval(); refresh(); return; }
    obBusy=true;
    var body=Object.assign({}, o.body, {tk:t});
    if(/^tmp-/.test(body["case"])){ body["case"]=""; }
    post(body).then(function(d){
      obBusy=false;
      if(d && d.ok && d.rec){
        S.rows.push(d.rec); OB=OB.filter(function(x){ return x!==o; });
        if(o.tmp){ OB.forEach(function(x){ if(x.body["case"]===o.tmp){ x.body["case"]=d.rec[1]; x.row[1]=d.rec[1]; } }); }
        try{ localStorage.setItem(LS_DATA, JSON.stringify({rows:S.rows, at:S.at, me:S.me})); }catch(_){}
        obSave(); inval(); refresh(); obRun(); if(typeof FA!=="undefined") setTimeout(FA.load, 400); return;
      }
      if(d && d.code==="AUTH"){ o.err=d.error||"Phiên đăng nhập hết hạn."; authFail(o.err); }
      else o.err=(d&&d.error)||"Máy chủ chưa nhận cập nhật.";
      obSave(); inval(); refresh();
    },function(e){
      obBusy=false; o.tries++;
      if(o.tries>=6){ o.err="Mạng / máy chủ không phản hồi ("+e.message+")."; obSave(); inval(); refresh(); return; }
      clearTimeout(obTimer); obTimer=setTimeout(obRun, Math.min(60000, 3000*Math.pow(2,o.tries)));
    });
  }
  /* nút bấm trong bảng bên (data-fu-*, data-lg) */
  SB.addEventListener("click",function(e){
    var b=e.target.closest("[data-lg],[data-fu-up],[data-fu-new],[data-fu-stage],[data-fu-res],[data-fu-warn],[data-fu-wall],[data-fh]"); if(!b) return;
    e.stopPropagation();
    if(b.dataset.lg){ var k=b.dataset.lg; if(k==="open"){ lg.open=true; side(); var ie=document.getElementById("lg-email"); if(ie) ie.focus(); return; } if(k==="send") lgSend(); else if(k==="resend") lgSend(true); else if(k==="verify") lgVerify(); else if(k==="back"){ lg.step="email"; lg.err=""; side(); } return; }
    if(b.dataset.fuUp){ open({caseId:b.dataset.fuUp}); return; }
    if(b.dataset.fuWarn!=null){ var w0=WL[+b.dataset.fuWarn]; if(w0) open({f:w0.p.h.f, pre:rePre(w0)}); return; }
    if(b.dataset.fuWall){ S.wAll=true; side(); return; }
    if(b.dataset.fuRes){ var cr=cases().filter(function(x){ return x.id===b.dataset.fuRes; })[0], rr=cr&&matchRes(cr);
      if(rr) open({caseId:cr.id, pre:{ stage:rr.mani?7:8, tbmt:cr.last.tbmt||(rr.p.tbmtRaw[0]||""), note:"Kết quả: "+resTxt(rr)+". "+rr.its.slice(0,6).map(function(it){ return brandOf(it)+" "+it.code+" × "+nfmt(it.qty)+(it.price?" ("+nfmt(it.price)+" đ)":""); }).join("; ") }}); return; }
    if(b.dataset.fuNew!=null){ var v=b.dataset.fuNew; if(/^P\|/.test(v)) open({prov:+v.slice(2)}); else if(v && HK[v]) open({f:HK[v].f}); else open({}); return; }
    if(b.dataset.fuStage!=null){ var s2=+b.dataset.fuStage; S.stage = S.stage===s2 ? 0 : s2; if(s2 && S.stf!=="all" && !pass({stage:s2,pic:""},true)) S.stf="all"; filters(); refresh(); return; }
    if(b.dataset.fh && HK[b.dataset.fh]) selectHosp(HK[b.dataset.fh]);
  }, true);
  SB.addEventListener("keydown",function(e){
    if(e.key==="Enter"){ if(e.target.id==="lg-email"){ e.preventDefault(); lgSend(); } else if(e.target.id==="lg-code"){ e.preventDefault(); lgVerify(); } }
  });
  window.addEventListener("online", obRun);
  setTimeout(obRun, 1500);
  setInterval(function(){ if(F.view==="fu" && auth() && !S.loading && document.visibilityState==="visible") load(); }, 5*60000);
  function ensure(){ if(auth() && !S.loaded && !S.loading) load(); }
  function lgAct(k){ if(k==="send") lgSend(); else if(k==="resend") lgSend(true); else if(k==="verify") lgVerify(); else if(k==="back"){ lg.step="email"; lg.err=""; lgUi(); } }
  return { ST:ST, SC:SC, sum:sum, tk:tk, loginHtml:loginHtml, lgAct:lgAct, lgStep:function(){ return lg.step; }, onLogin:function(fn){ ONL.push(fn); }, isPriv:isPriv, mine:mine, pcol:pcol, warns:warns, warnCount:warnCount, ensure:ensure, load:load, filters:filters, stats:stats, col:col, legend:legend, tipP:tipP, tipH:tipH, side:side, hospHtml:hospHtml,
           byFac:byFac, open:open, inval:inval, cases:cases, items:items, plans:plans, bar:bar, auth:auth, color:FUCOL, _S:S, _OB:function(){ return OB; },
           fac:facOfRow, resTxt:resTxt, covData:covData,
           results:function(){ return cases().filter(function(c){ return c.f && SCOPE.inProv(c.f.ni, c.f.oi) && matchRes(c); }).map(function(c){ return {c:c, r:matchRes(c)}; }); },
           feed:function(d){ var t0=Date.now()-d*864e5, out=[]; cases().forEach(function(c){ if(!c.f || !SCOPE.inProv(c.f.ni, c.f.oi)) return; c.revs.forEach(function(r){ var x=Date.parse(String(r.at).replace(" ","T")); if(x>t0) out.push([r,c]); }); });
             return out.sort(function(a,b){ return String(b[0].at).localeCompare(String(a[0].at)); }); } };
})();

/* ═════════ DOANH SỐ ƯỚC TÍNH (09/11/2026) — sheet "Follow up by Account" của CRM Surgical (backend MMH_FcAccount.gs) ═════════
   Mỗi dòng = 1 mã SP ở 1 cơ sở: ① Existing (gói MANI đang chạy) · ② Duy trì (gói kế tiếp) · ③ Mở mới (hãng khác đang giữ) · Đang dự thầu · Tư nhân.
   Doanh số FY = SL ÷ hiệu lực × giá MANI → NPP theo mã × số tháng nằm trong FY (máy chủ tính, app cộng theo phạm vi đang xem).
   Khối tóm tắt nằm trong khung bản đồ (#fabox): Kênh thầu · Tư nhân · Tất cả; theo tỉnh đang chọn + địa bàn PIC. Sales sửa SL / mốc / giai đoạn ở chi tiết cơ sở. */
var FA=(function(){
  var S={ cols:[], rows:[], loaded:false, loading:false, err:"", at:"", fy:null, prices:{}, stages:[], priv:[], lists:{}, sync:{}, ch:"all", min:null, saving:false };
  try{ S.ch=localStorage.getItem("tm_fa_ch")||"all"; var mn=localStorage.getItem("tm_fa_min"); S.min = mn==null ? null : mn==="1"; }catch(_){}
  var R=[], BYK={}, BOX=null, DL=null, E=null;
  var GN={ "①":"① Existing", "②":"② Duy trì", "③":"③ Mở mới", bid:"Đang dự thầu", tn:"Tư nhân" }, GS={ "①":"Existing", "②":"Duy trì", "③":"Mở mới", bid:"Dự thầu", tn:"Tư nhân" }, GC={ "①":"#1E7B4F", "②":"#3A5CAA", "③":"#C77700", bid:"#B45309", tn:"#7C3AED" };
  var KN={ dao:["Dao","cái"], chi:["Chỉ khâu","sợi"], ghim:["Ghim da","cái"], hook:["Hook","cái"], forcep:["Micro Forceps","cái"] };
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(_){} }
  function obj(a){
    var o={}; S.cols.forEach(function(c,i){ o[c]=a[i]; });
    ["qty","dur","price","n","qtyFy","valFy","others"].forEach(function(k){ o[k]=+o[k]||0; });
    o.inc=/^Có/.test(o.inFc||""); var pv=provOf(o.prov,""); o.ni=pv?pv.n:-1; o.hk=hkey(o.hosp);
    o.g = o.kenh==="Tư nhân" ? "tn" : (o.stage==="Đang dự thầu" && String(o.grp).charAt(0)!=="①") ? "bid" : String(o.grp).charAt(0);
    if(!GN[o.g]) o.g="③";
    return o;
  }
  function index(){ S.ver=(S.ver||0)+1; R=S.rows.map(obj); BYK={}; R.forEach(function(r){ (BYK[r.ni+"|"+r.hk]=BYK[r.ni+"|"+r.hk]||[]).push(r); }); }
  function apply(d, cached){
    S.cols=d.cols||[]; S.rows=d.rows||[]; S.fy=d.fy||null; S.prices=d.prices||{}; S.stages=d.stages||[]; S.priv=d.priv||[]; S.lists=d.lists||{}; S.sync=d.sync||{};
    S.loaded=true; S.cached=!!cached; index();
  }
  function load(){
    var t=FU.tk(); if(!t){ box(); return Promise.resolve(); }
    if(S.loading) return Promise.resolve();
    S.loading=true; S.err=""; box();
    if(!S.loaded) IDB.get("fa").then(function(c){ if(c && c.d && !S.loaded){ apply(c.d, true); S.at=c.at; after(); } });
    return getJSON(CRM_SURG+"?action=fuFcList&tk="+encodeURIComponent(t)).then(function(d){
      S.loading=false;
      if(d && d.ok){ apply(d); S.at=new Date().toLocaleString("vi-VN"); IDB.set("fa", {at:S.at, d:d}); }
      else if(d && d.code==="AUTH") S.err=d.error||"Phiên đăng nhập hết hạn.";
      else S.err=(d&&d.error)||"Không đọc được dữ liệu dự báo (Follow up by Account).";
      after();
    },function(e){ S.loading=false; S.err="Không đọc được dữ liệu dự báo ("+e.message+")."; box(); });
  }
  function ensure(){ if(FU.auth() && !S.loaded && !S.loading) load(); else box(); }
  /* dữ liệu kế hoạch đổi ⇒ Theo dõi thầu (hàng nút giai đoạn, bản đồ) vẽ lại */
  function after(){ if(F.view==="fu") refresh(); else { box(); if(selH) renderSide(); } }
  /* phạm vi đang xem: kênh · tỉnh đang chọn · địa bàn PIC (Sales chỉ thấy địa bàn của mình) */
  function scoped(){
    var pic=SCOPE.pic();
    return R.filter(function(r){
      if(S.ch==="thau" && r.kenh==="Tư nhân") return false;
      if(S.ch==="tn" && r.kenh!=="Tư nhân") return false;
      if(pic && r.pic && r.pic!==pic) return false;
      if(sel>=0 && r.ni!==sel) return false;
      return true;
    });
  }
  function sum(L){
    var o={ val:0, n:0, ex:0, q:{}, by:{} };
    L.forEach(function(r){ if(!r.inc){ o.ex++; return; } o.n++; o.val+=r.valFy; var k=r.kind||"dao"; o.q[k]=(o.q[k]||0)+r.qtyFy; o.by[r.g]=(o.by[r.g]||0)+r.valFy; });
    return o;
  }
  function fyLbl(){ return S.fy ? "FY"+S.fy.fy : "FY"; }
  function fyRange(){ return S.fy ? "T"+S.fy.from+" – T"+S.fy.to : ""; }
  /* ── khối tóm tắt trong khung bản đồ ── */
  /* thẻ chung trên bản đồ (người dùng 11/11/2026: gọn, không thêm khối nổi): ĐỘ PHỦ theo tab (biểu đồ tròn, COV) + DOANH SỐ ƯỚC TÍNH (Kết quả / Theo dõi thầu).
     Thu gọn = 1 viên: "Độ phủ x% · DS FY68 y" */
  function box(){
    BOX=BOX||document.getElementById("fabox"); if(!BOX) return;
    var on=!!FU.auth();
    BOX.hidden=!on; if(!on) return;
    var mob=MQ.matches, min = S.min==null ? mob : S.min, act=F.view==="act", cv=(typeof COV!=="undefined") ? COV.get() : null;
    BOX.classList.toggle("min", min);
    var L=S.loaded ? scoped() : [], s=sum(L), place = sel>=0 ? NEW[sel][0] : (SCOPE.pic() ? "địa bàn "+SCOPE.pic() : "toàn quốc");
    if(min){
      var pp=[]; if(cv) pp.push(esc(cv.short)+' <b>'+Math.round(cv.main*100)+'%</b>');
      if(!act) pp.push(S.loaded ? 'DS '+fyLbl()+' <b>'+vnd(s.val)+'</b>' : (S.loading?'Đang đọc doanh số…':'Doanh số ước tính'));
      BOX.innerHTML='<button class="fapill" type="button" data-fa="min" title="Mở độ phủ / doanh số ước tính">'+pp.join(' · ')+'<i>▾</i></button>'; return;
    }
    var html='<button class="fax" type="button" data-fa="min" title="Thu gọn" aria-label="Thu gọn">–</button>'+(cv ? COV.html(cv) : '');
    if(!act){
      html+='<div class="fasec"><div class="fah"><b>Doanh số ước tính '+fyLbl()+'</b></div>';
      if(!S.loaded) html+='<div class="faf">'+(S.loading?'Đang đọc…':(S.err?'<span class="er">'+esc(S.err)+'</span>':''))+'</div></div>';
      else {
        var chs=[["thau","Kênh thầu"],["tn","Tư nhân"],["all","Tất cả"]];
        var tot=s.val||1, gs=["①","②","③","bid","tn"].filter(function(g){ return s.by[g]; });
        var q=["dao","chi","ghim"].map(function(k){ return '<div><b>'+nfmt(Math.round(s.q[k]||0))+'</b><span>'+KN[k][0]+' ('+KN[k][1]+')</span></div>'; }).join("");
        html+='<div class="seg fach" role="tablist">'+chs.map(function(c){ return '<button type="button" data-fa-ch="'+c[0]+'" class="'+(S.ch===c[0]?"on":"")+'">'+c[1]+'</button>'; }).join("")+'</div>'+
          '<div class="fav"><b>'+vnd(s.val)+'</b><span>'+esc(fyRange())+' · '+esc(place)+'</span></div>'+
          '<div class="faq">'+q+'</div>'+
          (gs.length ? '<div class="fabar">'+gs.map(function(g){ return '<i style="width:'+(s.by[g]/tot*100).toFixed(1)+'%;background:'+GC[g]+'" title="'+esc(GN[g]+": "+vnd(s.by[g]))+'"></i>'; }).join("")+'</div>'+
            '<div class="fag">'+gs.map(function(g){ return '<span><i style="background:'+GC[g]+'"></i>'+GN[g]+' <b>'+vnd(s.by[g])+'</b></span>'; }).join("")+'</div>' : '<div class="fag">Chưa có dòng tính vào dự báo trong phạm vi này.</div>')+
          '<div class="faf">'+s.n+' mã tính vào dự báo'+(s.ex?' · '+s.ex+' mã chưa đủ SL / mốc':'')+(S.cached||S.loading?' · đang cập nhật…':'')+(S.err?' · <span class="er">'+esc(S.err)+'</span>':'')+'</div></div>';
      }
    }
    BOX.innerHTML=html;
  }
  document.addEventListener("click",function(e){
    var b=e.target.closest("#fabox [data-fa], #fabox [data-fa-ch]"); if(!b) return;
    if(b.dataset.faCh){ S.ch=b.dataset.faCh; lsSet("tm_fa_ch",S.ch); box(); if(selH) renderSide(); return; }
    var mob=MQ.matches, min = S.min==null ? mob : S.min; S.min=!min; lsSet("tm_fa_min", S.min?"1":"0");
    if(!S.loaded && !S.loading) load(); box();
  });
  /* ── chi tiết cơ sở: các mã dự báo + sửa ── */
  function rowsOf(h){
    if(!h) return [];
    var f=h.f||null, k=hkey(h.name), out=BYK[h.ni+"|"+k] ? BYK[h.ni+"|"+k].slice() : [];
    R.forEach(function(r){ if(out.indexOf(r)>=0) return;
      if((f && r.fid && r.fid===f.id) || (r.ni===h.ni && (sameName(r.hosp, h.name) || (f && f.alias && f.alias.some(function(a){ return hkey(a)===r.hk; }))))) out.push(r); });
    return out;
  }
  function fmtStart(s){ return s ? "T"+s : "—"; }
  function hospHtml(h){
    if(!FU.auth()) return "";
    if(!S.loaded) return S.loading ? '<div class="empty">Đang đọc dự báo doanh số…</div>' : "";
    var L=rowsOf(h), s=sum(L), pv=isPv(h.f);
    var html='<h3>Dự báo doanh số '+fyLbl()+(L.length?' · <b style="color:var(--navy)">'+vnd(s.val)+'</b>':'')+' · <button class="lnk" type="button" data-fa-add="'+esc(h.key)+'">+ Thêm mã</button></h3>';
    if(!L.length) return html+'<div class="empty">Chưa có mã nào trong sheet Follow up by Account cho cơ sở này'+(pv?' — cơ sở tư nhân: thêm mã + SL ước tính sử dụng':'')+'.</div>';
    var ord={"①":0,"②":1,"bid":2,"③":3,"tn":4};
    L.sort(function(a,b){ return (ord[a.g]-ord[b.g]) || String(a.type).localeCompare(String(b.type)) || String(a.code).localeCompare(String(b.code)); });
    /* 11/11/2026 (người dùng: dòng chưa điền làm rối): dòng chưa tính + chưa có giai đoạn / ghi chú gom vào 1 dòng thu gọn */
    var emp=function(r){ return !r.inc && !r.stage && !r.note; }, L1=L.filter(function(r){ return !emp(r); }), L0=L.filter(emp);
    var head='<thead><tr><th>Nhóm</th><th>Mã</th><th class="r">SL / tháng</th><th class="r">Tháng</th><th class="r">Doanh số</th><th>Giai đoạn</th></tr></thead>';
    return html+(L1.length?'<div class="tbl-wrap"><table class="fat">'+head+'<tbody>'+rowsH(L1)+'</tbody></table></div>':'')+
      (L0.length?'<details class="faoff"'+(L1.length?'':' open')+'><summary>'+L0.length+' mã chưa có SL / tháng bắt đầu'+(L0.some(function(r){ return r.g==="③"; })?' (hãng khác đang giữ)':'')+' — bấm để xem, điền</summary><div class="tbl-wrap"><table class="fat">'+head+'<tbody>'+rowsH(L0)+'</tbody></table></div></details>':'')+
      '<div class="fahint">Bấm 1 dòng để sửa SL, tháng bắt đầu, giai đoạn, ghi chú. Dòng mờ = chưa tính vào dự báo (thiếu SL / tháng bắt đầu, hoặc trượt / dừng).</div>';
  }
  function rowsH(L){
    return L.map(function(r){ var per=r.dur?r.qty/r.dur:0;
        return '<tr class="'+(r.inc?"":"off")+'" data-fa-edit="'+esc(r.id)+'" role="button" tabindex="0" title="'+esc((r.inFc||"")+(r.note?" · "+r.note:""))+'">'+
          '<td class="g" title="'+esc(GN[r.g])+'"><i class="fadot" style="background:'+GC[r.g]+'"></i>'+esc(GS[r.g])+'</td><td><b>'+esc(r.code)+'</b>'+(r.npp?'<small>'+esc(r.npp)+'</small>':'')+'</td>'+
          '<td class="r">'+(per?nfmt(Math.round(per*10)/10):"—")+'</td><td class="r">'+(r.n||"—")+'<small>'+esc(fmtStart(r.start))+'</small></td>'+
          '<td class="r">'+(r.inc?vnd(r.valFy):'<span class="na">—</span>')+'</td><td>'+esc(r.stage||"—")+'</td></tr>'; }).join("");
  }
  /* ── hộp sửa / thêm ── */
  function dlg(){
    if(DL) return DL;
    DL=document.createElement("div"); DL.className="dlg"; DL.id="fa-dlg"; DL.hidden=true;
    DL.innerHTML='<div class="box wide" role="dialog" aria-modal="true" aria-labelledby="fa-t"><h4 id="fa-t"></h4><div id="fa-b"></div></div>';
    document.body.appendChild(DL);
    DL.addEventListener("click",function(e){ if(e.target===DL){ close(); return; } var b=e.target.closest("button"); if(!b) return; if(b.dataset.fd==="cancel") close(); else if(b.dataset.fd==="save") save(); else if(b.dataset.fd==="del") del(); else if(b.dataset.fd==="del2") del(true); });
    DL.addEventListener("input",function(){ est(); });
    DL.addEventListener("keydown",function(e){ if(e.key==="Escape"){ e.stopPropagation(); close(); } });
    return DL;
  }
  function close(){ if(DL) DL.hidden=true; E=null; }
  function opts(list, cur, blank){ return (blank?'<option value="">'+blank+'</option>':'')+(list||[]).map(function(x){ return '<option'+(x===cur?" selected":"")+'>'+esc(x)+'</option>'; }).join(""); }
  function mi(s){ var m=/^(\d{1,2})\/(\d{4})$/.exec(s||""); return m ? (+m[2])*12+(+m[1]-1) : 0; }
  function monthVal(s){ var m=/^(\d{1,2})\/(\d{4})$/.exec(s||""); return m ? m[2]+"-"+String(m[1]).padStart(2,"0") : ""; }
  function open(id, h){
    var r=id ? R.filter(function(x){ return x.id===id; })[0] : null; if(id && !r) return;
    dlg(); var pv=r ? r.kenh==="Tư nhân" : isPv(h && h.f);
    E={ r:r, h:h, pv:pv, err:"" };
    var lock=r && r.g==="①", hn=r ? r.hosp : h.name;
    document.getElementById("fa-t").textContent = r ? (lock ? "Hợp đồng đang chạy · "+r.code : "Sửa dự báo · "+r.code) : "Thêm mã dự báo"+(pv?" · cơ sở tư nhân":"");
    var st=pv ? S.priv : S.stages, L=S.lists||{};
    var html='<div class="fm"><div class="fsel"><div><b>'+esc(hn)+'</b><br><span>'+esc(r ? [r.grp||"Tư nhân", r.npp, r.tbmt?"TBMT "+r.tbmt:""].filter(Boolean).join(" · ") : (NEW[h.ni]?NEW[h.ni][0]:""))+'</span></div></div>';
    if(r && r.now) html+='<div class="hint" style="white-space:pre-line">'+esc(r.now)+'</div>';
    if(lock) html+='<div class="note">Dòng ① = hợp đồng MANI đang chạy (theo dữ liệu thầu NPP / KQTT): SL và hiệu lực theo hợp đồng, không sửa. Ghi chú / tiến độ vẫn sửa được.</div>';
    else {
      if(!r && !pv) html+='<div><label class="l" for="fa-g">Nhóm</label><select class="inp" id="fa-g"><option>③ Mở mới</option><option>② Duy trì</option></select></div>';
      html+='<div class="two"><div><label class="l" for="fa-code">Mã sản phẩm</label><input class="inp" id="fa-code" list="fa-codes" autocomplete="off" placeholder="vd. MSL28SH" value="'+esc(r?r.code:"")+'"></div>'+
        '<div><label class="l" for="fa-qty">SL '+(pv?'ước tính sử dụng':'cả gói')+' (cái / sợi)</label><input class="inp" id="fa-qty" inputmode="numeric" value="'+esc(r&&r.qty?r.qty:"")+'"></div></div>'+
        '<div class="two"><div><label class="l" for="fa-start">Bắt đầu (tháng)</label><input class="inp" id="fa-start" type="month" value="'+esc(r?monthVal(r.start):"")+'"></div>'+
        '<div><label class="l" for="fa-dur">Hiệu lực / thời gian dùng (tháng)</label><input class="inp" id="fa-dur" inputmode="numeric" value="'+esc(r&&r.dur?r.dur:12)+'"></div></div>'+
        '<div class="faest" id="fa-est"></div>';
    }
    html+='<div class="two"><div><label class="l" for="fa-st">Giai đoạn bán hàng</label><select class="inp" id="fa-st">'+opts(st, r?r.stage:"", "—")+'</select></div>'+
      (pv ? '<div><label class="l" for="fa-due">Ngày dự kiến (mốc tiếp)</label><input class="inp" id="fa-due" type="date" value="'+esc(r?r.due:"")+'"></div>' :
      '<div><label class="l" for="fa-pr">Tiến độ (phía bệnh viện)</label><select class="inp" id="fa-pr">'+opts(L.prog, r?r.prog:"", "—")+'</select></div>')+'</div>';
    if(!pv) html+='<div class="two"><div><label class="l" for="fa-co">Cơ hội</label><select class="inp" id="fa-co">'+opts(L.chance, r?r.chance:"", "—")+'</select></div>'+
      '<div><label class="l" for="fa-cf">Cấu hình</label><select class="inp" id="fa-cf">'+opts(L.cfg, r?r.cfg:"", "—")+'</select></div></div>'+
      '<div class="two"><div><label class="l" for="fa-br">Hãng đề xuất</label><input class="inp" id="fa-br" list="fa-brands" value="'+esc(r?r.brand:"")+'"></div>'+
      '<div><label class="l" for="fa-cr">Tiêu chí ưu tiên</label><select class="inp" id="fa-cr">'+opts(L.crit, r?r.crit:"", "—")+'</select></div></div>'+
      '<div><label class="l" for="fa-due">Ngày dự kiến (mốc tiếp)</label><input class="inp" id="fa-due" type="date" value="'+esc(r?r.due:"")+'"></div>';
    html+='<div><label class="l" for="fa-note">Ghi chú</label><textarea class="inp" id="fa-note" rows="3" placeholder="Rào cản, người ủng hộ, việc cần làm tiếp…">'+esc(r?r.note:"")+'</textarea></div></div>'+
      '<div class="ft2"><span class="er" id="fa-er"></span>'+(r && /^S\|/.test(r.id)?'<button class="btn" type="button" data-fd="del">Xoá dòng</button>':'')+'<button class="btn" type="button" data-fd="cancel">Huỷ</button><button class="btn pri" type="button" data-fd="save">Lưu</button></div>'+
      '<datalist id="fa-codes">'+Object.keys(S.prices).sort().map(function(c){ return '<option value="'+esc(c)+'">'; }).join("")+'</datalist>'+
      '<datalist id="fa-brands">'+(L.brand||[]).map(function(c){ return '<option value="'+esc(c)+'">'; }).join("")+'</datalist>';
    document.getElementById("fa-b").innerHTML=html; DL.hidden=false; est();
    var f0=DL.querySelector(lock?"#fa-note":"#fa-code, #fa-qty"); if(f0) setTimeout(function(){ f0.focus(); },30);
  }
  function v(id){ var e=document.getElementById(id); return e ? e.value : null; }
  /* ước tính ngay trên máy: SL / tháng × số tháng trong FY × giá */
  function est(){
    var box2=document.getElementById("fa-est"); if(!box2 || !S.fy) return;
    var code=String(v("fa-code")||"").trim().toUpperCase(), q=+String(v("fa-qty")||"").replace(/[^\d]/g,"")||0, d=+v("fa-dur")||12, st=v("fa-start")||"";
    var p=S.prices[code] ? S.prices[code][0] : 0;
    if(!p){ var c0=code.split(/[\/,;+]/)[0]; if(S.prices[c0]) p=S.prices[c0][0]; }
    var s0=st ? (+st.slice(0,4))*12+(+st.slice(5,7)-1) : 0, a=Math.max(s0, S.fy.m0), b=Math.min(s0+d-1, S.fy.m0+11), n=s0 && b>=a ? b-a+1 : 0;
    var per=d?q/d:0;
    box2.innerHTML = (q && s0) ? 'SL / tháng <b>'+nfmt(Math.round(per*10)/10)+'</b> · <b>'+n+'</b> tháng trong '+fyLbl()+' · giá NPP '+(p?'<b>'+prc(p)+'</b>':'<span class="na">chưa có giá mã này</span>')+' ⇒ <b>'+vnd(per*n*p)+'</b>'
      : '<span class="na">Nhập SL + tháng bắt đầu để tính doanh số '+fyLbl()+'.</span>';
  }
  function post(body){
    return fetch(CRM_SURG,{ method:"POST", body:JSON.stringify(body), headers:{"Content-Type":"text/plain;charset=utf-8"}, redirect:"follow", credentials:"omit" })
      .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
      .catch(function(e){ var url=CRM_SURG+"?"+Object.keys(body).map(function(k){ return encodeURIComponent(k)+"="+encodeURIComponent(body[k]==null?"":body[k]); }).join("&"); if(url.length<7500) return jsonp(url, 40000); throw e; });
  }
  function err(m){ var e=document.getElementById("fa-er"); if(e) e.textContent=m||""; }
  function save(){
    if(!E || S.saving) return;
    var t=FU.tk(); if(!t){ err("Phiên đăng nhập đã hết — đăng nhập lại."); return; }
    var r=E.r, h=E.h, body={ action:"fuFcSave", tk:t, rid:"fa"+Date.now().toString(36)+Math.random().toString(36).slice(2,6) };
    if(r) body.id=r.id; else { body.hosp=h.name; body.prov=NEW[h.ni]?NEW[h.ni][0]:""; body.fid=h.f && !/^U:/.test(h.f.id) ? h.f.id : ""; body.kenh=E.pv?"Tư nhân":"Thầu"; if(v("fa-g")) body.grp=v("fa-g"); }
    var lock=r && r.g==="①";
    if(!lock){
      var code=String(v("fa-code")||"").trim().toUpperCase(), q=String(v("fa-qty")||"").replace(/[^\d]/g,"");
      if(!code){ err("Nhập mã sản phẩm."); return; }
      if(!r && !q){ err("Nhập số lượng."); return; }
      body.code=code; body.qty=q; body.start=v("fa-start")||""; body.dur=v("fa-dur")||12;
    }
    ["st:stage","pr:prog","co:chance","cf:cfg","br:brand","cr:crit","due:due","note:note"].forEach(function(x){ var p=x.split(":"), val=v("fa-"+p[0]); if(val!=null) body[p[1]]=val; });
    S.saving=true; err("Đang lưu…");
    post(body).then(function(d){
      S.saving=false;
      if(d && d.ok){ close(); load(); return; }
      err((d&&d.error)||"Máy chủ chưa nhận cập nhật.");
    },function(e){ S.saving=false; err("Không lưu được ("+e.message+"). Thử lại."); });
  }
  function del(sure){
    if(!E || !E.r) return;
    if(!sure){ var b=DL.querySelector('[data-fd="del"]'); if(b){ b.textContent="Bấm lần nữa để xoá"; b.dataset.fd="del2"; } return; }
    var t=FU.tk(); S.saving=true; err("Đang xoá…");
    post({ action:"fuFcDel", tk:t, id:E.r.id, rid:"fd"+Date.now().toString(36) }).then(function(d){ S.saving=false; if(d && d.ok){ close(); load(); } else err((d&&d.error)||"Không xoá được."); },
      function(e){ S.saving=false; err("Không xoá được ("+e.message+")."); });
  }
  SB.addEventListener("click",function(e){
    var a=e.target.closest("[data-fa-add]"); if(a){ var h=HK[a.dataset.faAdd]||selH; if(h) open(null, h); return; }
    var r=e.target.closest("[data-fa-edit]"); if(r) open(r.dataset.faEdit, selH);
  });
  SB.addEventListener("keydown",function(e){ if(e.key!=="Enter") return; var r=e.target.closest("[data-fa-edit]"); if(r) open(r.dataset.faEdit, selH); });
  return { ensure:ensure, load:load, box:box, hospHtml:hospHtml, rowsOf:rowsOf, rows:function(){ return R; }, ver:function(){ return S.ver||0; }, gname:function(g){ return GN[g]||g||""; }, sum:sum, scoped:scoped, open:open, _S:S };
})();

/* ═════════ MỚI CẬP NHẬT (11/11/2026, người dùng: "thầu mới cập nhật không được hiển thị, không biết lúc nào gói đang theo dõi ra kết quả") ═════════
   Nguồn: backend crm-surgical ▸ fuNews (sổ TENDER MAP · GÓI MỚI — mỗi lượt đồng bộ mỗi giờ ghi gói lần đầu thấy / gói NPP đổi kết quả) + gói theo dõi đã khớp
   kết quả thầu (FU.results) + lần cập nhật của Sales 7 ngày. Nút chuông ở thanh trên: số = mục mới từ lần mở trước + gói theo dõi có kết quả chưa ghi.
   Bảng bên chế độ riêng (‹ để đóng); link thông báo ?new=1 mở thẳng. */
var NEWS=(function(){
  var S={ cols:[], rows:[], loaded:false, loading:false, err:"", base:"", last:"", on:false, f:"all" };
  var LS="tm_news_seen", SRC={HV:"Hùng Vĩ", IC:"iCare", KQ:"KQTT"}, TBI=null;
  function seen(){ try{ return localStorage.getItem(LS)||""; }catch(_){ return ""; } }
  function obj(a){ var o={}; S.cols.forEach(function(c,i){ o[c]=a[i]; }); o.t=String(o.chg||o.seen||""); var pv=provOf(o.prov,""); o.ni=pv?pv.n:-1; o.oi=pv?pv.o:""; o.mani=+o.mani===1; return o; }
  function load(){
    var t=FU.tk(); if(!t || S.loading) return Promise.resolve();
    S.loading=true;
    return getJSON(CRM_SURG+"?action=fuNews&days=45&tk="+encodeURIComponent(t)).then(function(d){
      S.loading=false;
      if(d && d.ok){ S.cols=d.cols||[]; S.rows=(d.rows||[]).map(obj); S.base=d.base||""; S.last=d.last||""; S.loaded=true; S.err=""; if(S.on) markSeen(); }
      else S.err=(d&&d.error)||"Không đọc được mục Mới cập nhật.";
      badge(); if(S.on) renderSide();
    },function(e){ S.loading=false; S.err="Không đọc được mục Mới cập nhật ("+e.message+")."; badge(); if(S.on) renderSide(); });
  }
  function inScope(o){ if(o.ni>=0) return SCOPE.inProv(o.ni, o.oi); var p=SCOPE.pic(); return !p || o.pic===p; }
  function rows(){ return S.rows.filter(inScope); }
  function hOf(o){
    if(o._h!==undefined) return o._h;
    if(!TBI || TBI.n!==PKGS.length){ TBI={n:PKGS.length, m:{}}; PKGS.forEach(function(p){ if(p.h && p.tbmt) TBI.m[tbNorm(p.tbmt)]=p.h; }); }
    var h=o.tbmt ? TBI.m[tbNorm(o.tbmt)]||null : null;
    if(!h){ var f=FU.fac({fid:"", hosp:o.hosp, prov:o.prov, addr:"", ll:""}); if(f) h=hospOf(f); }
    o._h=h; return h;
  }
  function followed(h){ return !!h && !!h.f && FU.items().some(function(c){ return c.f && c.f.id===h.f.id && ((c.stage>=1&&c.stage<=6)||(c.stage>=11&&c.stage<=14)); }); }
  function count(){ var sn=seen(); return rows().filter(function(o){ return o.t>sn; }).length + FU.results().length; }
  function badge(){
    var b=document.getElementById("news"); if(!b) return; var a=FU.auth(); b.hidden=!a; if(!a) return;
    var n=count(), e=b.querySelector(".n"); e.textContent=n>99?"99+":String(n); e.hidden=!n;
    b.classList.toggle("on", S.on); b.setAttribute("aria-pressed", S.on?"true":"false"); b.title="Mới cập nhật"+(n?" · "+n+" mục mới":"");
  }
  function markSeen(){ var mx=S.rows.reduce(function(a,o){ return o.t>a?o.t:a; }, seen()); try{ localStorage.setItem(LS, mx); }catch(_){} }
  function open(){ S.on=true; S.prev=seen(); if(!S.loaded && !S.loading) load(); else markSeen(); if(MQ.matches) SHEET.to("full"); renderSide(); SB.scrollTop=0; badge(); }
  function close(quiet){ if(!S.on) return; S.on=false; badge(); if(!quiet) renderSide(); }
  function rt(o){
    if(o.res==="Pending") return [(SRC[o.src]||o.src)+" đang dự thầu","warn"];
    if(o.src==="KQ") return o.mani ? ["MANI trúng","ok"] : ["Hãng khác trúng","bad"];
    return o.res==="Win" ? ["MANI trúng · "+(SRC[o.src]||o.src),"ok"] : [(SRC[o.src]||o.src)+" trượt","bad"];
  }
  function dayLbl(t){ var d=String(t).slice(0,10), n=new Date(), iso=function(x){ return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); };
    var td=iso(n); n.setDate(n.getDate()-1); var yd=iso(n); return d===td?"Hôm nay":d===yd?"Hôm qua":d2(d); }
  function side(){
    var t=document.getElementById("sh-t"), s=document.getElementById("sh-s"), sn=S.prev!=null?S.prev:seen();
    t.innerHTML='<button class="sbk" data-nx="1" title="Đóng mục Mới cập nhật">‹</button>Mới cập nhật';
    s.textContent=(SCOPE.pic()?"Địa bàn "+SCOPE.pic()+" · ":"")+"45 ngày gần nhất"+(S.last?" · dữ liệu thầu đồng bộ lúc "+S.last.slice(11,16)+" "+d2(S.last.slice(0,10)):"");
    var html=S.err?'<div class="note err">'+esc(S.err)+'</div>':'';
    /* ① gói đang theo dõi đã có kết quả (khớp số TBMT / cùng cơ sở sau ngày bắt đầu theo dõi) */
    var R=FU.results();
    if(R.length) html+='<h3>Gói đang theo dõi đã có kết quả · '+R.length+'</h3>'+R.map(function(x){ var c=x.c, r=x.r;
      return '<div class="nwi"><div class="nwh"><span class="a" data-fh="'+esc(hospOf(c.f).key)+'" role="button" tabindex="0">'+esc(c.f.name)+'</span><span class="st '+(r.mani?"ok":"bad")+'">'+(r.mani?"MANI trúng":"Hãng khác trúng")+'</span></div>'+
        '<div class="nwb">'+esc(NEW[c.f.ni][0])+' · '+esc(c.last.pkg||c.id)+' · '+esc(c.pic)+'</div><div class="nwb">'+esc(FU.resTxt(r))+'</div>'+
        '<div class="acts"><button class="btn sm pri" type="button" data-fu-res="'+esc(c.id)+'">Ghi kết quả: '+(r.mani?"Đã trúng thầu":"Trượt thầu")+'</button></div></div>'; }).join("");
    /* ② kết quả thầu mới (sổ gói mới của backend) */
    var L=rows(), cnt={all:L.length, ok:0, bad:0, warn:0};
    L.forEach(function(o){ cnt[rt(o)[1]]++; });
    var Lf=S.f==="all" ? L : L.filter(function(o){ return rt(o)[1]===S.f; });
    html+='<h3>Kết quả thầu mới · '+L.length+'</h3>';
    if(L.length) html+='<div class="seg nwf">'+[["all","Tất cả"],["ok","MANI trúng"],["bad","Hãng khác / trượt"],["warn","NPP dự thầu"]].map(function(o){ return '<button type="button" data-nf="'+o[0]+'" class="'+(S.f===o[0]?"on":"")+'">'+o[1]+' <b>'+cnt[o[0]]+'</b></button>'; }).join("")+'</div>';
    if(!S.loaded && S.loading) html+='<div class="empty">Đang đọc…</div>';
    else if(!L.length) html+='<div class="note">'+(S.base ? 'Hệ thống bắt đầu ghi nhận gói thầu mới từ <b>'+d2(S.base)+'</b> (mỗi giờ đối chiếu file Hùng Vĩ, iCare, KQTT toàn quốc). Chưa có gói mới trong 45 ngày ở phạm vi đang xem.' : 'Chưa có dữ liệu gói mới — hệ thống ghi nhận từ lần đồng bộ kế tiếp (mỗi giờ).')+'</div>';
    var cur="";
    Lf.slice(0,80).forEach(function(o){
      var dl=dayLbl(o.t); if(dl!==cur){ cur=dl; html+='<div class="nwd">'+esc(dl)+'</div>'; }
      var h=hOf(o), r=rt(o), fol=followed(h), nu=o.t>sn;
      html+='<div class="nwi'+(nu?" nu":"")+'"><div class="nwh"><span class="a"'+(h?' data-fh="'+esc(h.key)+'" role="button" tabindex="0"':'')+'>'+esc(o.hosp)+'</span><span class="st '+r[1]+'">'+esc(r[0])+'</span></div>'+
        '<div class="nwb">'+esc(o.prov)+' · '+esc(SRC[o.src]||o.src)+(o.tbmt?' · '+esc(o.tbmt):'')+(o.mon?' · T'+esc(o.mon):'')+(o.prev?' · trước: '+esc(o.prev==="Pending"?"đang dự thầu":o.prev):'')+(fol?' · <b class="fol">Đang theo dõi</b>':'')+'</div>'+
        (o.sum?'<div class="nwb mut">'+esc(o.sum)+'</div>':'')+'</div>';
    });
    if(Lf.length>80) html+='<div class="cap">… và '+(Lf.length-80)+' gói khác.</div>';
    /* ③ Sales vừa cập nhật (7 ngày) */
    var F7=FU.feed(7);
    if(F7.length) html+=sec("nw-feed","Sales vừa cập nhật · 7 ngày",F7.length+" lần",'<div class="feed">'+F7.slice(0,15).map(function(o){ var r=o[0], c=o[1];
      return '<div class="it" data-fh="'+esc(hospOf(c.f).key)+'" role="button" tabindex="0"><span class="a">'+esc(c.f.name)+'</span><span><span class="sgt s'+r.stage+'">'+esc(FU.ST[r.stage]||"")+'</span></span><span class="b">'+esc(String(r.at).slice(8,10)+"/"+String(r.at).slice(5,7)+" "+String(r.at).slice(11,16))+' · '+esc(r.pic)+(r.note?' — '+esc(r.note.length>90?r.note.slice(0,88)+"…":r.note):'')+'</span></div>'; }).join("")+'</div>', false);
    SB.innerHTML=html;
  }
  document.addEventListener("click",function(e){
    var x=e.target.closest("#sh-t [data-nx]"); if(x){ close(); return; }
    var f=e.target.closest("#sb [data-nf]"); if(f && S.on){ S.f=f.dataset.nf; renderSide(); }
  });
  var bt=document.getElementById("news"); if(bt) bt.addEventListener("click",function(){ if(S.on) close(); else open(); });
  setInterval(function(){ if(FU.auth() && document.visibilityState==="visible") load(); }, 10*60000);
  return { load:load, open:open, close:close, badge:badge, side:side, on:function(){ return S.on; }, _S:S };
})();

/* ═════════ ĐỘ PHỦ (người dùng 11/11/2026) — biểu đồ tròn trong thẻ trên bản đồ, đổi theo tab ═════════
   Kết quả thầu: NPP theo địa bàn (Hùng Vĩ = địa bàn Viet Ha, iCare = địa bàn Khang; chọn PIC ⇒ 1 NPP)
     · Tỉnh  = tỉnh có ≥ 1 kết quả trúng của NPP (file NPP, trong kỳ) ÷ tỉnh NPP phụ trách
     · Bệnh viện = bệnh viện NPP trúng (file NPP, trong kỳ) ÷ bệnh viện có kết quả trúng ở KQTT toàn quốc (mọi năm, trong địa bàn; cộng bệnh viện NPP trúng mà KQTT chưa có)
   Theo dõi thầu: bệnh viện / tỉnh có gói theo dõi hoặc kế hoạch FY68 có giai đoạn ÷ bệnh viện có kết quả trúng (thị trường) / tỉnh trong địa bàn; tab Tư nhân ÷ khách tư nhân trong customer list
   Hoạt động: khách hàng đã chăm sóc trong kỳ (customer visiting, theo loại lượt đang chọn) ÷ khách trong customer list (1. CUSTOMER CODE) của PIC — công lập + tư nhân, bỏ NPP */
var COV=(function(){
  var NPPN={HUNGVI:"Hùng Vĩ", ICARE:"iCare"};
  function n(o){ return Object.keys(o).length; }
  function inT(t, ni, oi){ if(ni==null || ni<0) return false; var v=t.ni[ni]; return !!v && (v===1 || !oi || !!v[oi]); }
  function win(){
    var pic=SCOPE.pic(), L=[];
    if(!pic || pic===TERR[0].pic) L.push({npp:"HUNGVI", t:TERR[0]});
    if(!pic || pic===TERR[1].pic) L.push({npp:"ICARE", t:TERR[1]});
    var pT={}, pW={}, hM={}, hW={};
    L.forEach(function(x){ Object.keys(x.t.ni).forEach(function(i){ if(sel<0 || +i===sel) pT[i]=1; }); });
    PKGS.forEach(function(p){
      if(p.res!=="Win" || !p.h || (sel>=0 && p.ni!==sel)) return;
      L.forEach(function(x){ if(!inT(x.t, p.ni, p.oi)) return;
        if(p.npp==="KQTT") hM[p.h.key]=1;
        else if(p.npp===x.npp){ hM[p.h.key]=1; if(inPeriod(p)){ hW[p.h.key]=1; pW[p.ni]=1; } } });
    });
    var per=periodLabel(), who=L.map(function(x){ return NPPN[x.npp]; }).join(" + ");
    var it=[]; if(sel<0) it.push({a:n(pW), b:n(pT), l:"tỉnh có kết quả", t:"Tỉnh có ≥ 1 kết quả trúng của "+who+" trong kỳ ÷ tỉnh NPP phụ trách"});
    it.push({a:n(hW), b:n(hM), l:"bệnh viện trúng", t:"Bệnh viện "+who+" trúng trong kỳ ÷ bệnh viện có kết quả trúng ở KQTT toàn quốc (mọi năm) trong địa bàn"});
    return { short:"Độ phủ trúng", h:"Độ phủ trúng thầu", sub:who+" · "+per, it:it };
  }
  function fu(){
    var d=FU.covData(); if(!d) return null;
    var it=[]; if(d.pv) it.push({a:d.h[0], b:d.h[1], l:"khách tư nhân", t:"Cơ sở tư nhân có cơ hội mua sắm đang theo dõi ÷ khách tư nhân trong customer list"});
    else { it.push({a:d.h[0], b:d.h[1], l:"bệnh viện theo dõi", t:"Bệnh viện có gói theo dõi / kế hoạch FY"+FY_NOW+" có giai đoạn ÷ bệnh viện có kết quả trúng (thị trường) trong địa bàn"});
      if(sel<0) it.push({a:d.p[0], b:d.p[1], l:"tỉnh theo dõi", t:"Tỉnh có gói theo dõi ÷ tỉnh trong địa bàn"}); }
    return { short:"Độ phủ theo dõi", h:"Độ phủ theo dõi"+(d.pv?" · tư nhân":""), sub:(SCOPE.pic()?"Địa bàn "+SCOPE.pic():"Cả nhóm")+" · "+periodLabel(), it:it };
  }
  function act(){
    var d=ACT.cov2(); if(!d) return null;
    return { short:"Độ phủ chăm sóc", h:"Độ phủ chăm sóc khách hàng", sub:d.who+" · "+d.per,
      it:[{a:d.pub[0], b:d.pub[1], l:"công lập", t:"Khách công lập đã chăm sóc trong kỳ ÷ khách công lập trong customer list"}, {a:d.pv[0], b:d.pv[1], l:"tư nhân", t:"Khách tư nhân đã chăm sóc trong kỳ ÷ khách tư nhân trong customer list"}],
      tot:d.all };
  }
  function get(){
    var o = F.view==="act" ? act() : F.view==="fu" ? fu() : (PKGS.length ? win() : null); if(!o) return null;
    var a=0, b=0; (o.tot ? [ {a:o.tot[0], b:o.tot[1]} ] : o.it.slice(0,1)).forEach(function(x){ a+=x.a; b+=x.b; });
    o.main = b ? a/b : 0; return o;
  }
  function donut(v){
    v=Math.max(0, Math.min(1, v||0)); var c=2*Math.PI*17, col = v>=0.7 ? "#1E7B4F" : v>=0.4 ? "#3A5CAA" : v>=0.2 ? "#C77700" : "#B42318";
    return '<svg class="dn" viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><circle cx="22" cy="22" r="17" fill="none" stroke="#E6EAEF" stroke-width="6"/>'+
      (v>0 ? '<circle cx="22" cy="22" r="17" fill="none" stroke="'+col+'" stroke-width="6" stroke-linecap="'+(v<1?"round":"butt")+'" stroke-dasharray="'+(c*v).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 22 22)"/>' : '')+
      '<text x="22" y="25.5" text-anchor="middle">'+Math.round(v*100)+'%</text></svg>';
  }
  function html(o){
    return '<div class="cov"><div class="fah"><b>'+esc(o.h)+'</b></div><div class="cvs">'+esc(o.sub)+(o.tot?' · tổng <b>'+o.tot[0]+'/'+o.tot[1]+'</b> khách':'')+'</div><div class="cvr">'+o.it.map(function(x){
      return '<div class="cvi" title="'+esc(x.t)+'">'+donut(x.b ? x.a/x.b : 0)+'<div><b>'+nfmt(x.a)+'<span>/'+nfmt(x.b)+'</span></b><span>'+esc(x.l)+'</span></div></div>'; }).join("")+'</div></div>';
  }
  return { get:get, html:html, donut:donut };
})();

/* ═════════ ĐỌC DỮ LIỆU ═════════ */
function jsonp(url, ms){
  return new Promise(function(res, rej){
    var cb="__wm"+Math.random().toString(36).slice(2), s=document.createElement("script"), done=false;
    var to=setTimeout(function(){ fin(); rej(new Error("hết giờ")); }, ms||30000);
    function fin(){ done=true; clearTimeout(to); try{ delete window[cb]; }catch(_){ window[cb]=undefined; } s.remove(); }
    window[cb]=function(d){ if(done) return; fin(); res(d); };
    s.onerror=function(){ if(done) return; fin(); rej(new Error("không tải được")); };
    s.src=url+(url.indexOf("?")<0?"?":"&")+"callback="+cb; document.head.appendChild(s);
  });
}
function getJSON(url){
  var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function(){ if(ctl) ctl.abort(); }, 30000);
  return fetch(url,{redirect:"follow", credentials:"omit", signal: ctl? ctl.signal : undefined}).then(function(r){ clearTimeout(to); if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
    .catch(function(){ clearTimeout(to); return jsonp(url, 30000); });
}
function loadOne(k){
  if(k==="KQTT") return getJSON(NPP.KQTT.url+"?action=kqttMap&from=202209").then(function(d){
    if(d && d.ok && Array.isArray(d.cols) && Array.isArray(d.rows)) return { rows:{cols:d.cols, rows:d.rows}, meta:{exported:d.exported, sheet:d.sheet, n:d.n} };
    throw new Error((d&&d.error)||"máy chủ chưa có bản đọc KQTT");
  });
  return getJSON(NPP[k].url+"?action=winMap&from=202209").then(function(d){
    if(d && d.ok && d.v && Array.isArray(d.rows)) return { rows:d.rows, meta:{exported:d.exported, sheet:d.sheet} };
    // máy chủ chưa có action=winMap ⇒ trả feed mặc định (chỉ dao)
    if(d && Array.isArray(d.rows)) return { rows:d.rows, meta:{exported:(d.meta&&d.meta.exported)||"", lite:true} };
    throw new Error((d&&d.error)||"dữ liệu lạ");
  });
}
function load(force){
  var ld=document.getElementById("load"); if(!PKGS.length){ ld.style.display=""; ld.textContent="Đang đọc dữ liệu 2 NPP và KQTT toàn quốc…"; }
  var errs=[];
  if(force && F.view==="fu") FU.load();
  return Promise.all(SRCS.map(function(k){
    return loadOne(k).then(function(r){ RAW[k]=r.rows; META[k]=r.meta; }).catch(function(e){ errs.push(NPP[k].name+" ("+e.message+")"); });
  })).then(function(){
    META.cached=null;
    LOADERR = errs.length ? "Không đọc được: "+errs.join(", ")+"." : "";
    if(errs.length<SRCS.length) IDB.set(LS_KEY, {at:new Date().toLocaleString("vi-VN"), RAW:RAW, META:{HUNGVI:META.HUNGVI,ICARE:META.ICARE,KQTT:META.KQTT}});
    NETDONE=true; ld.style.display="none";
    rebuild();
  });
}
function rebuild(){
  buildPackages(); FU.inval();
  if(ACT.loaded()) ACT.build();
  if(selH){ var k=selH.key; selH=HK[k] || (/^F\|/.test(k) && FID[k.slice(2)] ? hospOf(FID[k.slice(2)]) : null); }
  refresh();
}
function refresh(){ var tp=document.getElementById("tip"); if(tp){ tp.style.opacity=0; tp._k=null; } computeStats(); paintMap(); renderSide(); if(typeof FA!=="undefined") FA.box(); FU.bar(); }

/* ═════════ THANH TRÊN · BỘ LỌC · ĐIỆN THOẠI ═════════
   Máy tính: chế độ · kỳ · Giá trị/SL ở thanh trên, nguồn / hãng / loại / gói / tô màu trong "Bộ lọc" (bảng thả xuống), bộ lọc đang bật = nhãn có ×.
   Điện thoại (≤ 820px): thanh trên chỉ còn logo · ô tìm · Bộ lọc; chế độ, kỳ, chỉ số, tiện ích chuyển vào bảng Bộ lọc (trượt từ dưới). */
function placeCtl(){
  var mob=MQ.matches, top=document.getElementById("top"), c=document.getElementById("hctl"), tl=document.getElementById("tools"), slot=document.getElementById("fslot");
  document.documentElement.classList.toggle("mob", mob);
  if(mob){ if(c.parentNode!==slot){ slot.appendChild(c); slot.appendChild(tl); } }
  else if(c.parentNode!==top){ top.insertBefore(c, document.getElementById("f-more")); top.insertBefore(tl, document.getElementById("fchips")); }
  var nb=document.getElementById("news");                                  /* chuông Mới cập nhật luôn ở thanh trên (điện thoại không giấu vào bảng Bộ lọc) */
  if(nb){ if(mob){ if(nb.parentNode!==top) top.insertBefore(nb, document.getElementById("f-more")); } else if(nb.parentNode!==tl) tl.insertBefore(nb, document.getElementById("reload")); }
  document.getElementById("fdrw-t").textContent = mob ? "Chế độ xem · bộ lọc" : "Bộ lọc";
  fchips(); hdrH(); SHEET.apply();
}
var FD=(function(){
  var D=document.getElementById("fdrw"), B=D.querySelector(".fbox"), btn=document.getElementById("f-more");
  function place(){ if(MQ.matches){ B.style.left=""; B.style.top=""; return; } var r=btn.getBoundingClientRect(), w=B.offsetWidth||390; B.style.top=(r.bottom+8)+"px"; B.style.left=Math.max(12, Math.min(window.innerWidth-w-12, r.right-w))+"px"; }
  function open(){ D.hidden=false; place(); btn.setAttribute("aria-expanded","true"); var f=B.querySelector(".seg button.on, select, button"); if(f) f.focus(); }
  function close(){ if(D.hidden) return; D.hidden=true; btn.setAttribute("aria-expanded","false"); }
  btn.addEventListener("click",function(){ if(D.hidden) open(); else close(); });
  D.addEventListener("click",function(e){ if(e.target===D) close(); });
  document.getElementById("fdrw-x").onclick=close; document.getElementById("fdrw-ok").onclick=close;
  document.getElementById("f-reset").onclick=function(){ resetF("*"); renderFilters(); refresh(); };
  window.addEventListener("keydown",function(e){ if(e.key==="Escape" && !D.hidden){ close(); btn.focus(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener("resize",function(){ if(!D.hidden) place(); });
  return { open:open, close:close };
})();
document.getElementById("fchips").addEventListener("click",function(e){
  if(e.target.closest("[data-fopen]")){ FD.open(); return; }
  var x=e.target.closest("[data-fx]"); if(!x) return; resetF(x.dataset.fx); renderFilters(); refresh();
});
document.getElementById("oldtog").addEventListener("change",function(e){ G.old.classList.toggle("off", !e.target.checked); try{ localStorage.setItem(LS_KEY+"_old", e.target.checked?"1":"0"); }catch(_){} });
if(MQ.addEventListener) MQ.addEventListener("change", placeCtl); else if(MQ.addListener) MQ.addListener(placeCtl);
if(window.ResizeObserver) new ResizeObserver(hdrH).observe(document.getElementById("top"));

/* ═════════ BẢN ĐỒ HOẠT ĐỘNG SALES (chế độ "Hoạt động") — CRM Surgical ▸ fuVisits / fuVisitLog / fuLocSave ═════════
   Customer visiting của nhóm Surgical (Viet Ha, Khang…) theo kỳ / quý / tháng. Mọi phiên email công ty xem được dữ liệu cả nhóm.
   Định vị địa bàn (1. CUSTOMER CODE): vị trí đã ghim (sheet TENDER MAP · VỊ TRÍ ĐỊA BÀN) ⇒ cơ sở trùng tên trong danh mục (csyt.js, toạ độ OSM)
   ⇒ cụm GPS ảnh viếng thăm (≥ 50% điểm trong 1,5 km) ⇒ cơ sở gần trùng tên ⇒ phường / quận trong địa chỉ ⇒ tâm tỉnh. Sai ⇒ "Ghim trên bản đồ" / "Gắn cơ sở". */
var ACT=(function(){
  var GREY="#A3AFBF";
  var SRC={ ghim:"đã ghim trên bản đồ", danhmuc:"cơ sở trong danh mục (toạ độ OpenStreetMap)", gps:"GPS ảnh viếng thăm", diachi:"phường / quận trong địa chỉ", tinh:"tâm tỉnh (chưa rõ vị trí)" };
  var S={ loaded:false, loading:false, err:"", d:null, pic:"all", per:"", type:"visit", st:"done", q:"", logs:{}, logBusy:{}, logAt:{}, pick:null, at:"", open:"", cov:"" };
  var A=[], R=[], BYF={};
  try{ S.per=""; S.type=localStorage.getItem("tm_act_type")||"visit"; S.st=localStorage.getItem("tm_act_st")||"done"; S.cov=localStorage.getItem("tm_act_cov")||""; }catch(_){}
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(_){} }
  function auth(){ return FU.auth(); }
  function load(){
    var t=FU.tk(); if(!t || S.loading) return;
    S.loading=true; S.err="";
    getJSON(CRM_SURG+"?action=fuVisits&from=2025-09-01&tk="+encodeURIComponent(t)).then(function(d){
      S.loading=false;
      if(d && d.ok){ S.d=d; S.loaded=true; S.cached=false; S.at=new Date().toLocaleString("vi-VN"); build(); FU.inval(); IDB.set("act", {at:S.at, d:d});
        if(F.view!=="act" && !(document.activeElement && SB.contains(document.activeElement))) refresh(); }
      else if(d && d.code==="AUTH") S.err=d.error||"Cần đăng nhập email công ty.";
      else S.err=(d&&d.error)||"Không đọc được dữ liệu hoạt động từ CRM Surgical.";
      if(F.view==="act"){ renderFilters(); refresh(); if(S.open){ var h=HK["A|"+S.open]; S.open=""; if(h) selectHosp(h); } }
    },function(e){ S.loading=false; S.err="Không kết nối được CRM Surgical ("+e.message+")."; if(F.view==="act") refresh(); });
  }
  function ensure(){ if(auth() && (!S.loaded || S.cached) && !S.loading) load(); }
  function picCol(n){ for(var t=0;t<TERR.length;t++) if(TERR[t].pic===n) return TERR[t].col; return GREY; }
  /* Hoạt động chỉ tính 2 PIC Sales phụ trách địa bàn (Viet Ha, Khang) — người dùng chốt 05/11/2026: bỏ lượt của quản lý / Admin / tài khoản TEST */
  function PICS(){ return TERR.map(function(t){ return t.pic; }); }
  function isSales(n){ return PICS().indexOf(n)>=0; }
  var TESTP=/^test\b/i;
  CACHE_ACT.then(function(c){ if(c && c.d && !S.loaded && auth()){ S.d=c.d; S.loaded=true; S.cached=true; S.at=c.at; build(); FU.inval(); refresh(); } });
  function isVisit(act){ return /^visit/i.test(act||""); }
  /* tên chuẩn: người dùng sửa (sheet) / bảng VM_STD ⇒ chuẩn hoá tự động (mở viết tắt, viết hoa đầu từ) */
  var ABBR=[[/^bvđk\s*/i,"Bệnh viện Đa khoa "],[/^bvdk\s*/i,"Bệnh viện Đa khoa "],[/^bvm\s+/i,"Bệnh viện Mắt "],[/^bv\.?\s*/i,"Bệnh viện "],[/^pkđk\s*/i,"Phòng khám Đa khoa "],[/^pkdk\s*/i,"Phòng khám Đa khoa "],
    [/^pkm\s+/i,"Phòng khám Mắt "],[/^pk\.?\s*/i,"Phòng khám "],[/^ttyt\s*/i,"Trung tâm Y tế "],[/^tt\.?\s+/i,"Trung tâm "]];
  function autoName(n){
    n=String(n||"").replace(/\s+/g," ").trim(); if(!n) return n;
    /* viết hoa đầu từ TRƯỚC (tên gõ toàn chữ hoa / thường), rồi mới mở viết tắt ⇒ "PK MẮT SÀI GÒN" thành "Phòng khám Mắt Sài Gòn" */
    if(n===n.toUpperCase() || n===n.toLowerCase()) n=n.toLowerCase().replace(/(^|[\s(\-\/])(\S)/g,function(m,a,b){ return a+b.toUpperCase(); });
    ABBR.forEach(function(x){ n=n.replace(x[0], x[1]); });
    n=n.replace(/\b(đk|dk)\b/gi,"Đa khoa").replace(/\btw\b/gi,"Trung ương").replace(/\btp\.?\s*hcm\b/gi,"TP. Hồ Chí Minh").replace(/\bhcm\b/gi,"Hồ Chí Minh");
    return n.replace(/^(\S)/,function(m){ return m.toUpperCase(); });
  }
  function nameOf(a){ return a.std || autoName(a.name); }
  /* công lập hay tư nhân: đã khớp cơ sở trong danh mục công lập ⇒ công lập; tên kiểu cơ quan nhà nước ⇒ công lập; còn lại ⇒ tư nhân */
  var PUB=/^(bệnh viện|trung tâm y tế|ttyt|bv)\b.*\b(tỉnh|trung ương|tw|thành phố|tp\.?|quận|huyện|thị xã|khu vực|quân y|quân đội|công an|bộ quốc phòng|đại học y|nhân dân)\b|\b(108|175|103|bạch mai|chợ rẫy|việt đức|hữu nghị|thống nhất|nhân dân gia định|nhân dân 115|đà nẵng|huế)\b|sở y tế|trung tâm y tế/i;
  var NOTFAC=/distributor|dealer|npp|đại lý|công ty|cty|bqp/i;
  function isDone(st){ return /^complete/i.test(st||""); }

  /* ── định vị 1 địa bàn ── */
  function locate(a){
    var pv=provOf(a.prov, a.addr); a.ni=pv?pv.n:null; a.oi=pv?pv.o:"";
    a.f=null; a.ll=null; a.src="tinh";
    if(a.ni==null) return;
    var L=a.loc, f=null, ll=null, src="";
    if(L && L[2] && FID[L[2]]){ f=FID[L[2]]; how="ghim"; }
    /* chỉ ghép vào cơ sở cùng loại công lập / tư nhân với bảng tên chuẩn (VM_STD): khách tư nhân "Mắt Thanh Bình" không được ghép vào "Mắt tỉnh Ninh Bình" */
    var own=function(x){ return x.src!=="crm"; }, same=function(x){ return !a.kind || a.kind==="npp" || (a.kind==="tn")===!!x.pv0; }, how="";
    if(L && L[0] && L[1]){ ll=[+L[1], +L[0]]; src="ghim"; }
    else if(f && f.ll){ ll=f.ll; src="danhmuc"; }
    var NM=[a.disp, a.name].filter(function(x,i,arr){ return x && arr.indexOf(x)===i; });
    if(!f) NM.some(function(nm){ var k=fkey(nm), P=FBYP[a.ni]||[], fx=P.filter(function(x){ return own(x) && fkey(x.name)===k; })[0], h2="ten";
      if(!fx){ fx=P.filter(function(x){ return own(x) && same(x) && x.alias.some(function(al){ return fkey(al)===k; }); })[0]; h2="tenphu"; }
      if(fx){ f=fx; how=h2; if(!ll && fx.ll){ ll=fx.ll; src="danhmuc"; } } return !!fx; });
    if(!ll && a.gps && a.gps[3]>=1 && a.gps[3]/a.gps[2]>=0.5){ ll=[a.gps[1], a.gps[0]]; src="gps"; }
    if(!f) NM.some(function(nm){ var fz=(FBYP[a.ni]||[]).filter(function(x){ return own(x) && same(x) && sameName(x.name, nm); })[0]; if(fz){ f=fz; how="gan"; if(!ll && fz.ll){ ll=fz.ll; src="danhmuc"; } } return !!fz; });
    if(!ll && a.addr){ var an=anchorOf({name:a.name, address:a.addr, ni:a.ni, oi:a.oi}); if(an.ll){ ll=an.ll; src="diachi"; if(an.o) a.oi=an.o; } }
    if(!ll && a.gps){ ll=[a.gps[1], a.gps[0]]; src="gps"; }
    a.f=f; a.fhow=how; a.ll=ll; a.src=src||"tinh";
    a.xy = ll ? [px(ll[0]), py(ll[1])] : (PROV[a.ni] && PROV[a.ni].info.c ? PROV[a.ni].info.c.slice() : [500,500]);
  }
  function build(){
    var d=S.d; if(!d) return;
    var ix={}; d.accCols.forEach(function(c,i){ ix[c]=i; });
    var ci={}; d.cols.forEach(function(c,i){ ci[c]=i; });
    A=[]; BYF={}; var spots={};
    /* dựng lại: bỏ cơ sở tư nhân đã thêm từ lần trước (danh mục buildFac giữ nguyên) */
    FAC=FAC.filter(function(f){ if(f.src==="crm"){ delete FID[f.id]; return false; } return true; });
    FAC.forEach(function(f){ if(f.pv0!=null) f.pv=f.pv0; });     /* loại gốc của danh mục, trước khi bảng tên chuẩn ghi đè */
    Object.keys(FBYP).forEach(function(k){ FBYP[k]=FBYP[k].filter(function(f){ return f.src!=="crm"; }); });
    d.acc.forEach(function(r,i){
      var a={ i:i, code:r[ix.code]||"", name:r[ix.name]||"", type:r[ix.type]||"", prov:r[ix.province]||"", area:r[ix.area]||"", pic:r[ix.pic]||"", addr:r[ix.address]||"", gps:r[ix.gps]||null, loc:r[ix.loc]||null, std:(ix.std!=null&&r[ix.std])||"", kind:(ix.kind!=null&&r[ix.kind])||"", last:"", lastAll:"",
        lv:((ix.last!=null&&r[ix.last])||[]).filter(function(v){ return !TESTP.test(v[1]||"") && isSales(v[1]); }), ph:(ix.ph!=null&&r[ix.ph])||null };      /* v1.1: ≤ 3 lượt gần nhất + ảnh gần nhất (hiện ngay, không chờ fuVisitLog) */
      a.disp=nameOf(a); locate(a); A.push(a);
      if(TESTP.test(a.pic) || TESTP.test(a.name)){ a.ni=null; return; }
      /* cơ sở tư nhân từ CRM (chưa có trong danh mục công lập) ⇒ thêm vào danh mục: tìm được ở ô tìm, theo dõi mua sắm (Giới thiệu → Demo → Đề xuất → Ký HĐ → Sử dụng hàng) */
      /* công lập / tư nhân: theo bảng tên chuẩn của backend (VM_STD: cl · tn · npp); khách mới chưa có trong bảng ⇒ đoán theo danh mục / tên */
      a.pub = a.kind ? a.kind==="cl" : (a.f && a.f.src!=="crm") ? !a.f.pv : PUB.test(a.disp);
      /* bảng tên chuẩn CRM (VM_STD, đã soát tay) ưu tiên hơn cột own của danh mục: khách tư nhân ⇒ cơ sở khớp là tư nhân, khách công lập ⇒ công lập */
      /* chỉ khi khớp ĐÚNG tên chính / Sales đã ghim (khớp gần đúng không được đổi loại của cơ sở) */
      if(a.f && a.f.src!=="crm" && (a.fhow==="ten" || a.fhow==="ghim") && (a.kind==="tn" || a.kind==="cl")) a.f.pv = a.kind==="tn" ? 1 : 0;
      if(a.code && a.ni!=null && !a.f && a.kind!=="npp" && !NOTFAC.test(a.type+" "+a.disp)){
        a.f=facAdd({ id:"C:"+a.code, name:a.disp, t:a.pub?"bv":"tn", sp:"", lv:a.pub?"":"Tư nhân", ni:a.ni, oi:a.oi, addr:a.addr, ll:a.ll, src:"crm", alias:a.disp!==a.name?[a.name]:[], h:null, acc:a });
      }
      if(a.ni==null) return;
      var key=a.xy[0].toFixed(2)+","+a.xy[1].toFixed(2); (spots[key]=spots[key]||[]).push(a);
      if(a.f) (BYF[a.f.id]=BYF[a.f.id]||[]).push(a);
    });
    Object.keys(spots).forEach(function(k){ var L=spots[k]; if(L.length<2) return; var c=L[0].xy.slice(); L.forEach(function(a,j){ var r=1.1*Math.sqrt(j+0.6), t=j*2.39996; a.xy=[c[0]+r*Math.cos(t), c[1]+r*Math.sin(t)]; }); });
    A.forEach(function(a){ if(a.ni==null) return; a.h={ key:"A|"+(a.code||("x"+a.i)), name:a.disp, ni:a.ni, oi:a.oi, xy:a.xy, address:a.addr, pk:[], npps:{}, acc:a, f:a.f }; HK[a.h.key]=a.h; });
    R=d.rows.filter(function(r){ return isSales(d.pics[r[ci.pic]]); }).map(function(r){ var a=A[r[ci.acc]], o={ d:r[ci.d], k:monKey(r[ci.d]), pic:d.pics[r[ci.pic]]||"—", a:a, act:d.acts[r[ci.act]]||"", st:d.sts[r[ci.st]]||"", photo:!!r[ci.photo], gps:r[ci.lat]!=="" && r[ci.lat]!=null, task:(d.tasks||[])[r[ci.task]]||"" };
      o.visit=isVisit(o.act); o.done=isDone(o.st);
      if(a && o.visit && o.done && o.d<=NOW && o.d>a.last) a.last=o.d;
      if(a && o.d<=NOW && o.d>a.lastAll) a.lastAll=o.d;
      return o; });
    if(!S.per) S.per="m"+NOWK;
  }

  /* ── kỳ (người dùng 09/11/2026): tuần · tháng · quý · FY · khoảng ngày tuỳ chọn ──
     S.per = "fy68" · "q68-1" · "m202611" · "w2026-11-09" (thứ Hai) · "c2026-10-01~2026-11-09"; lọc theo NGÀY của lượt (r.d) */
  function p2(n){ return (n<10?"0":"")+n; }
  function isoD(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
  function kS(k){ return Math.floor(k/100)+"-"+p2(k%100)+"-01"; }
  function kE(k){ return isoD(new Date(Math.floor(k/100), k%100, 0)); }
  function addD(s0,n){ var d=new Date(s0+"T00:00:00"); d.setDate(d.getDate()+n); return isoD(d); }
  function monOf(s0){ var d=new Date(s0+"T00:00:00"); return addD(s0, -((d.getDay()+6)%7)); }
  function dm(s0){ return s0.slice(8,10)+"/"+s0.slice(5,7); }
  function dmy(s0){ return dm(s0)+"/"+s0.slice(0,4); }
  var D0=kS(fyStartK(FY_FROM));
  function span(p){ return PERX.span(p||S.per||("m"+NOWK)); }
  function range(){ var s0=span(); return [monKey(s0[0]), monKey(s0[1])]; }
  /* kỳ liền trước / sau cùng loại (nút ‹ ›); không đi quá FY đầu, không quá kỳ hiện tại (tuần: cho xem tuần sau ⇒ kế hoạch) */
  function perMv(p, dir){ return PERX.mv(p, dir); }
  function perLabel(short){ return PERX.label(S.per||("m"+NOWK), short); }
  function setPer(p){ if(!p) return; S.per=p; }
  function cp(){ return SCOPE.pic()||"all"; }
  function picLabel(){ return cp()==="all" ? "cả nhóm" : cp(); }
  function typeLabel(){ return S.type==="visit" ? "viếng thăm" : "mọi việc khách hàng"; }
  function rowsF(noPer){
    var sp=span();
    return R.filter(function(r){
      if(!noPer && (r.d<sp[0] || r.d>sp[1])) return false;
      if(cp()!=="all" && r.pic!==cp()) return false;
      if(S.type==="visit" && !r.visit) return false;
      if(S.st==="done" && !r.done) return false;
      return !!r.a && (F.own==="all" || ownOk(!r.a.pub));
    });
  }

  /* ── thanh trên (chỉ hiện ở chế độ Hoạt động): [‹ kỳ ▾ ›] + [loại lượt ▾] — mỗi nút mở 1 bảng chọn nhỏ ── */
  function typePop(){
    return '<div class="ptl">Loại lượt</div><div class="seg">'+[["visit","Viếng thăm"],["all","Mọi việc khách hàng"]].map(function(x){ return '<button type="button" data-t="'+x[0]+'" class="'+(S.type===x[0]?"on":"")+'">'+x[1]+'</button>'; }).join("")+'</div>'+
      '<div class="ptl">Trạng thái</div><div class="seg">'+[["done","Đã thực hiện"],["all","Cả kế hoạch"]].map(function(x){ return '<button type="button" data-s="'+x[0]+'" class="'+(S.st===x[0]?"on":"")+'">'+x[1]+'</button>'; }).join("")+'</div>';
  }
  var CHEV='<svg class="cv" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function popOpen(box, html){ var pop=box.querySelector(".pop"), b=box.querySelector(".pb"), was=!pop.hidden;
    document.querySelectorAll(".pick .pop").forEach(function(x){ x.hidden=true; var bb=x.parentNode.querySelector(".pb"); if(bb) bb.setAttribute("aria-expanded","false"); });
    if(was && html==null) return; pop.innerHTML=html||pop.innerHTML; pop.hidden=false; b.setAttribute("aria-expanded","true");
    pop.style.left=""; if(getComputedStyle(pop).position==="absolute"){ var rr=pop.getBoundingClientRect(), ov=rr.right-(window.innerWidth-8); if(ov>0) pop.style.left=(-ov)+"px"; } }
  function popClose(){ document.querySelectorAll(".pick .pop").forEach(function(x){ x.hidden=true; }); document.querySelectorAll(".pick .pb").forEach(function(x){ x.setAttribute("aria-expanded","false"); }); S.ptab=""; }
  document.addEventListener("click",function(e){ if(!e.target.closest(".pick")) popClose(); });
  document.addEventListener("keydown",function(e){ if(e.key==="Escape" && document.querySelector(".pick .pop:not([hidden])")) popClose(); });
  function filters(){
    var on=F.view==="act";
    var te0=document.getElementById("va-type"); if(te0) te0.hidden=!on;
    if(!on){ popClose(); return; }
    if(!S.per) S.per="m"+NOWK;
    var pe=document.getElementById("va-per"), te=document.getElementById("va-type"); pe.hidden=false;
    PERX.render(pe, { get:function(){ return S.per; }, set:function(p){ setPer(p); renderFilters(); refresh(); }, kinds:["w","m","q","fy","c"], min:FY_FROM, title:"Chọn kỳ: tuần · tháng · quý · kỳ (FY) · khoảng ngày — mặc định tháng hiện tại" });
    te.innerHTML='<button type="button" class="pb" aria-haspopup="dialog" aria-expanded="false" title="Loại lượt / trạng thái">'+(S.type==="visit"?"Viếng thăm":"Mọi việc")+' · '+(S.st==="done"?"đã làm":"cả kế hoạch")+CHEV+'</button><div class="pop ptype" hidden role="dialog" aria-label="Loại lượt"></div>';
    te.onclick=function(e){
      var b=e.target.closest("button"); if(!b) return; e.stopPropagation();
      if(b.classList.contains("pb")){ popOpen(te, typePop()); return; }
      if(b.dataset.t){ S.type=b.dataset.t; lsSet("tm_act_type",S.type); }
      else if(b.dataset.s){ S.st=b.dataset.s; lsSet("tm_act_st",S.st); } else return;
      renderFilters(); refresh(); popOpen(te, typePop());
    };
  }
  function sum(){ return [perLabel(), picLabel(), typeLabel()]; }
  /* độ phủ chăm sóc (COV): khách trong customer list (bỏ NPP, theo PIC / tỉnh đang xem) có ≥ 1 lượt trong kỳ (loại lượt đang chọn) */
  function cov2(){
    if(!S.loaded || !auth()) return null;
    var met={}; rowsF().forEach(function(r){ if(r.a && (sel<0 || r.a.ni===sel)) met[r.a.i]=1; });
    var o={ all:[0,0], pub:[0,0], pv:[0,0], per:perLabel(true), who:(cp()==="all"?"Cả nhóm":cp())+" · lượt "+typeLabel() };
    A.forEach(function(a){
      if(!a.code || a.ni==null || a.kind==="npp" || (cp()!=="all" && a.pic!==cp()) || !ownOk(!a.pub) || (sel>=0 && a.ni!==sel)) return;
      var k=a.pub?"pub":"pv", m=met[a.i]?1:0; o.all[1]++; o[k][1]++; o.all[0]+=m; o[k][0]+=m;
    });
    return o;
  }
  function privN(){ return A.filter(function(a){ return a.code && a.ni!=null && a.kind!=="npp" && !a.pub && (cp()==="all" || a.pic===cp()) && (sel<0 || a.ni===sel); }).length; }

  /* ── thống kê cho bản đồ ── */
  function hs(a){ return HS[a.h.key]||(HS[a.h.key]={h:a.h, n:0, v:0, val:0, qty:0, q:{}, gv:{}, last:null, act:0, soon:0, list:[], fu:[], top:0, pc:{}, lastD:""}); }
  function stats(){
    STAT=NEW.map(function(){ return { n:0, v:0, val:0, qty:0, by:{}, byN:{}, hosp:{}, soon:0, list:[], q:{}, gv:{}, sh:{m:0,t:0}, stg:0, ns:{}, warn:0, pc:{}, acc:0, ct:0, cv:0 }; });
    HS={};
    if(!S.loaded || !auth()) return;
    if(S.cov) return covStats();
    rowsF().forEach(function(r){ var a=r.a; if(a.ni==null || !a.h) return; var s=STAT[a.ni], x=hs(a);
      s.n++; s.v++; s.hosp[a.h.key]=1; s.pc[r.pic]=(s.pc[r.pic]||0)+1; x.n++; x.v++; x.pc[r.pic]=(x.pc[r.pic]||0)+1; if(r.d>x.lastD) x.lastD=r.d; });
    A.forEach(function(a){ if(!a.code || a.ni==null || !a.h || (cp()!=="all" && a.pic!==cp()) || !ownOk(!a.pub)) return; STAT[a.ni].acc++; hs(a); });   /* khách chưa gặp ⇒ chấm xám */
  }
  /* ── ĐỘ PHỦ (người dùng 08/11/2026): Sales đã chăm sóc (lại) các cơ sở MANI từng trúng thầu / có KQTT dao, chỉ khâu chưa ──
     tập cần phủ = cơ sở trong dữ liệu thầu (2 NPP + KQTT, mọi năm) có gói trúng của MANI (S.cov "mani") hoặc của bất kỳ hãng nào ("all"),
     trong địa bàn đang xem; "đã chăm sóc" = có lượt (theo kỳ / loại / trạng thái đang lọc) ở khách CRM gắn với cơ sở đó */
  function covIs(h){
    if(!h || h.ni==null || h.ni<0 || !h.xy || !SCOPE.inProv(h.ni, h.oi) || !ownOk(isPv(h.f))) return false;
    return h.pk.some(function(p){ return p.res==="Win" && p.items.some(function(it){ return it.result==="Win" && (S.cov==="all" || isMani(it)); }); });
  }
  function winOf(h, mani){
    var w=h.pk.filter(function(p){ return p.res==="Win" && p.items.some(function(it){ return it.result==="Win" && (!mani || isMani(it)); }); }).sort(byNewest), q=0;
    w.forEach(function(p){ p.items.forEach(function(it){ if(it.result==="Win" && (!mani || isMani(it))) q+=+it.qty||0; }); });
    return { n:w.length, last:w[0]||null, qty:q };
  }
  function everLast(f){ var d=""; accsOf(f).forEach(function(a){ if(a.last && a.last>d) d=a.last; }); return d; }
  function covStats(){
    var vis={};
    rowsF().forEach(function(r){ var f=r.a.f; if(!f) return; var o=vis[f.id]||(vis[f.id]={n:0,pc:{},last:""}); o.n++; o.pc[r.pic]=(o.pc[r.pic]||0)+1; if(r.d>o.last) o.last=r.d; });
    HOSP.forEach(function(h){ if(!covIs(h)) return;
      var o=h.f && vis[h.f.id], s=STAT[h.ni];
      s.ct++; s.n=s.ct; if(o){ s.cv++; for(var k in o.pc) s.pc[k]=(s.pc[k]||0)+o.pc[k]; }
      HS[h.key]={ h:h, n:o?o.n:0, v:o?o.n:0, pc:o?o.pc:{}, lastD:o?o.last:"", cov:!!o, ever:everLast(h.f), nacc:accsOf(h.f).length, w:winOf(h, S.cov!=="all"), q:{}, gv:{}, list:[], fu:[], top:0 };
    });
  }
  function covCol(t){ var d=t-0.5; return d>=0 ? mix("#1E7B4F", 0.3+1.26*d) : mix("#C2410C", 0.3+1.26*(-d)); }
  var COVRED="#B42318";
  function covWhat(){ return S.cov==="all" ? "cơ sở có KQTT dao / chỉ khâu" : "cơ sở MANI đã trúng thầu"; }
  /* ưu tiên chăm sóc: hợp đồng sắp hết hạn ⇒ đang chạy ⇒ vừa hết hạn; cùng nhóm ⇒ số lượng trúng lớn trước */
  function covRank(x){ var p=x.w.last, st=p?p.status:"", o={warn:0, ok:1, bad:2, na:3}[st]; return o==null?4:o; }
  function covSort(a,b){ return covRank(a)-covRank(b) || (covRank(a)===2 ? String((b.w.last||{}).end||"").localeCompare(String((a.w.last||{}).end||"")) : 0) || b.w.qty-a.w.qty; }
  function contractTxt(p){ if(!p) return ""; return p.end ? (p.status==="bad"?"HĐ hết hạn ":"HĐ đến ")+d2(p.end) : "Trúng "+lastD(p); }
  function tipCov(x){
    var h=x.h, p=x.w.last;
    return '<b>'+esc(h.name)+'</b><br><span class="m">'+esc(NEW[h.ni][0])+' · PIC phụ trách '+esc(SCOPE.ownerOf(h.ni, h.oi)||"—")+'</span><br>'+
      (S.cov==="all"?'Gói trúng (mọi hãng): ':'MANI trúng: ')+'<b>'+x.w.n+'</b> gói · '+nfmt(x.w.qty)+' SP'+(p?'<br><span class="m">'+esc(contractTxt(p))+(S.cov==="all"?' · '+esc(brandTxt([p])||""):'')+'</span>':'')+
      '<br>'+(x.cov ? '<b style="color:#9BE3B9">Đã chăm sóc trong kỳ</b> · '+x.v+' lượt · gần nhất '+d2(x.lastD) : '<b style="color:#FFB4A8">Chưa chăm sóc trong kỳ</b>'+(x.ever?' · lần gặp gần nhất '+d2(x.ever):x.nacc?' · chưa có lượt viếng thăm':' · chưa có trong danh sách khách CRM'))+
      tipFac(h.f)+'<div class="m">Bấm để xem chi tiết</div>';
  }
  function domPic(pc){ var b="", n=-1; for(var k in pc) if(pc[k]>n){ n=pc[k]; b=k; } return b; }
  function col(x){ return x.cov===false ? COVRED : x.v ? picCol(domPic(x.pc)) : GREY; }
  function pcol(s){ return picCol(domPic(s.pc)); }
  function legend(){
    if(S.cov){ var cr='<span class="ramp">'+[0,0.25,0.5,0.75,1].map(function(t){ return '<i style="background:'+covCol(t)+'"></i>'; }).join("")+'</span>';
      return '<div class="row">'+cr+' 0% → 100% '+esc(covWhat())+' được chăm sóc</div><div class="row" style="color:var(--t3)">Số trên tỉnh = đã chăm sóc / tổng · kỳ '+esc(perLabel())+'</div>'+
        '<div class="row"><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="#fff" stroke="'+TERR[0].col+'" stroke-width="3"/></svg> Đã chăm sóc (màu PIC)</div>'+
        '<div class="row"><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="5" fill="#fff" stroke="'+COVRED+'" stroke-width="3"/></svg> Chưa chăm sóc trong kỳ</div>'; }
    var ramp=function(c){ return '<span class="ramp">'+[0.3,0.48,0.66,0.84,0.95].map(function(t){ return '<i style="background:'+mix(c,t)+'"></i>'; }).join("")+'</span>'; };
    var pics=PICS().filter(function(p){ return cp()==="all" || p===cp(); });
    return pics.map(function(p){ return '<div class="row">'+ramp(picCol(p))+' '+esc(p)+'</div>'; }).join("")+
      '<div class="row" style="color:var(--t3)">Đậm hơn = nhiều lượt '+typeLabel()+' hơn · số = số lượt</div>'+
      '<div class="row"><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="4" fill="'+GREY+'" stroke="#fff"/></svg> Khách trong danh sách chưa gặp trong kỳ</div>'+
      '<div class="row"><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="7" fill="none" stroke="#E0A100" stroke-width="2"/></svg> Top 10 khách gặp nhiều nhất</div>';
  }
  function tipP(i){
    var s=STAT[i];
    if(S.cov){ var un=Object.keys(HS).map(function(k){ return HS[k]; }).filter(function(x){ return x.h.ni===i && !x.cov; }).sort(covSort);
      return '<b>'+esc(NEW[i][0])+'</b> <span class="m">· '+REGION[NEW[i][1]]+'</span><br>'+(s.ct ? '<b>'+s.cv+'/'+s.ct+'</b> '+esc(covWhat())+' được chăm sóc ('+Math.round(s.cv/s.ct*100)+'%)'+
        (un.length?'<br><span class="m">Chưa: '+esc(un.slice(0,3).map(function(x){ return x.h.name; }).join(" · "))+(un.length>3?' +'+(un.length-3):'')+'</span>':'') : '<span class="m">Không có '+esc(covWhat())+' trong địa bàn</span>'); }
    var bst=provBest(i), chips=[];
    if(s.n){ chips.push('<b>'+s.n+'</b> lượt '+typeLabel()); chips.push(Object.keys(s.hosp).length+'/'+s.acc+' khách được gặp'); Object.keys(s.pc).forEach(function(p){ chips.push('<i style="background:'+picCol(p)+'"></i>'+esc(p)+' '+s.pc[p]); }); }
    else chips.push('Chưa có lượt '+typeLabel()+' trong kỳ'+(s.acc?' · '+s.acc+' khách':''));
    if(!s.n && !s.acc) return '<b>'+esc(NEW[i][0])+'</b> <span class="m">· '+REGION[NEW[i][1]]+'</span><br><span class="m">Không có khách trong danh sách</span>';
    return '<div class="pvc">'+(bst.p ? pvPhoto(bst.p.p, bst.p.a.disp) : "")+'<div class="pvb"><div class="pvt">'+esc(NEW[i][0])+' <small>· '+REGION[NEW[i][1]]+'</small></div>'+
      '<div class="pvs">'+esc(perLabel())+' · '+esc(picLabel())+'</div><div class="pvk">'+chips.map(function(c){ return '<span>'+c+'</span>'; }).join("")+'</div>'+
      (bst.v ? pvLast(bst.v.v, bst.v.a.disp) : "")+'<div class="pvf">Bấm để xem chi tiết tỉnh</div></div></div>';
  }
  /* ảnh đi địa bàn (Drive, CRM chia sẻ "ai có link") + lần gặp gần nhất — dữ liệu có sẵn trong fuVisits v1.1 */
  function thumb(id, w){ return "https://drive.google.com/thumbnail?id="+encodeURIComponent(id)+"&sz=w"+(w||320); }
  function dview(id){ return "https://drive.google.com/file/d/"+encodeURIComponent(id)+"/view"; }
  function driveId(u){ var m=/[-\w]{25,}/.exec(String(u||"")); return m?m[0]:""; }
  function lastOf(a){ var v=a && a.lv && a.lv[0]; return v ? {d:v[0], pic:v[1], act:v[2], st:v[3], res:v[4], fb:v[5], next:v[6], ids:v[7]||[]} : null; }
  function photoOf(a){ return a && a.ph && a.ph[1] && a.ph[1].length ? {d:a.ph[0], ids:a.ph[1]} : null; }
  function tipVisit(a){
    var p=photoOf(a), v=lastOf(a), o="";
    if(p) o+='<div class="tph"><img src="'+thumb(p.ids[0],400)+'" alt="" referrerpolicy="no-referrer"><span>Ảnh đi địa bàn '+d2(p.d)+(p.ids.length>1?' · '+p.ids.length+' ảnh':'')+'</span></div>';
    if(v) o+='<div class="tlv"><span class="m">Lần gặp gần nhất · '+d2(v.d)+' · '+esc(v.pic)+' · '+esc(v.act)+(v.st?' · '+esc(v.st):'')+'</span>'+(v.res?'<div class="tx">'+esc(v.res)+'</div>':'')+(v.next?'<div class="m tx1">Tiếp theo: '+esc(v.next)+'</div>':'')+'</div>';
    return o;
  }
  /* cơ sở y tế ⇒ khách CRM đã gắn: khách có lượt gần nhất / có ảnh gần nhất */
  function accsOf(f){ return (f && BYF[f.id]) || []; }
  function bestAcc(f, ph){ return accsOf(f).slice().sort(function(x,y){ var a1=ph?((photoOf(x)||{}).d||""):((lastOf(x)||{}).d||""), b1=ph?((photoOf(y)||{}).d||""):((lastOf(y)||{}).d||""); return b1.localeCompare(a1); })[0]||null; }
  function tipFac(f){ if(!S.loaded || !auth() || !f) return ""; var a=bestAcc(f); return a ? tipVisit(a) : ""; }
  function strip(a){ var p=photoOf(a); if(!p) return "";
    return '<div class="phs">'+p.ids.map(function(id){ return '<a href="'+dview(id)+'" target="_blank" rel="noopener" title="Mở ảnh"><img src="'+thumb(id,320)+'" alt="Ảnh đi địa bàn '+d2(p.d)+'" loading="lazy" referrerpolicy="no-referrer"></a>'; }).join("")+'</div>'; }
  /* thẻ "lần gặp gần nhất": ảnh + kết quả + bước tiếp theo, gọn ở đầu chi tiết khách / cơ sở */
  function lastCard(a, title){
    var v=lastOf(a), p=photoOf(a); if(!v && !p) return "";
    return '<div class="lvc">'+strip(a)+(p?'<div class="cap">Ảnh đi địa bàn gần nhất · '+d2(p.d)+'</div>':'')+
      (v?'<div class="lvh"><b>'+esc(title||"Lần gặp gần nhất")+'</b><span>'+d2(v.d)+' · <i class="dot" style="background:'+picCol(v.pic)+'"></i> '+esc(v.pic)+' · '+esc(v.act)+(v.st?' · <span class="st '+(isDone(v.st)?"ok":"mute")+'">'+esc(v.st)+'</span>':'')+'</span></div>'+
        (v.res?'<div class="lvr">'+esc(v.res)+'</div>':'')+(v.fb||v.next?'<div class="lvn">'+(v.fb?'<span><b>Phản hồi</b> '+esc(v.fb)+'</span>':'')+(v.next?'<span><b>Bước tiếp theo</b> '+esc(v.next)+'</span>':'')+'</div>':''):'')+'</div>';
  }
  function cardFac(f){ if(!S.loaded || !auth() || !f) return ""; var a=bestAcc(f); return a ? lastCard(a, "Lần gặp gần nhất · "+a.disp) : ""; }
  /* thẻ xem trước khi rê chuột (người dùng 09/11/2026): ảnh đi địa bàn cỡ lớn + kết quả gần nhất tóm tắt */
  function pvPhoto(p, cap){
    if(!p) return '<div class="pvi none"><span>Chưa có ảnh đi địa bàn</span></div>';
    return '<div class="pvi"><img src="'+thumb(p.ids[0],760)+'" alt="" referrerpolicy="no-referrer"><span class="pvd">'+(cap?esc(cap)+' · ':'')+d2(p.d)+(p.ids.length>1?' · '+p.ids.length+' ảnh':'')+'</span></div>';
  }
  function pvLast(v, who){
    if(!v) return '<div class="pvl"><span class="pvh">Chưa có lượt gặp</span></div>';
    var row=function(lb, t, c){ return t ? '<p class="'+c+'"><span>'+lb+'</span> '+esc(t)+'</p>' : ""; };
    return '<div class="pvl"><span class="pvh">Kết quả gần nhất'+(who?' · '+esc(who):'')+'</span><span class="pvm">'+d2(v.d)+' · '+esc(v.pic)+' · '+esc(v.act)+(v.st?' · '+esc(v.st):'')+'</span>'+
      (v.res?'<p class="c4">'+esc(v.res)+'</p>':'<p class="c1 na">Chưa ghi kết quả</p>')+row("Phản hồi:", v.fb, "c2")+row("Tiếp theo:", v.next, "c2")+'</div>';
  }
  function tipH(x){
    var a=x.h.acc, v=lastOf(a), chips=[];
    if(x.v){ chips.push('<b>'+x.v+'</b> lượt trong kỳ'); Object.keys(x.pc).forEach(function(p){ chips.push('<i style="background:'+picCol(p)+'"></i>'+esc(p)+' '+x.pc[p]); }); }
    else chips.push('Chưa gặp trong kỳ'+(a.last?' · lần cuối '+d2(a.last):''));
    return '<div class="pvc">'+pvPhoto(photoOf(a))+'<div class="pvb"><div class="pvt">'+esc(a.disp)+'</div>'+
      '<div class="pvs">'+esc([a.type, NEW[a.ni][0], "PIC "+(a.pic||"—"), a.pub?"công lập":"tư nhân"].filter(Boolean).join(" · "))+'</div>'+
      '<div class="pvk">'+chips.map(function(c){ return '<span>'+c+'</span>'; }).join("")+'</div>'+pvLast(v)+'<div class="pvf">Bấm để xem nhật ký</div></div></div>';
  }
  /* tỉnh: ảnh mới nhất trong kỳ (khách trong địa bàn đang xem) + lượt gần nhất */
  function provBest(i){
    var sp=span(), L=A.filter(function(a){ return a.ni===i && a.code && (cp()==="all" || a.pic===cp()) && ownOk(!a.pub); }), bp=null, bv=null;
    L.forEach(function(a){ var p=photoOf(a), v=lastOf(a);
      if(p && p.d>=sp[0] && p.d<=sp[1] && (!bp || p.d>bp.p.d)) bp={a:a, p:p};
      if(v && v.d>=sp[0] && v.d<=sp[1] && (S.type!=="visit" || isVisit(v.act)) && (!bv || v.d>bv.v.d)) bv={a:a, v:v}; });
    return { p:bp, v:bv };
  }
  /* ── bảng bên ── */
  function months(rg){ var o=[], k=rg[0]; while(k<=rg[1] && o.length<24){ o.push(k); k=addK(k,1); } return o; }
  /* cột theo ngày (kỳ ≤ 14 ngày) · tuần (≤ 10 tuần) · tháng; mỗi cột chồng màu theo PIC */
  function chartMode(){ var sp=span(), n=days(sp[0],sp[1])+1; return n<=14 ? "ngày" : n<=70 ? "tuần" : "tháng"; }
  function chart(L){
    var pics=PICS(), sp=span(), md=chartMode(), keys=[], lab, tl, bk, now;
    if(md==="ngày"){ for(var x=sp[0]; x<=sp[1] && keys.length<14; x=addD(x,1)) keys.push(x); lab=function(k){ return k.slice(8,10); }; tl=dmy; bk=function(r){ return r.d; }; now=NOW; }
    else if(md==="tuần"){ for(var w=monOf(sp[0]); w<=sp[1] && keys.length<11; w=addD(w,7)) keys.push(w); lab=dm; tl=function(k){ return "Tuần "+dm(k)+" – "+dmy(addD(k,6)); }; bk=function(r){ return monOf(r.d); }; now=monOf(NOW); }
    else { keys=months(range()); lab=function(k){ return String(k%100); }; tl=function(k){ return "T"+(k%100)+"/"+Math.floor(k/100); }; bk=function(r){ return r.k; }; now=NOWK; }
    var d={}; keys.forEach(function(k){ d[k]={}; });
    L.forEach(function(r){ var k=bk(r); if(d[k]) d[k][r.pic]=(d[k][r.pic]||0)+1; });
    var tot=function(k){ var s0=0; for(var p in d[k]) s0+=d[k][p]; return s0; }, mx=Math.max.apply(null, keys.map(tot).concat([1]));
    return '<div class="monwrap"><div class="mon" role="img" aria-label="Lượt theo '+md+'">'+keys.map(function(k){
      return '<div class="c'+(k===now?" now":"")+'" title="'+esc(tl(k)+" — "+(Object.keys(d[k]).map(function(p){ return p+" "+d[k][p]; }).join(" · ")||"0"))+'">'+
        pics.map(function(p){ return d[k][p] ? '<i style="height:'+(d[k][p]/mx*82).toFixed(1)+'%;background:'+picCol(p)+'"></i>' : ""; }).join("")+'<span class="m">'+lab(k)+'</span></div>'; }).join("")+'</div></div>';
  }
  function days(a,b){ return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5); }
  function covBar(){
    return '<div class="vsw" role="group" aria-label="Cách xem bản đồ"><button type="button" data-cov="" class="'+(!S.cov?"on":"")+'">Lượt chăm sóc</button><button type="button" data-cov="'+(S.cov||"mani")+'" class="'+(S.cov?"on":"")+'">Độ phủ cơ sở trúng thầu</button></div>'+
      (S.cov?'<div class="chips"><button type="button" class="chip'+(S.cov==="mani"?" on":"")+'" data-cov="mani">MANI đã trúng</button><button type="button" class="chip'+(S.cov==="all"?" on":"")+'" data-cov="all">Có KQTT dao / chỉ khâu (mọi hãng)</button></div>':'');
  }
  function side(){
    var t=document.getElementById("sh-t"), sub=document.getElementById("sh-s");
    if(S.cov && S.loaded && auth()) return covSide();
    t.textContent = "Hoạt động Sales · "+(sel>=0 ? NEW[sel][0] : SCOPE.place());
    sub.textContent = perLabel()+" · "+picLabel()+" · lượt "+typeLabel()+(S.st==="done"?" đã thực hiện":" (cả kế hoạch)")+" · CRM Surgical"+(S.at?" · đọc lúc "+S.at:"")+(S.loading?" · đang cập nhật…":"");
    if(!auth()){ SB.innerHTML=FU.loginHtml(false)+'<div class="note">Bản đồ hoạt động đọc thẳng CRM Surgical (Customer visiting của Viet Ha, Khang…) — chỉ tài khoản email công ty xem được.</div>'; return; }
    if(!S.loaded){ ensure(); SB.innerHTML=S.err?'<div class="note err">'+esc(S.err)+' <button class="lnk" type="button" data-act-reload="1">Thử lại</button></div>':'<div class="empty">Đang đọc dữ liệu hoạt động từ CRM Surgical…</div>'; return; }
    var rg=range(), L=rowsF().filter(function(r){ return sel<0 || r.a.ni===sel; }), html=(S.err?'<div class="note err">'+esc(S.err)+'</div>':'')+covBar();
    var accs=A.filter(function(a){ return a.code && a.ni!=null && (cp()==="all"||a.pic===cp()) && ownOk(!a.pub) && (sel<0||a.ni===sel); });
    var met={}, prov={}, ph=0, vis=0; L.forEach(function(r){ met[r.a.h?r.a.h.key:r.a.i]=1; prov[r.a.ni]=1; if(r.visit){ vis++; if(r.photo) ph++; } });
    var nMet=accs.filter(function(a){ return met[a.h.key]; }).length;
    html+='<div class="kpis k4"><div class="kpi"><b>'+L.length+'</b><span>Lượt '+typeLabel()+'</span></div>'+
      '<div class="kpi"><b>'+nMet+'<span style="font-size:13px;color:var(--t3)">/'+accs.length+'</span></b><span>Khách trong danh sách được gặp ('+(accs.length?Math.round(nMet/accs.length*100):0)+'%)</span></div>'+
      (sel<0?'<div class="kpi"><b>'+Object.keys(prov).length+'</b><span>Tỉnh / thành có hoạt động</span></div>':'<div class="kpi"><b>'+Object.keys(met).length+'</b><span>Khách được gặp (cả ngoài danh sách)</span></div>')+
      '<div class="kpi"><b>'+(vis?Math.round(ph/vis*100):0)+'%</b><span>Lượt viếng thăm có ảnh</span></div></div>';
    var pics=PICS().filter(function(p){ return cp()==="all" || p===cp(); });
    html+=sec("act-pic","Theo PIC","",'<table class="tb2"><thead><tr><th>PIC</th><th class="r">Lượt</th><th class="r">Khách</th><th class="r">Tỉnh</th><th class="r">Có ảnh</th></tr></thead><tbody>'+pics.map(function(p){
      var Lp=L.filter(function(r){ return r.pic===p; }); if(!Lp.length && cp()!=="all") return "";
      var mk={}, pv={}, v2=0, p2=0; Lp.forEach(function(r){ mk[r.a.i]=1; pv[r.a.ni]=1; if(r.visit){ v2++; if(r.photo) p2++; } });
      return '<tr class="'+(SCOPE.locked()?"":"click")+(cp()===p?" m":"")+'" data-act-pic="'+esc(p)+'"><td><i class="dot" style="background:'+picCol(p)+'"></i> '+esc(p)+'</td><td class="r">'+Lp.length+'</td><td class="r">'+Object.keys(mk).length+'</td><td class="r">'+Object.keys(pv).length+'</td><td class="r">'+(v2?Math.round(p2/v2*100)+'%':'—')+'</td></tr>'; }).join("")+'</tbody></table>', true);
    html+=sec("act-mon","Lượt theo "+chartMode(),L.length+" lượt",chart(L)+'<div style="display:flex;gap:14px;flex-wrap:wrap">'+pics.map(function(p){ return '<span class="npp"><i class="dot" style="background:'+picCol(p)+'"></i>'+esc(p)+'</span>'; }).join("")+'</div>', false);
    if(sel>=0){
      html+=sec("act-acc","Khách hàng ở "+esc(NEW[sel][0]),accs.length+" khách",'<input class="search" id="act-q" type="search" placeholder="Lọc theo tên khách, PIC…" value="'+esc(S.q)+'" aria-label="Lọc khách hàng"><div id="act-list">'+accList(accs, met)+'</div>', true);
    } else {
      var top=Object.keys(HS).map(function(k){ return HS[k]; }).filter(function(x){ return x.v>0; }).sort(function(a,b){ return b.v-a.v; }).slice(0,10), mx=top.length?top[0].v:1;
      html+=sec("act-top","Khách gặp nhiều nhất","top 10",(top.length?'<ol class="rank">'+top.map(function(x,i){ var a=x.h.acc;
        return '<li data-h="'+esc(x.h.key)+'" role="button" tabindex="0"><span class="no">'+(i+1)+'</span><span class="nm">'+esc(a.disp)+'</span><span class="q">'+x.v+'<small>lượt</small></span><span class="rb"><b style="width:'+(x.v/mx*100).toFixed(1)+'%;background:'+picCol(domPic(x.pc))+'"></b></span><span class="pv"><span>'+esc(NEW[a.ni][0])+' · '+esc(Object.keys(x.pc).join(", "))+' · gần nhất '+d2(x.lastD)+'</span></span></li>'; }).join("")+'</ol>':'<div class="empty">Chưa có lượt nào trong kỳ.</div>'), false);
    }
    var old=accs.filter(function(a){ return !a.last || days(a.last, NOW)>=90; }).sort(function(a,b){ return (a.last||"0").localeCompare(b.last||"0"); });
    html+=sec("act-old","Khách lâu chưa gặp · ≥ 90 ngày",old.length+" khách",(old.length?'<div class="exp">'+old.slice(0,15).map(function(a){
      return '<div class="it" data-h="'+esc(a.h.key)+'" role="button" tabindex="0"><span class="a">'+esc(a.disp)+'</span><span class="st '+(a.last?"warn":"bad")+'">'+(a.last?days(a.last,NOW)+" ngày":"chưa gặp")+'</span><span class="b">'+esc(NEW[a.ni][0])+' · PIC '+esc(a.pic||"—")+(a.last?' · viếng thăm cuối '+d2(a.last):' · chưa có lượt viếng thăm từ 09/2025')+'</span></div>'; }).join("")+(old.length>15?'<div class="cap" style="margin-top:6px">… và '+(old.length-15)+' khách khác'+(sel<0?' (bấm 1 tỉnh để xem đủ)':'')+'</div>':'')+'</div>'
      :'<div class="empty">Mọi khách trong danh sách đều được gặp trong 90 ngày qua.</div>'), false);
    var rec=L.filter(function(r){ return r.d<=NOW; }).slice(-15).reverse();
    html+=sec("act-rec","Gần đây",rec.length+" lượt",(rec.length?'<div class="feed">'+rec.map(function(r){
      return '<div class="it" data-h="'+esc(r.a.h?r.a.h.key:"")+'" role="button" tabindex="0"><span class="a">'+esc(r.a.name)+'</span><span><span class="st '+(r.done?"ok":"mute")+'">'+esc(r.st||"—")+'</span></span><span class="b"><i class="dot" style="background:'+picCol(r.pic)+'"></i> '+d2(r.d)+' · '+esc(r.pic)+' · '+esc(r.act)+(r.a.ni!=null?' · '+esc(NEW[r.a.ni][0]):'')+(r.photo?' · có ảnh':'')+'</span></div>'; }).join("")+'</div>':'<div class="empty">Chưa có lượt nào.</div>'), false);
    var unl=A.filter(function(a){ return a.ni==null && (cp()==="all"||a.pic===cp()); }).length;
    if(unl && sel<0) html+='<div class="note">'+unl+' khách chưa xác định được tỉnh (cột Province trống / lạ trong 1. CUSTOMER CODE) — chưa hiện trên bản đồ.</div>';
    SB.innerHTML=html;
    var q=document.getElementById("act-q"); if(q) q.oninput=function(){ S.q=q.value; document.getElementById("act-list").innerHTML=accList(accs, met); };
  }
  /* bảng bên chế độ Độ phủ: số chính ⇒ theo tỉnh ⇒ cơ sở chưa chăm sóc (ưu tiên) ⇒ đã chăm sóc */
  function covSide(){
    var t=document.getElementById("sh-t"), sub=document.getElementById("sh-s");
    t.textContent="Độ phủ · "+(sel>=0 ? NEW[sel][0] : SCOPE.place());
    sub.textContent=perLabel()+" · "+picLabel()+" · lượt "+typeLabel()+(S.st==="done"?" đã thực hiện":" (cả kế hoạch)")+" · "+covWhat()+" (dữ liệu thầu mọi năm)";
    var T=Object.keys(HS).map(function(k){ return HS[k]; }).filter(function(x){ return sel<0 || x.h.ni===sel; });
    var ct=T.length, cv=T.filter(function(x){ return x.cov; }).length, never=T.filter(function(x){ return !x.cov && !x.ever; }).length, pc=ct?Math.round(cv/ct*100):0;
    var html=(S.err?'<div class="note err">'+esc(S.err)+'</div>':'')+covBar();
    html+='<div class="kpis k4"><div class="kpi"><b>'+ct+'</b><span>'+(S.cov==="all"?"Cơ sở có KQTT dao / chỉ":"Cơ sở MANI đã trúng thầu")+'</span></div>'+
      '<div class="kpi ok"><b>'+cv+'<small> · '+pc+'%</small></b><span>Đã chăm sóc trong kỳ</span></div>'+
      '<div class="kpi warn"><b>'+(ct-cv)+'</b><span>Chưa chăm sóc trong kỳ</span></div>'+
      '<div class="kpi"><b>'+never+'</b><span>Chưa từng gặp (CRM)</span></div></div>';
    if(!ct){ SB.innerHTML=html+'<div class="empty">Không có '+esc(covWhat())+' trong địa bàn đang xem.</div>'; return; }
    html+='<div class="cbar" title="'+cv+'/'+ct+'"><i style="width:'+pc+'%"></i></div>';
    if(sel<0){
      var P=NEW.map(function(x,i){ return {i:i, s:STAT[i]}; }).filter(function(o){ return o.s.ct; }).sort(function(a,b){ return (b.s.ct-b.s.cv)-(a.s.ct-a.s.cv) || b.s.ct-a.s.ct; });
      html+=sec("cov-prov", "Theo tỉnh / thành", P.length+" tỉnh", '<div class="bars">'+P.map(function(o){ var r=o.s.cv/o.s.ct;
        return '<div class="r click" data-p="'+o.i+'" role="button" tabindex="0"><span>'+esc(NEW[o.i][0])+'</span><span class="cvb" title="'+Math.round(r*100)+'%"><i style="width:'+(r*100).toFixed(1)+'%"></i></span><span class="num">'+o.s.cv+'/'+o.s.ct+'</span></div>'; }).join("")+'</div>', true);
    }
    var un=T.filter(function(x){ return !x.cov; }).sort(covSort), ok=T.filter(function(x){ return x.cov; }).sort(function(a,b){ return b.v-a.v; });
    var row=function(x){ var h=x.h, p=x.w.last;
      return '<div class="it" data-h="'+esc(h.key)+'" role="button" tabindex="0"><span class="a">'+esc(h.name)+'</span>'+(p?'<span class="st '+({ok:"ok",warn:"warn",bad:"bad"}[p.status]||"mute")+'">'+esc(contractTxt(p))+'</span>':'<span></span>')+
        '<span class="b">'+esc(NEW[h.ni][0])+' · '+(S.cov==="all"?x.w.n+' gói trúng':'MANI '+x.w.n+' gói · '+nfmt(x.w.qty)+' SP')+' · PIC '+esc(SCOPE.ownerOf(h.ni, h.oi)||"—")+'</span>'+
        '<span class="b">'+(x.cov ? '<i class="dot" style="background:'+picCol(domPic(x.pc))+'"></i> '+x.v+' lượt · gần nhất '+d2(x.lastD) : x.ever ? 'Lần gặp gần nhất '+d2(x.ever)+' ('+days(x.ever, NOW)+' ngày)' : x.nacc ? 'Chưa có lượt viếng thăm' : 'Chưa có trong danh sách khách CRM')+'</span></div>'; };
    html+=sec("cov-un", "Chưa chăm sóc trong kỳ", (ct-cv)+" cơ sở · ưu tiên hợp đồng sắp hết hạn", un.length?'<div class="exp">'+un.slice(0,60).map(row).join("")+'</div>'+(un.length>60?'<div class="cap">+'+(un.length-60)+' cơ sở — chọn tỉnh để xem đủ</div>':''):'<div class="empty">Mọi cơ sở đều đã được chăm sóc trong kỳ.</div>', true);
    html+=sec("cov-ok", "Đã chăm sóc trong kỳ", cv+" cơ sở", ok.length?'<div class="exp">'+ok.map(row).join("")+'</div>':'<div class="empty">Chưa có cơ sở nào được chăm sóc trong kỳ.</div>', false);
    SB.innerHTML=html;
  }
  function accList(accs, met){
    var qq=nw(S.q);
    var L=accs.filter(function(a){ return !qq || nw(a.disp+" "+a.name+" "+a.pic+" "+a.type+" "+a.addr).indexOf(qq)>=0; })
      .map(function(a){ return [a, (HS[a.h.key]||{v:0}).v]; }).sort(function(x,y){ return y[1]-x[1] || (y[0].last||"").localeCompare(x[0].last||""); });
    if(!L.length) return '<div class="empty">Không có khách phù hợp.</div>';
    return '<div class="exp">'+L.map(function(o){ var a=o[0];
      return '<div class="it" data-h="'+esc(a.h.key)+'" role="button" tabindex="0"><span class="a"><i class="dot" style="background:'+(o[1]?picCol(a.pic):GREY)+'"></i> '+esc(a.disp)+'</span><span class="'+(o[1]?"st ok":"st mute")+'">'+(o[1]?o[1]+" lượt":"chưa gặp")+'</span><span class="b">'+esc([a.type, "PIC "+(a.pic||"—"), a.last?"viếng thăm cuối "+d2(a.last):""].filter(Boolean).join(" · "))+'</span></div>'; }).join("")+'</div>';
  }

  /* ── chi tiết 1 khách hàng: vị trí, liên kết cơ sở thầu, nhật ký viếng thăm ── */
  function lkey(a){ return a.code || ("x"+a.i); }
  function accHtml(h){
    var a=h.acc, x=HS[h.key]||{v:0,pc:{}}, t=document.getElementById("sh-t"), sub=document.getElementById("sh-s");
    t.innerHTML='<button class="sbk" data-up="1" title="Về '+esc(NEW[a.ni][0])+'">‹</button>'+esc(a.disp);
    sub.textContent=[a.type, NEW[a.ni][0], "PIC "+(a.pic||"—")].filter(Boolean).join(" · ");
    var gm = a.ll ? a.ll[1]+","+a.ll[0] : a.disp+" "+NEW[a.ni][0];
    var html=lastCard(a)+(S.pick && S.pick===a ? '<div class="note" style="border-color:var(--blue)"><b>Bấm vào đúng vị trí của khách trên bản đồ</b> để ghim. <button class="lnk" type="button" data-act-pick="0">Huỷ</button></div>' : '');
    html+=sec("acc-info","Thông tin & vị trí",(a.code?esc(a.code)+" · ":"")+(a.pub?"công lập":"tư nhân"),'<dl class="finfo"><dt>Mã KH</dt><dd>'+(a.code?esc(a.code):'<span class="na">chưa có trong 1. CUSTOMER CODE</span>')+(a.pub?' · công lập':' · tư nhân')+'</dd>'+
      '<dt>Tên chuẩn</dt><dd>'+esc(a.disp)+(a.disp!==a.name?' <span class="na">(trên CRM: '+esc(a.name)+')</span>':'')+(a.code?'<div class="stn" style="margin-top:4px" id="act-stn" hidden><input class="inp" id="act-std" value="'+esc(a.disp)+'" style="flex:1;min-width:180px"><button class="btn sm pri" type="button" data-act-std="1">Lưu</button></div> <button class="lnk" type="button" data-act-stdo="1">Sửa tên chuẩn</button>':'')+'</dd>'+
      '<dt>Loại</dt><dd>'+esc(a.type||"—")+(a.area?' · '+esc(a.area):'')+'</dd><dt>PIC phụ trách</dt><dd><i class="dot" style="background:'+picCol(a.pic)+'"></i> '+esc(a.pic||"—")+'</dd>'+
      '<dt>Địa chỉ</dt><dd>'+(a.addr?esc(addrFmt(a.addr)):'<span class="na">chưa có</span>')+'</dd>'+
      '<dt>Vị trí</dt><dd>'+esc(SRC[a.src])+(a.src==="ghim"&&a.loc&&a.loc[5]?' <span class="na">('+esc(a.loc[5])+(a.loc[6]?' · '+esc(a.loc[6].slice(0,10)):'')+')</span>':'')+(a.src==="gps"&&a.gps?' <span class="na">('+a.gps[3]+'/'+a.gps[2]+' ảnh gần nhau)</span>':'')+
        '<br><a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(gm)+'" target="_blank" rel="noopener">Google Maps</a>'+
        (a.code?' · <button class="lnk" type="button" data-act-pick="1">Ghim trên bản đồ</button>'+(a.loc?' · <button class="lnk" type="button" data-act-unpin="1">Bỏ ghim</button>':''):'')+'</dd>'+
      '<dt>Cơ sở trên Tender Map</dt><dd>'+(a.f ? esc(a.f.name)+(a.f.h&&a.f.h.pk&&a.f.h.pk.length?' · '+a.f.h.pk.length+' gói thầu':' · chưa có gói thầu')+' · <button class="lnk" type="button" data-act-tender="1">Xem thông tin thầu</button>' : '<span class="na">chưa gắn</span>')+
        (a.code?'<div class="fmq" style="margin-top:6px"><input class="inp" id="act-fq" type="search" autocomplete="off" placeholder="'+(a.f?"Gắn cơ sở khác…":"Gắn với cơ sở y tế trong danh mục…")+'"><div class="qsr" id="act-fr" hidden></div></div>':'')+'</dd></dl>', !!S.pick);
    html+='<div class="kpis"><div class="kpi"><b>'+x.v+'</b><span>Lượt '+typeLabel()+' trong kỳ</span></div><div class="kpi"><b>'+(a.last?d2(a.last):"—")+'</b><span>Viếng thăm cuối</span></div><div class="kpi"><b>'+(a.last?days(a.last,NOW):"—")+'</b><span>Ngày từ lần cuối</span></div></div>';
    html+='<h3>Lịch sử chăm sóc · CRM Surgical</h3><div id="actlog">'+logHtml(a)+'</div>';
    if(a.f) html+=FA.hospHtml({ name:a.f.name, ni:a.ni, f:a.f, key:h.key });
    var th=a.f && a.f.h && a.f.h.pk ? a.f.h.pk.filter(function(p){ return p.res==="Win" || p.npp!=="KQTT"; }).sort(byNewest) : [];
    if(th.length) html+='<h3>Lịch sử thầu · '+th.length+' gói · <button class="lnk" type="button" data-act-tender="1">xem đầy đủ</button></h3><div class="hist">'+th.slice(0,8).map(function(p){ var ws=winSide(p);
      return '<div class="ev '+(p.res==="Win"?"win":p.res==="Fail"?"fail":"pend")+'"><div class="d">'+lastD(p)+' · '+NPP[p.npp].name+' · '+statusTag(p)+'</div><div class="tt">'+(ws.m?'<span class="tag2 m">MANI</span> ':'')+(ws.o?'<span class="tag2 o">'+esc(Object.keys(ws.ob).slice(0,2).join(", "))+'</span> ':'')+esc(p.tender||("Gói "+(p.tbmtRaw[0]||"")))+'</div>'+
        '<div class="meta"><span>'+esc(itemsTxt(p.items.filter(function(it){ return p.res!=="Win"||it.result==="Win"; })))+'</span>'+(p.end?'<span>đến '+d2(p.end)+'</span>':'')+'</div></div>'; }).join("")+'</div>';
    else if(a.f && a.pub) html+='<div class="note">Chưa có gói thầu dao / chỉ khâu của cơ sở này trong dữ liệu 2 NPP và KQTT toàn quốc.</div>';
    if(a.f && !a.pub) html+='<div class="note">Cơ sở tư nhân — theo dõi mua sắm ở <b>Theo dõi thầu</b> (Giới thiệu → Demo → Đề xuất từ chuyên môn → Ký hợp đồng → Sử dụng hàng). <button class="lnk" type="button" data-act-fu="1">+ Thêm cơ hội mua sắm</button></div>';
    SB.innerHTML=html; if(SB._hk!==h.key){ SB.scrollTop=0; SB._hk=h.key; }
    var fq=document.getElementById("act-fq");
    if(fq) QS.wire(fq, document.getElementById("act-fr"), function(f){ link(a, f); });
    var lk=lkey(a);
    if(!S.logs[lk]) IDB.get("log:"+lk).then(function(c){ if(c && c.ok && !S.logs[lk]){ c._old=1; S.logs[lk]=c; if(selH && selH.acc===a){ var b0=document.getElementById("actlog"); if(b0) b0.innerHTML=logHtml(a); } } });
    if(!S.logs[lk] || S.logs[lk]._old || Date.now()-(S.logAt[lk]||0)>120000) loadLog(a);      /* luôn đọc lại ở nền (≤ 2 phút / lần) */
  }
  function loadLog(a){
    var k=lkey(a); if(S.logBusy[k]) return; S.logBusy[k]=1; S.logAt[k]=Date.now();
    var q=a.code ? "&code="+encodeURIComponent(a.code) : "&name="+encodeURIComponent(a.name)+"&prov="+encodeURIComponent(a.prov);
    getJSON(CRM_SURG+"?action=fuVisitLog&tk="+encodeURIComponent(FU.tk())+q).then(function(d){ return d; },function(e){ return {ok:false, error:e.message}; }).then(function(d){
      delete S.logBusy[k]; d=d||{ok:false};
      if(d.ok){ S.logs[k]=d; IDB.set("log:"+k, d); } else if(!S.logs[k] || !S.logs[k].ok) S.logs[k]=d; else S.logs[k]._err=d.error||"Chưa đọc lại được nhật ký.";
      if(selH && selH.acc===a){ var b=document.getElementById("actlog"); if(b) b.innerHTML=logHtml(a); }
    });
  }
  function logHtml(a){
    var d=S.logs[lkey(a)], busy=S.logBusy[lkey(a)];
    if(!d || !d.ok){                                                     /* chưa có nhật ký đủ ⇒ 3 lượt gần nhất có sẵn */
      var pre=(a.lv||[]).map(function(v){ return {d:v[0], pic:v[1], act:v[2], st:v[3], res:v[4], fb:v[5], next:v[6], ids:v[7]||[]}; });
      if(!pre.length) return d ? '<div class="note err">'+esc(d.error||"Chưa đọc được nhật ký.")+'</div>' : '<div class="empty">Đang đọc nhật ký từ CRM Surgical…</div>';
      return logRows(pre)+'<div class="cap">'+(d?esc(d.error||"Chưa đọc được nhật ký đủ."):'3 lượt gần nhất · đang đọc đủ nhật ký…')+'</div>';
    }
    if(!d.rows || !d.rows.length) return '<div class="empty">Chưa có lượt nào trong CRM.</div>';
    return logRows(d.rows)+(d._old && busy?'<div class="cap">Bản đã lưu trên máy · đang cập nhật…</div>':d._err?'<div class="cap">'+esc(d._err)+'</div>':'');
  }
  function logRows(rows){
    return '<div class="fulog alog">'+rows.filter(function(r){ return !TESTP.test(r.pic||""); }).map(function(r){
      var ids=r.ids || (r.photo ? [driveId(r.photo)].filter(Boolean) : []);
      return '<div class="ev'+(isDone(r.st)?"":" pl")+'"><div class="d">'+d2(r.d)+(r.f&&r.f!==r.d?' → '+d2(r.f):'')+' · <i class="dot" style="background:'+picCol(r.pic)+'"></i> '+esc(r.pic)+' · <b>'+esc(r.act||r.task||"—")+'</b> · <span class="st '+(isDone(r.st)?"ok":"mute")+'">'+esc(r.st||"—")+'</span>'+(r.proc?' · '+esc(r.proc):'')+'</div>'+
        (r.res?'<div class="x">'+esc(r.res)+'</div>':(r.plan?'<div class="x" style="color:var(--t2)">Kế hoạch: '+esc(r.plan)+'</div>':''))+
        (r.fb||r.next?'<div class="d">'+(r.fb?'Phản hồi: '+esc(r.fb):'')+(r.fb&&r.next?' · ':'')+(r.next?'Bước tiếp theo: '+esc(r.next):'')+'</div>':'')+
        (r.stop?'<div class="d">Lý do dừng: '+esc(r.stop)+'</div>':'')+
        (ids.length?'<div class="lph">'+ids.slice(0,4).map(function(id){ return '<a href="'+dview(id)+'" target="_blank" rel="noopener" title="Mở ảnh"><img src="'+thumb(id,200)+'" alt="Ảnh '+d2(r.d)+'" loading="lazy" referrerpolicy="no-referrer"></a>'; }).join("")+'</div>':'')+
        (r.photo&&!ids.length||r.gps?'<div class="d">'+(r.photo&&!ids.length?'<a href="'+esc(r.photo)+'" target="_blank" rel="noopener">Ảnh</a>':'')+(r.photo&&!ids.length&&r.gps?' · ':'')+(r.gps?'<a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.gps)+'" target="_blank" rel="noopener">Nơi chụp</a>'+(r.addr?' ('+esc(r.addr)+')':''):'')+'</div>':'')+'</div>'; }).join("")+'</div>';
  }
  /* ── ghim vị trí / gắn cơ sở (ghi sheet TENDER MAP · VỊ TRÍ ĐỊA BÀN) ── */
  function post(body){
    body.tk=FU.tk(); body.rid="lc"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    return fetch(CRM_SURG,{ method:"POST", body:JSON.stringify(body), headers:{"Content-Type":"text/plain;charset=utf-8"}, redirect:"follow", credentials:"omit" }).then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); });
  }
  function saveLoc(a, loc, body){
    var old=a.loc; a.loc=loc; relocate(a);
    post(Object.assign({ action:"fuLocSave", code:a.code, name:a.name, prov:a.prov }, body)).then(function(d){
      if(!d || !d.ok){ throw new Error((d&&d.error)||"máy chủ chưa nhận"); }
      if(d.loc!==undefined){ a.loc=d.loc; relocate(a); }
      XP.toast(body.op==="clear"?"Đã bỏ ghim vị trí":"Đã lưu vị trí của "+a.name);
    }).catch(function(e){ a.loc=old; relocate(a); XP.toast("Chưa lưu được vị trí: "+e.message, true); });
  }
  function relocate(a){
    var cf=a.f && a.f.src==="crm" ? a.f : null;
    locate(a); if(!a.f && cf){ a.f=cf; cf.ll=a.ll; }
    if(a.h){ a.h.xy=a.xy; a.h.f=a.f; a.h.oi=a.oi; }
    BYF={}; A.forEach(function(b){ if(b.f) (BYF[b.f.id]=BYF[b.f.id]||[]).push(b); });
    refresh();
  }
  function link(a, f){
    var lat=f.ll?f.ll[1]:"", lng=f.ll?f.ll[0]:"";
    saveLoc(a, [lat, lng, f.id, f.name, "danhmuc", (FU.auth()||{user:{}}).user.pic||"", ""], { lat:lat, lng:lng, fid:/^U:/.test(f.id)?"":f.id, fname:f.name, src:"danhmuc" });
  }
  function pickAt(x, y){
    var a=S.pick; if(!a) return; S.pick=null; document.getElementById("map").classList.remove("pickm");
    var lon=x/SC*180/Math.PI+LON0, m=Y1-y/SC, lat=(2*Math.atan(Math.exp(m))-Math.PI/2)*180/Math.PI;
    lat=Math.round(lat*1e6)/1e6; lon=Math.round(lon*1e6)/1e6;
    saveLoc(a, [lat, lon, a.f?a.f.id:"", a.f?a.f.name:"", "tay", (FU.auth()||{user:{}}).user.pic||"", ""], { lat:lat, lng:lon, fid:a.f&&!/^U:/.test(a.f.id)?a.f.id:"", fname:a.f?a.f.name:"", src:"tay" });
  }
  SB.addEventListener("click",function(e){
    if(F.view!=="act") return;
    var cb=e.target.closest("[data-cov]"); if(cb){ S.cov=cb.dataset.cov; lsSet("tm_act_cov",S.cov); if(selH && !selH.acc && !S.cov){ selH=null; crumbSet(); } LG.tmp=null; refresh(); return; }
    var b=e.target.closest("[data-act-pick],[data-act-unpin],[data-act-tender],[data-act-pic],[data-act-reload],[data-act-std],[data-act-stdo],[data-act-fu]"); if(!b) return;
    var a=selH && selH.acc;
    if(b.dataset.actReload){ S.err=""; load(); side(); return; }
    if(b.dataset.actPic){ if(!SCOPE.locked()) SCOPE.set(cp()===b.dataset.actPic ? "" : b.dataset.actPic); return; }
    if(!a) return;
    if(b.dataset.actPick){ S.pick = b.dataset.actPick==="1" ? a : null; document.getElementById("map").classList.toggle("pickm", !!S.pick); if(S.pick && MQ.matches) SHEET.to("peek"); accHtml(selH); return; }
    if(b.dataset.actUnpin){ saveLoc(a, null, { op:"clear" }); return; }
    if(b.dataset.actStdo){ var st=document.getElementById("act-stn"); if(st){ st.hidden=false; b.hidden=true; document.getElementById("act-std").focus(); } return; }
    if(b.dataset.actStd){ var v=String(document.getElementById("act-std").value||"").replace(/\s+/g," ").trim(); if(!v) return;
      var old=a.std; a.std=v; a.disp=v; if(a.h) a.h.name=v; if(a.f && a.f.src==="crm"){ a.f.name=v; a.f._q=null; } accHtml(selH);
      post({ action:"fuLocSave", op:"name", code:a.code, name:a.name, prov:a.prov, std:v }).then(function(d){ if(!d||!d.ok) throw new Error((d&&d.error)||"máy chủ chưa nhận"); XP.toast("Đã lưu tên chuẩn"); })
        .catch(function(e){ a.std=old; a.disp=nameOf(a); if(a.h) a.h.name=a.disp; XP.toast("Chưa lưu được tên: "+e.message, true); if(selH&&selH.acc===a) accHtml(selH); });
      return; }
    if(b.dataset.actFu && a.f){ FU.open({ f:a.f }); return; }
    if(b.dataset.actTender && a.f){ F.view="win"; lsSet("tm_view","win"); renderFilters(); selectHosp(hospOf(a.f)); }
  });
  function openCode(code){ F.view="act"; lsSet("tm_view","act"); renderFilters(); var h=HK["A|"+code]; if(h && S.loaded){ refresh(); selectHosp(h); } else { S.open=code; ensure(); refresh(); } }
  FU.onLogin(function(){ if(F.view==="act" || S.open) load(); });
  /* bảng tính cho nút Xuất */
  function sheet(){
    if(!S.loaded) return null;
    var out=[["Ngày","PIC","Khách hàng","Mã KH","Loại KH","Tỉnh / thành","Loại việc","Hoạt động","Trạng thái","Có ảnh","PIC phụ trách","Vị trí theo"]];
    rowsF().forEach(function(r){ var a=r.a; if(sel>=0 && a.ni!==sel) return; out.push([r.d, r.pic, a.name, a.code, a.type, a.ni!=null?NEW[a.ni][0]:a.prov, r.task, r.act, r.st, r.photo?"có":"", a.pic, SRC[a.src]||""]); });
    return ["Hoạt động Sales", out];
  }
  return { _S:S, rows:function(){ return R; }, cov2:cov2, privN:privN, ensure:ensure, load:load, loaded:function(){ return S.loaded; }, build:build, filters:filters, sum:sum, stats:stats, col:col, pcol:pcol, legend:legend, tipP:tipP, tipH:tipH,
           side:side, accHtml:accHtml, tipFac:tipFac, tipCov:tipCov, covCol:covCol, covWhat:covWhat, cardFac:cardFac, cov:function(){ return F.view==="act" && !!S.cov && S.loaded && !!auth(); }, picking:function(){ return !!S.pick; }, pickAt:pickAt, openCode:openCode, byFac:function(f){ return (f && BYF[f.id]) || []; }, sheet:sheet, _A:function(){ return A; } };
})();

/* ═════════ CRM SURGICAL trong chi tiết cơ sở (backend crm-surgical ▸ fuCrm, chỉ phiên email công ty) ═════════
   Địa bàn khớp tên + tỉnh ⇒ mã, PIC, lượt gặp 12 tháng, người liên hệ (CBC, không SĐT), đơn hàng 12 tháng. Đệm trên máy theo phiên. */
var CRMX=(function(){
  var C={}, busy={};
  function url(h){ return CRM_SURG+"?action=fuCrm&tk="+encodeURIComponent(FU.tk())+"&hosp="+encodeURIComponent(h.name)+"&prov="+encodeURIComponent(NEW[h.ni][0])+"&olds="+encodeURIComponent(NEW[h.ni][2].join("|"))+(h.f&&h.f.id&&!/^[UH]:/.test(h.f.id)?"&fid="+encodeURIComponent(h.f.id):""); }
  function body(d){
    if(!d.ok) return '<div class="note'+(d.code==="AUTH"?"":" err")+'">'+esc(d.error||"Chưa đọc được CRM Surgical.")+'</div>';
    if(!d.acc) return '<div class="empty">Chưa thấy cơ sở này trong danh sách địa bàn của CRM Surgical (so tên + tỉnh).</div>';
    var a=d.acc, v=d.visits||{}, o=d.orders||{}, html='<div class="acc"><span>Mã <b>'+esc(a.code)+'</b></span><span>PIC <b>'+esc(a.pic||"—")+'</b></span>'+(a.type?'<span>'+esc(a.type)+'</span>':'')+(d.alt?'<span>+'+d.alt+' địa bàn tên gần giống</span>':'')+'</div>';
    html+='<div class="kpis"><div class="kpi"><b>'+(v.n12||0)+'</b><span>Lượt gặp 12 tháng'+(v.n12?' · '+(v.done12||0)+' hoàn thành':'')+'</span></div><div class="kpi"><b>'+(o.n||0)+'</b><span>Đơn hàng 12 tháng'+(o.amount?' · '+vnd(o.amount):'')+'</span></div><div class="kpi"><b>'+((d.cbc||[]).length)+'</b><span>Người liên hệ (CBC)</span></div></div>';
    var li=function(x){ return '<li><div class="d">'+d2(x.d)+' · '+esc(x.pic)+' · '+esc(x.act||"")+(x.st?' · '+esc(x.st):'')+'</div>'+(x.res?esc(x.res):'')+(x.fb||x.next?'<div class="d">'+(x.fb?'Phản hồi: '+esc(x.fb):'')+(x.fb&&x.next?' · ':'')+(x.next?'Bước tiếp theo: '+esc(x.next):'')+'</div>':'')+'</li>'; };
    if(v.last && v.last.length) html+='<ul>'+v.last.slice(0,5).map(li).join("")+'</ul>'+(v.last.length>5?'<details><summary style="cursor:pointer;font-size:12.5px;color:var(--blue)">Xem thêm '+(v.last.length-5)+' lượt chăm sóc</summary><ul>'+v.last.slice(5).map(li).join("")+'</ul></details>':'');
    if(d.cbc && d.cbc.length) html+='<div class="ppl">'+d.cbc.map(function(x){ return '<span title="'+esc([x.spec,x.role,x.inf?"ảnh hưởng "+x.inf:""].filter(Boolean).join(" · "))+'"><b>'+esc(x.name)+'</b>'+(x.title?' · '+esc(x.title):'')+'</span>'; }).join("")+'</div>';
    if(o.prods && o.prods.length) html+='<div class="cap">Đơn hàng 12 tháng: '+esc(o.prods.map(function(x){ return x[0]+" "+nfmt(x[1]); }).join(" · "))+(o.last?' · gần nhất '+d2(o.last):'')+'</div>';
    return html+'<div class="cap"><button class="lnk" type="button" data-act-open="'+esc(a.code)+'">Xem trên bản đồ hoạt động</button> · <a href="https://manimedicalhanoi.github.io/MMH-CRM/" target="_blank" rel="noopener">Mở MMH CRM</a></div>';
  }
  var AT={}, WT=null;
  function paint(h){
    var b=document.getElementById("crmx"); if(!b || selH!==h) return;
    var d=C[h.key], head='<h3>CRM Surgical · địa bàn'+(d && d._old && busy[h.key]?' <span class="cap" style="text-transform:none;letter-spacing:0">· đang cập nhật</span>':'')+'</h3>';
    b.innerHTML=ACT.cardFac(h.f)+head+(d ? body(d) : '<div class="empty">Đang đọc CRM Surgical…</div>');
  }
  function fetchH(h){
    if(busy[h.key]) return; busy[h.key]=1; AT[h.key]=Date.now();
    getJSON(url(h)).then(function(r){ return r; },function(e){ return {ok:false, error:"Không kết nối được CRM Surgical ("+e.message+")."}; }).then(function(r){
      delete busy[h.key]; r=r||{ok:false};
      if(r.ok || r.code==="AUTH" || !C[h.key] || !C[h.key].ok){ C[h.key]=r; if(r.ok) IDB.set("crm:"+h.key, r); }
      paint(h);
    });
  }
  function fill(h){
    var box=document.getElementById("crmx"); if(!box) return;
    if(!FU.auth()){ box.innerHTML=""; return; }
    if(!C[h.key]) IDB.get("crm:"+h.key).then(function(c){ if(c && c.ok && !C[h.key]){ c._old=1; C[h.key]=c; paint(h); } });
    if(!C[h.key] || C[h.key]._old || Date.now()-(AT[h.key]||0)>120000) fetchH(h);       /* luôn đọc lại ở nền (≤ 2 phút / lần) */
    paint(h);
  }
  /* rê chuột ≥ 0,35 giây vào cơ sở ⇒ đọc trước, bấm vào là có ngay */
  function warm(h){ if(!FU.auth() || !h || h.ni==null || h.ni<0 || C[h.key] || busy[h.key]) return; clearTimeout(WT); WT=setTimeout(function(){ fetchH(h); }, 350); }
  return { fill:fill, warm:warm, clear:function(){ C={}; } };
})();

/* ═════════ XUẤT: Excel (SheetJS từ cdnjs, tải khi cần) · ảnh PNG bản đồ ═════════ */
var XP=(function(){
  var menu=document.getElementById("xmenu"), btn=document.getElementById("xbtn"), tt=null, tEl=null;
  function toast(msg, err){ if(!tEl){ tEl=document.createElement("div"); tEl.className="toast"; tEl.setAttribute("role","status"); document.body.appendChild(tEl); }
    tEl.textContent=msg; tEl.className="toast"+(err?" err":""); tEl.hidden=false; clearTimeout(tt); tt=setTimeout(function(){ tEl.hidden=true; }, err?6000:3500); }
  function place(){ var r=btn.getBoundingClientRect(), w=menu.offsetWidth||260; menu.style.top=(r.bottom+6)+"px"; menu.style.left=Math.max(8, Math.min(window.innerWidth-w-8, r.right-w))+"px"; }
  btn.addEventListener("click",function(e){ e.stopPropagation(); if(menu.hidden){ menu.hidden=false; place(); var f=menu.querySelector("button"); if(f) f.focus(); } else menu.hidden=true; });
  document.addEventListener("click",function(e){ if(!menu.hidden && !menu.contains(e.target) && e.target!==btn) menu.hidden=true; });
  menu.addEventListener("keydown",function(e){ if(e.key==="Escape"){ menu.hidden=true; btn.focus(); e.stopPropagation(); } });
  menu.addEventListener("click",function(e){ var b=e.target.closest("[data-x]"); if(!b) return; menu.hidden=true; FD.close(); if(b.dataset.x==="xlsx") xlsx(); else png(); });
  function lib(){ if(window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function(res,rej){ var sc=document.createElement("script"); sc.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      sc.onload=function(){ if(window.XLSX) res(window.XLSX); else rej(new Error("không tải được thư viện Excel")); }; sc.onerror=function(){ rej(new Error("không tải được thư viện Excel — kiểm tra mạng")); }; document.head.appendChild(sc); }); }
  function slug(t){ return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\u0111/g,"d").replace(/\u0110/g,"D").replace(/[^A-Za-z0-9]+/g,""); }
  function fname(ext){ return "TenderMap_"+(sel>=0?slug(NEW[sel][0])+"_":"")+slug(periodLabel())+"_"+NOW.replace(/-/g,"")+"."+ext; }
  function save(blob, name){ var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  var RESV={Win:"Trúng",Fail:"Trượt",Pending:"Chờ kết quả",Cancel:"Huỷ"}, STV={ok:"Đang thực hiện",warn:"Sắp hết hạn",bad:"Đã hết hạn",na:"Chưa có ngày phê duyệt"};
  /* các sheet (mảng 2 chiều) theo bộ lọc + phạm vi đang xem */
  function sheets(){
    var out=[], r0=function(v){ return Math.round(v); };
    out.push(["Bộ lọc", [["Tender Map — số liệu theo bộ lọc",""],["Xuất lúc", new Date().toLocaleString("vi-VN")],["Phạm vi", sel>=0?NEW[sel][0]:"Toàn quốc"],["Kỳ", periodLabel()],
      ["Nguồn", srcLabel()],["Hãng", F.brand==="all"?"Mọi hãng":F.brand==="mani"?"MANI":"Hãng khác"],["Sản phẩm", typeLabel()],["Gói", F.res==="win"?"Chỉ gói trúng":"Mọi gói tham dự"],["Chỉ số", mLabel()],
      ["Ghi chú","Giá trị = SL × đơn giá trúng (thiếu thì phần chào thầu). Kỳ của gói = tháng phê duyệt (chưa có ⇒ tháng giấy uỷ quyền / ngày ký). FY67 = 09/2025 – 08/2026."]]]);
    var pk=[["Nguồn","Số TBMT","Cơ sở","Tỉnh / thành","Miền","FY","Quý","Ngày phê duyệt","Hết hạn","Thời hạn (tháng)","Kết quả gói","Tình trạng hợp đồng","Mã SP","Nhóm SP","Hãng","Kết quả dòng","SL","Đơn vị","Đơn giá (đ)","Thành tiền (đ)"]];
    PKGS.forEach(function(p){ if(!pass(p) || (sel>=0 && !inScope(p))) return; p.items.forEach(function(it){ if(!itOk(it)) return;
      pk.push([NPP[p.npp].name, p.tbmtRaw.join(", "), p.hospital, provOfP(p), p.reg?REGION[p.reg]:"", p.fy?"FY"+p.fy:"", p.q?"Q"+p.q:"", p.approve||"", p.end||"", p.dur||"",
        RESV[p.res]||p.res||"", STV[p.status]||"", it.code||"", (GK[it.g]||GK.other).name, brandOf(it), RESV[it.result]||it.result||"", +it.qty||0, it.unit||"", +it.price||0, r0(+it.value||0)]); }); });
    out.push(["Gói thầu (từng SP)", pk]);
    var hs=[["Cơ sở","Tỉnh / thành","Nguồn","Số gói","Giá trị (đ)","Số lượng","Trúng gần nhất","Thị phần MANI (%)"]];
    rankList().filter(function(x){ return sel<0 || x.h.ni===sel; }).forEach(function(x){ var sh=HSH[x.h.key];
      hs.push([x.h.name, NEW[x.h.ni][0], Object.keys(x.h.npps).map(function(n){ return NPP[n].name; }).join(", "), x.n, r0(x.val), x.qty, x.last?lastD(x.last):"", sh&&sh.t?Math.round(sh.m/sh.t*100):""]); });
    out.push(["Bệnh viện", hs]);
    var pv=[["Tỉnh / thành","Miền","Số gói","Giá trị (đ)","Số lượng","Số cơ sở","HĐ còn ≤ 6 tháng","Thị phần MANI (%)"]];
    STAT.forEach(function(x,i){ if(!x.n && !x.sh.t) return; if(sel>=0 && i!==sel) return; pv.push([NEW[i][0], REGION[NEW[i][1]], x.n, r0(x.val), x.qty, Object.keys(x.hosp).length, x.soon, x.sh.t?Math.round(x.sh.m/x.sh.t*100):""]); });
    out.push(["Tỉnh", pv]);
    var re=[["Hết hạn","Cơ sở","Tỉnh / thành","Bên đang có HĐ","Nguồn","Sản phẩm","SL","Giá trị (đ)","Mời thầu dự kiến","Số TBMT"]];
    reList().forEach(function(e){ re.push([e.end, e.p.h.name, provOfP(e.p), e.brands.join(", "), NPP[e.p.npp].name, itemsTxt(e.its), e.qty, r0(e.val), monLbl(monKey(e.open)), e.p.tbmtRaw.join(", ")]); });
    out.push(["Thầu lại", re]);
    if(F.cat!=="chi"){ var R=pxRows(false), px=[["Loại dao","Hãng","Giá TB (đ/cái)","Thấp","Cao","SL","Số gói"]];
      GR.filter(function(g){ return g.top==="dao"; }).forEach(function(g){ pxBrands(R.filter(function(x){ return x.it.g===g.k; })).forEach(function(b){ px.push([g.name, b[0], r0(b[1].avg), b[1].mn, b[1].mx, b[1].q, b[1].n]); }); });
      out.push(["Giá trúng dao", px]);
      var sw=[["Cơ sở","Tỉnh / thành","MANI trúng gần nhất","Hãng khác trúng gần nhất","Hãng","Giá hãng khác (đ/cái)"]];
      switchList().forEach(function(x){ sw.push([x.h.name, NEW[x.h.ni][0], lastD(x.prevM), lastD(x.last), x.brands.join(", "), x.price||""]); });
      out.push(["Chuyển sang hãng khác", sw]); }
    if(F.npp!=="KQTT"){ var np=[["NPP","Quý","Tham dự","Trúng","Trượt","Chờ","Huỷ","Tỉ lệ trúng (%)","Giá trị trúng (đ)"]];
      NPPS.forEach(function(k){ var L=nppPk(k); nppQuarters().forEach(function(fq){ var c=cnt(L.filter(function(p){ return p.fy===fq[0] && p.q===fq[1]; })); if(!c.n) return;
        np.push([NPP[k].name, "Q"+fq[1]+" FY"+fq[0], c.n, c.Win, c.Fail, c.Pending, c.Cancel, c.rt==null?"":Math.round(c.rt*100), r0(c.val)]); }); });
      out.push(["Hiệu quả NPP", np]); }
    var d=fcData(), fc=[["Tháng","Dao (cái)","Chỉ khâu (sợi)","Hùng Vĩ · dao","Hùng Vĩ · chỉ","iCare · dao","iCare · chỉ","MANI qua KQTT · dao"]];
    d.months.forEach(function(k){ var m=d.M[k], g=function(x){ return r0(m.src[x]||0); }; fc.push([monLbl(k), r0(m.dao), r0(m.chi), g("HUNGVI|dao"), g("HUNGVI|chi"), g("ICARE|dao"), g("ICARE|chi"), g("KQTT|dao")]); });
    out.push(["Dự báo tiêu thụ", fc]);
    var ash=ACT.sheet(); if(ash) out.push(ash);
    return out;
  }
  function xlsx(){
    toast("Đang tạo file Excel…");
    lib().then(function(X){
      var wb=X.utils.book_new();
      sheets().forEach(function(sh){ var ws=X.utils.aoa_to_sheet(sh[1]);
        ws["!cols"]=sh[1][0].map(function(_,ci){ var w=8; sh[1].slice(0,200).forEach(function(r){ var v=r[ci]; if(v!=null) w=Math.max(w, String(v).length+2); }); return {wch:Math.min(46,w)}; });
        X.utils.book_append_sheet(wb, ws, sh[0].slice(0,31)); });
      var name=fname("xlsx"), buf=X.write(wb,{bookType:"xlsx", type:"array"});
      save(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), name); toast("Đã tải "+name);
    }).catch(function(e){ toast("Chưa xuất được Excel: "+e.message, true); });
  }
  var SVG_CSS=".prov{stroke:#fff;stroke-width:.9;vector-effect:non-scaling-stroke}.prov.dim{opacity:.45}.prov.sel{stroke:#003047;stroke-width:2}"+
    ".old{fill:none;stroke:#fff;stroke-opacity:.85;stroke-width:.6;stroke-dasharray:2 2;vector-effect:non-scaling-stroke}.old.off{display:none}"+
    "text{font-family:Aptos,'Segoe UI',Arial,sans-serif}.lbl{font-weight:600;fill:#003047;paint-order:stroke;stroke:#fff;stroke-linejoin:round;text-anchor:middle}.lbl.mute{fill:#7A889C;font-weight:500}"+
    ".bdg circle{fill:#fff;vector-effect:non-scaling-stroke;stroke-width:2}.bdg text{font-weight:800;fill:#003047;text-anchor:middle}.isl circle{fill:#9FB2C8}.isl text{fill:#5B6E8C;font-style:italic;text-anchor:middle;paint-order:stroke;stroke:#EAF2FB}"+
    ".sea{fill:#7F96B2;font-style:italic;text-anchor:middle;opacity:.55}.pulse{display:none}.hm circle{vector-effect:non-scaling-stroke}.hm circle.c{fill:#fff;stroke-width:3}.hm circle.ring{fill:none;stroke:#E0A100;stroke-width:2.4}"+
    ".hm.on circle.c{fill:#FFF4D6}.hm.on circle.ring{stroke:#003047;stroke-width:3.4}.hm text{fill:#003047;font-weight:600;paint-order:stroke;stroke:#fff;stroke-linejoin:round}"+
    ".oldlbl{fill:#7F8EA3;font-style:italic;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-linejoin:round}.fd circle{fill:#A3AFBF;stroke:#fff;stroke-width:1.2;vector-effect:non-scaling-stroke}";
  function png(){
    try{
      var r=svg.getBoundingClientRect(), W=Math.round(r.width), Hh=Math.round(MQ.matches ? Math.max(200, r.height-SHEET.target()) : r.height), sc=2, top=64;
      var cl=svg.cloneNode(true); cl.setAttribute("xmlns",NS); cl.setAttribute("width",W); cl.setAttribute("height",Math.round(r.height));
      var st=document.createElementNS(NS,"style"); st.textContent=SVG_CSS; cl.insertBefore(st, cl.firstChild);
      [].forEach.call(cl.querySelectorAll("[fill^='var(']"),function(e){ e.setAttribute("fill","#E9EEF4"); });
      var img=new Image();
      img.onload=function(){
        var c=document.createElement("canvas"); c.width=W*sc; c.height=(Hh+top)*sc; var x=c.getContext("2d"); x.scale(sc,sc);
        x.fillStyle="#fff"; x.fillRect(0,0,W,top);
        var g=x.createLinearGradient(0,top,W,Hh+top); g.addColorStop(0,"#EAF2FB"); g.addColorStop(1,"#DCE8F5"); x.fillStyle=g; x.fillRect(0,top,W,Hh);
        x.save(); x.beginPath(); x.rect(0,top,W,Hh); x.clip(); x.drawImage(img,0,top,W,Math.round(r.height)); x.restore();
        x.fillStyle="#003047"; x.font="600 18px Aptos, 'Segoe UI', Arial, sans-serif"; x.fillText("Tender Map · "+(sel>=0?NEW[sel][0]:"Toàn quốc")+(selH?" · "+selH.name:""), 16, 26);
        x.fillStyle="#55667D"; x.font="13px Aptos, 'Segoe UI', Arial, sans-serif";
        x.fillText([F.view==="fu"?"Theo dõi thầu":"Kết quả thầu", periodLabel(), srcLabel(), mLabel(), typeLabel()].concat(cmOn()?["tô màu: thị phần MANI"]:[]).join(" · ")+" · xuất "+d2(NOW), 16, 48);
        var lx=W-16; if(F.view!=="fu"){ var items=cmOn() ? [["Hãng khác",SH_O],["MANI",SH_M]] : [["KQTT thị trường",NPP.KQTT.color],["Cả 2 NPP",BOTH],["iCare",NPP.ICARE.color],["Hùng Vĩ",NPP.HUNGVI.color]];
          x.font="12px Aptos, 'Segoe UI', Arial, sans-serif"; items.forEach(function(it){ var w=x.measureText(it[0]).width; lx-=w; x.fillStyle="#55667D"; x.fillText(it[0], lx, 26); lx-=16; x.fillStyle=it[1]; x.fillRect(lx, 16, 11, 11); lx-=14; }); }
        x.strokeStyle="#E6EAEF"; x.beginPath(); x.moveTo(0,top-.5); x.lineTo(W,top-.5); x.stroke();
        c.toBlob(function(b){ if(!b){ toast("Chưa tạo được ảnh bản đồ.", true); return; } var name=fname("png"); save(b, name); toast("Đã tải "+name); }, "image/png");
      };
      img.onerror=function(){ toast("Chưa tạo được ảnh bản đồ.", true); };
      img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(cl));
    }catch(e){ toast("Chưa tạo được ảnh bản đồ: "+e.message, true); }
  }
  return { sheets:sheets, xlsx:xlsx, png:png, toast:toast };
})();

/* ═════════ HƯỚNG DẪN LẦN ĐẦU (nút ? để xem lại) ═════════ */
var TOUR=(function(){
  var K="tm_tour_v1", i=0, L=[], root=null;
  function vis(n){ if(!n) return false; var r=n.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(n).visibility!=="hidden"; }
  function steps(){
    var mob=MQ.matches;
    return [
      {el:"#qs", t:"Tìm bệnh viện, TTYT", x:"Gõ tên không dấu hoặc viết tắt (vd. bv mat nghe an, ttyt anh son)"+(mob?"":" — Ctrl / ⌘ + K để tìm nhanh")+". Chọn 1 cơ sở để xem hợp đồng MANI, hãng khác đang trúng, lịch sử thầu."},
      {el:"#map", t:"Bản đồ trúng thầu", x:"Số trên tỉnh = số gói, màu đậm = giá trị / số lượng cao hơn. Bấm 1 tỉnh để phóng to và xem từng bệnh viện (chấm xám = cơ sở công lập chưa có gói). Quay lại: nút ‹, phím Esc hoặc bấm ra biển."},
      mob ? null : {el:"#va-per", t:"Kỳ và chỉ số", x:"Mặc định là kỳ hiện tại (FY"+FY_NOW+"); bấm để xem theo tuần, tháng, quý hoặc kỳ trước (‹ › chuyển nhanh). Giá trị / Số lượng và VND / USD ở ngay cạnh."},
      {el:"#f-more", t:"Bộ lọc", x: mob ? "Chế độ xem (Kết quả thầu / Theo dõi thầu), kỳ FY / quý, Giá trị / Số lượng, nguồn, hãng, loại sản phẩm và tô màu theo thị phần MANI đều ở đây."
        : "Nguồn (Hùng Vĩ · iCare · KQTT thị trường), hãng, loại sản phẩm, gói trúng / mọi gói, tô màu theo thị phần MANI. Bộ lọc đang bật hiện thành nhãn dưới thanh này — bấm × để bỏ."},
      mob ? null : {el:"#f-view", t:"3 chế độ xem", x:"Kết quả thầu (gói trúng của NPP + KQTT) · Theo dõi thầu (công lập theo giai đoạn thầu, tư nhân theo hợp đồng mua sắm) · Hoạt động (lịch sử chăm sóc khách hàng từ CRM Surgical)."},
      FU.auth() ? {el:"#news", t:"Mới cập nhật", x:"Chuông có số = kết quả thầu mới (file Hùng Vĩ, iCare, KQTT toàn quốc đối chiếu mỗi giờ) và gói bạn đang theo dõi vừa có kết quả. Bấm để xem theo ngày, mở cơ sở, ghi kết quả."} : null,
      mob ? null : {el:"#f-pic", t:"Địa bàn", x: SCOPE.locked() ? "Bạn đang xem địa bàn phụ trách của mình ("+SCOPE.place()+"): bản đồ, gói thầu, theo dõi và hoạt động chỉ trong địa bàn này." : "Cả nhóm · Viet Ha (miền Bắc → Đà Nẵng cũ) · Khang (Quảng Nam cũ → miền Nam): chọn 1 PIC để chỉ xem địa bàn và hoạt động của PIC đó."},
      {el:".side", t:"Bảng chi tiết", x: mob ? "Kéo thanh trên cùng của bảng lên / xuống (hoặc bấm vào) để xem thêm: sản phẩm trúng, bệnh viện dẫn đầu, hợp đồng sắp hết hạn."
        : "Số liệu theo bộ lọc: sản phẩm trúng, bệnh viện dẫn đầu (▲▼ so với kỳ trước, + Theo dõi), hãng trúng, hợp đồng sắp hết hạn."},
      {el:".stabs", t:"Phân tích", x:"Thầu lại: hợp đồng MANI / hãng khác sắp hết hạn, mời thầu dự kiến, tạo gói theo dõi điền sẵn. Giá trúng: MANI so với hãng khác, cơ sở chuyển hãng. Hiệu quả NPP: tỉ lệ trúng theo quý, tỉnh. Dự báo: lượng dao / chỉ khâu mỗi tháng từ hợp đồng còn hiệu lực."},
      mob ? null : {el:"#xbtn", t:"Xuất số liệu", x:"Tải file Excel (số liệu đúng bộ lọc đang chọn) hoặc ảnh bản đồ PNG để gửi / đưa vào báo cáo."},
      {el:mob?"#f-more":"#help", t:"Xem lại hướng dẫn", x: mob ? "Mở Bộ lọc ▸ nút ? để xem lại hướng dẫn này bất cứ lúc nào." : "Bấm ? để xem lại hướng dẫn này bất cứ lúc nào."}
    ].filter(function(x){ return x && vis(document.querySelector(x.el)); });
  }
  function build(){
    end(true);
    root=document.createElement("div"); root.className="tr";
    root.innerHTML='<div class="tr-hl"></div><div class="tr-card" role="dialog" aria-modal="true" aria-labelledby="tr-t"><span class="n" id="tr-n"></span><b id="tr-t"></b><p id="tr-x"></p>'+
      '<div class="ft"><button class="lnk" type="button" data-tr="skip">Bỏ qua</button><span><button class="btn sm" type="button" data-tr="prev">‹ Trước</button> <button class="btn sm pri" type="button" data-tr="next">Tiếp ›</button></span></div></div>';
    document.body.appendChild(root);
    root.addEventListener("click",function(e){ var b=e.target.closest("[data-tr]"); if(!b) return; var k=b.dataset.tr;
      if(k==="skip") end(); else if(k==="prev"){ if(i>0){ i--; show(); } } else if(i<L.length-1){ i++; show(); } else end(); });
  }
  function show(){
    var st=L[i], n=document.querySelector(st.el); if(!root || !n) return end();
    var r=n.getBoundingClientRect(), W=window.innerWidth, H=window.innerHeight, pad=6;
    var x0=Math.max(4,r.left-pad), y0=Math.max(4,r.top-pad), x1=Math.min(W-4,r.right+pad), y1=Math.min(H-4,r.bottom+pad);
    var hl=root.querySelector(".tr-hl"), cd=root.querySelector(".tr-card");
    hl.style.left=x0+"px"; hl.style.top=y0+"px"; hl.style.width=(x1-x0)+"px"; hl.style.height=(y1-y0)+"px";
    root.querySelector("#tr-n").textContent=(i+1)+" / "+L.length; root.querySelector("#tr-t").textContent=st.t; root.querySelector("#tr-x").textContent=st.x;
    root.querySelector('[data-tr="prev"]').disabled = i===0;
    root.querySelector('[data-tr="next"]').textContent = i===L.length-1 ? "Xong" : "Tiếp ›";
    var cw=cd.offsetWidth, ch=cd.offsetHeight, top;
    if(y1+12+ch < H) top=y1+12; else if(y0-12-ch > 0) top=y0-12-ch; else top=Math.max(12, Math.min(H-ch-12, y0+24));
    cd.style.top=top+"px"; cd.style.left=Math.max(12, Math.min(W-cw-12, (x0+x1)/2-cw/2))+"px";
    root.querySelector('[data-tr="next"]').focus();
  }
  function start(){ FD.close(); L=steps(); if(!L.length) return; i=0; build(); show(); }
  function end(silent){ if(root){ root.remove(); root=null; } if(!silent){ try{ localStorage.setItem(K,"1"); }catch(_){} } }
  function auto(){ var seen=null; try{ seen=localStorage.getItem(K); }catch(_){} if(!seen) setTimeout(function(){ if(!root && document.getElementById("fudlg").hidden && !((typeof GATE!=="undefined"&&GATE) && GATE.on())) start(); }, 900); }
  window.addEventListener("resize",function(){ if(root) show(); });
  window.addEventListener("keydown",function(e){ if(!root) return; if(e.key==="Escape"){ end(); e.stopImmediatePropagation(); } else if(e.key==="ArrowRight"){ if(i<L.length-1){ i++; show(); } } else if(e.key==="ArrowLeft"){ if(i>0){ i--; show(); } } }, true);
  return { start:start, auto:auto, end:end, on:function(){ return !!root; } };
})();
document.getElementById("help").onclick=function(){ TOUR.start(); };

/* ═════════ KHỞI ĐỘNG ═════════ */
renderFilters();
placeCtl();
buildMap();
try{ if(localStorage.getItem(LS_KEY+"_old")==="0") G.old.classList.add("off"); }catch(_){}
function useCache(c){ RAW.HUNGVI=c.RAW.HUNGVI||null; RAW.ICARE=c.RAW.ICARE||null; RAW.KQTT=c.RAW.KQTT||null; META.HUNGVI=c.META.HUNGVI; META.ICARE=c.META.ICARE; META.KQTT=c.META.KQTT||null; META.cached=c.at; document.getElementById("load").style.display="none"; }
try{   /* bản đệm cũ ở localStorage (trước 05/11/2026) ⇒ dùng 1 lần, chuyển sang IndexedDB, xoá khỏi localStorage */
  var c=JSON.parse(localStorage.getItem(LS_KEY)||"null");
  if(c && c.RAW){ useCache(c); IDB.set(LS_KEY, c); }
  localStorage.removeItem(LS_KEY);
}catch(_){}
rebuild();
CACHE_NPP.then(function(c){ if(c && c.RAW && !NETDONE && !PKGS.length){ useCache(c); rebuild(); } });
/* ═════════ MÀN HÌNH ĐĂNG NHẬP (người dùng 05/11/2026: đăng nhập ngay khi mở app) ═════════
   Chưa có phiên email công ty ⇒ phủ toàn trang: ảnh bản đồ minh hoạ (tô theo địa bàn 2 PIC, chấm bệnh viện công / tư, vòng cảnh báo)
   + 3 tính năng + ô email / mã 6 số (FU.loginHtml("gate"), Training Hub rhAuthStart / rhAuthVerify).
   Phiên dùng chung Report Hub / CRM (localStorage.mmh_tk) ⇒ đã đăng nhập ở đó thì vào thẳng. Phiên hết hạn / đăng xuất ⇒ hiện lại. */
var GATE=(function(){
  var el=document.getElementById("gate"), on=false;
  function art(){
    var g=document.getElementById("gate-map"); if(!g || g.dataset.done==="1" || !PROV.length) return;
    var x0=px(102.05), x1=px(109.8), y0=py(23.45), y1=py(8.35), h='';
    g.setAttribute("viewBox", x0.toFixed(1)+" "+y0.toFixed(1)+" "+(x1-x0).toFixed(1)+" "+(y1-y0).toFixed(1));
    PROV.forEach(function(P,i){ if(!P) return; var t=TERR[0].ni[i]?TERR[0]:TERR[1], k=[0.2,0.32,0.44,0.27,0.38][(i*7)%5];
      h+='<path d="'+P.el.getAttribute("d")+'" fill="'+mix(t.col,k)+'" stroke="#fff" stroke-width="0.7" vector-effect="non-scaling-stroke"/>'; });
    OLDP.forEach(function(o){ var v=TERR[1].ni[o.n]; if(v && v!==1 && v[o.k] && o.d) h+='<path d="'+o.d+'" fill="'+mix(TERR[1].col,0.38)+'" stroke="#fff" stroke-width="0.7" vector-effect="non-scaling-stroke"/>'; });
    var u=(x1-x0)/420, eye=FAC.filter(function(f){ return f.ll && f.sp==="mat"; });
    eye.forEach(function(f,i){ if(i%2) return; var cx=px(f.ll[0]), cy=py(f.ll[1]), pv=isPv(f);
      h+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+(5*u).toFixed(2)+'" fill="#fff" stroke="'+(pv?PVCOL:"#003047")+'" stroke-width="'+(1.8*u).toFixed(2)+'"/>'; });
    [["Hà Nội",14],["Nghệ An",6],["Đà Nẵng",5],["Hồ Chí Minh",18],["Cần Thơ",7]].forEach(function(o,j){
      var i=NEWIDX[nk(o[0])], P=PROV[i]; if(!P || !P.info.c) return; var c=P.info.c, r=13*u;
      if(j===1||j===4) h+='<circle class="gpl" cx="'+c[0].toFixed(1)+'" cy="'+c[1].toFixed(1)+'" r="'+(r*1.15).toFixed(2)+'" fill="none" stroke="#FF1F5A" stroke-width="'+(2.6*u).toFixed(2)+'"/>';
      h+='<circle cx="'+c[0].toFixed(1)+'" cy="'+c[1].toFixed(1)+'" r="'+r.toFixed(2)+'" fill="#fff" stroke="#003047" stroke-width="'+(2*u).toFixed(2)+'"/>'+
         '<text x="'+c[0].toFixed(1)+'" y="'+(c[1]+4.2*u).toFixed(1)+'" text-anchor="middle" font-size="'+(12*u).toFixed(2)+'" font-weight="700" fill="#003047">'+o[1]+'</text>'; });
    g.innerHTML=h; g.dataset.done="1";
  }
  function paint(){
    if(!on) return;
    var f=document.getElementById("gate-f"); if(!f) return;
    var ae=document.activeElement, keep=ae && f.contains(ae) ? ae.id : "";
    f.innerHTML=FU.loginHtml("gate");
    var nx=document.getElementById(FU.lgStep()==="email" ? "lg-email" : "lg-code");
    if(nx && (keep || !ae || ae===document.body)) nx.focus();
  }
  function show(){ on=true; el.hidden=false; document.body.classList.add("gated"); art(); paint(); }
  function hide(){ if(!on) return; on=false; el.hidden=true; document.body.classList.remove("gated"); }
  function check(){ if(FU.auth()) hide(); else show(); }
  el.addEventListener("click",function(e){ var b=e.target.closest("[data-lg]"); if(!b) return; e.preventDefault(); FU.lgAct(b.dataset.lg); });
  el.addEventListener("keydown",function(e){ if(e.key!=="Enter") return; var t=e.target; if(t.id==="lg-email"){ e.preventDefault(); FU.lgAct("send"); } else if(t.id==="lg-code"){ e.preventDefault(); FU.lgAct("verify"); } });
  FU.onLogin(function(){ hide(); ACT.ensure(); FA.ensure(); NEWS.load(); SCOPE.apply(); TOUR.auto(); });
  return { show:show, hide:hide, check:check, paint:paint, art:art, on:function(){ return on; } };
})();
/* ô tìm cơ sở y tế (Ctrl/⌘ + K) */
(function(){
  var qi=document.getElementById("qs");
  QS.wire(qi, document.getElementById("qsr"), function(f){ qi.value=""; qi.blur(); QS.open(f); });
  window.addEventListener("keydown",function(e){ if((e.ctrlKey||e.metaKey) && (e.key==="k"||e.key==="K")){ e.preventDefault(); qi.focus(); qi.select(); } });
})();
FU.filters();
GATE.check();
if(FU.auth() && SCOPE.terr()){ VB0=homeBox(); setVB(VB0); crumbSet(); renderFilters(); refresh(); }   /* đã có phiên: mở thẳng khung địa bàn */
if(F.view==="fu" || FU.auth()) FU.ensure();
if(F.view==="act" || FU.auth()) ACT.ensure();
FA.ensure();
if(FU.auth()) NEWS.load(); NEWS.badge();
load().then(function(){
  var hp=decodeURIComponent(location.hash.slice(1)).split("/"), h=hp[0], nwq=false;
  try{ nwq=new URLSearchParams(location.search).get("new")==="1"; }catch(_){}
  if(h && nk(h) in NEWIDX){
    var i=NEWIDX[nk(h)], hh=hp[1]&&HOSP.filter(function(x){ return x.ni===i && nk(x.name)===nk(hp[1]); })[0];
    if(!hh && hp[1]){ var ff=(FBYP[i]||[]).filter(function(x){ return nk(x.name)===nk(hp[1]); })[0]; if(ff) hh=hospOf(ff); }
    if(hh) selectHosp(hh,"replace"); else selectProv(i,"replace");
  } else if(nwq && FU.auth()) NEWS.open();                                    /* link thông báo "Mới cập nhật" (?new=1) */
  NEWS.badge();
  TOUR.auto();
});
/* ═════════ CÀI APP (PWA) ═════════ */
(function(){
  var btn=document.getElementById("install"), dlg=document.getElementById("instdlg"), ev=null;
  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
  var ua=navigator.userAgent, ios=/iphone|ipad|ipod/i.test(ua) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
  var inApp=/FBAN|FBAV|Zalo|Instagram|Line\/|; wv\)/i.test(ua);
  if("serviceWorker" in navigator && location.protocol==="https:") navigator.serviceWorker.register("sw.js").catch(function(){});
  if(standalone) return;
  btn.hidden=false;
  window.addEventListener("beforeinstallprompt",function(e){ e.preventDefault(); ev=e; btn.hidden=false; });
  window.addEventListener("appinstalled",function(){ btn.hidden=true; dlg.hidden=true; });
  function help(){
    var b=document.getElementById("inst-b");
    if(ios) b.innerHTML='<ol><li>Mở trang này bằng <b>Safari</b>.</li><li>Bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên) ở thanh dưới.</li><li>Chọn <b>Thêm vào MH chính</b> ▸ <b>Thêm</b>.</li></ol>';
    else b.innerHTML=(inApp?'<p style="margin:0 0 6px">Đang mở trong trình duyệt của ứng dụng khác (Zalo, Facebook…): bấm <b>⋮</b> ▸ <b>Mở bằng Chrome</b> trước.</p>':'')+
      '<ol><li>Bấm <b>⋮</b> ở góc trên bên phải Chrome.</li><li>Chọn <b>Cài đặt ứng dụng</b> (hoặc <b>Thêm vào màn hình chính</b>).</li><li>Bấm <b>Cài đặt</b> — biểu tượng bản đồ Việt Nam xuất hiện ngoài màn hình.</li></ol>';
    dlg.hidden=false; document.getElementById("inst-x").focus();
  }
  btn.onclick=function(){ if(ev){ ev.prompt(); ev.userChoice.then(function(c){ if(c&&c.outcome==="accepted") btn.hidden=true; ev=null; }); } else help(); };
  document.getElementById("inst-x").onclick=function(){ dlg.hidden=true; };
  dlg.addEventListener("click",function(e){ if(e.target===dlg) dlg.hidden=true; });
})();
document.getElementById("reload").onclick=function(){ load(true); if(FU.auth()) ACT.load(); };
/* TỰ CẬP NHẬT: Sales sửa CRM Surgical / NPP cập nhật file thầu / file KQTT đổi ⇒ trang tự đọc lại 5 phút / lần (khi đang mở) và khi quay lại trang sau ≥ 2 phút.
   Không chen ngang khi đang gõ trong bảng bên, đang mở hộp cập nhật hay đang ghim vị trí. */
(function(){
  var last=Date.now();
  function busy(){ var ae=document.activeElement; return (ae && SB.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) || !document.getElementById("fudlg").hidden || ACT.picking() || TOUR.on(); }
  function tick(force){
    if(document.visibilityState!=="visible" || busy()) return;
    if(!force && Date.now()-last<4.5*60000) return;
    last=Date.now(); load(); if(FU.auth()){ FU.load(); ACT.load(); }
  }
  setInterval(function(){ tick(false); }, 60000);
  document.addEventListener("visibilitychange",function(){ if(document.visibilityState==="visible" && Date.now()-last>2*60000) tick(true); });
})();
window.WINMAP={ act:ACT, tour:TOUR, scope:SCOPE, gate:GATE, sheet:SHEET, filters:FD, xp:XP, re:function(){ return reList(); }, fc:function(){ return fcData(); }, sw:function(){ return switchList(); }, setF:function(o){ for(var k in o){ if(k==="type") setType(o[k]); else if(k==="period") setPeriod(o[k]); else F[k]=o[k]; } renderFilters(); refresh(); }, stat:function(i){ return STAT[i]; }, provIx:function(n){ return NEW.map(function(x){ return x[0]; }).indexOf(n); },
  pkgs:function(){ return PKGS; }, fac:function(){ return FAC; }, fu:FU, fa:FA, news:NEWS, qs:QS, hospOf:hospOf, view:function(v){ F.view=v; renderFilters(); if(v==="fu") FU.ensure(); refresh(); }, select:selectProv, hosp:function(n){ var h=HOSP.filter(function(x){ return nk(x.name).indexOf(nk(n))>=0; })[0]; selectHosp(h); return !!h; }, tab:function(t){ TAB=t; renderSide(); }, F:F, refresh:refresh };
})();
