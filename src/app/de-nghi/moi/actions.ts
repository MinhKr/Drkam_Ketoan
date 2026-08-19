'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { sinhMaTraCuu } from '@/lib/dinh-dang';
import { HANH_DONG, TRANG_THAI, LOAI_TEP, HINH_THUC_CHI } from '@/lib/constants';
import { buocDauTien, timKeToanVienPhuTrach } from '@/lib/luong-duyet';

export type DongChiTiet = {
  loaiChiPhi: string;
  noiDung: string;
  soTien: number;
};

export type TepDaTai = {
  duongDan: string;
  tenTep: string;
  kieuTep: string;
  dungLuong: number;
};

export type DuLieuNop = {
  tenNguoiDeNghi: string;
  phongBanId: string;
  hinhThucChi: string;
  hanThanhToan: string;
  ghiChu: string;
  /** Người nhận tiền — người nộp tự gõ theo chứng từ gốc, không lấy từ danh mục */
  tenNguoiNhan: string;
  soTaiKhoanNhan: string;
  nganHangNhan: string;
  tenChuTaiKhoanNhan: string;
  mstCccd: string;
  soDienThoaiLienHe: string;

  dongChiTiet: DongChiTiet[];
  tepDinhKem: TepDaTai[];
  /** true = lưu nháp, chưa gửi đi */
  luuNhap: boolean;
};

export type KetQuaNop = { loi: string } | undefined;

function sachSoTaiKhoan(stk: string): string {
  return stk.replace(/[\s-]/g, '');
}

export async function nopDeNghi(duLieu: DuLieuNop): Promise<KetQuaNop> {
  const db = createAdminClient();

  // ── Kiểm tra người đề nghị ──────────────────────────────────
  // Người nộp tự gõ tên và chỉ chọn phòng ban — không tra bảng nhân sự nữa.
  const tenNguoiDeNghi = duLieu.tenNguoiDeNghi.trim();
  if (!tenNguoiDeNghi) return { loi: 'Nhập họ tên của bạn.' };
  if (!duLieu.phongBanId) return { loi: 'Chọn phòng ban của bạn.' };

  const { data: phong } = await db
    .from('departments')
    .select('id, code, requires_head_approval, active')
    .eq('id', duLieu.phongBanId)
    .maybeSingle();

  if (!phong) return { loi: 'Không tìm thấy phòng ban vừa chọn. Tải lại trang giúp bạn.' };
  if (!phong.active) return { loi: 'Phòng ban của bạn đang ngừng hoạt động. Báo quản trị giúp bạn.' };

  // ── Kiểm tra các dòng chi tiết ──────────────────────────────
  const dong = duLieu.dongChiTiet.filter((d) => d.noiDung.trim() || d.soTien > 0);

  if (dong.length === 0) return { loi: 'Thêm ít nhất một dòng nội dung thanh toán.' };

  for (const [i, d] of dong.entries()) {
    if (!d.noiDung.trim()) return { loi: `Dòng ${i + 1}: chưa ghi nội dung thanh toán.` };
    if (!Number.isSafeInteger(d.soTien) || d.soTien <= 0) {
      return { loi: `Dòng ${i + 1}: số tiền phải lớn hơn 0.` };
    }
  }

  const tongTien = dong.reduce((t, d) => t + d.soTien, 0);
  if (tongTien <= 0) return { loi: 'Tổng số tiền phải lớn hơn 0.' };

  // ── Kiểm tra thông tin người nhận tiền ──────────────────────
  const chuyenKhoan = duLieu.hinhThucChi === HINH_THUC_CHI.CHUYEN_KHOAN;

  let tenNguoiNhan: string | null = null;
  let soTaiKhoan: string | null = null;
  let nganHang: string | null = null;
  let tenChuTaiKhoan: string | null = null;

  if (chuyenKhoan) {
    // Người nộp tự gõ theo chứng từ gốc — mục 3 không lấy dữ liệu từ danh mục.
    const stk = sachSoTaiKhoan(duLieu.soTaiKhoanNhan);

    if (!duLieu.tenNguoiNhan.trim()) return { loi: 'Nhập tên đơn vị hoặc người nhận tiền.' };
    if (!stk) return { loi: 'Nhập số tài khoản nhận tiền.' };
    if (/[eE]\s*\+/.test(stk) || stk.includes('.') || stk.includes(',')) {
      return {
        loi: 'Số tài khoản đang ở dạng số khoa học hoặc có dấu chấm — đây là số đã bị Excel làm hỏng. Mở chứng từ gốc và gõ lại từng chữ số.',
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

  // ── Chứng từ ────────────────────────────────────────────────
  // KHÔNG bắt buộc. Đề nghị thanh toán là xin công ty trả tiền hộ, nên lúc nộp
  // thường chưa có gì trong tay: hóa đơn và ủy nhiệm chi chỉ có SAU khi chi.
  // Kế toán thiếu giấy tờ gì thì trả về kèm lý do.

  // ── Cấp số BK ───────────────────────────────────────────────
  const { data: soBK, error: loiSo } = await db.rpc('next_request_code', {
    p_department_id: phong.id,
  });

  if (loiSo || !soBK) {
    return { loi: `Không cấp được số BK: ${loiSo?.message ?? 'lỗi không rõ'}` };
  }

  // ── Trạng thái và người giữ hồ sơ ───────────────────────────
  const trangThai = duLieu.luuNhap
    ? TRANG_THAI.NHAP
    : buocDauTien(phong.requires_head_approval);

  let nguoiGiuId: string | null = null;
  if (trangThai === TRANG_THAI.CHO_KE_TOAN_VIEN) {
    nguoiGiuId = await timKeToanVienPhuTrach(db, phong.id);
    if (!nguoiGiuId) {
      return {
        loi: `Phòng của bạn chưa được phân công kế toán viên phụ trách nên hồ sơ chưa biết gửi cho ai. Báo kế toán khai báo giúp (Quản trị › Phân công).`,
      };
    }
  }

  const maTraCuu = sinhMaTraCuu();

  // ── Ghi hồ sơ ───────────────────────────────────────────────
  const { data: hoSo, error: loiHoSo } = await db
    .from('payment_requests')
    .insert({
      code: soBK,
      lookup_token: maTraCuu,
      department_id: phong.id,
      // Không còn trỏ vào bảng nhân sự: tên do chính người nộp gõ vào.
      requester_id: null,
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
      status: trangThai,
      holder_id: nguoiGiuId,
      submitted_at: duLieu.luuNhap ? null : new Date().toISOString(),
    })
    .select('id, code, lookup_token')
    .single();

  if (loiHoSo || !hoSo) {
    return { loi: `Không lưu được hồ sơ: ${loiHoSo?.message ?? 'lỗi không rõ'}` };
  }

  // ── Dòng chi tiết ───────────────────────────────────────────
  const { error: loiDong } = await db.from('request_lines').insert(
    dong.map((d, i) => ({
      request_id: hoSo.id,
      line_no: i + 1,
      expense_type: d.loaiChiPhi.trim() || null,
      description: d.noiDung.trim(),
      amount: d.soTien,
    })),
  );

  if (loiDong) {
    await db.from('payment_requests').delete().eq('id', hoSo.id);
    return { loi: `Không lưu được nội dung thanh toán: ${loiDong.message}` };
  }

  // ── Tệp đính kèm ────────────────────────────────────────────
  if (duLieu.tepDinhKem.length > 0) {
    await db.from('attachments').insert(
      duLieu.tepDinhKem.map((t) => ({
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
      action: HANH_DONG.NOP,
      from_status: null,
      to_status: trangThai,
      actor_id: null,
      actor_name: tenNguoiDeNghi,
      actor_role: 'Người đề nghị',
      note: null,
    });
  }

  redirect(`/tra-cuu/${hoSo.lookup_token}?vuaNop=1`);
}
