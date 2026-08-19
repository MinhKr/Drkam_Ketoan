import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Tra cứu hồ sơ · DrKam Duyệt Chi' };

async function traCuu(duLieu: FormData) {
  'use server';
  const ma = String(duLieu.get('ma') ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!ma) return;
  redirect(`/tra-cuu/${ma}`);
}

export default function TrangTraCuu() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muc-2 hover:text-chinh">
          ← Về trang chủ
        </Link>
      </div>

      <div className="khoi p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-muc">Tra cứu hồ sơ</h1>
        <p className="mt-1 mb-5 text-sm text-muc-2">
          Nhập mã tra cứu bạn nhận được lúc nộp hồ sơ để xem đang chờ ai xử lý.
        </p>

        <form action={traCuu} className="flex flex-col gap-4">
          <div>
            <label className="nhan-o" htmlFor="ma">
              Mã tra cứu
            </label>
            <input
              id="ma"
              name="ma"
              className="o-nhap so uppercase tracking-widest"
              placeholder="VD: K7M2PQ8XTR4NB9WD"
              autoComplete="off"
              required
            />
          </div>
          <button type="submit" className="nut nut-chinh w-full">
            Xem hồ sơ
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-muc-2">
        Mất mã rồi?{' '}
        <span className="text-muc-3">Hỏi kế toán phụ trách phòng bạn, họ tra được theo số BK.</span>
      </p>
    </main>
  );
}
