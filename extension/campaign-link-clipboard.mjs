import { rawCampaignLink } from './campaign-link-copy.mjs';

// Explicit, user-initiated clipboard action only. Never persists, posts,
// normalizes links, or modifies queued jobs and their URL snapshots.
export async function copyCampaignLink(campaigns, campaignId, writeText) {
  const link = rawCampaignLink(campaigns, campaignId);
  if (typeof writeText !== 'function') {
    throw new Error('Clipboard không khả dụng. Hãy kiểm tra quyền sao chép.');
  }
  try {
    await writeText(link);
  } catch {
    throw new Error('Không thể sao chép. Hãy kiểm tra quyền clipboard.');
  }
  return link;
}
