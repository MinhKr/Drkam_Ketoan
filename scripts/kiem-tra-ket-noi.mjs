/**
 * Kiểm tra dự án đã nối được với Supabase chưa và cơ sở dữ liệu đã dựng đủ chưa.
 *
 *   npm run kiem-tra-ket-noi
 *
 * Chạy lệnh này sau khi điền .env.local và chạy SQL trên Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { exit } from 'node:process';

function napEnv() {
  for (const ten of ['.env.local', '.env']) {
    try {
      for (const dong of readFileSync(ten, 'utf8').split('\n')) {
        const khop = dong.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!khop) continue;
        const giaTri = khop[2].trim().replace(/^["']|["']$/g, '');
        if (giaTri && !process.env[khop[1]]) process.env[khop[1]] = giaTri;
      }
    } catch {
      // không có file thì thôi
    }
  }
}

napEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n═══ Kiểm tra kết nối Supabase ═══\n');

const thieu = [];
if (!url) thieu.push('NEXT_PUBLIC_SUPABASE_URL');
if (!anon) thieu.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!serviceKey) thieu.push('SUPABASE_SERVICE_ROLE_KEY');

if (thieu.length) {
  console.error(`✗ Thiếu trong .env.local: ${thieu.join(', ')}\n`);
  exit(1);
}

console.log(`Dự án: ${url}`);
console.log('Ba khóa: đã có đủ\n');

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BANG = [
  'departments',
  'staff',
  'profiles',
  'accountant_assignments',
  'suppliers',
  'bank_accounts',
  'expense_types',
  'payment_requests',
  'request_lines',
  'attachments',
  'request_events',
  'payments',
  'settings',
  'request_counters',
];

let hong = 0;
const thieuBang = [];

console.log('Bảng dữ liệu:');
for (const bang of BANG) {
  const { count, error } = await db.from(bang).select('*', { count: 'exact', head: true });
  if (error) {
    thieuBang.push(bang);
    console.log(`  ✗ ${bang.padEnd(24)} ${error.message}`);
    hong++;
  } else {
    console.log(`  ✓ ${bang.padEnd(24)} ${count ?? 0} dòng`);
  }
}

if (thieuBang.length === BANG.length) {
  console.error(
    '\n✗ Chưa có bảng nào. Bạn chưa chạy SQL trên Supabase.\n' +
      '  Mở SQL Editor và chạy lần lượt:\n' +
      '    1. supabase/migrations/0001_init.sql\n' +
      '    2. supabase/migrations/0002_nop_ho_so.sql\n' +
      '    3. supabase/migrations/0003_cap_tai_khoan.sql\n' +
      '    4. supabase/migrations/0004_phan_cong.sql\n' +
      '    5. supabase/migrations/0005_ban_in.sql\n' +
      '    6. supabase/migrations/0006_nguoi_de_nghi.sql\n' +
      '    7. supabase/seed.sql\n',
  );
  exit(1);
}

// ── Hàm cấp số BK ──────────────────────────────────────────────
console.log('\nHàm trong cơ sở dữ liệu:');
{
  // Gọi với phòng ban không tồn tại: hàm phải báo "Không tìm thấy phòng ban".
  // Làm vậy để biết hàm có thật mà KHÔNG tiêu mất một số BK nào.
  const { error } = await db.rpc('next_request_code', {
    p_department_id: '00000000-0000-0000-0000-000000000000',
  });
  if (!error) {
    console.log('  ✗ next_request_code — lẽ ra phải báo lỗi với phòng ban không tồn tại');
    hong++;
  } else if (error.code === 'PGRST202') {
    console.log('  ✗ next_request_code chưa có — chạy supabase/migrations/0002_nop_ho_so.sql');
    hong++;
  } else if (error.message.includes('Không tìm thấy phòng ban')) {
    console.log('  ✓ next_request_code');
  } else {
    console.log(`  ✗ next_request_code — ${error.message}`);
    hong++;
  }
}

// ── Kho tệp ────────────────────────────────────────────────────
console.log('\nKho tệp đính kèm:');
{
  const { data: buckets, error } = await db.storage.listBuckets();
  if (error) {
    console.log(`  ✗ không đọc được danh sách kho — ${error.message}`);
    hong++;
  } else if (!buckets.some((b) => b.id === 'chung-tu')) {
    console.log('  ✗ chưa có kho "chung-tu" — chạy lại 0001_init.sql');
    hong++;
  } else {
    const ten = `nhap/kiem-tra/${crypto.randomUUID()}.txt`;
    const { error: loiTai } = await db.storage
      .from('chung-tu')
      .upload(ten, new Blob(['thu']), { contentType: 'text/plain' });
    if (loiTai) {
      console.log(`  ✗ không tải tệp lên được — ${loiTai.message}`);
      hong++;
    } else {
      await db.storage.from('chung-tu').remove([ten]);
      console.log('  ✓ kho "chung-tu" tải lên và xóa được');
    }
  }
}

// ── Tài khoản quản trị ─────────────────────────────────────────
console.log('\nTài khoản:');
{
  const { count } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .contains('roles', ['Quản trị']);

  if (!count) {
    console.log('  ! chưa có tài khoản quản trị → chạy: npm run tao-quan-tri');
  } else {
    console.log(`  ✓ có ${count} tài khoản quản trị`);
  }
}

// ── Dữ liệu seed ───────────────────────────────────────────────
console.log('\nDữ liệu khởi tạo:');
{
  const { data: phong } = await db.from('departments').select('code, name').order('code');
  const { count: soNhanSu } = await db.from('staff').select('id', { count: 'exact', head: true });
  const { data: dem } = await db.from('request_counters').select('last_no');

  console.log(
    `  phòng ban: ${(phong ?? []).map((p) => `${p.name} (${p.code})`).join(', ') || 'chưa có'}`,
  );
  console.log(`  nhân sự: ${soNhanSu ?? 0} người`);
  console.log(`  bộ đếm số BK: ${(dem ?? []).map((d) => d.last_no).join(', ') || 'chưa đặt'}`);
}

// ── Phân công kế toán viên ─────────────────────────────────────
// Phòng nào thiếu phân công là hồ sơ phòng đó không nộp lên được.
console.log('\nPhân công kế toán viên:');
{
  const { data: phong } = await db
    .from('departments')
    .select('code, name')
    .eq('active', true)
    .order('sort_order');

  const { data: gan } = await db
    .from('accountant_assignments')
    .select('department_id, departments(code), profiles!accountant_assignments_accountant_id_fkey(full_name, job_title)');

  const banDo = new Map(
    (gan ?? []).map((g) => [g.departments?.code, g.profiles]),
  );

  let thieuPhanCong = 0;
  for (const p of phong ?? []) {
    const nguoi = banDo.get(p.code);
    if (nguoi) {
      const chucDanh = nguoi.job_title ? ` (${nguoi.job_title})` : '';
      console.log(`  ✓ ${p.code.padEnd(8)} ${p.name.padEnd(22)} → ${nguoi.full_name}${chucDanh}`);
    } else {
      thieuPhanCong++;
      console.log(`  ! ${p.code.padEnd(8)} ${p.name.padEnd(22)} → chưa phân công`);
    }
  }
  if (thieuPhanCong) {
    console.log(
      `\n  ${thieuPhanCong} phòng chưa có kế toán viên phụ trách — hồ sơ của các phòng đó\n` +
        '  sẽ bị chặn ngay lúc nộp. Điền email vào supabase/tai-khoan-ke-toan.sql rồi chạy,\n' +
        '  hoặc vào Quản trị › Phân công.',
    );
  }
}

console.log(
  hong === 0
    ? '\n✓ Kết nối tốt, cơ sở dữ liệu đã sẵn sàng.\n'
    : `\n✗ ${hong} chỗ chưa ổn — xem bên trên.\n`,
);
exit(hong ? 1 : 0);
