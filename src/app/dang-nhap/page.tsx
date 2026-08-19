import Link from 'next/link';
import { redirect } from 'next/navigation';
import { layNguoiDangDangNhap } from '@/lib/auth';
import { FormDangNhap } from './form-dang-nhap';
import { ChuaCauHinh, daCauHinhSupabase } from '@/components/chua-cau-hinh';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Đăng nhập · DrKam Duyệt Chi' };

export default async function TrangDangNhap({ searchParams }: PageProps<'/dang-nhap'>) {
  if (!daCauHinhSupabase()) return <ChuaCauHinh />;

  const daDangNhap = await layNguoiDangDangNhap();
  const { tiep } = await searchParams;
  const dich = typeof tiep === 'string' && tiep.startsWith('/') ? tiep : '/bang-dieu-khien';

  if (daDangNhap) redirect(dich);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muc-2 hover:text-chinh">
          ← Về trang chủ
        </Link>
      </div>

      <div className="khoi p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-widest text-chinh uppercase">
          DrKam Duyệt Chi
        </p>
        <h1 className="mt-1 mb-1 text-2xl font-bold text-muc">Đăng nhập</h1>
        <p className="mb-6 text-sm text-muc-2">
          Dành cho kế toán, trưởng bộ phận và giám đốc.
        </p>

        <FormDangNhap tiep={dich} />
      </div>

      <p className="mt-5 text-center text-sm text-muc-2">
        Chỉ cần nộp đề nghị thanh toán?{' '}
        <Link href="/de-nghi/moi" className="font-semibold text-chinh hover:underline">
          Vào thẳng, không cần tài khoản
        </Link>
      </p>
    </main>
  );
}
