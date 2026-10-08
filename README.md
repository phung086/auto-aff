# LinkDesk · auto-aff · 0.2.0

Tiện ích Chrome tiếng Việt quản lý nhiều chiến dịch affiliate, dùng ChatGPT qua plugin MCP để phân tích nguồn và biên soạn, chạy phiên gửi tới đích Facebook bạn chọn và quản lý lịch sử. **ChatGPT provider không cần AI API key.**

Link mặc định giữ nguyên từng ký tự:

```text
https://agentshop247.com/?ref=AS362560C5A713
```

AI không viết URL. Ứng dụng gắn nguyên link đã lưu và kiểm tra trước mỗi lần gửi. Nhãn ngắn dùng trong nội dung: **Link tiếp thị liên kết.**

## Tài liệu và SUPER PLAN

- [SUPER PLAN: sơ đồ, mốc phát triển và tiêu chuẩn](docs/SUPER_PLAN.md) · [Bản xem trực quan HTML](docs/SUPER_PLAN.html)
- [AGENTS: quy tắc cho AI khác](AGENTS.md) → [HANDOFF: trạng thái và việc tiếp theo](docs/HANDOFF.md)
- [BACKLOG có thứ tự](docs/BACKLOG.md) · [plan.json](docs/plan.json) · [Kiến trúc](docs/ARCHITECTURE.md)
- [Kết nối ChatGPT](docs/PLUGIN_SETUP.md) · [Nghiệm thu](docs/ACCEPTANCE.md) · [Bảo vệ dữ liệu](docs/SECURITY_AND_DATA.md) · [Số liệu](docs/METRICS.md)
- [Kết quả kiểm chứng và giới hạn](VALIDATION.md) · [Quyết định kỹ thuật](docs/DECISIONS.md)

## Bắt đầu tại máy

1. Cài Node 22+ từ nguồn chính thức. Download/checkout repo, chạy `npm ci`.
2. Chrome → `chrome://extensions` → Developer mode → Load unpacked → chọn thư mục `extension` chứa manifest.json. Đăng nhập Facebook bằng profile đó.
3. Dùng ngrok đã cài theo [NGROK_SETUP](docs/NGROK_SETUP.md), lưu mode external rồi chạy `npm run connect`. Cloudflare là lựa chọn bổ sung; `npm start` chỉ dùng broker local.
4. Mở LinkDesk → **AI & nguồn** → chọn file `.linkdesk-data/pairing.json` do broker tạo. Kiểm tra cầu nối để lấy địa chỉ HTTPS MCP.
5. ChatGPT → Plugins → Add custom MCP server → địa chỉ HTTPS `/mcp`, OAuth. Cho phép bằng mã trong `.linkdesk-data/owner-code.txt` tại máy. Xem [hướng dẫn chi tiết](docs/PLUGIN_SETUP.md).
6. Mở plugin LinkDesk trong ChatGPT và yêu cầu xử lý các yêu cầu đang chờ. Trong Chrome, kiểm tra chiến dịch/link, thêm nhóm được phép quảng cáo hoặc Page của mình, chọn đích/cap và cho phép phiên chạy.

Giữ Chrome, broker và tunnel đang chạy. Ngrok account dev domain đã kết nối thật; Quick Tunnel vẫn chỉ thử nghiệm. MCP không tự bật AI. Đã thêm `npm run ai:worker` dùng Sign in with ChatGPT để tự soạn không cần prompt từng lượt; xem [AI tự động](docs/AUTO_AI_SETUP.md). Worker có code/tests nhưng login local hiện bị Chrome ERR_BLOCKED_BY_CLIENT, chưa inference thật; MCP OAuth persistence và Windows service còn chờ.

## Tính năng hiện có

Thêm nhiều nhà cung cấp bằng link và nguồn thông tin; phân tích qua ChatGPT, kiểm tra rồi lưu cấu hình. Hàng đợi với snapshot link, duyệt nội dung, chống bình luận trùng, Page schedule, STOP và trạng thái gián đoạn. Tìm nhóm công nghệ đang hiển thị và yêu cầu tham gia một nhóm đã kiểm tra quy định; không tự trả lời câu hỏi thành viên.

Phiên discover đọc tối đa 10 bài có từ khóa mỗi nhóm, ChatGPT đánh giá liên quan/soạn, mỗi nhịp một mục, cap 1..50. Phiên queue gửi các mục đã duyệt và đến giờ. Chrome phải chạy; không cuộn vô hạn. Bình luận và join nhóm là **adapter thử nghiệm qua giao diện Facebook**. Nếu layout thay đổi, nhiều nút/ô phù hợp, login/checkpoint hoặc chưa đủ bằng chứng, công cụ dừng. Không tự retry uncertain.

Page dùng [Meta Pages API](https://developers.facebook.com/docs/pages-api/posts/), cần Page access token đúng quyền và API version từ Meta App Dashboard. Page token chỉ lưu trong phiên Chrome. Không tự cấp quyền Meta hoặc tạo Page thay bạn.

Thống kê tách API/quan sát/thủ công/chưa rõ. Click lấy từ báo cáo nhà cung cấp có nguồn và khoảng ngày bạn nhập, không suy từ số bài. Giữ nguyên URL nên không thêm tracking/redirect. Chưa có API click/conversion/commission thật.

## Kiểm chứng hiện tại

Có kiểm thử local cho link, reducer, Page API mock, runner, broker/MCP SDK, OAuth PKCE và reports. Xem VALIDATION. **ChatGPT Plus qua ngrok đã hoàn tất một analyze thật từ extension; còn compose về Chrome và Facebook comment/join/Page thật.** Đừng coi preview hoặc mock là chứng minh đã đăng.

Chrome Plus và LinkDesk extension đã cài/ghép; custom MCP LinkDesk ngrok đã consent và ghi kết quả analyze thật. Plan worker có quyền inference riêng còn chờ đăng nhập, xem AUTO_AI_SETUP. AI phát triển kế tiếp đọc [trạng thái cấu hình thật](docs/LIVE_SETUP.md) để tiếp tục đúng bước, tránh tạo lại gói plugin hoặc tuyên bố tích hợp hoàn tất sớm. [Triển khai và tunnel](docs/DEPLOYMENT.md) giải thích backend đang chạy tại máy và các bước M6 để dùng hostname cố định/cloud.

## Phát triển

```powershell
npm ci
npm test
npm run check
npm start
```

`python preview.py` mở UI tại `http://127.0.0.1:8765/extension/dashboard.html`; preview không gọi AI hoặc Facebook. `npm run mcp:stdio` kết nối broker đang chạy cho MCP client local. `npm run package` tạo source package ở dist/linkdesk từ allowlist, không có runtime/secrets/node_modules. Plugin manifest/skill nằm ở root; chưa nộp lên public plugin directory.

## Dữ liệu và nguồn

Sao lưu JSON/CSV không chứa token. Restore tắt lịch/approval; mục publishing gián đoạn chuyển uncertain. Không commit `.linkdesk-data` hay `.env`. Website supplier được đọc với quyền theo website. Nguồn Agent Shop 247 đọc ngày 07/10/2026, là lời nhà cung cấp công bố, chưa xác minh độc lập; không tự thêm giá hoặc bảo hành.

Tham chiếu: [Open AI custom MCP](https://developers.openai.com/plugins/deploy/connect-chatgpt), [OAuth](https://developers.openai.com/plugins/build/auth), [plugin packaging](https://developers.openai.com/plugins/build/plugins), [Meta Groups API thay đổi](https://developers.facebook.com/docs/graph-api/changelog/version19.0), [Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/). Be Vietnam Pro được phân phối với giấy phép OFL trong extension/fonts/OFL.txt.
