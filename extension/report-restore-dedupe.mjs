// Validate backup report identity after the existing per-report schema validation.
// No inferred clicks or URL rewriting; no mutation of the supplied entries.
export function assertUniqueRestoredReports(reports) {
  if (!Array.isArray(reports)) throw new TypeError('Expected validated reports array.');
  const ids = new Set();
  const periods = new Set();
  for (const item of reports) {
    if (!item || typeof item.id !== 'string' || !item.id) {
      throw new Error('Invalid restored report identity.');
    }
    const key = JSON.stringify([item.campaignId, item.source, item.periodStart, item.periodEnd]);
    if (ids.has(item.id) || periods.has(key)) {
      throw new Error('Tệp sao lưu chứa báo cáo click trùng ID hoặc trùng nguồn/kỳ.');
    }
    ids.add(item.id);
    periods.add(key);
  }
  return reports;
}
