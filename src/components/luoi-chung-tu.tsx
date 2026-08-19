'use client';

import { useEffect, useState } from 'react';

export type ChungTu = {
  id: string;
  kind: string;
  file_name: string;
  mime_type: string;
  link: string | null;
};

/**
 * Lưới chứng từ cho màn hình máy tính: xem trước đủ lớn, bấm vào phóng to
 * đọc được chữ trên hóa đơn mà không phải tải về.
 */
export function LuoiChungTu({ tep }: { tep: ChungTu[] }) {
  const [xemLon, datXemLon] = useState<ChungTu | null>(null);

  useEffect(() => {
    if (!xemLon) return;
    function khiBamPhim(e: KeyboardEvent) {
      if (e.key === 'Escape') datXemLon(null);
    }
    document.addEventListener('keydown', khiBamPhim);
    return () => document.removeEventListener('keydown', khiBamPhim);
  }, [xemLon]);

  if (tep.length === 0) {
    return <p className="text-sm text-muc-3">Chưa đính kèm chứng từ nào.</p>;
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tep.map((t) => {
          const laAnh = t.mime_type.startsWith('image/') && t.link;
          return (
            <li
              key={t.id}
              className="overflow-hidden rounded-md border border-vien bg-mat-2"
            >
              {laAnh ? (
                <button
                  type="button"
                  onClick={() => datXemLon(t)}
                  className="block w-full cursor-zoom-in"
                  title="Bấm để xem lớn"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.link!}
                    alt={t.file_name}
                    className="h-36 w-full bg-mat object-contain"
                  />
                </button>
              ) : (
                <a
                  href={t.link ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-36 w-full flex-col items-center justify-center gap-1 bg-mat hover:bg-mat-2"
                >
                  <span className="text-lg font-bold text-muc-3">PDF</span>
                  <span className="text-xs text-chinh">Mở trong tab mới</span>
                </a>
              )}
              <div className="border-t border-vien px-2 py-1.5">
                <p className="truncate text-xs font-medium text-muc" title={t.file_name}>
                  {t.file_name}
                </p>
                <p className="text-xs text-muc-3">{t.kind}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {xemLon?.link && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-6"
          onClick={() => datXemLon(null)}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={xemLon.link}
            alt={xemLon.file_name}
            className="max-h-[85vh] max-w-full rounded object-contain"
          />
          <div
            className="flex items-center gap-3"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <span className="text-sm text-white/80">{xemLon.file_name}</span>
            <a
              href={xemLon.link}
              target="_blank"
              rel="noreferrer"
              className="nut nut-phu px-3 py-1 text-xs"
            >
              Mở tab mới
            </a>
            <button
              type="button"
              className="nut nut-phu px-3 py-1 text-xs"
              onClick={() => datXemLon(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
