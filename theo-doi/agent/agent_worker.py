# -*- coding: utf-8 -*-
"""
MMH · MÁY TẢI FILE "CẦN AGENT" (Theo dõi gói thầu)
Chạy ngầm trên máy tính Windows ĐÃ CÀI VNeGP Client Agent của muasamcong (http://localhost:1234).

Cứ 2 phút hỏi máy chủ (app Theo dõi gói thầu) xem còn tài liệu nào "cần Agent" (QĐ phê duyệt, Báo cáo đánh giá,
HSMT, Biên bản mở thầu…) ⇒ lấy file qua Agent ⇒ gửi lên máy chủ (máy chủ tự đổi tên, đưa vào đúng thư mục Drive của gói
+ Sheet tổng hợp) ⇒ XOÁ file tạm trên máy ngay. Không lưu lại gì trên máy.

  1. Gọi thẳng Agent (kèm Origin muasamcong) — nhanh, không mở trình duyệt.
  2. Không được ⇒ mở 1 Chrome ẨN (không hiện cửa sổ) vào trang muasamcong, để chính trang gọi Agent, lấy dữ liệu, đóng Chrome.
     (cần thư viện playwright — bộ cài tự cài; dùng Chrome / Edge sẵn có trên máy, không tải trình duyệt khác)

Cài đặt: bấm đúp "Cai dat may tai Agent.bat" (hỏi khoá bot 1 lần, tự chạy mỗi khi mở máy).
Dòng lệnh:  python agent_worker.py --setup | --once | --status
Thư mục làm việc: %LOCALAPPDATA%\\MMH_Agent (cấu hình, nhật ký log.txt). File tạm: %TEMP%\\MMH_Agent (xoá ngay sau khi gửi).
"""
import base64, json, mimetypes, os, socket, sys, time, urllib.error, urllib.parse, urllib.request, shutil, traceback

VER = '1.0'
API = os.environ.get('WT_URL') or 'https://script.google.com/macros/s/AKfycbwv3R7EACqtt3pQZfMWRQFilC4E0W7td8Z8xWxQW6P7UckqFjWFJSFxcOWBZknHplhQuQ/exec'
AGENT = os.environ.get('WT_AGENT_URL') or 'http://localhost:1234'
HOME = 'https://muasamcong.mof.gov.vn/'
ORIGIN = 'https://muasamcong.mof.gov.vn'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
BASE = os.environ.get('MMH_AGENT_HOME') or os.path.join(os.environ.get('LOCALAPPDATA') or os.path.expanduser('~'), 'MMH_Agent')
TMP = os.environ.get('MMH_AGENT_TMP') or os.path.join(os.environ.get('TEMP') or os.environ.get('TMP') or BASE, 'MMH_Agent')
CFG = os.path.join(BASE, 'config.json')
LOG = os.path.join(BASE, 'log.txt')
STOP = os.path.join(BASE, 'STOP')
IDLE = int(os.environ.get('MMH_AGENT_IDLE') or 120)     # giây nghỉ khi không có việc
PORT_LOCK = 8767                                          # chỉ 1 bản chạy cùng lúc
MAX_BYTES = 35 * 1024 * 1024


def log(msg):
    line = time.strftime('%Y-%m-%d %H:%M:%S ') + str(msg)
    try:
        print(line, flush=True)
    except Exception:
        pass
    try:
        os.makedirs(BASE, exist_ok=True)
        if os.path.exists(LOG) and os.path.getsize(LOG) > 1024 * 1024:
            os.replace(LOG, LOG + '.old')
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except Exception:
        pass


def cfg_load():
    try:
        with open(CFG, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def cfg_save(c):
    os.makedirs(BASE, exist_ok=True)
    with open(CFG, 'w', encoding='utf-8') as f:
        json.dump(c, f, ensure_ascii=False, indent=1)


# ───────────────────────── máy chủ (Apps Script) ─────────────────────────
def call(action, params, post=False, timeout=120):
    c = cfg_load()
    data = dict(params or {})
    data.update({'action': action, 'key': c.get('key', ''), 'worker': socket.gethostname()[:60]})
    url = c.get('url') or API
    if post:
        body = urllib.parse.urlencode(data).encode('utf-8')
        req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA})
    else:
        req = urllib.request.Request(url + '?' + urllib.parse.urlencode(data), headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:   # Apps Script trả 302 ⇒ urllib tự theo (POST đổi sang GET, đúng cách Apps Script)
        txt = r.read().decode('utf-8', 'replace')
    try:
        return json.loads(txt)
    except Exception:
        raise RuntimeError('Máy chủ trả lời không đúng dạng: ' + txt[:160])


# ───────────────────────── Agent ─────────────────────────
def agent_alive():
    """Agent có đang chạy không (cổng 1234 mở)."""
    u = urllib.parse.urlparse(AGENT)
    try:
        with socket.create_connection((u.hostname or 'localhost', u.port or 1234), timeout=3):
            return True
    except OSError:
        return False


def _unwrap(buf, ctype):
    """Agent trả thẳng file; nếu lại trả JSON có base64 thì giải ra."""
    head = buf[:1]
    if head in (b'{', b'[') and ('json' in (ctype or '') or len(buf) < 50 * 1024 * 1024):
        try:
            j = json.loads(buf.decode('utf-8'))
        except Exception:
            return buf
        if isinstance(j, dict):
            res = j.get('result') if isinstance(j.get('result'), dict) else {}
            for k in ('data', 'content', 'file', 'base64', 'fileContent'):
                v = j.get(k) or res.get(k)
                if isinstance(v, str) and len(v) > 100:
                    try:
                        return base64.b64decode(v)
                    except Exception:
                        pass
            raise RuntimeError('Agent trả lời: ' + json.dumps(j, ensure_ascii=False)[:160])
    return buf


def get_direct(file_id):
    url = AGENT + '/api/download/file/browser/public?fileId=' + urllib.parse.quote(str(file_id))
    req = urllib.request.Request(url, headers={'Origin': ORIGIN, 'Referer': HOME, 'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=180) as r:
        buf = r.read(MAX_BYTES + 1)
        ctype = r.headers.get('Content-Type', '')
    if len(buf) > MAX_BYTES:
        raise RuntimeError('file lớn hơn 35 MB')
    buf = _unwrap(buf, ctype)
    if len(buf) < 100:
        raise RuntimeError('Agent trả về dữ liệu rỗng')
    return buf, ctype


class HiddenChrome:
    """Chrome / Edge ẩn mở trang muasamcong ⇒ chính trang gọi Agent (đúng như người dùng bấm tải). Mở khi cần, đóng sau mỗi lượt."""
    def __init__(self):
        self.pw = self.br = self.pg = None

    def page(self):
        if self.pg:
            return self.pg
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        last = None
        for ch in ('chrome', 'msedge', None):
            try:
                self.br = self.pw.chromium.launch(headless=True, channel=ch) if ch else self.pw.chromium.launch(headless=True)
                break
            except Exception as e:
                last = e
        if not self.br:
            raise RuntimeError('không mở được Chrome / Edge ẩn: ' + str(last)[:120])
        ctx = self.br.new_context(locale='vi-VN', user_agent=UA, accept_downloads=False)
        self.pg = ctx.new_page()
        self.pg.goto(HOME, wait_until='domcontentloaded', timeout=60000)
        return self.pg

    def get(self, file_id):
        pg = self.page()
        r = pg.evaluate("""async (u) => {
            const r = await fetch(u); const ct = r.headers.get('content-type') || '';
            if (!r.ok) return { err: 'HTTP ' + r.status };
            const b = new Uint8Array(await r.arrayBuffer()); let s = '';
            for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768));
            return { b64: btoa(s), ct };
        }""", AGENT + '/api/download/file/browser/public?fileId=' + urllib.parse.quote(str(file_id)))
        if r.get('err'):
            raise RuntimeError('Chrome ẩn: ' + r['err'])
        buf = _unwrap(base64.b64decode(r['b64']), r.get('ct'))
        if len(buf) < 100:
            raise RuntimeError('Chrome ẩn: dữ liệu rỗng')
        return buf, r.get('ct', '')

    def close(self):
        for x in (self.br, self.pw):
            try:
                x and (x.close() if x is self.br else x.stop())
            except Exception:
                pass
        self.pw = self.br = self.pg = None


def fetch_file(file_id, chrome):
    try:
        return get_direct(file_id)
    except Exception as e1:
        try:
            import playwright  # noqa: F401
        except Exception:
            raise RuntimeError(str(e1))
        log('   gọi thẳng Agent không được (%s) ⇒ thử Chrome ẩn' % str(e1)[:100])
        return chrome.get(file_id)


# ───────────────────────── 1 lượt ─────────────────────────
def clean_tmp():
    try:
        shutil.rmtree(TMP, ignore_errors=True)
    except Exception:
        pass


def safe(s):
    return ''.join('_' if ch in '\\/:*?"<>|\r\n\t' else ch for ch in str(s or '')).strip()[:120] or 'file'


def one_round():
    alive = agent_alive()
    d = call('botAgentList', {'agent': '1' if alive else '0'})
    if not d.get('ok'):
        raise RuntimeError(d.get('error') or 'máy chủ từ chối')
    items = d.get('items') or []
    if not items:
        return 0
    if not alive:
        log('Có %d tài liệu cần tải nhưng Agent chưa chạy (mở VNeGP Client Agent trên máy này).' % d.get('n', 0))
        return 0
    done = 0
    chrome = HiddenChrome()
    os.makedirs(TMP, exist_ok=True)
    try:
        for it in items:
            for f in it.get('files') or []:
                if os.path.exists(STOP):
                    return done
                name = f.get('name') or 'file.pdf'
                tmp = os.path.join(TMP, safe(it.get('no')) + ' - ' + safe(name))
                log('%s · %s' % (it.get('no'), name))
                try:
                    buf, ctype = fetch_file(f.get('fileId'), chrome)
                    with open(tmp, 'wb') as fh:            # lưu tạm ⇒ gửi ⇒ xoá ngay
                        fh.write(buf)
                    with open(tmp, 'rb') as fh:
                        b64 = base64.b64encode(fh.read()).decode('ascii')
                    mime = (ctype or '').split(';')[0].strip()
                    if not mime or 'json' in mime or 'octet' in mime:
                        mime = mimetypes.guess_type(name)[0] or 'application/octet-stream'
                    r = call('botAgentPut', {'hit': it.get('hit'), 'orig': name, 'name': name, 'mime': mime, 'b64': b64}, post=True, timeout=300)
                    if r.get('ok'):
                        done += 1
                        log('   ✓ đã đưa lên Drive: %s (%d KB)' % (r.get('name') or name, len(buf) // 1024))
                    else:
                        log('   ! máy chủ chưa nhận: %s' % r.get('error'))
                except Exception as e:
                    log('   ! lỗi: %s' % str(e)[:200])
                    try:
                        call('botAgentPut', {'hit': it.get('hit'), 'orig': name, 'err': str(e)[:200]}, post=True)
                    except Exception:
                        pass
                finally:
                    try:
                        os.remove(tmp)
                    except OSError:
                        pass
    finally:
        chrome.close()
        clean_tmp()
    return done


# ───────────────────────── chạy ─────────────────────────
def setup():
    print('MMH · Máy tải file cần Agent (v%s)' % VER)
    c = cfg_load()
    key = os.environ.get('WT_BOT_KEY') or ''
    if not key:
        print('Khoá bot: mở app Theo dõi gói thầu ▸ tên tài khoản ▸ Cài đặt bot ▸ sao chép khoá.')
        key = input('Dán khoá bot rồi bấm Enter%s: ' % (' (để trống = giữ khoá cũ)' if c.get('key') else '')).strip() or c.get('key', '')
    if not key:
        print('Chưa có khoá — dừng.'); return 1
    c['key'] = key
    cfg_save(c)
    try:
        d = call('botAgentList', {'agent': '1' if agent_alive() else '0'})
    except Exception as e:
        print('Không kết nối được máy chủ: %s' % e); return 1
    if not d.get('ok'):
        print('Máy chủ từ chối: %s' % (d.get('error') or d)); return 1
    print('✓ Kết nối máy chủ được. Đang có %d tài liệu cần Agent.' % d.get('n', 0))
    print('✓ Agent trên máy: %s' % ('ĐANG CHẠY' if agent_alive() else 'CHƯA CHẠY — mở VNeGP Client Agent (để Agent tự chạy khi mở máy)'))
    return 0


def main():
    a = sys.argv[1:]
    if '--setup' in a:
        sys.exit(setup())
    if '--status' in a:
        print(json.dumps({'config': bool(cfg_load().get('key')), 'agent': agent_alive(), 'base': BASE}, ensure_ascii=False)); return
    if not cfg_load().get('key'):
        log('Chưa có khoá bot — chạy: python agent_worker.py --setup'); sys.exit(1)
    if '--once' in a:
        log('Xong %d file.' % one_round()); return
    try:
        lock = socket.socket(); lock.bind(('127.0.0.1', PORT_LOCK)); lock.listen(1)
    except OSError:
        log('Đã có 1 bản đang chạy — thoát.'); return
    try:
        os.remove(STOP)
    except OSError:
        pass
    clean_tmp()
    log('Bắt đầu chạy ngầm (v%s, máy %s).' % (VER, socket.gethostname()))
    fails = 0
    while not os.path.exists(STOP):
        wait = IDLE
        try:
            n = one_round(); fails = 0
            if n:
                wait = 15            # vừa có việc ⇒ hỏi lại sớm
        except Exception as e:
            fails += 1
            log('Lỗi lượt: %s' % str(e)[:200])
            if fails > 2:
                log(traceback.format_exc()[-400:])
            wait = min(900, IDLE * fails)
        for _ in range(wait):
            if os.path.exists(STOP):
                break
            time.sleep(1)
    log('Đã dừng (có lệnh dừng).')


if __name__ == '__main__':
    main()
