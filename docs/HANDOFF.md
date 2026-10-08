# Bàn giao LinkDesk / auto-aff

08/10/2026 · release0.2.0 · https://github.com/phung086/auto-aff.
Đọc AGENTS → SUPER_PLAN → BACKLOG → ARCHITECTURE → VALIDATION; nhánh AI mới đọc AUTO_AI_SETUP. npm ci, npm test, npm run check; package allowlist không runtime/secret.

## Trạng thái thật mới nhất

- Ngrok3.39.8 dùng account config sẵn có, inspector upstream127.0.0.1:8790; broker health và metadata HTTPS đúng ngrok. connection.json private mode external. Không còn chờ dừng broker Cloudflare cũ; không đọc authtoken. Domain gắn tài khoản, không cần Cloudflare/tên miền riêng.
- **LinkDesk ngrok** đã tạo trong Chrome cá nhân, chủ tài khoản consent. UI Primary connected. Trò chuyện **Xử lý campaign task** xử lý task analyze thật từ extension; broker xác nhận completed, campaign giữ đúng URL mặc định. Screenshot ngoài Git outputs/LinkDesk-ngrok-analyze-completed.png. Chưa có bằng chứng extension đã lưu campaign; chưa compose thật về extension.
- Bốn custom MCP cũ LinkDesk AI, 0.2, 0.2.0, hiện tại đã gỡ cài đặt qua UI; có thể thêm lại. Gói portable LinkDesk cũ cũng đã gỡ bằng công cụ quản lý plugin; danh mục ChatGPT sau reload chỉ còn LinkDesk ngrok. Không xóa vĩnh viễn apps/source/data.
- Worker localhost8791 áp dụng PR #1 trên nhánh cục bộ codex/test-worker-oauth; PR draft, chưa merge. Ngày09/10 chủ tài khoản consent, callback/model qua; GPT-6.1-Sol tự hoàn tất analyze và compose thật, exact URL và completedResult qua, cap2 tự dừng. Restart giữ account/budget0, đọc model không cần đăng nhập lại. **Chưa UI extension nhận/lưu, refresh/quota/STOP inference thật hoặc Windows startup.** Đã bật phiên chờ tối đa10 yêu cầu mới. 40 tests/check và lock/CSRF qua. Xem WORKER_OAUTH_VERIFICATION.

## Việc kế tiếp

Sự cố mới09/10: analyze từ nút extension đã tới broker nhưng AI trả product>300 làm worker dừng và dashboard chờ. Đã sửa prompt giới hạn ký tự, một lượt viết lại có tính budget, trạng thái lỗi loopback/GET_TASK. Chính task78d3938f đã completed, product69 ký tự/exact URL qua; UI nhận/lưu chờ chủ máy. 43 tests/check. Reload extension bản mới sau khi nhận/lưu, không restart broker. Xem WORKER_OAUTH_VERIFICATION.

1. Dọn cài đặt đã hoàn tất, chỉ giữ LinkDesk ngrok. Không tạo thêm bản trùng. Custom MCP gỡ trên web; portable cũ gỡ qua công cụ quản lý plugin và đã xác minh danh mục web.
2. OAuth/model/analyze/compose worker đã qua. Chủ máy kiểm tra nút Đọc link trong AI & nguồn để chứng minh giao diện extension nhận/lưu; công cụ browser không truy cập trang chrome-extension. Không cần API key/prompt ChatGPT khi worker bật.
3. Thử compose do extension tạo và nhận kết quả trong Chrome. Chỉ dùng một phương thức biên soạn cho cùng hàng đợi; cross-client lease chưa có (L013). Refresh/quota/STOP giữa inference thật chưa qua.
4. L012 manual handle reload; L060 OAuth MCP persistence/refresh; L061 supervision/startup. **MCP OAuth vẫn memory/24h/no refresh**; plan worker có persistence/refresh riêng.
5. L040/031/043 target cụ thể cho phép quảng cáo, cap1, Facebook evidence; không gửi thử hoặc coi mọi demo là nhu cầu mua.

## Hợp đồng và giới hạn

Exact URL https://agentshop247.com/?ref=AS362560C5A713; không normalize. AI không xuất URL; broker/extension gắn snapshot + nhãn Link tiếp thị liên kết. Không fake review/giá/official claims.

Device API127.0.0.1:8787 cần pairing Bearer; MCP8790 OAuth compose chỉ list/get/submit/summary, không publish; worker8791 loopback không tunnel, dùng cùng broker. Một broker/data directory; task expire30 phút, cap5000. Manual handle mất qua reload nên không refresh khi chờ.

Worker giới hạn1–50/phiên, persist ngân sách/enable, restart không cấp thêm; error/quota/STOP dừng. Lock chưa tự hồi crash, chưa Windows service. Facebook DOM thử nghiệm, uncertain không retry; click là báo cáo có nguồn, không suy từ bài.

## Sự cố đã sửa

OAuth Origin null từ no-referrer, CSP callback và303 đã sửa. Express5 startup bind thất bại từng gây mismatch mã file/memory; nay persisted owner code, đợi listening/error, bind thất bại không ghi đè, socket cleanup có tests. Runtime đã chuyển ngrok đúng. Không chạy broker thứ hai hay restart khi OAuth chưa persist.

Trước commit xác nhận toplevel source repo, không home Git. Chỉ stage code/docs; artifacts không runtime/secrets/log/node_modules. Live evidence và phần chờ phải ghi rõ, tests không chứng minh 24/7.
