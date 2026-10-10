// Read-only, provenance-preserving export of manually imported supplier click reports.
// This module must never calculate clicks from post counts or invent order metrics.
import { csvCell, httpUrl } from './model.mjs';

const MAX_REPORTS = 100;
const DECLARATION = 'Người dùng nhập; chưa xác minh độc lập';

function textField(value, max, name) {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error('Thiếu ' + name + ' hợp lệ.');
  return value;
}
function day(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)
    throw new Error('Ngày báo cáo không hợp lệ.');
  return value;
}

export function listSourcedClickRows(state, campaignId = '') {
  if (!state || !Array.isArray(state.campaigns) || !Array.isArray(state.reports) ||
      state.reports.length > MAX_REPORTS || state.campaigns.length > 100)
    throw new Error('Dữ liệu báo cáo không hợp lệ.');
  const campaigns = new Map();
  for (const campaign of state.campaigns) {
    const id = textField(campaign?.id, 100, 'mã chiến dịch');
    if (campaigns.has(id)) throw new Error('Trùng mã chiến dịch.');
    campaigns.set(id, campaign);
  }
  if (campaignId && !campaigns.has(campaignId))
    throw new Error('Không tìm thấy chiến dịch được chọn.');

  // Validate all records before filtering: selecting one provider cannot hide
  // an ambiguous audit ID or malformed record elsewhere in the ledger.
  const ids = new Set();
  const rows = state.reports.map((report, index) => {
    try {
      const id = textField(report?.id, 100, 'mã báo cáo');
      if (id !== id.trim() || ids.has(id)) throw new Error('Mã báo cáo trùng hoặc không hợp lệ.');
      ids.add(id);
      const campaign = campaigns.get(textField(report.campaignId, 100, 'mã chiến dịch'));
      if (!campaign) throw new Error('Chiến dịch không tồn tại.');
      const name = textField(campaign.name, 200, 'tên chiến dịch');
      const link = httpUrl(report.link); // validates only, returns exact original bytes
      const source = textField(report.source, 300, 'nguồn báo cáo');
      const start = day(report.periodStart), end = day(report.periodEnd);
      if (start > end || !Number.isInteger(report.clicks) ||
          report.clicks < 0 || report.clicks > 1000000000)
        throw new Error('Khoảng ngày hoặc click không hợp lệ.');
      return {
        reportId: id, campaignId: campaign.id, campaignName: name,
        link, source, periodStart: start, periodEnd: end, clicks: report.clicks,
        importedAt: typeof report.importedAt === 'string' ? report.importedAt : '',
        linkStatus: link === campaign.link ? 'Khớp link hiện tại' : 'Ảnh chụp link lịch sử',
        provenance: DECLARATION
      };
    } catch (error) {
      throw new Error('Báo cáo #' + (index + 1) + ' không hợp lệ: ' + error.message);
    }
  });
  const visible = rows.filter(row => !campaignId || row.campaignId === campaignId);
  for (const row of visible) {
    row.overlap = visible.some(other => other !== row &&
      other.campaignId === row.campaignId && other.link === row.link &&
      other.source === row.source && row.periodStart <= other.periodEnd &&
      other.periodStart <= row.periodEnd);
    row.periodStatus = row.overlap ? 'Kỳ chồng lấn; không cộng' : 'Không phát hiện chồng kỳ cùng nguồn';
  }
  return visible;
}

export function buildSourcedClickCsv(state, campaignId = '') {
  const rows = listSourcedClickRows(state, campaignId);
  if (!rows.length) throw new Error('Chưa có báo cáo click cho lựa chọn này.');
  const records = [
    ['Mã báo cáo', 'Mã chiến dịch', 'Tên chiến dịch', 'Raw affiliate URL snapshot',
      'Nguồn khai báo', 'Từ ngày', 'Đến ngày', 'Click khai báo', 'Ngày nhập',
      'Trạng thái link', 'Kiểm tra chồng kỳ', 'Nguồn dữ liệu'],
    ...rows.map(r => [r.reportId, r.campaignId, r.campaignName, r.link,
      r.source, r.periodStart, r.periodEnd, r.clicks, r.importedAt,
      r.linkStatus, r.periodStatus, r.provenance])
  ];
  return '\uFEFF' + records.map(record => record.map(csvCell).join(',')).join('\r\n');
}
