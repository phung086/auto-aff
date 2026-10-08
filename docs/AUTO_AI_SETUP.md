# AI tự động dùng gói ChatGPT

08/10/2026. Worker tại máy đã có code và 40 tests/check; **chưa nghiệm thu inference bằng gói ChatGPT thật**. Chrome hiện báo ERR_BLOCKED_BY_CLIENT khi POST trang đăng nhập local, chủ máy thử cũng bị. Không tắt bảo vệ, đổi cookie hoặc dùng API riêng của ChatGPT để vượt lỗi.

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

Nếu Chrome báo ERR_BLOCKED_BY_CLIENT: đăng nhập chưa qua, không phải đã kết nối. Chủ máy cần kiểm tra chính sách trình duyệt/tiện ích chặn với người quản lý máy; không tự vô hiệu hóa bảo vệ. Sau khi truy cập trở lại phải nghiệm thu OAuth/model/inference thật.

## Vận hành và bảo vệ dữ liệu

Worker poll4 giây, một request/lần, inference timeout120 giây. Trừ số yêu cầu **trước** inference và persist; restart không tự nạp ngân sách. Lỗi/quota hoặc hết ngân sách dừng, không retry vô hạn hay chuyển API trả phí. STOP hủy request và chặn submit muộn. Ngắt tài khoản cố revoke OpenAI rồi xóa tokens tại máy, UI báo nếu chưa xác nhận revoke từ xa.

`server/chatgpt-plan.mjs`: state/nonce/PKCE, jose JWT/JWKS + issuer/audience/expiry, identity binding khi tái xác thực, scope plan, refresh serialize và rotating refresh token. Mỗi client/account record riêng; host ID ổn định. Tokens chỉ trong `.linkdesk-data/chatgpt/accounts.json`, không browser/log/Git. Thư mục Windows bỏ quyền kế thừa và cấp SID người dùng hiện tại; Unix0700/0600. Không đọc credentials/Codex auth/cookies của ứng dụng khác.

`server/plan-worker.mjs`: chỉ gửi nguồn/ngữ cảnh cần thiết tới OpenAI. AI không chọn ID, tạo URL, gọi công cụ hoặc gửi Facebook. Chỉ ghi khi stream có response.completed, JSON hợp lệ và task vẫn pending. Broker gắn nguyên link + nhãn tiếp thị. Hủy/hết hạn/đã hoàn tất không bị ghi đè.

worker.lock chặn hai worker cùng directory. Sau crash, xác minh đúng tiến trình đã dừng trước khi dọn lock; không tự xóa lock còn sống. Cross-client lease với nhiều phiên MCP thuộc L013: chỉ chạy một phương thức biên soạn trên cùng hàng đợi. Conflicting submit dừng worker, không ghi đè.

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
