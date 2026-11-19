const $ = id => document.getElementById(id);
const APP = 'https://manimedicalhanoi.github.io/Tender-Result/theo-doi/';
function paint(st, c) {
  st = st || {}; c = c || {};
  $('who').textContent = c.tk ? 'Đăng nhập: ' + (st.me || c.pic || 'tài khoản MMH') + ' · v' + (st.v || '') : 'Chưa đăng nhập — mở app Theo dõi gói thầu 1 lần';
  $('d1').className = 'dot ' + (st.agent ? 'on' : 'bad');
  $('s1').textContent = st.agent ? 'VNeGP Client Agent đang chạy — tải được cả file cần Agent' : 'VNeGP Client Agent chưa chạy — vẫn tải TBMT, Excel; file cần Agent chờ bật Agent';
  $('d2').className = 'dot ' + (st.busy ? 'on' : st.n ? '' : 'on');
  $('s2').textContent = st.busy ? 'Đang tải: ' + (st.job || '…') : (st.n ? st.n + ' gói chờ tải' : 'Không có gói chờ') + (st.ag ? ' · ' + st.ag + ' file cần Agent' : '');
  $('msg').textContent = c.off ? 'Đang tạm dừng — bấm Bật lại' : (st.msg || '—') + (st.last ? ' · lượt cuối ' + st.last.at : '');
  $('off').textContent = c.off ? 'Bật lại' : 'Tạm dừng';
  $('show').checked = !!c.show;
  if (document.activeElement !== $('dev')) $('dev').value = c.dev || '';
  $('log').innerHTML = (st.log || []).map(x => '<li>' + x.replace(/[<>&]/g, '') + '</li>').join('');
}
async function load() { const x = await chrome.storage.local.get(['st', 'tk', 'pic', 'off', 'show', 'dev']); paint(x.st, x); }
$('go').onclick = () => chrome.runtime.sendMessage({ t: 'kick' }, () => setTimeout(load, 300));
$('off').onclick = async () => { const x = await chrome.storage.local.get('off'); chrome.runtime.sendMessage({ t: 'set', v: { off: !x.off } }, load); };
$('show').onchange = e => chrome.runtime.sendMessage({ t: 'set', v: { show: e.target.checked } }, load);
$('dev').onchange = e => chrome.runtime.sendMessage({ t: 'set', v: { dev: e.target.value.trim().slice(0, 24) } }, () => chrome.runtime.sendMessage({ t: 'kick' }, load));
$('app').onclick = () => chrome.tabs.create({ url: APP });
chrome.storage.onChanged.addListener(load);
load();
