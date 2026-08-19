-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam Duyệt Chi — Cấp tài khoản ngay trên Supabase            ║
-- ║  Chạy SAU 0001 và 0002                                         ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Tạo user trong Authentication thôi thì CHƯA đăng nhập được: hệ thống
-- còn cần một dòng trong public.profiles để biết người đó giữ vai trò gì.
--
-- Hàm dưới đây làm nốt phần còn lại. Cách dùng:
--
--   Bước 1. Supabase Dashboard › Authentication › Users › Add user
--           Điền email + mật khẩu, BẬT "Auto Confirm User".
--
--   Bước 2. SQL Editor, chạy một dòng:
--
--     select public.cap_tai_khoan(
--       'linh@drkam.vn',                              -- email vừa tạo ở bước 1
--       'Hồ Diệu Linh',                               -- họ tên hiển thị
--       'KT',                                         -- mã phòng ban
--       array['Quản trị', 'Kế toán trưởng']           -- vai trò
--     );
--
-- Vai trò hợp lệ (chép đúng chữ, có dấu):
--   'Trưởng bộ phận'  'Kế toán viên'  'Kế toán tổng hợp'
--   'Kế toán trưởng'  'Kế toán ngân hàng'  'Giám đốc'  'Quản trị'
--
-- Gọi lại với cùng email sẽ CẬP NHẬT vai trò, không tạo trùng.

create or replace function public.cap_tai_khoan(
  p_email    text,
  p_ho_ten   text,
  p_ma_phong text,
  p_vai_tro  text[]
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid;
  v_phong_id uuid;
  v_staff_id uuid;
  v_da_co    boolean;
begin
  p_email := lower(trim(p_email));

  -- 1. Tìm user đã tạo ở Authentication
  select id into v_user_id from auth.users where lower(email) = p_email;
  if v_user_id is null then
    raise exception
      'Chưa có user nào mang email "%" trong Authentication. Vào Dashboard › Authentication › Users › Add user để tạo trước (nhớ bật Auto Confirm User).',
      p_email;
  end if;

  -- 2. Tìm phòng ban
  select id into v_phong_id from public.departments where code = upper(trim(p_ma_phong));
  if v_phong_id is null then
    raise exception
      'Không có phòng ban nào mã "%". Các mã đang có: %',
      p_ma_phong,
      (select string_agg(code, ', ' order by code) from public.departments);
  end if;

  -- 3. Vai trò phải hợp lệ
  if p_vai_tro is null or array_length(p_vai_tro, 1) is null then
    raise exception 'Phải chọn ít nhất một vai trò.';
  end if;
  if not (p_vai_tro <@ array[
    'Trưởng bộ phận','Kế toán viên','Kế toán tổng hợp',
    'Kế toán trưởng','Kế toán ngân hàng','Giám đốc','Quản trị'
  ]::text[]) then
    raise exception
      'Có vai trò không hợp lệ. Chỉ nhận: Trưởng bộ phận, Kế toán viên, Kế toán tổng hợp, Kế toán trưởng, Kế toán ngân hàng, Giám đốc, Quản trị.';
  end if;

  -- 4. Nhân sự: dùng lại dòng đã có nếu trùng tên trong cùng phòng
  select id into v_staff_id
    from public.staff
   where full_name = trim(p_ho_ten) and department_id = v_phong_id;

  if v_staff_id is null then
    insert into public.staff (full_name, email, department_id)
    values (trim(p_ho_ten), p_email, v_phong_id)
    returning id into v_staff_id;
  else
    update public.staff set email = coalesce(email, p_email) where id = v_staff_id;
  end if;

  -- 5. Hồ sơ phân quyền
  select exists(select 1 from public.profiles where id = v_user_id) into v_da_co;

  insert into public.profiles (id, staff_id, full_name, email, roles, department_id)
  values (v_user_id, v_staff_id, trim(p_ho_ten), p_email, p_vai_tro, v_phong_id)
  on conflict (id) do update
    set staff_id      = excluded.staff_id,
        full_name     = excluded.full_name,
        email         = excluded.email,
        roles         = excluded.roles,
        department_id = excluded.department_id,
        status        = 'Hoạt động';

  return case when v_da_co then 'Đã cập nhật tài khoản ' else 'Đã cấp tài khoản ' end
         || p_email || ' — ' || array_to_string(p_vai_tro, ', ');
end;
$$;

-- Chỉ chạy được từ SQL Editor. Không mở qua API cho ai cả —
-- nếu không thì bất kỳ ai cũng tự phong mình làm Quản trị.
revoke execute on function public.cap_tai_khoan(text, text, text, text[]) from public;

do $$
begin
  -- Hai role này chỉ có trên Supabase. Bọc lại để file vẫn chạy được
  -- trên PostgreSQL thường lúc kiểm tra bằng npm run kiem-tra-sql.
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.cap_tai_khoan(text, text, text, text[]) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.cap_tai_khoan(text, text, text, text[]) from authenticated;
  end if;
end $$;

notify pgrst, 'reload schema';
