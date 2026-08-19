import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ChuaCauHinh, daCauHinhSupabase } from '@/components/chua-cau-hinh';
import { FormDeNghi, type GiaTriBanDau } from '@/app/de-nghi/moi/form-de-nghi';
import { TRANG_THAI } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Sửa hồ sơ · DrKam Duyệt Chi' };

export default async function TrangSuaHoSo({ params }: PageProps<'/tra-cuu/[ma]/sua'>) {
  if (!daCauHinhSupabase()) return <ChuaCauHinh />;

  const { ma } = await params;
  const db = createAdminClient();

  const { data: hoSo } = await db
    .from('payment_requests')
    .select(
      `id, code, lookup_token, status, payment_method, due_date, note,
       requester_name, department_id,
       beneficiary_name, tax_code, contact_phone,
       recipient_account, recipient_bank, recipient_holder, last_return_reason`,
    )
    .eq('lookup_token', ma.toUpperCase())
    .maybeSingle();

  if (!hoSo) notFound();

  const laNhap = hoSo.status === TRANG_THAI.NHAP;
  const biTraVe = hoSo.status === TRANG_THAI.TRA_VE;

  if (!laNhap && !biTraVe) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="khoi p-8">
          <h1 className="text-xl font-bold text-muc">Hồ sơ này không sửa được nữa</h1>
          <p className="mt-2 text-sm text-muc-2">
            Hồ sơ <span className="so font-semibold">{hoSo.code}</span> đang ở trạng thái
            “{hoSo.status}” — nghĩa là đã có người đang xử lý. Chỉ hồ sơ nháp hoặc hồ sơ bị
            trả về mới sửa được.
          </p>
          <div className="mt-5">
            <Link href={`/tra-cuu/${hoSo.lookup_token}`} className="nut nut-chinh">
              Xem hồ sơ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [phongBanKq, loaiChiPhiKq, dongKq, tepKq] =
    await Promise.all([
      db
        .from('departments')
        .select('id, code, name')
        .eq('active', true)
        .order('sort_order')
        .order('name'),
      db.from('expense_types').select('name').eq('active', true).order('sort_order'),
      db
        .from('request_lines')
        .select('line_no, expense_type, description, amount')
        .eq('request_id', hoSo.id)
        .order('line_no'),
      db
        .from('attachments')
        .select('file_name, storage_path, mime_type, size_bytes')
        .eq('request_id', hoSo.id)
        .eq('kind', 'Chứng từ')
        .order('created_at'),
    ]);

  const banDau: GiaTriBanDau = {
    maTraCuu: hoSo.lookup_token,
    soBK: hoSo.code,
    laNhap,
    tenNguoiDeNghi: hoSo.requester_name,
    phongBanId: hoSo.department_id,
    hinhThucChi: hoSo.payment_method,
    hanThanhToan: hoSo.due_date ?? '',
    ghiChu: hoSo.note ?? '',
    tenNguoiNhan: hoSo.beneficiary_name ?? '',
    soTaiKhoanNhan: hoSo.recipient_account ?? '',
    nganHangNhan: hoSo.recipient_bank ?? '',
    tenChuTaiKhoanNhan: hoSo.recipient_holder ?? '',
    mstCccd: hoSo.tax_code ?? '',
    soDienThoaiLienHe: hoSo.contact_phone ?? '',
    dongChiTiet: (dongKq.data ?? []).map((d) => ({
      loaiChiPhi: d.expense_type ?? '',
      noiDung: d.description,
      soTien: d.amount,
    })),
    tepDinhKem: (tepKq.data ?? []).map((t) => ({
      duongDan: t.storage_path,
      tenTep: t.file_name,
      kieuTep: t.mime_type,
      dungLuong: t.size_bytes,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link href={`/tra-cuu/${hoSo.lookup_token}`} className="text-sm text-muc-2 hover:text-chinh">
          ← Về hồ sơ {hoSo.code}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-muc sm:text-3xl">
          {laNhap ? 'Hoàn thiện hồ sơ' : 'Sửa và nộp lại'}
        </h1>
        <p className="mt-1 text-sm text-muc-2">
          Hồ sơ giữ nguyên số BK <span className="so font-semibold">{hoSo.code}</span>.
        </p>
      </div>

      {biTraVe && (
        <div className="mb-5 rounded-md border border-dau/40 bg-dau-nhat px-4 py-4">
          <p className="font-semibold text-dau">Kế toán đã trả về vì:</p>
          <p className="mt-1 text-sm text-muc-2">
            {hoSo.last_return_reason ?? 'Không ghi lý do'}
          </p>
        </div>
      )}

      <FormDeNghi
        phongBan={phongBanKq.data ?? []}
        loaiChiPhi={(loaiChiPhiKq.data ?? []).map((l) => l.name)}
        banDau={banDau}
      />
    </main>
  );
}
