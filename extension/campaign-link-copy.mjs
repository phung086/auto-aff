import { httpUrl } from './model.mjs';

// Return the currently saved campaign link, byte-for-byte as a JavaScript string.
// Never derive it from a parsed URL; queued jobs retain their own snapshots.
export function rawCampaignLink(campaigns, campaignId) {
  if (!Array.isArray(campaigns) || typeof campaignId !== 'string' || !campaignId) {
    throw new Error('Mã chiến dịch không hợp lệ.');
  }

  let found;
  for (const campaign of campaigns) {
    if (campaign?.id !== campaignId) continue;
    if (found) throw new Error('Trùng mã chiến dịch. Không thể xác định link an toàn.');
    found = campaign;
  }
  if (!found) throw new Error('Không tìm thấy chiến dịch hiện tại.');
  return httpUrl(found.link);
}
