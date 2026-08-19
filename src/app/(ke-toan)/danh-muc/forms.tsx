'use client';

import { useActionState } from 'react';
import {
  themNhaCungCap,
  themTaiKhoanNhan,
  themTaiKhoanCongTy,
  themLoaiChiPhi,
  type KetQua,
} from './actions';
import { DANH_SACH_NGAN_HANG } from '@/lib/constants';
import { NutGui } from '@/components/nut-gui';
import { ThongBao } from '@/components/thong-bao';

function ONganHang({ ten = 'nganHang' }: { ten?: string }) {
  return (
    <>
      <label className="nhan-o" htmlFor={ten}>
        Ngân hàng
      </label>
      <input
        id={ten}
        name={ten}
        className="o-nhap"
        list="ds-ngan-hang"
        placeholder="Techcombank"
        required
      />
      <datalist id="ds-ngan-hang">
        {DANH_SACH_NGAN_HANG.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </>
  );
}

export function FormThemNhaCungCap() {
  const [ketQua, gui] = useActionState<KetQua, FormData>(themNhaCungCap, undefined);

  return (
    <form action={gui} className="khoi flex flex-col gap-4 p-5">
      <h2 className="font-bold text-muc">Thêm nhà cung cấp</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="nhan-o" htmlFor="ten">
            Tên đơn vị / họ tên
          </label>
          <input id="ten" name="ten" className="o-nhap" placeholder="Công ty TNHH…" required />
        </div>
        <div>
          <label className="nhan-o" htmlFor="mst">
            MST hoặc CCCD
          </label>
          <input id="mst" name="mst" className="o-nhap so" />
        </div>
        <div>
          <label className="nhan-o" htmlFor="soDienThoai">
            Số điện thoại
          </label>
          <input id="soDienThoai" name="soDienThoai" className="o-nhap so" />
        </div>
      </div>
      <ThongBao ketQua={ketQua} />
      <div>
        <NutGui>Thêm nhà cung cấp</NutGui>
      </div>
    </form>
  );
}

export function FormThemTaiKhoanNhan({
  nhaCungCap,
}: {
  nhaCungCap: { id: string; name: string }[];
}) {
  const [ketQua, gui] = useActionState<KetQua, FormData>(themTaiKhoanNhan, undefined);

  return (
    <form action={gui} className="khoi flex flex-col gap-4 p-5">
      <div>
        <h2 className="font-bold text-muc">Thêm số tài khoản nhận tiền</h2>
        <p className="mt-1 text-sm text-muc-2">
          Nhập từng chữ số theo chứng từ gốc. Đừng dán từ Excel — Excel hay bóp số dài
          thành dạng <span className="so">6.635E+14</span> và làm mất chữ số.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="nhan-o" htmlFor="nhaCungCapId">
            Của nhà cung cấp
          </label>
          <select id="nhaCungCapId" name="nhaCungCapId" className="o-nhap" required defaultValue="">
            <option value="" disabled>
              — Chọn —
            </option>
            {nhaCungCap.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="nhan-o" htmlFor="soTaiKhoan">
            Số tài khoản
          </label>
          <input
            id="soTaiKhoan"
            name="soTaiKhoan"
            className="o-nhap so"
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </div>
        <div>
          <ONganHang />
        </div>
        <div>
          <label className="nhan-o" htmlFor="tenChuTaiKhoan">
            Tên chủ tài khoản
          </label>
          <input
            id="tenChuTaiKhoan"
            name="tenChuTaiKhoan"
            className="o-nhap uppercase"
            placeholder="NGUYEN VAN A"
            required
          />
        </div>
      </div>

      <ThongBao ketQua={ketQua} />
      <div>
        <NutGui>Thêm số tài khoản</NutGui>
      </div>
    </form>
  );
}

export function FormThemTaiKhoanCongTy() {
  const [ketQua, gui] = useActionState<KetQua, FormData>(themTaiKhoanCongTy, undefined);

  return (
    <form action={gui} className="khoi flex flex-col gap-4 p-5">
      <h2 className="font-bold text-muc">Thêm tài khoản chi của công ty</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="nhan-o" htmlFor="soTaiKhoan">
            Số tài khoản
          </label>
          <input
            id="soTaiKhoan"
            name="soTaiKhoan"
            className="o-nhap so"
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </div>
        <div>
          <ONganHang />
        </div>
        <div>
          <label className="nhan-o" htmlFor="tenChuTaiKhoan">
            Tên chủ tài khoản
          </label>
          <input id="tenChuTaiKhoan" name="tenChuTaiKhoan" className="o-nhap" required />
        </div>
      </div>
      <ThongBao ketQua={ketQua} />
      <div>
        <NutGui>Thêm tài khoản</NutGui>
      </div>
    </form>
  );
}

export function FormThemLoaiChiPhi() {
  const [ketQua, gui] = useActionState<KetQua, FormData>(themLoaiChiPhi, undefined);

  return (
    <form action={gui} className="khoi flex flex-col gap-4 p-5">
      <h2 className="font-bold text-muc">Thêm loại chi phí</h2>
      <div className="sm:max-w-md">
        <label className="nhan-o" htmlFor="ten">
          Tên loại chi phí
        </label>
        <input id="ten" name="ten" className="o-nhap" placeholder="Nạp ads Facebook" required />
      </div>
      <ThongBao ketQua={ketQua} />
      <div>
        <NutGui>Thêm loại chi phí</NutGui>
      </div>
    </form>
  );
}
