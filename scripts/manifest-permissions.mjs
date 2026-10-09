/**
 * Build-time guard for install-time Chrome extension permissions.
 * This intentionally does not infer account consent or grant runtime permissions.
 */
const approvedApiPermissions = new Set([
  'storage', 'activeTab', 'scripting', 'alarms', 'clipboardWrite',
]);

// The 8791 loopback endpoint is included for the already-open worker OAuth PR.
const approvedRequiredHosts = new Set([
  'https://graph.facebook.com/*',
  'https://api.openai.com/*',
  'https://www.facebook.com/*',
  'https://m.facebook.com/*',
  'https://web.facebook.com/*',
  'https://facebook.com/*',
  'http://127.0.0.1:8787/*',
  'http://127.0.0.1:8791/*',
]);

// Existing manifest patterns, NOT a claim that any requested origin is approved.
const currentlyDeclaredOptionalHosts = new Set([
  'https://*/*',
  'http://*/*',
]);

function readUniqueStrings(manifest, field) {
  const list = manifest[field];
  if (!Array.isArray(list) || list.some((value) => typeof value !== 'string' || !value)) {
    throw new Error(`Invalid manifest ${field}: expected an array of nonempty strings`);
  }
  if (new Set(list).size !== list.length) {
    throw new Error(`Duplicate manifest ${field} entry`);
  }
  return list;
}

function assertApproved(list, approved, field) {
  for (const entry of list) {
    if (!approved.has(entry)) {
      throw new Error(`Unreviewed ${field}: ${JSON.stringify(entry)}`);
    }
  }
}

export function auditManifestPermissions(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Invalid Chrome manifest');
  }
  if (manifest.manifest_version !== 3) {
    throw new Error('Manifest V3 is required');
  }
  const installedApi = readUniqueStrings(manifest, 'permissions');
  const installedHosts = readUniqueStrings(manifest, 'host_permissions');
  const optionalHosts = readUniqueStrings(manifest, 'optional_host_permissions');

  assertApproved(installedApi, approvedApiPermissions, 'permissions');
  assertApproved(installedHosts, approvedRequiredHosts, 'host_permissions');
  assertApproved(optionalHosts, currentlyDeclaredOptionalHosts, 'optional_host_permissions');

  const csp = manifest.content_security_policy;
  if (!csp || csp.extension_pages !== "script-src 'self'; object-src 'none'") {
    throw new Error('Unreviewed extension_pages content security policy');
  }

  // Do not expand the extension's reach through declarative page injection or
  // external messaging without an explicit, separately reviewed design.
  if ('content_scripts' in manifest || 'externally_connectable' in manifest || 'web_accessible_resources' in manifest) {
    throw new Error('Unreviewed page injection, external messaging, or web-accessible resource exposure');
  }

  return Object.freeze({
    installedApiCount: installedApi.length,
    installedHostCount: installedHosts.length,
    optionalHostCount: optionalHosts.length,
    warnings: optionalHosts.length ? [
      'Broad optional HTTP(S) host patterns remain in the current manifest: a runtime grant is NOT proof of source permission, platform policy compliance, or consent to publish.',
    ] : [],
  });
}
