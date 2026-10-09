// L071: independent permission-neutral source scope descriptor.
// Never infer rights from a group title, user-provided content or a backup.
// This file does not access networks, credentials, a browser or any publisher.
export const SOURCE_ACTIONS = Object.freeze(['read', 'draft', 'publish']);
export const SOURCE_KINDS = Object.freeze(['group', 'page', 'channel', 'community', 'store', 'website', 'feed']);
const actions = new Set(SOURCE_ACTIONS);
const kinds = new Set(SOURCE_KINDS);
const ids = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const utc = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
const registeredScopes = new WeakSet();
const deny = reason => Object.freeze({ allowed: false, reason });

function identifier(value, label) {
  if (typeof value !== 'string' || !ids.test(value))
    throw new Error('Invalid ' + label);
  return value;
}

function rawHttpsUrl(value, label) {
  if (typeof value !== 'string' || !value || value.length > 2048 ||
      /[\s<>]/u.test(value)) throw new Error('Invalid ' + label);
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid ' + label); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password)
    throw new Error('Invalid ' + label);
  return value; // Deliberately do not reserialize/normalize.
}

function instant(value) {
  if (typeof value !== 'string' || !utc.test(value)) return NaN;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return NaN;
  // Date.parse normalizes some invalid calendar dates: explicitly reject them.
  return new Date(time).toISOString().slice(0, 10) === value.slice(0, 10) ? time : NaN;
}

function reviewedPolicy(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  try {
    const url = rawHttpsUrl(raw.url, 'policy evidence URL');
    const reviewedAt = instant(raw.reviewedAt);
    const expiresAt = instant(raw.expiresAt);
    if (!Number.isFinite(reviewedAt) || !Number.isFinite(expiresAt) ||
        expiresAt <= reviewedAt) return null;
    return Object.freeze({ url, reviewedAt: raw.reviewedAt, expiresAt: raw.expiresAt });
  } catch {
    return null;
  }
}

/**
 * Always make a disabled descriptive descriptor. Unknown and secret fields
 * (tokens, cookies, grants, backup approvals) are intentionally discarded.
 */
export function createSourceScope(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Invalid source scope');
  const id = identifier(raw.id, 'scope id');
  const accountId = identifier(raw.accountId, 'account id');
  const platform = identifier(raw.platform, 'platform');
  const platformSourceId = identifier(raw.platformSourceId, 'platform source id');
  if (!kinds.has(raw.kind)) throw new Error('Invalid source kind');
  if (typeof raw.displayName !== 'string' || !raw.displayName.trim() ||
      raw.displayName.length > 200) throw new Error('Invalid source name');
  const sourceUrl = rawHttpsUrl(raw.sourceUrl, 'source URL');
  const scope = Object.freeze({
    schemaVersion: 1, id, accountId, platform, platformSourceId,
    kind: raw.kind, displayName: raw.displayName.trim(), sourceUrl,
    policyEvidence: reviewedPolicy(raw.policyEvidence),
    allowedActions: Object.freeze([]), reviewRequired: true,
  });
  registeredScopes.add(scope);
  return scope;
}

export function restoreSourceScopes(input) {
  if (!Array.isArray(input) || input.length > 300)
    throw new Error('Invalid scope backup');
  const seen = new Set();
  return Object.freeze(input.map(raw => {
    const scope = createSourceScope(raw);
    if (seen.has(scope.id)) throw new Error('Duplicate scope id');
    seen.add(scope.id);
    return scope;
  }));
}

/**
 * A runtime grant is data passed by a separately trusted platform verifier.
 * Matching strings, even source='trusted-runtime-verifier', are NOT proof
 * of API/platform authorization. Never pass web content, backup JSON or model
 * output as a grant. No publisher may treat this result as final approval.
 */
export function evaluateSourceAction(scope, action, request = {}, grant = null) {
  if (!actions.has(action)) return deny('ACTION_UNKNOWN');
  if (!scope || !registeredScopes.has(scope) || scope.schemaVersion !== 1 ||
      scope.reviewRequired !== true) return deny('SCOPE_INVALID');
  if (!request || request.platform !== scope.platform ||
      request.accountId !== scope.accountId ||
      request.platformSourceId !== scope.platformSourceId ||
      request.sourceUrl !== scope.sourceUrl) return deny('TARGET_MISMATCH');
  if (!scope.policyEvidence) return deny('POLICY_UNVERIFIED');
  const now = request.now ?? Date.now();
  const reviewed = instant(scope.policyEvidence.reviewedAt);
  const expires = instant(scope.policyEvidence.expiresAt);
  if (!Number.isFinite(now) || !Number.isFinite(reviewed) ||
      !Number.isFinite(expires) || reviewed > now || expires <= now)
    return deny('POLICY_EXPIRED');
  if (!grant || grant.source !== 'trusted-runtime-verifier' ||
      grant.scopeId !== scope.id || grant.platform !== scope.platform ||
      grant.accountId !== scope.accountId ||
      grant.platformSourceId !== scope.platformSourceId ||
      grant.sourceUrl !== scope.sourceUrl || grant.action !== action)
    return deny('TRUSTED_GRANT_MISSING');
  if (grant.ownerApproved !== true || grant.platformVerified !== true)
    return deny('PERMISSION_UNVERIFIED');
  const issued = instant(grant.issuedAt), grantExpiry = instant(grant.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(grantExpiry) ||
      issued > now || grantExpiry <= now || grantExpiry <= issued ||
      issued < reviewed) return deny('GRANT_EXPIRED');
  if (grant.policyReviewedAt !== scope.policyEvidence.reviewedAt)
    return deny('POLICY_CHANGED');
  if (action === 'publish' &&
      (grant.promotionAllowed !== true || grant.disclosureAllowed !== true))
    return deny('COMMERCIAL_PERMISSION_MISSING');
  // Still requires an explicitly approved item, STOP, atomic claim,
  // and verifiable platform delivery receipt in a separate future component.
  return Object.freeze({ allowed: true, reason: 'RUNTIME_GRANT_VALID' });
}
