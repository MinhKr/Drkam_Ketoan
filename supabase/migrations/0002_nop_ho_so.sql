-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam Duyệt Chi — Giai đoạn 2: nộp hồ sơ                      ║
-- ║  Chạy SAU 0001_init.sql                                        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Bộ đếm số BK theo từng phòng ───────────────────────────────
-- Số BK giữ đúng cách đặt cũ: MKT/42. Đếm liên tục, không reset theo năm,
-- để số không bao giờ trùng lại.
create table if not exists public.request_counters (
  department_id uuid primary key references public.departments(id) on delete cascade,
  last_no       integer not null default 0
);

alter table public.request_counters enable row level security;

drop policy if exists request_counters_read on public.request_counters;
create policy request_counters_read on public.request_counters
  for select using (public.is_active_user());

drop policy if exists request_counters_admin_write on public.request_counters;
create policy request_counters_admin_write on public.request_counters
  for all using (public.is_admin()) with check (public.is_admin());

/**
 * Cấp số BK tiếp theo cho một phòng.
 *
 * Dùng insert … on conflict do update … returning nên hai người bấm Nộp
 * cùng lúc vẫn nhận hai số khác nhau — PostgreSQL tự khóa dòng.
 */
create or replace function public.next_request_code(p_department_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_no   integer;
begin
  select code into v_code from public.departments where id = p_department_id;
  if v_code is null then
    raise exception 'Không tìm thấy phòng ban';
  end if;

  insert into public.request_counters as rc (department_id, last_no)
  values (p_department_id, 1)
  on conflict (department_id)
    do update set last_no = rc.last_no + 1
  returning rc.last_no into v_no;

  return v_code || '/' || v_no;
end;
$$;

-- Bộ đếm khởi đầu cho từng phòng nằm trong supabase/seed.sql, vì lúc file
-- migration này chạy thì bảng departments còn trống.

-- ── Kho tệp: cho phép người nộp xem lại tệp của chính hồ sơ mình ─
-- Người đề nghị không đăng nhập nên không đọc thẳng kho tệp được.
-- Máy chủ cấp link ký sẵn có hạn giờ cho họ. Không cần policy cho anon.

-- ── Chỉ mục phục vụ tra cứu bằng mã ────────────────────────────
create index if not exists payment_requests_lookup_idx
  on public.payment_requests(lookup_token);

-- ── Nạp lại schema cache của PostgREST ─────────────────────────
-- Không có dòng này thì Supabase có thể mất vài phút mới nhận ra
-- bảng và hàm vừa tạo, gọi API sẽ báo "Could not find the table/function".
notify pgrst, 'reload schema';
