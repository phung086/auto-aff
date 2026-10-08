# Tiêu chuẩn nghiệm thu

## Kiểm tra tự động

- URL được giữ nguyên thứ tự tham số và encoding; đổi một ký tự hoặc thêm URL phụ bị chặn trước khi gửi.
- Snapshot của job không đổi theo campaign; không thêm bình luận trùng bài; backup không chứa secrets và không khôi phục quyền gửi tự động; CSV chặn công thức.
- Broker nhận các yêu cầu đồng thời cùng key đúng một lần; key có input khác bị từ chối; kết quả idempotent; URL do AI viết bị chặn; cancel, expiry và restart giữ trạng thái đúng.
- Device API từ chối sai token/Host. OAuth yêu cầu owner consent, PKCE và ràng buộc client/callback/resource; code dùng một lần. MCP SDK initialize/list/call và structured output hoạt động.
- Báo cáo từ chối số âm, ngày không tồn tại, link khác; backup giữ snapshot báo cáo cũ. STOP khi chờ ChatGPT không gửi nội dung muộn.

## Kiểm tra giao diện

Desktop và khung 390px: Home ba bước, ChatGPT mặc định, API nâng cao đóng sẵn, không báo kết nối giả. Link đọc được; chưa có báo cáo click thì hiện thiếu dữ liệu. Form báo cáo lưu nguồn/ngày; bảng rộng cuộn trong bảng; trạng thái error/loading và focus bàn phím rõ.

## Nghiệm thu tài khoản thật

ChatGPT: review OAuth, phát hiện bốn tools, xử lý một analyze và một compose; Chrome nhận kết quả với nguyên URL. Facebook: đăng nhập đúng profile, kiểm tra quy định nhóm, thử một mục với cap1. Join phân biệt thành viên/chờ duyệt/câu hỏi; comment đối chiếu đúng bài; Page cần đúng token/quyền. STOP và restart không tạo lượt gửi thêm.

Ghi bằng chứng ở VALIDATION; ID/permalink riêng lưu tại máy, public docs chỉ mô tả loại kiểm chứng. Mock và screenshot local không thay thế nghiệm thu này.

## Phát hành

Chạy `npm ci`, `npm test`, `npm run check`; lockfile đồng bộ; artifact không chứa runtime, secrets hoặc node_modules. Kiểm tra GitHub ref khớp commit. Docs không báo live đã đạt nếu chưa có bằng chứng. Đẩy source theo yêu cầu chủ dự án; chưa nộp plugin lên public directory.
