import { dinhDangNgayGio, khoangCachThoiGian } from '@/lib/dinh-dang';

export type Buoc = {
  id: string;
  action: string;
  to_status: string;
  actor_name: string;
  actor_role: string | null;
  note: string | null;
  created_at: string;
};

const MAU_CHAM: Record<string, string> = {
  'Trả về': 'bg-dau',
  'Chi tiền': 'bg-xong',
  Duyệt: 'bg-chinh',
};

export function DongThoiGian({ buoc }: { buoc: Buoc[] }) {
  if (buoc.length === 0) {
    return <p className="text-sm text-muc-3">Chưa có thao tác nào.</p>;
  }

  return (
    <ol className="flex flex-col">
      {buoc.map((b, i) => (
        <li key={b.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < buoc.length - 1 && (
            <span className="absolute top-3 bottom-0 left-[5px] w-px bg-vien" aria-hidden />
          )}
          <span
            className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
              MAU_CHAM[b.action] ?? 'bg-muc-3'
            }`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-muc">
              {b.action}
              <span className="ml-2 font-normal text-muc-2">
                {b.actor_name}
                {b.actor_role && ` · ${b.actor_role}`}
              </span>
            </p>
            <p className="text-xs text-muc-3">
              {dinhDangNgayGio(b.created_at)} · {khoangCachThoiGian(b.created_at)}
            </p>
            {b.note && (
              <p className="mt-1.5 rounded-md border border-vien bg-mat-2 px-3 py-2 text-sm text-muc-2">
                {b.note}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
