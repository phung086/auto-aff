import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCapability, validateAffiliateOffer } from '../extension/capability-contract.mjs';

const RAW_LINK = 'https://agentshop247.com/?ref=AS362560C5A713';
const ACTIONS = ['read', 'analyze', 'draft', 'publish', 'report'];
const utc = iso => Date.parse(iso);

function fixture(action, { reviewedAt = '2026-10-10T12:00:00Z',
    expiresAt = '2026-10-12T12:00:00Z', now = '2026-10-11T12:00:00Z' } = {}) {
  const accountId = 'owner-account';
  return {
    adapter: {
      adapterId: 'platform-demo', version: '1.0.0', enabled: true,
      market: 'VN', accountId,
      capabilities: {
        [action]: {
          state: 'verified', ownerApproved: true, accountId,
          sourceId: 'source-approved', requiredScopes: ['platform.read'],
          evidence: { sourceUrl: 'https://example.org/permission-policy', reviewedAt, expiresAt }
        }
      }
    },
    context: {
      market: 'VN', accountId, sourceId: 'source-approved',
      grantedScopes: ['platform.read'], now: utc(now)
    }
  };
}

const invalid = [
  { label: 'nonleap February 29', reviewedAt: '2026-02-29T09:00:00Z',
    expiresAt: '2026-03-10T12:00:00Z', now: '2026-03-03T12:00:00Z' },
  { label: 'February 30', reviewedAt: '2026-02-30T09:00:00Z',
    expiresAt: '2026-03-10T12:00:00Z', now: '2026-03-03T12:00:00Z' },
  { label: 'April 31', reviewedAt: '2026-04-10T09:00:00Z',
    expiresAt: '2026-04-31T09:00:00Z', now: '2026-04-20T12:00:00Z' },
  { label: 'review lacks timezone', reviewedAt: '2026-10-10T12:00:00' },
  { label: 'expiry lacks timezone', expiresAt: '2026-10-12T12:00:00' },
  { label: 'midnight rollover', reviewedAt: '2026-10-10T24:00:00Z' },
  { label: 'UTC offset too large', reviewedAt: '2026-10-10T12:00:00+14:30' }
];

test('invalid permission evidence timestamps fail closed for every capability', () => {
  for (const action of ACTIONS) for (const item of invalid) {
    const { adapter, context } = fixture(action, item);
    assert.deepEqual(evaluateCapability(adapter, action, context),
      { allowed: false, action, reason: 'EVIDENCE_INVALID' },
      action + ' accepted ' + item.label);
  }
});

test('real leap day, UTC and explicit timezones retain valid outcome', () => {
  const valid = [
    { reviewedAt: '2024-02-29T10:00:00Z', expiresAt: '2024-03-02T00:00:00Z',
      now: '2024-03-01T00:00:00Z' },
    { reviewedAt: '2026-10-10T19:00:00+07:00',
      expiresAt: '2026-10-12T19:00:00+07:00' },
    { reviewedAt: '2026-10-10T12:00:00.125Z',
      expiresAt: '2026-10-12T12:00:00.125Z' },
    { reviewedAt: '2026-10-10T04:00:00-08:00',
      expiresAt: '2026-10-12T04:00:00-08:00' }
  ];
  for (const action of ACTIONS) for (const item of valid) {
    const { adapter, context } = fixture(action, item);
    assert.deepEqual(evaluateCapability(adapter, action, context),
      { allowed: true, action, reason: 'VERIFIED_CAPABILITY' });
  }
});

test('expired, unapproved, unscoped and revoked capabilities remain denied', () => {
  const { adapter, context } = fixture('publish');
  adapter.capabilities.publish.evidence.expiresAt = '2026-10-11T12:00:00Z';
  assert.equal(evaluateCapability(adapter, 'publish', context).reason, 'PERMISSION_EXPIRED');
  adapter.capabilities.publish.evidence.expiresAt = '2026-10-09T12:00:00Z';
  assert.equal(evaluateCapability(adapter, 'publish', context).reason, 'EVIDENCE_INVALID');
  adapter.capabilities.publish.evidence.expiresAt = '2026-10-12T12:00:00Z';
  adapter.capabilities.publish.ownerApproved = false;
  assert.equal(evaluateCapability(adapter, 'publish', context).reason, 'OWNER_APPROVAL_MISSING');
  adapter.capabilities.publish.ownerApproved = true;
  context.grantedScopes = [];
  assert.equal(evaluateCapability(adapter, 'publish', context).reason, 'SCOPE_MISSING');
  context.grantedScopes = ['platform.read'];
  context.revoked = true;
  assert.equal(evaluateCapability(adapter, 'publish', context).reason, 'PERMISSION_REVOKED');
});

test('offer preserves its original affiliate URL without normalization', () => {
  const validated = validateAffiliateOffer({ providerId: 'agent-shop', offerId: 'offer-1',
    market: 'VN', affiliateUrl: RAW_LINK });
  assert.equal(validated.affiliateUrl, RAW_LINK);
});
