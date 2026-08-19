import { MAU_TRANG_THAI, type TrangThai } from '@/lib/constants';

const LOP: Record<string, string> = {
  cho: 'the the-cho',
  xong: 'the the-xong',
  tra: 'the the-tra',
  nghi: 'the the-nghi',
};

export function TheTrangThai({ trangThai }: { trangThai: string }) {
  const mau = MAU_TRANG_THAI[trangThai as TrangThai] ?? 'nghi';
  return <span className={LOP[mau]}>{trangThai}</span>;
}
