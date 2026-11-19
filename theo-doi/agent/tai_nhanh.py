# -*- coding: utf-8 -*-
"""
MMH · TẢI NHANH HỒ SƠ THẦU từ muasamcong.mof.gov.vn
Chạy trên máy Windows ĐÃ CÀI AGENT của muasamcong (Agent cần cho file đính kèm PDF / HSMT).

  Bấm đúp "Tai nhanh ho so thau.bat"  ⇒ mở trang điều khiển http://127.0.0.1:8765
  Dán số TBMT (mỗi dòng 1 số, vd. IB2500491794) ⇒ tích loại file ⇒ Bắt đầu.
  File lưu ở thư mục "Ho so thau\\<Chủ đầu tư>\\<Số TBMT>\\" cạnh file này.

Chạy thử không giao diện:  python tai_nhanh.py --cli IB2500491794 [IB...] [--show] [--browser chromium]

Cách làm (giống người thật, nhưng nhanh):
  1. Mở trang chủ 1 lần / luồng, gỡ popup, gõ số vào ô tìm kiếm (trang tự sinh mã reCAPTCHA — không gọi API trực tiếp được).
  2. Đọc kết quả tìm kiếm (JSON) ⇒ mở thẳng trang chi tiết đúng gói.
  3. Tab Thông báo mời thầu: file đính kèm (Quyết định phê duyệt HSMT…) + nút "Tải TBMT"; tab con "Hồ sơ mời thầu": file HSMT.
     Tab Kết quả lựa chọn nhà thầu: file đính kèm (QĐ phê duyệt KQLCNT, Báo cáo đánh giá…) + mọi nút "Xuất Excel"
     (Danh sách nhà thầu, Danh sách hàng hóa).
  4. File đính kèm: trang gọi Agent http://localhost:1234/api/download/file/browser/public?fileId=… ⇒ công cụ bắt
     yêu cầu đó và tự gọi Agent lấy file (không cần bấm từng file, không hiện hộp lưu).
  Mỗi luồng 1 tab, mặc định 3 luồng song song.
"""
import asyncio, json, os, re, sys, threading, time, webbrowser, urllib.request, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOME = 'https://muasamcong.mof.gov.vn/'
AGENT = 'http://localhost:1234'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, 'Ho so thau')
PORT = 8765
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

STATE = {'running': False, 'jobs': [], 'log': [], 'started': 0}
LOCK = threading.Lock()


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with LOCK:
        STATE['log'].append(line)
        STATE['log'] = STATE['log'][-400:]


def safe(s, n=80):
    s = re.sub(r'[\\/:*?"<>|\r\n\t]+', ' ', str(s or '')).strip()
    return (s[:n].rstrip() or 'Khac')


def job_set(j, **kw):
    with LOCK:
        j.update(kw)


# ───────────────────────── trình duyệt ─────────────────────────
async def close_popups(pg):
    """Bấm nút Đóng / Đã hiểu của popup; không có nút thì gỡ lớp phủ khỏi trang."""
    for _ in range(4):
        r = await pg.evaluate("""() => {
          const big = e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.offsetWidth > innerWidth * 0.6
              && e.offsetHeight > innerHeight * 0.6 && +cs.zIndex >= 50 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
          const ov = [...document.querySelectorAll('body *')].filter(big);
          if (!ov.length) return '';
          for (const o of ov) for (const b of o.querySelectorAll('button,a,[role=button]')) {
            const t = (b.innerText || b.getAttribute('aria-label') || '').trim();
            if (/^(đóng|đóng thông báo|close|bỏ qua|đã hiểu|tôi đã hiểu|ok|x|×|✕)$/i.test(t)) { b.click(); return 'bấm ' + t; }
          }
          ov.forEach(e => e.remove()); document.body.style.overflow = 'auto';
          return 'gỡ lớp phủ';
        }""")
        if not r:
            return
        await pg.wait_for_timeout(300)


async def wait_text(pg, pattern, timeout=20000):
    try:
        await pg.wait_for_function('(src) => new RegExp(src, "i").test(document.body.innerText)', arg=pattern, timeout=timeout)
        return True
    except Exception:
        return False


def agent_up():
    """Agent của muasamcong có đang mở cổng 1234 trên máy không (thử IPv4 rồi IPv6)."""
    import socket
    for host in ('127.0.0.1', '::1'):
        try:
            with socket.create_connection((host, 1234), timeout=2):
                return True
        except OSError:
            pass
    return False


def agent_get(file_id):
    """Gọi Agent trên máy (cổng 1234) lấy nội dung file theo fileId."""
    last = None
    for base in ('http://127.0.0.1:1234', AGENT):
        url = base + '/api/download/file/browser/public?fileId=' + urllib.parse.quote(file_id)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'Origin': 'https://muasamcong.mof.gov.vn'}), timeout=120) as r:
                return r.read(), r.headers.get('Content-Type', ''), r.headers.get('Content-Disposition', '')
        except Exception as e:
            last = e
    raise last


def decode_agent(body, ctype):
    """Agent có thể trả file thô hoặc JSON (base64 / đường dẫn) — xử lý cả 2."""
    if body[:4] in (b'%PDF', b'PK\x03\x04') or 'json' not in (ctype or '').lower():
        return body
    try:
        j = json.loads(body.decode('utf-8', 'ignore'))
    except Exception:
        return body
    stack = [j]
    while stack:
        x = stack.pop()
        if isinstance(x, dict):
            for k, v in x.items():
                if isinstance(v, str) and len(v) > 200 and re.fullmatch(r'[A-Za-z0-9+/=\s]+', v[:400]):
                    import base64
                    try:
                        return base64.b64decode(v)
                    except Exception:
                        pass
                stack.append(v)
        elif isinstance(x, list):
            stack.extend(x)
    return None


def unrar(path):
    """File .rar / .zip (vd. Chương V gói 2023) ⇒ giải nén vào thư mục cùng tên (tar có sẵn trên Windows 10/11). Không được thì giữ file gốc."""
    if not re.search(r'\.(rar|zip|7z)$', path, re.I):
        return
    out = re.sub(r'\.(rar|zip|7z)$', '', path, flags=re.I)
    try:
        import subprocess
        os.makedirs(out, exist_ok=True)
        r = subprocess.run(['tar', '-xf', path, '-C', out], capture_output=True, timeout=120)
        log(f'    giải nén {os.path.basename(path)}: ' + ('xong' if r.returncode == 0 and os.listdir(out) else 'không được (giữ file gốc)'))
    except Exception as e:
        log(f'    giải nén {os.path.basename(path)}: không được ({e})')


async def grab_attachments(pg, folder, tag, j, captured):
    """Bấm từng file đính kèm (thẻ tags-fileAttach) ⇒ bắt fileId mà trang gửi tới Agent ⇒ tự lấy file từ Agent."""
    items = pg.locator('tags.tags-fileAttach:visible, .tags-fileAttach:visible')
    n = await items.count()
    seen = set()
    for i in range(n):
        el = items.nth(i)
        name = safe((await el.inner_text()).strip(), 150)
        if not name or name in seen or re.match(r'(?i)^tải\b', name):
            continue
        seen.add(name)
        if any(os.path.exists(os.path.join(folder, x)) for x in (name, name + '.pdf')):
            log(f'  = {j["no"]}: đã có "{name}" (bỏ qua)')
            continue
        captured.clear()
        try:
            await el.click(timeout=5000)
        except Exception:
            pass
        for _ in range(30):
            if captured:
                break
            await pg.wait_for_timeout(100)
        await close_popups(pg)
        if not captured:
            log(f'  ! {j["no"]}: không bắt được mã file "{name}"')
            continue
        fid = captured[-1]
        try:
            body, ct, cd = await asyncio.to_thread(agent_get, fid)
            data = decode_agent(body, ct)
            if not data:
                with open(os.path.join(folder, name + '.agent.json'), 'wb') as f:
                    f.write(body)
                log(f'  ? {j["no"]}: Agent trả dữ liệu lạ cho "{name}" — đã lưu .agent.json để kiểm')
                continue
            if not os.path.splitext(name)[1]:
                name += '.pdf' if data[:4] == b'%PDF' else ''
            with open(os.path.join(folder, name), 'wb') as f:
                f.write(data)
            unrar(os.path.join(folder, name))
            j['files'].append(name)
            j.setdefault('tags', {})[name] = tag
            log(f'  ⬇ {j["no"]} · {tag}: {name} ({len(data) // 1024} KB)')
        except Exception as e:
            j['errors'].append(f'{name}: Agent — {e}')
            with open(os.path.join(folder, 'CHUA_TAI_DUOC.txt'), 'a', encoding='utf-8') as f:
                f.write(f'{name}\t{e}\n')
            log(f'  ✗ {j["no"]}: Agent không trả file "{name}" ({e}). Mở Agent của muasamcong rồi chạy lại (chỉ tải phần còn thiếu).')


async def click_downloads(pg, folder, labels, j, tag):
    """Bấm các nút tạo file ngay trên trình duyệt (Xuất Excel, Tải TBMT) ⇒ lưu file tải về."""
    for lb in labels:
        btns = pg.locator(f':is(a,button):text-is("{lb}"):visible')
        for k in range(await btns.count()):
            b = btns.nth(k)
            try:
                await b.scroll_into_view_if_needed(timeout=3000)
                async with pg.expect_download(timeout=40000) as dl:
                    await b.click(timeout=5000)
                d = await dl.value
                name = safe(d.suggested_filename, 150)
                await d.save_as(os.path.join(folder, name))
                j['files'].append(name)
                j.setdefault('tags', {})[name] = tag
                log(f'  ⬇ {j["no"]} · {tag}: {name}')
            except Exception as e:
                log(f'  · {j["no"]}: nút "{lb}" #{k + 1} không ra file ({str(e).splitlines()[0][:80]})')
            await close_popups(pg)


async def search_open(pg, no):
    """Gõ số vào ô tìm kiếm trang chủ ⇒ mở trang chi tiết của đúng gói. Trả (url, chủ đầu tư, tên gói) hoặc None."""
    bare = re.sub(r'-\d+$', '', no.strip().upper())
    if 'muasamcong' not in pg.url or 'render=detail' in pg.url:
        await pg.goto(HOME, wait_until='domcontentloaded', timeout=90000)
    await pg.wait_for_selector('input[placeholder*="IB000202"]:visible', timeout=30000)
    await close_popups(pg)
    if bare.startswith('PL'):
        try:
            await pg.locator('label:has-text("KHLCNT"):visible').first.click(timeout=3000)
        except Exception:
            pass
    box = pg.locator('input[placeholder*="IB000202"]:visible').first
    await box.fill(bare)
    async with pg.expect_response(lambda r: '/smart/search?token' in r.url and bare in (r.request.post_data or ''), timeout=45000) as rinfo:
        await box.press('Enter')
    res = await rinfo.value
    try:
        items = (await res.json())['page']['content']
    except Exception:
        items = []
    hit = next((x for x in items if str(x.get('notifyNo', '')).upper().startswith(bare) or str(x.get('planNo', '')).upper().startswith(bare)), items[0] if items else None)
    if not hit:
        return None
    link = pg.locator('a[href*="render=detail"]').first
    await link.wait_for(timeout=20000)
    href = await link.get_attribute('href')
    if href and href.startswith('/'):
        href = 'https://muasamcong.mof.gov.vn' + href
    inv = hit.get('investorName') or hit.get('procuringEntityName') or ''
    name = hit.get('bidName') or hit.get('planName') or ''
    if isinstance(name, list):
        name = name[0] if name else ''
    await pg.goto(href, wait_until='domcontentloaded', timeout=90000)
    return href, inv, name


async def do_job(pg, j, opts, captured):
    job_set(j, status='Đang tìm', files=[], errors=[], t0=time.time())
    r = await search_open(pg, j['no'])
    if not r:
        job_set(j, status='Không tìm thấy', t1=time.time())
        log(f'✗ {j["no"]}: không tìm thấy trên muasamcong')
        return
    url, inv, name = r
    await wait_text(pg, 'Mã TBMT|Mã KHLCNT', 30000)
    await close_popups(pg)
    if not inv:
        try:
            inv = await pg.evaluate("""() => { const t = document.body.innerText; const m = t.match(/Chủ đầu tư\\s*\\n?\\s*([^\\n]+)/); return m ? m[1].trim() : ''; }""")
        except Exception:
            inv = ''
    folder = os.path.join(OUT_DIR, safe(inv or 'Chu dau tu'), safe(j['no']))
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, 'link.url'), 'w', encoding='utf-8') as f:
        f.write('[InternetShortcut]\nURL=' + url + '\n')
    job_set(j, status='Đang tải', investor=inv, name=name, folder=folder)

    if opts.get('tbmt', True):
        await grab_attachments(pg, folder, 'TBMT', j, captured)
        await click_downloads(pg, folder, ['Tải TBMT'], j, 'TBMT')
        if opts.get('hsmt', True):
            try:
                await pg.locator(':is(a,button,li,span,div):text-is("Hồ sơ mời thầu"):visible').last.click(timeout=5000)
                await pg.wait_for_timeout(1500)
                await close_popups(pg)
                await grab_attachments(pg, folder, 'HSMT', j, captured)
            except Exception:
                pass
    if opts.get('kq', True):
        tab = pg.locator(':is(a,button,li,span,[role=tab]):text-is("Kết quả lựa chọn nhà thầu"):visible').last
        if await tab.count():
            try:
                await tab.click(timeout=8000)
            except Exception:
                await close_popups(pg)
                await tab.click(timeout=8000)
            await wait_text(pg, 'Quyết định phê duyệt|Xuất Excel', 25000)
            await pg.wait_for_timeout(800)
            await close_popups(pg)
            await grab_attachments(pg, folder, 'KQ', j, captured)
            await click_downloads(pg, folder, ['Xuất Excel'], j, 'KQ')
        else:
            log(f'  · {j["no"]}: chưa có tab Kết quả lựa chọn nhà thầu')
    job_set(j, status='Xong' if j['files'] else 'Không có file', t1=time.time())
    log(f'✓ {j["no"]}: {len(j["files"])} file · {round(time.time() - j["t0"])} giây · {folder}')


async def worker(ctx, queue, opts):
    pg = await ctx.new_page()
    captured = []

    async def on_route(route):
        m = re.search(r'fileId=([\w-]+)', route.request.url)
        if m:
            captured.append(m.group(1))
        await route.fulfill(status=200, content_type='application/json', body='{}')   # công cụ tự gọi Agent ⇒ trang không tải lần 2

    await pg.route(re.compile(r'^https?://(localhost|127\.0\.0\.1):1234/.*'), on_route)
    while True:
        try:
            j = queue.get_nowait()
        except asyncio.QueueEmpty:
            break
        for attempt in (1, 2):
            try:
                await do_job(pg, j, opts, captured)
                break
            except Exception as e:
                msg = str(e).splitlines()[0][:160]
                log(f'  ! {j["no"]} lần {attempt}: {msg}')
                job_set(j, status='Lỗi', error=msg)
                try:
                    await pg.goto(HOME, wait_until='domcontentloaded', timeout=90000)
                except Exception:
                    pass
    await pg.close()


async def run(nos, opts):
    from playwright.async_api import async_playwright
    if not agent_up():
        log('⚠ CHƯA THẤY AGENT CỦA MUASAMCONG (cổng 1234 đóng). Hãy mở "VNeGP Client Agent" — công cụ chờ tối đa 10 phút…')
        for _ in range(120):
            await asyncio.sleep(5)
            if agent_up():
                break
        log('✓ Agent đã chạy.' if agent_up() else '⚠ Vẫn chưa thấy Agent: chỉ tải được file Excel; file PDF / Word đính kèm sẽ báo lỗi.')
    with LOCK:
        STATE['running'] = True
        STATE['started'] = time.time()
        STATE['jobs'] = [{'no': n, 'status': 'Chờ', 'files': [], 'errors': []} for n in nos]
        jobs = list(STATE['jobs'])
    q = asyncio.Queue()
    for j in jobs:
        q.put_nowait(j)
    async with async_playwright() as p:
        kw = {'headless': not opts.get('show')}
        br = opts.get('browser') or 'chrome'
        b = None
        # 'auto' (máy tải Agent): Chromium riêng của playwright trước ⇒ không đụng Chrome / Edge người dùng đang mở
        for ch in (['chromium', 'msedge', 'chrome'] if br == 'auto' else [br] if br == 'chromium' else [br, 'msedge', 'chromium']):
            try:
                b = await p.chromium.launch(**kw) if ch == 'chromium' else await p.chromium.launch(channel=ch, **kw)
                log(f'Mở trình duyệt: {ch}')
                break
            except Exception as e:
                log(f'  (không mở được {ch}: {str(e).splitlines()[0][:100]})')
        if not b:
            log('✗ Không mở được trình duyệt. Cài Google Chrome hoặc chạy: python -m playwright install chromium')
            with LOCK:
                STATE['running'] = False
            return
        ctx = await b.new_context(locale='vi-VN', accept_downloads=True, viewport={'width': 1440, 'height': 900}, user_agent=UA)
        n = max(1, min(int(opts.get('par') or 3), 6, len(jobs)))
        async def staggered(i):
            await asyncio.sleep(i * 4)          # các luồng tìm kiếm lệch nhau ⇒ không tranh mã reCAPTCHA
            await worker(ctx, q, opts)
        await asyncio.gather(*[staggered(i) for i in range(n)])
        await b.close()
    took = round(time.time() - STATE['started'])
    log(f'═ Xong {len(jobs)} gói trong {took} giây. Thư mục: {OUT_DIR}')
    with LOCK:
        STATE['running'] = False


# ───────────────────────── trang điều khiển ─────────────────────────
PAGE = r"""<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tải nhanh hồ sơ thầu · MMH</title><style>
body{font-family:Aptos,'Segoe UI',system-ui,sans-serif;background:#F4F7FB;color:#0F2537;margin:0}
.w{max-width:1100px;margin:0 auto;padding:18px}h1{font-size:20px;color:#003047;margin:0 0 4px}.sub{color:#55667D;font-size:13px;margin-bottom:14px}
.card{background:#fff;border:1px solid #E6EAEF;border-radius:12px;padding:14px 16px;margin-bottom:14px}
textarea{width:100%;box-sizing:border-box;height:120px;border:1px solid #C3CDD8;border-radius:8px;padding:8px;font:13px ui-monospace,Consolas,monospace}
label{margin-right:14px;font-size:13.5px}button{background:#3A5CAA;color:#fff;border:0;border-radius:8px;padding:8px 18px;font-weight:600;cursor:pointer}
button[disabled]{opacity:.5}table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid #E6EAEF;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#F0F7FF;color:#003047}.ok{color:#2E7D32;font-weight:600}.bad{color:#B42318;font-weight:600}.run{color:#3A5CAA;font-weight:600}
pre{background:#0F2537;color:#E6EAEF;border-radius:8px;padding:10px;max-height:260px;overflow:auto;font-size:12px;margin:0}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px}.n{font-size:12px;color:#5F6E84}
</style></head><body><div class="w"><h1>Tải nhanh hồ sơ thầu</h1>
<div class="sub">Dán số TBMT (mỗi dòng 1 số, vd. IB2500491794) ⇒ Bắt đầu. Máy tự vào đúng gói trên muasamcong và tải file. Cần Agent của muasamcong đang chạy để tải file PDF đính kèm.</div>
<div class="card"><textarea id="nos" placeholder="IB2500491794&#10;IB2600555387"></textarea>
<div class="row"><label><input type="checkbox" id="tbmt" checked> Thông báo mời thầu (QĐ, Tải TBMT)</label><label><input type="checkbox" id="hsmt" checked> Hồ sơ mời thầu</label>
<label><input type="checkbox" id="kq" checked> Kết quả (QĐ, báo cáo, Excel hàng hóa + nhà thầu)</label></div>
<div class="row"><label>Số gói chạy cùng lúc <select id="par"><option>1</option><option>2</option><option selected>3</option><option>4</option><option>5</option></select></label>
<label><input type="checkbox" id="show"> Hiện cửa sổ trình duyệt</label><button id="go">Bắt đầu</button><span class="n" id="out"></span></div></div>
<div class="card"><table><thead><tr><th>Số</th><th>Chủ đầu tư · Gói</th><th>Trạng thái</th><th>File</th><th>Giây</th></tr></thead><tbody id="tb"></tbody></table></div>
<div class="card"><pre id="log"></pre></div></div><script>
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
$('go').onclick=async()=>{const nos=[...new Set(($('nos').value.match(/(IB|PL)\d{8,12}(-\d+)?/gi)||[]).map(s=>s.toUpperCase()))];
 if(!nos.length){alert('Chưa có số TBMT hợp lệ (IB… hoặc PL…)');return;}
 const o={nos,tbmt:$('tbmt').checked,hsmt:$('hsmt').checked,kq:$('kq').checked,par:+$('par').value,show:$('show').checked};
 const r=await fetch('/start',{method:'POST',body:JSON.stringify(o)}).then(r=>r.json()); if(!r.ok) alert(r.error||'Chưa chạy được');};
async function tick(){try{const s=await fetch('/status').then(r=>r.json());$('go').disabled=s.running;
 $('out').textContent=s.running?'Đang chạy…':(s.jobs.length?'Xong. Thư mục: '+s.out:'Thư mục lưu: '+s.out);
 $('tb').innerHTML=s.jobs.map(j=>{const t=j.t1&&j.t0?Math.round(j.t1-j.t0):(j.t0?Math.round(Date.now()/1000-j.t0):'');
  const c=/Xong/.test(j.status)?'ok':/Lỗi|Không/.test(j.status)?'bad':'run';
  return `<tr><td>${esc(j.no)}</td><td>${esc(j.investor||'')}<br><span class="n">${esc(j.name||'')}</span></td><td class="${c}">${esc(j.status)}${j.error?'<br><span class=n>'+esc(j.error)+'</span>':''}</td><td>${(j.files||[]).map(esc).join('<br>')}</td><td>${t}</td></tr>`}).join('');
 const L=$('log'),b=L.scrollTop+L.clientHeight>=L.scrollHeight-5;L.textContent=s.log.join('\n');if(b)L.scrollTop=L.scrollHeight;}catch(e){} setTimeout(tick,1000);}
tick();</script></body></html>"""


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _j(self, o, code=200):
        b = json.dumps(o, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if self.path.startswith('/status'):
            with LOCK:
                return self._j({'running': STATE['running'], 'jobs': STATE['jobs'], 'log': STATE['log'][-200:], 'out': OUT_DIR})
        b = PAGE.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        if self.path != '/start':
            return self._j({'ok': False}, 404)
        if STATE['running']:
            return self._j({'ok': False, 'error': 'Đang chạy, chờ xong lượt này.'})
        o = json.loads(self.rfile.read(int(self.headers.get('Content-Length') or 0)) or b'{}')
        nos = [n for n in o.get('nos', []) if re.fullmatch(r'(IB|PL)\d{8,12}(-\d+)?', n)]
        if not nos:
            return self._j({'ok': False, 'error': 'Chưa có số hợp lệ.'})
        with LOCK:
            STATE['log'] = []
        threading.Thread(target=lambda: asyncio.run(run(nos, o)), daemon=True).start()
        return self._j({'ok': True, 'n': len(nos)})


# ───────────────────────── đẩy lên GitHub ─────────────────────────
GH_CFG = os.path.join(os.environ.get('LOCALAPPDATA') or os.path.expanduser('~'), 'MMH_Agent', 'github.json')


def gh_setup():
    """Hỏi 1 lần: kho GitHub + token (fine-grained, chỉ kho đó, quyền Contents: Read and write). Kiểm token NGAY, sai thì cho dán lại.
    Lưu trên máy (%LOCALAPPDATA%\\MMH_Agent\\github.json), KHÔNG nằm trong thư mục công cụ."""
    c = gh_cfg()
    repo = input(f'Kho GitHub (Enter = {c.get("repo") or "ManiMedicalHanoi/tender-docs"}): ').strip() or c.get('repo') or 'ManiMedicalHanoi/tender-docs'
    for _ in range(5):
        print('Dán token GitHub (bấm chuột phải hoặc Ctrl+V, token bắt đầu bằng github_pat_), rồi Enter:')
        tok = re.sub(r'[\s"\'<>]', '', input('> '))
        if not tok:
            continue
        if not tok.startswith(('github_pat_', 'ghp_')):
            print(f'  ! Chuỗi vừa dán không giống token GitHub (bắt đầu bằng "{tok[:6]}…", dài {len(tok)} ký tự). Copy lại token rồi dán.')
            continue
        st, me = gh_api({'repo': repo, 'token': tok}, 'GET', '')
        if st == 200:
            perm = (me.get('permissions') or {})
            os.makedirs(os.path.dirname(GH_CFG), exist_ok=True)
            with open(GH_CFG, 'w', encoding='utf-8') as f:
                json.dump({'repo': repo, 'token': tok, 'branch': me.get('default_branch') or 'main'}, f)
            print(f'✓ Token dùng được với kho {repo}' + ('' if perm.get('push', True) else ' (CHƯA có quyền ghi: sửa token ▸ Contents: Read and write)') + '. Đã lưu ở', GH_CFG)
            return
        print({401: '  ! 401: token sai / hết hạn / đã xoá. Tạo token mới rồi dán lại.',
               403: '  ! 403: token chưa được tổ chức duyệt hoặc thiếu quyền. Nhờ chủ tổ chức duyệt (Settings ▸ Personal access tokens ▸ Pending requests).',
               404: '  ! 404: token chưa được chọn kho này (Repository access ▸ Only select repositories ▸ ' + repo.split('/')[-1] + ').'}.get(st, f'  ! Lỗi {st}: {me.get("message", "")}'))
    print('Chưa lưu được token. Chạy lại "Cai dat GitHub.bat" khi đã có token đúng.')


def gh_cfg():
    try:
        with open(GH_CFG, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def gh_api(c, method, path, body=None):
    req = urllib.request.Request('https://api.github.com/repos/' + c['repo'] + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + c['token'], 'Accept': 'application/vnd.github+json',
                                          'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'mmh-tai-nhanh'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b'{}')
        except Exception:
            return e.code, {}


def gh_push(root=None):
    """Đẩy mọi file trong "Ho so thau" lên kho GitHub (thư mục ho-so/…). File không đổi thì bỏ qua."""
    import base64, hashlib
    c = gh_cfg()
    if not c.get('repo') or not c.get('token'):
        print('Chưa cài GitHub: chạy "Cai dat GitHub.bat" (hoặc python tai_nhanh.py --setup-github).')
        return False
    st, me = gh_api(c, 'GET', '')
    if st != 200:
        print(f'Không vào được kho {c["repo"]} (mã {st}: {me.get("message", "")}). ' + ('Token sai / hết hạn: chạy lại "Cai dat GitHub.bat" và dán token mới.' if st == 401 else 'Kiểm tra token đã được duyệt và chọn đúng kho.'))
        return False
    root = root or OUT_DIR
    n = up = skip = bad = 0
    for d, _, fs in os.walk(root):
        for fn in sorted(fs):
            p = os.path.join(d, fn)
            rel = 'ho-so/' + os.path.relpath(p, root).replace(os.sep, '/')
            data = open(p, 'rb').read()
            n += 1
            if len(data) > 95 * 1024 * 1024:
                print('  ! quá lớn, bỏ qua:', rel); bad += 1; continue
            blob = hashlib.sha1(b'blob %d\0' % len(data) + data).hexdigest()
            q = '/contents/' + urllib.parse.quote(rel) + '?ref=' + c.get('branch', 'main')
            st, cur = gh_api(c, 'GET', q)
            sha = cur.get('sha') if st == 200 and isinstance(cur, dict) else None
            if sha == blob:
                skip += 1; continue
            body = {'message': 'Tải hồ sơ: ' + rel, 'content': base64.b64encode(data).decode(), 'branch': c.get('branch', 'main')}
            if sha:
                body['sha'] = sha
            st, r = gh_api(c, 'PUT', '/contents/' + urllib.parse.quote(rel), body)
            if st in (200, 201):
                up += 1; print('  ↑', rel)
            else:
                bad += 1; print(f'  ✗ {rel}: mã {st} {r.get("message", "")}')
    print(f'GitHub {c["repo"]}: {n} file · đẩy mới {up} · không đổi {skip} · lỗi {bad}')
    return bad == 0


def main():
    args = sys.argv[1:]
    if '--setup-github' in args:
        gh_setup(); return
    if '--push' in args:
        gh_push(); return
    if '--cli' in args:
        nos = [a.upper() for a in args if re.fullmatch(r'(?i)(IB|PL)\d{8,12}(-\d+)?', a)]
        br = args[args.index('--browser') + 1] if '--browser' in args else 'chrome'
        asyncio.run(run(nos, {'show': '--show' in args, 'browser': br, 'par': 3}))
        if gh_cfg().get('token'):
            log('Đẩy hồ sơ lên GitHub…')
            gh_push()
        return
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), H)
    url = f'http://127.0.0.1:{PORT}/'
    print('Trang điều khiển:', url, '— đóng cửa sổ này để tắt công cụ.')
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    srv.serve_forever()


if __name__ == '__main__':
    main()
