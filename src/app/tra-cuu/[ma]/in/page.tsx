import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ChuaCauHinh, daCauHinhSupabase } from '@/components/chua-cau-hinh';
import { NutIn } from './nut-in';
import { KHOA_CAI_DAT, CAI_DAT_MAC_DINH, LOAI_TEP } from '@/lib/constants';
import { dinhDangTien, docSoThanhChu } from '@/lib/dinh-dang';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'In phiếu đề nghị thanh toán · DrKam Duyệt Chi' };

/** "2026-08-19" → "ngày 19 tháng 8 năm 2026" — đúng lối viết trên văn bản giấy. */
function ngayThangNam(ngay: string): string {
  const d = new Date(ngay);
  return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

export default async function TrangInPhieu({ params }: PageProps<'/tra-cuu/[ma]/in'>) {
  if (!daCauHinhSupabase()) return <ChuaCauHinh />;

  const { ma } = await params;
  const db = createAdminClient();

  const { data: hoSo } = await db
    .from('payment_requests')
    .select(
      `id, code, lookup_token, status, total_amount, request_date, requester_name, note,
       beneficiary_name, recipient_account, recipient_bank, recipient_holder,
       company_account_id, departments(name, code, head_name)`,
    )
    .eq('lookup_token', ma.toUpperCase())
    .maybeSingle();

  if (!hoSo) notFound();

  const phong = hoSo.departments as unknown as {
    name: string;
    code: string;
    head_name: string | null;
  } | null;

  const [{ data: dong }, { data: tep }, { data: caiDat }, { data: tkGui }] = await Promise.all([
    db
      .from('request_lines')
      .select('id, line_no, expense_type, description, amount')
      .eq('request_id', hoSo.id)
      .order('line_no'),
    db
      .from('attachments')
      .select('id, file_name')
      .eq('request_id', hoSo.id)
      .eq('kind', LOAI_TEP.CHUNG_TU)
      .order('created_at'),
    db.from('settings').select('key, value'),
    hoSo.company_account_id
      ? db
          .from('bank_accounts')
          .select('account_number, bank_name, account_holder')
          .eq('id', hoSo.company_account_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const banDo = new Map((caiDat ?? []).map((c) => [c.key, c.value]));
  const doc = (khoa: string) => banDo.get(khoa) ?? CAI_DAT_MAC_DINH[khoa] ?? '';

  const dongChiTiet = dong ?? [];
  const soDong = Math.max(dongChiTiet.length, 1);

  // Bản Excel cũ ghi "Marketing – Khác": tên phòng rồi tới loại chi phí.
  // Chỉ ghép khi cả phiếu cùng một loại, nhiều loại thì để tên phòng cho gọn.
  const loaiChung =
    dongChiTiet.length > 0 &&
    dongChiTiet.every((d) => d.expense_type && d.expense_type === dongChiTiet[0].expense_type)
      ? dongChiTiet[0].expense_type
      : null;

  const boPhan = loaiChung ? `${phong?.name ?? '—'} – ${loaiChung}` : (phong?.name ?? '—');
  const noiDung = hoSo.note?.trim() || loaiChung || dongChiTiet[0]?.description || '';

  const thongTinGui = tkGui
    ? `${tkGui.account_number} ${tkGui.bank_name} ${tkGui.account_holder}`
    : '';
  const thongTinNhan = hoSo.recipient_account
    ? `${hoSo.recipient_account} ${hoSo.recipient_bank ?? ''} ${hoSo.recipient_holder ?? ''}`.trim()
    : (hoSo.beneficiary_name ?? '');

  const soChungTu = (tep ?? []).length;

  return (
    <>
      {/* ── Thanh công cụ, không in ra giấy ────────────────── */}
      <div className="khong-in border-b border-vien bg-mat">
        <div className="mx-auto flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <Link href={`/tra-cuu/${hoSo.lookup_token}`} className="text-sm text-muc-2 hover:text-chinh">
              ← Về hồ sơ {hoSo.code}
            </Link>
            <p className="mt-0.5 text-xs text-muc-3">
              In ra, ký tay rồi mang bản giấy xuống phòng kế toán. Kế toán đối chiếu trên app.
            </p>
          </div>
          <NutIn />
        </div>
      </div>

      {!phong?.head_name && (
        <div className="khong-in mx-auto mt-4 w-full max-w-[210mm] px-4">
          <p className="rounded-md border border-cho/30 bg-cho-nhat px-4 py-3 text-sm text-cho">
            Phòng {phong?.name ?? 'này'} chưa khai tên trưởng bộ phận nên ô ký để trắng.
            Khai một lần trong Quản trị › Phòng ban là các phiếu sau in ra có sẵn tên.
          </p>
        </div>
      )}

      {/* ── Tờ phiếu ──────────────────────────────────────── */}
      <div className="py-6 print:py-0">
        <div className="phieu">
          <div className="phieu-dau">
            <div>
              <p className="phieu-cty">{doc(KHOA_CAI_DAT.TEN_CONG_TY)}</p>
              <p className="phieu-dc">{doc(KHOA_CAI_DAT.DIA_CHI_CONG_TY)}</p>
            </div>
            <div>
              <p className="phieu-quoc-hieu">Độc lập – Tự do – Hạnh phúc</p>
              <p className="phieu-mau">
                Mẫu {phong?.code ?? ''}-01 ({doc(KHOA_CAI_DAT.GHI_CHU_MAU_PHIEU)})
              </p>
              <p className="phieu-ngay">
                {doc(KHOA_CAI_DAT.THANH_PHO)}, {ngayThangNam(hoSo.request_date)}
              </p>
            </div>
          </div>

          <h1>ĐỀ NGHỊ THANH TOÁN</h1>

          <p className="phieu-dong">Kính gửi: {doc(KHOA_CAI_DAT.KINH_GUI)}</p>

          <div className="phieu-dong flex gap-6">
            <span className="flex-1">Họ và tên: {hoSo.requester_name}</span>
            <span className="flex-1">Bộ phận: {boPhan}</span>
          </div>

          <p className="phieu-dong">Nội dung: {noiDung}</p>

          <table className="bang-in">
            <thead>
              <tr>
                <th style={{ width: '7%' }}>STT</th>
                <th style={{ width: '26%' }}>
                  Nội dung thanh toán
                  <br />
                  (Mô tả)
                </th>
                <th style={{ width: '13%' }}>
                  Số tiền đề nghị thanh toán
                  <br />
                  (VNĐ)
                </th>
                <th style={{ width: '13%' }}>
                  Chứng từ đi kèm
                  <br />
                  (Link video / Hợp đồng)
                </th>
                <th style={{ width: '16%' }}>
                  Thông tin gửi tiền
                  <br />
                  (STK – Ngân hàng – Tên TK)
                </th>
                <th style={{ width: '16%' }}>
                  Thông tin nhận tiền
                  <br />
                  (STK – Ngân hàng – Tên TK)
                </th>
                <th style={{ width: '9%' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {dongChiTiet.map((d, i) => (
                <tr key={d.id}>
                  <td className="o-giua">{d.line_no}</td>
                  <td>{d.description}</td>
                  <td className="o-tien">{dinhDangTien(d.amount)}</td>
                  {/* Ba cột này thuộc về cả phiếu chứ không riêng từng dòng,
                      nên gộp ô đúng như bản Excel. */}
                  {i === 0 && (
                    <>
                      <td rowSpan={soDong}>
                        {(tep ?? []).map((t) => (
                          <span key={t.id} className="block">
                            {t.file_name}
                          </span>
                        ))}
                      </td>
                      <td rowSpan={soDong}>{thongTinGui}</td>
                      <td rowSpan={soDong}>{thongTinNhan}</td>
                    </>
                  )}
                  <td></td>
                </tr>
              ))}
              {dongChiTiet.length === 0 && (
                <tr>
                  <td className="o-giua">1</td>
                  <td></td>
                  <td className="o-tien"></td>
                  <td></td>
                  <td>{thongTinGui}</td>
                  <td>{thongTinNhan}</td>
                  <td></td>
                </tr>
              )}
              <tr className="dong-cong">
                <td colSpan={2}>Cộng</td>
                <td className="o-tien">{dinhDangTien(hoSo.total_amount)}</td>
                <td colSpan={4}></td>
              </tr>
            </tbody>
          </table>

          <p className="phieu-dong" style={{ marginTop: '4mm' }}>
            Số tiền bằng chữ: <em>{docSoThanhChu(hoSo.total_amount)}./.</em>
          </p>
          {/* Không có chứng từ thì bỏ hẳn dòng này, đừng in "kèm theo 0 chứng từ". */}
          {soChungTu > 0 && (
            <p className="phieu-dong">
              <em>( Kèm theo {soChungTu} chứng từ gốc )</em>
            </p>
          )}

          <table className="chu-ky">
            <tbody>
              <tr>
                <td className="o-ten">Người làm đơn</td>
                <td className="o-ten">Trưởng bộ phận</td>
                <td className="o-ten">P. Tài chính kế toán</td>
                <td className="o-ten">
                  Giám đốc
                  <br />
                  (Ký, đóng dấu và ghi rõ họ tên)
                </td>
              </tr>
              <tr>
                <td className="o-huong-dan">(Ký và ghi rõ họ tên)</td>
                <td className="o-huong-dan">(Ký và ghi rõ họ tên)</td>
                <td className="o-huong-dan">(Ký và ghi rõ họ tên)</td>
                <td className="o-huong-dan">(Ký và ghi rõ họ tên)</td>
              </tr>
              <tr>
                <td className="o-nguoi">{hoSo.requester_name}</td>
                <td className="o-nguoi">{phong?.head_name ?? ''}</td>
                {/* Kế toán ký tay khi nhận hồ sơ giấy nên để trắng. */}
                <td className="o-nguoi"></td>
                <td className="o-nguoi">{doc(KHOA_CAI_DAT.TEN_GIAM_DOC)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
