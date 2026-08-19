'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { nopDeNghi, type DongChiTiet, type TepDaTai } from './actions';
import { capNhatDeNghi } from '@/app/tra-cuu/[ma]/sua/actions';
import { DANH_SACH_NGAN_HANG, GIOI_HAN_TAI_LEN_MB, HINH_THUC_CHI } from '@/lib/constants';
import { dinhDangTien, docSoThanhChu, docTienTuChuoi } from '@/lib/dinh-dang';

type PhongBan = { id: string; code: string; name: string };

type Tep = TepDaTai & { xemTruoc: string | null };

/** Giá trị có sẵn khi mở lại hồ sơ nháp hoặc hồ sơ bị trả về. */
export type GiaTriBanDau = {
  maTraCuu: string;
  soBK: string;
  laNhap: boolean;
  tenNguoiDeNghi: string;
  phongBanId: string;
  hinhThucChi: string;
  hanThanhToan: string;
  ghiChu: string;
  tenNguoiNhan: string;
  soTaiKhoanNhan: string;
  nganHangNhan: string;
  tenChuTaiKhoanNhan: string;
  mstCccd: string;
  soDienThoaiLienHe: string;
  dongChiTiet: DongChiTiet[];
  tepDinhKem: TepDaTai[];
};

const DONG_TRONG: DongChiTiet = { loaiChiPhi: '', noiDung: '', soTien: 0 };

/**
 * Nén ảnh ngay trên trình duyệt trước khi tải lên.
 * Dùng Canvas có sẵn của trình duyệt, không cần thư viện ngoài.
 */
async function nenAnh(tep: File): Promise<File> {
  if (!tep.type.startsWith('image/') || tep.type === 'image/heic') return tep;

  try {
    const anh = await createImageBitmap(tep, { imageOrientation: 'from-image' });
    const canhToiDa = 2000;
    const tyLe = Math.min(1, canhToiDa / Math.max(anh.width, anh.height));

    // Ảnh đã nhỏ sẵn thì giữ nguyên, khỏi nén lại cho mờ.
    if (tyLe === 1 && tep.size < 1_200_000) return tep;

    const rong = Math.round(anh.width * tyLe);
    const cao = Math.round(anh.height * tyLe);
    const canvas = document.createElement('canvas');
    canvas.width = rong;
    canvas.height = cao;

    const ctx = canvas.getContext('2d');
    if (!ctx) return tep;
    ctx.drawImage(anh, 0, 0, rong, cao);
    anh.close();

    const blob = await new Promise<Blob | null>((tra) =>
      canvas.toBlob(tra, 'image/jpeg', 0.82),
    );
    if (!blob || blob.size >= tep.size) return tep;

    return new File([blob], tep.name.replace(/\.[^.]+$/, '') + '.jpg', {
      type: 'image/jpeg',
    });
  } catch {
    return tep;
  }
}

function dinhDangDungLuong(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / 1024 / 1024).toFixed(1)} MB`;
}

export function FormDeNghi({
  phongBan,
  loaiChiPhi,
  banDau,
}: {
  phongBan: PhongBan[];
  loaiChiPhi: string[];
  banDau?: GiaTriBanDau;
}) {
  const laSua = Boolean(banDau);
  const [tenNguoiDeNghi, datTenNguoiDeNghi] = useState(banDau?.tenNguoiDeNghi ?? '');
  const [phongBanId, datPhongBanId] = useState(banDau?.phongBanId ?? '');
  const [dong, datDong] = useState<DongChiTiet[]>(
    banDau?.dongChiTiet.length ? banDau.dongChiTiet : [{ ...DONG_TRONG }],
  );
  const [hinhThucChi, datHinhThucChi] = useState<string>(
    banDau?.hinhThucChi ?? HINH_THUC_CHI.CHUYEN_KHOAN,
  );
  const [tenNguoiNhan, datTenNguoiNhan] = useState(banDau?.tenNguoiNhan ?? '');
  const [soTaiKhoanNhan, datSoTaiKhoanNhan] = useState(banDau?.soTaiKhoanNhan ?? '');
  const [nganHangNhan, datNganHangNhan] = useState(banDau?.nganHangNhan ?? '');
  const [tenChuTaiKhoanNhan, datTenChuTaiKhoanNhan] = useState(
    banDau?.tenChuTaiKhoanNhan ?? '',
  );
  const [mstCccd, datMstCccd] = useState(banDau?.mstCccd ?? '');
  const [soDienThoaiLienHe, datSoDienThoaiLienHe] = useState(
    banDau?.soDienThoaiLienHe ?? '',
  );
  const [hanThanhToan, datHanThanhToan] = useState(banDau?.hanThanhToan ?? '');
  const [ghiChu, datGhiChu] = useState(banDau?.ghiChu ?? '');
  const [tep, datTep] = useState<Tep[]>(
    (banDau?.tepDinhKem ?? []).map((t) => ({ ...t, xemTruoc: null })),
  );
  const [dangTai, datDangTai] = useState(false);
  const [dangKeo, datDangKeo] = useState(false);
  const [xemLon, datXemLon] = useState<string | null>(null);
  const [loi, datLoi] = useState<string | null>(null);
  const [dangGui, batDauGui] = useTransition();

  const chuyenKhoan = hinhThucChi === HINH_THUC_CHI.CHUYEN_KHOAN;

  const tongTien = useMemo(() => dong.reduce((t, d) => t + (d.soTien || 0), 0), [dong]);

  function suaDong(i: number, thayDoi: Partial<DongChiTiet>) {
    datDong((cu) => cu.map((d, j) => (i === j ? { ...d, ...thayDoi } : d)));
  }

  const themTep = useCallback(async (danhSach: FileList | File[] | null) => {
    if (!danhSach?.length) return;
    datLoi(null);
    datDangTai(true);

    for (const goc of Array.from(danhSach)) {
      try {
        const daNen = await nenAnh(goc);

        // Chặn tại chỗ. Gửi đi rồi mới hỏng thì người dùng chỉ nhận được lỗi
        // của nền tảng, không đọc hiểu được.
        if (daNen.size > GIOI_HAN_TAI_LEN_MB * 1024 * 1024) {
          const mb = (daNen.size / 1024 / 1024).toFixed(1);
          datLoi(
            `Tệp "${goc.name}" nặng ${mb} MB, quá mức ${GIOI_HAN_TAI_LEN_MB} MB. ` +
              'Ảnh thì chụp lại nhỏ hơn; PDF nhiều trang thì tách ra vài tệp.',
          );
          continue;
        }

        const duLieu = new FormData();
        duLieu.append('tep', daNen);

        const phanHoi = await fetch('/api/tep', { method: 'POST', body: duLieu });
        const ketQua = await phanHoi.json();

        if (!phanHoi.ok) {
          datLoi(ketQua.loi ?? 'Không tải lên được tệp.');
          continue;
        }

        datTep((cu) => [
          ...cu,
          {
            ...(ketQua as TepDaTai),
            xemTruoc: daNen.type.startsWith('image/') ? URL.createObjectURL(daNen) : null,
          },
        ]);
      } catch {
        datLoi(`Không tải lên được "${goc.name}". Thử lại giúp bạn.`);
      }
    }

    datDangTai(false);
  }, []);

  /**
   * Dán ảnh bằng Ctrl+V.
   *
   * Phần lớn chứng từ ở đây là ảnh chụp màn hình giao dịch — nạp ads Facebook,
   * ChatGPT, Capcut, Zalo Business. Chụp màn hình rồi dán thẳng vào nhanh hơn
   * hẳn so với lưu ra tệp rồi đi tìm lại.
   */
  useEffect(() => {
    function khiDan(e: ClipboardEvent) {
      const anh = Array.from(e.clipboardData?.items ?? [])
        .filter((m) => m.kind === 'file' && m.type.startsWith('image/'))
        .map((m) => m.getAsFile())
        .filter((f): f is File => f !== null);

      if (anh.length === 0) return;
      e.preventDefault();

      const gio = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      void themTep(
        anh.map(
          (f, i) =>
            new File([f], `Ảnh dán ${gio}${anh.length > 1 ? ` (${i + 1})` : ''}.png`, {
              type: f.type,
            }),
        ),
      );
    }

    document.addEventListener('paste', khiDan);
    return () => document.removeEventListener('paste', khiDan);
  }, [themTep]);

  /** Đóng khung xem ảnh lớn bằng phím Esc. */
  useEffect(() => {
    if (!xemLon) return;
    function khiBamPhim(e: KeyboardEvent) {
      if (e.key === 'Escape') datXemLon(null);
    }
    document.addEventListener('keydown', khiBamPhim);
    return () => document.removeEventListener('keydown', khiBamPhim);
  }, [xemLon]);

  function boTep(duongDan: string) {
    datTep((cu) => {
      const bo = cu.find((t) => t.duongDan === duongDan);
      if (bo?.xemTruoc) URL.revokeObjectURL(bo.xemTruoc);
      return cu.filter((t) => t.duongDan !== duongDan);
    });
  }

  function gui(luuNhap: boolean) {
    datLoi(null);
    batDauGui(async () => {
      const duLieu = {
        tenNguoiDeNghi,
        phongBanId,
        hinhThucChi,
        hanThanhToan,
        ghiChu,
        tenNguoiNhan,
        soTaiKhoanNhan,
        nganHangNhan,
        tenChuTaiKhoanNhan,
        mstCccd,
        soDienThoaiLienHe,
        dongChiTiet: dong,
        tepDinhKem: tep.map(({ duongDan, tenTep, kieuTep, dungLuong }) => ({
          duongDan,
          tenTep,
          kieuTep,
          dungLuong,
        })),
        luuNhap,
      };
      const ketQua = banDau
        ? await capNhatDeNghi(banDau.maTraCuu, duLieu)
        : await nopDeNghi(duLieu);
      if (ketQua?.loi) datLoi(ketQua.loi);
    });
  }

  const dangBan = dangGui || dangTai;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Người đề nghị ────────────────────────────────── */}
      <section className="khoi p-5">
        <h2 className="mb-3 font-bold text-muc">1. Bạn là ai</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="nhan-o" htmlFor="tenNguoiDeNghi">
              Họ và tên của bạn
            </label>
            <input
              id="tenNguoiDeNghi"
              className="o-nhap"
              value={tenNguoiDeNghi}
              onChange={(e) => datTenNguoiDeNghi(e.target.value)}
              placeholder="Đỗ Thị Hồng Nhung"
              autoComplete="name"
            />
            <p className="mt-1 text-xs text-muc-3">
              Ghi họ tên đầy đủ — tên này in lên phiếu ở ô “Người làm đơn”.
            </p>
          </div>
          <div>
            <label className="nhan-o" htmlFor="phongBanId">
              Phòng ban
            </label>
            <select
              id="phongBanId"
              className="o-nhap"
              value={phongBanId}
              onChange={(e) => datPhongBanId(e.target.value)}
              // Số BK đã cấp theo phòng cũ nên hồ sơ đang sửa không đổi phòng được.
              disabled={laSua}
            >
              <option value="">— Chọn phòng ban —</option>
              {phongBan.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {laSua && (
              <p className="mt-1 text-xs text-muc-3">
                Hồ sơ đã cấp số theo phòng này nên không đổi được nữa.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Nội dung thanh toán ──────────────────────────── */}
      <section className="khoi p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold text-muc">2. Nội dung thanh toán</h2>
          <p className="text-sm text-muc-3">
            Nhiều dòng sẽ gộp chung vào một phiếu ĐNTT, giống sheet MẪU ĐNTT.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {dong.map((d, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_150px_auto] sm:items-end">
              <div>
                {i === 0 && <label className="nhan-o">Loại chi phí</label>}
                <input
                  className="o-nhap"
                  list="ds-loai-chi-phi"
                  value={d.loaiChiPhi}
                  onChange={(e) => suaDong(i, { loaiChiPhi: e.target.value })}
                  placeholder="Nạp ads Facebook"
                />
              </div>
              <div>
                {i === 0 && <label className="nhan-o">Nội dung chi tiết</label>}
                <input
                  className="o-nhap"
                  value={d.noiDung}
                  onChange={(e) => suaDong(i, { noiDung: e.target.value })}
                  placeholder="Nạp ads FB tài khoản DrKam tháng 8"
                />
              </div>
              <div>
                {i === 0 && <label className="nhan-o">Số tiền</label>}
                <input
                  className="o-nhap so text-right"
                  inputMode="numeric"
                  value={d.soTien ? dinhDangTien(d.soTien) : ''}
                  onChange={(e) => suaDong(i, { soTien: docTienTuChuoi(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <button
                type="button"
                className="nut nut-phu px-2.5 py-2 text-xs"
                onClick={() => datDong((cu) => cu.filter((_, j) => j !== i))}
                disabled={dong.length === 1}
                title="Xóa dòng này"
              >
                Xóa
              </button>
            </div>
          ))}
          <datalist id="ds-loai-chi-phi">
            {loaiChiPhi.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>

        <button
          type="button"
          className="nut nut-phu mt-3 px-3 py-1.5 text-sm"
          onClick={() => datDong((cu) => [...cu, { ...DONG_TRONG }])}
        >
          + Thêm dòng
        </button>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-vien pt-3">
          <span className="font-semibold text-muc">Tổng cộng</span>
          <div className="text-right">
            <p className="so text-2xl font-bold text-muc">{dinhDangTien(tongTien)} ₫</p>
            {tongTien > 0 && (
              <p className="text-sm text-chinh">{docSoThanhChu(tongTien)}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Người nhận tiền ──────────────────────────────── */}
      <section className="khoi p-5">
        <h2 className="mb-3 font-bold text-muc">3. Trả tiền cho ai</h2>

        <div className="mb-4 flex flex-wrap gap-4">
          {[HINH_THUC_CHI.CHUYEN_KHOAN, HINH_THUC_CHI.TIEN_MAT].map((h) => (
            <label key={h} className="flex items-center gap-2 text-sm text-muc-2">
              <input
                type="radio"
                name="hinhThucChi"
                checked={hinhThucChi === h}
                onChange={() => datHinhThucChi(h)}
              />
              {h}
            </label>
          ))}
        </div>

        {chuyenKhoan && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="rounded-md border border-cho/30 bg-cho-nhat px-3 py-2 text-sm text-cho">
                Gõ lại từng chữ số theo chứng từ gốc. Đừng dán từ Excel — Excel hay bóp số
                dài thành dạng <span className="so">6.635E+14</span> và làm mất chữ số.
              </p>
            </div>
            <div>
              <label className="nhan-o">Tên đơn vị / người nhận</label>
              <input
                className="o-nhap"
                value={tenNguoiNhan}
                onChange={(e) => datTenNguoiNhan(e.target.value)}
              />
            </div>
            <div>
              <label className="nhan-o">Tên chủ tài khoản</label>
              <input
                className="o-nhap uppercase"
                value={tenChuTaiKhoanNhan}
                onChange={(e) => datTenChuTaiKhoanNhan(e.target.value)}
                placeholder="NGUYEN VAN A"
              />
            </div>
            <div>
              <label className="nhan-o">Số tài khoản</label>
              <input
                className="o-nhap so"
                inputMode="numeric"
                autoComplete="off"
                value={soTaiKhoanNhan}
                onChange={(e) => datSoTaiKhoanNhan(e.target.value)}
              />
            </div>
            <div>
              <label className="nhan-o">Ngân hàng</label>
              <input
                className="o-nhap"
                list="ds-ngan-hang"
                value={nganHangNhan}
                onChange={(e) => datNganHangNhan(e.target.value)}
              />
              <datalist id="ds-ngan-hang">
                {DANH_SACH_NGAN_HANG.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="nhan-o">
                MST / CCCD <span className="font-normal text-muc-3">— không bắt buộc</span>
              </label>
              <input
                className="o-nhap so"
                value={mstCccd}
                onChange={(e) => datMstCccd(e.target.value)}
              />
            </div>
          </div>
        )}

        {!chuyenKhoan && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="nhan-o">Họ tên người nhận tiền mặt</label>
              <input
                className="o-nhap"
                value={tenNguoiNhan}
                onChange={(e) => datTenNguoiNhan(e.target.value)}
              />
            </div>
            <div>
              <label className="nhan-o">
                Số điện thoại <span className="font-normal text-muc-3">— không bắt buộc</span>
              </label>
              <input
                className="o-nhap so"
                value={soDienThoaiLienHe}
                onChange={(e) => datSoDienThoaiLienHe(e.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Chứng từ ─────────────────────────────────────── */}
      <section className="khoi p-5">
        <h2 className="font-bold text-muc">
          4. Chứng từ đính kèm{' '}
          <span className="text-sm font-normal text-muc-3">— không bắt buộc</span>
        </h2>
        <p className="mt-1 mb-3 text-sm text-muc-2">
          Có gì gửi nấy: báo giá, hợp đồng, đề nghị của nhà cung cấp, ảnh chụp màn hình
          số tiền cần nạp. Chưa có gì thì cứ nộp — hóa đơn và ủy nhiệm chi vốn chỉ có sau
          khi công ty chi tiền. Ảnh tự nén lại trước khi gửi.
        </p>

        {/* Vùng kéo thả — cách nhanh nhất trên máy tính */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            datDangKeo(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            datDangKeo(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            datDangKeo(false);
            void themTep(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition ${
            dangKeo ? 'border-chinh bg-chinh-nhat' : 'border-vien bg-mat-2'
          }`}
        >
          <p className="font-semibold text-muc">
            {dangKeo ? 'Thả tệp ra để tải lên' : 'Kéo tệp từ máy tính thả vào đây'}
          </p>
          <p className="text-sm text-muc-2">
            hoặc bấm <kbd className="rounded border border-vien bg-mat px-1.5 py-0.5 text-xs font-semibold">Ctrl</kbd>{' '}
            + <kbd className="rounded border border-vien bg-mat px-1.5 py-0.5 text-xs font-semibold">V</kbd>{' '}
            để dán ảnh vừa chụp màn hình
          </p>

          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <label className="nut nut-phu cursor-pointer">
              Chọn tệp
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => {
                  void themTep(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            <label className="nut nut-phu cursor-pointer sm:hidden">
              Chụp ảnh
              <input
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  void themTep(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {dangTai && <p className="text-sm font-medium text-chinh">Đang tải lên…</p>}
        </div>

        {tep.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tep.map((t) => (
              <li
                key={t.duongDan}
                className="group relative overflow-hidden rounded-md border border-vien bg-mat-2"
              >
                {t.xemTruoc ? (
                  <button
                    type="button"
                    onClick={() => datXemLon(t.xemTruoc)}
                    className="block w-full cursor-zoom-in"
                    title="Bấm để xem lớn"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.xemTruoc}
                      alt={t.tenTep}
                      className="h-32 w-full bg-mat object-contain"
                    />
                  </button>
                ) : (
                  <div className="flex h-32 w-full flex-col items-center justify-center gap-1 bg-mat">
                    <span className="text-lg font-bold text-muc-3">PDF</span>
                    <span className="text-xs text-muc-3">xem được sau khi nộp</span>
                  </div>
                )}

                <div className="flex items-center gap-2 border-t border-vien px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-muc" title={t.tenTep}>
                      {t.tenTep}
                    </p>
                    <p className="so text-xs text-muc-3">{dinhDangDungLuong(t.dungLuong)}</p>
                  </div>
                  <button
                    type="button"
                    className="nut nut-phu px-2 py-0.5 text-xs"
                    onClick={() => boTep(t.duongDan)}
                  >
                    Bỏ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Xem ảnh cỡ lớn — màn hình máy tính rộng, tận dụng để đọc chữ trên chứng từ */}
      {xemLon && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => datXemLon(null)}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={xemLon}
            alt="Chứng từ"
            className="max-h-full max-w-full rounded object-contain"
          />
          <button
            type="button"
            className="nut nut-phu absolute top-5 right-5"
            onClick={() => datXemLon(null)}
          >
            Đóng
          </button>
        </div>
      )}

      {/* ── Khác ─────────────────────────────────────────── */}
      <section className="khoi p-5">
        <h2 className="mb-3 font-bold text-muc">5. Thông tin thêm</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="nhan-o" htmlFor="hanThanhToan">
              Cần thanh toán trước ngày{' '}
              <span className="font-normal text-muc-3">— không bắt buộc</span>
            </label>
            <input
              id="hanThanhToan"
              type="date"
              className="o-nhap"
              value={hanThanhToan}
              onChange={(e) => datHanThanhToan(e.target.value)}
            />
          </div>
          <div>
            <label className="nhan-o" htmlFor="ghiChu">
              Ghi chú <span className="font-normal text-muc-3">— không bắt buộc</span>
            </label>
            <input
              id="ghiChu"
              className="o-nhap"
              value={ghiChu}
              onChange={(e) => datGhiChu(e.target.value)}
              placeholder="Điều gì kế toán cần biết thêm"
            />
          </div>
        </div>
      </section>

      {loi && (
        <p className="rounded-md border border-dau/30 bg-dau-nhat px-4 py-3 text-sm text-dau">
          {loi}
        </p>
      )}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-vien bg-mat px-5 py-4">
        <button
          type="button"
          className="nut nut-chinh"
          onClick={() => gui(false)}
          disabled={dangBan}
        >
          {dangGui ? 'Đang gửi…' : laSua && !banDau?.laNhap ? 'Nộp lại' : 'Nộp hồ sơ'}
        </button>
        {(!laSua || banDau?.laNhap) && (
          <button
            type="button"
            className="nut nut-phu"
            onClick={() => gui(true)}
            disabled={dangBan}
          >
            Lưu nháp
          </button>
        )}
        <p className="text-sm text-muc-2">
          {laSua
            ? `Hồ sơ giữ nguyên số BK ${banDau?.soBK}.`
            : 'Nộp xong bạn nhận một mã tra cứu để xem hồ sơ đang ở bàn ai.'}
        </p>
      </div>
    </div>
  );
}
