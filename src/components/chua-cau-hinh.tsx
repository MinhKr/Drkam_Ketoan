/** Đã điền đủ biến môi trường Supabase chưa. Đọc được ở cả máy chủ lẫn trình duyệt. */
export function daCauHinhSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Màn hình thay cho lỗi 500 khi dự án chưa nối với Supabase.
 * Đây là thứ đầu tiên người cài đặt nhìn thấy nên viết thành hướng dẫn luôn.
 */
export function ChuaCauHinh() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="khoi p-8">
        <span className="the the-cho">Chưa nối cơ sở dữ liệu</span>
        <h1 className="mt-3 text-2xl font-bold text-muc">Còn ba bước nữa là chạy được</h1>
        <p className="mt-2 text-sm text-muc-2">
          Phần giao diện đã sẵn sàng. Hệ thống chỉ cần được nối với Supabase để có chỗ lưu
          dữ liệu.
        </p>

        <ol className="mt-6 flex flex-col gap-5">
          <li>
            <p className="font-semibold text-muc">1. Tạo dự án Supabase</p>
            <p className="mt-1 text-sm text-muc-2">
              Vào supabase.com, tạo dự án mới, chọn vùng Singapore cho gần Việt Nam.
            </p>
          </li>
          <li>
            <p className="font-semibold text-muc">2. Chạy bảy file SQL đúng thứ tự</p>
            <ol className="mt-1 flex list-decimal flex-col gap-0.5 pl-5 text-sm text-muc-2">
              <li>
                <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">
                  supabase/migrations/0001_init.sql
                </code>
              </li>
              <li>
                <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">
                  supabase/migrations/0002_nop_ho_so.sql
                </code>
              </li>
              <li>
                <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">
                  supabase/migrations/0003_cap_tai_khoan.sql
                </code>
              </li>
              <li>
                <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">
                  supabase/migrations/0004_phan_cong.sql
                </code>
              </li>
              <li>
                <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">
                  supabase/migrations/0005_ban_in.sql
                </code>
              </li>
              <li>
                <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">
                  supabase/migrations/0006_nguoi_de_nghi.sql
                </code>
              </li>
              <li>
                <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">
                  supabase/seed.sql
                </code>
              </li>
            </ol>
            <p className="mt-1 text-sm text-muc-2">
              Thiếu file nào cũng hỏng, và seed phải chạy sau cùng. Kiểm tra bằng{' '}
              <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">
                npm run kiem-tra-ket-noi
              </code>
              .
            </p>
          </li>
          <li>
            <p className="font-semibold text-muc">3. Điền khóa vào .env.local</p>
            <p className="mt-1 text-sm text-muc-2">
              Chép <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">.env.example</code>{' '}
              thành <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">.env.local</code>,
              lấy ba giá trị ở Project Settings › API dán vào, rồi khởi động lại{' '}
              <code className="rounded bg-mat-2 px-1.5 py-0.5 text-xs">npm run dev</code>.
            </p>
          </li>
        </ol>

        <div className="mt-6 rounded-md border border-vien bg-mat-2 px-4 py-3">
          <p className="text-sm font-semibold text-muc">Sau đó cấp tài khoản cho ban kế toán:</p>
          <p className="mt-1 text-sm text-muc-2">
            Điền email vào{' '}
            <code className="rounded bg-mat-3 px-1.5 py-0.5 text-xs">
              supabase/tai-khoan-ke-toan.sql
            </code>{' '}
            rồi chạy nốt file đó. Hoặc dùng lệnh{' '}
            <code className="rounded bg-mat-3 px-1.5 py-0.5 text-xs">npm run tao-quan-tri</code>{' '}
            nếu chỉ cần một tài khoản quản trị.
          </p>
        </div>

        <p className="mt-5 text-xs text-muc-3">
          Hướng dẫn đầy đủ nằm trong file README.md của dự án.
        </p>
      </div>
    </main>
  );
}
