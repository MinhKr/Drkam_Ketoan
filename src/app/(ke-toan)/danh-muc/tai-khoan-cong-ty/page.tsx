import { batBuocVaiTro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VAI_TRO } from '@/lib/constants';
import { tachNhomSoTaiKhoan } from '@/lib/dinh-dang';
import { NutGui } from '@/components/nut-gui';
import { DieuHuongDanhMuc } from '../dieu-huong';
import { FormThemTaiKhoanCongTy } from '../forms';
import { doiTrangThaiTaiKhoan } from '../actions';

export const metadata = { title: 'Tài khoản công ty · DrKam Duyệt Chi' };

export default async function TrangTaiKhoanCongTy() {
  await batBuocVaiTro(
    VAI_TRO.KE_TOAN_VIEN,
    VAI_TRO.KE_TOAN_TONG_HOP,
    VAI_TRO.KE_TOAN_TRUONG,
    VAI_TRO.KE_TOAN_NGAN_HANG,
  );
  const supabase = await createClient();

  const { data: taiKhoan } = await supabase
    .from('bank_accounts')
    .select('id, account_number, bank_name, account_holder, active')
    .eq('is_company_account', true)
    .order('bank_name');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-muc">Tài khoản chi của công ty</h1>
        <p className="mt-1 text-sm text-muc-2">
          Cột “TK gửi” trong file Excel cũ. Kế toán ngân hàng chọn tài khoản chi từ đây.
        </p>
      </div>

      <DieuHuongDanhMuc dangO="/danh-muc/tai-khoan-cong-ty" />

      <FormThemTaiKhoanCongTy />

      <div className="khoi overflow-x-auto">
        <table className="bang">
          <thead>
            <tr>
              <th>Số tài khoản</th>
              <th>Ngân hàng</th>
              <th>Chủ tài khoản</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(taiKhoan ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muc-3">
                  Chưa có tài khoản chi nào.
                </td>
              </tr>
            )}
            {(taiKhoan ?? []).map((tk) => (
              <tr key={tk.id}>
                <td className="so font-semibold text-muc">
                  {tachNhomSoTaiKhoan(tk.account_number)}
                </td>
                <td>{tk.bank_name}</td>
                <td>{tk.account_holder}</td>
                <td>
                  <span className={tk.active ? 'the the-xong' : 'the the-nghi'}>
                    {tk.active ? 'Đang dùng' : 'Ngừng dùng'}
                  </span>
                </td>
                <td className="text-right">
                  <form
                    action={doiTrangThaiTaiKhoan.bind(
                      null,
                      tk.id,
                      !tk.active,
                      '/danh-muc/tai-khoan-cong-ty',
                    )}
                  >
                    <NutGui lop="nut nut-phu px-2.5 py-1 text-xs" dangChay="…">
                      {tk.active ? 'Ngừng dùng' : 'Dùng lại'}
                    </NutGui>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
