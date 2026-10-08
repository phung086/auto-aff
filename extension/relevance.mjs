// Read-only post relevance classifier. It neither browses nor publishes.
// Source text is untrusted input; only approved platform adapters may act.
export const TOPIC_ALIASES = Object.freeze([
  { id: 'claude', aliases: ['claude code', 'claude pro', 'claude', 'anthropic'] },
  { id: 'codex', aliases: ['openai codex', 'codex'] },
  { id: 'antigravity', aliases: ['google antigravity', 'antigravity'] },
  { id: 'gemini', aliases: ['google ai studio', 'gemini advanced', 'gemini cli', 'gemini'] },
  { id: 'grok', aliases: ['grok'] },
  { id: 'cursor', aliases: ['cursor ai', 'cursor'], reviewAliases: ['cussor'] },
  { id: 'chatgpt', aliases: ['chat gpt', 'chatgpt', 'gpt-4o', 'gpt-5', 'gpt-6'] },
  { id: 'copilot', aliases: ['github copilot', 'copilot'] },
  { id: 'deepseek', aliases: ['deepseek'] },
  { id: 'perplexity', aliases: ['perplexity'] },
  { id: 'midjourney', aliases: ['midjourney'] },
  { id: 'kling', aliases: ['kling ai', 'kling'] },
  { id: 'runway', aliases: ['runwayml', 'runway'] },
  { id: 'elevenlabs', aliases: ['elevenlabs'] },
  { id: 'openrouter', aliases: ['openrouter'] },
  { id: 'api', aliases: ['openai api', 'api key', 'api'], broad: true },
  { id: 'ai-general', aliases: ['tri tue nhan tao', 'artificial intelligence'], broad: true },
]);

const HIGH_INTENT = [
  'mua o dau', 'mua tai khoan', 'can mua', 'muon mua', 'co ai ban',
  'cho nao ban', 'tim cho mua', 'xin noi mua', 'can tai khoan',
  'tai khoan pro', 'dang ky goi', 'nang cap goi', 'gia bao nhieu',
  'bao nhieu tien', 'gia goi', 'mua license', 'mua key', 'can key',
  'mua ban quyen', 'where to buy', 'buy subscription', 'need an account',
];
const REVIEW_INTENT = [
  'muon dung', 'can dung', 'can tool', 'ban pro', 'het han',
  'khong thanh toan duoc', 'khong co the visa', 'goi nao',
  'nha cung cap', 'nguon uy tin', 'co ben nao', 'nen mua',
  'looking for a provider', 'recommend a provider', 'subscription price',
];
const OPT_OUT = [
  'cam quang cao', 'khong nhan quang cao', 'khong quang cao',
  'dung quang cao', 'khong muon mua', 'khong can mua',
  'khong can tai khoan', 'no ads', 'no promotions',
];
const TECH_DISCUSSION = [
  'demo', 'khoe project', 'showcase', 'chia se du an', 'huong dan',
  'tutorial', 'fix loi', 'bug', 'benchmark', 'open source',
  'github repo', 'debug', 'loi 500', 'loi 404',
];

export function foldText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
    .replace(/\s+/g, ' ').trim();
}

function containsTerm(normalized, value) {
  const term = foldText(value);
  if (!term) return false;
  let start = 0;
  while (start < normalized.length) {
    const at = normalized.indexOf(term, start);
    if (at < 0) return false;
    const before = at > 0 ? normalized[at - 1] : '';
    const after = normalized[at + term.length] || '';
    const letter = /[\p{L}\p{N}]/u;
    if ((!before || !letter.test(before)) && (!after || !letter.test(after)))
      return true;
    start = at + 1;
  }
  return false;
}

export function identifyAiTopics(text) {
  const normalized = foldText(text);
  const matches = [];
  for (const topic of TOPIC_ALIASES) {
    const term = topic.aliases.find(a => containsTerm(normalized, a));
    const reviewAlias = !term && topic.reviewAliases?.find(a => containsTerm(normalized, a));
    if (term || reviewAlias) matches.push({
      id: topic.id, matchedTerm: term || reviewAlias,
      specificity: reviewAlias ? 'ambiguous' : topic.broad ? 'broad' : 'specific',
    });
  }
  // The Vietnamese pronoun "ai" must not be counted as the English AI acronym.
  if (/(?:^|[^\p{L}\p{N}])AI(?=$|[^\p{L}\p{N}])/u.test(String(text))
      || ['cong cu ai', 'tool ai', 'tai khoan ai', 'mo hinh ai']
        .some(a => containsTerm(normalized, a))) {
    if (!matches.some(m => m.id === 'ai-general')) matches.push({
      id: 'ai-general', matchedTerm: 'AI', specificity: 'broad',
    });
  }
  return matches;
}

export function detectPurchaseIntent(text) {
  const normalized = foldText(text);
  const blocked = OPT_OUT.filter(x => containsTerm(normalized, x));
  const high = HIGH_INTENT.filter(x => containsTerm(normalized, x));
  const review = REVIEW_INTENT.filter(x => containsTerm(normalized, x));
  const technical = TECH_DISCUSSION.filter(x => containsTerm(normalized, x));
  const level = blocked.length ? 'excluded' : high.length ? 'high'
    : review.length ? 'unclear' : 'none';
  return { level, evidence: blocked.length ? blocked : high.length ? high : review, technical };
}

function permissionIssue(scope, now) {
  if (scope?.advertisingAllowed === false) return 'PROMOTION_DISALLOWED';
  if (!scope?.advertisingAllowed || !scope?.ownerConfirmed
      || !scope?.platformAccessAllowed || !scope?.rulesEvidence)
    return 'PERMISSION_UNVERIFIED';
  const expiry = Date.parse(scope.expiresAt ?? '');
  if (!Number.isFinite(expiry) || expiry <= now) return 'RULES_EXPIRED';
  return null;
}

// Output is a review candidate only. There is NO auto-comment or auto-publish path.
// offers: [{id, topics: ['claude', ...]}], verified separately per supplier.
// source: {platform, sourceId, postId, permalink, text}, scope: permission evidence.
// campaignId and seenKeys avoid repeated recommendations for the same post.
export function classifyOpportunity({
  source = {}, offers = [], scope = null, campaignId = '',
  seenKeys = new Set(), now = Date.now(),
} = {}) {
  const topics = identifyAiTopics(source.text || '');
  const intent = detectPurchaseIntent(source.text || '');
  const base = { topics, intent, matchedOfferIds: [], decision: 'skip',
    reasonCodes: [], dedupeKey: null, score: 0 };
  const finish = (decision, code) => ({
    ...base, decision, reasonCodes: [...base.reasonCodes, code],
  });

  if (intent.level === 'excluded') return finish('skip', 'COMMERCIAL_OPT_OUT');
  if (!topics.length) return finish('skip', 'NO_TOPIC_MATCH');

  const allowedTopicIds = new Set(topics.map(t => t.id));
  const matching = offers.filter(offer => typeof offer?.id === 'string'
    && Array.isArray(offer.topics)
    && offer.topics.some(topic => allowedTopicIds.has(topic)));
  base.matchedOfferIds = matching.map(offer => offer.id);

  if (!matching.length) return finish('skip', 'NO_MATCHING_OFFER');
  if (intent.level === 'none') return finish('skip',
    intent.technical.length ? 'TECHNICAL_ONLY' : 'NO_PURCHASE_INTENT');

  const ambiguous = topics.every(t => t.specificity !== 'specific');
  base.score = intent.level === 'high' ? (ambiguous ? 0.55 : 0.9) : 0.5;
  if (ambiguous || topics.some(t => t.specificity === 'ambiguous'))
    return finish('review', 'TOPIC_AMBIGUOUS');
  if (intent.level !== 'high') return finish('review', 'INTENT_UNCLEAR');

  const issue = permissionIssue(scope, now);
  if (issue) return finish(issue === 'PROMOTION_DISALLOWED' ? 'skip' : 'review', issue);

  const { platform, sourceId, postId, permalink } = source;
  if (![platform, sourceId, postId, permalink, campaignId]
    .every(v => typeof v === 'string' && v.trim()))
    return finish('review', 'IDENTITY_MISSING');

  const key = JSON.stringify([platform, sourceId, postId, campaignId]);
  base.dedupeKey = key;
  if (seenKeys?.has?.(key) || (Array.isArray(seenKeys) && seenKeys.includes(key)))
    return finish('skip', 'DUPLICATE_POST');

  // A confirmed opportunity is not authorization to publish.
  base.decision = 'draft_for_review';
  base.reasonCodes = ['TOPIC_AND_PURCHASE_INTENT_MATCH'];
  return base;
}
