import Link from 'next/link';
import { batBuocDangNhap } from '@/lib/auth';
import { VAI_TRO, VIET_TAT_VAI_TRO, coVaiTro, type VaiTro } from '@/lib/constants';
import { dangXuat } from '../dang-nhap/actions';
import { ChuaCauHinh, daCauHinhSupabase } from '@/components/chua-cau-hinh';

/** Các trang trong khu này phụ thuộc phiên đăng nhập nên không dựng sẵn được. */
export const dynamic = 'force-dynamic';

type MucDieuHuong = {
  duongDan: string;
  nhan: string;
  /** Bỏ trống nghĩa là ai đăng nhập cũng thấy. */
  vaiTro?: VaiTro[];
};

const DIEU_HUONG: MucDieuHuong[] = [
  { duongDan: '/bang-dieu-khien', nhan: 'Chờ tôi xử lý' },
  { duongDan: '/ho-so', nhan: 'Tất cả hồ sơ' },
  { duongDan: '/chi-tien', nhan: 'Chờ chi', vaiTro: [VAI_TRO.KE_TOAN_NGAN_HANG] },
  { duongDan: '/danh-muc', nhan: 'Danh mục', vaiTro: [VAI_TRO.KE_TOAN_VIEN, VAI_TRO.KE_TOAN_TONG_HOP, VAI_TRO.KE_TOAN_TRUONG] },
  { duongDan: '/quan-tri', nhan: 'Quản trị', vaiTro: [VAI_TRO.QUAN_TRI] },
];

export default async function BoCucKeToan({ children }: { children: React.ReactNode }) {
  if (!daCauHinhSupabase()) return <ChuaCauHinh />;

  const nguoiDung = await batBuocDangNhap();

  const mucHienThi = DIEU_HUONG.filter(
    (m) => !m.vaiTro || coVaiTro(nguoiDung.roles, ...m.vaiTro),
  );

  const vietTat = nguoiDung.roles
    .map((r) => VIET_TAT_VAI_TRO[r as VaiTro] ?? r)
    .join(' · ');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="khong-in border-b border-vien bg-mat">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <Link href="/bang-dieu-khien" className="flex items-baseline gap-2">
            <span className="text-xs font-bold tracking-widest text-chinh uppercase">
              DrKam
            </span>
            <span className="text-lg font-bold text-muc">Duyệt Chi</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            {mucHienThi.map((m) => (
              <Link
                key={m.duongDan}
                href={m.duongDan}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muc-2 hover:bg-mat-2 hover:text-muc"
              >
                {m.nhan}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-muc">{nguoiDung.full_name}</p>
              <p className="text-xs text-muc-3">{vietTat || 'Chưa phân vai trò'}</p>
            </div>
            <form action={dangXuat}>
              <button type="submit" className="nut nut-phu px-3 py-1.5 text-sm">
                Thoát
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
