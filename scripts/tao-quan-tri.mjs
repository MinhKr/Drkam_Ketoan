/**
 * Tạo tài khoản quản trị đầu tiên.
 *
 *   npm run tao-quan-tri
 *
 * Chỉ cần chạy đúng một lần. Sau đó đăng nhập vào /quan-tri để tạo
 * các tài khoản kế toán còn lại ngay trên giao diện.
 */

import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
import { readFileSync } from 'node:fs';
import { stdin, stdout, exit } from 'node:process';

function napEnv() {
  for (const ten of ['.env.local', '.env']) {
    try {
      for (const dong of readFileSync(ten, 'utf8').split('\n')) {
        const khop = dong.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!khop) continue;
        const giaTri = khop[2].replace(/^["']|["']$/g, '');
        if (giaTri && !process.env[khop[1]]) process.env[khop[1]] = giaTri;
      }
    } catch {
      // không có file thì thôi
    }
  }
}

napEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    '\n✗ Chưa cấu hình Supabase.\n' +
      '  Tạo file .env.local từ .env.example rồi điền NEXT_PUBLIC_SUPABASE_URL\n' +
      '  và SUPABASE_SERVICE_ROLE_KEY (lấy ở Project Settings > API).\n',
  );
  exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const hoi = createInterface({ input: stdin, output: stdout });

try {
  const { count } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .contains('roles', ['Quản trị']);

  if (count && count > 0) {
    console.log(
      `\n! Đã có ${count} tài khoản quản trị. Tạo thêm tài khoản mới trong màn hình Quản trị.\n`,
    );
    exit(0);
  }

  console.log('\n═══ Tạo tài khoản quản trị đầu tiên ═══\n');

  const hoTen = (await hoi.question('Họ và tên: ')).trim();
  const email = (await hoi.question('Email đăng nhập: ')).trim().toLowerCase();
  const matKhau = (await hoi.question('Mật khẩu (tối thiểu 8 ký tự): ')).trim();

  if (!hoTen || !email || matKhau.length < 8) {
    console.error('\n✗ Thiếu thông tin, hoặc mật khẩu ngắn hơn 8 ký tự.\n');
    exit(1);
  }

  // Phòng ban cho tài khoản quản trị: ưu tiên phòng Kế toán.
  let { data: phong } = await db
    .from('departments')
    .select('id')
    .eq('code', 'KT')
    .maybeSingle();

  if (!phong) {
    const { data: bang, error } = await db
      .from('departments')
      .insert({ code: 'KT', name: 'Kế toán', sort_order: 2 })
      .select('id')
      .single();
    if (error) throw new Error(`Không tạo được phòng Kế toán: ${error.message}`);
    phong = bang;
  }

  const { data: nhanSu, error: loiNhanSu } = await db
    .from('staff')
    .insert({ full_name: hoTen, email, department_id: phong.id })
    .select('id')
    .single();
  if (loiNhanSu) throw new Error(`Không tạo được nhân sự: ${loiNhanSu.message}`);

  const { data: user, error: loiUser } = await db.auth.admin.createUser({
    email,
    password: matKhau,
    email_confirm: true,
  });
  if (loiUser || !user.user) {
    throw new Error(`Không tạo được tài khoản: ${loiUser?.message ?? 'lỗi không rõ'}`);
  }

  const { error: loiProfile } = await db.from('profiles').insert({
    id: user.user.id,
    staff_id: nhanSu.id,
    full_name: hoTen,
    email,
    roles: ['Quản trị'],
    department_id: phong.id,
  });
  if (loiProfile) {
    await db.auth.admin.deleteUser(user.user.id);
    throw new Error(`Không tạo được hồ sơ phân quyền: ${loiProfile.message}`);
  }

  console.log(
    `\n✓ Xong. Đăng nhập bằng ${email} tại /dang-nhap rồi vào mục Quản trị\n` +
      '  để khai báo phòng ban, nhân sự và cấp tài khoản cho kế toán.\n',
  );
} catch (loi) {
  console.error(`\n✗ ${loi instanceof Error ? loi.message : loi}\n`);
  exit(1);
} finally {
  hoi.close();
}
