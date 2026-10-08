# Định nghĩa số liệu

| Số liệu | Nguồn | Ý nghĩa và giới hạn |
|---|---|---|
| Đã đăng qua API | ID trả về từ Page API | API nhận bài; chưa nói lượt xem/click |
| Đã thấy bình luận | DOM mới sau click | Quan sát adapter, chưa là xác minh API lâu dài |
| Bạn xác nhận đã gửi | Xác nhận thủ công | Tự khai, tách khỏi kết quả tự động |
| Cần kiểm tra | Gián đoạn/thiếu bằng chứng | Không tính thành công; không retry |
| Chờ gửi | draft/ready/publishing | Chưa tính là bài đã đăng |
| Click | Báo cáo supplier nhập thủ công | Theo nguyên link và kỳ; chưa API verified |

Không báo cáo nghĩa là chưa biết, không phải0. Không tính CTR khi thiếu impressions hoặc conversion khi thiếu orders. Không gán click link chung cho từng bài hoặc cộng các kỳ có thể chồng lấn. Ghi nguồn dashboard/file/nhà cung cấp và kỳ rõ ràng.

Nguyên affiliate URL là invariant, không đổi để tracking. Số lần sao chép, mở bài hoặc số job không phải lượt khách hàng click. CSV/API đối soát thuộc L051/L052.
