import { batBuocVaiTro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VAI_TRO } from '@/lib/constants';
import { dinhDangNgay } from '@/lib/dinh-dang';
import { NutGui } from '@/components/nut-gui';
import { FormTaoTaiKhoan } from './form-tao';
import { doiTrangThaiTaiKhoan, doiVangMat } from '../actions';

export const metadata = { title: 'Tài khoản · DrKam Duyệt Chi' };

export default async function TrangTaiKhoan() {
  const toi = await batBuocVaiTro(VAI_TRO.QUAN_TRI);
  const supabase = await createClient();

  const [{ data: nhanSu }, { data: taiKhoan }] = await Promise.all([
    supabase
      .from('staff')
      .select('id, full_name, departments(name), profiles(id)')
      .eq('active', true)
      .order('full_name'),
    supabase
      .from('profiles')
      .select('id, full_name, job_title, email, roles, on_leave, status, created_at')
      .order('full_name'),
  ]);

  const chuaCoTaiKhoan = ((nhanSu ?? []) as unknown as {
    id: string;
    full_name: string;
    departments: { name: string } | null;
    profiles: { id: string } | null;
  }[])
    .filter((n) => !n.profiles)
    .map((n) => ({ id: n.id, full_name: n.full_name, phong: n.departments?.name ?? '—' }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-muc">Tài khoản đăng nhập</h1>
        <p className="mt-1 text-sm text-muc-2">
          Cả công ty chỉ cần khoảng 6–8 tài khoản: kế toán viên, kế toán tổng hợp, kế toán
          trưởng, kế toán ngân hàng, trưởng bộ phận và giám đốc.
        </p>
      </div>

      <FormTaoTaiKhoan nhanSuChuaCoTaiKhoan={chuaCoTaiKhoan} />

      <div className="khoi overflow-x-auto">
        <table className="bang">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Cấp ngày</th>
              <th>Vắng mặt</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(taiKhoan ?? []).map((t) => {
              const laToi = t.id === toi.id;
              return (
                <tr key={t.id}>
                  <td className="font-medium text-muc">
                    {t.full_name}
                    {laToi && <span className="ml-2 the the-nghi">bạn</span>}
                    {t.job_title && (
                      <span className="block text-xs font-normal text-muc-3">{t.job_title}</span>
                    )}
                  </td>
                  <td className="text-sm">{t.email}</td>
                  <td className="text-sm">{t.roles.join(', ') || '—'}</td>
                  <td className="so text-sm">{dinhDangNgay(t.created_at)}</td>
                  <td>
                    <form action={doiVangMat.bind(null, t.id, !t.on_leave)}>
                      <NutGui
                        lop={t.on_leave ? 'the the-cho cursor-pointer' : 'the the-nghi cursor-pointer'}
                        dangChay="…"
                      >
                        {t.on_leave ? 'Đang nghỉ' : 'Đang làm'}
                      </NutGui>
                    </form>
                  </td>
                  <td>
                    <span className={t.status === 'Hoạt động' ? 'the the-xong' : 'the the-tra'}>
                      {t.status}
                    </span>
                  </td>
                  <td className="text-right">
                    {laToi ? (
                      <span className="text-xs text-muc-3">không tự khóa được</span>
                    ) : (
                      <form action={doiTrangThaiTaiKhoan.bind(null, t.id, t.status === 'Hoạt động')}>
                        <NutGui lop="nut nut-phu px-2.5 py-1 text-xs" dangChay="…">
                          {t.status === 'Hoạt động' ? 'Khóa' : 'Mở khóa'}
                        </NutGui>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
