# Ảnh hướng dẫn app Theo dõi gói thầu (theo-doi/huong-dan/)
Ở gốc repo: `python3 -m http.server 8792 &` rồi
`NODE_PATH=$(npm root -g) xvfb-run -a node tools/td-guide/ext_shots.js` (chrome://extensions thật + bảng tiện ích) ·
`NODE_PATH=$(npm root -g) node tools/td-guide/app_shots.js` (app với máy chủ giả, dữ liệu mẫu) ·
`python3 tools/td-guide/compose.py` (ghép ảnh tĩnh + 2 ảnh động reel-cai / reel-tai). Ảnh gốc ở `raw/` (không đưa lên repo).
