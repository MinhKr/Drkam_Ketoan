import { batBuocVaiTro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VAI_TRO } from '@/lib/constants';
import { tachNhomSoTaiKhoan } from '@/lib/dinh-dang';
import { NutGui } from '@/components/nut-gui';
import { DieuHuongDanhMuc } from './dieu-huong';
import { FormThemNhaCungCap, FormThemTaiKhoanNhan } from './forms';
import { doiTrangThaiNhaCungCap, doiTrangThaiTaiKhoan } from './actions';

export const metadata = { title: 'Nhà cung cấp · DrKam Duyệt Chi' };

export default async function TrangNhaCungCap() {
  await batBuocVaiTro(
    VAI_TRO.KE_TOAN_VIEN,
    VAI_TRO.KE_TOAN_TONG_HOP,
    VAI_TRO.KE_TOAN_TRUONG,
    VAI_TRO.KE_TOAN_NGAN_HANG,
  );
  const supabase = await createClient();

  const { data } = await supabase
    .from('suppliers')
    .select('id, name, tax_code, phone, active, bank_accounts(id, account_number, bank_name, account_holder, active)')
    .order('name');

  const nhaCungCap = (data ?? []) as unknown as {
    id: string;
    name: string;
    tax_code: string | null;
    phone: string | null;
    active: boolean;
    bank_accounts: {
      id: string;
      account_number: string;
      bank_name: string;
      account_holder: string;
      active: boolean;
    }[];
  }[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-muc">Danh mục</h1>
        <p className="mt-1 text-sm text-muc-2">
          Sổ tay của kế toán: nhà cung cấp và số tài khoản đã dùng, để tra cứu đối chiếu
          khi kiểm hồ sơ. Người nộp hồ sơ tự gõ thông tin người nhận nên danh mục này
          không ảnh hưởng tới họ.
        </p>
      </div>

      <DieuHuongDanhMuc dangO="/danh-muc" />

      <FormThemNhaCungCap />
      <FormThemTaiKhoanNhan nhaCungCap={nhaCungCap.filter((n) => n.active)} />

      <div className="flex flex-col gap-3">
        {nhaCungCap.length === 0 && (
          <div className="khoi px-6 py-10 text-center text-muc-3">
            Chưa có nhà cung cấp nào.
          </div>
        )}
        {nhaCungCap.map((n) => (
          <div key={n.id} className="khoi p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-muc">
                  {n.name}
                  {!n.active && <span className="ml-2 the the-nghi">Ngừng dùng</span>}
                </p>
                <p className="mt-0.5 text-sm text-muc-3">
                  {n.tax_code ? `MST/CCCD ${n.tax_code}` : 'Chưa có MST'}
                  {n.phone && ` · ${n.phone}`}
                </p>
              </div>
              <form action={doiTrangThaiNhaCungCap.bind(null, n.id, !n.active)}>
                <NutGui lop="nut nut-phu px-2.5 py-1 text-xs" dangChay="…">
                  {n.active ? 'Ngừng dùng' : 'Dùng lại'}
                </NutGui>
              </form>
            </div>

            {n.bank_accounts.length === 0 ? (
              <p className="mt-3 rounded-md border border-dau/30 bg-dau-nhat px-3 py-2 text-sm text-dau">
                Chưa có số tài khoản. Mở chứng từ gốc và nhập lại bằng tay.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-1.5">
                {n.bank_accounts.map((tk) => (
                  <li
                    key={tk.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-mat-2 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span className="so font-semibold text-muc">
                        {tachNhomSoTaiKhoan(tk.account_number)}
                      </span>
                      <span className="text-sm text-muc-2">{tk.bank_name}</span>
                      <span className="text-sm text-muc-3">{tk.account_holder}</span>
                      {!tk.active && <span className="the the-nghi">Ngừng dùng</span>}
                    </div>
                    <form
                      action={doiTrangThaiTaiKhoan.bind(null, tk.id, !tk.active, '/danh-muc')}
                    >
                      <NutGui lop="nut nut-phu px-2 py-0.5 text-xs" dangChay="…">
                        {tk.active ? 'Ngừng' : 'Dùng lại'}
                      </NutGui>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
