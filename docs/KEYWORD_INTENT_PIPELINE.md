# LinkDesk — Keyword + Intent Discovery Pipeline

Status: **isolated prototype / review-only**, 09/10/2026. Companion to PR #2 (docs/DISCOVERY_SPEC.md, planned L073). No Facebook feed collection, auto-joining, commenting, posting, private endpoint access or production deployment.

## Product goal

Identify useful conversations about AI tools without requiring users to paste individual post URLs. Keyword matching alone is **not** evidence of a purchase request or permission to insert an affiliate link. Source excerpts must originate from platform-permitted access, owner-approved channels or manual user input.

### Pipeline

~~~mermaid
flowchart TD
 A[Provider catalog + exact affiliate URL] --> B[Permitted source reader / user-provided excerpt]
 B --> C[Stable post ID and duplicate check]
 C --> D[Fast keyword/topic recognition]
 D --> E[Purchase-intent evaluation]
 E --> F{Verified seller offer matches?}
 F -->|No| X[Skip, record reason]
 F -->|Yes| G{Verified promotion permission and clear request?}
 G -->|No| H[Skip or review]
 G -->|Yes| I[AI generates draft text without URL]
 I --> J[App attaches exact raw link and disclosure]
 J --> K[Human reviews before permitted publishing]
 K --> L[Platform evidence / provider reports]
~~~

**No direct edge connects finding a keyword to posting a comment.**

## Three keyword tiers

- **Specific names**: Claude/Claude Code, Codex, Antigravity, Gemini, Grok, Cursor, ChatGPT, Copilot, DeepSeek, Perplexity, Midjourney, Kling, Runway, ElevenLabs and OpenRouter.
- **Broad technical terms**: API/API key, generic AI. They can surface posts for evaluation, but must not independently qualify a draft. In Vietnamese the pronoun *ai* (“who”) must not trigger English AI.
- **Uncertain spelling**: Cussor is treated as a possibly intended Cursor reference; ask for review rather than silently treating it as the exact product.

Intent evidence: explicit question where to buy an account, pricing, an available subscription or upgrade. By contrast, debugging, demos, showcases, pure tool discussions and tutorials should normally be skipped. A user/group opting out of promotions always overrides commercial intent.

| Example | Topic | Decision (matching product and valid scope assumed) |
| --- | --- | --- |
| “Mình cần tài khoản Claude Pro, có ai bán uy tín không?” | Claude | Draft for review |
| “Demo Codex tạo website; chia sẻ code miễn phí” | Codex | Skip |
| “Fix lỗi API 500” | API | Skip |
| “Mình muốn dùng Gemini để nghiên cứu” | Gemini | Review |
| “Ai biết giải bài tập?” | None | Skip |
| “Mình cần mua Cussor Pro” | Ambiguous Cursor spelling | Review |
| “Nhóm không nhận quảng cáo; cần mua Claude” | Claude | Skip |

## Data contracts

Pure JavaScript location: extension/relevance.mjs.

- identifyAiTopics(text) returns model/tool name, matched term and specificity.
- detectPurchaseIntent(text) returns high/unclear/none/excluded, evidence and technical cues.
- classifyOpportunity({source,offers,scope,campaignId,seenKeys,now}) returns matched offer IDs, three-state decision, reason codes, score, and deterministic dedupe key.

Decision is one of skip, review or draft_for_review. It is **not** publishing approval. The module never connects to Facebook, generates a comment, appends a URL, creates a campaign or reads credentials.

Sample call:

~~~js
import { classifyOpportunity } from './extension/relevance.mjs';

const result = classifyOpportunity({
  source: {
    platform: 'authorized-platform',
    sourceId: 'owner-approved-community',
    postId: 'post-123',
    permalink: 'https://example.test/posts/123',
    text: 'Mình cần tài khoản Claude Pro, có ai bán uy tín không?',
  },
  offers: [{ id: 'seller-claude', topics: ['claude'] }],
  scope: {
    advertisingAllowed: true,
    ownerConfirmed: true,
    platformAccessAllowed: true,
    rulesEvidence: 'Authorized owner verified channel promotion policy',
    expiresAt: '2027-01-01T00:00:00Z',
  },
  campaignId: 'seller-campaign',
  now: Date.parse('2026-10-09T00:00:00Z'),
});
console.log(result.decision); // draft_for_review; never published
~~~

These fields are fixtures, not actual authorization. Before accessing or sending anything, platform permissions must be verified against trusted, current source evidence; model output cannot grant permission.

## Affiliate link must remain byte-for-byte

Primary campaign URL:

https://agentshop247.com/?ref=AS362560C5A713

No parse-and-reserialize, shorten, case change, redirect, UTM, or ref replacement. Raw-link snapshot stays in campaign/job code, which attaches it **after** AI drafts text, with a clear affiliate disclosure. Classifier never touches the URL. New sellers require explicitly verified product-to-topic mapping; selling a generic ChatGPT plan does not prove availability of Codex credits or API resources.

## Implementation dependencies / cowork ownership

1. PR #2 L071/L072: approved SourceScope and stable post identity / dedupe; do not scrape the general Facebook home feed without platform permission.
2. L073: integrate the pure classifier and optional second AI stage with strict JSON, human review on invalid output and at least 12 labeled fixtures. This branch is **contract/prototype only**.
3. L075: add UI sections for source scope, topic matches, purchase evidence, skip reasons, draft preview and STOP. Do not require each user to paste a post URL if the platform provides authorized source discovery.
4. G2: use only permitted publishing APIs/actions with per-action approval and exact post/account verification. Where posting automation is not permitted, provide copy-and-open/manual posting.
5. G4/G5: reconcile supplier-sourced clicks, orders, refunds and commissions without fabricating conversions or per-post click counts.

## Acceptance and rollback

Run: node --test tests/relevance.test.mjs; npm test; npm run check. Expect 15 cases covering model variants, Vietnamese “Ai”, typo, explicit vs absent buying intent, excluded promotions, mismatched product, missing/expired permission, missing identity, dedupe and exact link.

This branch adds only extension/relevance.mjs, tests/relevance.test.mjs and this document. It does not modify the current runner, browser adapters, worker, MCP connection, UI or existing PR #1/#2 documents. No live Facebook access or auto-comment is tested. To roll back, do not import the new module; the production runtime is untouched.

Heuristic rules may be inaccurate with slang, negation and drift. A later semantic AI stage may improve candidate ranking, but never replaces source permissions, human approval or platform verification.
