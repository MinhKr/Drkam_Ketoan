import Link from 'next/link';

const MUC = [
  { duongDan: '/danh-muc', nhan: 'Nhà cung cấp' },
  { duongDan: '/danh-muc/tai-khoan-cong-ty', nhan: 'Tài khoản công ty' },
  { duongDan: '/danh-muc/loai-chi-phi', nhan: 'Loại chi phí' },
];

export function DieuHuongDanhMuc({ dangO }: { dangO: string }) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-vien pb-3">
      {MUC.map((m) => (
        <Link
          key={m.duongDan}
          href={m.duongDan}
          className={
            m.duongDan === dangO
              ? 'rounded-md bg-chinh-nhat px-3 py-1.5 text-sm font-semibold text-chinh'
              : 'rounded-md px-3 py-1.5 text-sm font-medium text-muc-2 hover:bg-mat-2'
          }
        >
          {m.nhan}
        </Link>
      ))}
    </nav>
  );
}
