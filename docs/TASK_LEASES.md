# L013 — Lease biên soạn AI

09/10/2026 · Code và kiểm thử local; chưa triển khai lên broker đang chạy. Nhánh `codex/l013-task-leases`, base `e95ba77`, phụ thuộc PR #2 và PR #1. Lease này không cấp quyền Facebook hoặc retry publisher.

## Vấn đề và hành vi mới

Trước đây worker/MCP đọc cùng pending task rồi cùng gọi AI. Store chỉ chặn kết quả khác sau khi một client đã submit, nên có thể tốn hai lượt inference. Bây giờ client phải claim task nguyên tử trước khi soạn. Trong cùng một broker, chỉ một lease còn hiệu lực cho mỗi task; loser không được làm hoặc nộp kết quả của lượt cũ.

Store serialize claim/renew/release/submit qua hàng ghi hiện có, persist bằng temp+rename. Token32 bytes ngẫu nhiên chỉ trả trong response claim; disk chỉ lưu hash. GET/list/enqueue trùng/cancel/result responses không xuất token/hash. Owner là nhãn, không phải quyền auth; token mới xác định lượt claim. Device Bearer/OAuth guards vẫn nguyên.

## Contract

| Route/tool | Input/đầu ra |
|---|---|
| POST /task-claims | owner, ttlMs optional → claim task pending chưa được giữ, hoặc null; worker dùng atomic claim-next |
| POST /tasks/:id/claim / linkdesk_claim_task | id + owner, ttlMs optional → task, leaseToken, leaseExpiresAt |
| POST /tasks/:id/renew / linkdesk_renew_lease | id + leaseToken, ttlMs optional → id, leaseExpiresAt |
| POST /tasks/:id/release / linkdesk_release_task | id + leaseToken → released; không cancel task Chrome |
| POST /results / linkdesk_submit_result | result fields + leaseToken; thiếu/sai/hết hạn bị từ chối |
| GET /task-page / linkdesk_list_tasks cursor mode | status, cursor optional, limit1–20 → tasks, nextCursor hoặc null |

TTL mặc định5 phút, từ15 giây đến10 phút, luôn clamp theo task expiry30 phút. Renew không hồi sinh lease hết hạn. Thả/cancel làm token cũ vô hiệu; claim mới dùng token khác. Crash không xóa lease: broker reload giữ hash/expiry và cho reclaim sau hết hạn; task đã hết hạn không được hồi sinh.

Completed lưu hash receipt để cùng token/cùng nội dung có thể submit idempotent sau mất response hoặc restart, kể cả lease TTL đã qua; token khác/nội dung khác bị từ chối. Receipt của completed cũ chưa có lease hash không được tự nhận bằng token mới; vẫn đọc/recovery được. Không đưa receipt/hash/token vào công cụ chỉ đọc.

Cursor là ID cuối trang theo thứ tự append trong store, không offset của danh sách pending đang thay đổi. Hoàn tất task trước cursor không làm mất task sau cursor. Offset legacy vẫn có cho Chrome recovery cũ, nhưng MCP mới ưu tiên cursor và không cho dùng offset+cursor cùng lúc. Cursor không phải snapshot; task trước cursor quay lại pending cần bắt đầu lượt đọc mới. Retention tương lai phải version cursor nếu xóa/reorder rows.

## Worker và MCP

Worker claim-next trước access/inference, renew trước mỗi inference/repair và trước submit; inference timeout120 giây nhỏ hơn TTL5 phút. STOP/failure cố release token mình đang giữ trong finally; token đã completed/cancelled/expired hoặc bị thay không được thả lease khác. Budget chỉ trừ khi chuẩn bị inference sau renew thành công; hai worker tranh cùng task chỉ winner tốn lượt. Crash sau khi response claim bị mất giữ task tới TTL, không tự cấp token theo owner label.

MCP có7 tools: list/get/summary/submit và claim/renew/release. List/get không claim; client phải dùng flow mới. [Skill portable](../skills/linkdesk-compose/SKILL.md) đã cập nhật. [MCP tool specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) là tham chiếu schema, structured results và error contracts; SDK local hiện có được dùng, không nâng dependency.

## Nâng cấp và rollback

**Không deploy ở lượt heartbeat này.** Broker, worker và MCP instructions/tool catalog phải cập nhật đồng bộ; submit client cũ không có token bị chặn. Không có chế độ fail-open để bỏ lease. Ngrok/OAuth provider thật chưa được restart; L060 OAuth memory vẫn là gate cần xử lý trong kế hoạch nâng cấp.

Sau review, owner cần phiên bảo trì rõ: STOP inference/phiên gửi, giữ/export trạng thái cần thiết, sao lưu data riêng, nâng broker+worker cùng commit, làm mới tool catalog và nghiệm thu trên tài khoản thật. Không commit backup/token. Không tạo connector trùng hoặc tăng budget.

Rollback code bằng phiên bảo trì có backup và single-consumer; phiên bản cũ không hiểu lease nên tuyệt đối không chạy cùng broker/consumer mới. Pending/completed không bị xóa bởi code mới; additive metadata tương thích đọc, nhưng không tự down-grade để bỏ kiểm tra. Một broker/data directory là điều kiện bắt buộc; lease JSON này không phải distributed lock cho nhiều broker/process. Clock dùng wall time; clock jump có thể làm lease hết sớm hoặc giữ lâu hơn, cần theo dõi khi vận hành.

## Nghiệm thu và bàn giao

55 tests local qua: 44 baseline +11 lease regressions. Bao gồm claim concurrency, token guard/hash redaction, reload/crash/expiry boundary, release/cancel fencing, TTL clamp, idempotent receipt, failed durable write/idle no-write, stable cursor, Device+stdio proxy+MCP contract, stateless HTTP claim/renew/submit, hai worker với inference fixture, STOP và stale worker. `npm run check`, JSON và diff whitespace qua. Tests dùng data tạm, ports ngẫu nhiên, AI SSE fixture; không gọi model thật hoặc Facebook.

L013 = done-code/local-tested, gate live multi-client còn mở. Bước tiếp theo L012 handle reload dùng cùng task; nghiệm thu upgrade/catalog và worker/MCP thật cần owner. Runner publishing claim và uncertain policy giữ nguyên. File ownership: server-tasks, server-auth (transport/worker, không credentials), docs-status; locks được thả sau commit/push. Rollback và evidence nằm trong PR.
