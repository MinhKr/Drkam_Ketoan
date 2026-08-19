/**
 * Hằng số nghiệp vụ của DrKam Duyệt Chi.
 *
 * Giá trị lưu trong cơ sở dữ liệu để nguyên tiếng Việt, khớp với ràng buộc
 * `check (... in (...))` trong supabase/migrations/0001_init.sql — nhìn thẳng
 * vào Table Editor của Supabase là đọc hiểu được, không phải tra bảng mã.
 */

// ───────────────────────── Vai trò ─────────────────────────

export const VAI_TRO = {
  TRUONG_BO_PHAN: 'Trưởng bộ phận',
  KE_TOAN_VIEN: 'Kế toán viên',
  KE_TOAN_TONG_HOP: 'Kế toán tổng hợp',
  KE_TOAN_TRUONG: 'Kế toán trưởng',
  KE_TOAN_NGAN_HANG: 'Kế toán ngân hàng',
  GIAM_DOC: 'Giám đốc',
  QUAN_TRI: 'Quản trị',
} as const

export type VaiTro = (typeof VAI_TRO)[keyof typeof VAI_TRO]

export const DANH_SACH_VAI_TRO: VaiTro[] = Object.values(VAI_TRO)

export const VIET_TAT_VAI_TRO: Record<VaiTro, string> = {
  'Trưởng bộ phận': 'TBP',
  'Kế toán viên': 'KTV',
  'Kế toán tổng hợp': 'KTTH',
  'Kế toán trưởng': 'KTT',
  'Kế toán ngân hàng': 'KTNH',
  'Giám đốc': 'GĐ',
  'Quản trị': 'ADM',
}

export function coVaiTro(vaiTro: string[] | null | undefined, ...canCo: VaiTro[]): boolean {
  if (!vaiTro?.length) return false
  return canCo.some((v) => vaiTro.includes(v))
}

// ───────────────────────── Trạng thái hồ sơ ─────────────────────────

export const TRANG_THAI = {
  NHAP: 'Nháp',
  CHO_TRUONG_BO_PHAN: 'Chờ trưởng bộ phận',
  CHO_KE_TOAN_VIEN: 'Chờ kế toán viên',
  CHO_KE_TOAN_TONG_HOP: 'Chờ kế toán tổng hợp',
  CHO_KE_TOAN_TRUONG: 'Chờ kế toán trưởng',
  CHO_GIAM_DOC: 'Chờ giám đốc',
  CHO_CHI: 'Chờ chi',
  HOAN_THANH: 'Hoàn thành',
  TRA_VE: 'Trả về',
  DA_HUY: 'Đã hủy',
} as const

export type TrangThai = (typeof TRANG_THAI)[keyof typeof TRANG_THAI]

/** Nhóm màu hiển thị. Dùng chung cho mọi màn hình để trạng thái luôn nhất quán. */
export const MAU_TRANG_THAI: Record<TrangThai, 'cho' | 'xong' | 'tra' | 'nghi'> = {
  'Nháp': 'nghi',
  'Chờ trưởng bộ phận': 'cho',
  'Chờ kế toán viên': 'cho',
  'Chờ kế toán tổng hợp': 'cho',
  'Chờ kế toán trưởng': 'cho',
  'Chờ giám đốc': 'cho',
  'Chờ chi': 'cho',
  'Hoàn thành': 'xong',
  'Trả về': 'tra',
  'Đã hủy': 'nghi',
}

/**
 * Vai trò nào xử lý trạng thái nào — đây là bảng dựng nên hộp việc
 * "Chờ tôi xử lý" của từng người.
 */
export const VAI_TRO_XU_LY: Partial<Record<TrangThai, VaiTro>> = {
  'Chờ trưởng bộ phận': VAI_TRO.TRUONG_BO_PHAN,
  'Chờ kế toán viên': VAI_TRO.KE_TOAN_VIEN,
  'Chờ kế toán tổng hợp': VAI_TRO.KE_TOAN_TONG_HOP,
  'Chờ kế toán trưởng': VAI_TRO.KE_TOAN_TRUONG,
  'Chờ giám đốc': VAI_TRO.GIAM_DOC,
  'Chờ chi': VAI_TRO.KE_TOAN_NGAN_HANG,
}

/** Trạng thái nào coi là còn đang chạy (chưa xong, chưa hủy). */
export const TRANG_THAI_DANG_CHAY: TrangThai[] = [
  TRANG_THAI.CHO_TRUONG_BO_PHAN,
  TRANG_THAI.CHO_KE_TOAN_VIEN,
  TRANG_THAI.CHO_KE_TOAN_TONG_HOP,
  TRANG_THAI.CHO_KE_TOAN_TRUONG,
  TRANG_THAI.CHO_GIAM_DOC,
  TRANG_THAI.CHO_CHI,
]

// ───────────────────────── Hành động trong nhật ký ─────────────────────────

export const HANH_DONG = {
  NOP: 'Nộp hồ sơ',
  DUYET: 'Duyệt',
  TRA_VE: 'Trả về',
  NOP_LAI: 'Sửa và nộp lại',
  CHI: 'Chi tiền',
  HUY: 'Hủy hồ sơ',
} as const

export type HanhDong = (typeof HANH_DONG)[keyof typeof HANH_DONG]

// ───────────────────────── Hình thức chi & loại tệp ─────────────────────────

export const HINH_THUC_CHI = {
  CHUYEN_KHOAN: 'Chuyển khoản',
  TIEN_MAT: 'Tiền mặt',
} as const

export type HinhThucChi = (typeof HINH_THUC_CHI)[keyof typeof HINH_THUC_CHI]

export const LOAI_TEP = {
  CHUNG_TU: 'Chứng từ',
  UNC: 'Ủy nhiệm chi',
  PHIEU_CHI: 'Phiếu chi',
} as const

export type LoaiTep = (typeof LOAI_TEP)[keyof typeof LOAI_TEP]

// ───────────────────────── Khóa cài đặt ─────────────────────────

export const KHOA_CAI_DAT = {
  HAN_MUC_KE_TOAN_TRUONG: 'HAN_MUC_KE_TOAN_TRUONG',
  HAN_MUC_GIAM_DOC: 'HAN_MUC_GIAM_DOC',
  DUNG_LUONG_TEP_TOI_DA_MB: 'DUNG_LUONG_TEP_TOI_DA_MB',
  TEN_CONG_TY: 'TEN_CONG_TY',
  DIA_CHI_CONG_TY: 'DIA_CHI_CONG_TY',
  // Những dòng chữ cố định trên bản in phiếu ĐNTT
  THANH_PHO: 'THANH_PHO',
  KINH_GUI: 'KINH_GUI',
  GHI_CHU_MAU_PHIEU: 'GHI_CHU_MAU_PHIEU',
  TEN_GIAM_DOC: 'TEN_GIAM_DOC',
} as const

/**
 * Trần cứng cho một lần tải tệp lên, tính bằng MB.
 *
 * Vercel chặn mọi request nặng quá 4,5 MB ngay ở cổng, trước khi mã của mình
 * chạy — nên tệp to sẽ hỏng kèm lỗi khó hiểu chứ không ra được thông báo
 * tiếng Việt. Chặn sẵn ở 4 MB cho chắc.
 *
 * Cài đặt DUNG_LUONG_TEP_TOI_DA_MB vẫn là quy định của công ty; con số nào
 * nhỏ hơn thì con số đó có hiệu lực. Tự dựng máy chủ riêng thì bỏ trần này đi.
 */
export const GIOI_HAN_TAI_LEN_MB = 4

/** Dùng khi bảng settings chưa có dòng tương ứng. */
export const CAI_DAT_MAC_DINH: Record<string, string> = {
  HAN_MUC_KE_TOAN_TRUONG: '20000000',
  HAN_MUC_GIAM_DOC: '50000000',
  DUNG_LUONG_TEP_TOI_DA_MB: '10',
  TEN_CONG_TY: 'CÔNG TY CỔ PHẦN THE FAMIDOC VIỆT NAM',
  DIA_CHI_CONG_TY:
    'P.14-15A, Tầng 7, Charmvit Tower, Số 117 Trần Duy Hưng, Q.Cầu Giấy, Hà Nội',
  THANH_PHO: 'Hà Nội',
  KINH_GUI: 'Ban Giám đốc Công ty Cổ phần The Famidoc Việt Nam',
  GHI_CHU_MAU_PHIEU: 'Ban hành kèm QT-PKT-01 của P.TCKT',
  TEN_GIAM_DOC: '',
}

// ───────────────────────── Ngân hàng ─────────────────────────

/** Gợi ý nhanh. Người dùng vẫn gõ được tên ngân hàng khác. */
export const DANH_SACH_NGAN_HANG = [
  'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank', 'MB', 'ACB',
  'VPBank', 'Sacombank', 'TPBank', 'VIB', 'SHB', 'MSB', 'HDBank', 'OCB',
  'SeABank', 'Eximbank', 'LPBank', 'Nam A Bank', 'BVBank', 'PVcomBank',
  'ABBANK', 'Bac A Bank', 'Kienlongbank', 'VietABank', 'BaoViet Bank',
]
