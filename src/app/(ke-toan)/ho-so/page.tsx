import { batBuocDangNhap } from '@/lib/auth';
import { SapCo } from '@/components/sap-co';

export const metadata = { title: 'Tất cả hồ sơ · DrKam Duyệt Chi' };

export default async function TrangHoSo() {
  await batBuocDangNhap('/ho-so');
  return (
    <SapCo
      tieuDe="Tất cả hồ sơ"
      giaiDoan="Giai đoạn 3"
      gomNhung={[
        'Danh sách toàn bộ ĐNTT với bộ lọc theo phòng ban, trạng thái, khoảng tiền và khoảng ngày',
        'Mở chi tiết từng hồ sơ, xem trước chứng từ ngay trên màn hình',
        'Thao tác duyệt và trả về kèm lý do',
        'Nhật ký đầy đủ: ai làm gì, lúc nào',
      ]}
    />
  );
}
