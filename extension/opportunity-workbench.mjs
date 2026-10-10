import { classifyOpportunity } from './relevance.mjs';

export const DISCLOSURE = 'Link tiếp thị liên kết.';

export function createReviewCard({ text, permalink, campaign, scope, postId, sourceId = 'manual', now = Date.now() }) {
  if (typeof text !== 'string' || !text.trim() || text.length > 8000) throw Error('Hãy nhập một đoạn bài viết hợp lệ (tối đa 8.000 ký tự).');
  if (!campaign || typeof campaign.id !== 'string' || !campaign.id.trim()) throw Error('Chọn một chiến dịch.');
  const link = campaign.link;
  if (typeof link !== 'string' || link.trim() !== link || !/^https:\/\/[^\s]+$/.test(link)) throw Error('Link chiến dịch không hợp lệ.');
  if (!Array.isArray(campaign.topics) || !campaign.topics.length) throw Error('Cần chọn chủ đề sản phẩm đã xác minh.');
  const source = { platform: 'manual', sourceId, postId, permalink, text };
  const result = classifyOpportunity({
    source, offers: [{ id: campaign.id, topics: campaign.topics }], scope,
    campaignId: campaign.id, now,
  });
  return { ...result, sourceText: text, campaignId: campaign.id, affiliateUrl: link, permalink };
}

// A draft is offered for manual review only; never sent to a social platform.
export function prepareHelpfulDraft(card, campaign, { confirmedProduct = false } = {}) {
  if (card.decision !== 'draft_for_review') throw Error('Bài viết chưa đủ điều kiện tạo nội dung gợi ý.');
  if (card.campaignId !== campaign?.id || card.affiliateUrl !== campaign?.link) throw Error('Chiến dịch hoặc link đã thay đổi.');
  if (!confirmedProduct) throw Error('Cần xác nhận sản phẩm của nhà cung cấp phù hợp với câu hỏi.');
  const product = String(campaign.product || '').trim();
  if (!product || product.length > 180 || /https?:\/\//i.test(product)) throw Error('Mô tả sản phẩm chưa hợp lệ.');
  return 'Bạn có thể tham khảo thông tin và điều kiện của ' + product +
    ' tại đây. Nên kiểm tra giá, thời hạn và điều kiện sử dụng trực tiếp trước khi chọn.\n' +
    card.affiliateUrl + '\n\n' + DISCLOSURE;
}
