# Quyết định kỹ thuật

- **ADR001 — Nguyên link:** lưu raw input, chỉ dùng URL để validate; job/report lưu snapshot. App gắn URL. Không đổi link để đo click.
- **ADR002 — Chrome giữ quyền gửi:** Facebook token/cookie không qua MCP. Tools chỉ compose. Thêm remote publish sẽ mở rộng quyền, cần thiết kế và nghiệm thu riêng.
- **ADR003 — ChatGPT mặc định:** không cần AI API key; API cũ tùy chọn. MCP là tool server, cần phiên ChatGPT hoạt động. Không dùng private API/cookie.
- **ADR004 — HTTP và stdio:** SDK1.32.1, Zod4, Streamable HTTP stateless JSON, structured output và pagination. Stdio proxy cùng broker.
- **ADR005 — Kho task cá nhân:** serialize và temp+rename; chống trùng bằng key/fingerprint. Không chạy hai broker cùng data directory. M6 bổ sung lock/retention/recovery.
- **ADR006 — OAuth:** không expose task theo kiểu no-auth; SDK kiểm tra PKCE, provider ràng buộc callback/resource; owner consent. Memory tokens và Quick Tunnel dành thử nghiệm.
- **ADR007 — Facebook DOM:** adapter nhóm thử nghiệm, có pending/manual/uncertain, không retry mù, không cuộn vô hạn hoặc vượt kiểm tra tài khoản.
- **ADR008 — Click có nguồn:** báo cáo nhập tay theo link/kỳ; không cộng kỳ chồng lấn hoặc gán theo bài. API nhà cung cấp chỉ thêm khi có hợp đồng dữ liệu/quyền.
- **ADR009 — UI:** giữ bảng màu/font hiện tại; Home ba bước, ChatGPT trước API nâng cao, bảng thống kê có ngữ cảnh; không số liệu giả.
