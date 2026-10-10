import { createReviewCard, prepareHelpfulDraft } from './opportunity-workbench.mjs';

const $ = id => document.getElementById(id);
let campaigns = [], card = null;
const show = (text, error = false) => { $('status').textContent = text; $('status').style.color = error ? '#a3302a' : '#245a43'; };
function selectedCampaign() {
  return campaigns.find(c => c.id === $('campaign').value);
}
async function loadCampaigns() {
  try {
    const { linkdeskState } = await chrome.storage.local.get('linkdeskState');
    const raw = linkdeskState?.campaigns;
    campaigns = Array.isArray(raw) ? raw.filter(c => c?.id && c?.link && c?.product) : [];
  } catch { campaigns = []; }
  $('campaign').replaceChildren();
  for (const c of campaigns) {
    const option = document.createElement('option');
    option.value = c.id; option.textContent = c.name;
    $('campaign').append(option);
  }
  if (!campaigns.length) show('Chưa tìm thấy chiến dịch tại bộ nhớ extension. Tạo chiến dịch ở bảng quản lý trước.', true);
}
$('analyze').addEventListener('click', () => {
  $('analysis-pane').hidden = true;
  $('draft-pane').hidden = true;
  card = null;
  try {
    const campaign = selectedCampaign();
    if (!campaign) throw Error('Chưa có chiến dịch.');
    const topics = $('topics').value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    if (!topics.length) throw Error('Chọn ít nhất một chủ đề.');
    // User verification is an input to a review-only heuristic, not platform authorization.
    const allowed = $('scope-allowed').checked;
    const scope = {
      advertisingAllowed: allowed, ownerConfirmed: allowed, platformAccessAllowed: allowed,
      rulesEvidence: allowed ? 'Owner self-attestation for manual review only' : '',
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
    };
    const productCampaign = { ...campaign, topics };
    card = createReviewCard({
      text: $('post-text').value, permalink: $('permalink').value.trim(),
      postId: $('post-id').value.trim(), campaign: productCampaign, scope,
    });
    $('analysis').textContent = 'Quyết định: ' + card.decision + '\nChủ đề: ' +
      card.topics.map(x => x.id).join(', ') + '\nNhu cầu: ' + card.intent.level +
      '\nLý do: ' + card.reasonCodes.join(', ') + '\n\nKhông có thao tác gửi tự động.';
    $('analysis-pane').hidden = false;
    $('draft').disabled = card.decision !== 'draft_for_review';
    show('Đã phân tích. Chỉ là bản xem xét, không phải quyền xuất bản.');
  } catch (error) { show(error.message, true); }
});
$('draft').addEventListener('click', () => {
  try {
    const campaign = selectedCampaign();
    if (!card) throw Error('Phân tích bài trước.');
    $('draft-text').value = prepareHelpfulDraft(card, campaign, {
      confirmedProduct: $('verified-product').checked,
    });
    $('draft-pane').hidden = false;
    show('Đã tạo bản nháp. Chưa xuất bản.');
  } catch (error) { show(error.message, true); }
});
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('draft-text').value); show('Đã sao chép bản nháp.'); }
  catch { show('Không thể sao chép, hãy chọn văn bản thủ công.', true); }
});
await loadCampaigns();
