# Thiết lập thật hiện tại

08/10/2026. Ngrok account domain đang nối broker127.0.0.1:8790; metadata HTTPS200. Chrome extension0.2.0 đã ghép local, Plus đang đăng nhập.

Custom MCP **LinkDesk ngrok** đã tạo/consent, Primary connected. Trò chuyện **Xử lý campaign task** đã đọc và submit một analyze thật từ extension. Broker completed và exact URL https://agentshop247.com/?ref=AS362560C5A713. Không suy account status từ health.chatgptVerified vì field đó còn hardcode false. Còn user xác nhận nhận/lưu campaign và một compose về Chrome.

Bốn custom MCP Cloudflare cũ đã gỡ; portable LinkDesk cũng gỡ bằng công cụ quản lý plugin. Source/docs vẫn giữ. Chỉ dùng bản ngrok cho kết nối web; không tạo bản trùng khi lỗi runtime.

AI tự động mới: npm run ai:worker, localhost8791. Tài khoản worker chưa OAuth; POST /login bị Chrome ERR_BLOCKED_BY_CLIENT cả thao tác agent và người dùng. Không bypass/đổi profile/đọc cookies. Chủ máy giải quyết truy cập rồi theo AUTO_AI_SETUP cấp quyền plan tại OpenAI, kiểm tra models và một inference completed. MCP connected không cấp quyền này.

Không restart broker tùy tiện vì OAuth MCP vẫn memory. Host giữ được qua ngrok nhưng token có thể mất sau restart/24h; L060 vẫn mở. Worker có refresh/persistence riêng, L014 live vẫn mở. Worker lỗi/quota tự dừng, không giả success.

Facebook chưa live: cần target được phép cụ thể, cap1, đối chiếu exact link và STOP. Không đăng chỉ để test. Click phải có báo cáo nhà cung cấp.
