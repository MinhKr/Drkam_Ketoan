'use client';

import { useActionState } from 'react';
import { luuPhanCong, type KetQua } from '../actions';
import { NutGui } from '@/components/nut-gui';

/** Kèm chức danh cho khỏi nhầm — công ty đang có hai người tên gần giống nhau. */
function nhanDien(k: { full_name: string; job_title: string | null }) {
  return k.job_title ? `${k.full_name} — ${k.job_title}` : k.full_name;
}

export function HangPhanCong({
  phong,
  keToanVien,
  hienTai,
}: {
  phong: { id: string; code: string; name: string };
  keToanVien: { id: string; full_name: string; job_title: string | null; on_leave: boolean }[];
  hienTai: { accountant_id: string; backup_id: string | null } | null;
}) {
  const [ketQua, gui] = useActionState<KetQua, FormData>(luuPhanCong, undefined);

  return (
    <tr>
      <td className="so font-semibold text-muc">{phong.code}</td>
      <td className="font-medium text-muc">{phong.name}</td>
      <td colSpan={3}>
        <form action={gui} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="phongBanId" value={phong.id} />

          <div className="min-w-[190px] flex-1">
            <label className="nhan-o">Kế toán viên phụ trách</label>
            <select
              name="keToanVienId"
              className="o-nhap"
              defaultValue={hienTai?.accountant_id ?? ''}
              required
            >
              <option value="" disabled>
                — Chọn —
              </option>
              {keToanVien.map((k) => (
                <option key={k.id} value={k.id}>
                  {nhanDien(k)}
                  {k.on_leave ? ' (đang nghỉ)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[190px] flex-1">
            <label className="nhan-o">Người thay khi nghỉ</label>
            <select name="nguoiThayId" className="o-nhap" defaultValue={hienTai?.backup_id ?? ''}>
              <option value="">— Không có —</option>
              {keToanVien.map((k) => (
                <option key={k.id} value={k.id}>
                  {nhanDien(k)}
                </option>
              ))}
            </select>
          </div>

          <NutGui lop="nut nut-chinh px-3 py-2 text-sm">Lưu</NutGui>

          {ketQua?.loi && <p className="w-full text-sm text-dau">{ketQua.loi}</p>}
          {ketQua?.ok && <p className="w-full text-sm text-xong">{ketQua.ok}</p>}
        </form>
      </td>
    </tr>
  );
}
