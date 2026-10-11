import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCapability, validateAffiliateOffer } from '../extension/capability-contract.mjs';

const AFFILIATE_URL = 'https://agentshop247.com/?ref=AS362560C5A713';
const NOW = Date.parse('2026-10-11T12:00:00.000Z');

function fixture(action = 'publish') {
  const accountId = 'approved-account';
  const sourceId = 'approved-source';
  return {
    adapter: {
      adapterId: 'approved-adapter', version: '1.0.0', enabled: true,
      market: 'VN', accountId,
      capabilities: {
        [action]: {
          state: 'verified', ownerApproved: true, accountId, sourceId,
          requiredScopes: ['content.publish'],
          evidence: {
            sourceUrl: 'https://example.org/platform-permissions',
            reviewedAt: '2026-10-10T12:00:00.000Z',
            expiresAt: '2026-11-10T12:00:00.000Z'
          }
        }
      }
    },
    context: {
      market: 'VN', accountId, sourceId,
      grantedScopes: ['content.publish'], now: NOW
    }
  };
}

function decision(action = 'publish', mutate = () => {}) {
  const { adapter, context } = fixture(action);
  mutate(adapter, context);
  return evaluateCapability(adapter, action, context);
}

test('publish cannot treat two empty API scope sets as consent', () => {
  const actual = decision('publish', (adapter, context) => {
    adapter.capabilities.publish.requiredScopes = [];
    context.grantedScopes = [];
  });
  assert.deepEqual(actual, { allowed: false, action: 'publish', reason: 'SCOPES_UNKNOWN' });
});

test('unrelated granted scope does not authorize publish without a declared required scope', () => {
  const actual = decision('publish', (adapter, context) => {
    adapter.capabilities.publish.requiredScopes = [];
    context.grantedScopes = ['profile.read'];
  });
  assert.equal(actual.reason, 'SCOPES_UNKNOWN');
  assert.equal(actual.allowed, false);
});

test('explicit, granted publish scope retains valid capability evaluation', () => {
  assert.deepEqual(decision(), { allowed: true, action: 'publish', reason: 'VERIFIED_CAPABILITY' });
});

test('publish with a missing or ungranted API scope fails closed', () => {
  assert.equal(decision('publish', (a, _c) => {
    delete a.capabilities.publish.requiredScopes;
  }).reason, 'SCOPES_UNKNOWN');
  assert.equal(decision('publish', (_a, c) => {
    c.grantedScopes = [];
  }).reason, 'SCOPE_MISSING');
});

test('other capabilities may have empty scopes without acquiring publish permission', () => {
  for (const action of ['read', 'analyze', 'draft', 'report']) {
    const actual = decision(action, (adapter, context) => {
      adapter.capabilities[action].requiredScopes = [];
      context.grantedScopes = [];
    });
    assert.equal(actual.allowed, true, `${action} keeps its existing contract`);
  }
  assert.equal(decision('publish', (adapter, context) => {
    adapter.capabilities.publish.requiredScopes = [];
    context.grantedScopes = [];
    context.sourceId = 'other-source';
  }).reason, 'SOURCE_MISMATCH');
});

test('publisher must still bind permission to the selected source', () => {
  assert.equal(decision('publish', (_adapter, context) => {
    context.sourceId = 'other-source';
  }).reason, 'SOURCE_MISMATCH');
});

test('offer validation preserves the exact supplied affiliate URL', () => {
  const result = validateAffiliateOffer({
    providerId: 'agentshop247', offerId: 'original', market: 'VN',
    affiliateUrl: AFFILIATE_URL
  });
  assert.equal(result.affiliateUrl, AFFILIATE_URL);
});
