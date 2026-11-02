/* Backend giả lập cho Tender Result (dữ liệu GIẢ, chỉ để kiểm thử / chụp ảnh).
   Dùng: const M=require('./mock'); await M.route(page);  */
function rng(seed){ let s=seed>>>0; return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296); }
const R = rng(42);
const pick = a => a[Math.floor(R()*a.length)];
const BRANDS = [["Mani",.34,190000],["Alcon",.18,320000],["Surgistar",.12,150000],["Kai",.1,120000],["Feather",.08,110000],["Huaiyin",.07,45000],["Sidapharm",.05,60000],["Beaver",.04,260000],["Lotus",.02,38000]];
const PT = [["Slit knife 2.2mm","MSL"],["Slit knife 2.8mm","MSL"],["Stab knife 15°","MST"],["Crescent knife","MCU"],["MVR knife 20G","MST"]];
const PROV = [["Hà Nội","North"],["Hải Phòng","North"],["Nghệ An","North"],["Thanh Hóa","North"],["Đà Nẵng","Central"],["Huế","Central"],["TP. Hồ Chí Minh","South"],["Cần Thơ","South"],["Đồng Nai","South"],["Bình Dương","South"]];
const BUY = ["Bệnh viện Mắt","Bệnh viện Đa khoa tỉnh","Bệnh viện Trung ương","Trung tâm Y tế","Bệnh viện Quân y"];
function brandPick(){ let x=R(),c=0; for(const b of BRANDS){ c+=b[1]; if(x<c) return b; } return BRANDS[0]; }
function rows(){
  const out=[];
  for(let i=0;i<1400;i++){
    const b=brandPick(), pt=pick(PT), pv=pick(PROV);
    const y=2021+Math.floor(R()*6), m=1+Math.floor(R()*12);
    if(y===2026 && m>10) continue;
    const qty=[20,50,100,200,300,500,1000][Math.floor(R()*7)];
    const price=Math.round(b[2]*(0.8+R()*0.4)/1000)*1000;
    out.push({buyer:pick(BUY)+" "+pv[0]+(R()<.3?" "+(1+Math.floor(R()*3)):""),brand:b[0],prov:pv[0],ptype:pt[0],
      tier:"N/A",region:pv[1],method:R()<.7?"Đấu thầu rộng rãi":"Chào hàng cạnh tranh",year:y,month:String(m).padStart(2,"0")+"/"+y,
      kqtt:"IB"+(y%100)+String(100000+i),pname:pt[0]+" "+b[0],pcode:pt[1]+"-"+(100+i%40),tspec:"Lưỡi thép không gỉ, vô trùng",qty,price});
  }
  return out;
}
function npp(name){
  const out=[];
  for(let i=0;i<40;i++){
    const pv=pick(PROV.filter(p=>name==="ICARE"?p[1]!=="North":p[1]==="North"));
    const res=R()<.6?"Win":(R()<.6?"Pending":"Lose");
    const st=Date.UTC(2025,Math.floor(R()*18),1);
    out.push({tbmt:"IB25"+(300000+i)+(name==="ICARE"?"1":"2"),hospital:pick(BUY)+" "+pv[0],city:pv[0],region:pv[1],result:res,
      qty:[100,200,500,800][Math.floor(R()*4)],price:pick([140000,240000,250000]),knifeType:pick(PT)[0],pcodeRaw:pick(PT)[1],
      approveSerial:st,durationMonths:pick([12,12,18,24]),month:""});
  }
  return out;
}
const DATA={ ok:true, rows:rows(), meta:{exported:"02/11/2026 08:00"} };
const NPP={ ICARE:{ok:true,rows:npp("ICARE"),log:{}}, HUNGVI:{ok:true,rows:npp("HUNGVI"),log:{}} };
async function route(page){
  await page.route(/script\.google(usercontent)?\.com/, async r=>{
    const u=r.request().url();
    let body=DATA;
    if(/AKfycbx8xuGa/.test(u)) body=NPP.ICARE;
    else if(/AKfycbyL5FRV/.test(u)) body=NPP.HUNGVI;
    if(r.request().method()==="POST") body={ok:true};
    await r.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(body)});
  });
}
module.exports={route,DATA,NPP};
