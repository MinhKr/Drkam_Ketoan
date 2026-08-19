import Link from 'next/link';

/** Màn hình cho phần thuộc giai đoạn sau, để đường dẫn không bị lỗi 404. */
export function SapCo({
  tieuDe,
  giaiDoan,
  gomNhung,
  quayVe = '/bang-dieu-khien',
}: {
  tieuDe: string;
  giaiDoan: string;
  gomNhung: string[];
  quayVe?: string;
}) {
  return (
    <div className="khoi mx-auto max-w-2xl p-8">
      <span className="the the-cho">{giaiDoan}</span>
      <h1 className="mt-3 text-2xl font-bold text-muc">{tieuDe}</h1>
      <p className="mt-2 text-sm text-muc-2">Phần này nằm trong giai đoạn tiếp theo. Sẽ gồm:</p>
      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muc-2">
        {gomNhung.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <div className="mt-6">
        <Link href={quayVe} className="nut nut-phu">
          Quay lại
        </Link>
      </div>
    </div>
  );
}
