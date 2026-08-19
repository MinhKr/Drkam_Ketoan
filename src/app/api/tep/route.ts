import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CAI_DAT_MAC_DINH, GIOI_HAN_TAI_LEN_MB, KHOA_CAI_DAT } from '@/lib/constants';

/**
 * Nhận chứng từ do người đề nghị tải lên.
 *
 * Người đề nghị không có tài khoản nên đường này không đòi đăng nhập.
 * Bù lại nó chỉ ghi vào thư mục tạm `nhap/`, và dòng trong bảng attachments
 * chỉ được tạo lúc bấm Nộp — tệp lạc không bao giờ dính vào hồ sơ nào.
 *
 * Hệ thống chạy trong mạng nội bộ công ty (xem README), nên không mở ra Internet.
 */

const KIEU_CHO_PHEP = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

const DUOI_TEP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

export async function POST(request: Request) {
  let db;
  try {
    db = createAdminClient();
  } catch {
    return NextResponse.json(
      { loi: 'Hệ thống chưa nối với cơ sở dữ liệu. Báo quản trị giúp bạn.' },
      { status: 503 },
    );
  }

  const duLieu = await request.formData();
  const tep = duLieu.get('tep');

  if (!(tep instanceof File) || tep.size === 0) {
    return NextResponse.json({ loi: 'Chưa chọn tệp nào.' }, { status: 400 });
  }

  if (!KIEU_CHO_PHEP.includes(tep.type)) {
    return NextResponse.json(
      { loi: `Chỉ nhận ảnh hoặc PDF. Tệp "${tep.name}" không dùng được.` },
      { status: 400 },
    );
  }

  const { data: caiDat } = await db
    .from('settings')
    .select('value')
    .eq('key', KHOA_CAI_DAT.DUNG_LUONG_TEP_TOI_DA_MB)
    .maybeSingle();

  // Quy định của công ty và trần của nền tảng — lấy cái nhỏ hơn.
  const gioiHanMb = Math.min(
    Number(caiDat?.value ?? CAI_DAT_MAC_DINH[KHOA_CAI_DAT.DUNG_LUONG_TEP_TOI_DA_MB]),
    GIOI_HAN_TAI_LEN_MB,
  );
  const gioiHan = gioiHanMb * 1024 * 1024;

  if (tep.size > gioiHan) {
    const mb = (tep.size / 1024 / 1024).toFixed(1);
    return NextResponse.json(
      { loi: `Tệp "${tep.name}" nặng ${mb} MB, vượt mức ${gioiHanMb} MB. Chụp lại nhỏ hơn giúp bạn.` },
      { status: 400 },
    );
  }

  const duoi = DUOI_TEP[tep.type] ?? 'bin';
  const duongDan = `nhap/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${duoi}`;

  const { error } = await db.storage
    .from('chung-tu')
    .upload(duongDan, tep, { contentType: tep.type, upsert: false });

  if (error) {
    return NextResponse.json(
      { loi: `Không tải lên được: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    duongDan,
    tenTep: tep.name,
    kieuTep: tep.type,
    dungLuong: tep.size,
  });
}
