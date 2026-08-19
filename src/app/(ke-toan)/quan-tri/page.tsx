import Link from 'next/link';
import { batBuocVaiTro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VAI_TRO } from '@/lib/constants';

export const metadata = { title: 'Quản trị · DrKam Duyệt Chi' };

const MUC = [
  {
    duongDan: '/quan-tri/phong-ban',
    ten: 'Phòng ban',
    moTa: 'Khai báo các phòng dùng hệ thống. Mã phòng dùng làm tiền tố số BK. Bật/tắt bước trưởng bộ phận duyệt cho từng phòng.',
  },
  {
    duongDan: '/quan-tri/nhan-su',
    ten: 'Nhân sự',
    moTa: 'Danh sách để nhân viên chọn tên khi nộp hồ sơ. Người trong danh sách này không cần mật khẩu.',
  },
  {
    duongDan: '/quan-tri/tai-khoan',
    ten: 'Tài khoản đăng nhập',
    moTa: 'Cấp tài khoản cho kế toán, trưởng bộ phận và giám đốc. Chỉ những người phải duyệt mới cần tài khoản.',
  },
  {
    duongDan: '/quan-tri/phan-cong',
    ten: 'Phân công kế toán viên',
    moTa: 'Phòng nào do kế toán viên nào phụ trách. Chính bảng này quyết định hồ sơ tự chạy về bàn ai.',
  },
  {
    duongDan: '/quan-tri/cai-dat',
    ten: 'Hạn mức và cài đặt',
    moTa: 'Mốc tiền chuyển từ kế toán tổng hợp lên kế toán trưởng, và mốc bắt buộc giám đốc duyệt.',
  },
];

export default async function TrangQuanTri() {
  await batBuocVaiTro(VAI_TRO.QUAN_TRI);
  const supabase = await createClient();

  const [phongBan, nhanSu, taiKhoan, phanCong] = await Promise.all([
    supabase.from('departments').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('staff').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'Hoạt động'),
    supabase.from('accountant_assignments').select('id', { count: 'exact', head: true }),
  ]);

  const soPhong = phongBan.count ?? 0;
  const soPhanCong = phanCong.count ?? 0;
  const thieuPhanCong = soPhong - soPhanCong;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-muc">Quản trị hệ thống</h1>
        <p className="mt-1 text-sm text-muc-2">
          Khai báo tổ chức và phân quyền. Chỉ vai trò Quản trị vào được khu này.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="khoi px-4 py-3">
          <p className="text-xs font-semibold text-muc-3 uppercase">Phòng ban</p>
          <p className="so mt-1 text-2xl font-bold text-muc">{soPhong}</p>
        </div>
        <div className="khoi px-4 py-3">
          <p className="text-xs font-semibold text-muc-3 uppercase">Nhân sự</p>
          <p className="so mt-1 text-2xl font-bold text-muc">{nhanSu.count ?? 0}</p>
        </div>
        <div className="khoi px-4 py-3">
          <p className="text-xs font-semibold text-muc-3 uppercase">Tài khoản</p>
          <p className="so mt-1 text-2xl font-bold text-muc">{taiKhoan.count ?? 0}</p>
        </div>
      </div>

      {thieuPhanCong > 0 && (
        <div className="rounded-md border border-cho/30 bg-cho-nhat px-4 py-3 text-sm text-cho">
          <strong className="font-semibold">
            Còn {thieuPhanCong} phòng chưa có kế toán viên phụ trách.
          </strong>{' '}
          Hồ sơ của những phòng đó nộp lên sẽ không biết chuyển về bàn ai.{' '}
          <Link href="/quan-tri/phan-cong" className="underline">
            Phân công ngay
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {MUC.map((m) => (
          <Link
            key={m.duongDan}
            href={m.duongDan}
            className="khoi flex flex-col gap-1.5 p-5 transition hover:border-chinh hover:shadow-sm"
          >
            <h2 className="font-bold text-muc">{m.ten}</h2>
            <p className="text-sm leading-relaxed text-muc-2">{m.moTa}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
