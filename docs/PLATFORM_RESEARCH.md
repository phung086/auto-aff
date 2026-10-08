# Nghiên cứu nền tảng và affiliate

Kiểm tra 09/10/2026. Chỉ nguồn chính thức; quyết định thiết kế ghi riêng. Không chứng nhận account đủ quyền hay hứa hoa hồng.

## Facebook / Meta

Đã thử [Graph API v19 changelog](https://developers.facebook.com/docs/graph-api/changelog/version19.0/) và [Page posts](https://developers.facebook.com/docs/pages-api/posts/); lần này 429/lỗi fetch nên chưa xác minh lại nội dung hiện hành. Không dùng blog bên thứ ba để hứa Groups/feed API hoạt động. L074/L043 cần tài liệu và quyền thật.

**Thiết kế:** read/draft/publish là capability riêng; login/nhóm cho quảng cáo không tự tạo quyền API/automation. Page publisher experimental tới khi đúng scope/token và live evidence. Group/feed reader cần quyền truy cập, identity, bố cục thật; fallback gợi ý/bản thảo. Không auto-comment hàng loạt trên feed bất kỳ hoặc join nhóm chưa chọn.

## TikTok Shop Việt Nam

[Affiliate Link Programme, applies to Vietnam](https://seller-vn.tiktok.com/university/essay?knowledge_id=8659790494680849&lang=en) mô tả link sản phẩm/cửa hàng/campaign, hoa hồng đơn hoàn tất; hủy/trả không đủ điều kiện. Linkshare và creator có điều kiện khác nhau; kiểm tra account VN, không sao chép yêu cầu Mỹ.

**Thiết kế:** link chính thức do owner tạo, metadata có nguồn, nội dung gốc, report order/refund. Không suy link AgentShop thành product anchor. Chưa có quyền API report cho LinkDesk, không đoán endpoint nội bộ.

## TikTok Content Posting API

[Direct Post setup](https://developers.tiktok.com/docs/en/content-posting-api-get-started) yêu cầu app/user cấp video.publish; client chưa audit chỉ private. [Content Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines) không chấp nhận utility chỉ phục vụ tài khoản nội bộ của cá nhân/nhóm; yêu cầu preview, user chọn privacy, consent upload và disclosure thương mại.

**Thiết kế:** L092 là gate intended-use/app review trước publisher; không hứa tool nội bộ được chấp thuận. Nếu không phù hợp, xuất bản thảo/media để owner dùng luồng chính thức. Không bypass audit/giả app công khai; API này không tạo quyền đọc For You feed hay tự comment.

## Shopee Việt Nam

[Giới thiệu affiliate](https://help.shopee.vn/portal/10/article/123035): nội dung/link → click → đơn thanh toán thành công. [Ghi nhận hoa hồng](https://help.shopee.vn/portal/10/article/122941?seo=1) phân biệt chương trình/XTRA và điều kiện link/sản phẩm/thời gian ưu đãi. Tỷ lệ/điều kiện lấy từ chương trình/account hiện hành, không hardcode mọi campaign.

**Thiết kế:** Shopee là adapter nhà cung cấp/link/report trước, không phải đi bình luận. Owner cấp link và export được phép. Bắt đầu CSV preview mapping/dedupe; API chỉ có tài liệu/quyền cụ thể. Không nhận giấy tờ identity/tax hay tự đăng ký affiliate trong heartbeat.

## AgentShop247

Đã thử đúng `https://agentshop247.com/?ref=AS362560C5A713` nhưng fetch lỗi; đọc bổ sung [danh mục sản phẩm](https://agentshop247.com/products) được. Mô tả/giá/bảo hành là lời bên bán; danh mục nêu bán lẻ độc lập. Không suy điều kiện gói cụ thể từ danh mục chung. URL danh mục chỉ là nguồn đọc; campaign luôn giữ nguyên link người dùng cấp.

| Adapter | Việc có thể xây trước | Gate |
|---|---|---|
| AgentShop | Nguồn/campaign/raw link/draft | Analytics export/API và điều kiện gói |
| Facebook | Source scope/candidate/fixture | Truy cập được phép, account/Page scope, live evidence |
| TikTok Shop VN | Link/campaign/report refund | Quyền chương trình và data/API chính thức |
| TikTok Direct Post | Research/preview/export media | Intended use, review/audit/scope/consent UX |
| Shopee VN | Link/campaign/CSV đối soát | Chương trình/export/schema/API được cấp |

Capability lưu market/sourceUrl/verifiedAt/requiredScopes/evidence/status: unknown, draft-only, awaiting-permission, verified, disabled. Release đổi adapter phải kiểm tra lại nguồn; kết quả search không tự bật quyền.
