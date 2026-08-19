/**
 * Tạo toàn bộ tài khoản đăng nhập của ban kế toán và phân công phòng ban.
 *
 *   npm run tao-tai-khoan
 *
 * Chạy được nhiều lần: tài khoản đã có thì đặt lại mật khẩu và cập nhật vai trò,
 * không tạo trùng.
 *
 * Tài khoản ở đây đặt theo BỘ PHẬN, không theo người: email là tên viết tắt của
 * bộ phận, tên hiển thị là tên bộ phận. Người trong bộ phận dùng chung một tài
 * khoản. Đổi người phụ trách thì không phải cấp lại tài khoản.
 *
 * Đánh đổi phải biết: nhật ký hồ sơ sẽ ghi "Kế toán đối soát đã duyệt", không
 * ghi được tên người cụ thể. Muốn truy ra từng người thì phải tách mỗi người
 * một tài khoản.
 *
 * CẦN CHẠY TRƯỚC (SQL Editor):
 *   supabase/migrations/0004_phan_cong.sql
 *   supabase/seed.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { exit } from 'node:process';

// ── Mật khẩu chung ─────────────────────────────────────────────
// Công ty chọn dùng chung một mật khẩu cho tiện. Đây là mức bảo vệ rất thấp:
// ai biết email là duyệt chi được. Đổi ở đây rồi chạy lại là xong.
const MAT_KHAU = '123456';

// ── Danh sách tài khoản ────────────────────────────────────────
// Email bỏ dấu tiếng Việt vì hệ thống email không nhận chữ có dấu.
//
// "Vai trò" là quyền trong luồng duyệt, chỉ có bảy giá trị cố định — khác với
// tên bộ phận. Kế toán đối soát và kế toán mua hàng đều đóng vai "Kế toán viên",
// tức người kiểm hồ sơ đầu tiên.
const TAI_KHOAN = [
  {
    email: 'ktds@drkam.vn',
    ten: 'Kế toán đối soát',
    phong: 'KT',
    vaiTro: ['Kế toán viên'],
  },
  {
    email: 'ktnh@drkam.vn',
    ten: 'Kế toán ngân hàng',
    phong: 'KT',
    // Vừa nhận hồ sơ đầu vào của HCNS/KT/BGĐ, vừa là người chi tiền bước cuối.
    vaiTro: ['Kế toán viên', 'Kế toán ngân hàng'],
  },
  {
    email: 'ktmh@drkam.vn',
    ten: 'Kế toán mua hàng',
    phong: 'KT',
    vaiTro: ['Kế toán viên'],
  },
  {
    email: 'ktth@drkam.vn',
    ten: 'Kế toán tổng hợp',
    phong: 'KT',
    vaiTro: ['Kế toán tổng hợp'],
  },
  {
    email: 'ktt@drkam.vn',
    ten: 'Kế toán trưởng',
    phong: 'KT',
    vaiTro: ['Kế toán trưởng'],
  },
  {
    email: 'gd@drkam.vn',
    ten: 'Giám đốc',
    phong: 'BGD',
    vaiTro: ['Giám đốc'],
  },
  {
    email: 'qt@drkam.vn',
    ten: 'Quản trị hệ thống',
    phong: 'KT',
    vaiTro: ['Quản trị'],
  },
];

// ── Phòng nào gửi về bàn ai ────────────────────────────────────
const PHAN_CONG = [
  ['MKT', 'ktds@drkam.vn'],
  ['SALE', 'ktds@drkam.vn'],
  ['HCNS', 'ktnh@drkam.vn'],
  ['KT', 'ktnh@drkam.vn'],
  ['BGD', 'ktnh@drkam.vn'],
  ['KHO', 'ktmh@drkam.vn'],
  ['SALEOFF', 'ktmh@drkam.vn'],
];

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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    '\n✗ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local\n',
  );
  exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('\n═══ Cấp tài khoản cho ban kế toán ═══\n');
console.log(`Dự án: ${url}`);
console.log(`Mật khẩu chung: ${MAT_KHAU}\n`);

let hong = 0;

// ── Kiểm tra phòng ban đã có chưa ──────────────────────────────
{
  const canCo = [...new Set([...TAI_KHOAN.map((t) => t.phong), ...PHAN_CONG.map((p) => p[0])])];
  const { data: phong, error } = await db.from('departments').select('code');
  if (error) {
    console.error(`✗ Không đọc được bảng phòng ban: ${error.message}\n`);
    exit(1);
  }
  const daCo = new Set((phong ?? []).map((p) => p.code));
  const thieu = canCo.filter((c) => !daCo.has(c));
  if (thieu.length) {
    console.error(
      `✗ Chưa có các phòng ban: ${thieu.join(', ')}\n` +
        '  Mở SQL Editor chạy supabase/seed.sql rồi chạy lại lệnh này.\n',
    );
    exit(1);
  }
}

// ── Lấy danh sách user hiện có để biết cái nào cần tạo mới ─────
const { data: dsUser, error: loiDs } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (loiDs) {
  console.error(`✗ Không đọc được danh sách tài khoản: ${loiDs.message}\n`);
  exit(1);
}
const banDoUser = new Map(
  (dsUser?.users ?? []).filter((u) => u.email).map((u) => [u.email.toLowerCase(), u.id]),
);

// ── Tạo hoặc cập nhật từng tài khoản ───────────────────────────
console.log('Tài khoản đăng nhập:');
for (const tk of TAI_KHOAN) {
  const daCo = banDoUser.get(tk.email);
  try {
    if (daCo) {
      // Đã có ở Authentication → đặt lại mật khẩu cho khớp, xác nhận email luôn.
      const { error } = await db.auth.admin.updateUserById(daCo, {
        password: MAT_KHAU,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
    } else {
      // email_confirm: true = đánh dấu đã xác minh sẵn, không gửi mail đi đâu cả.
      const { error } = await db.auth.admin.createUser({
        email: tk.email,
        password: MAT_KHAU,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
    }

    // Cấp quyền: tạo dòng nhân sự + hồ sơ phân quyền.
    const { data: ketQua, error: loiCap } = await db.rpc('cap_tai_khoan', {
      p_email: tk.email,
      p_ho_ten: tk.ten,
      p_ma_phong: tk.phong,
      p_vai_tro: tk.vaiTro,
    });
    if (loiCap) throw new Error(loiCap.message);

    console.log(`  ✓ ${tk.email.padEnd(16)} ${tk.ten.padEnd(20)} ${tk.vaiTro.join(' + ')}`);
    if (String(ketQua).startsWith('Đã cập nhật')) {
      console.log(`      (tài khoản đã có sẵn — đã đặt lại mật khẩu và vai trò)`);
    }
  } catch (loi) {
    hong++;
    console.log(`  ✗ ${tk.email.padEnd(16)} ${loi.message}`);
    if (/weak|pwned|leaked|compromis/i.test(loi.message)) {
      console.log(
        '      Supabase đang bật chế độ chặn mật khẩu quá phổ biến.\n' +
          '      Tắt ở Authentication › Policies, hoặc đổi MAT_KHAU trong file này.',
      );
    }
    if (/PGRST202|does not exist|Could not find the function/i.test(loi.message)) {
      console.log('      Chạy supabase/migrations/0004_phan_cong.sql trước đã.');
    }
  }
}

// ── Phân công phòng ban ────────────────────────────────────────
console.log('\nPhân công phòng ban:');
for (const [maPhong, email] of PHAN_CONG) {
  const { data, error } = await db.rpc('phan_cong', { p_ma_phong: maPhong, p_email: email });
  if (error) {
    hong++;
    console.log(`  ✗ ${maPhong.padEnd(8)} ${error.message}`);
  } else {
    console.log(`  ✓ ${data}`);
  }
}

if (hong === 0) {
  console.log(
    '\n✓ Xong. Đăng nhập tại /dang-nhap bằng bất kỳ email nào ở trên,\n' +
      `  mật khẩu ${MAT_KHAU}.\n`,
  );
} else {
  console.log(`\n✗ ${hong} chỗ chưa xong — xem bên trên.\n`);
}
exit(hong ? 1 : 0);
