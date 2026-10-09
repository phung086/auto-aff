# L021 — Read-only local setup diagnostics

Date: 2026-10-09. Small independently reviewable slice of L021 (setup recovery). No installer, Windows startup service or external publishing. This document is deliberately new and does not modify status/ownership files used by other AI coworkers.

## Run

From the LinkDesk repository root with Node.js 22+:

~~~powershell
node scripts/doctor.mjs
~~~

The tool does not start, stop or restart any process, read private credentials, open a browser, connect to GitHub, or write files. It only checks whether Node 22+ is in use, whether four named files are present (using lstat only), and whether two fixed loopback HTTP endpoints respond within 1.2 seconds. No remote URLs or redirects are followed.

Device API: GET http://127.0.0.1:8787/health without a token should return HTTP 401 when the protection is working; HTTP 200 without credentials is a security warning. The AI worker local UI at http://127.0.0.1:8791/ may return HTTP 200. **Neither result proves that ChatGPT Plus OAuth, MCP, model inference, Chrome or Facebook is connected.** Missing services are reported without reading exception messages, which can contain machine-private information.

connection.json and pairing.json are checked by metadata presence only; their bytes, owner codes and tokens are never read or printed. Do not paste secrets into GitHub issues.

## Acceptance and limitations

- node --test tests/local-preflight.test.mjs: 12 fixtures; fixed URLs, 401/200/403 distinctions, timeout, offline, Node version, non-file entries and no credential reads.
- After applying the branch in an isolated checkout run npm test, npm run check and CI. Tests do not contact the user's actual Windows services.
- This is informational and read-only. It is not a proof of successful setup; an actual OAuth/compose task must be tested separately by the owner.
- Developer can roll back by deleting the four new files; no runtime paths call them automatically.
- Future L021 wizard may reuse the pure helper, but must not transform a healthy unauthenticated 401 into a claim of ChatGPT authorization.

Original affiliate URL remains byte-for-byte unchanged: https://agentshop247.com/?ref=AS362560C5A713.
