# Ghép ảnh hướng dẫn ⇒ theo-doi/huong-dan/*.webp (ảnh tĩnh từng bước + 2 ảnh động). Chạy sau ext_shots.js + app_shots.js.
from PIL import Image, ImageDraw, ImageFont
import os
R = os.path.join(os.path.dirname(__file__), 'raw'); O = os.path.join(os.path.dirname(__file__), '../../theo-doi/huong-dan')
os.makedirs(O, exist_ok=True)
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
for c in ['/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf', '/usr/share/fonts/opentype/noto/NotoSans-Bold.ttf']:
    if os.path.exists(c): FB = c
im = lambda f: Image.open(os.path.join(R, f)).convert('RGB')
def save(img, name, w=None, q=82):
    if w and img.width > w: img = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
    img.save(os.path.join(O, name), 'WEBP', quality=q, method=6); print(name, img.size, os.path.getsize(os.path.join(O, name)) // 1024, 'KB')
save(im('w1-extract.png'), 'b2-giai-nen.webp', 900)
save(im('e2-dev-on.png').crop((0, 0, 1280, 300)), 'b3-developer.webp', 1100)
save(im('e4-card.png').crop((0, 0, 1280, 460)), 'b4-load.webp', 1100)
save(im('e5-popup.png'), 'b5-popup.webp')
save(im('a1-dan-so.png'), 't1-dan-so.webp', 1200)
save(im('a3-tien-trinh.png'), 't3-tien-trinh.webp', 1200)
save(im('a4-phone.png'), 't4-dien-thoai.webp', 420)
save(im('a5-the-goi.png'), 'x1-the-goi.webp', 1200)
# ảnh động
W, H, CAP = 1000, 640, 52
def frame(img, n, tot, text):
    c = Image.new('RGB', (W, H + CAP), (244, 247, 251)); d = ImageDraw.Draw(c)
    d.rectangle([0, 0, W, CAP], fill=(44, 74, 94))
    f = ImageFont.truetype(FB, 19)
    d.text((18, 14), f'{n}/{tot}  ·  {text}', font=f, fill=(255, 255, 255))
    s = min(W / img.width, H / img.height); t = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    c.paste(t, ((W - t.width) // 2, CAP + (H - t.height) // 2)); return c
def reel(name, items, ms=2600):
    fr = [frame(im(f) if isinstance(f, str) else f, i + 1, len(items), t) for i, (f, t) in enumerate(items)]
    fr[0].save(os.path.join(O, name), 'WEBP', save_all=True, append_images=fr[1:], duration=ms, loop=0, quality=70, method=6)
    print(name, os.path.getsize(os.path.join(O, name)) // 1024, 'KB')
reel('reel-cai.webp', [
    ('w1-extract.png', 'Giải nén file tiện ích vừa tải'),
    ('e1-dev-off.png', 'Mở chrome://extensions ⇒ bật Developer mode'),
    ('e3-load.png', 'Bấm Load unpacked ⇒ chọn thư mục vừa giải nén'),
    ('e4-card.png', 'Tiện ích MMH Tải hồ sơ thầu đã cài'),
    ('e5-popup.png', 'Bấm biểu tượng tiện ích: trạng thái, Tên máy, Tải ngay')])
reel('reel-tai.webp', [
    ('r1.png', 'Tab Theo dõi ⇒ dán số TBMT ⇒ Tải ngay'),
    ('r2.png', 'Gói vào hàng đợi — máy tải nhận trong khoảng 1 phút'),
    ('r3.png', 'Máy tính có tiện ích đang tải gói'),
    ('r4.png', 'Xong: tài liệu đã lên Drive'),
    ('a6-docs.png', 'Tab Tài liệu: mỗi gói 1 thẻ, mở ra xem / tải file'),
    ('a4-phone.png', 'Trên điện thoại: bấm Tải như nhau, máy văn phòng tự tải')])
