'use client';

import { useFormStatus } from 'react-dom';

export function NutGui({
  children,
  dangChay,
  lop = 'nut nut-chinh',
}: {
  children: React.ReactNode;
  dangChay?: string;
  lop?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={lop} disabled={pending}>
      {pending ? (dangChay ?? 'Đang lưu…') : children}
    </button>
  );
}
