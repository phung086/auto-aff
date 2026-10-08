# Kiểm chứng LinkDesk 0.2.0

Ngày08/10/2026. Phân biệt local tests và tích hợp tài khoản thật.

## Đã kiểm chứng

- Link raw/snapshot/URL phụ, approve/backup/CSV; Page API mock, claim tránh gửi đồng thời, interrupted publishing/uncertain, cap và STOP khi chờ ChatGPT không cần AI key.
- Broker concurrency/dedupe, input khác cùng key, reload/persistence, expiry/cancel, kết quả idempotent, URL AI bị chặn, analyze giữ link.
- Device token/Host guard; pairing chỉ loopback/token header/không redirect.
- MCP SDK initialize/list/call qua in-memory và HTTP stateless; schema/output/pagination. OAuth consent, PKCE sai, code một lần, revoke.
- Report sai link/ngày/số âm bị chặn, dedupe, backup giữ snapshot khi campaign đổi.
- HTTPS protected-resource metadata trả200; MCP chưa xác thực trả401. Chưa chứng minh ChatGPT account đã kết nối.
- UI Home, ChatGPT mặc định/API nâng cao, stats thiếu click rõ, SUPER_PLAN HTML; desktop và khung390px qua browser preview. Preview không gọi AI/Facebook.
- Fixture0.1 từng kiểm tra điền/gửi một lần trên trang mô phỏng, không Facebook thật.

Gate release: `npm test`, `npm run check`; CI trong .github/workflows/ci.yml. Evaluation10 câu có dataset mô phỏng cố định và test đáp án, chưa chạy model evaluation trên ChatGPT thật.

## Chưa nghiệm thu

ChatGPT Plus/plugin thật, extension trong Chrome profile người dùng, Facebook join/comment/Page, Page quyền/token và supplier API click/conversion/commission. Browser hiện có dừng ở challenge ChatGPT, không Chrome profile được kết nối. Không vượt challenge hoặc đọc cookie.

## Giới hạn

Quick Tunnel hostname tạm; auth memory/restart/24h không refresh. Broker single-process, cap5000task, chưa retention/lock. Reload dashboard mất handle manual (L012), task vẫn trên broker. Facebook DOM có thể đổi, uncertain không retry. Chrome/broker/phiên ChatGPT phải hoạt động. Chưa launcher/host production/Chrome Web Store.
