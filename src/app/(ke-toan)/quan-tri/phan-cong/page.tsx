import { batBuocVaiTro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VAI_TRO } from '@/lib/constants';
import { HangPhanCong } from './hang-phan-cong';

export const metadata = { title: 'Phân công kế toán viên · DrKam Duyệt Chi' };

export default async function TrangPhanCong() {
  await batBuocVaiTro(VAI_TRO.QUAN_TRI);
  const supabase = await createClient();

  const [{ data: phongBan }, { data: profiles }, { data: phanCong }] = await Promise.all([
    supabase.from('departments').select('id, code, name').eq('active', true).order('code'),
    supabase
      .from('profiles')
      .select('id, full_name, job_title, roles, on_leave')
      .eq('status', 'Hoạt động')
      .order('full_name'),
    supabase.from('accountant_assignments').select('department_id, accountant_id, backup_id'),
  ]);

  const keToanVien = (profiles ?? []).filter((p) => p.roles.includes(VAI_TRO.KE_TOAN_VIEN));
  const banDo = new Map((phanCong ?? []).map((p) => [p.department_id, p]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-muc">Phân công kế toán viên</h1>
        <p className="mt-1 text-sm text-muc-2">
          Chính bảng này quyết định hồ sơ nộp lên sẽ tự chạy về bàn ai. Phòng nào chưa phân
          công thì hồ sơ của phòng đó sẽ bị kẹt.
        </p>
      </div>

      {keToanVien.length === 0 && (
        <p className="rounded-md border border-cho/30 bg-cho-nhat px-4 py-3 text-sm text-cho">
          Chưa có tài khoản nào mang vai trò <strong>Kế toán viên</strong>. Sang mục Tài
          khoản cấp trước, rồi quay lại đây phân công.
        </p>
      )}

      <div className="khoi overflow-x-auto">
        <table className="bang">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Phòng ban</th>
              <th colSpan={3}>Phân công</th>
            </tr>
          </thead>
          <tbody>
            {(phongBan ?? []).map((p) => (
              <HangPhanCong
                key={p.id}
                phong={p}
                keToanVien={keToanVien}
                hienTai={banDo.get(p.id) ?? null}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
