# Kiểm tra PR #1 trên Windows và Chrome thật

Ngày 09/10/2026. PR https://github.com/phung086/auto-aff/pull/1, code được thử tại commit `155ff644a682262707ed67a9d114b9c37b46b8e6`. PR vẫn draft, chưa merge main. Checkout cục bộ: `codex/test-worker-oauth`.

## Kết quả đã quan sát

- `npm ci`: thành công; `npm test`: 40/40; `npm run check`: thành công. Workflow pull_request của commit cũng success.
- Chỉ restart worker loopback8791 sau khi xác minh tiến trình đúng script dự án. Broker8787/8790 và ngrok4040 giữ nguyên tiến trình; không mất phiên MCP do restart broker.
- HTTP200 ở trang worker, Referrer-Policy strict-origin, form POST /auth/start.
- Chrome cùng hồ sơ đã cài LinkDesk: bấm Continue with ChatGPT mở trang liên kết OpenAI; bấm liên kết mở trang chọn tài khoản; chọn tài khoản đã đăng nhập và giữ tên LinkDesk mở trang cấp quyền.
- Trang OpenAI ghi quyền hồ sơ cơ bản và dùng hạn mức gói ChatGPT. Chưa bấm nút cấp quyền cuối; chủ tài khoản xác nhận tại trang này.
- Không tái hiện ERR_BLOCKED_BY_CLIENT hoặc HTTP403 ở luồng hợp lệ. Đây là bằng chứng bản vá đi qua bước bị chặn trước, chưa xác định riêng thay đổi route hay referrer là nguyên nhân giải quyết.
- POST thiếu/sai CSRF và Origin null vẫn HTTP403. Không nới guard hoặc tắt bảo vệ Chrome.
- Chạy script trong thư mục tạm riêng khi cổng8791 bị chiếm: startup thất bại EADDRINUSE và lock vừa tạo được dọn. Lock đã tồn tại khiến lần chạy kế tiếp thất bại và nội dung lock giữ nguyên. Không dùng dữ liệu/token thật cho hai kiểm tra này.

Ảnh lưu ngoài Git: `outputs/LinkDesk-worker-OpenAI-consent-PR1.png`. Không đưa ảnh có danh tính tài khoản, mã, token hay runtime vào repository public.

## Gate chưa qua

Các gate đã qua và phần còn chờ được cập nhật dưới đây. Không gửi Facebook trong kiểm tra OAuth.

Phiên authorize có hạn 10 phút. Nếu trang consent để lâu, quay về worker và bắt đầu lại; không tái sử dụng mã. Không restart worker khi đang chờ callback vì state/PKCE của phiên đang ở bộ nhớ.

## Cập nhật: chủ tài khoản cấp quyền và inference thật đã qua

Chủ tài khoản hoàn tất consent và quay về worker; UI báo quyền dùng gói ChatGPT đã cấp. Kiểm tra model trả danh sách tài khoản; chọn GPT-6.1-Sol. Không dùng API key hoặc prompt thủ công trong ChatGPT cho hai lượt sau:

| Tác vụ | ID | Bằng chứng |
|---|---|---|
| Analyze | c38b0eb4-004d-4d43-b65e-3d9b9dca105f | Worker tự nhận nguồn AgentShop247 đã lưu từ lượt extension trước; broker completed; campaign giữ nguyên URL |
| Compose Page draft | e62300a4-8a04-4d25-b5a5-6989f8ec064a | Worker dùng campaign vừa phân tích, tạo bản thảo Page, broker completed, relevant=true, đúng một URL khớp nguyên chuỗi |

`completedResult` của extension đọc hai kết quả thật và vượt kiểm tra hợp đồng/link. Đây là kiểm chứng hàm nhận dữ liệu của extension, **chưa phải bằng chứng giao diện extension Chrome đã nhận/lưu** hai tác vụ: chúng được tạo qua Device API để thử worker, không qua nút extension. Context compose là yêu cầu bản thảo Page của chủ dự án, không giả làm một bài Facebook đã quét.

Worker giới hạn2 yêu cầu tự dừng khi còn0. Sau đó restart riêng worker, tài khoản đang chọn/quyền/model đã lưu vẫn còn, budget vẫn0, bấm Kiểm tra model thành công mà không đăng nhập lại. Chưa kiểm chứng refresh khi token hết hạn, quota thật hoặc STOP giữa inference thật.

Đã bật phiên vận hành giới hạn10 yêu cầu mới, chờ hàng đợi; broker và ngrok giữ nguyên. Không cấu hình Windows startup. Screenshot ngoài Git: `outputs/LinkDesk-worker-enabled-live.png`. Bản thảo thật trong runtime riêng, không commit token/task store/ảnh tài khoản.

L014: OAuth/model/analyze/compose worker thật đã có bằng chứng. Gate UI extension nhận/lưu còn chờ chủ máy kiểm tra nút Đọc link; L011/M1 không đánh dấu hoàn tất toàn bộ. Tiếp theo L013 lease, L012 handle refresh, L060 MCP OAuth bền vững và L061 startup; Facebook cap1 cần target và bằng chứng riêng.

## Sự cố tác vụ do extension tạo và bản sửa

Tác vụ analyze `78d3938f-cc36-4b40-8a37-600df5f8eec8` do nút Đọc link trong extension tạo. Worker dừng với Zod too_big ở campaign.product, giới hạn300 ký tự; broker còn pending và dashboard cũ tiếp tục chờ. Đây là lỗi nội dung/hợp đồng, không phải OAuth hoặc ngrok.

Bản sửa giữ giới hạn hợp đồng, thêm số ký tự cụ thể trong prompt, yêu cầu product ngắn và chuyển chi tiết sang benefit. Chỉ lỗi độ dài ở trường campaign được viết lại tự động tối đa một lần; mỗi inference vẫn trừ ngân sách, STOP/cancel chặn lượt kế tiếp, không retry HTTP/quota/URL/ID sai. Kết quả không bị cắt chữ âm thầm. Nếu còn sai, lưu lastFailure với ID và thông báo ngắn rồi dừng.

GET /status loopback8791 chỉ trả enabled/busy/remaining/message/failure, không token/account/nguồn. GET_TASK của extension mới đọc trạng thái này khi task pending; lỗi đúng task được đưa ra dashboard và nút được mở lại. Worker không có/mất kết nối vẫn cho phép MCP thủ công; không xem lỗi task khác là lỗi của task đang chờ. Broker và OAuth MCP không cần restart.

Sau khi restart riêng worker bản sửa, xử lý lại **chính ID tác vụ trên**: broker completed lúc `2026-10-08T17:29:29.398Z`, product69 ký tự, completedResult qua và link nguyên bản. Chưa giả lập lưu chiến dịch; chủ máy xác nhận UI nhận/lưu riêng. 43 tests/check qua, gồm quá dài→viết lại thành công, hai lần sai→dừng, ngân sách không đủ→không viết lại, báo lỗi đúng task và fallback khi không có worker.

Để dùng thông báo lỗi mới, cần reload bản extension đã cập nhật sau khi nhận và lưu kết quả đang chờ. Không reload dashboard đang chờ vì handle hiện còn ở bộ nhớ (L012).

Chủ máy báo UI vẫn không chuyển sau khi task completed. Chưa xác định vì sao tab cũ không nhận được response; không suy từ broker completed rằng UI đã nhận. Bổ sung nút **Nhận kết quả đã có** trong AI & nguồn: đọc tối đa20 completed tasks, chọn analyze khớp nguyên link và đưa cấu hình vào form để chủ máy kiểm tra/lưu; không enqueue hoặc gọi model. Hàm recovery đã đọc đúng task78d3938f từ broker thật, product69 ký tự/exact URL. 44 tests/check qua. Đây là khôi phục thủ công có giới hạn, chưa thay thế L012 lưu handle bền vững.

Nguồn extension và gói outputs/LinkDesk-0.2.0/linkdesk đã cập nhật. Chủ máy reload LinkDesk tại chrome://extensions, mở lại dashboard; nếu session pairing mất thì chọn pairing.json của broker đang chạy, rồi bấm Nhận kết quả đã có. Reload không xóa chiến dịch đã lưu ở storage.local. Không phải cài lại ChatGPT/ngrok, không cần đăng nhập OAuth lại. Giao diện extension mới và việc lưu vẫn cần chủ máy xác nhận vì browser tool không truy cập trang chrome-extension.
