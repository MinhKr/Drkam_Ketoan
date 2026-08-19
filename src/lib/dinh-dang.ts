/** Định dạng hiển thị dùng chung toàn hệ thống. */

/** 156000 → "156.000" */
export function dinhDangTien(so: number | null | undefined): string {
  if (so === null || so === undefined || Number.isNaN(so)) return '—';
  return new Intl.NumberFormat('vi-VN').format(so);
}

/** 156000 → "156.000 ₫" */
export function dinhDangTienCoKyHieu(so: number | null | undefined): string {
  if (so === null || so === undefined || Number.isNaN(so)) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(so)} ₫`;
}

/** "156.000" hoặc "156000 đ" → 156000. Trả về 0 nếu không đọc được. */
export function docTienTuChuoi(chuoi: string): number {
  const chiSo = chuoi.replace(/[^\d]/g, '');
  if (!chiSo) return 0;
  const so = Number(chiSo);
  return Number.isSafeInteger(so) ? so : 0;
}

/** "2026-08-19" → "19/08/2026" */
export function dinhDangNgay(ngay: string | Date | null | undefined): string {
  if (!ngay) return '—';
  const d = typeof ngay === 'string' ? new Date(ngay) : ngay;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** "19/08/2026 14:32" */
export function dinhDangNgayGio(ngay: string | Date | null | undefined): string {
  if (!ngay) return '—';
  const d = typeof ngay === 'string' ? new Date(ngay) : ngay;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** "3 ngày trước", "2 giờ trước" — để biết hồ sơ nằm ở một bàn bao lâu rồi. */
export function khoangCachThoiGian(ngay: string | Date | null | undefined): string {
  if (!ngay) return '—';
  const d = typeof ngay === 'string' ? new Date(ngay) : ngay;
  if (Number.isNaN(d.getTime())) return '—';
  const giay = Math.floor((Date.now() - d.getTime()) / 1000);
  if (giay < 60) return 'vừa xong';
  const phut = Math.floor(giay / 60);
  if (phut < 60) return `${phut} phút trước`;
  const gio = Math.floor(phut / 60);
  if (gio < 24) return `${gio} giờ trước`;
  const ngayQua = Math.floor(gio / 24);
  if (ngayQua < 30) return `${ngayQua} ngày trước`;
  const thang = Math.floor(ngayQua / 30);
  if (thang < 12) return `${thang} tháng trước`;
  return `${Math.floor(thang / 12)} năm trước`;
}

/** Tách số tài khoản thành nhóm 4 chữ số cho dễ đối chiếu: "0977 0722 11" */
export function tachNhomSoTaiKhoan(stk: string | null | undefined): string {
  if (!stk) return '—';
  return stk.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

// ───────────────────────── Đọc số thành chữ ─────────────────────────

const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const DON_VI_NHOM = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function docBaChuSo(so: number, coHangCaoHon: boolean): string {
  const tram = Math.floor(so / 100);
  const chuc = Math.floor((so % 100) / 10);
  const donVi = so % 10;
  const phan: string[] = [];

  if (tram > 0) {
    phan.push(CHU_SO[tram], 'trăm');
    if (chuc === 0 && donVi > 0) phan.push('lẻ');
  } else if (coHangCaoHon && (chuc > 0 || donVi > 0)) {
    phan.push('không', 'trăm');
    if (chuc === 0 && donVi > 0) phan.push('lẻ');
  }

  if (chuc > 1) {
    phan.push(CHU_SO[chuc], 'mươi');
    if (donVi === 1) phan.push('mốt');
    else if (donVi === 4) phan.push('tư');
    else if (donVi === 5) phan.push('lăm');
    else if (donVi > 0) phan.push(CHU_SO[donVi]);
  } else if (chuc === 1) {
    phan.push('mười');
    if (donVi === 5) phan.push('lăm');
    else if (donVi > 0) phan.push(CHU_SO[donVi]);
  } else if (donVi > 0) {
    phan.push(CHU_SO[donVi]);
  }

  return phan.join(' ');
}

/**
 * 10155949 → "Mười triệu một trăm năm mươi lăm nghìn chín trăm bốn mươi chín đồng"
 * Đối chiếu đúng với cột HELPER trong file Excel hiện tại.
 */
export function docSoThanhChu(so: number | null | undefined): string {
  if (so === null || so === undefined || !Number.isFinite(so)) return '';
  if (so === 0) return 'Không đồng';

  const am = so < 0;
  let n = Math.abs(Math.round(so));

  const nhom: number[] = [];
  while (n > 0) {
    nhom.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  const phan: string[] = [];
  for (let i = nhom.length - 1; i >= 0; i--) {
    if (nhom[i] === 0) continue;
    phan.push(docBaChuSo(nhom[i], i < nhom.length - 1));
    if (DON_VI_NHOM[i]) phan.push(DON_VI_NHOM[i]);
  }

  const chu = phan.join(' ').replace(/\s+/g, ' ').trim();
  const hoaDau = chu.charAt(0).toUpperCase() + chu.slice(1);
  return am ? `Âm ${chu} đồng` : `${hoaDau} đồng`;
}

/** Sinh mã tra cứu ngẫu nhiên cho link riêng của người nộp. */
export function sinhMaTraCuu(): string {
  const chuCai = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I, O, 0, 1 cho dễ đọc
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chuCai[b % chuCai.length]).join('');
}
