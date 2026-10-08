import { emptyState, reducer, importState } from './model.mjs';
export const isExtension = Boolean(globalThis.chrome?.runtime?.id);
export async function request(message) {
  if (isExtension) {
    const result = await chrome.runtime.sendMessage(message);
    if (!result?.ok) throw new Error(result?.error || 'Không liên lạc được với tiện ích. Hãy tải lại tiện ích trong chrome://extensions.');
    return result;
  }
  // Local browser preview, deliberately unable to publish or use credentials.
  let state = JSON.parse(localStorage.getItem('linkdesk-preview') || 'null') || emptyState();
  if (message.type === 'GET') return { state, connection: null };
  if (message.type === 'ACTION') state = reducer(state, message.action);
  else if (message.type === 'IMPORT') state = importState(message.data);
  else throw new Error('Đây là bản xem trước. Cài tiện ích trong Chrome để kết nối Page và điền bình luận.');
  localStorage.setItem('linkdesk-preview', JSON.stringify(state));
  return { state };
}
export const action = (type, rest = {}) => request({ type: 'ACTION', action: { type, ...rest } });
export function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function formatTime(value) { if (!value) return 'Chưa đặt lịch'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Không rõ thời gian' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(date); }
export const STATUS = { draft: 'Chờ duyệt', ready: 'Đã duyệt', publishing: 'Đang gửi', published: 'Đã đăng qua API', sent: 'Đã thấy bình luận trên Facebook', manual: 'Bạn xác nhận đã gửi', uncertain: 'Cần kiểm tra trên Facebook', failed: 'Gửi thất bại' };
