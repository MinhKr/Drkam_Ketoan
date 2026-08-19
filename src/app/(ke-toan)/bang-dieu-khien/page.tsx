import Link from 'next/link';
import { batBuocDangNhap } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VAI_TRO_XU_LY, type TrangThai, type VaiTro } from '@/lib/constants';
import { dinhDangTien, khoangCachThoiGian } from '@/lib/dinh-dang';
import { TheTrangThai } from '@/components/the-trang-thai';
import { TrangRong } from '@/components/trang-rong';

export const metadata = { title: 'Chờ tôi xử lý · DrKam Duyệt Chi' };

export default async function BangDieuKhien() {
  const nguoiDung = await batBuocDangNhap('/bang-dieu-khien');
  const supabase = await createClient();

  // Trạng thái nào thuộc phần việc của các vai trò mình đang giữ.
  const trangThaiCuaToi = (Object.entries(VAI_TRO_XU_LY) as [TrangThai, VaiTro][])
    .filter(([, vaiTro]) => nguoiDung.roles.includes(vaiTro))
    .map(([trangThai]) => trangThai);

  let hoSo: {
    id: string;
    code: string;
    requester_name: string;
    total_amount: number;
    status: string;
    submitted_at: string | null;
    departments: { name: string } | null;
  }[] = [];

  if (trangThaiCuaToi.length > 0) {
    const { data } = await supabase
      .from('payment_requests')
      .select('id, code, requester_name, total_amount, status, submitted_at, departments(name)')
      .in('status', trangThaiCuaToi)
      // Hồ sơ giao đích danh cho mình, hoặc chưa giao ai trong hàng chờ theo vai trò.
      .or(`holder_id.eq.${nguoiDung.id},holder_id.is.null`)
      .order('submitted_at', { ascending: true })
      .limit(100);

    hoSo = (data ?? []) as typeof hoSo;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-muc">Chờ tôi xử lý</h1>
        <p className="mt-1 text-sm text-muc-2">
          {trangThaiCuaToi.length === 0
            ? 'Vai trò của bạn không có bước duyệt nào trong luồng.'
            : `${hoSo.length} hồ sơ đang chờ bạn. Hồ sơ nộp trước xếp lên trên.`}
        </p>
      </div>

      {hoSo.length === 0 ? (
        <TrangRong
          tieuDe="Không có hồ sơ nào đang chờ bạn"
          moTa="Khi có hồ sơ chuyển tới bàn của bạn, nó sẽ hiện ở đây và bạn nhận email thông báo."
        />
      ) : (
        <div className="khoi overflow-x-auto">
          <table className="bang">
            <thead>
              <tr>
                <th>Số BK</th>
                <th>Người đề nghị</th>
                <th>Phòng ban</th>
                <th className="text-right">Số tiền</th>
                <th>Trạng thái</th>
                <th>Chờ từ</th>
              </tr>
            </thead>
            <tbody>
              {hoSo.map((h) => (
                <tr key={h.id}>
                  <td>
                    <Link
                      href={`/ho-so/${h.id}`}
                      className="font-semibold text-chinh hover:underline"
                    >
                      {h.code}
                    </Link>
                  </td>
                  <td>{h.requester_name}</td>
                  <td>{h.departments?.name ?? '—'}</td>
                  <td className="so text-right font-semibold text-muc">
                    {dinhDangTien(h.total_amount)}
                  </td>
                  <td>
                    <TheTrangThai trangThai={h.status} />
                  </td>
                  <td className="text-muc-3">{khoangCachThoiGian(h.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
