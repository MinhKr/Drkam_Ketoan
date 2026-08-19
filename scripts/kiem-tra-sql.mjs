/**
 * Chạy thử toàn bộ SQL trên một PostgreSQL thật (bản WASM) để bắt lỗi cú pháp
 * và lỗi ràng buộc TRƯỚC khi dán vào Supabase.
 *
 *   npm run kiem-tra-sql
 *
 * Script dựng sẵn mấy thứ riêng của Supabase (schema auth, storage, hàm auth.uid)
 * rồi chạy lần lượt các file trong supabase/migrations/ và supabase/seed.sql.
 */

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { exit } from 'node:process';

const GIA_LAP_SUPABASE = `
  create schema if not exists auth;
  create schema if not exists storage;

  create table auth.users (
    id    uuid primary key default gen_random_uuid(),
    email text
  );

  create table storage.buckets (
    id     text primary key,
    name   text not null,
    public boolean not null default false
  );

  create table storage.objects (
    id        uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id),
    name      text
  );
  alter table storage.objects enable row level security;

  create or replace function auth.uid() returns uuid
    language sql stable as $fn$ select null::uuid $fn$;
`;

const db = await PGlite.create();
let hong = 0;

async function chay(ten, sql) {
  try {
    await db.exec(sql);
    console.log(`  ✓ ${ten}`);
  } catch (loi) {
    hong++;
    console.log(`  ✗ ${ten}`);
    console.log(`      ${loi.message}`);
    if (loi.hint) console.log(`      gợi ý: ${loi.hint}`);
  }
}

console.log('\n═══ Kiểm tra SQL trên PostgreSQL thật ═══\n');

console.log('Dựng sẵn phần của Supabase:');
await chay('schema auth + storage', GIA_LAP_SUPABASE);

console.log('\nMigrations:');
const thuMuc = join('supabase', 'migrations');
for (const ten of readdirSync(thuMuc).filter((f) => f.endsWith('.sql')).sort()) {
  await chay(ten, readFileSync(join(thuMuc, ten), 'utf8'));
}

console.log('\nSeed:');
await chay('seed.sql', readFileSync(join('supabase', 'seed.sql'), 'utf8'));

// ── Thử vài tình huống thật ────────────────────────────────────
console.log('\nThử nghiệp vụ:');

async function thu(ten, fn) {
  try {
    await fn();
    console.log(`  ✓ ${ten}`);
  } catch (loi) {
    hong++;
    console.log(`  ✗ ${ten}`);
    console.log(`      ${loi.message}`);
  }
}

await thu('cấp số BK liên tiếp cho phòng Marketing', async () => {
  const { rows: phong } = await db.query(
    `select id from public.departments where code = 'MKT'`,
  );
  const id = phong[0].id;
  const a = await db.query('select public.next_request_code($1) as ma', [id]);
  const b = await db.query('select public.next_request_code($1) as ma', [id]);
  if (a.rows[0].ma !== 'MKT/101' || b.rows[0].ma !== 'MKT/102') {
    throw new Error(`cấp sai số: ${a.rows[0].ma}, ${b.rows[0].ma} (mong đợi MKT/101, MKT/102)`);
  }
});

await thu('chặn số tài khoản dạng số khoa học', async () => {
  const { rows } = await db.query(`select id from public.suppliers limit 1`);
  try {
    await db.query(
      `insert into public.bank_accounts (supplier_id, account_number, bank_name, account_holder)
       values ($1, '6.635E+14', 'Techcombank', 'BUI PHUONG ANH')`,
      [rows[0].id],
    );
  } catch {
    return; // đúng như mong đợi: bị chặn
  }
  throw new Error('vẫn chèn được số tài khoản hỏng — ràng buộc không có tác dụng');
});

await thu('cho phép số tài khoản bình thường', async () => {
  const { rows } = await db.query(`select id from public.suppliers limit 1`);
  await db.query(
    `insert into public.bank_accounts (supplier_id, account_number, bank_name, account_holder)
     values ($1, '19036184902016', 'Techcombank', 'NGUYEN VAN A')`,
    [rows[0].id],
  );
});

await thu('chặn vai trò không hợp lệ', async () => {
  const { rows: u } = await db.query(
    `insert into auth.users (email) values ('thu@drkam.vn') returning id`,
  );
  try {
    await db.query(
      `insert into public.profiles (id, full_name, email, roles)
       values ($1, 'Thử', 'thu@drkam.vn', array['Sếp tổng'])`,
      [u[0].id],
    );
  } catch {
    return;
  }
  throw new Error('vẫn chèn được vai trò lạ — ràng buộc profiles_roles_valid không có tác dụng');
});

await thu('chặn trạng thái hồ sơ không hợp lệ', async () => {
  const { rows: p } = await db.query(`select id from public.departments limit 1`);
  const { rows: s } = await db.query(
    `insert into public.staff (full_name, department_id) values ('Thử', $1) returning id`,
    [p[0].id],
  );
  try {
    await db.query(
      `insert into public.payment_requests (code, lookup_token, department_id, requester_id, requester_name, status)
       values ('X/1', 'MATEST', $1, $2, 'Thử', 'Đang bay')`,
      [p[0].id, s[0].id],
    );
  } catch {
    return;
  }
  throw new Error('vẫn chèn được trạng thái lạ');
});

await thu('xóa hồ sơ thì dòng chi tiết và nhật ký đi theo', async () => {
  const { rows: p } = await db.query(`select id from public.departments limit 1`);
  const { rows: s } = await db.query(`select id from public.staff limit 1`);
  const { rows: h } = await db.query(
    `insert into public.payment_requests (code, lookup_token, department_id, requester_id, requester_name, total_amount)
     values ('X/2', 'MATEST2', $1, $2, 'Thử', 500000) returning id`,
    [p[0].id, s[0].id],
  );
  await db.query(
    `insert into public.request_lines (request_id, description, amount) values ($1, 'Nội dung', 500000)`,
    [h[0].id],
  );
  await db.query(
    `insert into public.request_events (request_id, action, to_status, actor_name)
     values ($1, 'Nộp hồ sơ', 'Chờ kế toán viên', 'Thử')`,
    [h[0].id],
  );
  await db.query(`delete from public.payment_requests where id = $1`, [h[0].id]);
  const { rows: con } = await db.query(
    `select (select count(*) from public.request_lines where request_id = $1) as dong,
            (select count(*) from public.request_events where request_id = $1) as buoc`,
    [h[0].id],
  );
  if (Number(con[0].dong) !== 0 || Number(con[0].buoc) !== 0) {
    throw new Error('còn sót dòng con sau khi xóa hồ sơ');
  }
});

await thu('dữ liệu seed vào đủ', async () => {
  const { rows } = await db.query(`
    select (select count(*) from public.departments)   as phong,
           (select count(*) from public.staff)         as nhan_su,
           (select count(*) from public.expense_types) as loai_chi_phi,
           (select count(*) from public.suppliers)     as nha_cung_cap,
           (select count(*) from public.bank_accounts) as tai_khoan,
           (select count(*) from public.settings)      as cai_dat
  `);
  const r = rows[0];
  console.log(
    `      phòng ban ${r.phong} · nhân sự ${r.nhan_su} · loại chi phí ${r.loai_chi_phi} · ` +
      `nhà cung cấp ${r.nha_cung_cap} · tài khoản ${r.tai_khoan} · cài đặt ${r.cai_dat}`,
  );
  if (Number(r.phong) < 7 || Number(r.nhan_su) < 10) {
    throw new Error('seed thiếu dữ liệu');
  }
});

await thu('đủ bảy phòng ban theo luồng nhận ĐNTT', async () => {
  const { rows } = await db.query(
    `select code from public.departments order by sort_order`,
  );
  const co = rows.map((r) => r.code);
  const can = ['MKT', 'SALE', 'SALEOFF', 'KHO', 'HCNS', 'KT', 'BGD'];
  const thieu = can.filter((c) => !co.includes(c));
  if (thieu.length) throw new Error(`thiếu phòng: ${thieu.join(', ')}`);
  console.log(`      ${co.join(' · ')}`);
});

await thu('ba tài khoản hỏng đúng là chưa có số', async () => {
  const { rows } = await db.query(`
    select s.name
      from public.suppliers s
      left join public.bank_accounts b on b.supplier_id = s.id
     where s.name in ('Bùi Phương Anh', 'Nguyễn Hồng Minh Châu', 'Bùi Đăng Dương')
       and b.id is null
     order by s.name
  `);
  if (rows.length !== 3) {
    throw new Error(`mong đợi 3 nhà cung cấp chưa có tài khoản, thấy ${rows.length}`);
  }
});

await thu('cap_tai_khoan: báo lỗi rõ khi chưa tạo user ở Authentication', async () => {
  try {
    await db.query(
      `select public.cap_tai_khoan('chua-co@drkam.vn', 'Nguoi La', 'MKT', array['Quản trị'])`,
    );
  } catch (loi) {
    if (!loi.message.includes('Authentication')) {
      throw new Error(`thông báo lỗi không rõ ràng: ${loi.message}`);
    }
    return;
  }
  throw new Error('lẽ ra phải báo lỗi');
});

await thu('cap_tai_khoan: cấp được tài khoản đầy đủ', async () => {
  await db.query(`insert into auth.users (email) values ('linh@drkam.vn')`);
  const { rows } = await db.query(
    `select public.cap_tai_khoan('linh@drkam.vn', 'Hồ Diệu Linh', 'KT',
       array['Quản trị','Kế toán trưởng']) as kq`,
  );
  console.log(`      ${rows[0].kq}`);

  const { rows: kt } = await db.query(`
    select p.roles, d.code as phong
      from public.profiles p
      join public.departments d on d.id = p.department_id
      join public.staff s on s.id = p.staff_id
     where p.email = 'linh@drkam.vn'
  `);
  if (kt.length !== 1) throw new Error('không tạo được hồ sơ phân quyền');
  if (kt[0].roles.length !== 2) throw new Error(`vai trò sai: ${kt[0].roles}`);
  if (kt[0].phong !== 'KT') throw new Error('gán sai phòng ban');
});

await thu('cap_tai_khoan: gọi lại thì cập nhật, không tạo trùng', async () => {
  await db.query(
    `select public.cap_tai_khoan('linh@drkam.vn', 'Hồ Diệu Linh', 'KT', array['Kế toán viên'])`,
  );
  const { rows } = await db.query(
    `select count(*)::int as n, max(array_length(roles,1)) as so_vai_tro
       from public.profiles where email = 'linh@drkam.vn'`,
  );
  if (rows[0].n !== 1) throw new Error(`tạo trùng ${rows[0].n} dòng`);
  if (rows[0].so_vai_tro !== 1) throw new Error('không cập nhật lại vai trò');
});

await thu('cap_tai_khoan: chặn vai trò bịa', async () => {
  await db.query(`insert into auth.users (email) values ('sep@drkam.vn')`);
  try {
    await db.query(`select public.cap_tai_khoan('sep@drkam.vn', 'Sep', 'KT', array['Chủ tịch'])`);
  } catch {
    return;
  }
  throw new Error('vẫn cấp được vai trò không có thật');
});

await thu('cap_tai_khoan: chặn mã phòng sai', async () => {
  try {
    await db.query(`select public.cap_tai_khoan('sep@drkam.vn', 'Sep', 'XYZ', array['Giám đốc'])`);
  } catch (loi) {
    if (!loi.message.includes('MKT')) throw new Error('lỗi không gợi ý các mã phòng đang có');
    return;
  }
  throw new Error('vẫn cấp được với mã phòng không tồn tại');
});

await thu('cap_tai_khoan: lưu được chức danh', async () => {
  await db.query(`insert into auth.users (email) values ('pa@drkam.vn')`);
  const { rows } = await db.query(
    `select public.cap_tai_khoan('pa@drkam.vn', 'Phương Anh', 'KT',
       array['Kế toán viên'], 'Kế toán đối soát') as kq`,
  );
  if (!rows[0].kq.includes('Kế toán đối soát')) {
    throw new Error(`không nhắc chức danh: ${rows[0].kq}`);
  }
  const { rows: kt } = await db.query(
    `select job_title from public.profiles where email = 'pa@drkam.vn'`,
  );
  if (kt[0].job_title !== 'Kế toán đối soát') throw new Error('chức danh không vào bảng');
});

await thu('cap_tai_khoan: gọi lại bỏ trống chức danh thì giữ nguyên cái cũ', async () => {
  await db.query(
    `select public.cap_tai_khoan('pa@drkam.vn', 'Phương Anh', 'KT', array['Kế toán viên'])`,
  );
  const { rows } = await db.query(
    `select job_title from public.profiles where email = 'pa@drkam.vn'`,
  );
  if (rows[0].job_title !== 'Kế toán đối soát') throw new Error('mất chức danh khi cập nhật');
});

await thu('phan_cong: gán được kế toán viên cho phòng ban', async () => {
  const { rows } = await db.query(`select public.phan_cong('MKT', 'pa@drkam.vn') as kq`);
  console.log(`      ${rows[0].kq}`);
  const { rows: kt } = await db.query(`
    select p.email
      from public.accountant_assignments a
      join public.departments d on d.id = a.department_id
      join public.profiles p on p.id = a.accountant_id
     where d.code = 'MKT'
  `);
  if (kt[0]?.email !== 'pa@drkam.vn') throw new Error('không ghi được phân công');
});

await thu('phan_cong: gọi lại thì đổi người, không tạo dòng thứ hai', async () => {
  // linh@drkam.vn ở phép thử phía trên đang giữ đúng vai trò Kế toán viên.
  await db.query(`select public.phan_cong('MKT', 'linh@drkam.vn', 'pa@drkam.vn')`);
  const { rows } = await db.query(`
    select count(*)::int as n, max(t.email) as thay
      from public.accountant_assignments a
      join public.departments d on d.id = a.department_id
      left join public.profiles t on t.id = a.backup_id
     where d.code = 'MKT'
  `);
  if (rows[0].n !== 1) throw new Error(`tạo trùng ${rows[0].n} dòng`);
  if (rows[0].thay !== 'pa@drkam.vn') throw new Error('không ghi được người thay');
});

await thu('phan_cong: chặn người không có vai trò Kế toán viên', async () => {
  await db.query(`insert into auth.users (email) values ('ktt@drkam.vn')`);
  await db.query(
    `select public.cap_tai_khoan('ktt@drkam.vn', 'Kế toán trưởng', 'KT', array['Kế toán trưởng'])`,
  );
  try {
    await db.query(`select public.phan_cong('KHO', 'ktt@drkam.vn')`);
  } catch (loi) {
    if (!loi.message.includes('Kế toán viên')) {
      throw new Error(`thông báo lỗi không rõ: ${loi.message}`);
    }
    return;
  }
  throw new Error('vẫn phân công được cho người không phải kế toán viên');
});

await thu('phan_cong: chặn tự làm người thay cho chính mình', async () => {
  try {
    await db.query(`select public.phan_cong('KHO', 'pa@drkam.vn', 'pa@drkam.vn')`);
  } catch {
    return;
  }
  throw new Error('vẫn đặt được chính mình làm người thay');
});

console.log(hong === 0 ? '\n✓ Toàn bộ SQL chạy sạch.\n' : `\n✗ ${hong} lỗi.\n`);
exit(hong ? 1 : 0);
