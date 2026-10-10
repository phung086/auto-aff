// Manual CSV campaign onboarding. No network calls, publication or permission grants.
const MAX_BYTES = 64 * 1024;
const MAX_ROWS = 20;
const REQUIRED = ['name', 'product', 'benefit', 'link', 'source'];
const COLUMNS = new Set([...REQUIRED, 'keywords']);
const LIMITS = { name: 200, product: 300, benefit: 6000, link: 2048, source: 30000, keywords: 500 };

function fail(message) { throw new Error(message); }

export function parseProviderCsv(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BYTES)
    fail('CSV không hợp lệ hoặc vượt 64 KiB.');
  const value = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!value) fail('CSV trống.');
  const rows = [];
  let cells = [], field = '', quoted = false, closed = false, atStart = true;
  const finishField = () => {
    cells.push(field); field = ''; quoted = false; closed = false; atStart = true;
  };
  const finishRow = () => {
    finishField();
    if (cells.some(x => x !== '')) rows.push(cells);
    cells = [];
    if (rows.length > MAX_ROWS + 1) fail('Tối đa 20 chiến dịch trong mỗi file.');
  };
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quoted) {
      if (ch === '"' && value[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else field += ch;
    } else if (ch === '"') {
      if (!atStart || closed) fail('Dấu ngoặc kép không hợp lệ trong CSV.');
      quoted = true; atStart = false;
    } else if (ch === ',') finishField();
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && value[i + 1] === '\n') i++;
      finishRow();
    } else {
      if (closed) fail('Ký tự sau dấu ngoặc kép đóng.');
      field += ch; atStart = false;
    }
  }
  if (quoted) fail('Trường CSV chưa đóng dấu ngoặc kép.');
  if (cells.length || field || closed) finishRow();
  if (rows.length < 2) fail('CSV cần dòng tiêu đề và ít nhất một chiến dịch.');
  const headers = rows.shift().map(x => x.trim().toLowerCase());
  if (new Set(headers).size !== headers.length || headers.some(x => !COLUMNS.has(x)) ||
      REQUIRED.some(x => !headers.includes(x))) fail('Cột yêu cầu: name,product,benefit,link,source; keywords tùy chọn.');
  return rows.map((cells, index) => {
    if (cells.length !== headers.length) fail('Số cột không hợp lệ tại dòng ' + (index + 2) + '.');
    return Object.fromEntries(headers.map((key, n) => [key, cells[n]]));
  });
}

export function validateProviderRecord(input) {
  if (!input || typeof input !== 'object') fail('Dữ liệu chiến dịch không hợp lệ.');
  const record = {};
  for (const key of [...REQUIRED, 'keywords']) {
    const value = input[key] ?? (key === 'keywords' ? '' : null);
    if (typeof value !== 'string' || value.length > LIMITS[key]) fail('Trường ' + key + ' không hợp lệ hoặc quá dài.');
    record[key] = key === 'link' ? value : value.trim();
    if (key !== 'keywords' && !record[key]) fail('Thiếu trường ' + key + '.');
    if (key !== 'link' && /^[\s]*[=+@]/.test(record[key]))
      fail('Trường ' + key + ' có dạng công thức bảng tính.');
  }
  const rawLink = record.link;
  if (!rawLink || rawLink !== rawLink.trim() || /\s/.test(rawLink)) fail('Link có khoảng trắng hoặc dòng mới.');
  let parsed;
  try { parsed = new URL(rawLink); } catch { fail('Link HTTPS không hợp lệ.'); }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password)
    fail('Link cần dùng HTTPS và không có thông tin đăng nhập.');
  // URL parsing is validation only; never save parsed.href or parsed.toString().
  return record;
}

export function previewProviderCsv(text, existingCampaigns = []) {
  if (!Array.isArray(existingCampaigns)) fail('Không đọc được danh sách chiến dịch.');
  const names = new Set(existingCampaigns.map(c => String(c?.name ?? '').trim().toLocaleLowerCase('vi')));
  const links = new Set(existingCampaigns.map(c => c?.link).filter(x => typeof x === 'string'));
  return parseProviderCsv(text).map((raw, index) => {
    try {
      const record = validateProviderRecord(raw);
      const name = record.name.toLocaleLowerCase('vi');
      if (names.has(name) || links.has(record.link))
        return { rowNumber: index + 2, status: 'duplicate', reason: 'Tên hoặc link đã tồn tại.', record };
      names.add(name); links.add(record.link);
      return { rowNumber: index + 2, status: 'ready', reason: '', record };
    } catch (error) {
      return { rowNumber: index + 2, status: 'invalid', reason: error.message, record: null };
    }
  });
}

// Only one explicitly selected row may be saved, after re-reading the latest state.
export async function saveReviewedProviderRow(csvText, rowIndex, readCampaigns, saveCampaign) {
  if (!Number.isInteger(rowIndex) || rowIndex < 0 ||
      typeof readCampaigns !== 'function' || typeof saveCampaign !== 'function')
    fail('Yêu cầu lưu không hợp lệ.');
  const latest = await readCampaigns();
  const candidate = previewProviderCsv(csvText, latest)[rowIndex];
  if (!candidate || candidate.status !== 'ready')
    fail('Mục trùng hoặc không còn hợp lệ. Hãy kiểm tra lại danh sách.');
  await saveCampaign(candidate.record);
  return candidate.record;
}
