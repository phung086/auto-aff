import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCapability, validateAffiliateOffer } from '../extension/capability-contract.mjs';

const RAW_LINK = 'https://agentshop247.com/?ref=AS362560C5A713';
const NOW = Date.parse('2026-10-11T03:30:00.000Z');

function fixture(action = 'draft') {
  return {
    adapter: {
      adapterId: 'platform-example', version: '1.0.0', enabled: true,
      market: 'VN', accountId: 'owner-account',
      capabilities: {
        [action]: {
          state: 'verified', ownerApproved: true, accountId: 'owner-account',
          sourceId: 'owner-approved-source', requiredScopes: ['content.review'],
          evidence: {
            sourceUrl: 'https://example.org/permission-documentation',
            reviewedAt: '2026-10-09T00:00:00.000Z',
            expiresAt: '2026-11-09T00:00:00.000Z'
          }
        }
      }
    },
    context: { market: 'VN', accountId: 'owner-account',
      sourceId: 'owner-approved-source', grantedScopes: ['content.review'], now: NOW }
  };
}

const result = (action, mutate = () => {}) => {
  const { adapter, context } = fixture(action);
  mutate(adapter, context);
  return evaluateCapability(adapter, action, context);
};

test('explicit matching market allows only a separately approved, verified capability', () => {
  assert.deepEqual(result('draft'), { allowed: true, action: 'draft', reason: 'VERIFIED_CAPABILITY' });
});

test('missing adapter or caller market fails closed even when both are absent', () => {
  for (const which of ['adapter', 'context', 'both']) {
    const actual = result('draft', (adapter, context) => {
      if (which !== 'context') delete adapter.market;
      if (which !== 'adapter') delete context.market;
    });
    assert.deepEqual(actual, { allowed: false, action: 'draft', reason: 'MARKET_UNKNOWN' });
  }
});

test('malformed market codes are not treated as verified permissions', () => {
  for (const bad of ['', 'vn', 'VNM', 'VN ', null]) {
    assert.equal(result('draft', (adapter, context) => {
      adapter.market = bad; context.market = bad;
    }).reason, 'MARKET_UNKNOWN');
  }
});

test('different explicit markets deny capability regardless of verified evidence', () => {
  assert.equal(result('draft', (_adapter, context) => { context.market = 'US'; }).reason, 'MARKET_MISMATCH');
});

test('disabled and unknown adapters or unsupported actions do not gain capabilities', () => {
  assert.equal(result('draft', adapter => { adapter.enabled = false; }).reason, 'ADAPTER_DISABLED');
  assert.equal(result('draft', adapter => { adapter.version = ''; }).reason, 'ADAPTER_INVALID');
  assert.equal(evaluateCapability(fixture().adapter, 'send', fixture().context).reason, 'ACTION_UNKNOWN');
  assert.equal(evaluateCapability(fixture().adapter, 'publish', fixture().context).reason, 'CAPABILITY_UNKNOWN');
});

test('draft-only, awaiting permission, and unknown states cannot be treated as verified', () => {
  for (const state of ['draft-only', 'awaiting-permission', 'unknown', 'disabled']) {
    assert.equal(result('draft', adapter => { adapter.capabilities.draft.state = state; }).reason, 'CAPABILITY_NOT_VERIFIED');
  }
});

test('stored approval flags do not bypass owner, account, or revocation guards', () => {
  assert.equal(result('draft', adapter => { adapter.capabilities.draft.ownerApproved = false; }).reason, 'OWNER_APPROVAL_MISSING');
  assert.equal(result('draft', (_adapter, context) => { context.accountId = 'other-account'; }).reason, 'ACCOUNT_MISMATCH');
  assert.equal(result('draft', (_adapter, context) => { context.revoked = true; }).reason, 'PERMISSION_REVOKED');
});

test('publisher capability requires a matching explicit source identity', () => {
  assert.equal(result('publish', (_adapter, context) => { delete context.sourceId; }).reason, 'SOURCE_MISMATCH');
  assert.equal(result('publish', (_adapter, context) => { context.sourceId = 'other-source'; }).reason, 'SOURCE_MISMATCH');
  assert.equal(result('publish').allowed, true);
});

test('expired permission and missing granted scope are denied', () => {
  assert.equal(result('draft', (adapter, context) => {
    context.now = Date.parse('2026-12-01T00:00:00.000Z');
  }).reason, 'PERMISSION_EXPIRED');
  assert.equal(result('draft', (_adapter, context) => { context.grantedScopes = []; }).reason, 'SCOPE_MISSING');
  assert.equal(result('draft', adapter => { adapter.capabilities.draft.requiredScopes = undefined; }).reason, 'SCOPES_UNKNOWN');
});

test('invalid time evidence cannot authorize capability', () => {
  assert.equal(result('draft', adapter => { adapter.capabilities.draft.evidence.reviewedAt = 'yesterday'; }).reason, 'EVIDENCE_INVALID');
  assert.equal(result('draft', adapter => { adapter.capabilities.draft.evidence.expiresAt = '2026-10-08T00:00:00.000Z'; }).reason, 'EVIDENCE_INVALID');
});

test('affiliate offer preserves the exact raw URL and rejects credentials', () => {
  const offer = { providerId: 'agent-shop', offerId: 'link-1', market: 'VN', affiliateUrl: RAW_LINK };
  const validated = validateAffiliateOffer(offer);
  assert.equal(validated.affiliateUrl, 'https://agentshop247.com/?ref=AS362560C5A713');
  assert.equal(validateAffiliateOffer({ ...offer, affiliateUrl: 'https://vendor.test/?b=2&a=%2f' }).affiliateUrl, 'https://vendor.test/?b=2&a=%2f');
  assert.throws(() => validateAffiliateOffer({ ...offer, affiliateUrl: 'https://user:pass@vendor.test/?ref=1' }));
  assert.throws(() => validateAffiliateOffer({ ...offer, affiliateUrl: 'http://vendor.test/?ref=1' }));
});
