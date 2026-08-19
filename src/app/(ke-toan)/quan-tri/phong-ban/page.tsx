import { batBuocVaiTro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VAI_TRO } from '@/lib/constants';
import { NutGui } from '@/components/nut-gui';
import { FormThemPhongBan } from './form-them';
import { OTruongBoPhan } from './o-truong-bo-phan';
import { doiTrangThaiPhongBan } from '../actions';

export const metadata = { title: 'Phòng ban · DrKam Duyệt Chi' };

export default async function TrangPhongBan() {
  await batBuocVaiTro(VAI_TRO.QUAN_TRI);
  const supabase = await createClient();

  const { data: phongBan } = await supabase
    .from('departments')
    .select('id, code, name, head_name, active, staff(count)')
    .order('sort_order')
    .order('code');

  const danhSach = (phongBan ?? []) as unknown as {
    id: string;
    code: string;
    name: string;
    head_name: string | null;
    active: boolean;
    staff: { count: number }[];
  }[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-muc">Phòng ban</h1>
        <p className="mt-1 text-sm text-muc-2">
          Mã phòng dùng làm tiền tố số BK — phòng Marketing mã MKT thì hồ sơ đánh số MKT/42.
          Tên trưởng bộ phận chỉ để in sẵn lên phiếu cho người ta ký tay, không phải phân quyền.
        </p>
      </div>

      <FormThemPhongBan />

      <div className="khoi overflow-x-auto">
        <table className="bang">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên phòng</th>
              <th className="text-right">Nhân sự</th>
              <th>Trưởng bộ phận (in trên phiếu)</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {danhSach.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muc-3">
                  Chưa có phòng ban nào. Thêm phòng đầu tiên ở khung phía trên.
                </td>
              </tr>
            )}
            {danhSach.map((p) => (
              <tr key={p.id}>
                <td className="so font-semibold text-muc">{p.code}</td>
                <td className="font-medium text-muc">{p.name}</td>
                <td className="so text-right">{p.staff?.[0]?.count ?? 0}</td>
                <td>
                  <OTruongBoPhan id={p.id} tenHienTai={p.head_name} />
                </td>
                <td>
                  <span className={p.active ? 'the the-xong' : 'the the-nghi'}>
                    {p.active ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </td>
                <td className="text-right">
                  <form action={doiTrangThaiPhongBan.bind(null, p.id, !p.active)}>
                    <NutGui lop="nut nut-phu px-2.5 py-1 text-xs" dangChay="…">
                      {p.active ? 'Ngừng dùng' : 'Dùng lại'}
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
