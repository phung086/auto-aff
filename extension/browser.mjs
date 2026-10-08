export async function readBrowserPage(url) {
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    for (let i = 0; i < 22; i++) { const current = await chrome.tabs.get(tab.id); if (current.status === 'complete') break; await new Promise(resolve => setTimeout(resolve, 500)); }
    const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => ({ title: document.title, text: document.body?.innerText.slice(0, 28000) || '', url: location.href }) });
    const page = result[0]?.result;
    if (!page?.text || page.text.length < 40) throw new Error('Trang chưa có nội dung đọc được. Hãy dán thông tin nguồn thủ công.');
    return page;
  } finally { await chrome.tabs.remove(tab.id).catch(() => {}); }
}
export async function scanGroup(url, keywords) {
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    for (let i = 0; i < 24; i++) { const current = await chrome.tabs.get(tab.id); if (current.status === 'complete') break; await new Promise(resolve => setTimeout(resolve, 500)); }
    const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: words => {
      const fold = s => s.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const terms = words.split(',').map(x => fold(x.trim())).filter(x => x.length >= 2);
      return [...document.querySelectorAll('[role="article"]')].map(article => {
        const links = [...article.querySelectorAll('a[href]')].map(a => a.href);
        const url = links.find(href => /\/groups\/[^/]+\/(?:posts|permalink)\/\d+/.test(href) || /multi_permalinks=\d+/.test(href));
        const text = article.innerText.slice(0, 1800);
        return { url, text };
      }).filter(p => p.url && terms.some(t => fold(p.text).includes(t))).slice(0, 10);
    }, args: [keywords] });
    return result[0]?.result || [];
  } finally { await chrome.tabs.remove(tab.id).catch(() => {}); }
}
export async function discoverGroups(query) {
  const tab = await chrome.tabs.create({url:`https://www.facebook.com/search/groups/?q=${encodeURIComponent(query)}`,active:true});
  for (let i=0;i<24;i++) {if((await chrome.tabs.get(tab.id)).status==='complete')break;await new Promise(r=>setTimeout(r,500));}
  const results=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
    if(/checkpoint|login/.test(location.pathname))throw new Error('Đăng nhập Facebook trong Chrome trước.');
    const groups=new Map();for(const a of document.querySelectorAll('a[href]')) {const match=new URL(a.href).pathname.match(/^\/groups\/([^/]+)\/?$/);const name=a.innerText.trim();if(match&&!['feed','discover','joins'].includes(match[1])&&name&&a.getClientRects().length)groups.set(match[1],{name:name.slice(0,200),url:`https://www.facebook.com/groups/${match[1]}/`});}return [...groups.values()].slice(0,10);
  }});
  return {groups:results[0]?.result||[],tabId:tab.id};
}
export async function requestGroupJoin(url) {
  const tab=await chrome.tabs.create({url,active:true});
  for(let i=0;i<24;i++){if((await chrome.tabs.get(tab.id)).status==='complete')break;await new Promise(r=>setTimeout(r,500));}
  const results=await chrome.scripting.executeScript({target:{tabId:tab.id},func:async expected=>{
    const group = value => new URL(value).pathname.match(/^\/groups\/([^/]+)\/?$/)?.[1];
    if(!group(expected)||group(location.href)!==group(expected)||!/^(www\.|m\.|web\.)?facebook\.com$/.test(location.hostname)||/checkpoint|login/.test(location.pathname))return {status:'manual_required',message:'Kiểm tra đúng nhóm và đăng nhập Facebook.'};
    const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    const buttons=()=>[...document.querySelectorAll('button,[role="button"]')].filter(visible);
    const label=e=>(e.getAttribute('aria-label')||e.innerText||'').trim();
    const state=()=>{const all=buttons();if(document.querySelector('[role="dialog"]')||document.querySelector('iframe[src*="captcha"]'))return 'manual_required';if(all.some(e=>/^(hủy yêu cầu|cancel request)$/i.test(label(e))))return 'pending';if(all.some(e=>/^(đã tham gia|joined)$/i.test(label(e))))return 'joined';return null;};
    const before=state();if(before)return {status:before,message:'Facebook hiển thị trạng thái này; không bấm tham gia thêm.'};
    const join=buttons().filter(e=>/^(tham gia nhóm|join group)$/i.test(label(e))&&!e.disabled&&e.getAttribute('aria-disabled')!=='true');
    if(join.length!==1)return {status:'manual_required',message:'Không nhận diện được đúng một nút tham gia. Kiểm tra thủ công.'};
    join[0].click();
    for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,500));const status=state();if(status)return {status,message:status==='manual_required'?'Cần bạn trả lời câu hỏi hoặc xác nhận trực tiếp trong Facebook.':'Đã đọc trạng thái hiển thị sau một lần bấm.'};}
    return {status:'uncertain',message:'Đã bấm một lần nhưng chưa xác định được kết quả. Không tự thử lại.'};
  },args:[url]});
  return {...(results[0]?.result||{status:'uncertain',message:'Mất kết nối; hãy kiểm tra nhóm.'}),tabId:tab.id};
}
export async function prepareAutoComment(url, body) {
  const tab = await chrome.tabs.create({ url, active: true });
  try {
    for (let i = 0; i < 24; i++) { const current = await chrome.tabs.get(tab.id); if (current.status === 'complete') break; await new Promise(resolve => setTimeout(resolve, 500)); }
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (text, expectedUrl) => {
      const canonical = href => { const u = new URL(href); const m = u.pathname.match(/^\/groups\/([^/]+)\/(?:posts|permalink)\/(\d+)/); return m ? `${u.hostname.replace(/^(m|web)\./, 'www.')}/${m[1]}/${m[2]}` : u.origin + u.pathname; };
      if (canonical(location.href) !== canonical(expectedUrl)) return { ok: false, error: 'Trang đã chuyển sang đích khác. Chưa điền hoặc gửi.' };
      const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const blocked = document.querySelector('iframe[src*="captcha"],input[name="approvals_code"]') || /checkpoint|login/.test(location.pathname);
      if (blocked) return { ok: false, error: 'Facebook yêu cầu đăng nhập hoặc kiểm tra tài khoản. Tự động hóa đã dừng.' };
      const editors = [...document.querySelectorAll('[contenteditable="true"][role="textbox"]')].filter(e => visible(e) && /(bình luận|comment)/i.test(e.getAttribute('aria-label') || '') && !/(trả lời|reply)/i.test(e.getAttribute('aria-label') || ''));
      if (editors.length !== 1) return { ok: false, error: 'Không tìm thấy đúng một ô bình luận của bài. Mở bài và dùng chế độ điền thủ công.' };
      const editor = editors[0];
      if (editor.innerText.trim()) return { ok: false, error: 'Ô bình luận đã có nội dung; đã dừng để tránh ghi đè.' };
      editor.focus();
      const range = document.createRange(); range.selectNodeContents(editor); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      if (!document.execCommand('insertText', false, text)) return { ok: false, error: 'Facebook không nhận thao tác điền tự động.' };
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      const normalize = value => value.replace(/\s+/g, ' ').trim();
      if (normalize(editor.innerText) !== normalize(text)) return { ok: false, error: 'Nội dung trong ô không khớp bản soạn. Chưa gửi.' };
      editor.dataset.linkdesk = 'prepared';
      return { ok: true, url: location.href };
    }, args: [body, url] });
    if (!results[0]?.result?.ok) throw new Error(results[0]?.result?.error || 'Không chuẩn bị được bình luận.');
    return { tabId: tab.id, url: results[0].result.url };
  } catch (error) { await chrome.tabs.remove(tab.id).catch(() => {}); throw error; }
}
export async function submitAutoComment(tabId, body, expectedUrl) {
  const result = await chrome.scripting.executeScript({ target: { tabId }, func: async (text, expectedUrl) => {
    const canonical = href => { const u = new URL(href); const m = u.pathname.match(/^\/groups\/([^/]+)\/(?:posts|permalink)\/(\d+)/); return m ? `${u.hostname.replace(/^(m|web)\./, 'www.')}/${m[1]}/${m[2]}` : u.origin + u.pathname; };
    if (!expectedUrl || canonical(location.href) !== canonical(expectedUrl)) return { ok: false, sent: false, error: 'Đích bài viết đã thay đổi. Chưa gửi.' };
    const editor = document.querySelector('[data-linkdesk="prepared"]');
    const normalized = value => value.replace(/\s+/g, ' ').trim();
    if (!editor || normalized(editor.innerText) !== normalized(text)) return { ok: false, sent: false, error: 'Ô bình luận thay đổi; chưa gửi.' };
    let button;
    for (let node = editor.parentElement, i = 0; node && i < 5; node = node.parentElement, i++) {
      const candidates = [...node.querySelectorAll('button,[role="button"]')].filter(e => e.getClientRects().length && /^(bình luận|comment|đăng bình luận|post comment|gửi|send)$/i.test((e.getAttribute('aria-label') || e.innerText || '').trim()) && e.getAttribute('aria-disabled') !== 'true' && !e.disabled);
      if (candidates.length === 1) { button = candidates[0]; break; }
    }
    if (!button) return { ok: false, sent: false, error: 'Không xác định được nút gửi bình luận. Chưa gửi.' };
    // Observe a comment containing the exact full body after a single click; never click twice.
    const target = normalized(text);
    const seen = new Set([...document.querySelectorAll('[role="article"]')].filter(e => !e.contains(editor) && normalized(e.innerText).includes(target)));
    button.click();
    for (let i = 0; i < 14; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const match = [...document.querySelectorAll('[role="article"]')].find(e => !e.contains(editor) && !seen.has(e) && normalized(e.innerText).includes(target));
      if (match) return { ok: true, sent: true };
    }
    return { ok: false, sent: true, error: 'Đã bấm gửi một lần nhưng chưa xác nhận được bình luận hiển thị. Kiểm tra bài trước khi thử lại.' };
  }, args: [body, expectedUrl] });
  return result[0]?.result || { ok: false, sent: true, error: 'Mất kết nối sau thao tác gửi; cần kiểm tra bài.' };
}
