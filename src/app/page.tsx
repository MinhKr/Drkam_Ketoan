import Link from 'next/link';

/**
 * Màn hình đầu tiên — hai lối vào.
 * Nhân viên các phòng vào thẳng không cần tài khoản.
 * Kế toán, trưởng bộ phận và giám đốc thì đăng nhập.
 */
export default function TrangChu() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
      <div className="mb-10">
        <p className="text-sm font-semibold tracking-widest text-chinh uppercase">
          DrKam
        </p>
        <h1 className="mt-1 text-3xl font-bold text-muc sm:text-4xl">Duyệt Chi</h1>
        <p className="mt-3 max-w-xl text-muc-2">
          Nộp và duyệt Đề nghị thanh toán. Bạn cần làm gì hôm nay?
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/de-nghi/moi"
          className="khoi group flex flex-col gap-3 border-t-4 border-t-chinh p-6 transition hover:border-chinh hover:shadow-sm"
        >
          <span className="the the-xong self-start">Không cần tài khoản</span>
          <h2 className="text-xl font-bold text-muc">Tôi cần đề nghị thanh toán</h2>
          <p className="text-sm leading-relaxed text-muc-2">
            Chọn tên mình, điền nội dung và đính kèm chứng từ. Nộp xong bạn nhận một
            đường link riêng để theo dõi hồ sơ.
          </p>
          <span className="mt-auto pt-2 text-sm font-semibold text-chinh group-hover:underline">
            Bắt đầu nộp hồ sơ →
          </span>
        </Link>

        <Link
          href="/dang-nhap"
          className="khoi group flex flex-col gap-3 border-t-4 border-t-dau p-6 transition hover:border-vien hover:shadow-sm"
        >
          <span className="the the-tra self-start">Cần đăng nhập</span>
          <h2 className="text-xl font-bold text-muc">Tôi là kế toán</h2>
          <p className="text-sm leading-relaxed text-muc-2">
            Đăng nhập để xem hộp việc “Chờ tôi xử lý”, kiểm tra chứng từ và duyệt hồ sơ.
            Trưởng bộ phận và giám đốc cũng vào lối này.
          </p>
          <span className="mt-auto pt-2 text-sm font-semibold text-chinh group-hover:underline">
            Đăng nhập →
          </span>
        </Link>
      </div>

      <div className="mt-8">
        <Link href="/tra-cuu" className="text-sm text-muc-2 underline hover:text-chinh">
          Đã nộp hồ sơ rồi? Tra cứu bằng mã hồ sơ
        </Link>
      </div>
    </main>
  );
}
