# Kết nối ChatGPT Plus không cần AI API key

ChatGPT thực hiện suy luận và gọi MCP. Cầu nối không đọc cookie tài khoản, không giả mạo chatgpt.com và không dùng private ChatGPT API.

## Thiết lập tại máy

1. Cài Node22+ từ nguồn chính thức. Checkout/download repo và chạy `npm ci`.
2. Cài extension unpacked thư mục `extension` trong Chrome. Đăng nhập Facebook bằng chính profile đó.
3. Cài cloudflared từ [Cloudflare](https://developers.cloudflare.com/tunnel/downloads/), chạy `npm run connect`. Có thể đặt `LINKDESK_CLOUDFLARED` là đường dẫn executable chính thức tại máy.
4. Giữ terminal đang chạy. `.linkdesk-data/pairing.json` dùng ghép Chrome; `.linkdesk-data/owner-code.txt` dùng cho phép OAuth. Không đưa hai file lên GitHub hoặc gửi vào chat.
5. LinkDesk → AI & nguồn → Chọn pairing.json → Kiểm tra cầu nối. Địa chỉ HTTPS MCP kết thúc bằng `/mcp`, hiện trong terminal/UI. Ghép lại sau khi đóng toàn bộ Chrome vì device token chỉ lưu trong phiên.

`npm start` chạy broker cục bộ. `npm run mcp:stdio` là proxy MCP cho client local, nối cùng broker đang chạy; không tạo một kho task thứ hai. ChatGPT web cần endpoint HTTPS hoặc tunnel được tài khoản hỗ trợ; không nhập localhost vào form web.

## Thiết lập trong ChatGPT

Theo [hướng dẫn chính thức](https://developers.openai.com/api/docs/guides/custom-mcp-server): Plugins → nút+ → Add custom MCP server (UI tiếng Việt: Thêm → Tạo server MCP tùy chỉnh). Đặt tên LinkDesk AI, mô tả “Biên soạn cho hàng đợi affiliate tại máy”. Nhập HTTPS URL có `/mcp`, chọn OAuth. Cài đặt nâng cao phải tự nhận DCR, scope compose và các endpoint cùng hostname. Review quyền/risk notice và Create as a plugin. Khi trang consent LinkDesk mở, chủ tài khoản tự nhập mã owner-code tại máy và đồng ý. Quyền chỉ đọc yêu cầu và ghi kết quả biên soạn.

Code L013 có7 tools: `linkdesk_list_tasks`, `linkdesk_get_task`, `linkdesk_submit_result`, `linkdesk_queue_summary`, `linkdesk_claim_task`, `linkdesk_renew_lease`, `linkdesk_release_task`. Broker thật chưa được nâng ở heartbeat; bốn tools cũ là evidence runtime trước nâng. Khi nâng đồng bộ/làm mới catalog, list pending bằng cursor; claim mỗi task trước soạn, giữ token riêng, submit đúng ID/token. Xem [TASK_LEASES](TASK_LEASES.md). Không tự restart broker hoặc tạo connector trùng để làm mới tools.

Ghép Chrome và kết nối ChatGPT là hai bước riêng. Xác minh Chrome nhận kết quả trước khi chạy gửi Facebook.

## Vận hành và giới hạn

ChatGPT cần phiên thực sự xử lý task. Broker giữ hàng đợi nhưng không tự mở phiên ChatGPT. Task hết hạn30 phút; quá hạn cần yêu cầu mới. Runner kiểm tra một nhịp mỗi phút; STOP hủy task đang chờ. Không thêm shortener/UTM để đo click.

Quick Tunnel đổi URL khi restart; auth provider xóa client/token khi restart. Owner code hiện được lưu và dùng lại, không tự đổi sau restart hoặc khi một broker thứ hai gặp lỗi bind. Access token 24h, không refresh. Cần kết nối lại plugin khi endpoint/token đổi. Đây là cấu hình cá nhân thử nghiệm; M6 phát triển host cố định, OAuth bền vững và launcher.

## Chẩn đoán

- Local không phản hồi: khởi động broker, kiểm tra port8787, pairing file đúng máy và phiên Chrome. Không bỏ Bearer để sửa lỗi.
- ChatGPT không kết nối: kiểm tra HTTPS metadata, Host đúng origin, OAuth URL `/mcp` và tunnel đang chạy; URL cũ không dùng lại.
- Pending lâu: mở plugin trong ChatGPT và yêu cầu xử lý. “Đã ghép” không đồng nghĩa AI đang chạy.
- PKCE/callback sai: bắt đầu lại từ ChatGPT, không bỏ kiểm tra callback/resource.
- Mã không đúng: dùng owner-code.txt của broker hiện tại. Phiên hết hạn/đã dùng: bắt đầu lại kết nối từ ChatGPT, không tải lại POST /consent. Code cũ từng ghi đè file owner trước khi bind cổng, làm file khác bộ nhớ của broker đang chạy; đã sửa bằng lưu mã bền vững và chỉ tạo sau bind thành công.
- Facebook checkpoint/câu hỏi thành viên: xử lý trực tiếp; adapter dừng.

## Gói plugin

Root `plugin.json`, `mcp.json` và `skills/` tạo gói portable local. `npm run package` xuất thư mục `dist/linkdesk`, cần `npm ci` trước khi chạy. Gói stdio kết nối broker đã khởi động. Gói cloud riêng tư có thể hiện trong tài khoản nhưng mở theo luồng Desktop; upload gói không tự đăng ký hay xác thực kết nối MCP web. ChatGPT web dùng custom MCP HTTPS; technical ID của kết nối chỉ có sau khi đăng ký. Không bịa ID trong `.app.json`. Chưa nộp lên public plugin directory. Trạng thái thử nghiệm và cách tiếp tục ở [LIVE_SETUP](LIVE_SETUP.md).

## Biên soạn không cần nhập prompt từng lượt

Dùng worker plan OAuth riêng theo [AUTO_AI_SETUP](AUTO_AI_SETUP.md). MCP vẫn là đường biên soạn qua phiên ChatGPT; khi worker đã cấp quyền/bật, nó xử lý cùng hàng đợi tại máy. Worker login/inference thật chưa nghiệm thu; không coi cài plugin là AI daemon.
