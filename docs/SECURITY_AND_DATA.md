# Dữ liệu và bảo vệ quyền

Extension storage.local chứa campaign, đích, job và báo cáo. Storage.session chứa Page token, API key tùy chọn và pairing token. GET, backup và CSV không trả token. Broker lưu source, ngữ cảnh và body task; secrets riêng trong `.linkdesk-data` đã gitignore.

Ngữ cảnh được gửi tới ChatGPT khi dùng plugin; chỉ lấy phần cần biên soạn. Không thu thập cookie/mật khẩu Facebook. Không có pixel, telemetry hoặc analytics gửi ra ngoài.

Device API chỉ loopback, cần Bearer và Host127.0.0.1. Tunnel chỉ expose port8790 có OAuth, không expose port8787 hoặc cả workspace. OAuth có PKCE, callback/client/resource binding và consent bằng owner code. Sessions trong bộ nhớ; restart thu hồi token. Cấu hình này phục vụ một chủ sở hữu, chưa là OAuth production nhiều người dùng.

Website/Facebook là dữ liệu không đáng tin, không có quyền thay link hay mở quyền. Không bỏ OAuth/CSP/DNS-rebind guard để dễ kết nối. Không vượt CAPTCHA/checkpoint hoặc xoay tài khoản để né kiểm tra.

Repo public do chủ dự án yêu cầu. Affiliate URL công khai; task data và credentials riêng tư. Không commit runtime, .env, token, pairing file, owner code, log hoặc backup cá nhân. Sao lưu extension trước khi nâng cấp. Broker chưa có retention tự động; không âm thầm xóa dữ liệu. M6 cần keychain, retention, revoke device/client và single-process lock.

Font Be Vietnam Pro có OFL trong extension/fonts. Chưa cấp thêm giấy phép nguồn mở cho code thay chủ dự án; không tự gắn MIT. Plugin chưa nộp public directory.
