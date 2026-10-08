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
3. Cài cloudflared từ [Cloudflare](https://developers.cloudflare.com/tunnel/downloads/) rồi chạy `npm run connect`. Hoặc `npm start` chỉ để dùng broker cục bộ.
4. Mở LinkDesk → **AI & nguồn** → chọn file `.linkdesk-data/pairing.json` do broker tạo. Kiểm tra cầu nối để lấy địa chỉ HTTPS MCP.
5. ChatGPT → Plugins → Add custom MCP server → địa chỉ HTTPS `/mcp`, OAuth. Cho phép bằng mã trong `.linkdesk-data/owner-code.txt` tại máy. Xem [hướng dẫn chi tiết](docs/PLUGIN_SETUP.md).
6. Mở plugin LinkDesk trong ChatGPT và yêu cầu xử lý các yêu cầu đang chờ. Trong Chrome, kiểm tra chiến dịch/link, thêm nhóm được phép quảng cáo hoặc Page của mình, chọn đích/cap và cho phép phiên chạy.

Giữ Chrome, broker và tunnel đang chạy. **Plugin không tự khởi động một AI chạy nền 24/7.** ChatGPT cần phiên làm việc xử lý hàng đợi. Quick Tunnel dùng để thử nghiệm, địa chỉ đổi khi restart. Host cố định/launcher là M6 trong kế hoạch.

## Tính năng hiện có

Thêm nhiều nhà cung cấp bằng link và nguồn thông tin; phân tích qua ChatGPT, kiểm tra rồi lưu cấu hình. Hàng đợi với snapshot link, duyệt nội dung, chống bình luận trùng, Page schedule, STOP và trạng thái gián đoạn. Tìm nhóm công nghệ đang hiển thị và yêu cầu tham gia một nhóm đã kiểm tra quy định; không tự trả lời câu hỏi thành viên.

Phiên discover đọc tối đa 10 bài có từ khóa mỗi nhóm, ChatGPT đánh giá liên quan/soạn, mỗi nhịp một mục, cap 1..50. Phiên queue gửi các mục đã duyệt và đến giờ. Chrome phải chạy; không cuộn vô hạn. Bình luận và join nhóm là **adapter thử nghiệm qua giao diện Facebook**. Nếu layout thay đổi, nhiều nút/ô phù hợp, login/checkpoint hoặc chưa đủ bằng chứng, công cụ dừng. Không tự retry uncertain.

Page dùng [Meta Pages API](https://developers.facebook.com/docs/pages-api/posts/), cần Page access token đúng quyền và API version từ Meta App Dashboard. Page token chỉ lưu trong phiên Chrome. Không tự cấp quyền Meta hoặc tạo Page thay bạn.

Thống kê tách API/quan sát/thủ công/chưa rõ. Click lấy từ báo cáo nhà cung cấp có nguồn và khoảng ngày bạn nhập, không suy từ số bài. Giữ nguyên URL nên không thêm tracking/redirect. Chưa có API click/conversion/commission thật.

## Kiểm chứng hiện tại

Có kiểm thử local cho link, reducer, Page API mock, runner, broker/MCP SDK, OAuth PKCE và reports. Xem VALIDATION. **Chưa nghiệm thu ChatGPT Plus thật, Chrome profile người dùng, Facebook comment/join/Page thật.** Đừng coi preview hoặc mock là chứng minh đã đăng.

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
