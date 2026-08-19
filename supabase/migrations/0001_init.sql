-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam Duyệt Chi — Schema khởi tạo (Supabase / PostgreSQL)     ║
-- ║  Chạy trong: Supabase Dashboard > SQL Editor                   ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Nguyên tắc phân quyền của file này:
--   • Người đề nghị KHÔNG có tài khoản → mọi thao tác của họ đi qua
--     route phía máy chủ dùng service_role key, không chạm trực tiếp vào DB.
--   • Người duyệt (kế toán, trưởng bộ phận, giám đốc) đăng nhập bằng Supabase Auth.
--   • RLS chỉ mở quyền ĐỌC cho người đã đăng nhập. Mọi thao tác GHI đều
--     đi qua mã phía máy chủ để không ai nhảy cóc được bước duyệt.

-- ── Phòng ban ──────────────────────────────────────────────────
create table if not exists public.departments (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null unique,          -- MKT, KD, NS… dùng làm tiền tố số BK
  name                   text not null,
  requires_head_approval boolean not null default false, -- bật/tắt bước trưởng bộ phận
  active                 boolean not null default true,
  sort_order             integer not null default 0,
  created_at             timestamptz not null default now()
);

-- ── Nhân sự (danh sách để chọn tên khi nộp — KHÔNG có mật khẩu) ─
create table if not exists public.staff (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  email         text,
  phone         text,
  department_id uuid not null references public.departments(id) on delete restrict,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists staff_department_idx on public.staff(department_id);

-- ── Hồ sơ người duyệt (1-1 với auth.users) ─────────────────────
-- Chỉ kế toán, trưởng bộ phận, giám đốc và quản trị mới có dòng ở đây.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  staff_id      uuid unique references public.staff(id) on delete set null,
  full_name     text not null default '',
  email         text not null default '',
  roles         text[] not null default '{}',
  department_id uuid references public.departments(id) on delete set null,
  on_leave      boolean not null default false,          -- bật khi nghỉ phép
  status        text not null default 'Hoạt động' check (status in ('Hoạt động','Đã khóa')),
  created_at    timestamptz not null default now(),
  constraint profiles_roles_valid check (
    roles <@ array[
      'Trưởng bộ phận','Kế toán viên','Kế toán tổng hợp',
      'Kế toán trưởng','Kế toán ngân hàng','Giám đốc','Quản trị'
    ]::text[]
  )
);

-- ── Phân công kế toán viên theo phòng ban ──────────────────────
-- Chính bảng này làm nên bước tự định tuyến hồ sơ.
create table if not exists public.accountant_assignments (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null unique references public.departments(id) on delete cascade,
  accountant_id uuid not null references public.profiles(id) on delete restrict,
  backup_id     uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Nhà cung cấp ───────────────────────────────────────────────
create table if not exists public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  tax_code   text,                    -- MST hoặc CCCD
  phone      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Tài khoản ngân hàng ────────────────────────────────────────
-- account_number BẮT BUỘC là text. File Excel cũ bị Excel bóp thành
-- 6.635E+14 làm mất chữ số — lỗi này phải chặn ngay từ kiểu dữ liệu.
create table if not exists public.bank_accounts (
  id                 uuid primary key default gen_random_uuid(),
  supplier_id        uuid references public.suppliers(id) on delete cascade,
  account_number     text not null,
  bank_name          text not null,
  account_holder     text not null,
  is_company_account boolean not null default false,  -- true = tài khoản chi của công ty
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  constraint bank_accounts_number_not_scientific
    check (account_number !~ '[eE]\+'),               -- chặn thẳng dạng 6.635E+14
  constraint bank_accounts_owner_check
    check (is_company_account or supplier_id is not null)
);

create index if not exists bank_accounts_supplier_idx on public.bank_accounts(supplier_id);

-- ── Danh mục loại chi phí ──────────────────────────────────────
create table if not exists public.expense_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  active     boolean not null default true,
  sort_order integer not null default 0
);

-- ── Đề nghị thanh toán ─────────────────────────────────────────
create table if not exists public.payment_requests (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,   -- số BK, ví dụ MKT/42
  lookup_token       text not null unique,   -- mã tra cứu cho link riêng của người nộp
  department_id      uuid not null references public.departments(id) on delete restrict,
  requester_id       uuid not null references public.staff(id) on delete restrict,
  requester_name     text not null,          -- chụp lại tên tại thời điểm nộp
  request_date       date not null default current_date,
  due_date           date,
  payment_method     text not null default 'Chuyển khoản'
                     check (payment_method in ('Chuyển khoản','Tiền mặt')),
  total_amount       bigint not null default 0,   -- đơn vị: đồng

  -- Thông tin người nhận tiền
  supplier_id        uuid references public.suppliers(id) on delete set null,
  beneficiary_name   text,
  tax_code           text,
  contact_phone      text,
  recipient_account  text,
  recipient_bank     text,
  recipient_holder   text,
  company_account_id uuid references public.bank_accounts(id) on delete set null,

  note               text,
  status             text not null default 'Nháp' check (status in (
                       'Nháp','Chờ trưởng bộ phận','Chờ kế toán viên',
                       'Chờ kế toán tổng hợp','Chờ kế toán trưởng','Chờ giám đốc',
                       'Chờ chi','Hoàn thành','Trả về','Đã hủy')),
  holder_id          uuid references public.profiles(id) on delete set null,
  submitted_at       timestamptz,
  completed_at       timestamptz,
  last_return_reason text,
  return_count       integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint payment_requests_amount_positive check (total_amount >= 0)
);

create index if not exists payment_requests_status_idx     on public.payment_requests(status);
create index if not exists payment_requests_department_idx on public.payment_requests(department_id);
create index if not exists payment_requests_holder_idx     on public.payment_requests(holder_id);
create index if not exists payment_requests_date_idx       on public.payment_requests(request_date desc);

-- ── Dòng chi tiết ──────────────────────────────────────────────
-- Nhiều dòng cùng một số BK gộp thành một phiếu ĐNTT, đúng như sheet MẪU ĐNTT.
create table if not exists public.request_lines (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.payment_requests(id) on delete cascade,
  line_no      integer not null default 1,
  expense_type text,
  description  text not null,
  amount       bigint not null default 0,
  constraint request_lines_amount_positive check (amount >= 0)
);

create index if not exists request_lines_request_idx on public.request_lines(request_id);

-- ── Tệp đính kèm ───────────────────────────────────────────────
create table if not exists public.attachments (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null references public.payment_requests(id) on delete cascade,
  kind             text not null default 'Chứng từ'
                   check (kind in ('Chứng từ','Ủy nhiệm chi','Phiếu chi')),
  file_name        text not null,
  storage_path     text not null,
  mime_type        text not null default '',
  size_bytes       integer not null default 0,
  uploaded_by      uuid references public.profiles(id) on delete set null,
  uploaded_by_name text not null default '',
  created_at       timestamptz not null default now()
);

create index if not exists attachments_request_idx on public.attachments(request_id);

-- ── Nhật ký hồ sơ ──────────────────────────────────────────────
-- Chỉ được thêm. Không sửa, không xóa — kể cả quản trị. Xem policy bên dưới.
create table if not exists public.request_events (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.payment_requests(id) on delete cascade,
  action      text not null check (action in
                ('Nộp hồ sơ','Duyệt','Trả về','Sửa và nộp lại','Chi tiền','Hủy hồ sơ')),
  from_status text,
  to_status   text not null,
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text not null,
  actor_role  text,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists request_events_request_idx on public.request_events(request_id, created_at);

-- ── Chi trả ────────────────────────────────────────────────────
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null unique references public.payment_requests(id) on delete cascade,
  unc_number   text,
  paid_at      date not null default current_date,
  from_account text,
  amount_paid  bigint not null default 0,
  performed_by uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ── Cài đặt ────────────────────────────────────────────────────
create table if not exists public.settings (
  key         text primary key,
  value       text not null,
  description text,
  updated_at  timestamptz not null default now()
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Hàm tiện ích                                                  ║
-- ╚══════════════════════════════════════════════════════════════╝

create or replace function public.my_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select roles from public.profiles
      where id = auth.uid() and status = 'Hoạt động'),
    '{}'::text[]
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select 'Quản trị' = any(public.my_roles());
$$;

-- Người đã đăng nhập và đang hoạt động
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
     where id = auth.uid() and status = 'Hoạt động'
  );
$$;

-- Tự cập nhật updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_requests_touch on public.payment_requests;
create trigger payment_requests_touch
  before update on public.payment_requests
  for each row execute function public.touch_updated_at();

drop trigger if exists accountant_assignments_touch on public.accountant_assignments;
create trigger accountant_assignments_touch
  before update on public.accountant_assignments
  for each row execute function public.touch_updated_at();

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  RLS — chỉ mở quyền ĐỌC. Mọi thao tác GHI đi qua service_role.  ║
-- ╚══════════════════════════════════════════════════════════════╝

alter table public.departments            enable row level security;
alter table public.staff                  enable row level security;
alter table public.profiles               enable row level security;
alter table public.accountant_assignments enable row level security;
alter table public.suppliers              enable row level security;
alter table public.bank_accounts          enable row level security;
alter table public.expense_types          enable row level security;
alter table public.payment_requests       enable row level security;
alter table public.request_lines          enable row level security;
alter table public.attachments            enable row level security;
alter table public.request_events         enable row level security;
alter table public.payments               enable row level security;
alter table public.settings               enable row level security;

-- Danh mục: người đã đăng nhập đọc được hết
do $$
declare t text;
begin
  foreach t in array array[
    'departments','staff','profiles','accountant_assignments',
    'suppliers','bank_accounts','expense_types','settings',
    'payment_requests','request_lines','attachments','request_events','payments'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format(
      'create policy %I on public.%I for select using (public.is_active_user())',
      t || '_read', t
    );
  end loop;
end $$;

-- Quản trị được sửa danh mục trực tiếp (tiện thao tác nhanh trong Table Editor)
do $$
declare t text;
begin
  foreach t in array array[
    'departments','staff','suppliers','bank_accounts','expense_types','settings'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format(
      'create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_write', t
    );
  end loop;
end $$;

-- Cố tình KHÔNG có policy ghi cho bảng profiles.
-- Đặt policy tự sửa hồ sơ của mình sẽ phải đọc lại chính bảng profiles ngay
-- bên trong biểu thức policy — PostgreSQL gọi lại policy đó và lặp vô hạn.
-- Việc đổi vai trò và khóa tài khoản đi qua màn hình Quản trị (service_role),
-- nên không cần policy nào ở đây.

-- Nhật ký: KHÔNG có policy update/delete nào cả → không ai sửa hay xóa được,
-- kể cả quản trị. Chỉ mã phía máy chủ (service_role) mới ghi thêm được.

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Kho tệp đính kèm                                              ║
-- ╚══════════════════════════════════════════════════════════════╝

insert into storage.buckets (id, name, public)
values ('chung-tu', 'chung-tu', false)
on conflict (id) do nothing;

-- Người đã đăng nhập đọc được chứng từ. Người nộp xem qua link ký sẵn
-- do máy chủ cấp, nên không cần policy cho anon.
drop policy if exists chung_tu_read on storage.objects;
create policy chung_tu_read on storage.objects
  for select using (bucket_id = 'chung-tu' and public.is_active_user());
