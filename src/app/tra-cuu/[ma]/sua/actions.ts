'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { HANH_DONG, TRANG_THAI, LOAI_TEP, HINH_THUC_CHI } from '@/lib/constants';
import { buocDauTien, timKeToanVienPhuTrach } from '@/lib/luong-duyet';
import type { DuLieuNop, KetQuaNop } from '@/app/de-nghi/moi/actions';

function sachSoTaiKhoan(stk: string): string {
  return stk.replace(/[\s-]/g, '');
}

/**
 * Sửa lại hồ sơ nháp hoặc hồ sơ bị trả về rồi nộp (lại).
 *
 * Hồ sơ giữ nguyên số BK và mã tra cứu — người nộp mở đúng link cũ.
 * Chỉ hồ sơ ở trạng thái Nháp hoặc Trả về mới sửa được; hồ sơ đang nằm
 * trên bàn ai đó thì không ai sửa sau lưng họ được.
 */
export async function capNhatDeNghi(
  maTraCuu: string,
  duLieu: DuLieuNop,
): Promise<KetQuaNop> {
  const db = createAdminClient();

  const { data: hoSo } = await db
    .from('payment_requests')
    .select('id, code, status, lookup_token, department_id, return_count')
    .eq('lookup_token', maTraCuu.toUpperCase())
    .maybeSingle();

  if (!hoSo) return { loi: 'Không tìm thấy hồ sơ với mã này.' };

  const laNhap = hoSo.status === TRANG_THAI.NHAP;
  const biTraVe = hoSo.status === TRANG_THAI.TRA_VE;

  if (!laNhap && !biTraVe) {
    return {
      loi: `Hồ sơ đang ở trạng thái "${hoSo.status}" nên không sửa được nữa. Chỉ hồ sơ nháp hoặc hồ sơ bị trả về mới sửa được.`,
    };
  }

  // ── Người đề nghị ───────────────────────────────────────────
  const tenNguoiDeNghi = duLieu.tenNguoiDeNghi.trim();
  if (!tenNguoiDeNghi) return { loi: 'Nhập họ tên của bạn.' };

  // Số BK đã cấp theo phòng cũ nên không cho đổi sang phòng khác.
  if (duLieu.phongBanId && duLieu.phongBanId !== hoSo.department_id) {
    return {
      loi: `Hồ sơ ${hoSo.code} đã cấp số theo phòng cũ nên không đổi sang phòng khác được. Hủy hồ sơ này và nộp hồ sơ mới giúp bạn.`,
    };
  }

  const { data: phong } = await db
    .from('departments')
    .select('id, code, requires_head_approval, active')
    .eq('id', hoSo.department_id)
    .maybeSingle();

  if (!phong?.active) return { loi: 'Phòng ban của bạn đang ngừng hoạt động.' };

  // ── Dòng chi tiết ───────────────────────────────────────────
  const dong = duLieu.dongChiTiet.filter((d) => d.noiDung.trim() || d.soTien > 0);
  if (dong.length === 0) return { loi: 'Thêm ít nhất một dòng nội dung thanh toán.' };

  for (const [i, d] of dong.entries()) {
    if (!d.noiDung.trim()) return { loi: `Dòng ${i + 1}: chưa ghi nội dung thanh toán.` };
    if (!Number.isSafeInteger(d.soTien) || d.soTien <= 0) {
      return { loi: `Dòng ${i + 1}: số tiền phải lớn hơn 0.` };
    }
  }

  const tongTien = dong.reduce((t, d) => t + d.soTien, 0);

  // ── Người nhận tiền ─────────────────────────────────────────
  const chuyenKhoan = duLieu.hinhThucChi === HINH_THUC_CHI.CHUYEN_KHOAN;

  let tenNguoiNhan: string | null = null;
  let soTaiKhoan: string | null = null;
  let nganHang: string | null = null;
  let tenChuTaiKhoan: string | null = null;

  if (chuyenKhoan) {
    const stk = sachSoTaiKhoan(duLieu.soTaiKhoanNhan);

    if (!duLieu.tenNguoiNhan.trim()) return { loi: 'Nhập tên đơn vị hoặc người nhận tiền.' };
    if (!stk) return { loi: 'Nhập số tài khoản nhận tiền.' };
    if (/[eE]\s*\+/.test(stk) || stk.includes('.') || stk.includes(',')) {
      return {
        loi: 'Số tài khoản đang ở dạng số khoa học hoặc có dấu chấm — số này đã bị Excel làm hỏng. Mở chứng từ gốc và gõ lại từng chữ số.',
      };
    }
    if (!/^[A-Za-z0-9]{6,30}$/.test(stk)) {
      return { loi: 'Số tài khoản chỉ gồm chữ và số, dài từ 6 đến 30 ký tự.' };
    }
    if (!duLieu.nganHangNhan.trim()) return { loi: 'Nhập tên ngân hàng nhận tiền.' };
    if (!duLieu.tenChuTaiKhoanNhan.trim()) return { loi: 'Nhập tên chủ tài khoản.' };

    tenNguoiNhan = duLieu.tenNguoiNhan.trim();
    soTaiKhoan = stk;
    nganHang = duLieu.nganHangNhan.trim();
    tenChuTaiKhoan = duLieu.tenChuTaiKhoanNhan.trim();
  } else {
    if (!duLieu.tenNguoiNhan.trim()) return { loi: 'Nhập họ tên người nhận tiền mặt.' };
    tenNguoiNhan = duLieu.tenNguoiNhan.trim();
  }

  // ── Trạng thái mới ──────────────────────────────────────────
  const trangThaiMoi = duLieu.luuNhap
    ? TRANG_THAI.NHAP
    : buocDauTien(phong.requires_head_approval);

  let nguoiGiuId: string | null = null;
  if (trangThaiMoi === TRANG_THAI.CHO_KE_TOAN_VIEN) {
    nguoiGiuId = await timKeToanVienPhuTrach(db, phong.id);
    if (!nguoiGiuId) {
      return {
        loi: 'Phòng của bạn chưa được phân công kế toán viên phụ trách. Báo kế toán khai báo giúp (Quản trị › Phân công).',
      };
    }
  }

  // ── Cập nhật hồ sơ ──────────────────────────────────────────
  const { error: loiCapNhat } = await db
    .from('payment_requests')
    .update({
      // Sửa lại tên người đề nghị cũng được — tên này in lên phiếu.
      requester_name: tenNguoiDeNghi,
      due_date: duLieu.hanThanhToan || null,
      payment_method: chuyenKhoan ? HINH_THUC_CHI.CHUYEN_KHOAN : HINH_THUC_CHI.TIEN_MAT,
      total_amount: tongTien,
      // Không nối vào danh mục nhà cung cấp: người nộp gõ tay từng lần.
      supplier_id: null,
      beneficiary_name: tenNguoiNhan,
      tax_code: duLieu.mstCccd.trim() || null,
      contact_phone: duLieu.soDienThoaiLienHe.trim() || null,
      recipient_account: soTaiKhoan,
      recipient_bank: nganHang,
      recipient_holder: tenChuTaiKhoan,
      note: duLieu.ghiChu.trim() || null,
      status: trangThaiMoi,
      holder_id: nguoiGiuId,
      submitted_at: duLieu.luuNhap ? null : new Date().toISOString(),
    })
    .eq('id', hoSo.id);

  if (loiCapNhat) return { loi: `Không lưu được hồ sơ: ${loiCapNhat.message}` };

  // ── Thay toàn bộ dòng chi tiết ──────────────────────────────
  await db.from('request_lines').delete().eq('request_id', hoSo.id);
  const { error: loiDong } = await db.from('request_lines').insert(
    dong.map((d, i) => ({
      request_id: hoSo.id,
      line_no: i + 1,
      expense_type: d.loaiChiPhi.trim() || null,
      description: d.noiDung.trim(),
      amount: d.soTien,
    })),
  );
  if (loiDong) return { loi: `Không lưu được nội dung thanh toán: ${loiDong.message}` };

  // ── Đồng bộ tệp đính kèm ────────────────────────────────────
  // Chỉ đụng tới chứng từ. Ủy nhiệm chi và phiếu chi do kế toán tải lên, giữ nguyên.
  const duongDanConLai = duLieu.tepDinhKem.map((t) => t.duongDan);

  const { data: tepHienCo } = await db
    .from('attachments')
    .select('id, storage_path')
    .eq('request_id', hoSo.id)
    .eq('kind', LOAI_TEP.CHUNG_TU);

  const canXoa = (tepHienCo ?? []).filter((t) => !duongDanConLai.includes(t.storage_path));
  if (canXoa.length > 0) {
    await db
      .from('attachments')
      .delete()
      .in('id', canXoa.map((t) => t.id));
    await db.storage.from('chung-tu').remove(canXoa.map((t) => t.storage_path));
  }

  const daCo = new Set((tepHienCo ?? []).map((t) => t.storage_path));
  const tepMoi = duLieu.tepDinhKem.filter((t) => !daCo.has(t.duongDan));
  if (tepMoi.length > 0) {
    await db.from('attachments').insert(
      tepMoi.map((t) => ({
        request_id: hoSo.id,
        kind: LOAI_TEP.CHUNG_TU,
        file_name: t.tenTep,
        storage_path: t.duongDan,
        mime_type: t.kieuTep,
        size_bytes: t.dungLuong,
        uploaded_by: null,
        uploaded_by_name: tenNguoiDeNghi,
      })),
    );
  }

  // ── Nhật ký ─────────────────────────────────────────────────
  if (!duLieu.luuNhap) {
    await db.from('request_events').insert({
      request_id: hoSo.id,
      action: biTraVe ? HANH_DONG.NOP_LAI : HANH_DONG.NOP,
      from_status: hoSo.status,
      to_status: trangThaiMoi,
      actor_id: null,
      actor_name: tenNguoiDeNghi,
      actor_role: 'Người đề nghị',
      note: null,
    });
  }

  redirect(`/tra-cuu/${hoSo.lookup_token}?vuaNop=1`);
}
