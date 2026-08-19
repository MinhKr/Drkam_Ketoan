import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { ChuaCauHinh, daCauHinhSupabase } from '@/components/chua-cau-hinh';
import { FormDeNghi } from './form-de-nghi';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Nộp đề nghị thanh toán · DrKam Duyệt Chi' };

export default async function TrangDeNghiMoi() {
  if (!daCauHinhSupabase()) return <ChuaCauHinh />;

  // Người đề nghị không đăng nhập nên dữ liệu danh mục lấy qua máy chủ.
  const db = createAdminClient();

  const [phongBanKq, loaiChiPhiKq] = await Promise.all([
    db
      .from('departments')
      .select('id, code, name')
      .eq('active', true)
      .order('sort_order')
      .order('name'),
    db.from('expense_types').select('name').eq('active', true).order('sort_order'),
  ]);

  const phongBan = phongBanKq.data ?? [];

  const loaiChiPhi = (loaiChiPhiKq.data ?? []).map((l) => l.name);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-muc-2 hover:text-chinh">
            ← Về trang chủ
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-muc sm:text-3xl">
            Đề nghị thanh toán
          </h1>
          <p className="mt-1 text-sm text-muc-2">
            Không cần tài khoản. Điền xong bấm Nộp là hồ sơ tự chạy tới kế toán phụ trách
            phòng bạn.
          </p>
        </div>
        <Link href="/tra-cuu" className="text-sm text-chinh hover:underline">
          Tra cứu hồ sơ đã nộp
        </Link>
      </div>

      {phongBan.length === 0 ? (
        <div className="khoi p-6">
          <p className="font-semibold text-muc">Chưa có phòng ban nào</p>
          <p className="mt-1 text-sm text-muc-2">
            Kế toán cần khai báo phòng ban trong mục Quản trị trước khi mọi người nộp
            được hồ sơ.
          </p>
        </div>
      ) : (
        <FormDeNghi phongBan={phongBan} loaiChiPhi={loaiChiPhi} />
      )}
    </main>
  );
}
