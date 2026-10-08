# Backlog có thứ tự

Ready nghĩa là có thể triển khai tiếp. Awaiting live nghĩa là code có nhưng cần tài khoản/phiên thật. Done-code không đồng nghĩa production ready.

| ID | Mốc / ưu tiên | Trạng thái | Công việc và nghiệm thu |
|---|---|---|---|
| L001 | M0 / P0 | Done-code | Exact link, snapshot jobs, URL phụ, backup reset quyền; regression bắt buộc |
| L010 | M1 / P0 | Done-code | Broker durable/idempotent/expiry, schema, MCP tools, OAuth PKCE, loopback pairing |
| L011 | M1 / P0 | Awaiting consent/live | Chrome Plus đã kết nối; form MCP nhận OAuth/DCR/compose. Còn consent, list 4 tools, analyze 1 task và compose 1 task về extension; không cần AI key |
| L012 | M1 / P1 | Ready | Lưu handle manual pending để refresh dashboard không mất yêu cầu; cancel khi đóng/ngắt; không tạo task trùng |
| L013 | M1 / P1 | Ready | Lease xử lý task/worker; nhiều phiên ChatGPT không ghi đè; pending pagination ổn định |
| L020 | M2 / P0 | Done-code | Home 3 steps, AIChatGPT mặc định, API nâng cao, báo cáo có nguồn, trạng thái chờ |
| L021 | M2 / P1 | Ready | Setup wizard/launcher Windows, tự khám phá file ghép không truyền secret ra chat, error recovery dễ hiểu |
| L030 | M3 / P1 | Done-code experimental | Tìm nhóm đang hiển thị và join một nhóm đã xác nhận quy định; pending/manual/uncertain |
| L031 | M3 / P0 | Awaiting live | Xác minh bố cục Facebook thật trong Chrome; ngăn bấm nhầm/bấm lại khi restart |
| L040 | M4 / P0 | Awaiting live | Một bình luận target cụ thể, cap 1, exact URL, kiểm tra status và STOP; không mở rộng trước nghiệm thu |
| L041 | M4 / P0 | Ready | Quan sát comment ID/permalink thay rolearticle nếu layout cho phép; uncertain nếu thiếu bằng chứng |
| L042 | M4 / P1 | Ready | Kiểm tra intent mạnh hơn: cần hỏi mua/tài nguyên trực tiếp; bài demo không hỏi công cụ ưu tiên skip |
| L043 | M4 / P1 | Awaiting live | Page token/API quyền đúng, publish 1 mục + gián đoạn, không đưa token vào source |
| L050 | M5 / P1 | Done-code | Status theo campaign, lịch sử CSV, báo cáo click nhập tay; không cộng kỳ trùng |
| L051 | M5 / P1 | Ready | Adapter CSV nhà cung cấp: preview mapping columns, exact link/ref, dedupe source+period, bằng chứng import |
| L052 | M5 / P2 | Pending supplier | Nhà cung cấp cấp API click/conversion/commission + định nghĩa metric; không suy đoán endpoint |
| L060 | M6 / P0 | Ready | HTTPS hostname cố định, persisted OAuth hoặc OAuth provider chuẩn; revoke device/client; restart không phải reconnect hàng ngày |
| L061 | M6 / P1 | Ready | Windows background launcher, shutdown orderly, safe update/backup/rollback; ký bản phân phối |
| L062 | M6 / P1 | Ready | Retention/delete task data có backup, không full-file corruption, test disk/full/crash; single-process lock |
| L070 | M7 / P2 | Planned | Source adapter contracts/version, nhiều industry prompts, platform adapter API có quyền |

Chọn một ticket ở mốc chưa qua có ưu tiên P0 trước. Ticket live chỉ đóng khi evidence ghi rõ. Mọi thay đổi phải cập nhật bảng này và plan.json. Đề xuất tiếp theo: L011 rồi L040; nếu chưa có phiên Chrome/ChatGPT điều khiển được, làm L012 và L060, giữ live tickets mở.
