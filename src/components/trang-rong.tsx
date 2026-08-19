export function TrangRong({
  tieuDe,
  moTa,
  children,
}: {
  tieuDe: string;
  moTa?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="khoi flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-base font-semibold text-muc">{tieuDe}</p>
      {moTa && <p className="max-w-md text-sm text-muc-2">{moTa}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
