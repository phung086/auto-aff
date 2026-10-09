# Bàn giao LinkDesk / auto-aff

09/10/2026 · release0.2.0 · https://github.com/phung086/auto-aff.
Đọc AGENTS → SUPER_PLAN → COWORK_PROTOCOL → BACKLOG/IMPLEMENTATION_TICKETS → ARCHITECTURE → VALIDATION; AI worker đọc AUTO_AI_SETUP. npm ci, npm test, npm run check; package allowlist không runtime/secret.

## Heartbeat L013 — lease local-tested, chưa deploy

Worktree `work/LinkDesk-l013`, nhánh `codex/l013-task-leases`, basee95ba77, phụ thuộc PR #2/#1. Claim/renew/release durable, token/hash redaction, submit fencing/idempotent receipt, cursor append-identity và worker claim-next đã triển khai. 55 tests local/check qua; xem TASK_LEASES. Broker runtime ở checkout cũ vẫn nguyên, chưa có lease7tools live; không restart broker/ngrok/Chrome, không đọc credentials hoặc gọi model/Facebook thật. Submit client mới cần token; cập nhật broker/worker/tool catalog phải cùng phiên bảo trì sau review, giữ L060/live gates mở. Tiếp theo L012 handle reload trong worktree riêng; L013 còn nghiệm thu multi-client thật. Root-l013 giữ server-tasks/server-auth/docs-status theo atomic CreateNew và thả sau commit/push.

## Lịch sử kế hoạch 2.0

Bổ sung thiết kế theo từ khóa người dùng: KEYWORD_DISCOVERY và examples/keyword-profile.json, keyword-cases.json. Pipeline reader → entity/alias matcher → context AI → nhu cầu/quyền → campaign router → draft → preview/approval → publisher riêng. Cursor/Cussor alias, generic ai/API, nghĩa khác và 18 acceptance cases đã đặc tả; chưa nối runtime hoặc chạy classifier thật. Không đổi quyền source/publisher. Owner root giữ docs-status lock local trong lượt sửa và thả sau commit/push; checkout runtime không bị đổi.

Nhánh docs `codex/affiliate-super-plan`, worktree riêng `work/LinkDesk-plan`, base4efd045 và dependency PR #1. Không đổi code/runtime, không restart broker/tunnel/Chrome hoặc gửi Facebook. SUPER_PLAN hiện có pipeline discovery theo nguồn đã chọn (không cần URL từng bài), G0–G5, multiaccount/report/Shopee/TikTok gates. DISCOVERY_SPEC/PLATFORM_RESEARCH/IMPLEMENTATION_TICKETS mô tả contract, acceptance/rollback. COWORK_PROTOCOL/WORK_REGISTRY phân file/branch/khóa; giao thức phối hợp mới là docs, chưa có điều phối khóa tự động. DEVELOPMENT_LOOP quy định heartbeat mỗi6 giờ, tối đa một ticket đủ dependency/lượt, quiet khi không đổi; automation không cấp quyền publisher. Docs-status do coordinator cập nhật.

Tiếp theo L013 task lease; L071 source scope và L070 contract có thể độc lập ở nhóm file riêng. G0 live vẫn cần compose về Chrome/STOP/quota/refresh. Adapter Facebook/TikTok/Shopee mới đều planned/permission-gated, không gọi production ready.

Heartbeat phát triển mỗi6 giờ đã tạo ACTIVE trong Codex (ID `ph-t-tri-n-linkdesk-theo-super-plan`); không tự đăng quảng cáo. Check/JSON/docs links/ticket IDs/exact URL/diff whitespace qua; runtime tests44 là baseline không rerun ở lượt docs-only. Xem VALIDATION.

## Trạng thái thật mới nhất

- Ngrok3.39.8 dùng account config sẵn có, inspector upstream127.0.0.1:8790; broker health và metadata HTTPS đúng ngrok. connection.json private mode external. Không còn chờ dừng broker Cloudflare cũ; không đọc authtoken. Domain gắn tài khoản, không cần Cloudflare/tên miền riêng.
- **LinkDesk ngrok** đã tạo trong Chrome cá nhân, chủ tài khoản consent. UI Primary connected. Trò chuyện **Xử lý campaign task** xử lý task analyze thật từ extension; broker xác nhận completed, campaign giữ đúng URL mặc định. Screenshot ngoài Git outputs/LinkDesk-ngrok-analyze-completed.png. Ảnh chủ máy sau recovery đã thấy campaign lưu đúng URL; task-to-card mapping/polling và compose về extension còn gate.
- Bốn custom MCP cũ LinkDesk AI, 0.2, 0.2.0, hiện tại đã gỡ cài đặt qua UI; có thể thêm lại. Gói portable LinkDesk cũ cũng đã gỡ bằng công cụ quản lý plugin; danh mục ChatGPT sau reload chỉ còn LinkDesk ngrok. Không xóa vĩnh viễn apps/source/data.
- Worker localhost8791 áp dụng PR #1 trên nhánh cục bộ codex/test-worker-oauth; PR draft, chưa merge. Ngày09/10 chủ tài khoản consent, callback/model qua; GPT-6.1-Sol tự hoàn tất analyze và compose thật, exact URL và completedResult qua, cap2 tự dừng. Restart giữ account/budget0, đọc model không cần đăng nhập lại. **Ảnh chủ máy xác nhận danh sách chiến dịch đã lưu và exact URL; compose về UI, refresh/quota/STOP thật và Windows startup còn chờ.** Đã thử budget/cap có giới hạn; trạng thái runtime phải kiểm tra lại, không coi ngân sách thử là quyền vĩnh viễn. Baseline mới44 tests/check; lock/CSRF qua. Xem WORKER_OAUTH_VERIFICATION.

## Việc kế tiếp

Sự cố mới09/10: analyze từ nút extension đã tới broker nhưng AI trả product>300 làm worker dừng và dashboard chờ. Đã sửa prompt giới hạn ký tự, một lượt viết lại có tính budget, trạng thái lỗi loopback/GET_TASK. Chính task78d3938f đã completed, product69 ký tự/exact URL qua; Ảnh chủ máy sau nút recovery cho thấy danh sách chiến dịch đã lưu/exact URL; chưa gán chắc từng thẻ với task ID. 44 tests/check. Reload extension bản mới sau khi nhận/lưu, không restart broker. Xem WORKER_OAUTH_VERIFICATION.

1. Dọn cài đặt đã hoàn tất, chỉ giữ LinkDesk ngrok. Không tạo thêm bản trùng. Custom MCP gỡ trên web; portable cũ gỡ qua công cụ quản lý plugin và đã xác minh danh mục web.
2. OAuth/model/analyze/compose worker đã qua. Chủ máy kiểm tra nút Đọc link trong AI & nguồn để chứng minh giao diện extension nhận/lưu; công cụ browser không truy cập trang chrome-extension. Không cần API key/prompt ChatGPT khi worker bật.
3. Thử compose do extension tạo và nhận kết quả trong Chrome. Runtime hiện tại chưa được nâng lease L013: vẫn chỉ chạy một phương thức biên soạn trên cùng hàng đợi. Code lease local đã có ở nhánh riêng; chưa deploy. Refresh/quota/STOP giữa inference thật chưa qua.
4. L012 manual handle reload; L060 OAuth MCP persistence/refresh; L061 supervision/startup. **MCP OAuth vẫn memory/24h/no refresh**; plan worker có persistence/refresh riêng.
5. L040/031/043 target cụ thể cho phép quảng cáo, cap1, Facebook evidence; không gửi thử hoặc coi mọi demo là nhu cầu mua.

## Hợp đồng và giới hạn

Exact URL https://agentshop247.com/?ref=AS362560C5A713; không normalize. AI không xuất URL; broker/extension gắn snapshot + nhãn Link tiếp thị liên kết. Không fake review/giá/official claims.

Device API127.0.0.1:8787 cần pairing Bearer; MCP8790 OAuth compose chỉ list/get/submit/summary, không publish; worker8791 loopback không tunnel, dùng cùng broker. Một broker/data directory; task expire30 phút, cap5000. Manual handle mất qua reload nên không refresh khi chờ.

Worker giới hạn1–50/phiên, persist ngân sách/enable, restart không cấp thêm; error/quota/STOP dừng. Lock chưa tự hồi crash, chưa Windows service. Facebook DOM thử nghiệm, uncertain không retry; click là báo cáo có nguồn, không suy từ bài.

## Sự cố đã sửa

OAuth Origin null từ no-referrer, CSP callback và303 đã sửa. Express5 startup bind thất bại từng gây mismatch mã file/memory; nay persisted owner code, đợi listening/error, bind thất bại không ghi đè, socket cleanup có tests. Runtime đã chuyển ngrok đúng. Không chạy broker thứ hai hay restart khi OAuth chưa persist.

Trước commit xác nhận toplevel source repo, không home Git. Chỉ stage code/docs; artifacts không runtime/secrets/log/node_modules. Live evidence và phần chờ phải ghi rõ, tests không chứng minh 24/7.
