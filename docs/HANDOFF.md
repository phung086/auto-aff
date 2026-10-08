# Bàn giao cho AI / người phát triển kế tiếp

Ngày08/10/2026 · release0.2.0 · repo https://github.com/phung086/auto-aff.

## Bắt đầu

Đọc AGENTS và SUPER_PLAN, rồi BACKLOG. Chạy `npm ci`, `npm test`, `npm run check`; preview `python preview.py`. Node22+ cần cho broker; ChatGPT mặc định không cần AI API key.

## Đã có code

Extension: campaign nhiều nhà cung cấp, raw link snapshot, đích, hàng đợi/approve, chống trùng/uncertain, cap/session/STOP, source read, manual fallback, Page API, comment adapter thử nghiệm, CSV/backup.0.2 thêm broker durable, MCP SDK/OAuth, ghép Chrome, analyze/compose task, runner chờ ChatGPT, Home/statistics, báo cáo click nhập thủ công, tìm nhóm và join một lần có trạng thái. CI và package allowlist đã có.

SUPER_PLAN có sơ đồ Mermaid và HTML; plan.json ghi mốc. AGENTS và BACKLOG quy định thứ tự phát triển. Không đánh dấu mốc live hoàn tất chỉ bằng mock.

## Bằng chứng và điểm còn thiếu

Local tests và HTTPS metadata/auth rejection có kiểm chứng; xem VALIDATION. Chrome cá nhân đã kết nối qua tiện ích ChatGPT chính thức, tài khoản Plus đang đăng nhập. Đã lưu gói LinkDesk riêng tư trong tài khoản; UI gói này mở theo luồng Desktop. Custom MCP LinkDesk AI trên web nhận đúng OAuth/DCR/compose; người dùng đã duyệt và tạo, đang chờ nhập mã tại trang OAuth của broker. Chưa xác minh ChatGPT thật gọi bốn tools và Chrome nhận kết quả. Browser automation không được mở chrome://extensions: người dùng cài unpacked thủ công. Không đọc/đổi cookies/profile hoặc vượt challenge. Cấu hình hiện là Quick Tunnel vào broker tại máy, xem DEPLOYMENT.

Người dùng đã cài extension Chrome thủ công; ảnh cung cấp cho thấy LinkDesk 0.2.0 đang bật. Broker /health phản hồi ok và đúng version; chưa xác minh ghép extension và nhận bản thảo AI. Chưa thử Facebook join/comment/Page thật, chưa có Page token hoặc supplier API click/conversion. Quick Tunnel tạm; không ghi URL tạm vào manifest Git. Memory OAuth sessions cần kết nối lại sau restart. Plugin không tự tạo AI chạy nền24/7.

## Việc tiếp theo

1. **L011:** `npm run connect`, ghép pairing.json trong Chrome, đăng ký MCP/OAuth trong ChatGPT. Xử lý một analyze và một compose; kiểm tra nguyên URL. Ghi evidence không chứa token.
2. **L040/L031:** người dùng chọn nhóm cho phép quảng cáo và bài cụ thể, cap1. Kiểm tra membership/target và kết quả; câu hỏi thành viên cần người dùng. L043 nếu có Page token đúng quyền.
3. **L012:** lưu handle manual qua reload; cancel/disconnect rõ. **L060:** host cố định/OAuth bền vững trước mở rộng.

Xem [LIVE_SETUP](LIVE_SETUP.md) để tiếp tục đúng bước còn thiếu. Không tạo lại gói plugin tài khoản nếu chỉ cần thêm kết nối MCP. Nếu đang chờ OAuth hoặc cài extension, tiếp tục L012/L060 và giữ live ticket mở. Không dùng private ChatGPT API làm đường tắt.

## Bẫy kỹ thuật

Git từng thừa kế repo home, nay có .git riêng; kiểm tra toplevel trước stage. `.linkdesk-data` riêng tư, không commit/logtoken. URL không normalize; regex URL phụ case-insensitive. Job/report giữ snapshot dù campaign đổi. Restore nhận legacy disclosure0.1, nội dung mới dùng nhãn ngắn.

Stdio proxy nối broker đang chạy; không hai TaskStore cùng directory. Cap5000task, chưa retention/lock. Join requesting/uncertain không retry. DOM evidence không ổn định như API. MCP không có publish tool; Chrome giữ quyền gửi.

## Kết thúc ticket

Code, kiểm thử hành vi và docs/status/evidence đồng bộ. Artifact allowlist không có secrets/node_modules/runtime. Final nêu bằng chứng, giới hạn và bước kế tiếp. Screenshot local không chứng minh đã đăng Facebook.
