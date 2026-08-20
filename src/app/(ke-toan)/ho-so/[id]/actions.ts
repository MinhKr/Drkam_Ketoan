'use server';

import { revalidatePath } from 'next/cache';
import { batBuocDangNhap } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { HANH_DONG, HINH_THUC_CHI, LOAI_TEP, TRANG_THAI, VAI_TRO, coVaiTro } from '@/lib/constants';
import {
  buocKeTiep,
  duocXuLy,
  layHanMuc,
  timKeToanVienPhuTrach,
  vaiTroXuLy,
} from '@/lib/luong-duyet';
import type { Profile, TrangThaiHoSo } from '@/lib/supabase/types';
import type { TepDaTai } from '@/app/de-nghi/moi/actions';

export type KetQuaDuyet = { loi?: string; ok?: string } | undefined;

/** Các cột cần để quyết định bước tiếp theo của hồ sơ. */
const COT_CAN =
  'id, code, status, total_amount, payment_method, holder_id, department_id, return_count';

type HoSoTomTat = {
  id: string;
  code: string;
  status: TrangThaiHoSo;
  total_amount: number;
  payment_method: string;
  holder_id: string | null;
  department_id: string;
  return_count: number;
};

function chuoi(duLieu: FormData, ten: string): string {
  return String(duLieu.get(ten) ?? '').trim();
}

/**
 * Mở hồ sơ và kiểm tra người đang đăng nhập có được thao tác lên nó không.
 *
 * Kiểm tra lại ở đây chứ không tin vào việc nút có hiện ra hay không: mỗi
 * server action là một endpoint POST, ai biết đường cũng gọi thẳng được.
 */
async function moHoSoDeXuLy(
  id: string,
): Promise<{ loi: string } | { nguoiDung: Profile; hoSo: HoSoTomTat }> {
  const nguoiDung = await batBuocDangNhap();
  const db = createAdminClient();

  const { data } = await db.from('payment_requests').select(COT_CAN).eq('id', id).maybeSingle();
  const hoSo = data as HoSoTomTat | null;

  if (!hoSo) return { loi: 'Không tìm thấy hồ sơ này.' };

  if (!duocXuLy(nguoiDung, hoSo)) {
    const vaiTroCanCo = vaiTroXuLy(hoSo.status);

    if (!vaiTroCanCo) {
      return {
        loi: `Hồ sơ đang ở trạng thái "${hoSo.status}" nên không còn nằm trên bàn ai để duyệt.`,
      };
    }
    if (!nguoiDung.roles.includes(vaiTroCanCo)) {
      return { loi: `Hồ sơ đang chờ ${vaiTroCanCo.toLowerCase()} xử lý, không phải bàn của bạn.` };
    }

    // Đúng vai trò nhưng hồ sơ giao đích danh người khác.
    const { data: nguoiGiu } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', hoSo.holder_id ?? '')
      .maybeSingle();

    return {
      loi: `Hồ sơ này giao cho ${nguoiGiu?.full_name ?? 'người khác'} phụ trách. Muốn đổi người thì sửa ở Quản trị › Phân công.`,
    };
  }

  return { nguoiDung, hoSo };
}

/** Làm mới những trang có hiển thị hồ sơ này. */
function lamMoi(id: string) {
  revalidatePath(`/ho-so/${id}`);
  revalidatePath('/ho-so');
  revalidatePath('/bang-dieu-khien');
  revalidatePath('/chi-tien');
}

// ───────────────────────── Duyệt ─────────────────────────

export async function duyetHoSo(
  id: string,
  _truoc: KetQuaDuyet,
  duLieu: FormData,
): Promise<KetQuaDuyet> {
  const mo = await moHoSoDeXuLy(id);
  if ('loi' in mo) return { loi: mo.loi };
  const { nguoiDung, hoSo } = mo;

  const db = createAdminClient();
  const hanMuc = await layHanMuc(db);
  const trangThaiMoi = buocKeTiep(hoSo.status, hoSo.total_amount, hanMuc);

  if (!trangThaiMoi) {
    return {
      loi:
        hoSo.status === TRANG_THAI.CHO_CHI
          ? 'Hồ sơ đã duyệt xong, giờ là bước chi tiền — dùng khung "Ghi nhận đã chi" chứ không phải nút duyệt.'
          : `Hồ sơ ở trạng thái "${hoSo.status}" không có bước duyệt nào.`,
    };
  }

  // Chỉ bước về tay kế toán viên mới giao đích danh. Các bước sau nằm ở hàng
  // chờ chung theo vai trò — ai giữ vai trò đó cũng mở ra duyệt được.
  let nguoiGiuMoi: string | null = null;
  if (trangThaiMoi === TRANG_THAI.CHO_KE_TOAN_VIEN) {
    nguoiGiuMoi = await timKeToanVienPhuTrach(db, hoSo.department_id);
    if (!nguoiGiuMoi) {
      return {
        loi: 'Phòng ban của hồ sơ chưa được phân công kế toán viên phụ trách (Quản trị › Phân công).',
      };
    }
  }

  // Ràng buộc status ngay trong câu update: hai người cùng bấm duyệt một lúc
  // thì người sau không đẩy hồ sơ đi tiếp thêm một bước nữa.
  const { data: daSua, error } = await db
    .from('payment_requests')
    .update({ status: trangThaiMoi, holder_id: nguoiGiuMoi })
    .eq('id', hoSo.id)
    .eq('status', hoSo.status)
    .select('id');

  if (error) return { loi: `Không duyệt được: ${error.message}` };
  if (!daSua?.length) {
    return { loi: 'Hồ sơ vừa được người khác xử lý. Tải lại trang để xem trạng thái mới nhất.' };
  }

  await db.from('request_events').insert({
    request_id: hoSo.id,
    action: HANH_DONG.DUYET,
    from_status: hoSo.status,
    to_status: trangThaiMoi,
    actor_id: nguoiDung.id,
    actor_name: nguoiDung.full_name,
    actor_role: vaiTroXuLy(hoSo.status),
    note: chuoi(duLieu, 'ghiChu') || null,
  });

  lamMoi(hoSo.id);
  return { ok: `Đã duyệt ${hoSo.code}. Hồ sơ chuyển sang "${trangThaiMoi}".` };
}

// ───────────────────────── Trả về ─────────────────────────

/**
 * Trả hồ sơ thẳng về người đề nghị, bắt buộc ghi lý do.
 *
 * Không trả lùi từng bước một: người sửa được hồ sơ là người nộp, nên trả về
 * cho khâu trước chỉ làm hồ sơ đi vòng thêm một lượt rồi cũng về tới đó.
 */
export async function traVeHoSo(
  id: string,
  _truoc: KetQuaDuyet,
  duLieu: FormData,
): Promise<KetQuaDuyet> {
  const mo = await moHoSoDeXuLy(id);
  if ('loi' in mo) return { loi: mo.loi };
  const { nguoiDung, hoSo } = mo;

  const lyDo = chuoi(duLieu, 'lyDo');
  if (lyDo.length < 5) {
    return { loi: 'Ghi rõ lý do trả về để người nộp biết phải sửa gì (ít nhất 5 ký tự).' };
  }

  const db = createAdminClient();

  const { data: daSua, error } = await db
    .from('payment_requests')
    .update({
      status: TRANG_THAI.TRA_VE,
      holder_id: null,
      last_return_reason: lyDo,
      return_count: hoSo.return_count + 1,
    })
    .eq('id', hoSo.id)
    .eq('status', hoSo.status)
    .select('id');

  if (error) return { loi: `Không trả về được: ${error.message}` };
  if (!daSua?.length) {
    return { loi: 'Hồ sơ vừa được người khác xử lý. Tải lại trang để xem trạng thái mới nhất.' };
  }

  await db.from('request_events').insert({
    request_id: hoSo.id,
    action: HANH_DONG.TRA_VE,
    from_status: hoSo.status,
    to_status: TRANG_THAI.TRA_VE,
    actor_id: nguoiDung.id,
    actor_name: nguoiDung.full_name,
    actor_role: vaiTroXuLy(hoSo.status),
    note: lyDo,
  });

  lamMoi(hoSo.id);
  return { ok: `Đã trả ${hoSo.code} về cho người đề nghị.` };
}

// ───────────────────────── Hủy hồ sơ ─────────────────────────

/**
 * Đóng hẳn một hồ sơ không đi tiếp được: nộp trùng, nộp nhầm phòng, khoản chi
 * đã bỏ. Chỉ kế toán trưởng và quản trị làm được, và chỉ khi chưa chi tiền.
 *
 * Hồ sơ hủy vẫn nằm nguyên trong cơ sở dữ liệu cùng toàn bộ nhật ký của nó.
 */
export async function huyHoSo(
  id: string,
  _truoc: KetQuaDuyet,
  duLieu: FormData,
): Promise<KetQuaDuyet> {
  const nguoiDung = await batBuocDangNhap();

  if (!coVaiTro(nguoiDung.roles, VAI_TRO.KE_TOAN_TRUONG, VAI_TRO.QUAN_TRI)) {
    return { loi: 'Chỉ kế toán trưởng hoặc quản trị mới hủy được hồ sơ.' };
  }

  const lyDo = chuoi(duLieu, 'lyDo');
  if (lyDo.length < 5) return { loi: 'Ghi rõ lý do hủy (ít nhất 5 ký tự).' };

  const db = createAdminClient();
  const { data } = await db.from('payment_requests').select(COT_CAN).eq('id', id).maybeSingle();
  const hoSo = data as HoSoTomTat | null;

  if (!hoSo) return { loi: 'Không tìm thấy hồ sơ này.' };
  if (hoSo.status === TRANG_THAI.HOAN_THANH) {
    return { loi: 'Hồ sơ đã chi xong thì không hủy được nữa.' };
  }
  if (hoSo.status === TRANG_THAI.DA_HUY) return { loi: 'Hồ sơ này đã hủy rồi.' };

  const { data: daSua, error } = await db
    .from('payment_requests')
    .update({ status: TRANG_THAI.DA_HUY, holder_id: null })
    .eq('id', hoSo.id)
    .eq('status', hoSo.status)
    .select('id');

  if (error) return { loi: `Không hủy được: ${error.message}` };
  if (!daSua?.length) {
    return { loi: 'Hồ sơ vừa được người khác xử lý. Tải lại trang để xem trạng thái mới nhất.' };
  }

  await db.from('request_events').insert({
    request_id: hoSo.id,
    action: HANH_DONG.HUY,
    from_status: hoSo.status,
    to_status: TRANG_THAI.DA_HUY,
    actor_id: nguoiDung.id,
    actor_name: nguoiDung.full_name,
    actor_role: coVaiTro(nguoiDung.roles, VAI_TRO.KE_TOAN_TRUONG)
      ? VAI_TRO.KE_TOAN_TRUONG
      : VAI_TRO.QUAN_TRI,
    note: lyDo,
  });

  lamMoi(hoSo.id);
  return { ok: `Đã hủy hồ sơ ${hoSo.code}.` };
}

// ──────────────────── Chi tiền và đóng hồ sơ ────────────────────

export type DuLieuChi = {
  /** Số Ủy nhiệm chi, hoặc số phiếu chi nếu chi tiền mặt. */
  soUNC: string;
  /** yyyy-mm-dd */
  ngayChi: string;
  /** Tài khoản công ty chọn từ danh mục. Để trống nếu gõ tay. */
  taiKhoanChiId: string;
  taiKhoanChiGoTay: string;
  soTienChi: number;
  ghiChu: string;
  tepChungTuChi: TepDaTai[];
};

/**
 * Bước cuối: kế toán ngân hàng chi tiền rồi đóng hồ sơ.
 *
 * Thứ tự ghi cố tình đặt bảng `payments` lên trước: cột request_id của bảng đó
 * là unique, nên chính nó là cái khóa chặn chi hai lần cho cùng một hồ sơ —
 * chắc hơn là tự đi kiểm tra trạng thái rồi mới ghi.
 */
export async function chiTien(id: string, duLieu: DuLieuChi): Promise<KetQuaDuyet> {
  const mo = await moHoSoDeXuLy(id);
  if ('loi' in mo) return { loi: mo.loi };
  const { nguoiDung, hoSo } = mo;

  if (hoSo.status !== TRANG_THAI.CHO_CHI) {
    return { loi: `Hồ sơ đang ở trạng thái "${hoSo.status}", chưa tới bước chi tiền.` };
  }

  const chuyenKhoan = hoSo.payment_method === HINH_THUC_CHI.CHUYEN_KHOAN;
  const soUNC = duLieu.soUNC.trim();
  const ghiChu = duLieu.ghiChu.trim();

  // ── Kiểm tra ────────────────────────────────────────────────
  if (!/^\d{4}-\d{2}-\d{2}$/.test(duLieu.ngayChi)) return { loi: 'Chọn ngày chi.' };
  if (duLieu.ngayChi > new Date().toISOString().slice(0, 10)) {
    return { loi: 'Ngày chi không đặt sau hôm nay được.' };
  }

  if (!Number.isSafeInteger(duLieu.soTienChi) || duLieu.soTienChi <= 0) {
    return { loi: 'Số tiền đã chi phải lớn hơn 0.' };
  }
  // Lệch với số đề nghị thì phải nói rõ vì sao — phần lớn là gõ nhầm.
  if (duLieu.soTienChi !== hoSo.total_amount && ghiChu.length < 5) {
    return {
      loi: 'Số tiền chi khác số tiền đề nghị. Ghi rõ lý do vào ô ghi chú (ít nhất 5 ký tự).',
    };
  }

  if (chuyenKhoan) {
    if (!soUNC) return { loi: 'Nhập số Ủy nhiệm chi.' };
    if (duLieu.tepChungTuChi.length === 0) {
      return {
        loi: 'Đính kèm bản Ủy nhiệm chi. Đây là chứng từ đối chiếu khi kiểm toán, đính kèm ngay lúc chi chứ không bổ sung sau được.',
      };
    }
  }

  const db = createAdminClient();

  // ── Tài khoản chi ───────────────────────────────────────────
  let taiKhoanChi = duLieu.taiKhoanChiGoTay.trim() || null;

  if (duLieu.taiKhoanChiId) {
    const { data: tk } = await db
      .from('bank_accounts')
      .select('account_number, bank_name')
      .eq('id', duLieu.taiKhoanChiId)
      .eq('is_company_account', true)
      .maybeSingle();

    if (!tk) return { loi: 'Tài khoản chi vừa chọn không còn trong danh mục tài khoản công ty.' };
    taiKhoanChi = `${tk.account_number} · ${tk.bank_name}`;
  }

  if (chuyenKhoan && !taiKhoanChi) return { loi: 'Chọn tài khoản công ty đã chi tiền đi.' };

  // ── Ghi nhận chi ────────────────────────────────────────────
  const { data: daChi, error: loiChi } = await db
    .from('payments')
    .insert({
      request_id: hoSo.id,
      unc_number: soUNC || null,
      paid_at: duLieu.ngayChi,
      from_account: taiKhoanChi,
      amount_paid: duLieu.soTienChi,
      performed_by: nguoiDung.id,
    })
    .select('id')
    .maybeSingle();

  if (loiChi) {
    return {
      loi:
        loiChi.code === '23505'
          ? `Hồ sơ ${hoSo.code} đã có người ghi nhận chi rồi. Tải lại trang để xem.`
          : `Không ghi nhận được khoản chi: ${loiChi.message}`,
    };
  }

  // ── Đóng hồ sơ ──────────────────────────────────────────────
  const { data: daSua, error } = await db
    .from('payment_requests')
    .update({
      status: TRANG_THAI.HOAN_THANH,
      holder_id: null,
      completed_at: new Date().toISOString(),
      company_account_id: duLieu.taiKhoanChiId || null,
    })
    .eq('id', hoSo.id)
    .eq('status', TRANG_THAI.CHO_CHI)
    .select('id');

  if (error || !daSua?.length) {
    // Không đóng được hồ sơ thì gỡ luôn dòng chi vừa ghi, để lần sau làm lại
    // từ đầu chứ không để hồ sơ mang một khoản chi treo lơ lửng.
    if (daChi) await db.from('payments').delete().eq('id', daChi.id);
    return {
      loi: error
        ? `Không đóng được hồ sơ: ${error.message}`
        : 'Hồ sơ vừa được người khác xử lý. Tải lại trang để xem trạng thái mới nhất.',
    };
  }

  // ── Chứng từ chi ────────────────────────────────────────────
  if (duLieu.tepChungTuChi.length > 0) {
    await db.from('attachments').insert(
      duLieu.tepChungTuChi.map((t) => ({
        request_id: hoSo.id,
        kind: chuyenKhoan ? LOAI_TEP.UNC : LOAI_TEP.PHIEU_CHI,
        file_name: t.tenTep,
        storage_path: t.duongDan,
        mime_type: t.kieuTep,
        size_bytes: t.dungLuong,
        uploaded_by: nguoiDung.id,
        uploaded_by_name: nguoiDung.full_name,
      })),
    );
  }

  // ── Nhật ký ─────────────────────────────────────────────────
  const moTa = [
    soUNC && `${chuyenKhoan ? 'UNC' : 'Phiếu chi'} số ${soUNC}`,
    taiKhoanChi && `chi từ ${taiKhoanChi}`,
    ghiChu,
  ]
    .filter(Boolean)
    .join(' · ');

  await db.from('request_events').insert({
    request_id: hoSo.id,
    action: HANH_DONG.CHI,
    from_status: TRANG_THAI.CHO_CHI,
    to_status: TRANG_THAI.HOAN_THANH,
    actor_id: nguoiDung.id,
    actor_name: nguoiDung.full_name,
    actor_role: VAI_TRO.KE_TOAN_NGAN_HANG,
    note: moTa || null,
  });

  lamMoi(hoSo.id);
  return { ok: `Đã chi và đóng hồ sơ ${hoSo.code}.` };
}
