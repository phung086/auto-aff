# AI tự động dùng gói ChatGPT

09/10/2026. Bản vá PR #1 đã chạy trên Windows và Chrome thật: POST /auth/start, consent, callback và danh sách model đã qua. Worker GPT-6.1-Sol tự hoàn tất một analyze và một compose, giữ nguyên link; giới hạn2 tự dừng. Restart giữ đăng nhập và budget0, đọc model được mà không cấp quyền lại. 44 tests/check qua. **Ảnh chủ máy xác nhận danh sách chiến dịch đã lưu với exact URL sau recovery; compose về UI, Windows startup và Facebook thật còn chờ.** Xem [bằng chứng kiểm tra](WORKER_OAUTH_VERIFICATION.md).

## Hai quyền khác nhau

**LinkDesk ngrok trong ChatGPT** cho ChatGPT đọc task và gửi bản thảo về broker. Kết nối này đã xử lý thành công một analyze thật từ extension; nó không cho LinkDesk tự khởi động model.

**Continue with ChatGPT trong worker** là luồng OpenAI chính thức cấp quyền ứng dụng tại máy dùng gói ChatGPT. Worker lấy task từ cùng hàng đợi, gọi AI và gửi kết quả. Không cần AI API key; quyền này tiêu thụ hạn mức gói ChatGPT và còn phụ thuộc tài khoản/khu vực/workspace.

## Cấu hình

1. Trong thư mục dự án chạy `npm ci`. Giữ broker đang chạy và Chrome đã ghép pairing.json.
2. Chạy `npm run ai:worker`. Mở `http://127.0.0.1:8791/` bằng Chrome đang đăng nhập ChatGPT. Worker chỉ nghe loopback; **không tunnel cổng8791 hoặc Device API8787**.
3. Bấm **Continue with ChatGPT**, mở liên kết OpenAI; chủ tài khoản hoàn tất đăng nhập/cấp quyền dùng gói. Callback chính xác `http://127.0.0.1:8791/auth/callback`.
4. Bấm **Kiểm tra model**, chọn model tài khoản trả về, đặt giới hạn1–50 yêu cầu/phiên, bấm **Bắt đầu biên soạn tự động**.
5. Extension giữ **ChatGPT qua plugin MCP / hàng đợi**. Nhập link/nguồn như trước. Khi worker đã được cấp quyền và bật, worker xử lý task mà không cần prompt từng lượt.
6. Có thể đóng trang cấu hình; broker và worker vẫn phải chạy. Chrome cần hoạt động để nhận kết quả/thực hiện phiên đã cho phép. Chưa có Windows startup service.

Nếu Chrome báo ERR_BLOCKED_BY_CLIENT: đăng nhập chưa qua, không phải đã kết nối. Mã mới dùng POST /auth/start và Referrer-Policy: strict-origin để tránh lỗi Origin: null / 403 từng tái hiện ở dự án. **Đổi đường dẫn không chứng minh hay bảo đảm hết ERR_BLOCKED_BY_CLIENT**: lỗi này vẫn có thể do tiện ích trình duyệt hoặc chính sách máy chặn trước khi gửi. Chủ máy hoặc quản trị viên kiểm tra Network/Console và nhật ký chính sách Chrome, phân biệt (a) request không xuất hiện ở server, (b) server trả 403, (c) redirect OAuth bị chặn. Không tắt bảo vệ hoặc đổi cookie. Chỉ sau khi truy cập trở lại mới nghiệm thu OAuth/model/inference thật.

### Chẩn đoán login sau bản vá

1. Khởi động worker bằng `npm run ai:worker`; mở trang localhost 8791. Bấm Continue with ChatGPT **một lần**.
2. Nếu còn ERR_BLOCKED_BY_CLIENT, mở DevTools → Network để xem request `POST /auth/start` bị chặn ở client hay nhận mã HTTP thực sự. Kiểm tra `chrome://policy` và tiện ích theo quy trình quản trị được phép; không tắt extension bảo mật để lách chính sách.
3. Nếu HTTP 403, kiểm tra `Origin: http://127.0.0.1:8791` trong yêu cầu và Host `127.0.0.1:8791`. Không nới kiểm tra Origin/CSRF để sửa lỗi. Nếu thấy trang OpenAI, tiếp tục authorize và callback; kiểm tra model sau đó.
4. Trên máy chủ dự án, callback, model và hai inference thật đã qua sau consent. Trên máy mới vẫn phải hoàn tất toàn bộ luồng; không coi trang consent là đã đăng nhập hoàn tất.

## Vận hành và bảo vệ dữ liệu

Worker poll4 giây, một request/lần, inference timeout120 giây. Trừ số yêu cầu **trước** inference và persist; restart không tự nạp ngân sách. Lỗi/quota hoặc hết ngân sách dừng, không retry vô hạn hay chuyển API trả phí. STOP hủy request và chặn submit muộn. Ngắt tài khoản cố revoke OpenAI rồi xóa tokens tại máy, UI báo nếu chưa xác nhận revoke từ xa.

Ngoại lệ có giới hạn: nếu phân tích campaign đúng cấu trúc nhưng vượt độ dài name/product/benefit/keywords, worker yêu cầu viết lại tối đa1 lần nếu còn budget và task còn pending. Lượt này cũng tiêu thụ một yêu cầu. Không tự viết lại lỗi URL/ID/HTTP/quota hoặc cắt nội dung để ép qua schema. Nếu vẫn lỗi, worker dừng và extension bản mới hiện lỗi cho đúng task; mở localhost8791 để kiểm tra rồi chủ động bắt đầu phiên mới.

`server/chatgpt-plan.mjs`: state/nonce/PKCE, jose JWT/JWKS + issuer/audience/expiry, identity binding khi tái xác thực, scope plan, refresh serialize và rotating refresh token. Mỗi client/account record riêng; host ID ổn định. Tokens chỉ trong `.linkdesk-data/chatgpt/accounts.json`, không browser/log/Git. Thư mục Windows bỏ quyền kế thừa và cấp SID người dùng hiện tại; Unix0700/0600. Không đọc credentials/Codex auth/cookies của ứng dụng khác.

`server/plan-worker.mjs`: chỉ gửi nguồn/ngữ cảnh cần thiết tới OpenAI. AI không chọn ID, tạo URL, gọi công cụ hoặc gửi Facebook. Chỉ ghi khi stream có response.completed, JSON hợp lệ và task vẫn pending. Broker gắn nguyên link + nhãn tiếp thị. Hủy/hết hạn/đã hoàn tất không bị ghi đè.

worker.lock chặn hai worker cùng directory. Sau crash xác minh tiến trình đã dừng trước khi dọn lock; không tự xóa lock còn sống. L013 cross-client lease đã local-tested, xem TASK_LEASES, nhưng chưa deploy lên runtime hiện tại: vẫn chỉ chạy một phương thức trên hàng đợi cũ. Khi nâng đồng bộ broker/worker/catalog, worker claim trước inference, renew trước submit, STOP/failure release token của mình; lease stale bị chặn và dừng worker. Không tự restart broker OAuth memory để áp dụng bản này.

## Nghiệm thu bắt buộc

- OAuth thật, token verified và scope plan; không dùng trạng thái MCP để báo worker connected.
- Model của tài khoản; analyze và compose thật về Chrome, đối chiếu exact URL.
- STOP khi inference; ngân sách/quota/revoke phải dừng không phát sinh gửi.
- Restart giữ host/client/account/model/ngân sách, refresh đúng, không dùng lại code.
- Sau đó mới launcher/service và Facebook cap1. Chưa tự join/đăng hàng loạt.

## Tài liệu OpenAI đã đối chiếu

- [Đăng ký và đăng nhập](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [Models và inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Accounts và refresh](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
- [Giới hạn preview](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [Lỗi và phục hồi](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery)
