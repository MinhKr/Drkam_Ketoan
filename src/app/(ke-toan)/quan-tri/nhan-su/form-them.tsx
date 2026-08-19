'use client';

import { useActionState } from 'react';
import { themNhanSu, type KetQua } from '../actions';
import { NutGui } from '@/components/nut-gui';
import { ThongBao } from '@/components/thong-bao';

export function FormThemNhanSu({
  phongBan,
}: {
  phongBan: { id: string; code: string; name: string }[];
}) {
  const [ketQua, gui] = useActionState<KetQua, FormData>(themNhanSu, undefined);

  return (
    <form action={gui} className="khoi flex flex-col gap-4 p-5">
      <h2 className="font-bold text-muc">Thêm nhân sự</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="nhan-o" htmlFor="hoTen">
            Họ và tên
          </label>
          <input id="hoTen" name="hoTen" className="o-nhap" placeholder="Hồ Diệu Linh" required />
        </div>
        <div>
          <label className="nhan-o" htmlFor="phongBanId">
            Phòng ban
          </label>
          <select id="phongBanId" name="phongBanId" className="o-nhap" required defaultValue="">
            <option value="" disabled>
              — Chọn phòng —
            </option>
            {phongBan.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="nhan-o" htmlFor="email">
            Email <span className="font-normal text-muc-3">— không bắt buộc</span>
          </label>
          <input id="email" name="email" type="email" className="o-nhap" placeholder="Để nhận link theo dõi hồ sơ" />
        </div>
        <div>
          <label className="nhan-o" htmlFor="soDienThoai">
            Số điện thoại <span className="font-normal text-muc-3">— không bắt buộc</span>
          </label>
          <input id="soDienThoai" name="soDienThoai" className="o-nhap" placeholder="09…" />
        </div>
      </div>

      <ThongBao ketQua={ketQua} />

      <div>
        <NutGui>Thêm nhân sự</NutGui>
      </div>
    </form>
  );
}
