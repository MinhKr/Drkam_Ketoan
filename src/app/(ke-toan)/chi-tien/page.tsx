import Link from 'next/link';
import { batBuocVaiTro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { TRANG_THAI, VAI_TRO } from '@/lib/constants';
import { dinhDangNgay, dinhDangTien, tachNhomSoTaiKhoan } from '@/lib/dinh-dang';
import { TrangRong } from '@/components/trang-rong';

export const metadata = { title: 'Chờ chi · DrKam Duyệt Chi' };

type HoSoChoChi = {
  id: string;
  code: string;
  requester_name: string;
  total_amount: number;
  payment_method: string;
  due_date: string | null;
  beneficiary_name: string | null;
  recipient_account: string | null;
  recipient_bank: string | null;
  recipient_holder: string | null;
  departments: { name: string; code: string } | null;
};

/**
 * Bàn làm việc của kế toán ngân hàng: mọi hồ sơ đã duyệt xong, đang chờ chuyển
 * tiền. Cột số tài khoản để ngay trên bảng để khỏi phải mở từng hồ sơ ra chép.
 */
export default async function TrangChoChi() {
  await batBuocVaiTro(VAI_TRO.KE_TOAN_NGAN_HANG);
  const supabase = await createClient();

  const homNay = new Date().toISOString().slice(0, 10);

  const [{ data: choChi }, { data: daChi }] = await Promise.all([
    supabase
      .from('payment_requests')
      .select(
        `id, code, requester_name, total_amount, payment_method, due_date,
         beneficiary_name, recipient_account, recipient_bank, recipient_holder,
         departments(name, code)`,
      )
      .eq('status', TRANG_THAI.CHO_CHI)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('submitted_at', { ascending: true })
      .limit(200),
    supabase
      .from('payment_requests')
      .select('id, code, total_amount, beneficiary_name, completed_at')
      .eq('status', TRANG_THAI.HOAN_THANH)
      .order('completed_at', { ascending: false })
      .limit(10),
  ]);

  const hoSo = (choChi ?? []) as unknown as HoSoChoChi[];
  const tongPhaiChi = hoSo.reduce((t, h) => t + h.total_amount, 0);
  const soQuaHan = hoSo.filter((h) => h.due_date && h.due_date < homNay).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-muc">Chờ chi</h1>
        <p className="mt-1 text-sm text-muc-2">
          {hoSo.length === 0
            ? 'Không còn hồ sơ nào chờ chuyển tiền.'
            : `${hoSo.length} hồ sơ đã duyệt xong, tổng ${dinhDangTien(tongPhaiChi)} ₫. Hạn gần nhất xếp lên trên.`}
        </p>
      </div>

      {soQuaHan > 0 && (
        <p className="rounded-md border border-dau/30 bg-dau-nhat px-3 py-2 text-sm text-dau">
          {soQuaHan} hồ sơ đã quá hạn thanh toán.
        </p>
      )}

      {hoSo.length === 0 ? (
        <TrangRong
          tieuDe="Hết việc rồi"
          moTa="Hồ sơ duyệt xong sẽ rơi vào đây kèm số tài khoản người nhận."
        />
      ) : (
        <div className="khoi overflow-x-auto">
          <table className="bang">
            <thead>
              <tr>
                <th>Số BK</th>
                <th>Trả cho</th>
                <th>Số tài khoản</th>
                <th className="text-right">Số tiền</th>
                <th>Hạn thanh toán</th>
                <th>Phòng ban</th>
              </tr>
            </thead>
            <tbody>
              {hoSo.map((h) => {
                const quaHan = Boolean(h.due_date && h.due_date < homNay);
                return (
                  <tr key={h.id}>
                    <td>
                      <Link
                        href={`/ho-so/${h.id}`}
                        className="so font-semibold text-chinh hover:underline"
                      >
                        {h.code}
                      </Link>
                      <p className="text-xs text-muc-3">{h.payment_method}</p>
                    </td>
                    <td>
                      <p className="font-medium text-muc">{h.beneficiary_name ?? '—'}</p>
                      <p className="text-xs text-muc-3">{h.requester_name} đề nghị</p>
                    </td>
                    <td>
                      {h.recipient_account ? (
                        <>
                          <p className="so font-semibold text-muc">
                            {tachNhomSoTaiKhoan(h.recipient_account)}
                          </p>
                          <p className="text-xs text-muc-3">
                            {h.recipient_bank} · {h.recipient_holder}
                          </p>
                        </>
                      ) : (
                        <span className="text-muc-3">Chi tiền mặt</span>
                      )}
                    </td>
                    <td className="so text-right font-semibold text-muc">
                      {dinhDangTien(h.total_amount)}
                    </td>
                    <td className={quaHan ? 'so font-semibold text-dau' : 'so text-muc-2'}>
                      {h.due_date ? dinhDangNgay(h.due_date) : '—'}
                      {quaHan && <span className="ml-1 text-xs">quá hạn</span>}
                    </td>
                    <td className="text-muc-2">{h.departments?.name ?? '—'}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={3} className="text-right font-semibold text-muc">
                  Tổng phải chi
                </td>
                <td className="so text-right text-base font-bold text-muc">
                  {dinhDangTien(tongPhaiChi)}
                </td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Vừa chi xong ─────────────────────────────────── */}
      {(daChi ?? []).length > 0 && (
        <div className="khoi p-5">
          <h2 className="mb-3 font-bold text-muc">Mười hồ sơ chi gần nhất</h2>
          <ul className="flex flex-col gap-2">
            {(daChi ?? []).map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                <Link href={`/ho-so/${h.id}`} className="so font-semibold text-chinh hover:underline">
                  {h.code}
                </Link>
                <span className="text-muc-2">{h.beneficiary_name ?? '—'}</span>
                <span className="so ml-auto font-semibold text-muc">
                  {dinhDangTien(h.total_amount)} ₫
                </span>
                <span className="so text-xs text-muc-3">{dinhDangNgay(h.completed_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
