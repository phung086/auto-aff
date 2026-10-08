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
