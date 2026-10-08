# Ngrok với URL cố định cho LinkDesk

Ngày 08/10/2026. Ngrok là lựa chọn thay Cloudflare; không cần tài khoản Cloudflare hoặc tên miền riêng. [Free plan](https://ngrok.com/docs/pricing-limits/free-plan-limits) hiện có một dev domain được cấp gắn với tài khoản. Dùng đúng domain trong dashboard, không tự chọn tên khác hoặc yêu cầu random URL. Free có giới hạn lưu lượng/request; không coi là dịch vụ vô hạn.

Máy chủ dự án đã có `C:\ngrok\ngrok.exe` phiên bản 3.39.8. Chưa kiểm chứng tài khoản/domain ngrok thật hoặc kết nối ChatGPT qua ngrok. Không đọc file cấu hình ngrok để lấy authtoken.

## Cấu hình

1. Đăng ký/đăng nhập tại https://dashboard.ngrok.com/. Lấy domain ở Domains và làm bước Add authtoken từ dashboard ngay tại máy. Token là bí mật, không gửi vào chat/Git. Nếu máy đã cấu hình token, không cần làm lại.
2. Lưu `.linkdesk-data/connection.json` trong repo LinkDesk:

```json
{
  "mode": "external",
  "publicOrigin": "https://YOUR_ASSIGNED_DOMAIN"
}
```

Thay YOUR_ASSIGNED_DOMAIN bằng domain thực tế do tài khoản ngrok cấp. Không thêm `/mcp` vào publicOrigin. File này không được commit/package. Mode external chạy broker và không spawn Cloudflare; ngrok được quản lý riêng.

3. Dừng đúng launcher Quick Tunnel LinkDesk cũ trước khi chạy lại; không kill các tiến trình Node của dự án khác. Chạy `npm run connect` trong repo. Chỉ một broker sở hữu dữ liệu/cổng. Khi đổi public origin phải restart broker; OAuth clients/tokens hiện trong memory nên cần xác thực lại, pairing/owner code được giữ.
4. Trong terminal riêng, chạy:

```powershell
& C:\ngrok\ngrok.exe http http://127.0.0.1:8790 --url https://YOUR_ASSIGNED_DOMAIN
```

Chỉ public port 8790 cho OAuth/MCP, không public 8787/device API hoặc 8765/preview. Giữ ngrok và broker chạy. Máy ngủ/tắt hoặc tunnel dừng thì public URL không phục vụ được; địa chỉ tài khoản vẫn giữ nguyên khi chạy lại cùng domain.
5. Dùng endpoint `https://YOUR_ASSIGNED_DOMAIN/mcp` trong ChatGPT. Kiểm tra metadata đúng issuer/resource, MCP chưa xác thực trả 401, OAuth thật và bốn tools, rồi analyze/compose do extension tạo. Không tự tạo thêm app trùng nếu UI có đường cập nhật cấu hình được hỗ trợ.

## Free warning và vận hành

Theo ngrok, browser HTML trên Free có trang Visit Site; người dùng có thể cần bấm tiếp khi mở OAuth. API/programmatic traffic không bị ảnh hưởng theo tài liệu, nhưng tích hợp ChatGPT thực tế vẫn phải kiểm chứng. Không sửa Origin/PKCE/nonce để tránh lỗi. Không thêm header giả hoặc thao tác vượt trang cảnh báo bằng automation.

URL cố định không sửa việc OAuth client/token mất sau broker restart hoặc hết hạn 24 giờ không refresh. L060 còn persistence/refresh/revoke, L061 còn tự khởi động/giám sát broker và ngrok. ChatGPT Plus vẫn cần phiên active xử lý queue. Chưa nghiệm thu 24/7 hoặc auto publish Facebook.

Tài liệu: [ngrok Free](https://ngrok.com/docs/pricing-limits/free-plan-limits), [CLI](https://ngrok.com/docs/gateway/agent/cli). Nếu đổi domain, cập nhật publicOrigin và ChatGPT đồng bộ; không đổi affiliate URL.

## Bằng chứng mới nhất 08/10/2026

Ngrok account domain đang chạy, broker health và HTTPS OAuth metadata cùng origin ngrok. Chủ tài khoản đã consent LinkDesk ngrok, ChatGPT Plus xử lý analyze thật từ extension và broker completed, exact URL giữ nguyên. Các custom MCP Cloudflare cũ/portable đã gỡ cài đặt; chỉ giữ bản ngrok. Chưa compose về Chrome, chưa MCP OAuth restart persistence. Worker plan OAuth là quyền riêng theo AUTO_AI_SETUP; localhost8791 login hiện bị Chrome ERR_BLOCKED_BY_CLIENT.
