// Runs only after the user presses Fill in the popup; does not submit anything.
export function fillSelectedComment(body) {
  const element = document.activeElement;
  if (!element || !element.isContentEditable || element.getAttribute('role') !== 'textbox') return { ok: false, error: 'Bấm vào ô bình luận trên Facebook, rồi mở tiện ích và chọn “Điền bình luận”.' };
  const label = [element.getAttribute('aria-label'), element.getAttribute('data-placeholder'), element.getAttribute('aria-placeholder')].filter(Boolean).join(' ');
  if (!/(bình luận|comment|trả lời|reply)/i.test(label)) return { ok: false, error: 'Chưa xác định được đây là ô bình luận. Bạn có thể dùng “Sao chép” và dán thủ công.' };
  if (element.innerText.trim()) return { ok: false, error: 'Ô bình luận đang có nội dung. Xóa nội dung cũ hoặc dán thủ công để tránh ghi đè.' };
  element.focus();
  const selection = window.getSelection();
  const range = document.createRange(); range.selectNodeContents(element); selection.removeAllRanges(); selection.addRange(range);
  // execCommand is used because React/Lexical editors observe its trusted editing transaction.
  const inserted = document.execCommand('insertText', false, body);
  if (!inserted || !element.innerText.trim()) return { ok: false, error: 'Facebook không nhận thao tác điền. Dùng “Sao chép” và dán vào ô bình luận.' };
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: body }));
  return { ok: true };
}
