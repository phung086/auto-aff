import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyAiTopics, detectPurchaseIntent, classifyOpportunity } from '../extension/relevance.mjs';

const now = Date.parse('2026-10-09T00:00:00Z');
const scope = {
  advertisingAllowed: true, ownerConfirmed: true,
  platformAccessAllowed: true, rulesEvidence: 'Owner reviewed source policy',
  expiresAt: '2027-01-01T00:00:00Z',
};
const source = text => ({
  platform: 'fixture', sourceId: 'authorized-group', postId: 'post-123',
  permalink: 'https://example.test/posts/123', text,
});
const offers = [{ id: 'claude-plan', topics: ['claude'] }];
const run = (text, overrides = {}) => classifyOpportunity({
  source: source(text), offers, scope, campaignId: 'campaign-a', now, ...overrides,
});

test('specific model + direct buying request becomes draft candidate only', () => {
  const result = run('Mình cần tài khoản Claude Pro, có ai bán uy tín không?');
  assert.equal(result.decision, 'draft_for_review');
  assert.deepEqual(result.matchedOfferIds, ['claude-plan']);
  assert.equal(result.intent.level, 'high');
  assert.deepEqual(result.reasonCodes, ['TOPIC_AND_PURCHASE_INTENT_MATCH']);
  assert.equal('body' in result, false);
});

test('keyword without buying intent is skipped even for AI programming', () => {
  const result = run('Demo dự án với Claude Code. Mình chia sẻ project mẫu trên GitHub.');
  assert.equal(result.decision, 'skip');
  assert.deepEqual(result.reasonCodes, ['TECHNICAL_ONLY']);
});

test('API errors and technical help are not sales opportunities', () => {
  const result = run('Hướng dẫn fix lỗi API 500 khi debug', {
    offers: [{ id: 'api-credit', topics: ['api'] }],
  });
  assert.equal(result.decision, 'skip');
  assert.equal(result.reasonCodes[0], 'TECHNICAL_ONLY');
});

test('case, accents and word boundaries work; Vietnamese Ai is not AI', () => {
  const topics = identifyAiTopics('Ai có cách nào giải bài tập này không?');
  assert.deepEqual(topics, []);
  assert.equal(identifyAiTopics('mai tôi đi học').length, 0);
  assert.ok(identifyAiTopics('Muốn mua gói GEMINI Advanced').some(t => t.id === 'gemini'));
  assert.ok(identifyAiTopics('AI tools').some(t => t.id === 'ai-general'));
  assert.ok(identifyAiTopics('API').some(t => t.id === 'api'));
});

test('Codex, Antigravity, Gemini, Grok, Cursor, ChatGPT and Claude are recognized', () => {
  const names = ['Codex', 'Antigravity', 'Gemini', 'Grok', 'Cursor', 'ChatGPT', 'Claude'];
  for (const name of names)
    assert.ok(identifyAiTopics(name).some(t => t.specificity === 'specific'), name);
});

test('ambiguous spelling Cussor is reviewed, never accepted silently', () => {
  const result = run('Mình cần mua Cussor Pro', {
    offers: [{ id: 'cursor-plan', topics: ['cursor'] }],
  });
  assert.equal(result.decision, 'review');
  assert.deepEqual(result.reasonCodes, ['TOPIC_AMBIGUOUS']);
});

test('generic AI keyword requires review despite commercial intent', () => {
  const result = run('Mình muốn mua tài khoản AI để làm việc', {
    offers: [{ id: 'general-ai', topics: ['ai-general'] }],
  });
  assert.equal(result.decision, 'review');
  assert.equal(result.reasonCodes[0], 'TOPIC_AMBIGUOUS');
});

test('sales mention alone cannot substitute a verified matching offer', () => {
  const result = run('Mình cần mua Gemini Advanced');
  assert.equal(result.decision, 'skip');
  assert.equal(result.reasonCodes[0], 'NO_MATCHING_OFFER');
});

test('direct opt-out blocks promotion even if keywords and buying words appear', () => {
  const result = run('Cần mua Claude Pro. Nhưng nhóm cấm quảng cáo.');
  assert.equal(result.decision, 'skip');
  assert.equal(result.reasonCodes[0], 'COMMERCIAL_OPT_OUT');
});

test('question about using an AI tool without clear purchase is review-only', () => {
  const result = run('Mình muốn dùng Claude để nghiên cứu.');
  assert.equal(result.decision, 'review');
  assert.equal(result.reasonCodes[0], 'INTENT_UNCLEAR');
});

test('missing or expired source permissions never generate an approved candidate', () => {
  assert.deepEqual(run('Cần mua Claude Pro', { scope: null }).reasonCodes, ['PERMISSION_UNVERIFIED']);
  const blocked = run('Cần mua Claude Pro', { scope: { ...scope, advertisingAllowed: false } });
  assert.equal(blocked.decision, 'skip');
  assert.deepEqual(blocked.reasonCodes, ['PROMOTION_DISALLOWED']);
  const expired = run('Cần mua Claude Pro', {
    scope: { ...scope, expiresAt: '2026-01-01T00:00:00Z' },
  });
  assert.equal(expired.decision, 'review');
  assert.deepEqual(expired.reasonCodes, ['RULES_EXPIRED']);
});

test('missing stable post identity requires review', () => {
  const result = run('Mình cần mua Claude Pro', {
    source: { ...source('Mình cần mua Claude Pro'), postId: '' },
  });
  assert.equal(result.decision, 'review');
  assert.equal(result.reasonCodes[0], 'IDENTITY_MISSING');
});

test('repeated same post and campaign is skipped, but another campaign gets distinct key', () => {
  const first = run('Cần mua Claude Pro');
  const duplicate = run('Cần mua Claude Pro', { seenKeys: new Set([first.dedupeKey]) });
  assert.equal(duplicate.decision, 'skip');
  assert.equal(duplicate.reasonCodes[0], 'DUPLICATE_POST');
  const other = run('Cần mua Claude Pro', {
    seenKeys: new Set([first.dedupeKey]), campaignId: 'campaign-b',
  });
  assert.equal(other.decision, 'draft_for_review');
  assert.notEqual(other.dedupeKey, first.dedupeKey);
});

test('source and exact affiliate link are never mutated or added to output', () => {
  const link = 'https://agentshop247.com/?ref=AS362560C5A713';
  const s = { ...source('Cần mua Claude Pro'), affiliateUrl: link };
  const before = structuredClone(s);
  const result = run(s.text, { source: s });
  assert.deepEqual(s, before);
  assert.equal(s.affiliateUrl, link);
  assert.equal(JSON.stringify(result).includes(link), false);
  assert.equal('publish' in result, false);
});

test('no marketing decision is made on irrelevant question with no topics', () => {
  assert.equal(detectPurchaseIntent('Không cần mua').level, 'excluded');
  const result = run('Hôm nay trời đẹp quá');
  assert.equal(result.decision, 'skip');
  assert.equal(result.reasonCodes[0], 'NO_TOPIC_MATCH');
});
