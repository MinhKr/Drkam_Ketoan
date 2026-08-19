import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/types';
import { TRANG_THAI, KHOA_CAI_DAT, CAI_DAT_MAC_DINH, type TrangThai } from './constants';

type Db = SupabaseClient<Database>;

/** Hạn mức đọc từ bảng settings, có giá trị dự phòng nếu chưa khai báo. */
export async function layHanMuc(db: Db) {
  const { data } = await db
    .from('settings')
    .select('key, value')
    .in('key', [KHOA_CAI_DAT.HAN_MUC_KE_TOAN_TRUONG, KHOA_CAI_DAT.HAN_MUC_GIAM_DOC]);

  const banDo = new Map((data ?? []).map((c) => [c.key, c.value]));
  const doc = (khoa: string) =>
    Number(banDo.get(khoa) ?? CAI_DAT_MAC_DINH[khoa]);

  return {
    keToanTruong: doc(KHOA_CAI_DAT.HAN_MUC_KE_TOAN_TRUONG),
    giamDoc: doc(KHOA_CAI_DAT.HAN_MUC_GIAM_DOC),
  };
}

/**
 * Bước đầu tiên của hồ sơ sau khi nộp.
 *
 * Phòng có bật trưởng bộ phận duyệt thì dừng ở đó trước.
 * Không thì đi thẳng tới kế toán viên phụ trách phòng.
 */
export function buocDauTien(canTruongBoPhanDuyet: boolean): TrangThai {
  return canTruongBoPhanDuyet ? TRANG_THAI.CHO_TRUONG_BO_PHAN : TRANG_THAI.CHO_KE_TOAN_VIEN;
}

/**
 * Kế toán viên nào nhận hồ sơ của phòng này.
 * Trả về người thay nếu kế toán viên chính đang bật chế độ vắng mặt.
 */
export async function timKeToanVienPhuTrach(
  db: Db,
  phongBanId: string,
): Promise<string | null> {
  const { data } = await db
    .from('accountant_assignments')
    .select('accountant_id, backup_id, accountant:profiles!accountant_assignments_accountant_id_fkey(on_leave, status)')
    .eq('department_id', phongBanId)
    .maybeSingle();

  if (!data) return null;

  const chinh = data.accountant as unknown as
    | { on_leave: boolean; status: string }
    | null;

  const chinhKhongNhanDuoc =
    !chinh || chinh.on_leave || chinh.status !== 'Hoạt động';

  if (chinhKhongNhanDuoc && data.backup_id) return data.backup_id;
  return data.accountant_id;
}

/**
 * Sau khi kế toán viên duyệt, hồ sơ đi tới đâu — theo hạn mức số tiền.
 */
export function buocSauKeToanVien(
  soTien: number,
  hanMuc: { keToanTruong: number },
): TrangThai {
  return soTien >= hanMuc.keToanTruong
    ? TRANG_THAI.CHO_KE_TOAN_TRUONG
    : TRANG_THAI.CHO_KE_TOAN_TONG_HOP;
}

/**
 * Sau khi kế toán duyệt xong: hồ sơ lớn phải qua giám đốc, còn lại sang chi luôn.
 */
export function buocSauKeToan(
  soTien: number,
  hanMuc: { giamDoc: number },
): TrangThai {
  return soTien >= hanMuc.giamDoc ? TRANG_THAI.CHO_GIAM_DOC : TRANG_THAI.CHO_CHI;
}

/** Mô tả đường đi của hồ sơ để hiện cho người nộp thấy trước. */
export function moTaDuongDi(
  soTien: number,
  canTruongBoPhanDuyet: boolean,
  hanMuc: { keToanTruong: number; giamDoc: number },
): string[] {
  const buoc: string[] = [];
  if (canTruongBoPhanDuyet) buoc.push('Trưởng bộ phận');
  buoc.push('Kế toán viên');
  buoc.push(soTien >= hanMuc.keToanTruong ? 'Kế toán trưởng' : 'Kế toán tổng hợp');
  if (soTien >= hanMuc.giamDoc) buoc.push('Giám đốc');
  buoc.push('Kế toán ngân hàng');
  return buoc;
}
