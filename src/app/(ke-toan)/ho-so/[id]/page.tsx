import Link from 'next/link';
import { notFound } from 'next/navigation';
import { batBuocDangNhap } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TheTrangThai } from '@/components/the-trang-thai';
import { DongThoiGian, type Buoc } from '@/components/dong-thoi-gian';
import { LuoiChungTu } from '@/components/luoi-chung-tu';
import { HINH_THUC_CHI, TRANG_THAI, VAI_TRO, coVaiTro } from '@/lib/constants';
import { buocKeTiep, duocXuLy, layHanMuc, moTaDuongDi, vaiTroXuLy } from '@/lib/luong-duyet';
import {
  dinhDangNgay,
  dinhDangNgayGio,
  dinhDangTien,
  docSoThanhChu,
  khoangCachThoiGian,
  tachNhomSoTaiKhoan,
} from '@/lib/dinh-dang';
import { BangThaoTac } from './bang-thao-tac';
import { FormChiTien } from './form-chi-tien';

export const metadata = { title: 'Hồ sơ · DrKam Duyệt Chi' };

export default async function TrangChiTietHoSo({ params }: PageProps<'/ho-so/[id]'>) {
  const { id } = await params;
  const nguoiDung = await batBuocDangNhap(`/ho-so/${id}`);
  const supabase = await createClient();

  const { data: hoSo } = await supabase
    .from('payment_requests')
    .select(
      `id, code, lookup_token, status, total_amount, payment_method, request_date, due_date,
       beneficiary_name, tax_code, contact_phone, recipient_account, recipient_bank,
       recipient_holder, note, requester_name, submitted_at, last_return_reason, return_count,
       holder_id, department_id,
       departments(name, code, requires_head_approval),
       profiles(full_name, job_title)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (!hoSo) notFound();

  const phong = hoSo.departments as unknown as {
    name: string;
    code: string;
    requires_head_approval: boolean;
  } | null;
  const nguoiGiu = hoSo.profiles as unknown as {
    full_name: string;
    job_title: string | null;
  } | null;

  const [{ data: dong }, { data: tep }, { data: buoc }, { data: khoanChi }, hanMuc] =
    await Promise.all([
      supabase
        .from('request_lines')
        .select('id, line_no, expense_type, description, amount')
        .eq('request_id', hoSo.id)
        .order('line_no'),
      supabase
        .from('attachments')
        .select('id, kind, file_name, storage_path, mime_type, size_bytes, created_at')
        .eq('request_id', hoSo.id)
        .order('created_at'),
      supabase
        .from('request_events')
        .select('id, action, to_status, actor_name, actor_role, note, created_at')
        .eq('request_id', hoSo.id)
        .order('created_at'),
      supabase
        .from('payments')
        .select('unc_number, paid_at, from_account, amount_paid, created_at')
        .eq('request_id', hoSo.id)
        .maybeSingle(),
      layHanMuc(supabase),
    ]);

  // Link xem chứng từ có hạn một giờ. Ký bằng khóa máy chủ cho chắc, khỏi phụ
  // thuộc vào phiên đăng nhập còn hạn hay không lúc bấm mở ảnh.
  const db = createAdminClient();
  const tepCoLink = await Promise.all(
    (tep ?? []).map(async (t) => {
      const { data } = await db.storage.from('chung-tu').createSignedUrl(t.storage_path, 3600);
      return { ...t, link: data?.signedUrl ?? null };
    }),
  );

  const duongDi = moTaDuongDi(
    hoSo.total_amount,
    phong?.requires_head_approval ?? false,
    hanMuc,
  );
  const buocDangCho = hoSo.status.replace('Chờ ', '').toLowerCase();

  const trangThaiKeTiep = buocKeTiep(hoSo.status, hoSo.total_amount, hanMuc);
  const denLuotMinh = duocXuLy(nguoiDung, hoSo);
  const dongHoSo =
    hoSo.status === TRANG_THAI.HOAN_THANH || hoSo.status === TRANG_THAI.DA_HUY;

  // Danh mục tài khoản chi chỉ cần khi sắp hiện khung ghi nhận chi tiền.
  const chiDuoc = denLuotMinh && hoSo.status === TRANG_THAI.CHO_CHI;
  const { data: taiKhoanCongTy } = chiDuoc
    ? await supabase
        .from('bank_accounts')
        .select('id, account_number, bank_name')
        .eq('is_company_account', true)
        .eq('active', true)
        .order('bank_name')
    : { data: [] };

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/bang-dieu-khien" className="text-sm text-muc-2 hover:text-chinh">
          ← Chờ tôi xử lý
        </Link>
        <Link href="/ho-so" className="text-sm text-muc-2 hover:text-chinh">
          Tất cả hồ sơ
        </Link>
      </div>

      {/* ── Đầu hồ sơ ────────────────────────────────────── */}
      <div className="khoi p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="so text-2xl font-bold text-muc">{hoSo.code}</p>
            <p className="mt-0.5 text-sm text-muc-2">
              {hoSo.requester_name} · {phong?.name ?? '—'}
            </p>
          </div>
          <div className="text-right">
            <TheTrangThai trangThai={hoSo.status} />
            <p className="mt-1 text-xs text-muc-3">
              {nguoiGiu
                ? `Đang ở bàn ${nguoiGiu.full_name}`
                : vaiTroXuLy(hoSo.status)
                  ? `Hàng chờ chung của ${vaiTroXuLy(hoSo.status)?.toLowerCase()}`
                  : 'Không nằm trên bàn ai'}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-vien pt-4">
          <p className="so text-3xl font-bold text-muc">
            {dinhDangTien(hoSo.total_amount)} ₫
          </p>
          <p className="text-sm text-chinh">{docSoThanhChu(hoSo.total_amount)}</p>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-vien pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold text-muc-3 uppercase">Hình thức chi</dt>
            <dd className="text-sm text-muc">{hoSo.payment_method}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muc-3 uppercase">Ngày đề nghị</dt>
            <dd className="so text-sm text-muc">{dinhDangNgay(hoSo.request_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muc-3 uppercase">Hạn thanh toán</dt>
            <dd className="so text-sm text-muc">
              {hoSo.due_date ? dinhDangNgay(hoSo.due_date) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muc-3 uppercase">Nộp lúc</dt>
            <dd className="text-sm text-muc">
              {hoSo.submitted_at ? (
                <>
                  {dinhDangNgayGio(hoSo.submitted_at)}{' '}
                  <span className="text-muc-3">({khoangCachThoiGian(hoSo.submitted_at)})</span>
                </>
              ) : (
                'Chưa nộp'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muc-3 uppercase">Số lần trả về</dt>
            <dd className="so text-sm text-muc">{hoSo.return_count}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muc-3 uppercase">Bản giấy</dt>
            <dd className="text-sm">
              <Link
                href={`/tra-cuu/${hoSo.lookup_token}/in`}
                className="text-chinh hover:underline"
              >
                Mở phiếu ĐNTT để đối chiếu
              </Link>
            </dd>
          </div>
        </dl>

        {hoSo.note && (
          <p className="mt-4 border-t border-vien pt-4 text-sm text-muc-2">
            <span className="font-semibold text-muc">Ghi chú của người nộp: </span>
            {hoSo.note}
          </p>
        )}
      </div>

      {/* ── Đang bị trả về ───────────────────────────────── */}
      {hoSo.status === TRANG_THAI.TRA_VE && (
        <div className="mt-5 rounded-md border border-dau/40 bg-dau-nhat px-4 py-4">
          <p className="font-semibold text-dau">
            Đã trả về người đề nghị
            {hoSo.return_count > 1 && ` (lần thứ ${hoSo.return_count})`}
          </p>
          <p className="mt-1.5 text-sm text-muc-2">
            <span className="font-semibold text-muc">Lý do: </span>
            {hoSo.last_return_reason ?? 'Không ghi lý do'}
          </p>
          <p className="mt-2 text-sm text-muc-2">
            Hồ sơ đang nằm ở phía người nộp. Sửa xong họ nộp lại thì nó chạy lại từ đầu
            luồng, về bàn kế toán viên đang phụ trách phòng đó.
          </p>
        </div>
      )}

      {/* ── Đã chi xong ──────────────────────────────────── */}
      {khoanChi && (
        <div className="mt-5 rounded-md border border-xong/30 bg-xong-nhat px-4 py-4">
          <p className="font-semibold text-xong">Đã chi và đóng hồ sơ</p>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold text-muc-3 uppercase">Số tiền đã chi</dt>
              <dd className="so text-sm font-bold text-muc">
                {dinhDangTien(khoanChi.amount_paid)} ₫
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muc-3 uppercase">Ngày chi</dt>
              <dd className="so text-sm text-muc">{dinhDangNgay(khoanChi.paid_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muc-3 uppercase">
                {hoSo.payment_method === HINH_THUC_CHI.CHUYEN_KHOAN ? 'Số UNC' : 'Số phiếu chi'}
              </dt>
              <dd className="so text-sm text-muc">{khoanChi.unc_number ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muc-3 uppercase">Chi từ</dt>
              <dd className="text-sm text-muc">{khoanChi.from_account ?? '—'}</dd>
            </div>
          </dl>
          {khoanChi.amount_paid !== hoSo.total_amount && (
            <p className="mt-3 text-sm text-dau">
              Số chi lệch {dinhDangTien(Math.abs(khoanChi.amount_paid - hoSo.total_amount))} ₫ so
              với số đề nghị. Lý do ghi trong nhật ký bên dưới.
            </p>
          )}
        </div>
      )}

      {/* ── Thao tác ─────────────────────────────────────── */}
      <BangThaoTac
        id={hoSo.id}
        duyetDuoc={denLuotMinh && trangThaiKeTiep !== null}
        traVeDuoc={denLuotMinh}
        huyDuoc={coVaiTro(nguoiDung.roles, VAI_TRO.KE_TOAN_TRUONG, VAI_TRO.QUAN_TRI) && !dongHoSo}
        trangThaiKeTiep={trangThaiKeTiep}
      />

      {chiDuoc && (
        <FormChiTien
          id={hoSo.id}
          soBK={hoSo.code}
          soTienDeNghi={hoSo.total_amount}
          chuyenKhoan={hoSo.payment_method === HINH_THUC_CHI.CHUYEN_KHOAN}
          taiKhoanCongTy={taiKhoanCongTy ?? []}
        />
      )}

      {/* ── Người nhận tiền ──────────────────────────────── */}
      <div className="khoi mt-5 p-5">
        <h2 className="mb-3 font-bold text-muc">Trả tiền cho</h2>
        <p className="font-semibold text-muc">{hoSo.beneficiary_name ?? '—'}</p>
        {(hoSo.tax_code || hoSo.contact_phone) && (
          <p className="mt-0.5 text-sm text-muc-2">
            {[hoSo.tax_code && `MST/CCCD ${hoSo.tax_code}`, hoSo.contact_phone]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
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

      {/* ── Nội dung thanh toán ──────────────────────────── */}
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

      {/* ── Đường đi ─────────────────────────────────────── */}
      <div className="khoi mt-5 p-5">
        <h2 className="mb-3 font-bold text-muc">Hồ sơ đi qua những ai</h2>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {duongDi.map((b, i) => {
            const dangDung = b.toLowerCase() === buocDangCho;
            return (
              <li key={b} className="flex items-center gap-2">
                <span
                  className={
                    dangDung
                      ? 'rounded-md bg-chinh px-2.5 py-1 text-sm font-semibold text-white'
                      : 'rounded-md bg-mat-2 px-2.5 py-1 text-sm text-muc-2'
                  }
                >
                  {b}
                </span>
                {i < duongDi.length - 1 && <span className="text-muc-3">→</span>}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muc-3">
          Đường đi tính theo số tiền của hồ sơ này. Ô tô đậm là khâu đang giữ hồ sơ.
        </p>
      </div>

      {/* ── Nhật ký ──────────────────────────────────────── */}
      <div className="khoi mt-5 p-5">
        <h2 className="mb-4 font-bold text-muc">Nhật ký hồ sơ</h2>
        <DongThoiGian buoc={(buoc ?? []) as Buoc[]} />
      </div>
    </div>
  );
}
