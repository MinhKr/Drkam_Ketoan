import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/types';
import {
  TRANG_THAI,
  VAI_TRO_XU_LY,
  KHOA_CAI_DAT,
  CAI_DAT_MAC_DINH,
  type TrangThai,
  type VaiTro,
} from './constants';

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

/**
 * Vai trò nào đang phải xử lý hồ sơ ở trạng thái này.
 * Trả về null với các trạng thái không nằm trên bàn ai cả (Nháp, Trả về, Hoàn thành…).
 */
export function vaiTroXuLy(trangThai: string): VaiTro | null {
  return VAI_TRO_XU_LY[trangThai as TrangThai] ?? null;
}

/**
 * Người này có được thao tác lên hồ sơ đang ở trạng thái này không.
 *
 * Hai điều kiện, phải đủ cả hai:
 *   1. Đúng vai trò của bước đang chờ. Cố tình KHÔNG cho quản trị đi tắt —
 *      quyền quản trị là để khai báo danh mục, không phải để duyệt thay.
 *   2. Hồ sơ đang giao đích danh mình, hoặc chưa giao ai (hàng chờ theo vai trò).
 */
export function duocXuLy(
  nguoiDung: { id: string; roles: string[] },
  hoSo: { status: string; holder_id: string | null },
): boolean {
  const vaiTro = vaiTroXuLy(hoSo.status);
  if (!vaiTro) return false;
  if (!nguoiDung.roles.includes(vaiTro)) return false;
  return hoSo.holder_id === null || hoSo.holder_id === nguoiDung.id;
}

/**
 * Duyệt xong bước đang chờ thì hồ sơ sang trạng thái nào.
 *
 * Trả về null nghĩa là bước này không có thao tác duyệt trong app:
 * "Chờ chi" do kế toán ngân hàng đóng hồ sơ ở giai đoạn 4, còn các trạng thái
 * nghỉ (Nháp, Trả về, Hoàn thành, Đã hủy) thì không nằm trong luồng duyệt.
 */
export function buocKeTiep(
  trangThaiHienTai: string,
  soTien: number,
  hanMuc: { keToanTruong: number; giamDoc: number },
): TrangThai | null {
  switch (trangThaiHienTai) {
    case TRANG_THAI.CHO_TRUONG_BO_PHAN:
      return TRANG_THAI.CHO_KE_TOAN_VIEN;
    case TRANG_THAI.CHO_KE_TOAN_VIEN:
      return buocSauKeToanVien(soTien, hanMuc);
    case TRANG_THAI.CHO_KE_TOAN_TONG_HOP:
    case TRANG_THAI.CHO_KE_TOAN_TRUONG:
      return buocSauKeToan(soTien, hanMuc);
    case TRANG_THAI.CHO_GIAM_DOC:
      return TRANG_THAI.CHO_CHI;
    default:
      return null;
  }
}
