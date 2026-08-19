'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { dangNhap, type KetQuaDangNhap } from './actions';

function NutGui() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="nut nut-chinh w-full" disabled={pending}>
      {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
    </button>
  );
}

export function FormDangNhap({ tiep }: { tiep: string }) {
  const [ketQua, guiForm] = useActionState<KetQuaDangNhap, FormData>(dangNhap, undefined);

  return (
    <form action={guiForm} className="flex flex-col gap-4">
      <input type="hidden" name="tiep" value={tiep} />

      <div>
        <label className="nhan-o" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="o-nhap"
          placeholder="ketoan@drkam.vn"
        />
      </div>

      <div>
        <label className="nhan-o" htmlFor="matKhau">
          Mật khẩu
        </label>
        <input
          id="matKhau"
          name="matKhau"
          type="password"
          autoComplete="current-password"
          required
          className="o-nhap"
          placeholder="••••••••"
        />
      </div>

      {ketQua?.loi && (
        <p className="rounded-md border border-dau/30 bg-dau-nhat px-3 py-2 text-sm text-dau">
          {ketQua.loi}
        </p>
      )}

      <NutGui />
    </form>
  );
}
