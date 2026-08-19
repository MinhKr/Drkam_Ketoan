-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam Duyệt Chi — Người đề nghị tự gõ tên                     ║
-- ║  Chạy SAU 0005_ban_in.sql                                      ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Ban đầu người nộp phải chọn tên mình từ danh sách nhân sự, nên hồ sơ trỏ
-- thẳng vào bảng staff. Công ty chốt bỏ cách đó: người nộp gõ tên mình và chỉ
-- chọn phòng ban từ danh sách. Lý do là danh sách nhân sự sáu phòng mới chưa có
-- ai khai, mà bắt khai đủ trước khi dùng được thì quá chậm.
--
-- Vậy requester_name mới là nguồn sự thật, requester_id thành tùy chọn.
-- Giữ lại cột để các hồ sơ cũ không mất liên kết.

alter table public.payment_requests alter column requester_id drop not null;

comment on column public.payment_requests.requester_id is
  'Chỉ có ở hồ sơ nộp theo cách cũ (chọn tên từ danh sách nhân sự). Hồ sơ mới để trống, xem requester_name.';

comment on column public.payment_requests.requester_name is
  'Tên người đề nghị, do chính họ gõ vào lúc nộp. Đây là tên in lên phiếu ĐNTT.';

notify pgrst, 'reload schema';
