# Ticket kế hoạch 2.0

09/10/2026. BACKLOG/plan.json là trạng thái chung; dưới đây là dependency, ownership, acceptance và rollback. Planned không phải quyền live.

## G0 — AI và recovery

| ID | Phụ thuộc / vùng | Acceptance và negative case | Rollback |
|---|---|---|---|
| L013 | L010; server-tasks | Lease owner/token/expiry; worker/MCP tranh task chỉ một submit; reject stale/cancelled lease; test crash/clock/concurrency/idempotence. Lease AI không retry publish | Single-consumer flag; migration không xóa task |
| L012 | L013; extension-runner | Handle lưu trước poll; reload nhận cùng task; cancel/failed/completed mở khóa UI; URL/account/campaign match; late response/duplicate click tests | Tắt resume, giữ recovery read-only |
| L022 | L014/L012; UI | Local/MCP/worker-auth/model/running riêng; health hardcode không thành false disconnected; test budget0/no model/stopped | Trạng thái riêng, không tự bật worker |
| L011/L014 | Code hiện có; live | Extension analyze/compose về UI exact link; STOP/quota/refresh thật có evidence | STOP, giữ task, không restart broker |

## G1 — Discovery

| ID | Phụ thuộc / vùng | Acceptance và negative case | Rollback |
|---|---|---|---|
| L071 | M0; model | SourceScope/account capability/rules/expiry; restore không cấp publish/token. Tên nhóm không tạo quyền | Additive migration, scope mới disabled |
| L072 | L071/L013; discovery | Candidate ID/cursor/dedupe; đọc cùng bài hai lượt chỉ một candidate; thiếu identity không publish | Discovery flag off, queue giữ nguyên |
| L073 | L072/L042; discovery/AI contract | KEYWORD_DISCOVERY: entity/alias Unicode, generic ai/API, Cursor CSS/Gemini hoàng đạo; context/intent/campaign router và reason evidence. 18 acceptance examples chưa chạy classifier; triển khai test/confusion counts, không keyword→publish | Deterministic/review-only khi AI lỗi |
| L074 | L072 + platform permission gate; discovery | Bounded reader/cursor/STOP/layout-change; 20 bài/10 phút/5 drafts là limit đề xuất; live chỉ có quyền đọc | Reader disabled, fallback bản thảo |
| L075 | L012/L022/L073; UI | Source chọn một lần, keyword chips/alias/test đoạn văn, permalink tự tìm, reasons/preview/STOP/recovery; keyword/entity theo campaign và không nhập từng post URL | Hide experimental tab, giữ campaign/job |

## G2–G4 — Gửi, account, vận hành, số liệu

L040/L041/L043 giữ tiêu chuẩn cap1/evidence theo ACCEPTANCE, phụ thuộc G0 và candidate approved/quyền adapter. Account/content/rules đổi cần duyệt lại; uncertain không retry. Rollback: publisher off, history giữ để đối chiếu.

| ID | Phụ thuộc / vùng | Acceptance và negative case | Rollback |
|---|---|---|---|
| L080 | L071; model | AccountRef/private credentialRef; scope/approval/account binding; chuyển account vô hiệu approval, không gửi chéo/copy cookie | Multiaccount off, account đơn vẫn dùng |
| L081 | L080/L013; runner | Account cap/quota/STOP/name trước gửi; trùng campaign/post liên account bị chặn, không đổi account khi bị block | Dừng phiên mới, không cấp budget |
| L060 | OAuth hiện có; auth | Persistence/refresh/revoke MCP; restart giữ quyền hợp lệ; expired/revoked bị từ chối | Backup migration, không auth-none fallback |
| L061/L062 | L060/L013; scripts | Windows single process/crash/disk-full/STOP, startup rõ; restore không bật gửi | Gỡ startup dự án, giữ data/backups |
| L051 | M5; report | CSV preview/mapping/source/period/raw link; file/kỳ trùng không cộng; missing clicks null | Undo staged import batch |
| L082 | L051; report | Order/refund/commission/currency/source; pending/confirmed riêng, overlap đối soát; không suy per-post | Version reports, raw imports private |

## G5 — Nền tảng

| ID | Phụ thuộc / vùng | Acceptance và negative case | Rollback |
|---|---|---|---|
| L070 | G0 contracts; adapter contract | Capability read/analyze/draft/publish/report; unknown disabled; không đổi exact-link core | Adapter disabled mặc định |
| L090 | L070/L051; Shopee riêng | Owner link + report sample được phép; mapping/expiry/refunds/schema; không có API quyền → CSV-only | Disable adapter, giữ raw link |
| L091 | L070/L082; TikTok Shop riêng | Market VN, chương trình/link/điều kiện xác minh; order hợp lệ, link ngoài không thành anchor | Draft/report-only |
| L092 | Intended-use gate; TikTok publisher | Đánh giá use case trước code publish; hợp lệ mới scope/audit/creator_info/privacy/consent/disclosure/status. Nội bộ không phù hợp → publisher blocked | Export content, publisher disabled |

PR cần ownership/checks thực chạy/gate/rollback. Mock chỉ đóng done-code; không đóng L040/L043/L074/L092 là verified bằng fixture. Coordinator cập nhật docs trạng thái, cowork ghi evidence trong PR.
