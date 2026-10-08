# Kiến trúc 0.2.0

## Ranh giới quyền

Chrome lưu campaign, đích, job và báo cáo trong storage.local; secrets chỉ storage.session. Dashboard cho phép scope/cap/phiên gửi. Broker lưu task biên soạn, không Facebook cookie/Page token; Device API `127.0.0.1:8787` cần Bearer pairing token. Store serialize, temp+rename và key/fingerprint chống trùng; một broker/data directory, cap5000task.

MCP HTTP port8790 qua HTTPS OAuth scope compose. List/get/summary đọc; submit ghi kết quả soạn. Không tool join/comment/publish. Stdio proxy nối cùng broker đang chạy, không tạo kho task riêng.

## Luồng xử lý

Chrome đọc supplier với quyền theo website hoặc dùng nguồn bạn dán. ChatGPT provider enqueue analyze/compose. Dashboard poll4 giây, tối đa30 phút; runner poll nhịp1 phút. Manual key UUID; runner key ổn định theo run/đích/target. Cùng input/key trả cùng task, input khác bị từ chối.

ChatGPT trả cấu hình/body không URL; contracts gắn raw link snapshot và nhãn. Extension kiểm tra completed result; runner đối chiếu key/context/postKind/link với candidate. Job snapshot độc lập campaign; assertLink trước claim/gửi. Cancelled/expired từ chối kết quả muộn; completed idempotent chỉ nhận cùng kết quả.

STOP tắt runner rồi canceltask; sameRun chặn kết quả chạy đua. Manual poll chưa phục hồi qua reload dashboard (L012). Broker vẫn giữ task.

## OAuth và transport

SDK1.32.1/Zod4; stateless Streamable HTTP JSON, schema/structured output và annotations. Protected-resource metadata, DCR, authorize/token/revoke. SDK token handler kiểm tra PKCE; provider ràng buộc client/callback/resource, code dùng một lần, consent bằng owner code. Scope compose.

Host allowlist theo public origin; nonce 5 phút/5 lần nhập; DCR callback HTTPS. Owner code được lưu và dùng lại trong owner-code.txt; chỉ tạo file mới sau khi cả hai cổng bind thành công, không ghi đè khi khởi động broker thứ hai thất bại. Chờ sự kiện listening/error thay vì callback app.listen của Express 5 để phân biệt lỗi bind. Các socket đã mở được đóng nếu startup thất bại. OAuth client/code/token còn trong memory; restart cần kết nối lại, access token 24h không refresh. Lỗi consent phân biệt mã sai, phiên hết hạn/đã dùng và vượt số lần nhập; không xuất mã/nonce trong thông báo.

Tunnel chỉ expose8790; Device API loopback/exact Host. HTTP client không redirect ra host ngoài. PUBLIC_ORIGIN phải HTTPS origin không path/query; metadata không task/secrets. Quick Tunnel đổi hostname, không SLA. Launcher đọc private connection.json: named dùng Cloudflare token-file, external giữ tunnel service riêng; cấu hình sai dừng, không fallback Quick Tunnel. Ngrok account domain đã chạy thật; MCP OAuth bền vững/service còn chờ, xem STABLE_CONNECTION.

## Facebook và số liệu

`draft → ready → publishing → published | sent | failed | uncertain`. Published cần ID Page API; sent cần nội dung DOM mới sau click; manual là người dùng xác nhận. Gián đoạn/thiếu bằng chứng thành uncertain, không retry. Claim serialize; duplicate comment cùng campaign/post bị chặn dù body khác.

Search đọc10 nhóm đang hiển thị, không suy quyền quảng cáo. Join chỉ nhóm đã lưu/cho phép quảng cáo; persist requesting trước click. Một lần bấm; dialog/câu hỏi →manual_required, cancel request →pending, joined →joined, không rõ →uncertain. Restart requesting vẫn chặn retry. Người dùng đối chiếu rồi confirm; backup không mang quyền thành viên đã xác nhận sang máy khác.

DOM adapter thử nghiệm; Page Graph API. Một lượt quét, tối đa10 bài/group, cap1..50; không infinite scroll. Chrome phải hoạt động. Với MCP cần phiên ChatGPT; worker dùng plan OAuth riêng có thể tự biên soạn khi đã cấp quyền/bật. Inference worker thật chưa nghiệm thu, chưa service24/7.

Report: campaignId/raw link/source/period/clicks/importedAt. Không gán click theo post hoặc cộng kỳ chồng lấn. Báo cáo mới khớp link hiện tại; backup giữ snapshot cũ. Jobs≤1000/reports≤100; CSV chống công thức. Restore tắt scheduler/approval và không secrets. Retention/lock/crash recovery rộng hơn thuộc M6.

## Worker dùng gói ChatGPT

server/chatgpt-plan.mjs quản lý OAuth OpenAI direct plan + credentials owner-only + refresh; server/plan-worker.mjs chỉ soạn qua public Responses API SSE. scripts/ai-worker.mjs là UI/worker loopback8791, không tunnel. Một worker lock, budget persist, timeout/STOP/error dừng; cùng Device API nhưng không thêm tool publish. Không giả token hoặc dùng cookie ChatGPT. Xem AUTO_AI_SETUP; login hiện bị Chrome chặn, chưa inference thật. Lease với nhiều MCP clients vẫn L013.
