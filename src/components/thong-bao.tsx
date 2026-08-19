export function ThongBao({ ketQua }: { ketQua?: { loi?: string; ok?: string } }) {
  if (!ketQua?.loi && !ketQua?.ok) return null;
  const loi = Boolean(ketQua.loi);
  return (
    <p
      className={
        loi
          ? 'rounded-md border border-dau/30 bg-dau-nhat px-3 py-2 text-sm text-dau'
          : 'rounded-md border border-xong/30 bg-xong-nhat px-3 py-2 text-sm text-xong'
      }
    >
      {ketQua.loi ?? ketQua.ok}
    </p>
  );
}
