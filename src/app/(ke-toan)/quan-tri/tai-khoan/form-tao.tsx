'use client';

import { useActionState } from 'react';
import { taoTaiKhoan, type KetQua } from '../actions';
import { DANH_SACH_VAI_TRO } from '@/lib/constants';
import { NutGui } from '@/components/nut-gui';
import { ThongBao } from '@/components/thong-bao';

export function FormTaoTaiKhoan({
  nhanSuChuaCoTaiKhoan,
}: {
  nhanSuChuaCoTaiKhoan: { id: string; full_name: string; phong: string }[];
}) {
  const [ketQua, gui] = useActionState<KetQua, FormData>(taoTaiKhoan, undefined);

  return (
    <form action={gui} className="khoi flex flex-col gap-4 p-5">
      <div>
        <h2 className="font-bold text-muc">Cấp tài khoản đăng nhập</h2>
        <p className="mt-1 text-sm text-muc-2">
          Chỉ cấp cho người phải duyệt hồ sơ. Nhân viên chỉ nộp đề nghị thì không cần.
        </p>
      </div>

      {nhanSuChuaCoTaiKhoan.length === 0 ? (
        <p className="rounded-md border border-cho/30 bg-cho-nhat px-3 py-2 text-sm text-cho">
          Mọi nhân sự đều đã có tài khoản. Thêm nhân sự mới ở mục Nhân sự trước.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="nhan-o" htmlFor="nhanSuId">
                Nhân sự
              </label>
              <select id="nhanSuId" name="nhanSuId" className="o-nhap" required defaultValue="">
                <option value="" disabled>
                  — Chọn người —
                </option>
                {nhanSuChuaCoTaiKhoan.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.full_name} — {n.phong}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="nhan-o" htmlFor="email">
                Email đăng nhập
              </label>
              <input id="email" name="email" type="email" className="o-nhap" required />
            </div>
            <div>
              <label className="nhan-o" htmlFor="matKhau">
                Mật khẩu tạm
              </label>
              <input
                id="matKhau"
                name="matKhau"
                type="text"
                minLength={8}
                className="o-nhap"
                placeholder="Tối thiểu 8 ký tự"
                required
              />
            </div>
          </div>

          <div>
            <span className="nhan-o">Vai trò</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {DANH_SACH_VAI_TRO.map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm text-muc-2">
                  <input type="checkbox" name="vaiTro" value={v} />
                  {v}
                </label>
              ))}
            </div>
          </div>

          <ThongBao ketQua={ketQua} />

          <div>
            <NutGui dangChay="Đang tạo…">Cấp tài khoản</NutGui>
          </div>
        </>
      )}
    </form>
  );
}
