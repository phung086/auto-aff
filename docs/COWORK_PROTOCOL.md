# Quy tắc phối hợp AI

09/10/2026. Mọi cowork đọc trước khi sửa; hiện chưa có bộ điều phối tự động bảo đảm khóa file.

## Nhận việc

1. Xác nhận git toplevel/branch/HEAD/status. Không stage repo tổ tiên tại home.
2. Đọc HANDOFF/SUPER_PLAN/BACKLOG/plan.json/WORK_REGISTRY và ticket card; chọn một ticket đủ dependency.
3. Mỗi AI dùng một worktree/branch `codex/<ticket>-<purpose>` riêng. Không switch checkout AI khác hoặc checkout đang chạy runtime.
4. Ghi owner/base/files/contract/validation/rollback trong PR. Registry công khai do coordinator cập nhật, cowork không tranh ghi.
5. Nhận khóa local trước sửa. File đang có owner → làm module độc lập; cần contract vùng khác thì phối hợp trước.

Worktree tách file vật lý, không tách ports/runtime và không tránh mọi merge conflict. Không restart broker/ngrok/Chrome, kill process hay chạy broker thứ hai trên data directory thật để làm docs/tests. Tests dùng fixture/data tạm; không đọc secret production.

## Khóa local dùng chung worktree

Coordinator lấy Git common directory bằng `git rev-parse --path-format=absolute --git-common-dir`, đặt khóa dưới `linkdesk-cowork/` tại đó, không commit. Lock groups: server-tasks, server-auth, extension-model, extension-runner, extension-discovery, extension-ui, docs-status, platform-research.

Nhận khóa bằng tạo file nguyên tử `FileMode.CreateNew`; không check-then-write. JSON khóa chứa owner/task/worktree/baseCommit/createdAt/expectedFiles. Cần nhiều khóa thì lấy theo tên tăng dần; một khóa thất bại phải thả khóa mình vừa lấy, chọn việc khác. Chỉ owner thả khóa sau đối chiếu. Hết thời gian không tự được chiếm khóa; stale/crash cần coordinator xác minh, không kill hoặc overwrite.

Đây là giao thức phối hợp chưa có CLI tự động. L013 worker/MCP lease không thay khóa phát triển. Nếu không thực hiện được khóa, chỉ dùng worktree riêng và PR không chạm file đang được giữ; không tuyên bố quyền sửa độc quyền.

| Vùng | File chính | Điểm phối hợp |
|---|---|---|
| server-tasks | server/store.mjs, schemas/task tests | Contract với worker/composer |
| server-auth | OAuth/chatgpt-plan, scripts connect/worker | Không đổi phiên/quyền thật khi làm code |
| extension-model | model.mjs, backup/report reducers | Một owner; adapters dùng contract |
| extension-discovery | browser.mjs, discovery module/fixtures | Không sửa UI/runner ngoài scope |
| extension-runner | background.js, publisher adapters | Claim/STOP/uncertain/account quyền |
| extension-ui | dashboard.*, style.css | Theo DESIGN và schema đã thống nhất |
| docs-status | HANDOFF/BACKLOG/plan/registry/VALIDATION/SUPER_PLAN | Coordinator hợp nhất evidence |
| platform-research | Nghiên cứu nền tảng/adapter docs riêng | Source/market/date/quyền, không bật runtime |

## Bàn giao và merge

PR ghi problem/behavior, ownership, base/dependency, validation, gate live và rollback. Push nhánh, không force-push, tự merge hoặc deploy qua heartbeat. Coordinator hợp nhất từng PR theo dependency và kiểm chứng tích hợp. PR có base chưa merge phải nêu rõ và retarget sau khi base merge.

Trạng thái: planned → ready → claimed → in-progress → review → done-code → awaiting-live → verified; docs-only không cần live, publisher thì có. Thiếu tài khoản/quyền giữ live gate mở, chọn việc độc lập. Không reset/stash/xóa dữ liệu thay cowork.

Bàn giao mỗi lượt: ticket/owner/branch/base/files; đã đổi gì; kiểm chứng thực chạy; giới hạn; dependency; rollback; bước kế tiếp. Giải phóng khóa sau commit và lưu bàn giao. WORK_REGISTRY không thay Git history hoặc khóa nguyên tử. Không nhắn task khác nếu chưa được chủ máy cho phép; docs/PR là điểm bàn giao mặc định.
