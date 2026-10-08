# Kiểm chứng LinkDesk 0.2.0

Ngày08/10/2026. Phân biệt local tests và tích hợp tài khoản thật.

## Đã kiểm chứng

- Link raw/snapshot/URL phụ, approve/backup/CSV; Page API mock, claim tránh gửi đồng thời, interrupted publishing/uncertain, cap và STOP khi chờ ChatGPT không cần AI key.
- Broker concurrency/dedupe, input khác cùng key, reload/persistence, expiry/cancel, kết quả idempotent, URL AI bị chặn, analyze giữ link.
- Device token/Host guard; pairing chỉ loopback/token header/không redirect.
- MCP SDK initialize/list/call qua in-memory và HTTP stateless; schema/output/pagination. OAuth consent, PKCE sai, code một lần, revoke.
- OAuth hotfix: consent HTTP POST trả 303 về callback, Origin khác bị từ chối; CSP chỉ thêm origin của callback HTTPS đã đăng ký. Kiểm thử local cùng Chrome xác minh form self chặn callback khác origin, policy có callback cho phép tải trang đích. Chưa thay thế nghiệm thu OAuth tài khoản thật.
- OAuth 403 regression: trên cùng Chrome, fixture `qa/oauth-origin-fixture.mjs` tái hiện `no-referrer` làm POST gửi `Origin: null` và bị từ chối 403. Với `strict-origin`, POST gửi đúng origin, vượt kiểm tra nguồn gửi và callback sau redirect 303 tải thành công. Test HTTP khóa header mới và vẫn từ chối Origin null, thiếu hoặc khác origin; không nới CSRF guard. Broker thật đã restart để áp dụng bản sửa. Chủ tài khoản còn phải hoàn tất consent.
- Chẩn đoán runtime thật xác nhận nonce còn trong map, chưa hết hạn nhưng owner code trong file khác mã bộ nhớ. Code cũ tạo/ghi owner trước bind cổng; callback app.listen của Express 5 có thể trả lỗi vào callback và bị coi như thành công. Đã sửa startup lưu/dùng lại mã, chỉ tạo sau bind thành công, bắt listening/error, đóng socket khi startup thất bại. Ba tests startup dùng cổng chiếm thật xác minh không ghi đè/tạo mã khi bind lỗi, không để cổng device mở và restart giữ nguyên mã.
- Cầu nối thật chạy bản mới: DCR 201, authorize 200, mã sai trả 400 với lý do, mã đúng trả 303, PKCE/token 200 và SDK list đúng 4 tools. Token của client kiểm thử đã revoke. Đây là client kiểm thử riêng, chưa chứng minh tài khoản ChatGPT hoàn tất consent hoặc Chrome nhận bản thảo.
- Report sai link/ngày/số âm bị chặn, dedupe, backup giữ snapshot khi campaign đổi.
- HTTPS protected-resource metadata trả200; MCP chưa xác thực trả401. Chưa chứng minh ChatGPT account đã kết nối.
- Chrome cá nhân điều khiển được qua tiện ích ChatGPT chính thức, Plus đăng nhập sẵn. Form custom MCP đã tự nhận metadata OAuth, DCR, scope compose và resource đúng endpoint. Gói plugin riêng tư đã lưu trong tài khoản, nhưng upload gói không chứng minh kết nối MCP hoạt động.
- UI Home, ChatGPT mặc định/API nâng cao, stats thiếu click rõ, SUPER_PLAN HTML; desktop và khung390px qua browser preview. Preview không gọi AI/Facebook.
- Fixture0.1 từng kiểm tra điền/gửi một lần trên trang mô phỏng, không Facebook thật.

- Cấu hình stable tunnel: thiếu file mặc định giữ tương thích; file chỉ định thiếu hoặc JSON sai bị từ chối; named giữ origin và token chỉ đi bằng file path; URL tạm/IP/path/credentials bị chặn; external không spawn tunnel. Đây là kiểm thử cấu hình, chưa nghiệm thu Named Tunnel/DNS hoặc Windows service thật.

Gate release: **35 kiểm thử đã qua**, `npm run check` đã qua; CI trong .github/workflows/ci.yml chạy cho mỗi commit. Evaluation 10 câu có dataset mô phỏng cố định và test đáp án, chưa chạy model evaluation trên ChatGPT thật.

## Tài khoản thật và gián đoạn kết nối

Ngày 08/10/2026 đã kiểm tra trực tiếp trong cùng Chrome: trang chi tiết và Quản lý của **LinkDesk AI hiện tại** hiển thị **Tài khoản đã kết nối**, tài khoản Primary. Consent tài khoản thật đã hoàn tất. Tuy nhiên, cuộc trò chuyện **Kiểm tra LinkDesk AI** báo `Connection failed`. Khi kiểm tra máy, cổng 8787/8790 không có broker lắng nghe; đã khởi động lại tiến trình nền và tunnel. Quick Tunnel cấp hostname mới, trong khi app ChatGPT vẫn giữ URL cũ. OAuth client/token còn memory nên lần khôi phục này cần cấu hình endpoint và xác thực lại. Không coi nhãn account connected là bằng chứng tools còn truy cập được.

## Chưa nghiệm thu

Ngrok origin đã hoạt động: metadata HTTPS200, tài khoản LinkDesk ngrok Primary connected, ChatGPT hoàn tất analyze thật từ extension; broker completed và giữ exact URL. Chưa compose về extension.

Worker ChatGPT plan: ngày09/10 áp dụng PR #1, npm ci/40 tests/check qua. Chrome thật POST /auth/start, consent và callback thành công, đọc model tài khoản được; ERR_BLOCKED_BY_CLIENT không còn trong lượt này. Origin null/sai CSRF vẫn403; startup bind lỗi dọn lock mới, lock có sẵn giữ nguyên. GPT-6.1-Sol tự hoàn tất analyze và compose Page draft qua broker, đúng một exact URL; completedResult của extension nhận hai kết quả thật. Cap2 tự dừng. Restart giữ account/budget0 và đọc model không cần đăng nhập lại. **Ảnh chủ máy sau recovery xác nhận danh sách chiến dịch lưu/exact URL**; compose về UI, refresh/quota/STOP giữa inference thật và Windows startup còn chờ. Xem docs/WORKER_OAUTH_VERIFICATION.md; không tuyên bố toàn dự án tự chạy24/7.

Còn nghiệm thu compose về extension Chrome, Facebook join/comment/Page, Page quyền/token và supplier API click/conversion/commission. Consent đã có bằng chứng UI; kết nối công cụ sau gián đoạn chưa khôi phục. Ảnh người dùng cung cấp cho thấy extension LinkDesk 0.2.0 đã cài và đang bật. Extension đã ghép; broker nhận analyze thật, Danh sách chiến dịch đã lưu có bằng chứng ảnh chủ máy; compose về UI còn chờ. Không vượt challenge hoặc đọc cookie.

## Giới hạn

Regression09/10: task analyze do extension tạo dừng vì product>300. Prompt giới hạn ký tự + một lượt viết lại có budget + /status/GET_TASK báo lỗi đã sửa. Chính task78d3938f completed, product69 ký tự, exact URL và completedResult qua. 44 tests/check; ảnh chủ máy sau recovery xác nhận danh sách chiến dịch lưu/exact URL. Chưa xác định từng thẻ ứng với task nào. Chưa coi kiểm thử fallback/lỗi mock là đã nghiệm thu extension mới trên Chrome.

Quick Tunnel hostname tạm; auth memory/restart/24h không refresh. Broker single-process, cap5000task, chưa retention/lock. Reload dashboard mất handle manual (L012), task vẫn trên broker. Facebook DOM có thể đổi, uncertain không retry. Chrome/broker/phiên ChatGPT phải hoạt động. Chưa launcher/host production/Chrome Web Store.
