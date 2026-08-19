-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam Duyệt Chi — Tài khoản ban kế toán + phân công phòng ban  ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- CÁCH NHANH HƠN: chạy `npm run tao-tai-khoan` là xong hết, kể cả phần tạo
-- user trong Authentication. File này chỉ dùng khi muốn làm tay trên Dashboard.
--
-- Chạy SAU khi đã chạy 0001 → 0004 và seed.sql. Không phải migration.
-- Gọi lại lần nữa cũng không sao: hai hàm đều cập nhật chứ không tạo trùng.
--
-- ┌─ TRƯỚC KHI CHẠY ────────────────────────────────────────────┐
-- │ Dashboard › Authentication › Users › Add user, tạo bảy user │
-- │ dưới đây, mật khẩu 123456, BẬT "Auto Confirm User".         │
-- └─────────────────────────────────────────────────────────────┘
--
-- Tài khoản đặt theo BỘ PHẬN chứ không theo người: email là tên viết tắt của
-- bộ phận, tên hiển thị là tên bộ phận. Đổi người phụ trách không phải cấp lại
-- tài khoản — đổi lại thì nhật ký chỉ ghi được tên bộ phận, không ghi tên người.
--
-- Email bỏ dấu tiếng Việt vì hệ thống email không nhận chữ có dấu.

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  1. Ba bộ phận nhận hồ sơ đầu vào                              ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Vai trò (quyền trong luồng duyệt) khác với tên bộ phận. Kế toán đối soát và
-- kế toán mua hàng đều đóng vai "Kế toán viên" — người kiểm hồ sơ đầu tiên.

select public.cap_tai_khoan('ktds@drkam.vn', 'Kế toán đối soát',  'KT',
  array['Kế toán viên']);

-- Vừa nhận hồ sơ đầu vào của HCNS/KT/BGĐ, vừa là người chi tiền bước cuối.
select public.cap_tai_khoan('ktnh@drkam.vn', 'Kế toán ngân hàng', 'KT',
  array['Kế toán viên', 'Kế toán ngân hàng']);

select public.cap_tai_khoan('ktmh@drkam.vn', 'Kế toán mua hàng',  'KT',
  array['Kế toán viên']);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  2. Các cấp duyệt phía sau                                     ║
-- ╚══════════════════════════════════════════════════════════════╝
--
--     dưới 20 triệu  → Kế toán tổng hợp
--     từ 20 triệu    → Kế toán trưởng
--     trên 50 triệu  → thêm một bước Giám đốc
--     cuối cùng      → Kế toán ngân hàng chi tiền, tải ủy nhiệm chi lên

select public.cap_tai_khoan('ktth@drkam.vn', 'Kế toán tổng hợp',  'KT',
  array['Kế toán tổng hợp']);

select public.cap_tai_khoan('ktt@drkam.vn',  'Kế toán trưởng',    'KT',
  array['Kế toán trưởng']);

select public.cap_tai_khoan('gd@drkam.vn',   'Giám đốc',          'BGD',
  array['Giám đốc']);

select public.cap_tai_khoan('qt@drkam.vn',   'Quản trị hệ thống', 'KT',
  array['Quản trị']);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  3. Phòng nào gửi về bàn ai                                    ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Hồ sơ nộp lên tự chạy về đúng bộ phận, không ai phải chuyển tay. Phòng nào
-- chưa phân công thì người nộp bị chặn ngay lúc bấm nộp, kèm thông báo rõ.
--
-- Tham số thứ ba là người thay khi nghỉ — bỏ trống cũng được, thêm sau trong
-- Quản trị › Phân công.

select public.phan_cong('MKT',     'ktds@drkam.vn');  -- Marketing
select public.phan_cong('SALE',    'ktds@drkam.vn');  -- Sale online (chị Ly)

select public.phan_cong('HCNS',    'ktnh@drkam.vn');  -- Hành chính nhân sự
select public.phan_cong('KT',      'ktnh@drkam.vn');  -- Kế toán
select public.phan_cong('BGD',     'ktnh@drkam.vn');  -- Ban giám đốc

select public.phan_cong('KHO',     'ktmh@drkam.vn');  -- Kho
select public.phan_cong('SALEOFF', 'ktmh@drkam.vn');  -- Sale offline

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  4. Kiểm lại                                                   ║
-- ╚══════════════════════════════════════════════════════════════╝

select d.code                                        as ma_phong,
       d.name                                        as phong_ban,
       coalesce(p.full_name, '— CHƯA PHÂN CÔNG —')   as ke_toan_phu_trach,
       t.full_name                                   as thay_khi_nghi
  from public.departments d
  left join public.accountant_assignments a on a.department_id = d.id
  left join public.profiles p on p.id = a.accountant_id
  left join public.profiles t on t.id = a.backup_id
 where d.active
 order by d.sort_order;
