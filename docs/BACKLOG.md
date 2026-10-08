# Backlog có thứ tự

Ready nghĩa là có thể triển khai tiếp. Awaiting live nghĩa là code có nhưng cần tài khoản/phiên thật. Done-code không đồng nghĩa production ready.

| ID | Mốc / ưu tiên | Trạng thái | Công việc và nghiệm thu |
|---|---|---|---|
| L001 | M0 / P0 | Done-code | Exact link, snapshot jobs, URL phụ, backup reset quyền; regression bắt buộc |
| L010 | M1 / P0 | Done-code | Broker durable/idempotent/expiry, schema, MCP tools, OAuth PKCE, loopback pairing |
| L011 | M1 / P0 | Analyze live / compose pending | LinkDesk ngrok Primary connected; ChatGPT Plus đã xử lý analyze thật từ extension, broker completed và giữ exact URL. Ảnh chủ máy xác nhận danh sách chiến dịch lưu/exact URL; còn compose về Chrome. 44 tests/check qua |
| L012 | M1 / P1 | Partial recovery / durable handle Ready | Nút Nhận kết quả đã có đọc tối đa20 completed analyze khớp exact link vào form, không gọi AI; đọc broker thật đúng task78d3938f. Chủ máy báo sau recovery đã thấy danh sách chiến dịch lưu; chưa chứng minh polling tự nhận. Còn lưu handle manual pending bền vững, cancel khi đóng/ngắt, không tạo task trùng |
| L014 | M1 / P0 | Worker inference live / saved campaign UI seen | OAuth/model/analyze/compose qua; analyze thật từ nút extension từng product>300 dừng worker. Đã sửa prompt, viết lại tối đa1 có budget và báo lỗi task; chính task đã completed/exact URL/product69 ký tự. Ảnh chủ máy thấy danh sách chiến dịch lưu/exact URL sau recovery; compose về UI và refresh/quota/STOP thật còn gate. 44 tests/check; xem WORKER_OAUTH_VERIFICATION |
| L013 | M1 / P1 | Ready | Lease xử lý task/worker; nhiều phiên ChatGPT không ghi đè; pending pagination ổn định |
| L020 | M2 / P0 | Done-code | Home 3 steps, AIChatGPT mặc định, API nâng cao, báo cáo có nguồn, trạng thái chờ |
| L021 | M2 / P1 | Ready | Setup wizard/launcher Windows, tự khám phá file ghép không truyền secret ra chat, error recovery dễ hiểu |
| L022 | M2 / P1 | Ready | Phân biệt trạng thái local health, quyền MCP và kết quả đã nhận; health hiện hardcode chatgptVerified=false. Không suy luận tài khoản từ field này; thêm bằng chứng tool/task và UI rõ |
| L030 | M3 / P1 | Done-code experimental | Tìm nhóm đang hiển thị và join một nhóm đã xác nhận quy định; pending/manual/uncertain |
| L031 | M3 / P0 | Awaiting live | Xác minh bố cục Facebook thật trong Chrome; ngăn bấm nhầm/bấm lại khi restart |
| L040 | M4 / P0 | Awaiting live | Một bình luận target cụ thể, cap 1, exact URL, kiểm tra status và STOP; không mở rộng trước nghiệm thu |
| L041 | M4 / P0 | Ready | Quan sát comment ID/permalink thay rolearticle nếu layout cho phép; uncertain nếu thiếu bằng chứng |
| L042 | M4 / P1 | Ready | Kiểm tra intent mạnh hơn: cần hỏi mua/tài nguyên trực tiếp; bài demo không hỏi công cụ ưu tiên skip |
| L043 | M4 / P1 | Awaiting live | Page token/API quyền đúng, publish 1 mục + gián đoạn, không đưa token vào source |
| L050 | M5 / P1 | Done-code | Status theo campaign, lịch sử CSV, báo cáo click nhập tay; không cộng kỳ trùng |
| L051 | M5 / P1 | Ready | Adapter CSV nhà cung cấp: preview mapping columns, exact link/ref, dedupe source+period, bằng chứng import |
| L052 | M5 / P2 | Pending supplier | Nhà cung cấp cấp API click/conversion/commission + định nghĩa metric; không suy đoán endpoint |
| L060 | M6 / P0 | In progress | Ngrok account domain thật + metadata/OAuth/analyze đã hoạt động. Còn MCP OAuth client/token persistence/refresh/revoke và restart evidence |
| L061 | M6 / P1 | Ready | Windows background launcher, shutdown orderly, safe update/backup/rollback; ký bản phân phối |
| L062 | M6 / P1 | Ready | Retention/delete task data có backup, không full-file corruption, test disk/full/crash; single-process lock |
| L070 | M7 / P1 | Ready contract-only | Provider/platform capabilities/version/market/permissions; adapter unknown disabled; publisher phụ thuộc G0/quyền thật |
| L071 | G1 / P1 | Ready | SourceScope/account capabilities/rules evidence/expiry; chọn nguồn một lần, không nhập URL từng bài; schema additive, restore không bật gửi |
| L072 | G1 / P1 | Planned, depends L071/L013 | Candidate identity/cursor/dedupe liên lượt và liên tài khoản; thiếu identity không publish |
| L073 | G1 / P1 | Planned, depends L072/L042 | Relevance/reason/evidence; demo không hỏi mua skip; prompt injection không đổi quyền/link |
| L074 | G1 / P1 | Planned, permission gate | Bounded source reader + STOP/resume/layout detection; chưa xác minh quyền Facebook/read live |
| L075 | G1 / P1 | Planned, depends L012/L022/L073 | UX Discovery nguồn lưu sẵn, permalink tự tìm, preview/skip/progress/STOP/error recovery |
| L080 | G4 / P1 | Planned, depends L071 | AccountRef/private credentialRef, scope và approval account binding, không gửi chéo |
| L081 | G4 / P1 | Planned, depends L080/L013 | Phiên theo account/cap/quota/STOP; không rotation hoặc retry qua tài khoản khác |
| L082 | G4 / P1 | Planned, depends L051 | Report orders/refunds/commission/currency/source, pending/confirmed, overlap đối soát |
| L090 | G5 / P2 | Planned, depends L070/L051 | Shopee VN link chính thức + CSV/report; API khi có tài liệu/quyền thật |
| L091 | G5 / P2 | Planned, depends L070/L082 | TikTok Shop VN link/campaign/order/refund; không suy product anchor từ link ngoài |
| L092 | G5 / P2 | Research gate; publisher disabled | TikTok Direct Post intended-use/app review/scope/audit/consent; tool nội bộ không mặc định phù hợp |

Chọn một ticket đủ phụ thuộc: G0 L013/L012 trước discovery/publisher. L011/L014 tiếp tục gate live; L071 và L070 contract có thể làm độc lập với ownership riêng. Không mở rộng gửi trước G2. Xem IMPLEMENTATION_TICKETS cho acceptance/rollback, COWORK_PROTOCOL cho phân việc. Coordinator đồng bộ bảng này và plan.json; ticket live chỉ đóng có evidence.
