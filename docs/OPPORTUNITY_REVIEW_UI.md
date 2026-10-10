# Opportunity Review Workbench — functional UI slice

A real Chrome extension UI page for previewing marketing opportunities from user-provided text or permitted content. Entry: Dashboard → **Kiểm tra cơ hội AI**. This is an independent feature, not a compliance-only test.

## Workflow
1. Choose an existing saved campaign read via the LinkDesk bridge (same persisted state as the dashboard).
2. Paste text you have permission to access; optionally provide a stable post ID and permalink.
3. Set verified product topics for this analysis and review source permission.
4. Click **Phân tích bài viết**. Read topic, intent, match and reason codes from the existing review classifier in PR #3.
5. For a qualified candidate, confirm the supplier really offers that product and click **Tạo bản nháp để duyệt**.
6. Copy the generated message with the original raw affiliate link and clear disclosure. The tool does **not** publish, join, or comment automatically.

## Architecture and dependencies
This branch is stacked on `feat/relevance-review-engine` / PR #3 because it imports `extension/relevance.mjs`. Open its PR against that branch; retarget to main after PR #3 is merged. New module `extension/opportunity-workbench.mjs` produces an explainable review card and validates raw URL snapshot before building a human-review message. `opportunity-review.mjs` reads campaigns via `bridge.mjs`, avoiding a separate state store. Only a small dashboard link is added outside new files.

## Gates, limitations, rollback
- `node --test tests/opportunity-workbench.test.mjs`; `npm test`, `npm run check`, `npm run package` on CI.
- Content is intentionally manually supplied, not collected from Facebook feed. This works before L071/L072 live source permissions; later the approved discovery adapter can pre-fill this UI.
- This is **not** an AI call or live social publisher. The prepared response is a simple template; prices, subscription features and product availability must be confirmed before use.
- Source permission checkbox is user attestation for **review-only** UI, not a grant of platform access or automated posting.
- Requires stable source post identity to label a strong candidate. Without it the tool can explain the match but will not offer promotion text. Never permit an AI to upgrade source permissions.
- LinkDesk's exact original affiliate URL must remain unchanged: https://agentshop247.com/?ref=AS362560C5A713.
- Rollback: remove the dashboard link and the new opportunity-workbench/review UI/test files; neither existing runner nor provider connection is changed.

No deployment, merger, credential access, account actions or external posting was performed in this feature branch.
