import { request, action, esc, isExtension } from './bridge.mjs';
import { canFill, assertLink } from './model.mjs';
import { fillSelectedComment } from './comment.mjs';
const $ = id => document.getElementById(id);
let state, jobs = [];
function message(text, error = false) { $('popup-message').textContent = text; $('popup-message').classList.toggle('error', error); }
const selected = () => jobs.find(j => j.id === $('selected-job').value);
function renderSelected() { const j = selected(); $('popup-body').textContent = j?.body || 'Thêm và duyệt bình luận trong bảng quản lý trước.'; for (const id of ['open-post', 'copy', 'fill', 'confirm']) $(id).disabled = !j; }
async function load() { const result = await request({ type: 'GET' }); state = result.state; jobs = state.jobs.filter(j => j.kind === 'comment' && j.status === 'ready' && j.approved); const previous = isExtension ? (await chrome.storage.local.get('selectedJobId')).selectedJobId : ''; $('selected-job').innerHTML = jobs.length ? jobs.map(j => `<option value="${esc(j.id)}">${esc(state.destinations.find(d => d.id === j.destinationId)?.name || 'Nhóm')} · ${esc(j.body.slice(0, 45))}</option>`).join('') : '<option value="">Chưa có bình luận đã duyệt</option>'; if (jobs.some(j => j.id === previous)) $('selected-job').value = previous; renderSelected(); }
async function perform(button, callback) { button.disabled = true; try { await callback(); } catch (e) { message(e.message, true); } finally { renderSelected(); } }
$('selected-job').addEventListener('change', async () => { renderSelected(); message(''); if (isExtension) await chrome.storage.local.set({ selectedJobId: $('selected-job').value }); });
$('dashboard').addEventListener('click', () => isExtension ? chrome.runtime.openOptionsPage() : window.open('dashboard.html', '_blank'));
$('copy').addEventListener('click', event => perform(event.currentTarget, async () => { await navigator.clipboard.writeText(selected().body); message('Đã sao chép. Dán vào ô bình luận và kiểm tra trước khi gửi.'); }));
$('open-post').addEventListener('click', event => perform(event.currentTarget, async () => { const j = selected(); if (isExtension) { await chrome.storage.local.set({ selectedJobId: j.id }); await chrome.tabs.create({ url: j.targetUrl }); } else window.open(j.targetUrl, '_blank', 'noopener'); message('Bấm ô bình luận trên bài viết, rồi mở lại LinkDesk.'); }));
$('fill').addEventListener('click', event => perform(event.currentTarget, async () => {
  if (!isExtension) throw new Error('Cài tiện ích Chrome để dùng tính năng điền.');
  const result = await request({ type: 'GET' }); state = result.state;
  const j = state.jobs.find(x => x.id === $('selected-job').value);
  if (!j) throw new Error('Mục hàng đợi đã thay đổi. Mở lại tiện ích.');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  canFill(j, tab?.url || '', state.destinations);
  assertLink(j, state.campaigns);
  const injected = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fillSelectedComment, args: [j.body] });
  if (!injected[0]?.result?.ok) throw new Error(injected[0]?.result?.error || 'Không điền được ô bình luận. Dùng nút Sao chép.');
  await action('PREPARED_JOB', { id: j.id });
  message('Đã điền, chưa gửi. Kiểm tra nội dung rồi bấm gửi trong Facebook.');
}));
$('confirm').addEventListener('click', event => perform(event.currentTarget, async () => { if (!confirm('Bạn đã nhìn thấy bình luận được gửi thành công trên Facebook?')) return; await action('CONFIRM_COMMENT', { id: selected().id }); await load(); message('Đã lưu xác nhận của bạn vào lịch sử.'); }));
try { await load(); } catch (e) { message(e.message, true); }
