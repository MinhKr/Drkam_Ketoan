import Link from 'next/link';

export const metadata = { title: 'Không đủ quyền · DrKam Duyệt Chi' };

export default function KhongDuQuyen() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-muc">Bạn không có quyền vào mục này</h1>
      <p className="mt-3 text-muc-2">
        Vai trò của bạn chưa được cấp quyền xem trang vừa mở. Nếu bạn nghĩ đây là nhầm
        lẫn, liên hệ quản trị hệ thống để cập nhật lại vai trò.
      </p>
      <div className="mt-6">
        <Link href="/bang-dieu-khien" className="nut nut-chinh">
          Về hộp việc của tôi
        </Link>
      </div>
    </main>
  );
}
