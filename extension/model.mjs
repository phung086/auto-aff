export const DISCLOSURE = 'Link tiếp thị liên kết.';
const LEGACY_DISCLOSURE = 'Đây là link giới thiệu; mình có thể nhận hoa hồng khi bạn mua.';
export const TEMPLATES = [
  { name: 'Trả lời nhu cầu', body: 'Nếu bạn đang tìm {{product}}: {{benefit}}\nThông tin và điều kiện sử dụng:\n{{link}}' },
  { name: 'Giới thiệu trên Page', body: '{{product}}\n\n{{benefit}}\n\nXem thông tin và điều kiện trước khi mua:\n{{link}}' }
];
export const AFFILIATE_URL = 'https://agentshop247.com/?ref=AS362560C5A713';
export const initialCampaign = { id: 'agentshop247', name: 'AgentShop247', product: 'Tài khoản và gói công cụ AI tại AgentShop247', benefit: 'Theo danh mục trên website, cửa hàng cung cấp nhiều gói công cụ AI và phần mềm. AgentShop247 tự giới thiệu là cửa hàng bán lẻ độc lập, không phải đại lý ủy quyền chính thức của các thương hiệu được liệt kê. Kiểm tra loại tài khoản, giá, thời hạn và điều kiện từng gói trực tiếp trước khi mua.', link: AFFILIATE_URL, keywords: 'AI, tài khoản, công cụ, Claude, Cursor', source: 'Thông tin đọc từ trang chủ và danh mục AgentShop247 ngày 07/10/2026. Chưa xác minh độc lập các cam kết của nhà cung cấp.' };
export const emptyState = () => ({ schema: 1, campaigns: [structuredClone(initialCampaign)], destinations: [], jobs: [], reports: [], settings: { apiVersion: '', schedulerEnabled: false, aiModel: '', aiProvider: 'chatgpt' }, runner: { running: false, completed: 0, message: 'Chưa chạy.' } });
const fail = text => { throw new Error(text); };
const str = (v, max = 10000) => { if (typeof v !== 'string' || v.length > max) fail('Dữ liệu văn bản không hợp lệ hoặc quá dài.'); return v.trim(); };
const uid = () => crypto.randomUUID();
export function httpUrl(value) {
  let u;
  const original = str(value, 2048);
  if (original !== value) fail('Link có khoảng trắng ở đầu hoặc cuối. Hãy nhập đúng chuỗi link.');
  if (/\s/.test(original)) fail('Link có khoảng trắng hoặc xuống dòng. Hãy dùng link được mã hóa đầy đủ.');
  try { u = new URL(original); } catch { fail('Hãy nhập link đầy đủ, bắt đầu bằng https://.'); }
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) fail('Link phải dùng http/https và không chứa thông tin đăng nhập.');
  return original;
}
export const hasExactLink = (body, link) => body.split(/\r?\n/).some(line => line === link);
export const hasStandaloneDisclosure = (body, allowLegacy = true) => typeof body === 'string' && body.split(/\r?\n/).some(line => line === DISCLOSURE || (allowLegacy && line === LEGACY_DISCLOSURE));
export function assertLink(job, campaigns) {
  const link = job.affiliateUrl || campaigns.find(c => c.id === job.campaignId)?.link;
  if (!link || !hasExactLink(job.body, link)) fail('Link affiliate không khớp nguyên chuỗi. Đã chặn gửi.');
  const urls = job.body.match(/https?:\/\/[^\s]+/gi) || [];
  if (urls.length !== 1 || urls[0] !== link) fail('Nội dung phải chứa đúng một link affiliate, không có URL khác hoặc link bị sửa.');
  if (!hasStandaloneDisclosure(job.body)) fail('Nhãn tiếp thị liên kết phải đứng trên một dòng riêng, không bị che hoặc sửa.');
  return link;
}
export function facebookUrl(value) {
  const u = new URL(httpUrl(value));
  if (u.protocol !== 'https:' || !['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com'].includes(u.hostname)) fail('Hãy dùng URL https://www.facebook.com/...');
  return u;
}
export function groupId(value) {
  const u = facebookUrl(value);
  const match = u.pathname.match(/^\/groups\/([a-zA-Z0-9._-]+)(?:\/|$)/);
  if (!match) fail('Link nhóm cần có dạng facebook.com/groups/tên-hoặc-ID/.');
  return match[1];
}
export function postTarget(value) {
  const u = facebookUrl(value);
  const id = groupId(value);
  const path = u.pathname.match(/^\/groups\/[a-zA-Z0-9._-]+\/(?:posts|permalink)\/(\d+)(?:\/|$)/);
  const queryId = u.searchParams.get('multi_permalinks');
  const post = path?.[1] || (queryId && /^\d+$/.test(queryId) ? queryId : '');
  if (!post) fail('Hãy mở bài viết, sao chép liên kết trực tiếp của bài trong nhóm, rồi dán vào đây.');
  return { group: id, post, url: `https://www.facebook.com/groups/${id}/posts/${post}/` };
}
export function renderTemplate(campaign, template) {
  let text = str(template).replace(/\{\{(product|benefit|link)\}\}/g, (_, key) => campaign[key] || '');
  if (/\{\{[^}]+\}\}/.test(text)) fail('Mẫu còn biến chưa hỗ trợ. Chỉ dùng {{product}}, {{benefit}}, {{link}}.');
  if (!hasExactLink(text, campaign.link)) text += `\n${campaign.link}`;
  if (!hasStandaloneDisclosure(text, false)) text += `\n\n${DISCLOSURE}`;
  return text.trim();
}
export function validText(value) {
  const text = str(value, 20000);
  if (!text || /\{\{[^}]+\}\}/.test(text)) fail('Nội dung trống hoặc còn biến chưa điền.');
  return text;
}
export function vnDate(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) fail('Thời gian không hợp lệ.');
  const date = new Date(`${value}:00+07:00`);
  if (Number.isNaN(date.getTime())) fail('Thời gian không hợp lệ.');
  return date.toISOString();
}
export function csvCell(value) {
  let s = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
export function canFill(job, currentUrl, destinations) {
  if (job.kind !== 'comment' || job.status !== 'ready' || !job.approved) fail('Hãy duyệt bình luận trong hàng đợi trước.');
  const d = destinations.find(x => x.id === job.destinationId);
  if (!d || d.kind !== 'group' || !d.allowsAds) fail('Nhóm này chưa được đánh dấu cho phép quảng cáo.');
  const actual = postTarget(currentUrl), expected = postTarget(job.targetUrl);
  if (actual.group !== d.groupId || actual.group !== expected.group || actual.post !== expected.post) fail('Tab hiện tại không phải bài viết đã chọn. Hãy bấm “Mở bài viết”.');
  return true;
}
export function reducer(previous, action) {
  const state = structuredClone(previous);
  const findJob = () => state.jobs.find(j => j.id === action.id) || fail('Không tìm thấy mục trong hàng đợi.');
  if (action.type === 'SAVE_CAMPAIGN') {
    const c = { id: action.data.id || uid(), name: str(action.data.name, 200), product: str(action.data.product, 300), benefit: str(action.data.benefit, 6000), link: httpUrl(action.data.link), keywords: str(action.data.keywords || '', 500), source: str(action.data.source || '', 30000) };
    if (!c.name || !c.product || !c.benefit) fail('Điền tên chiến dịch, sản phẩm và mô tả đã xác minh.');
    const i = state.campaigns.findIndex(x => x.id === c.id);
    if (i < 0) state.campaigns.push(c); else state.campaigns[i] = c;
  } else if (action.type === 'SAVE_DESTINATION') {
    const input = action.data;
    const d = { id: input.id || uid(), name: str(input.name, 200), kind: input.kind };
    if (!d.name || !['group', 'page'].includes(d.kind)) fail('Tên hoặc loại đích đăng không hợp lệ.');
    if (d.kind === 'group') {
      d.groupId = groupId(input.url); d.url = `https://www.facebook.com/groups/${d.groupId}/`;
      d.allowsAds = input.allowsAds === true;
      if (!d.allowsAds) fail('Hãy xác nhận nhóm cho phép quảng cáo hoặc link affiliate.');
    } else {
      d.pageId = str(input.pageId, 40);
      if (!/^\d+$/.test(d.pageId)) fail('Page ID phải là ID số của Page.');
      d.url = `https://www.facebook.com/${d.pageId}`;
    }
    if (state.destinations.some(x => x.id !== d.id && x.kind === d.kind && (d.kind === 'group' ? x.groupId === d.groupId : x.pageId === d.pageId))) fail('Đích đăng này đã có trong danh sách.');
    const i = state.destinations.findIndex(x => x.id === d.id);
    if (i < 0) state.destinations.push(d); else state.destinations[i] = d;
  } else if (action.type === 'ADD_JOB') {
    if (state.jobs.length >= 1000) fail('Hàng đợi đã có 1.000 mục. Hãy xuất lịch sử trước khi thêm.');
    const c = state.campaigns.find(x => x.id === action.data.campaignId);
    const d = state.destinations.find(x => x.id === action.data.destinationId);
    if (!c || !d) fail('Tạo chiến dịch và đích đăng trước.');
    const kind = d.kind === 'group' ? 'comment' : 'page';
    const targetUrl = kind === 'comment' ? postTarget(action.data.targetUrl).url : d.url;
    if (kind === 'comment' && postTarget(targetUrl).group !== d.groupId) fail('Bài viết không thuộc nhóm đã chọn.');
    const body = validText(action.data.body);
    if (!hasExactLink(body, c.link) || !hasStandaloneDisclosure(body, false)) fail('Đặt nguyên link affiliate và nhãn tiếp thị ở hai dòng riêng, không sửa chuỗi.');
    assertLink({ body, affiliateUrl: c.link }, state.campaigns);
    if (state.jobs.some(j => j.destinationId === d.id && j.targetUrl === targetUrl && j.status !== 'failed' && (kind === 'comment' || j.body === body))) fail('Bài viết này đã có trong hàng đợi hoặc lịch sử. Kiểm tra mục cũ để tránh bình luận lặp.');
    const scheduledAt = kind === 'page' && action.data.scheduledAt ? new Date(action.data.scheduledAt).toISOString() : null;
    if (scheduledAt && new Date(scheduledAt).getTime() <= Date.now()) fail('Lịch đăng cần nằm trong tương lai.');
    state.jobs.unshift({ id: uid(), kind, campaignId: c.id, destinationId: d.id, targetUrl, body, affiliateUrl: c.link, scheduledAt, approved: false, status: 'draft', createdAt: new Date().toISOString(), error: '' });
  } else if (action.type === 'REVIEW_JOB') {
    const j = findJob();
    if (!['draft', 'ready'].includes(j.status)) fail('Mục này không còn ở trạng thái duyệt.');
    if (action.approved === true) assertLink(j, state.campaigns);
    j.approved = action.approved === true; j.status = j.approved ? 'ready' : 'draft';
  } else if (action.type === 'EDIT_JOB') {
    const j = findJob();
    if (!['draft', 'ready', 'failed'].includes(j.status)) fail('Không thể sửa mục đã gửi hoặc cần kiểm tra kết quả.');
    j.body = validText(action.body);
    const campaign = state.campaigns.find(c => c.id === j.campaignId);
    if (!campaign) fail('Không tìm thấy chiến dịch.');
    assertLink(j, state.campaigns);
    j.approved = false; j.status = 'draft'; j.error = '';
  } else if (action.type === 'DELETE_JOB') {
    const j = findJob();
    if (!['draft', 'ready', 'failed'].includes(j.status)) fail('Giữ mục này trong lịch sử để đối chiếu kết quả.');
    state.jobs = state.jobs.filter(x => x.id !== j.id);
  } else if (action.type === 'PREPARED_JOB') {
    const j = findJob();
    if (j.kind !== 'comment' || j.status !== 'ready') fail('Bình luận chưa được duyệt.');
    j.preparedAt = new Date().toISOString();
  } else if (action.type === 'CONFIRM_COMMENT') {
    const j = findJob();
    if (j.kind !== 'comment' || j.status !== 'ready' || !j.approved) fail('Bình luận chưa được duyệt.');
    j.status = 'manual'; j.publishedAt = new Date().toISOString();
  } else if (action.type === 'RESOLVE_UNCERTAIN') {
    const j = findJob();
    if (j.status !== 'uncertain') fail('Chỉ đối chiếu mục có kết quả chưa rõ.');
    if (action.published === true) { j.status = 'manual'; j.publishedAt = new Date().toISOString(); j.error = 'Người dùng đã xác nhận trên Facebook.'; }
    else { j.status = 'draft'; j.approved = false; j.error = ''; j.scheduledAt = null; }
  } else if (action.type === 'SAVE_SETTINGS') {
    const version = str(action.data.apiVersion || '', 15);
    if (version && !/^v\d+\.0$/.test(version)) fail('Phiên bản API có dạng vXX.0. Xem trong Meta App Dashboard.');
    const aiProvider = action.data.aiProvider ?? state.settings.aiProvider ?? 'chatgpt';
    if (!['chatgpt', 'api'].includes(aiProvider)) fail('Nhà cung cấp AI không hợp lệ.');
    state.settings = { apiVersion: version, schedulerEnabled: action.data.schedulerEnabled === true, aiModel: str(action.data.aiModel ?? state.settings.aiModel ?? '', 100), aiProvider };
  } else if (action.type === 'IMPORT_REPORT') {
    const report = validateReport(action.data, state.campaigns);
    state.reports ||= [];
    if (state.reports.length >= 100) fail('Đã lưu 100 báo cáo. Sao lưu trước khi thêm.');
    if (state.reports.some(r => r.campaignId === report.campaignId && r.periodStart === report.periodStart && r.periodEnd === report.periodEnd && r.source === report.source)) fail('Báo cáo cùng nguồn và khoảng thời gian đã tồn tại.');
    state.reports.unshift({ ...report, id: uid(), importedAt: new Date().toISOString() });
  } else fail('Thao tác không được hỗ trợ.');
  return state;
}
export function importState(data) {
  if (!data || data.schema !== 1 || !Array.isArray(data.campaigns) || !Array.isArray(data.destinations) || !Array.isArray(data.jobs) || data.jobs.length > 1000 || data.campaigns.length > 100 || data.destinations.length > 300) fail('File sao lưu không hợp lệ hoặc quá lớn.');
  let validated = emptyState(); validated.campaigns = [];
  for (const c of data.campaigns) validated = reducer(validated, { type: 'SAVE_CAMPAIGN', data: c });
  for (const d of data.destinations) validated = reducer(validated, { type: 'SAVE_DESTINATION', data: d });
  const statuses = ['draft', 'ready', 'publishing', 'published', 'manual', 'sent', 'uncertain', 'failed'];
  const seen = new Set();
  for (const j of data.jobs) {
    const c = validated.campaigns.find(x => x.id === j.campaignId), d = validated.destinations.find(x => x.id === j.destinationId);
    if (!c || !d || typeof j.id !== 'string' || seen.has(j.id) || !statuses.includes(j.status) || j.kind !== (d.kind === 'group' ? 'comment' : 'page')) fail('File có mục hàng đợi không hợp lệ.');
    seen.add(j.id);
    const targetUrl = j.kind === 'comment' ? postTarget(j.targetUrl).url : d.url;
    if (j.kind === 'comment' && postTarget(targetUrl).group !== d.groupId) fail('File có bài viết không khớp nhóm.');
    const status = j.status === 'publishing' ? 'uncertain' : j.status;
    const importedJob = { id: j.id, kind: j.kind, campaignId: c.id, destinationId: d.id, targetUrl, body: validText(j.body), affiliateUrl: httpUrl(j.affiliateUrl || c.link), status: status === 'ready' ? 'draft' : status, approved: false, scheduledAt: null, createdAt: str(j.createdAt || '', 40), publishedAt: str(j.publishedAt || '', 40), postId: str(j.postId || '', 100), error: str(j.error || '', 1500) };
    assertLink(importedJob, validated.campaigns); validated.jobs.push(importedJob);
  }
  validated.settings.apiVersion = /^v\d+\.0$/.test(data.settings?.apiVersion || '') ? data.settings.apiVersion : '';
  validated.settings.aiModel = typeof data.settings?.aiModel === 'string' ? str(data.settings.aiModel, 100) : '';
  validated.settings.aiProvider = data.settings?.aiProvider === 'api' ? 'api' : 'chatgpt';
  if (data.reports !== undefined && (!Array.isArray(data.reports) || data.reports.length > 100)) fail('Danh sách báo cáo không hợp lệ.');
  for (const report of data.reports || []) { const snapshot = validateReport(report, validated.campaigns, true); validated.reports.push({ ...snapshot, id: str(report.id || uid(), 100), importedAt: str(report.importedAt || '', 40) }); }
  return validated;
}
export function validateReport(raw, campaigns, allowSnapshot = false) {
  const c = campaigns.find(c => c.id === raw?.campaignId);
  if (!c || (!allowSnapshot && raw.link !== c.link)) fail('Báo cáo phải khớp nguyên link của chiến dịch hiện tại.');
  httpUrl(raw.link);
  const source = str(raw.source, 300);
  if (!source || !/^\d{4}-\d{2}-\d{2}$/.test(raw.periodStart || '') || !/^\d{4}-\d{2}-\d{2}$/.test(raw.periodEnd || '')) fail('Cần nguồn báo cáo và ngày bắt đầu/kết thúc dạng YYYY-MM-DD.');
  for (const day of [raw.periodStart, raw.periodEnd]) if (Number.isNaN(Date.parse(day)) || new Date(day).toISOString().slice(0,10) !== day) fail('Ngày báo cáo không tồn tại.');
  if (raw.periodStart > raw.periodEnd || !Number.isInteger(raw.clicks) || raw.clicks < 0 || raw.clicks > 1000000000) fail('Khoảng thời gian hoặc số lượt click không hợp lệ.');
  return { campaignId: c.id, link: raw.link, source, periodStart: raw.periodStart, periodEnd: raw.periodEnd, clicks: raw.clicks };
}
