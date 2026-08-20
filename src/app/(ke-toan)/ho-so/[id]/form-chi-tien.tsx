'use client';

import { useState, useTransition } from 'react';
import { chiTien } from './actions';
import type { TepDaTai } from '@/app/de-nghi/moi/actions';
import { GIOI_HAN_TAI_LEN_MB } from '@/lib/constants';
import { dinhDangTien, docTienTuChuoi, tachNhomSoTaiKhoan } from '@/lib/dinh-dang';

export type TaiKhoanCongTy = {
  id: string;
  account_number: string;
  bank_name: string;
};

/** Hôm nay theo lịch máy, dạng yyyy-mm-dd để đổ vào ô ngày. */
function homNay(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Khung ghi nhận đã chi tiền, chỉ hiện với kế toán ngân hàng khi hồ sơ ở
 * trạng thái "Chờ chi". Bấm xong là hồ sơ đóng lại, không sửa được nữa —
 * nên các ô ở đây kiểm tra kỹ hơn những màn hình khác.
 */
export function FormChiTien({
  id,
  soBK,
  soTienDeNghi,
  chuyenKhoan,
  taiKhoanCongTy,
}: {
  id: string;
  soBK: string;
  soTienDeNghi: number;
  chuyenKhoan: boolean;
  taiKhoanCongTy: TaiKhoanCongTy[];
}) {
  const [soUNC, datSoUNC] = useState('');
  const [ngayChi, datNgayChi] = useState(homNay());
  const [taiKhoanChiId, datTaiKhoanChiId] = useState(taiKhoanCongTy[0]?.id ?? '');
  const [taiKhoanChiGoTay, datTaiKhoanChiGoTay] = useState('');
  const [soTienChi, datSoTienChi] = useState(soTienDeNghi);
  const [ghiChu, datGhiChu] = useState('');
  const [tep, datTep] = useState<TepDaTai[]>([]);
  const [dangTai, datDangTai] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  const [dangGui, batDauGui] = useTransition();

  const lechTien = soTienChi !== soTienDeNghi;
  const goTay = taiKhoanChiId === '';

  async function themTep(danhSach: FileList | null) {
    if (!danhSach?.length) return;
    datLoi(null);
    datDangTai(true);

    for (const goc of Array.from(danhSach)) {
      if (goc.size > GIOI_HAN_TAI_LEN_MB * 1024 * 1024) {
        const mb = (goc.size / 1024 / 1024).toFixed(1);
        datLoi(`Tệp "${goc.name}" nặng ${mb} MB, quá mức ${GIOI_HAN_TAI_LEN_MB} MB.`);
        continue;
      }

      try {
        const duLieu = new FormData();
        duLieu.append('tep', goc);
        const phanHoi = await fetch('/api/tep', { method: 'POST', body: duLieu });
        const ketQua = await phanHoi.json();

        if (!phanHoi.ok) {
          datLoi(ketQua.loi ?? 'Không tải lên được tệp.');
          continue;
        }
        datTep((cu) => [...cu, ketQua as TepDaTai]);
      } catch {
        datLoi(`Không tải lên được "${goc.name}". Thử lại giúp bạn.`);
      }
    }

    datDangTai(false);
  }

  function gui() {
    datLoi(null);
    batDauGui(async () => {
      const ketQua = await chiTien(id, {
        soUNC,
        ngayChi,
        taiKhoanChiId,
        taiKhoanChiGoTay,
        soTienChi,
        ghiChu,
        tepChungTuChi: tep,
      });
      if (ketQua?.loi) datLoi(ketQua.loi);
    });
  }

  const dangBan = dangGui || dangTai;

  return (
    <div className="khoi mt-5 p-5">
      <h2 className="font-bold text-muc">Ghi nhận đã chi</h2>
      <p className="mt-1 text-sm text-muc-2">
        Chuyển tiền xong mới điền vào đây. Bấm nút cuối là hồ sơ {soBK} đóng lại, không ai
        sửa được nữa.
      </p>

      <div className="mt-4 grid gap-3 border-t border-vien pt-4 sm:grid-cols-2">
        <div>
          <label className="nhan-o" htmlFor="soUNC">
            {chuyenKhoan ? 'Số Ủy nhiệm chi' : 'Số phiếu chi (nếu có)'}
          </label>
          <input
            id="soUNC"
            className="o-nhap so"
            value={soUNC}
            onChange={(e) => datSoUNC(e.target.value)}
            placeholder={chuyenKhoan ? 'UNC0123' : 'PC0123'}
          />
        </div>

        <div>
          <label className="nhan-o" htmlFor="ngayChi">
            Ngày chi
          </label>
          <input
            id="ngayChi"
            type="date"
            className="o-nhap so"
            value={ngayChi}
            max={homNay()}
            onChange={(e) => datNgayChi(e.target.value)}
          />
        </div>

        <div>
          <label className="nhan-o" htmlFor="taiKhoanChi">
            Chi từ tài khoản công ty
          </label>
          <select
            id="taiKhoanChi"
            className="o-nhap"
            value={taiKhoanChiId}
            onChange={(e) => datTaiKhoanChiId(e.target.value)}
          >
            {taiKhoanCongTy.map((tk) => (
              <option key={tk.id} value={tk.id}>
                {tachNhomSoTaiKhoan(tk.account_number)} · {tk.bank_name}
              </option>
            ))}
            <option value="">— Gõ tay —</option>
          </select>
          {goTay && (
            <input
              className="o-nhap mt-2"
              value={taiKhoanChiGoTay}
              onChange={(e) => datTaiKhoanChiGoTay(e.target.value)}
              placeholder="Tiền mặt tại quỹ, hoặc số tài khoản khác"
            />
          )}
        </div>

        <div>
          <label className="nhan-o" htmlFor="soTienChi">
            Số tiền đã chi
          </label>
          <input
            id="soTienChi"
            className="o-nhap so text-right"
            inputMode="numeric"
            value={soTienChi ? dinhDangTien(soTienChi) : ''}
            onChange={(e) => datSoTienChi(docTienTuChuoi(e.target.value))}
          />
          {lechTien && (
            <p className="mt-1 text-xs text-dau">
              Hồ sơ đề nghị {dinhDangTien(soTienDeNghi)} ₫. Lệch thì phải ghi rõ lý do bên dưới.
            </p>
          )}
        </div>
      </div>

      {/* ── Chứng từ chi ─────────────────────────────────── */}
      <div className="mt-4 border-t border-vien pt-4">
        <label className="nhan-o" htmlFor="tepUNC">
          {chuyenKhoan ? 'Bản Ủy nhiệm chi (bắt buộc)' : 'Phiếu chi đã ký (nếu có)'}
        </label>
        <input
          id="tepUNC"
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="o-nhap"
          disabled={dangBan}
          onChange={(e) => {
            void themTep(e.target.files);
            e.target.value = '';
          }}
        />
        <p className="mt-1 text-xs text-muc-3">
          Ảnh chụp màn hình giao dịch hoặc PDF tải từ ngân hàng đều được.
        </p>

        {tep.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {tep.map((t) => (
              <li
                key={t.duongDan}
                className="flex items-center justify-between rounded-md bg-mat-2 px-3 py-2 text-sm"
              >
                <span className="truncate text-muc">{t.tenTep}</span>
                <button
                  type="button"
                  className="text-xs text-muc-3 hover:text-dau"
                  onClick={() => datTep((cu) => cu.filter((x) => x.duongDan !== t.duongDan))}
                >
                  Bỏ ra
                </button>
              </li>
            ))}
          </ul>
        )}
        {dangTai && <p className="mt-2 text-sm text-muc-3">Đang tải tệp lên…</p>}
      </div>

      {/* ── Ghi chú ──────────────────────────────────────── */}
      <div className="mt-4">
        <label className="nhan-o" htmlFor="ghiChuChi">
          Ghi chú {lechTien && <span className="text-dau">(bắt buộc vì số tiền lệch)</span>}
        </label>
        <input
          id="ghiChuChi"
          className="o-nhap"
          value={ghiChu}
          onChange={(e) => datGhiChu(e.target.value)}
          placeholder="Trừ phí chuyển tiền 11.000 ₫…"
        />
      </div>

      {loi && (
        <p className="mt-4 rounded-md border border-dau/30 bg-dau-nhat px-3 py-2 text-sm text-dau">
          {loi}
        </p>
      )}

      <div className="mt-4">
        <button type="button" className="nut nut-chinh" onClick={gui} disabled={dangBan}>
          {dangGui ? 'Đang ghi nhận…' : `Đã chi ${dinhDangTien(soTienChi)} ₫ — đóng hồ sơ`}
        </button>
      </div>
    </div>
  );
}
