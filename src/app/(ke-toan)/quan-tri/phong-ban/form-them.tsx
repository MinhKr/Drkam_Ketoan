'use client';

import { useActionState } from 'react';
import { themPhongBan, type KetQua } from '../actions';
import { NutGui } from '@/components/nut-gui';
import { ThongBao } from '@/components/thong-bao';

export function FormThemPhongBan() {
  const [ketQua, gui] = useActionState<KetQua, FormData>(themPhongBan, undefined);

  return (
    <form action={gui} className="khoi flex flex-col gap-4 p-5">
      <h2 className="font-bold text-muc">Thêm phòng ban</h2>

      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <div>
          <label className="nhan-o" htmlFor="ma">
            Mã phòng
          </label>
          <input id="ma" name="ma" className="o-nhap uppercase" placeholder="MKT" required />
        </div>
        <div>
          <label className="nhan-o" htmlFor="ten">
            Tên phòng
          </label>
          <input id="ten" name="ten" className="o-nhap" placeholder="Marketing" required />
        </div>
      </div>

      <div>
        <label className="nhan-o" htmlFor="tenTruongBoPhan">
          Trưởng bộ phận <span className="font-normal text-muc-3">(in sẵn trên phiếu)</span>
        </label>
        <input
          id="tenTruongBoPhan"
          name="tenTruongBoPhan"
          className="o-nhap"
          placeholder="Hồ Diệu Linh"
        />
        <p className="mt-1 text-xs text-muc-3">
          Tên này in ở ô ký trên phiếu ĐNTT để trưởng bộ phận ký tay. Để trống thì ô đó
          bỏ trắng.
        </p>
      </div>

      <ThongBao ketQua={ketQua} />

      <div>
        <NutGui>Thêm phòng ban</NutGui>
      </div>
    </form>
  );
}
