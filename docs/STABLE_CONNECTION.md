# Địa chỉ MCP cố định

Không dùng Quick Tunnel cho luồng lâu dài. URL `trycloudflare.com` là tạm. Từ bản code này, `npm run connect` đọc `.linkdesk-data/connection.json` và hỗ trợ ba chế độ. Nếu file mặc định chưa có, giữ chế độ quick để tương thích; nếu cấu hình đã có nhưng sai, dừng và báo lỗi, không tự tạo URL khác.

## Chọn hạ tầng

**Ngrok là lựa chọn không cần mua domain:** tài khoản Free hiện được cấp một dev domain cố định. Code external đã dùng được với ngrok, không cần Cloudflare. Xem [NGROK_SETUP](NGROK_SETUP.md). Máy đã có ngrok 3.39.8; chưa có bằng chứng tài khoản/domain ngrok hoặc ChatGPT qua ngrok. Phần domain/provider bên dưới là các lựa chọn bổ sung.

Chủ dự án hiện chưa có Cloudflare hoặc tên miền (08/10/2026). Chưa provision host cố định. Không lấy tên miền ví dụ bên dưới làm địa chỉ đã deploy.

1. **Cloudflare Named Tunnel + tên miền riêng:** hợp với thiết kế local hiện tại. Tạo tài khoản Cloudflare, thêm một tên miền do chủ dự án sở hữu, tạo tunnel và Published application route. Hostname ví dụ `mcp.example.com`; Service URL chỉ `http://127.0.0.1:8790`. Không route 8787 hoặc 8765. Broker vẫn ở máy cá nhân; URL giữ nguyên khi tunnel restart, máy tắt thì không phục vụ được. Domain, DNS và token do chủ tài khoản cấp; không tự mua hoặc đổi DNS không liên quan.
2. **Hosting cấp hostname cố định:** không bắt buộc mua tên miền riêng, nhưng cần tài khoản hosting. Để chuyển broker lên đó cần Node runtime, disk/storage bền vững, OAuth persistence/refresh/revoke và thiết kế ghép Chrome từ xa. Extension hiện chỉ nhận device API loopback. Đây là triển khai riêng, không thể chỉ đổi `publicOrigin` để chuyển backend lên cloud.

[Cloudflare hướng dẫn](https://developers.cloudflare.com/tunnel/get-started/) yêu cầu tài khoản và domain trên Cloudflare để publish hostname riêng. Dashboard hiện có Networking → Tunnels → Create Tunnel → Routes → Published application. URL MCP cuối là `https://<hostname>/mcp`, còn OAuth discovery dùng cùng origin.

## Named Tunnel do launcher quản lý

Sau khi tạo tunnel và route, lưu **chỉ token tunnel** vào `.linkdesk-data/cloudflare-token.txt` tại máy. Không lưu nguyên lệnh cài service, không gửi token vào chat, Git hoặc backup extension. `cloudflared` cần hỗ trợ `tunnel run --token-file` (binary tại máy đã có cờ này).

Lưu `.linkdesk-data/connection.json`:

```json
{
  "mode": "named",
  "publicOrigin": "https://mcp.example.com",
  "tokenFile": "cloudflare-token.txt"
}
```

`mcp.example.com` là ví dụ, phải thay bằng hostname thực tế. Chạy `npm run connect`; launcher kiểm tra cấu hình, bind broker rồi chạy named tunnel. Token đi qua file, không qua command-line argument hoặc log. Token file relative được resolve theo thư mục chứa connection.json. Tunnel dừng thì broker cũng đóng và launcher báo lỗi, giữ nguyên hostname. Không có fallback Quick Tunnel hoặc tự đăng ký app ChatGPT mới.

Cấu hình có thể đặt ở vị trí khác qua `LINKDESK_CONNECTION_FILE`. File được chỉ định mà thiếu/sai cũng làm launcher dừng. `publicOrigin` phải là HTTPS origin, không credentials/query/hash, không `/mcp`, không localhost/IP hoặc hostname `trycloudflare.com`. Kiểm tra cấu hình chỉ chứng minh launcher có địa chỉ, chưa chứng minh DNS/tunnel truy cập được từ Internet.

## Tunnel do dịch vụ Windows quản lý

Nếu đã cài named tunnel thành service và route đúng cổng, dùng:

```json
{
  "mode": "external",
  "publicOrigin": "https://mcp.example.com"
}
```

Launcher chạy broker và không khởi động/dừng tunnel service. Cần service/launcher riêng cho broker để khởi động cùng Windows và giám sát/restart; chưa cài service trên máy hiện tại. Không chạy hai broker chung `.linkdesk-data`.

## Kiểm chứng và bước tiếp theo

1. Kiểm tra HTTPS protected-resource/OAuth metadata đúng hostname cố định; `/mcp` chưa có token trả 401. Kiểm tra service route không public device API.
2. Kết nối ChatGPT vào URL cuối, owner consent, gọi bốn tools và nhận analyze/compose ở extension thật.
3. Restart tunnel: hostname không đổi. Không restart broker chỉ để thử hostname khi OAuth persistence chưa có.
4. **OAuth còn là việc riêng:** owner code đã persist, nhưng client/token đang ở memory và access token 24 giờ không có refresh. Broker restart vẫn cần reconnect; triển khai persistence an toàn và refresh rotation/revoke trước nghiệm thu vận hành lâu dài. Không kéo dài token vô hạn để che thiếu sót.
5. ChatGPT Plus cần phiên active gọi tools; host cố định không tự biến plugin thành AI worker chạy 24/7. Thao tác Facebook cần Chrome hoạt động và phiên gửi có giới hạn.

L060 hiện đã có code cấu hình hostname cố định và kiểm thử lỗi cấu hình. Chưa đóng M6: chưa domain/tunnel thật, chưa OAuth bền vững/refresh, chưa Windows service hoặc cloud hosting. Ưu tiên phần ổn định kết nối này trước mở rộng Facebook.
