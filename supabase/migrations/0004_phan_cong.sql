-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam Duyệt Chi — Chức danh + phân công bằng một dòng lệnh    ║
-- ║  Chạy SAU 0003_cap_tai_khoan.sql                               ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Hai việc file này thêm vào:
--
--   1. Cột "chức danh" cho hồ sơ người duyệt. Vai trò trong hệ thống chỉ có
--      bảy giá trị cố định (Kế toán viên, Kế toán trưởng…), nhưng chức danh
--      thật của công ty thì nhiều hơn: kế toán đối soát, kế toán mua hàng…
--      Vai trò quyết định QUYỀN, chức danh chỉ để hiển thị cho dễ nhận người.
--      Cần thiết vì công ty đang có hai người tên gần giống nhau.
--
--   2. Hàm public.phan_cong() — gán kế toán viên phụ trách cho một phòng ban
--      bằng email, khỏi phải đi copy UUID. Tương đương thao tác trong màn hình
--      Quản trị › Phân công, nhưng làm được ngay trên SQL Editor.
--
--        select public.phan_cong('MKT', 'phuonganh@drkam.vn');
--        select public.phan_cong('MKT', 'phuonganh@drkam.vn', 'dao@drkam.vn');
--                                                             ^ người thay khi nghỉ

-- ── 1. Chức danh ───────────────────────────────────────────────
alter table public.profiles add column if not exists job_title text;

comment on column public.profiles.job_title is
  'Chức danh thật của công ty, VD "Kế toán đối soát". Chỉ để hiển thị, không quyết định quyền.';

-- ── 2. cap_tai_khoan nhận thêm chức danh ───────────────────────
-- Bỏ bản cũ 4 tham số để không gọi nhầm giữa hai bản.
drop function if exists public.cap_tai_khoan(text, text, text, text[]);

create or replace function public.cap_tai_khoan(
  p_email     text,
  p_ho_ten    text,
  p_ma_phong  text,
  p_vai_tro   text[],
  p_chuc_danh text default null
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

  -- Tìm user đã tạo ở Authentication
  select id into v_user_id from auth.users where lower(email) = p_email;
  if v_user_id is null then
    raise exception
      'Chưa có user nào mang email "%" trong Authentication. Vào Dashboard › Authentication › Users › Add user để tạo trước (nhớ bật Auto Confirm User).',
      p_email;
  end if;

  -- Tìm phòng ban
  select id into v_phong_id from public.departments where code = upper(trim(p_ma_phong));
  if v_phong_id is null then
    raise exception
      'Không có phòng ban nào mã "%". Các mã đang có: %',
      p_ma_phong,
      (select string_agg(code, ', ' order by code) from public.departments);
  end if;

  -- Vai trò phải hợp lệ
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

  -- Nhân sự: dùng lại dòng đã có nếu trùng tên trong cùng phòng
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

  -- Hồ sơ phân quyền
  select exists(select 1 from public.profiles where id = v_user_id) into v_da_co;

  insert into public.profiles
    (id, staff_id, full_name, email, roles, department_id, job_title)
  values
    (v_user_id, v_staff_id, trim(p_ho_ten), p_email, p_vai_tro, v_phong_id,
     nullif(trim(coalesce(p_chuc_danh, '')), ''))
  on conflict (id) do update
    set staff_id      = excluded.staff_id,
        full_name     = excluded.full_name,
        email         = excluded.email,
        roles         = excluded.roles,
        department_id = excluded.department_id,
        job_title     = coalesce(excluded.job_title, public.profiles.job_title),
        status        = 'Hoạt động';

  return case when v_da_co then 'Đã cập nhật tài khoản ' else 'Đã cấp tài khoản ' end
         || p_email
         || coalesce(' (' || nullif(trim(coalesce(p_chuc_danh, '')), '') || ')', '')
         || ' — ' || array_to_string(p_vai_tro, ', ');
end;
$$;

-- ── 3. Phân công kế toán viên phụ trách phòng ban ──────────────
create or replace function public.phan_cong(
  p_ma_phong       text,
  p_email          text,
  p_email_du_phong text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phong_id  uuid;
  v_phong_ten text;
  v_ke_toan   public.profiles%rowtype;
  v_du_phong  public.profiles%rowtype;
begin
  select id, name into v_phong_id, v_phong_ten
    from public.departments where code = upper(trim(p_ma_phong));
  if v_phong_id is null then
    raise exception
      'Không có phòng ban nào mã "%". Các mã đang có: %',
      p_ma_phong,
      (select string_agg(code, ', ' order by code) from public.departments);
  end if;

  select * into v_ke_toan from public.profiles where lower(email) = lower(trim(p_email));
  if v_ke_toan.id is null then
    raise exception
      'Chưa có tài khoản nào mang email "%". Cấp bằng public.cap_tai_khoan() trước đã.',
      p_email;
  end if;
  if not ('Kế toán viên' = any(v_ke_toan.roles)) then
    raise exception
      'Tài khoản % không có vai trò "Kế toán viên" nên không nhận hồ sơ đầu vào được. Vai trò hiện tại: %.',
      p_email, array_to_string(v_ke_toan.roles, ', ');
  end if;

  if nullif(trim(coalesce(p_email_du_phong, '')), '') is not null then
    select * into v_du_phong
      from public.profiles where lower(email) = lower(trim(p_email_du_phong));
    if v_du_phong.id is null then
      raise exception 'Chưa có tài khoản nào mang email "%" để làm người thay.', p_email_du_phong;
    end if;
    if v_du_phong.id = v_ke_toan.id then
      raise exception 'Người thay phải khác người phụ trách.';
    end if;
  end if;

  insert into public.accountant_assignments (department_id, accountant_id, backup_id)
  values (v_phong_id, v_ke_toan.id, v_du_phong.id)
  on conflict (department_id) do update
    set accountant_id = excluded.accountant_id,
        backup_id     = excluded.backup_id;

  return v_phong_ten || ' (' || upper(trim(p_ma_phong)) || ') → ' || v_ke_toan.full_name
         || coalesce(', thay khi nghỉ: ' || v_du_phong.full_name, '');
end;
$$;

-- ── 4. Khóa lại, chỉ chạy được từ SQL Editor ───────────────────
revoke execute on function public.cap_tai_khoan(text, text, text, text[], text) from public;
revoke execute on function public.phan_cong(text, text, text) from public;

do $$
begin
  -- Hai role này chỉ có trên Supabase. Bọc lại để file vẫn chạy được
  -- trên PostgreSQL thường lúc kiểm tra bằng npm run kiem-tra-sql.
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.cap_tai_khoan(text, text, text, text[], text) from anon;
    revoke execute on function public.phan_cong(text, text, text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.cap_tai_khoan(text, text, text, text[], text) from authenticated;
    revoke execute on function public.phan_cong(text, text, text) from authenticated;
  end if;
  -- service_role thì cho, để script npm run tao-tai-khoan gọi được. Khóa này
  -- chỉ nằm phía máy chủ và vốn đã ghi thẳng vào mọi bảng, nên không mở thêm
  -- rủi ro nào cả.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.cap_tai_khoan(text, text, text, text[], text) to service_role;
    grant execute on function public.phan_cong(text, text, text) to service_role;
  end if;
end $$;

notify pgrst, 'reload schema';
