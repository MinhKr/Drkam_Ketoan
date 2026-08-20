import Link from 'next/link';
import { batBuocDangNhap } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { TRANG_THAI, TRANG_THAI_DANG_CHAY } from '@/lib/constants';
import type { TrangThaiHoSo } from '@/lib/supabase/types';
import { dinhDangNgay, dinhDangTien, khoangCachThoiGian } from '@/lib/dinh-dang';
import { TheTrangThai } from '@/components/the-trang-thai';
import { TrangRong } from '@/components/trang-rong';

export const metadata = { title: 'Tất cả hồ sơ · DrKam Duyệt Chi' };

/** Số hồ sơ hiện trên một trang. */
const MOI_TRANG = 50;

/** Giá trị riêng của ô lọc, gộp sáu trạng thái đang nằm trong luồng duyệt. */
const DANG_CHAY = 'Đang chạy';

/**
 * PostgREST đọc chuỗi lọc theo dấu phẩy và ngoặc, còn ilike đọc % và _.
 * Bỏ hết mấy ký tự đó đi thì người dùng gõ gì cũng chỉ là chữ để tìm.
 */
function sachTuKhoa(tu: string): string {
  return tu.replace(/[,()%_*\\]/g, ' ').trim().slice(0, 60);
}

export default async function TrangDanhSachHoSo({ searchParams }: PageProps<'/ho-so'>) {
  await batBuocDangNhap('/ho-so');
  const supabase = await createClient();

  const thamSo = await searchParams;
  const doc = (ten: string) => {
    const v = thamSo[ten];
    return typeof v === 'string' ? v : '';
  };

  const locTrangThai = doc('trangThai');
  const locPhong = doc('phong');
  const tuKhoa = sachTuKhoa(doc('tim'));
  const trang = Math.max(1, Number(doc('trang')) || 1);

  const { data: phongBan } = await supabase
    .from('departments')
    .select('id, code, name')
    .order('sort_order')
    .order('code');

  let cauHoi = supabase
    .from('payment_requests')
    .select(
      `id, code, requester_name, total_amount, status, request_date, submitted_at,
       departments(name, code)`,
      { count: 'exact' },
    );

  if (locTrangThai === DANG_CHAY) {
    cauHoi = cauHoi.in('status', TRANG_THAI_DANG_CHAY);
  } else if (locTrangThai) {
    cauHoi = cauHoi.eq('status', locTrangThai as TrangThaiHoSo);
  }

  if (locPhong) cauHoi = cauHoi.eq('department_id', locPhong);

  if (tuKhoa) {
    cauHoi = cauHoi.or(
      `code.ilike.%${tuKhoa}%,requester_name.ilike.%${tuKhoa}%,beneficiary_name.ilike.%${tuKhoa}%`,
    );
  }

  const dau = (trang - 1) * MOI_TRANG;
  const { data, count } = await cauHoi
    .order('created_at', { ascending: false })
    .range(dau, dau + MOI_TRANG - 1);

  const hoSo = (data ?? []) as unknown as {
    id: string;
    code: string;
    requester_name: string;
    total_amount: number;
    status: string;
    request_date: string;
    submitted_at: string | null;
    departments: { name: string; code: string } | null;
  }[];

  const tong = count ?? 0;
  const soTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));
  const tongTien = hoSo.reduce((t, h) => t + h.total_amount, 0);

  /** Giữ nguyên bộ lọc khi bấm sang trang khác. */
  const duongDanTrang = (t: number) => {
    const q = new URLSearchParams();
    if (locTrangThai) q.set('trangThai', locTrangThai);
    if (locPhong) q.set('phong', locPhong);
    if (tuKhoa) q.set('tim', tuKhoa);
    if (t > 1) q.set('trang', String(t));
    const chuoi = q.toString();
    return chuoi ? `/ho-so?${chuoi}` : '/ho-so';
  };

  const dangLoc = Boolean(locTrangThai || locPhong || tuKhoa);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-muc">Tất cả hồ sơ</h1>
        <p className="mt-1 text-sm text-muc-2">
          {tong === 0
            ? 'Không có hồ sơ nào khớp bộ lọc.'
            : `${tong} hồ sơ${dangLoc ? ' khớp bộ lọc' : ''}. Mới nộp xếp lên trên.`}
        </p>
      </div>

      {/* ── Bộ lọc ───────────────────────────────────────── */}
      <form className="khoi flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <label className="nhan-o" htmlFor="tim">
            Tìm số BK, người đề nghị, người nhận
          </label>
          <input
            id="tim"
            name="tim"
            className="o-nhap"
            defaultValue={tuKhoa}
            placeholder="MKT/101 hoặc Phương Anh"
          />
        </div>

        <div className="min-w-[180px]">
          <label className="nhan-o" htmlFor="trangThai">
            Trạng thái
          </label>
          <select id="trangThai" name="trangThai" className="o-nhap" defaultValue={locTrangThai}>
            <option value="">Tất cả</option>
            <option value={DANG_CHAY}>Đang chạy trong luồng</option>
            {Object.values(TRANG_THAI).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[180px]">
          <label className="nhan-o" htmlFor="phong">
            Phòng ban
          </label>
          <select id="phong" name="phong" className="o-nhap" defaultValue={locPhong}>
            <option value="">Tất cả</option>
            {(phongBan ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="nut nut-chinh">
          Lọc
        </button>
        {dangLoc && (
          <Link href="/ho-so" className="nut nut-phu">
            Bỏ lọc
          </Link>
        )}
      </form>

      {/* ── Danh sách ────────────────────────────────────── */}
      {hoSo.length === 0 ? (
        <TrangRong
          tieuDe="Chưa có hồ sơ nào"
          moTa={
            dangLoc
              ? 'Thử bỏ bớt điều kiện lọc.'
              : 'Hồ sơ nhân viên các phòng nộp lên sẽ hiện ở đây.'
          }
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
                <th>Ngày đề nghị</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {hoSo.map((h) => (
                <tr key={h.id}>
                  <td>
                    <Link
                      href={`/ho-so/${h.id}`}
                      className="so font-semibold text-chinh hover:underline"
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
                  <td className="so text-muc-2">{dinhDangNgay(h.request_date)}</td>
                  <td className="text-muc-3">{khoangCachThoiGian(h.submitted_at)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="text-right font-semibold text-muc">
                  Cộng {hoSo.length} hồ sơ trong trang này
                </td>
                <td className="so text-right text-base font-bold text-muc">
                  {dinhDangTien(tongTien)}
                </td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Chuyển trang ─────────────────────────────────── */}
      {soTrang > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muc-3">
            Trang {trang}/{soTrang}
          </span>
          <div className="flex gap-2">
            {trang > 1 && (
              <Link href={duongDanTrang(trang - 1)} className="nut nut-phu px-3 py-1.5">
                ← Trước
              </Link>
            )}
            {trang < soTrang && (
              <Link href={duongDanTrang(trang + 1)} className="nut nut-phu px-3 py-1.5">
                Sau →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
