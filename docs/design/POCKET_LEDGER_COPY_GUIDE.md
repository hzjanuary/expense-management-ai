# Pocket Ledger Copy Guide

Status: revised draft for TASK-UX-003A approval.

## Voice

Pocket Ledger speaks like a careful financial assistant:

- direct;
- calm;
- neutral;
- helpful;
- non-technical;
- not overly cheerful;
- no slang mirroring;
- no AI hype;
- no emoji by default.

The app should not imitate colloquial user phrasing. For example, if the user
types `hôm nay tao ăn hộp cơm gà 28k`, the UI should answer in neutral
Vietnamese and show `Cơm gà`, not repeat `tao`.

## Brand And Navigation

Brand name:

- `Pocket Ledger`

Primary navigation:

- `Tổng quan`
- `Giao dịch`
- `Ngân sách`
- `Trợ lý`
- `Cài đặt`

Use `Trợ lý` in navigation and page titles. Use `Trợ lý AI` only in explanatory
copy about local AI behavior, not as a primary product title.

## Preferred Terms

| Concept | User-facing copy |
| --- | --- |
| Current balance | `Số dư hiện tại` |
| Monthly income | `Thu tháng này` |
| Monthly expense | `Chi tháng này` |
| Budget | `Ngân sách` |
| Remaining budget | `Còn lại` |
| Recent transactions | `Giao dịch gần đây` |
| Export | `Xuất dữ liệu`, `Xuất CSV`, `Xuất JSON` |
| Soft delete | `Xóa giao dịch` |
| Clear AI history | `Xóa lịch sử AI` |
| Provider unavailable | `Trợ lý chưa sẵn sàng. Hãy kiểm tra Ollama trong Cài đặt.` |
| Draft | `Giao dịch dự thảo` or `Giao dịch nháp` |
| Confirm draft | `Xác nhận` |
| Edit draft | `Sửa` |
| Cancel draft | `Hủy` |
| Retry | `Thử lại` |
| No transactions | `Chưa có giao dịch` |
| No filtered results | `Không tìm thấy giao dịch` |
| No budget | `Chưa thiết lập ngân sách` |
| Loading | `Đang tải dữ liệu...` |

## Prohibited User-Facing Terms

Do not show these on normal product surfaces:

- `provider`
- `runtime`
- `ledger mutation`
- `intent`
- `query_scope`
- `spending_scope`
- `category_slug`
- `amount_minor`
- `transaction_type`
- `occurred_at_iso`
- `date_range`
- `missing_fields`
- `API unavailable`
- internal hostnames or container names
- stack traces
- raw provider output

Technical terms may appear in developer docs, troubleshooting docs, or advanced
settings descriptions only when they are necessary.

## Clarification Copy

Use friendly questions:

| Situation | Copy |
| --- | --- |
| Unknown action | `Mình chưa chắc đây có phải một giao dịch không. Bạn có thể nói rõ khoản thu hoặc chi không?` |
| Missing amount | `Khoản này có số tiền bao nhiêu?` |
| Missing category | `Khoản này thuộc nhóm chi tiêu nào?` |
| Missing period | `Bạn muốn xem chi tiêu trong khoảng thời gian nào?` |
| Ambiguous amount | `Mình thấy nhiều số tiền trong tin nhắn. Bạn muốn ghi số tiền nào?` |
| Unsupported request | `Mình chưa hỗ trợ yêu cầu này. Bạn có thể ghi giao dịch hoặc hỏi về chi tiêu, ngân sách.` |

## Financial Result Copy

Total spending:

```text
Tổng chi tiêu
Tháng này
28.000 ₫
1 giao dịch
```

Category spending:

```text
Chi tiêu theo danh mục
Ăn uống
28.000 ₫
1 giao dịch
```

Budget remaining:

```text
Ngân sách còn lại
Ăn uống
Đã chi 28.000 ₫
Còn lại 1.972.000 ₫
Còn trong ngân sách
```

Do not display raw category slugs such as `food` or `coffee`; map to Vietnamese
labels.

## Destructive Copy

Soft delete:

```text
Xóa giao dịch?
Giao dịch sẽ bị ẩn khỏi các danh sách đang dùng và số dư sẽ được tính lại từ dữ liệu đã lưu.
```

Clear AI history:

```text
Xóa lịch sử AI?
Lịch sử AI cục bộ sẽ được xóa. Giao dịch đã xác nhận, số dư và ngân sách vẫn được giữ nguyên.
```

Avoid claiming permanent erasure unless the backend contract actually does
that.

## Settings Copy

Local AI:

```text
Ollama là tùy chọn và đang tắt cho đến khi bạn cấu hình.
Mô hình: qwen3:4b-instruct.
```

Data reset:

```text
Dữ liệu được lưu trong Docker volume (SQLite).
Reset sẽ xóa toàn bộ dữ liệu cục bộ trên máy này.
```

## Tone Anti-Patterns

Avoid:

- `AI powered`;
- `siêu thông minh`;
- `phân tích thần tốc`;
- `chỉ cần nói chuyện như ChatGPT`;
- `đột phá`;
- `tự động tối ưu tài chính`;
- financial advice that sounds paternalistic.

Use plain product language instead:

- `Hỏi nhanh về chi tiêu`;
- `Ghi giao dịch`;
- `Theo dõi ngân sách`;
- `Dữ liệu lưu trên máy của bạn`.
