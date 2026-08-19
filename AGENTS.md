<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:duyet-chi -->

# DrKam Duyệt Chi — quy ước dự án

Hệ thống nộp và duyệt Đề nghị thanh toán. Xem README.md để cài đặt, `docs/ke-hoach-v1.html`
để hiểu nghiệp vụ.

## Stack
Cùng bộ với dự án `DrKam_Management`: Next.js + Supabase + Tailwind + TypeScript.
**Không thêm ORM, không thêm thư viện UI.** SQL viết tay trong `supabase/migrations/`.

## Quy ước đặt tên
- **Bảng và cột trong cơ sở dữ liệu**: tiếng Anh, snake_case (`payment_requests`, `total_amount`).
- **Giá trị trạng thái và vai trò**: để nguyên tiếng Việt (`'Chờ kế toán viên'`, `'Kế toán trưởng'`)
  để đọc thẳng trong Table Editor của Supabase mà không phải tra bảng mã.
- **Tên hàm, biến, đường dẫn**: tiếng Việt không dấu (`layNguoiDangDangNhap`, `/bang-dieu-khien`).
- **Chú thích**: tiếng Việt.

## Nguyên tắc bắt buộc giữ
1. **Số tài khoản luôn là kiểu chữ.** Có ràng buộc `bank_accounts_number_not_scientific`
   chặn chuỗi dạng `E+`. Đây là lỗi đã làm hỏng ba số tài khoản trong file Excel cũ.
2. **Mọi thao tác ghi đi qua máy chủ** dùng `createAdminClient()`. RLS chỉ mở quyền đọc.
   Không mở policy ghi cho client, nếu không sẽ nhảy cóc được bước duyệt.
3. **Bảng `request_events` chỉ được thêm.** Không viết code sửa hay xóa nhật ký.
4. **Người đề nghị không có tài khoản.** Đừng thêm bước đăng nhập vào luồng nộp hồ sơ.
   Họ mở lại hồ sơ bằng `lookup_token`. Họ cũng **tự gõ tên** và chỉ chọn phòng ban —
   `payment_requests.requester_name` là nguồn sự thật, `requester_id` để trống.
5. Sửa SQL thì sửa cả `src/lib/supabase/types.ts` cho khớp.

## Kiểm tra trước khi xong
```bash
npm run kiem-tra && npm run lint && npm run kiem-tra-sql && npm run build
```

`npm run kiem-tra-sql` chạy toàn bộ file trong `supabase/` trên một PostgreSQL thật
(bản WASM) và thử vài tình huống nghiệp vụ. **Chạy lệnh này mỗi khi sửa SQL** — nó đã
bắt được lỗi thứ tự chạy file mà đọc code không thấy.

## Thứ tự chạy SQL
`0001_init.sql` → `0002_nop_ho_so.sql` → `0003_cap_tai_khoan.sql` →
`0004_phan_cong.sql` → `0005_ban_in.sql` → `0006_nguoi_de_nghi.sql` → `seed.sql`. Migration không tham chiếu được dữ liệu do seed
tạo ra; thứ gì cần dữ liệu seed thì đặt trong `seed.sql` (phòng ban, bộ đếm số BK…).

`supabase/tai-khoan-ke-toan.sql` **không phải migration** — là file điền-vào-chỗ-trống
để cấp tài khoản cho ban kế toán và phân công phòng ban. Chạy tay sau cùng, không nằm
trong `migrations/` nên `npm run kiem-tra-sql` bỏ qua.

## Vai trò và chức danh là hai thứ khác nhau
`profiles.roles` chỉ nhận bảy giá trị cố định và quyết định quyền trong luồng duyệt.
`profiles.job_title` là chức danh thật của công ty (`Kế toán đối soát`,
`Kế toán mua hàng`) — chỉ để hiển thị. Đừng phân quyền theo `job_title`.
<!-- END:duyet-chi -->
