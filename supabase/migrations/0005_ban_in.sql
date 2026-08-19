-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam Duyệt Chi — Bản in phiếu ĐNTT (mẫu MKT-01)              ║
-- ║  Chạy SAU 0004_phan_cong.sql                                   ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Quy trình thật: nhân viên nhập liệu trên app → mở màn hình in → in ra
-- phiếu đã có sẵn tên trưởng bộ phận ở ô ký → ký tay → mang bản giấy xuống
-- phòng kế toán → kế toán mở app đối chiếu và duyệt.
--
-- Nên trong app KHÔNG có bước trưởng bộ phận duyệt: chữ ký đó nằm trên giấy.
-- Bản in vẫn là căn cứ lưu trữ bản cứng.

-- ── Tên trưởng bộ phận in ở ô ký ───────────────────────────────
alter table public.departments add column if not exists head_name text;

comment on column public.departments.head_name is
  'Tên trưởng bộ phận in sẵn ở ô ký trên phiếu ĐNTT. Không liên quan tới phân quyền.';

-- ── Tắt bước trưởng bộ phận duyệt trong app ────────────────────
-- Giữ nguyên cột requires_head_approval để bật lại được nếu sau này công ty
-- muốn ký điện tử thay cho ký giấy.
update public.departments set requires_head_approval = false where requires_head_approval;

-- ── Những dòng chữ cố định trên phiếu ──────────────────────────
insert into public.settings (key, value, description) values
  ('THANH_PHO', 'Hà Nội',
   'Địa danh đứng trước ngày tháng trên phiếu ĐNTT'),
  ('KINH_GUI', 'Ban Giám đốc Công ty Cổ phần The Famidoc Việt Nam',
   'Dòng "Kính gửi:" trên phiếu ĐNTT'),
  ('GHI_CHU_MAU_PHIEU', 'Ban hành kèm QT-PKT-01 của P.TCKT',
   'Chữ trong ngoặc sau mã mẫu, góc phải phiếu ĐNTT'),
  ('TEN_GIAM_DOC', '',
   'Tên in sẵn ở ô ký của giám đốc trên phiếu ĐNTT. Để trống thì ô đó bỏ trắng.')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
