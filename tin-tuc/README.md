# Bản tin Y tế & Chính sách (`tin-tuc/`)

Trang tĩnh (GitHub Pages): `https://manimedicalhanoi.github.io/Tender-Result/tin-tuc/`

Tin y tế, đấu thầu, thiết bị y tế và văn bản pháp luật mới — **tự cập nhật mỗi ngày** từ báo chính thống và cổng văn bản nhà nước.

## Cách chạy

```
GitHub Actions "Lấy tin Bản tin Y tế" (.github/workflows/news.yml)
  06:20 và 12:20 giờ VN mỗi ngày (+ chạy tay: Actions ▸ Run workflow)
        │
        ▼
tools/news/fetch.mjs  (Node 22, không cần thư viện ngoài)
  1. Đọc RSS các báo trong tin-tuc/config.json ▸ feeds (Báo Chính phủ, Sức khỏe & Đời sống, Nhân Dân,
     VietnamPlus, VTV, Báo Đấu thầu, VnExpress, Tuổi Trẻ, Thanh Niên, Dân trí) + Google News
     (chỉ giữ tin có tên miền nằm trong config ▸ domains — Bộ Y tế, Chính phủ… và báo chính thống).
  2. Đọc thẳng bảng "văn bản mới" của vanban.chinhphu.vn và luatvietnam.vn (config ▸ docSites).
  3. Lọc tin y tế (config ▸ core), gắn chủ đề (config ▸ topics), số hiệu văn bản, điểm; gộp tin trùng tiêu đề.
  4. Có secret ANTHROPIC_API_KEY ⇒ tools/news/summarize.mjs tóm tắt ≤ 30 tin quan trọng / lượt + "ý nghĩa với MMH".
  5. Ghi tin-tuc/data/news.json (45 ngày), data/docs.json (sổ văn bản), data/archive/yyyy-mm.json ⇒ commit ⇒ Pages tự đăng.
        │
        ▼
tin-tuc/index.html + app.js + app.css — Hôm nay · Tin tức · Văn bản pháp luật · Nguồn tin
```

## Sửa thường gặp

| Muốn | Sửa |
|---|---|
| Thêm / bỏ báo | `config.json ▸ feeds` (RSS) — tên miền phải có trong `domains` |
| Thêm từ khoá chủ đề | `config.json ▸ topics[].kw` (so có dấu, không phân biệt hoa thường; "hoà" = "hòa") |
| Nhóm được gắn "Liên quan MMH" | `config.json ▸ mmhTopics` |
| Báo ghi ngày kiểu tháng/ngày | feed thêm `"datefmt": "mdy"` (có AM/PM thì tự nhận) |
| Xem nguồn nào lỗi | tab **Nguồn tin** trên trang, hoặc log của workflow (dòng `LỖI`, `loại {…}` = lý do bỏ tin) |

Đổi luật lập sổ văn bản ⇒ tăng `DOCS_V` trong `fetch.mjs` (sổ tự dựng lại từ tin).

## Ghi chú

- `thuvienphapluat.vn` chặn máy chủ GitHub (403); `moh.gov.vn` không cho kết nối trực tiếp ⇒ tin Bộ Y tế lấy qua Google News `site:moh.gov.vn`.
- Chỉ lưu tiêu đề, đoạn mô tả RSS và link về bài gốc — không chép nội dung bài báo.
- Chạy thử không mạng: `node tools/news/fetch.mjs --fixtures <thư mục>` (file `<md5(url)[0..10]>.xml`).
