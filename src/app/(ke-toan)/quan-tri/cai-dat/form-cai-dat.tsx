'use client';

import { useActionState, useState } from 'react';
import { luuCaiDat, type KetQua } from '../actions';
import { dinhDangTien, docSoThanhChu, docTienTuChuoi } from '@/lib/dinh-dang';
import { NutGui } from '@/components/nut-gui';
import { ThongBao } from '@/components/thong-bao';

function ONhapTien({
  ten,
  nhan,
  giaTriDau,
  giaiThich,
}: {
  ten: string;
  nhan: string;
  giaTriDau: string;
  giaiThich: string;
}) {
  const [giaTri, datGiaTri] = useState(dinhDangTien(Number(giaTriDau)));
  const so = docTienTuChuoi(giaTri);

  return (
    <div>
      <label className="nhan-o" htmlFor={ten}>
        {nhan}
      </label>
      <input
        id={ten}
        name={ten}
        className="o-nhap so"
        inputMode="numeric"
        value={giaTri}
        onChange={(e) => datGiaTri(dinhDangTien(docTienTuChuoi(e.target.value)))}
      />
      <p className="mt-1 text-xs text-muc-3">{giaiThich}</p>
      {so > 0 && <p className="mt-0.5 text-xs text-chinh">{docSoThanhChu(so)}</p>}
    </div>
  );
}

export function FormCaiDat({
  hanMucKeToanTruong,
  hanMucGiamDoc,
  dungLuongTepToiDaMb,
}: {
  hanMucKeToanTruong: string;
  hanMucGiamDoc: string;
  dungLuongTepToiDaMb: string;
}) {
  const [ketQua, gui] = useActionState<KetQua, FormData>(luuCaiDat, undefined);

  return (
    <form action={gui} className="khoi flex flex-col gap-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <ONhapTien
          ten="hanMucKeToanTruong"
          nhan="Hạn mức kế toán trưởng"
          giaTriDau={hanMucKeToanTruong}
          giaiThich="Dưới mức này thì kế toán tổng hợp duyệt. Từ mức này trở lên thì kế toán trưởng duyệt."
        />
        <ONhapTien
          ten="hanMucGiamDoc"
          nhan="Hạn mức giám đốc"
          giaTriDau={hanMucGiamDoc}
          giaiThich="Từ mức này trở lên, hồ sơ phải qua giám đốc duyệt sau khi kế toán đã duyệt."
        />
      </div>

      <div className="sm:max-w-xs">
        <label className="nhan-o" htmlFor="dungLuongTepToiDaMb">
          Dung lượng tối đa mỗi tệp đính kèm (MB)
        </label>
        <input
          id="dungLuongTepToiDaMb"
          name="dungLuongTepToiDaMb"
          className="o-nhap so"
          inputMode="numeric"
          defaultValue={dungLuongTepToiDaMb}
        />
        <p className="mt-1 text-xs text-muc-3">
          Ảnh chụp từ điện thoại được nén trước khi tải lên nên hiếm khi chạm mức này.
        </p>
      </div>

      <ThongBao ketQua={ketQua} />

      <div>
        <NutGui>Lưu cài đặt</NutGui>
      </div>
    </form>
  );
}
