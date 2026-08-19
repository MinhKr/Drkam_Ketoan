import { batBuocVaiTro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VAI_TRO } from '@/lib/constants';
import { NutGui } from '@/components/nut-gui';
import { DieuHuongDanhMuc } from '../dieu-huong';
import { FormThemLoaiChiPhi } from '../forms';
import { doiTrangThaiLoaiChiPhi } from '../actions';

export const metadata = { title: 'Loại chi phí · DrKam Duyệt Chi' };

export default async function TrangLoaiChiPhi() {
  await batBuocVaiTro(
    VAI_TRO.KE_TOAN_VIEN,
    VAI_TRO.KE_TOAN_TONG_HOP,
    VAI_TRO.KE_TOAN_TRUONG,
    VAI_TRO.KE_TOAN_NGAN_HANG,
  );
  const supabase = await createClient();

  const { data: loai } = await supabase
    .from('expense_types')
    .select('id, name, active, sort_order')
    .order('sort_order')
    .order('name');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-muc">Loại chi phí</h1>
        <p className="mt-1 text-sm text-muc-2">
          Danh sách gợi ý cho ô “Loại chi phí” lúc nộp hồ sơ. Người nộp vẫn gõ được nội
          dung khác nếu không có trong danh sách.
        </p>
      </div>

      <DieuHuongDanhMuc dangO="/danh-muc/loai-chi-phi" />

      <FormThemLoaiChiPhi />

      <div className="khoi overflow-x-auto">
        <table className="bang">
          <thead>
            <tr>
              <th>Tên loại chi phí</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(loai ?? []).map((l) => (
              <tr key={l.id}>
                <td className="font-medium text-muc">{l.name}</td>
                <td>
                  <span className={l.active ? 'the the-xong' : 'the the-nghi'}>
                    {l.active ? 'Đang dùng' : 'Ẩn'}
                  </span>
                </td>
                <td className="text-right">
                  <form action={doiTrangThaiLoaiChiPhi.bind(null, l.id, !l.active)}>
                    <NutGui lop="nut nut-phu px-2.5 py-1 text-xs" dangChay="…">
                      {l.active ? 'Ẩn đi' : 'Hiện lại'}
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
