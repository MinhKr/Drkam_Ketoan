'use server';

import { revalidatePath } from 'next/cache';
import { batBuocVaiTro } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { VAI_TRO } from '@/lib/constants';

export type KetQua = { loi?: string; ok?: string } | undefined;

/** Kế toán các cấp đều sửa được danh mục. */
async function batBuocKeToan() {
  await batBuocVaiTro(
    VAI_TRO.KE_TOAN_VIEN,
    VAI_TRO.KE_TOAN_TONG_HOP,
    VAI_TRO.KE_TOAN_TRUONG,
    VAI_TRO.KE_TOAN_NGAN_HANG,
  );
  return createAdminClient();
}

function chuoi(duLieu: FormData, ten: string): string {
  return String(duLieu.get(ten) ?? '').trim();
}

/**
 * Kiểm tra số tài khoản.
 *
 * Đây là chỗ chặn lỗi đã làm hỏng ba số tài khoản trong file Excel cũ:
 * Excel tự đổi số dài thành 6.635E+14 và mất hẳn chữ số.
 */
function kiemTraSoTaiKhoan(stk: string): string | null {
  const sach = stk.replace(/[\s-]/g, '');

  if (!sach) return 'Nhập số tài khoản.';
  if (/[eE]\s*\+/.test(sach) || /^\d+\.\d+[eE]/.test(sach)) {
    return 'Số tài khoản đang ở dạng số khoa học (ví dụ 6.635E+14) — đây là số đã bị Excel làm hỏng, không dùng được. Mở chứng từ gốc và nhập lại đầy đủ từng chữ số.';
  }
  if (sach.includes('.') || sach.includes(',')) {
    return 'Số tài khoản không có dấu chấm hay dấu phẩy. Kiểm tra lại, nhiều khả năng số này đã bị Excel làm tròn.';
  }
  if (!/^[A-Za-z0-9]+$/.test(sach)) {
    return 'Số tài khoản chỉ gồm chữ và số.';
  }
  if (sach.length < 6 || sach.length > 30) {
    return 'Số tài khoản phải dài từ 6 đến 30 ký tự. Kiểm tra lại xem có bị thiếu chữ số không.';
  }
  return null;
}

// ───────────────────────── Nhà cung cấp ─────────────────────────

export async function themNhaCungCap(_truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocKeToan();

  const ten = chuoi(duLieu, 'ten');
  const mst = chuoi(duLieu, 'mst');
  const soDienThoai = chuoi(duLieu, 'soDienThoai');

  if (!ten) return { loi: 'Nhập tên đơn vị hoặc họ tên người nhận tiền.' };

  const { error } = await db
    .from('suppliers')
    .insert({ name: ten, tax_code: mst || null, phone: soDienThoai || null });

  if (error) return { loi: `Không thêm được: ${error.message}` };

  revalidatePath('/danh-muc');
  return { ok: `Đã thêm ${ten}.` };
}

export async function doiTrangThaiNhaCungCap(id: string, hoatDong: boolean) {
  const db = await batBuocKeToan();
  await db.from('suppliers').update({ active: hoatDong }).eq('id', id);
  revalidatePath('/danh-muc');
}

// ───────────────────────── Tài khoản ngân hàng ─────────────────────────

export async function themTaiKhoanNhan(_truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocKeToan();

  const nhaCungCapId = chuoi(duLieu, 'nhaCungCapId');
  const soTaiKhoan = chuoi(duLieu, 'soTaiKhoan').replace(/[\s-]/g, '');
  const nganHang = chuoi(duLieu, 'nganHang');
  const tenChu = chuoi(duLieu, 'tenChuTaiKhoan');

  if (!nhaCungCapId) return { loi: 'Chọn nhà cung cấp.' };
  const loiStk = kiemTraSoTaiKhoan(soTaiKhoan);
  if (loiStk) return { loi: loiStk };
  if (!nganHang) return { loi: 'Chọn hoặc nhập tên ngân hàng.' };
  if (!tenChu) return { loi: 'Nhập tên chủ tài khoản đúng như trên sổ ngân hàng.' };

  const { error } = await db.from('bank_accounts').insert({
    supplier_id: nhaCungCapId,
    account_number: soTaiKhoan,
    bank_name: nganHang,
    account_holder: tenChu,
    is_company_account: false,
  });

  if (error) return { loi: `Không thêm được: ${error.message}` };

  revalidatePath('/danh-muc');
  return { ok: `Đã thêm tài khoản ${soTaiKhoan} — ${nganHang}.` };
}

export async function themTaiKhoanCongTy(_truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocKeToan();

  const soTaiKhoan = chuoi(duLieu, 'soTaiKhoan').replace(/[\s-]/g, '');
  const nganHang = chuoi(duLieu, 'nganHang');
  const tenChu = chuoi(duLieu, 'tenChuTaiKhoan');

  const loiStk = kiemTraSoTaiKhoan(soTaiKhoan);
  if (loiStk) return { loi: loiStk };
  if (!nganHang) return { loi: 'Chọn hoặc nhập tên ngân hàng.' };
  if (!tenChu) return { loi: 'Nhập tên chủ tài khoản.' };

  const { error } = await db.from('bank_accounts').insert({
    supplier_id: null,
    account_number: soTaiKhoan,
    bank_name: nganHang,
    account_holder: tenChu,
    is_company_account: true,
  });

  if (error) return { loi: `Không thêm được: ${error.message}` };

  revalidatePath('/danh-muc/tai-khoan-cong-ty');
  return { ok: `Đã thêm tài khoản chi ${soTaiKhoan}.` };
}

export async function doiTrangThaiTaiKhoan(id: string, hoatDong: boolean, duongDan: string) {
  const db = await batBuocKeToan();
  await db.from('bank_accounts').update({ active: hoatDong }).eq('id', id);
  revalidatePath(duongDan);
}

// ───────────────────────── Loại chi phí ─────────────────────────

export async function themLoaiChiPhi(_truoc: KetQua, duLieu: FormData): Promise<KetQua> {
  const db = await batBuocKeToan();

  const ten = chuoi(duLieu, 'ten');
  if (!ten) return { loi: 'Nhập tên loại chi phí.' };

  const { error } = await db.from('expense_types').insert({ name: ten, sort_order: 50 });

  if (error) {
    return {
      loi: error.code === '23505' ? `Loại chi phí "${ten}" đã có rồi.` : `Không thêm được: ${error.message}`,
    };
  }

  revalidatePath('/danh-muc/loai-chi-phi');
  return { ok: `Đã thêm "${ten}".` };
}

export async function doiTrangThaiLoaiChiPhi(id: string, hoatDong: boolean) {
  const db = await batBuocKeToan();
  await db.from('expense_types').update({ active: hoatDong }).eq('id', id);
  revalidatePath('/danh-muc/loai-chi-phi');
}
