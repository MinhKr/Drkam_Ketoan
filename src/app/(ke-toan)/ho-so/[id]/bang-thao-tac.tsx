'use client';

import { useActionState, useState } from 'react';
import { duyetHoSo, traVeHoSo, huyHoSo, type KetQuaDuyet } from './actions';
import { NutGui } from '@/components/nut-gui';
import { ThongBao } from '@/components/thong-bao';

/**
 * Khung thao tác của người đang giữ hồ sơ.
 *
 * Nút nào hiện ra là do trang cha quyết định, nhưng quyền thật vẫn kiểm tra
 * lại trong server action — ở đây chỉ là giao diện.
 */
export function BangThaoTac({
  id,
  duyetDuoc,
  traVeDuoc,
  huyDuoc,
  trangThaiKeTiep,
}: {
  id: string;
  duyetDuoc: boolean;
  traVeDuoc: boolean;
  huyDuoc: boolean;
  trangThaiKeTiep: string | null;
}) {
  const [ketQuaDuyet, guiDuyet] = useActionState<KetQuaDuyet, FormData>(
    duyetHoSo.bind(null, id),
    undefined,
  );
  const [ketQuaTraVe, guiTraVe] = useActionState<KetQuaDuyet, FormData>(
    traVeHoSo.bind(null, id),
    undefined,
  );
  const [ketQuaHuy, guiHuy] = useActionState<KetQuaDuyet, FormData>(
    huyHoSo.bind(null, id),
    undefined,
  );

  const [moTraVe, datMoTraVe] = useState(false);
  const [moHuy, datMoHuy] = useState(false);

  if (!duyetDuoc && !traVeDuoc && !huyDuoc) return null;

  return (
    <div className="khoi mt-5 p-5">
      <h2 className="font-bold text-muc">Thao tác của bạn</h2>
      <p className="mt-1 text-sm text-muc-2">
        Đối chiếu bản giấy đã ký với chứng từ trên đây trước khi bấm duyệt.
      </p>

      {/* ── Duyệt ────────────────────────────────────────── */}
      {duyetDuoc && (
        <form action={guiDuyet} className="mt-4 flex flex-col gap-3 border-t border-vien pt-4">
          <div>
            <label className="nhan-o" htmlFor="ghiChu">
              Ghi chú (không bắt buộc)
            </label>
            <input
              id="ghiChu"
              name="ghiChu"
              className="o-nhap"
              placeholder="Đã đối chiếu hóa đơn gốc…"
            />
          </div>
          <ThongBao ketQua={ketQuaDuyet} />
          <div>
            <NutGui dangChay="Đang duyệt…">
              {trangThaiKeTiep ? `Duyệt — chuyển sang ${trangThaiKeTiep}` : 'Duyệt'}
            </NutGui>
          </div>
        </form>
      )}

      {/* ── Trả về ───────────────────────────────────────── */}
      {traVeDuoc && (
        <div className="mt-4 border-t border-vien pt-4">
          {!moTraVe ? (
            <button type="button" className="nut nut-phu" onClick={() => datMoTraVe(true)}>
              Trả hồ sơ về người đề nghị
            </button>
          ) : (
            <form action={guiTraVe} className="flex flex-col gap-3">
              <div>
                <label className="nhan-o" htmlFor="lyDoTraVe">
                  Lý do trả về — người nộp đọc đúng dòng này để sửa
                </label>
                <textarea
                  id="lyDoTraVe"
                  name="lyDo"
                  rows={3}
                  className="o-nhap"
                  placeholder="Thiếu hóa đơn đỏ của khoản 2, số tài khoản không khớp với hợp đồng…"
                  required
                  autoFocus
                />
              </div>
              <ThongBao ketQua={ketQuaTraVe} />
              <div className="flex gap-2">
                <NutGui lop="nut nut-dau" dangChay="Đang trả về…">
                  Trả về
                </NutGui>
                <button type="button" className="nut nut-phu" onClick={() => datMoTraVe(false)}>
                  Thôi
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Hủy hồ sơ ────────────────────────────────────── */}
      {huyDuoc && (
        <div className="mt-4 border-t border-vien pt-4">
          {!moHuy ? (
            <button
              type="button"
              className="text-sm text-muc-3 hover:text-dau"
              onClick={() => datMoHuy(true)}
            >
              Hủy hồ sơ này
            </button>
          ) : (
            <form action={guiHuy} className="flex flex-col gap-3">
              <p className="text-sm text-muc-2">
                Hủy là đóng hẳn hồ sơ, người nộp không sửa lại được nữa. Nộp trùng hay nộp
                nhầm phòng thì dùng cách này.
              </p>
              <div>
                <label className="nhan-o" htmlFor="lyDoHuy">
                  Lý do hủy
                </label>
                <input id="lyDoHuy" name="lyDo" className="o-nhap" required autoFocus />
              </div>
              <ThongBao ketQua={ketQuaHuy} />
              <div className="flex gap-2">
                <NutGui lop="nut nut-dau" dangChay="Đang hủy…">
                  Hủy hồ sơ
                </NutGui>
                <button type="button" className="nut nut-phu" onClick={() => datMoHuy(false)}>
                  Thôi
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
