import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile } from './supabase/types';
import { VAI_TRO, type VaiTro } from './constants';

/**
 * Hồ sơ người đang đăng nhập, hoặc null nếu chưa đăng nhập / tài khoản đã khóa.
 * Chỉ kế toán, trưởng bộ phận, giám đốc và quản trị mới có tài khoản —
 * người đề nghị thanh toán không đăng nhập.
 */
export async function layNguoiDangDangNhap(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.status !== 'Hoạt động') return null;
  return profile;
}

/** Bắt buộc đã đăng nhập, nếu chưa thì chuyển về trang đăng nhập. */
export async function batBuocDangNhap(duongDanQuayLai?: string): Promise<Profile> {
  const profile = await layNguoiDangDangNhap();
  if (!profile) {
    const dich = duongDanQuayLai
      ? `/dang-nhap?tiep=${encodeURIComponent(duongDanQuayLai)}`
      : '/dang-nhap';
    redirect(dich);
  }
  return profile;
}

/**
 * Bắt buộc có ít nhất một trong các vai trò truyền vào.
 * Quản trị luôn đi qua được.
 */
export async function batBuocVaiTro(...vaiTro: VaiTro[]): Promise<Profile> {
  const profile = await batBuocDangNhap();
  const duocPhep =
    profile.roles.includes(VAI_TRO.QUAN_TRI) ||
    vaiTro.some((v) => profile.roles.includes(v));
  if (!duocPhep) redirect('/khong-du-quyen');
  return profile;
}

/** Vai trò chính để hiển thị, ví dụ trên thanh điều hướng. */
export function vaiTroChinh(profile: Profile): string {
  return profile.roles[0] ?? 'Chưa phân vai trò';
}
