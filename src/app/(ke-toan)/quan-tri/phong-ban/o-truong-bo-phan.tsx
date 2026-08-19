'use client';

import { useActionState } from 'react';
import { luuTenTruongBoPhan, type KetQua } from '../actions';
import { NutGui } from '@/components/nut-gui';

/**
 * Ô sửa nhanh tên trưởng bộ phận ngay trên bảng.
 * Tên này chỉ để in lên phiếu ĐNTT cho người ta ký tay, không phải phân quyền.
 */
export function OTruongBoPhan({ id, tenHienTai }: { id: string; tenHienTai: string | null }) {
  const [ketQua, gui] = useActionState<KetQua, FormData>(
    luuTenTruongBoPhan.bind(null, id),
    undefined,
  );

  return (
    <form action={gui} className="flex items-center gap-2">
      <input
        name="tenTruongBoPhan"
        className="o-nhap py-1.5 text-sm"
        defaultValue={tenHienTai ?? ''}
        placeholder="— để trống —"
      />
      <NutGui lop="nut nut-phu px-2.5 py-1 text-xs" dangChay="…">
        Lưu
      </NutGui>
      {ketQua?.ok && <span className="text-xs text-xong">{ketQua.ok}</span>}
      {ketQua?.loi && <span className="text-xs text-dau">{ketQua.loi}</span>}
    </form>
  );
}
