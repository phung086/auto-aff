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

Chủ tài khoản cấp quyền → callback xác minh token/scope → Kiểm tra model → worker xử lý analyze và compose thật → Chrome nhận kết quả và nguyên affiliate URL. Chỉ sau các bước đó mới đánh dấu L014 live. Không gửi Facebook trong kiểm tra OAuth.

Phiên authorize có hạn 10 phút. Nếu trang consent để lâu, quay về worker và bắt đầu lại; không tái sử dụng mã. Không restart worker khi đang chờ callback vì state/PKCE của phiên đang ở bộ nhớ.
