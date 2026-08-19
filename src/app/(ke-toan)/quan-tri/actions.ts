'use server';

import { revalidatePath } from 'next/cache';
import { batBuocVaiTro } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { VAI_TRO, DANH_SACH_VAI_TRO, type VaiTro } from '@/lib/constants';

export type KetQua = { loi?: string; ok?: string } | undefined;

/** Mọi hành động trong khu quản trị đều phải qua cửa này trước. */
async function batBuocQuanTri() {
  await batBuocVaiTro(VAI_TRO.QUAN_TRI);
  return createAdminClient();
}

function chuoi(duLieu: FormData, ten: string): string {
  return String(duLieu.get(ten) ?? '').trim();
}

// ───────────────────────── Phòng ban ─────────────────────────

export async function themPhongBan(_truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocQuanTri();

  const ma = chuoi(duLieu, 'ma').toUpperCase();
  const ten = chuoi(duLieu, 'ten');
  const tenTruongBoPhan = chuoi(duLieu, 'tenTruongBoPhan');

  if (!ma || !ten) return { loi: 'Nhập cả mã phòng và tên phòng.' };
  if (!/^[A-Z0-9]{2,8}$/.test(ma)) {
    return { loi: 'Mã phòng chỉ gồm 2–8 chữ cái hoặc số, ví dụ MKT. Mã này dùng làm tiền tố số BK.' };
  }

  const { error } = await db.from('departments').insert({
    code: ma,
    name: ten,
    head_name: tenTruongBoPhan || null,
  });

  if (error) {
    return {
      loi: error.code === '23505' ? `Mã phòng ${ma} đã tồn tại.` : `Không thêm được: ${error.message}`,
    };
  }

  revalidatePath('/quan-tri/phong-ban');
  return { ok: `Đã thêm phòng ${ten}.` };
}

/**
 * Tên trưởng bộ phận in sẵn ở ô ký trên phiếu ĐNTT.
 * Không phải phân quyền — trưởng bộ phận ký trên giấy, không duyệt trong app.
 */
export async function luuTenTruongBoPhan(id: string, _truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocQuanTri();
  const ten = chuoi(duLieu, 'tenTruongBoPhan');

  const { error } = await db
    .from('departments')
    .update({ head_name: ten || null })
    .eq('id', id);

  if (error) return { loi: `Không lưu được: ${error.message}` };

  revalidatePath('/quan-tri/phong-ban');
  return { ok: ten ? 'Đã lưu' : 'Đã bỏ trống' };
}

export async function doiTrangThaiPhongBan(id: string, hoatDong: boolean) {
  const db = await batBuocQuanTri();
  await db.from('departments').update({ active: hoatDong }).eq('id', id);
  revalidatePath('/quan-tri/phong-ban');
}

// ───────────────────────── Nhân sự ─────────────────────────

export async function themNhanSu(_truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocQuanTri();

  const hoTen = chuoi(duLieu, 'hoTen');
  const phongBanId = chuoi(duLieu, 'phongBanId');
  const email = chuoi(duLieu, 'email');
  const soDienThoai = chuoi(duLieu, 'soDienThoai');

  if (!hoTen) return { loi: 'Nhập họ tên nhân sự.' };
  if (!phongBanId) return { loi: 'Chọn phòng ban cho nhân sự này.' };

  const { error } = await db.from('staff').insert({
    full_name: hoTen,
    department_id: phongBanId,
    email: email || null,
    phone: soDienThoai || null,
  });

  if (error) return { loi: `Không thêm được: ${error.message}` };

  revalidatePath('/quan-tri/nhan-su');
  return { ok: `Đã thêm ${hoTen} vào danh sách.` };
}

export async function doiTrangThaiNhanSu(id: string, hoatDong: boolean) {
  const db = await batBuocQuanTri();
  await db.from('staff').update({ active: hoatDong }).eq('id', id);
  revalidatePath('/quan-tri/nhan-su');
}

// ───────────────────────── Tài khoản đăng nhập ─────────────────────────

export async function taoTaiKhoan(_truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocQuanTri();

  const nhanSuId = chuoi(duLieu, 'nhanSuId');
  const email = chuoi(duLieu, 'email').toLowerCase();
  const matKhau = chuoi(duLieu, 'matKhau');
  const vaiTro = duLieu.getAll('vaiTro').map(String).filter(Boolean) as VaiTro[];

  if (!nhanSuId) return { loi: 'Chọn nhân sự sẽ được cấp tài khoản.' };
  if (!email) return { loi: 'Nhập email đăng nhập.' };
  if (matKhau.length < 8) return { loi: 'Mật khẩu phải từ 8 ký tự trở lên.' };
  if (vaiTro.length === 0) return { loi: 'Chọn ít nhất một vai trò.' };
  if (vaiTro.some((v) => !DANH_SACH_VAI_TRO.includes(v))) {
    return { loi: 'Có vai trò không hợp lệ.' };
  }

  const { data: nhanSu } = await db
    .from('staff')
    .select('id, full_name, department_id')
    .eq('id', nhanSuId)
    .maybeSingle();

  if (!nhanSu) return { loi: 'Không tìm thấy nhân sự này.' };

  // 1. Tạo tài khoản trong Supabase Auth
  const { data: taoUser, error: loiUser } = await db.auth.admin.createUser({
    email,
    password: matKhau,
    email_confirm: true,
  });

  if (loiUser || !taoUser.user) {
    const daTonTai = loiUser?.message?.toLowerCase().includes('already');
    return {
      loi: daTonTai
        ? `Email ${email} đã có tài khoản. Dùng email khác hoặc sửa tài khoản cũ.`
        : `Không tạo được tài khoản: ${loiUser?.message ?? 'lỗi không rõ'}`,
    };
  }

  // 2. Tạo hồ sơ phân quyền
  const { error: loiProfile } = await db.from('profiles').insert({
    id: taoUser.user.id,
    staff_id: nhanSu.id,
    full_name: nhanSu.full_name,
    email,
    roles: vaiTro,
    department_id: nhanSu.department_id,
  });

  if (loiProfile) {
    // Dọn lại tài khoản Auth để không để rác lại nếu bước 2 hỏng.
    await db.auth.admin.deleteUser(taoUser.user.id);
    return { loi: `Không tạo được hồ sơ phân quyền: ${loiProfile.message}` };
  }

  revalidatePath('/quan-tri/tai-khoan');
  return { ok: `Đã cấp tài khoản cho ${nhanSu.full_name}.` };
}

export async function doiVaiTro(_truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocQuanTri();

  const id = chuoi(duLieu, 'id');
  const vaiTro = duLieu.getAll('vaiTro').map(String).filter(Boolean) as VaiTro[];

  if (!id) return { loi: 'Thiếu tài khoản cần sửa.' };
  if (vaiTro.length === 0) return { loi: 'Tài khoản phải có ít nhất một vai trò.' };

  const { error } = await db.from('profiles').update({ roles: vaiTro }).eq('id', id);
  if (error) return { loi: `Không đổi được vai trò: ${error.message}` };

  revalidatePath('/quan-tri/tai-khoan');
  return { ok: 'Đã cập nhật vai trò.' };
}

export async function doiTrangThaiTaiKhoan(id: string, khoa: boolean) {
  const db = await batBuocQuanTri();
  await db
    .from('profiles')
    .update({ status: khoa ? 'Đã khóa' : 'Hoạt động' })
    .eq('id', id);
  revalidatePath('/quan-tri/tai-khoan');
}

export async function doiVangMat(id: string, vangMat: boolean) {
  const db = await batBuocQuanTri();
  await db.from('profiles').update({ on_leave: vangMat }).eq('id', id);
  revalidatePath('/quan-tri/tai-khoan');
  revalidatePath('/quan-tri/phan-cong');
}

// ───────────────────────── Phân công kế toán viên ─────────────────────────

export async function luuPhanCong(_truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocQuanTri();

  const phongBanId = chuoi(duLieu, 'phongBanId');
  const keToanVienId = chuoi(duLieu, 'keToanVienId');
  const nguoiThayId = chuoi(duLieu, 'nguoiThayId');

  if (!phongBanId) return { loi: 'Thiếu phòng ban.' };
  if (!keToanVienId) return { loi: 'Chọn kế toán viên phụ trách phòng này.' };
  if (nguoiThayId && nguoiThayId === keToanVienId) {
    return { loi: 'Người thay phải khác kế toán viên chính.' };
  }

  const { error } = await db.from('accountant_assignments').upsert(
    {
      department_id: phongBanId,
      accountant_id: keToanVienId,
      backup_id: nguoiThayId || null,
    },
    { onConflict: 'department_id' },
  );

  if (error) return { loi: `Không lưu được phân công: ${error.message}` };

  revalidatePath('/quan-tri/phan-cong');
  return { ok: 'Đã lưu phân công.' };
}

// ───────────────────────── Cài đặt ─────────────────────────

export async function luuCaiDat(_truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocQuanTri();

  const hanMucKTT = Number(chuoi(duLieu, 'hanMucKeToanTruong').replace(/[^\d]/g, ''));
  const hanMucGD = Number(chuoi(duLieu, 'hanMucGiamDoc').replace(/[^\d]/g, ''));
  const dungLuong = Number(chuoi(duLieu, 'dungLuongTepToiDaMb').replace(/[^\d]/g, ''));

  if (!Number.isSafeInteger(hanMucKTT) || hanMucKTT <= 0) {
    return { loi: 'Hạn mức kế toán trưởng phải là số dương.' };
  }
  if (!Number.isSafeInteger(hanMucGD) || hanMucGD <= 0) {
    return { loi: 'Hạn mức giám đốc phải là số dương.' };
  }
  if (hanMucGD < hanMucKTT) {
    return {
      loi: 'Hạn mức giám đốc phải lớn hơn hoặc bằng hạn mức kế toán trưởng, nếu không hồ sơ sẽ lên giám đốc trước cả kế toán trưởng.',
    };
  }
  if (!Number.isSafeInteger(dungLuong) || dungLuong < 1 || dungLuong > 50) {
    return { loi: 'Dung lượng tệp tối đa nhận giá trị từ 1 đến 50 MB.' };
  }

  const { error } = await db.from('settings').upsert(
    [
      { key: 'HAN_MUC_KE_TOAN_TRUONG', value: String(hanMucKTT) },
      { key: 'HAN_MUC_GIAM_DOC', value: String(hanMucGD) },
      { key: 'DUNG_LUONG_TEP_TOI_DA_MB', value: String(dungLuong) },
    ],
    { onConflict: 'key' },
  );

  if (error) return { loi: `Không lưu được cài đặt: ${error.message}` };

  revalidatePath('/quan-tri/cai-dat');
  return { ok: 'Đã lưu cài đặt.' };
}
