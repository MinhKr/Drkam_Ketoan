import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ChuaCauHinh, daCauHinhSupabase } from '@/components/chua-cau-hinh';
import { TheTrangThai } from '@/components/the-trang-thai';
import { DongThoiGian, type Buoc } from '@/components/dong-thoi-gian';
import { LuoiChungTu } from '@/components/luoi-chung-tu';
import { TRANG_THAI } from '@/lib/constants';
import { layHanMuc, moTaDuongDi } from '@/lib/luong-duyet';
import {
  dinhDangNgay,
  dinhDangNgayGio,
  dinhDangTien,
  docSoThanhChu,
  khoangCachThoiGian,
  tachNhomSoTaiKhoan,
} from '@/lib/dinh-dang';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Hồ sơ của tôi · DrKam Duyệt Chi' };

export default async function TrangHoSoTheoMa({
  params,
  searchParams,
}: PageProps<'/tra-cuu/[ma]'>) {
  if (!daCauHinhSupabase()) return <ChuaCauHinh />;

  const { ma } = await params;
  const { vuaNop } = await searchParams;
  const db = createAdminClient();

  const { data: hoSo } = await db
    .from('payment_requests')
    .select(
      `id, code, lookup_token, status, total_amount, payment_method, request_date, due_date,
       beneficiary_name, recipient_account, recipient_bank, recipient_holder, note,
       requester_name, submitted_at, completed_at, last_return_reason, return_count,
       departments(name, code, requires_head_approval)`,
    )
    .eq('lookup_token', ma.toUpperCase())
    .maybeSingle();

  if (!hoSo) notFound();

  const phong = hoSo.departments as unknown as {
    name: string;
    code: string;
    requires_head_approval: boolean;
  } | null;

  const [{ data: dong }, { data: tep }, { data: buoc }, hanMuc] = await Promise.all([
    db
      .from('request_lines')
      .select('id, line_no, expense_type, description, amount')
      .eq('request_id', hoSo.id)
      .order('line_no'),
    db
      .from('attachments')
      .select('id, kind, file_name, storage_path, mime_type, size_bytes, created_at')
      .eq('request_id', hoSo.id)
      .order('created_at'),
    db
      .from('request_events')
      .select('id, action, to_status, actor_name, actor_role, note, created_at')
      .eq('request_id', hoSo.id)
      .order('created_at'),
    layHanMuc(db),
  ]);

  // Link tải chứng từ có hạn một giờ — người nộp không đăng nhập nên không
  // đọc thẳng kho tệp được.
  const tepCoLink = await Promise.all(
    (tep ?? []).map(async (t) => {
      const { data } = await db.storage
        .from('chung-tu')
        .createSignedUrl(t.storage_path, 3600);
      return { ...t, link: data?.signedUrl ?? null };
    }),
  );

  const duongDi = moTaDuongDi(
    hoSo.total_amount,
    phong?.requires_head_approval ?? false,
    hanMuc,
  );

  const laNhap = hoSo.status === TRANG_THAI.NHAP;
  const biTraVe = hoSo.status === TRANG_THAI.TRA_VE;
  const suaDuoc = laNhap || biTraVe;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muc-2 hover:text-chinh">
          ← Về trang chủ
        </Link>
      </div>

      {vuaNop && !laNhap && (
        <div className="mb-5 rounded-md border border-xong/30 bg-xong-nhat px-4 py-4">
          <p className="font-semibold text-xong">Đã nộp hồ sơ thành công</p>
          <p className="mt-1 text-sm text-muc-2">
            Việc tiếp theo: <strong className="text-muc">in phiếu ra, xin chữ ký</strong> rồi
            mang bản giấy xuống phòng kế toán. Kế toán đối chiếu ngay trên app.
          </p>
          <div className="mt-3">
            <Link href={`/tra-cuu/${hoSo.lookup_token}/in`} className="nut nut-chinh">
              In phiếu đề nghị thanh toán
            </Link>
          </div>
        </div>
      )}

      {vuaNop && laNhap && (
        <div className="mb-5 rounded-md border border-cho/30 bg-cho-nhat px-4 py-4">
          <p className="font-semibold text-cho">Đã lưu nháp — chưa gửi đi</p>
          <p className="mt-1 text-sm text-muc-2">
            Hồ sơ chưa tới tay kế toán. Mở lại trang này để hoàn thiện và bấm nộp.
          </p>
        </div>
      )}

      {/* ── Đầu hồ sơ ────────────────────────────────────── */}
      <div className="khoi p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="so text-2xl font-bold text-muc">{hoSo.code}</p>
            <p className="mt-0.5 text-sm text-muc-2">
              {hoSo.requester_name} · {phong?.name ?? '—'}
            </p>
          </div>
          <TheTrangThai trangThai={hoSo.status} />
        </div>

        <div className="mt-4 border-t border-vien pt-4">
          <p className="so text-3xl font-bold text-muc">
            {dinhDangTien(hoSo.total_amount)} ₫
          </p>
          <p className="text-sm text-chinh">{docSoThanhChu(hoSo.total_amount)}</p>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-vien pt-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-muc-3 uppercase">Hình thức chi</dt>
            <dd className="text-sm text-muc">{hoSo.payment_method}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muc-3 uppercase">Ngày đề nghị</dt>
            <dd className="so text-sm text-muc">{dinhDangNgay(hoSo.request_date)}</dd>
          </div>
          {hoSo.due_date && (
            <div>
              <dt className="text-xs font-semibold text-muc-3 uppercase">Hạn thanh toán</dt>
              <dd className="so text-sm text-muc">{dinhDangNgay(hoSo.due_date)}</dd>
            </div>
          )}
          {hoSo.submitted_at && (
            <div>
              <dt className="text-xs font-semibold text-muc-3 uppercase">Nộp lúc</dt>
              <dd className="text-sm text-muc">
                {dinhDangNgayGio(hoSo.submitted_at)}{' '}
                <span className="text-muc-3">({khoangCachThoiGian(hoSo.submitted_at)})</span>
              </dd>
            </div>
          )}
        </dl>

        {hoSo.note && (
          <p className="mt-4 border-t border-vien pt-4 text-sm text-muc-2">
            <span className="font-semibold text-muc">Ghi chú: </span>
            {hoSo.note}
          </p>
        )}
      </div>

      {/* ── Bị trả về ────────────────────────────────────── */}
      {biTraVe && (
        <div className="mt-5 rounded-md border border-dau/40 bg-dau-nhat px-4 py-4">
          <p className="font-semibold text-dau">
            Hồ sơ bị trả về{hoSo.return_count > 1 && ` (lần thứ ${hoSo.return_count})`}
          </p>
          <p className="mt-1.5 text-sm text-muc-2">
            <span className="font-semibold text-muc">Lý do: </span>
            {hoSo.last_return_reason ?? 'Không ghi lý do'}
          </p>
          <p className="mt-3 text-sm text-muc-2">
            Sửa lại theo góp ý rồi nộp lại. Hồ sơ giữ nguyên số BK{' '}
            <span className="so font-semibold">{hoSo.code}</span>.
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {suaDuoc && (
          <Link href={`/tra-cuu/${hoSo.lookup_token}/sua`} className="nut nut-chinh">
            {laNhap ? 'Hoàn thiện và nộp' : 'Sửa và nộp lại'}
          </Link>
        )}
        {!laNhap && (
          <Link href={`/tra-cuu/${hoSo.lookup_token}/in`} className="nut nut-phu">
            In phiếu ĐNTT
          </Link>
        )}
      </div>

      {/* ── Người nhận tiền ──────────────────────────────── */}
      <div className="khoi mt-5 p-5">
        <h2 className="mb-3 font-bold text-muc">Trả tiền cho</h2>
        <p className="font-semibold text-muc">{hoSo.beneficiary_name ?? '—'}</p>
        {hoSo.recipient_account && (
          <div className="mt-2 rounded-md bg-mat-2 px-4 py-3">
            <p className="so text-xl font-bold text-muc">
              {tachNhomSoTaiKhoan(hoSo.recipient_account)}
            </p>
            <p className="text-sm text-muc-2">
              {hoSo.recipient_bank} · {hoSo.recipient_holder}
            </p>
          </div>
        )}
      </div>

      {/* ── Nội dung ─────────────────────────────────────── */}
      <div className="khoi mt-5 overflow-x-auto">
        <table className="bang">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th>Loại chi phí</th>
              <th>Nội dung</th>
              <th className="text-right">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {(dong ?? []).map((d) => (
              <tr key={d.id}>
                <td className="so text-muc-3">{d.line_no}</td>
                <td>{d.expense_type ?? '—'}</td>
                <td className="text-muc">{d.description}</td>
                <td className="so text-right font-semibold text-muc">
                  {dinhDangTien(d.amount)}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="text-right font-semibold text-muc">
                Cộng
              </td>
              <td className="so text-right text-base font-bold text-muc">
                {dinhDangTien(hoSo.total_amount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Chứng từ ─────────────────────────────────────── */}
      <div className="khoi mt-5 p-5">
        <h2 className="mb-3 font-bold text-muc">
          Chứng từ đính kèm{' '}
          <span className="so font-normal text-muc-3">({tepCoLink.length})</span>
        </h2>
        <LuoiChungTu
          tep={tepCoLink.map((t) => ({
            id: t.id,
            kind: t.kind,
            file_name: t.file_name,
            mime_type: t.mime_type,
            link: t.link,
          }))}
        />
      </div>

      {/* ── Hồ sơ sẽ đi qua ai ───────────────────────────── */}
      <div className="khoi mt-5 p-5">
        <h2 className="mb-3 font-bold text-muc">Hồ sơ đi qua những ai</h2>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {duongDi.map((b, i) => (
            <li key={b} className="flex items-center gap-2">
              <span className="rounded-md bg-mat-2 px-2.5 py-1 text-sm text-muc-2">{b}</span>
              {i < duongDi.length - 1 && <span className="text-muc-3">→</span>}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muc-3">
          Đường đi tính theo số tiền của hồ sơ này.
        </p>
      </div>

      {/* ── Nhật ký ──────────────────────────────────────── */}
      <div className="khoi mt-5 p-5">
        <h2 className="mb-4 font-bold text-muc">Nhật ký hồ sơ</h2>
        <DongThoiGian buoc={(buoc ?? []) as Buoc[]} />
      </div>

      {/* ── Mã tra cứu ───────────────────────────────────── */}
      <div className="khoi mt-5 p-5">
        <h2 className="font-bold text-muc">Mã tra cứu của bạn</h2>
        <p className="mt-1 mb-3 text-sm text-muc-2">
          Lưu mã này lại. Có mã là mở được hồ sơ mà không cần tài khoản.
        </p>
        <p className="so rounded-md border border-vien bg-mat-2 px-4 py-3 text-lg font-bold tracking-widest text-muc">
          {hoSo.lookup_token}
        </p>
      </div>
    </main>
  );
}
