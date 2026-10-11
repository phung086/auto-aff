# L070 — Fail-closed market gate for platform capabilities

Scope: a single pure-contract guard layered on codex/l070-capability-contract-v1.
No browser automation, plugin update, account token, platform API request or publishing operation is added.

## Why this guard exists

The baseline evaluateCapability only compared adapter.market !== context.market. If both fields
were absent, undefined === undefined let a nominally verified capability continue through
other checks. Markets must be explicit, never inferred by matching two omissions.

## Acceptance

- Require an explicit uppercase two-letter market on adapter and request before comparing.
- Mismatched known markets deny MARKET_MISMATCH; missing or malformed deny MARKET_UNKNOWN.
- Known matching markets leave account, source, owner approval, expiry and scope gates intact.
- validateAffiliateOffer preserves the original raw affiliate link, particularly:
  https://agentshop247.com/?ref=AS362560C5A713
- No adapter or API permission is enabled, and no content is published by this change.

## Verification

Run: node --test tests/capability-market.test.mjs
Then, in a full checkout with Node 22+: npm ci; npm test; npm run check; npm run package.
The local tests validate a pure function, not live API authorization or a permission grant.

## Coordination / rollback

The source module comes from codex/l070-capability-contract-v1, not yet on main. Keep
the change as a stacked draft PR; dependency must be reviewed before integration.
Do not edit shared HANDOFF/BACKLOG/registry/plan.json without coordinator ownership.
Rollback only the additional market validation and regression test; the absence of
this guard would again risk permitting unknown market inputs.

A stored verified state alone never proves platform approval. A trusted integration
must supply authenticated account identity, scopes and source-specific evidence.
