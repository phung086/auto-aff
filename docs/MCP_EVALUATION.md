# Bộ đánh giá MCP chỉ đọc

Dataset cố định, giả lập: `scripts/eval-fixture.mjs`. Không phải lịch sử người dùng hay số liệu kinh doanh. Tạo dataset bằng `node scripts/eval-fixture.mjs --write`; chạy một broker riêng với LINKDESK_DATA_DIR trỏ `.linkdesk-data/evaluation` khi broker chính đã dừng, ghép client test đúng broker đó. Không dùng dataset này để chạy gửi Facebook.

`evaluation.xml` có10 câu độc lập, chỉ list/get/summary; mỗi câu cần lọc/phân trang và đối chiếu task. Dùng limit2 để kiểm tra paging. Các đáp án dựa trên fixture không đổi. Test xác minh các đáp án số liệu; đánh giá khả năng ChatGPT tự chọn tool còn chưa chạy trên tài khoản thật.

Không gọi submit trong bài đánh giá này. SDK behavior/OAuth tests là nhóm riêng trong tests/composer.test.mjs. Cần kiểm tra plugin thật theo L011 trước ghi model-evaluation passed.
