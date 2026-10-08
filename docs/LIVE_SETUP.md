# Tiếp tục cấu hình tài khoản thật

Ngày 08/10/2026. Tài liệu này phân biệt ba kết nối để người phát triển sau không lặp lại setup hoặc đánh dấu thành công sớm.

| Thành phần | Mục đích | Trạng thái hiện tại |
|---|---|---|
| ChatGPT cho Chrome chính thức | Cho phép người dùng/agent làm việc trên profile đang đăng nhập | Đã kết nối; Plus đăng nhập sẵn |
| Kết nối MCP LinkDesk AI trong ChatGPT web | ChatGPT đọc tác vụ và ghi nội dung về broker | Người dùng đã duyệt và tạo; trang OAuth của broker mở, chờ chủ tài khoản nhập mã và consent |
| Extension LinkDesk 0.2.0 | Quản lý campaign, ghép broker và thực hiện phiên Facebook | Người dùng đã cài thủ công; ảnh version 0.2.0 đang bật và ảnh sau nhập pairing/health cho thấy cầu nối phản hồi, có HTTPS MCP URL. Chưa nhận nội dung AI |

Gói LinkDesk riêng tư đã lưu trong tài khoản qua Plugin Creator. UI hiện mở gói theo luồng Desktop. Đây là bằng chứng lưu gói, không phải bằng chứng ChatGPT web có tools. Không tạo bản sao gói để chữa lỗi xác thực. Không đổi sang “Không xác thực” để né consent.

Kiểm tra trực tiếp ngày 08/10 trên cùng hồ sơ Chrome đã đăng nhập: trang chi tiết custom MCP LinkDesk AI vẫn hiện nút Kết nối. Device API summary tại lúc kiểm tra có total 0, pending 0. Health field `chatgptVerified: false` hiện là giá trị cố định trong code; không dùng nó làm bằng chứng account chưa kết nối. Cần kiểm tra UI ChatGPT và một tool/task thực sự.

Lần consent thật gặp ERR_BLOCKED_BY_CLIENT khi trở về callback. CSP của trang authorize chỉ có form-action self, chặn redirect khác origin trên Chrome. Đã sửa để cho phép thêm đúng origin callback HTTPS thuộc client đã đăng ký, dùng redirect 303 sau POST và giữ Origin/nonce/PKCE/client/resource checks. Kiểm thử local trên cùng Chrome tái hiện form self bị chặn, thêm callback chạy được; 28 Node tests qua với consent POST và Origin sai bị từ chối. Chưa coi đây là bằng chứng consent thật hoàn tất.

Sau khi người dùng nhập mã, lần tiếp theo trả `Forbidden` tại `/consent`. Đã tái hiện trên cùng Chrome: header `Referrer-Policy: no-referrer` làm POST gửi `Origin: null`; Origin guard từ chối trước bước kiểm tra mã. Đã đổi thành `strict-origin` để gửi đúng Origin, chỉ chia sẻ origin thay vì đường dẫn/query authorize. Giữ nguyên Origin/nonce/PKCE/client/resource checks. Fixture `qa/oauth-origin-fixture.mjs` xác minh cả POST và callback 303, không dùng mã tài khoản thật. Test HTTP xác minh null/missing/foreign Origin vẫn bị từ chối.

Chẩn đoán tiếp theo bằng yêu cầu mới và kiểm tra runtime xác nhận nonce còn hạn nhưng owner code trong file khác mã broker đang giữ. Code cũ ghi owner trước bind cổng; callback app.listen của Express 5 có thể trả lỗi và bị coi như bind thành công. Đã sửa startup: dùng lại owner đã lưu, chỉ tạo sau cả hai cổng bind, bắt sự kiện listening/error, đóng socket khi startup thất bại. 31 tests/check qua; mã sai và phiên hết hạn/đã dùng có thông báo riêng. Không yêu cầu người dùng cứ nhập lại mã khi chưa xác minh mã file khớp runtime.

Broker hiện chạy bản mới ở tiến trình nền Windows. Quick Tunnel cấp hostname mới, owner code giữ nguyên; Chrome pairing giữ nguyên. Client kiểm thử riêng đã hoàn tất DCR/OAuth/PKCE, SDK list 4 tools; token kiểm thử đã revoke. Chưa coi đó là ChatGPT account consent. Kết nối thay thế hiện tại **LinkDesk AI hiện tại**, OAuth/DCR/scope compose. Chủ tài khoản cần tự nhập mã và consent. Luôn lấy URL hiện tại từ health/terminal, không dùng các bản gắn URL Quick Tunnel cũ. Chưa xóa các bản cũ để tránh xóa cấu hình tài khoản ngoài yêu cầu. Không restart chỉ để đọc mã hay đổi thông báo lỗi; owner code được lưu, nhưng client/token OAuth còn memory.

Đã đọc trang chủ nhà cung cấp trên Chrome bằng đúng raw affiliate URL và tạo 1 task analyze tại broker để kiểm tra MCP. Task này tạo qua device API, không gắn vào pending handle của dashboard Chrome. Hoàn tất task chứng minh broker nhận kết quả, chưa chứng minh form extension tự điền; cần một yêu cầu do chính extension tạo cho bước nghiệm thu đó. Task thử hết hạn sau 30 phút, không tái enqueue cùng key nếu đã expired. Không giữ session/tunnel tạm như một dịch vụ production.

## Resume theo thứ tự

1. Kiểm tra broker/tunnel còn chạy. `npm run connect` là một tiến trình sở hữu TaskStore; không khởi động broker thứ hai trên cùng thư mục. Nếu tunnel đã đổi, dùng endpoint mới trong terminal, không dùng URL từ ảnh cũ.
2. Tiếp tục OAuth đang mở cho LinkDesk AI, scope compose. Chủ tài khoản tự nhập mã owner và bấm Kết nối ChatGPT. Mã chỉ ở `.linkdesk-data/owner-code.txt`, không chép vào chat/log/Git. Consent request hết hạn sau 5 phút: nếu hết hạn, quay về ChatGPT bắt đầu lại connection flow; không phát lại callback hoặc bỏ PKCE. Không dùng cookies hoặc private ChatGPT API.
3. Xác minh giao diện kết nối liệt kê `linkdesk_list_tasks`, `linkdesk_get_task`, `linkdesk_submit_result`, `linkdesk_queue_summary`. Nếu thiếu tools, sửa discovery/auth rồi refresh; không tuyên bố đã kết nối dựa trên tên plugin.
4. Người dùng tự mở `chrome://extensions`, bật Developer mode, Load unpacked thư mục `extension` chứa manifest vào đúng profile Chrome. Browser automation đã từ chối URL này vì chỉ cho phép HTTP/HTTPS; không thay bằng raw CDP, sửa profile hoặc command để né chặn. Gói release và source repo có cùng version. Tiện ích ChatGPT chính thức không thay thế tiện ích LinkDesk.
5. Mở LinkDesk → AI & nguồn → chọn `.linkdesk-data/pairing.json` qua file chooser → kiểm tra cầu nối. Device token chỉ lưu trong phiên, không log hoặc xuất backup. Không đưa pairing file vào plugin account.
6. Từ extension tạo một tác vụ phân tích nguồn công khai. Mở chat mới với kết nối MCP LinkDesk AI, yêu cầu đọc tác vụ, soạn và submit. Kiểm tra kết quả trở lại Chrome và không có URL AI tự viết.
7. Tạo một tác vụ soạn thử. Nội dung cuối phải chứa đúng một URL, giữ nguyên `https://agentshop247.com/?ref=AS362560C5A713`, kèm nhãn tiếp thị. Chưa chạy gửi Facebook trong kiểm thử này.
8. Ghi evidence không chứa token: tên tools, loại task, trạng thái hoàn tất, exact-link assertion và ảnh màn hình. Khi cả analyze và compose thực sự về Chrome mới đóng L011/M1 trong BACKLOG, plan.json, HANDOFF và VALIDATION.

Facebook live là bước riêng: người dùng chọn nhóm được phép quảng cáo và bài cụ thể, cap 1. Giữ L031/L040/L043 mở cho đến khi có bằng chứng thực. Không tạo số click giả để làm dashboard trông hoàn chỉnh.

## Điều chưa đạt

ChatGPT Plus không trở thành daemon tự xử lý hàng đợi chỉ vì cài plugin. Broker giữ task; ChatGPT cần phiên active gọi tools. Quick Tunnel và OAuth memory hiện phục vụ thử nghiệm, cần reconnect khi restart. M6 giải quyết hostname cố định, OAuth bền vững và launcher. Xem [DEPLOYMENT](DEPLOYMENT.md) để phân biệt tunnel vào máy cá nhân và backend cloud.
