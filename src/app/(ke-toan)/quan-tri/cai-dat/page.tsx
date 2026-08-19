import { batBuocVaiTro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VAI_TRO, CAI_DAT_MAC_DINH } from '@/lib/constants';
import { dinhDangTien } from '@/lib/dinh-dang';
import { FormCaiDat } from './form-cai-dat';

export const metadata = { title: 'Hạn mức và cài đặt · DrKam Duyệt Chi' };

export default async function TrangCaiDat() {
  await batBuocVaiTro(VAI_TRO.QUAN_TRI);
  const supabase = await createClient();

  const { data } = await supabase.from('settings').select('key, value');
  const caiDat = new Map((data ?? []).map((c) => [c.key, c.value]));
  const lay = (khoa: string) => caiDat.get(khoa) ?? CAI_DAT_MAC_DINH[khoa] ?? '';

  const hanMucKTT = Number(lay('HAN_MUC_KE_TOAN_TRUONG'));
  const hanMucGD = Number(lay('HAN_MUC_GIAM_DOC'));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-muc">Hạn mức và cài đặt</h1>
        <p className="mt-1 text-sm text-muc-2">
          Sửa ở đây là luồng duyệt đổi theo ngay, không phải sửa mã nguồn.
        </p>
      </div>

      <div className="khoi p-5">
        <h2 className="mb-3 font-bold text-muc">Hồ sơ sẽ đi qua những ai</h2>
        <div className="overflow-x-auto">
          <table className="bang">
            <thead>
              <tr>
                <th>Số tiền hồ sơ</th>
                <th>Đường đi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="so">Dưới {dinhDangTien(hanMucKTT)} ₫</td>
                <td>Kế toán viên → Kế toán tổng hợp → Kế toán ngân hàng</td>
              </tr>
              <tr>
                <td className="so">
                  {dinhDangTien(hanMucKTT)} – {dinhDangTien(hanMucGD - 1)} ₫
                </td>
                <td>Kế toán viên → Kế toán trưởng → Kế toán ngân hàng</td>
              </tr>
              <tr>
                <td className="so">Từ {dinhDangTien(hanMucGD)} ₫ trở lên</td>
                <td>
                  Kế toán viên → Kế toán trưởng → <strong className="text-muc">Giám đốc</strong> →
                  Kế toán ngân hàng
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muc-3">
          Phòng nào bật “trưởng bộ phận duyệt” thì có thêm một bước trước kế toán viên.
        </p>
      </div>

      <FormCaiDat
        hanMucKeToanTruong={lay('HAN_MUC_KE_TOAN_TRUONG')}
        hanMucGiamDoc={lay('HAN_MUC_GIAM_DOC')}
        dungLuongTepToiDaMb={lay('DUNG_LUONG_TEP_TOI_DA_MB')}
      />
    </div>
  );
}
