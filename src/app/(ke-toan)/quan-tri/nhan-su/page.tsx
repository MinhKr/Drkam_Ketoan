import { batBuocVaiTro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VAI_TRO } from '@/lib/constants';
import { NutGui } from '@/components/nut-gui';
import { FormThemNhanSu } from './form-them';
import { doiTrangThaiNhanSu } from '../actions';

export const metadata = { title: 'Nhân sự · DrKam Duyệt Chi' };

export default async function TrangNhanSu() {
  await batBuocVaiTro(VAI_TRO.QUAN_TRI);
  const supabase = await createClient();

  const [{ data: phongBan }, { data: nhanSu }] = await Promise.all([
    supabase.from('departments').select('id, code, name').eq('active', true).order('code'),
    supabase
      .from('staff')
      .select('id, full_name, email, phone, active, departments(code, name), profiles(id)')
      .order('full_name'),
  ]);

  const danhSach = (nhanSu ?? []) as unknown as {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    active: boolean;
    departments: { code: string; name: string } | null;
    profiles: { id: string } | null;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-muc">Nhân sự</h1>
        <p className="mt-1 text-sm text-muc-2">
          Người nộp hồ sơ <strong className="text-muc">tự gõ tên mình</strong>, không phải
          chọn từ danh sách này — nên không cần khai đủ mọi người ở đây. Danh sách chỉ
          dùng khi cấp tài khoản đăng nhập cho người phải duyệt.
        </p>
      </div>

      <FormThemNhanSu phongBan={phongBan ?? []} />

      <div className="khoi overflow-x-auto">
        <table className="bang">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Phòng ban</th>
              <th>Liên hệ</th>
              <th>Tài khoản</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {danhSach.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muc-3">
                  Chưa có nhân sự nào.
                </td>
              </tr>
            )}
            {danhSach.map((n) => (
              <tr key={n.id}>
                <td className="font-medium text-muc">{n.full_name}</td>
                <td>{n.departments?.name ?? '—'}</td>
                <td className="text-sm">
                  {n.email ?? '—'}
                  {n.phone && <span className="so block text-muc-3">{n.phone}</span>}
                </td>
                <td>
                  {n.profiles ? (
                    <span className="the the-xong">Có đăng nhập</span>
                  ) : (
                    <span className="the the-nghi">Không cần</span>
                  )}
                </td>
                <td>
                  <span className={n.active ? 'the the-xong' : 'the the-nghi'}>
                    {n.active ? 'Đang làm' : 'Đã nghỉ'}
                  </span>
                </td>
                <td className="text-right">
                  <form action={doiTrangThaiNhanSu.bind(null, n.id, !n.active)}>
                    <NutGui lop="nut nut-phu px-2.5 py-1 text-xs" dangChay="…">
                      {n.active ? 'Đánh dấu nghỉ' : 'Đi làm lại'}
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
