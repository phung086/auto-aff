# L070 — Permission evidence timestamp guard

Date: 2026-10-11. This is a **contract-only** change layered on
`codex/l070-null-context-guard-20261011-r53` (commit
`0327d2bd469a3cb5840a3f5d837232529add8e65`).
It changes evidence timestamp validation only, not the publishing pipeline.
No platform account, OAuth credential, permission, or publishing destination
is added or modified.

## Acceptance criteria

- `evidence.reviewedAt` and `evidence.expiresAt` must each be an ISO date-time
  with real Gregorian date, seconds and explicit timezone (`Z` or
  `+/-HH:MM`, absolute offset no greater than 14:00). Reject nonexistent
  dates, normalized `24:00`, date-time without timezone, and invalid offsets.
- Any invalid evidence timestamp fails closed with `EVIDENCE_INVALID` for
  `read`, `analyze`, `draft`, `publish`, and `report`.
- Valid UTC, fractional milliseconds and legal offsets preserve existing
  outcomes. Expiry, revocation, owner approval, account and scope checks
  continue to apply.
- The original affiliate URL is immutable and exact:
  `https://agentshop247.com/?ref=AS362560C5A713`.
- No capability string by itself grants an API/platform permission. Live
  authority must be verified separately by the publishing adapter.

## Regression / validation

`node --test tests/capability-evidence-timestamp.test.mjs` tests invalid
and valid dates for all five actions, a revoked/unscoped/unapproved case,
and raw-link preservation. The `EVIDENCE_INVALID` requirement is expected
to fail on the unpatched contract and pass after the change.

Before review and merge, run the full repo gates against the PR head:
`npm ci`, `npm test`, `npm run check`, `npm run package`.
Tests are synthetic, **not evidence** of active API permissions, a
supported platform publishing use case or actual content delivery.

## Ownership / integration / rollback

Work branch: `codex/l070-evidence-timestamp-20261011-r62`.
The public `WORK_REGISTRY.json` currently has no active claims, but local
atomic cowork locks cannot be inspected remotely. Avoid concurrent edits
to `extension/capability-contract.mjs` until the coordinator reconciles
the pending L070 context/publish-scope/evidence-URL patches.
No shared docs-status files are edited in this independent branch; only
the coordinator should update `HANDOFF`, `BACKLOG`, `plan.json`,
`VALIDATION` and the public registry after integration.

Rollback: revert the three files of this change. Keep all adapter
publishing capabilities disabled until their platform APIs, exact
destination permissions and real account scope have been verified.
