# SEC-DISCLOSURE-01 — Standalone affiliate disclosure gate

Scope: a small, fail-closed validation hardening for existing LinkDesk drafts. This branch changes no publisher adapter, account permission, AI provider or running process.

## Acceptance

1. A draft must still contain exactly one original affiliate URL, character-for-character, on its own line. The default reference is `https://agentshop247.com/?ref=AS362560C5A713` and is never rewritten or normalized.
2. `Link tiếp thị liên kết.` must appear as an **entire line** to pass new-job validation and review. Prefix/suffix text, invisible Unicode before the label, a quotation inside a paragraph or a negated statement are not adequate disclosure.
3. Historical jobs with the exact legacy Vietnamese disclosure may pass `assertLink` **only** when that legacy sentence occupies its own line; new jobs still require the modern label.
4. Templates append a clear separate disclosure if they contain only a quoted/inline occurrence; they do not silently approve/publish jobs.
5. A missing or buried label is rejected, not repaired during review/publishing. Approval state and publishing side effects remain unchanged.

## Verification

Run `npm ci && npm test && npm run check && npm run package` on Node 22+ in an isolated checkout. Added three regression tests in `tests/model.test.mjs`, covering standalone/quoted/negated/Unicode cases, generated templates, and approval rejection. Existing URL, dedupe, STOP and permission behavior remain under the original suite.

## Coordination and rollback

- Base: `main` at `abac6ed6f48fa894f45c480df982a42509ae062f`; own branch `codex/sec-standalone-disclosure-20261009-r14`.
- Files: `extension/model.mjs`, `tests/model.test.mjs`, this document. No other open draft PR changes `model.mjs` or `model.test.mjs` at review time.
- `docs/COWORK_PROTOCOL.md` describes local locks; this run has no shared worktree lock. This PR does not claim exclusive lock ownership. Coordinator updates status docs and registry when integrating.
- Old saved inline-only disclosure jobs will need a human edit/reapproval rather than automatic publishing. Rollback: revert only this branch's model/test/doc changes after review; keep existing exact-link and permission checks.
- Tests do **not** establish live Facebook delivery, account authorization, click metrics or supplier conversion data. No publishing was performed.
