# M0 — Sao chép nguyên affiliate URL theo chiến dịch (r40)

Trạng thái: tính năng giao diện **chỉ sao chép theo thao tác bấm của người dùng**; chưa nghiệm thu trên Chrome thật, không đồng nghĩa được phép quảng cáo tại bất kỳ đích nào. Nhánh này dựa trên module `campaign-link-copy.mjs` và 5 tests của r39.

## Tiêu chí nghiệm thu

1. Mỗi thẻ chiến dịch đã lưu có nút **Sao chép nguyên link**. Chỉ lần bấm nút mới gọi Clipboard API, không gọi network/Facebook.
2. Đọc đúng chiến dịch theo ID duy nhất; ID thiếu/trùng, URL lỗi hoặc clipboard bị từ chối đều fail closed; không hiển thị thông báo thành công giả.
3. Sao chép raw string, giữ toàn bộ ký tự, thứ tự tham số và percent-encoding. URL gốc là `https://agentshop247.com/?ref=AS362560C5A713`.
4. Không sửa campaign, queued job snapshot, approvals, trạng thái đã gửi hoặc token; không phát sinh click/order giả.
5. Không biến tính năng sao chép thành quyền đăng. Chỉ chia sẻ nội dung đã gắn disclosure tại nguồn được cho phép.

## Kiểm chứng và giới hạn

`tests/campaign-link-copy.test.mjs` kiểm tra lookup và exact-link; `tests/campaign-link-clipboard.test.mjs` kiểm tra luồng clipboard, nhà cung cấp khác, lỗi và bất biến dữ liệu. Chạy `npm ci && npm test && npm run check && npm run package` trong checkout sạch, sau đó kiểm tra thủ công nút/cảnh báo trong Chrome, cả trường hợp clipboard bị chặn. Mock không chứng minh clipboard của Chrome thực tế.

Không cập nhật HANDOFF/BACKLOG/plan.json/WORK_REGISTRY từ nhánh cowork này: đó là nhóm docs-status do coordinator quản lý. PR cần được điều phối với PR #1 nếu đổi cùng dashboard.mjs. Không merge/deploy tự động.

**Rollback:** Gỡ import, nút và click-handler khỏi `extension/dashboard.mjs`; xóa `extension/campaign-link-clipboard.mjs`, các tests và tài liệu này. Không thay dữ liệu đang lưu.
