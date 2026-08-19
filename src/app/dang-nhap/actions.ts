'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type KetQuaDangNhap = { loi: string } | undefined;

export async function dangNhap(
  _truocDo: KetQuaDangNhap,
  duLieu: FormData,
): Promise<KetQuaDangNhap> {
  const email = String(duLieu.get('email') ?? '').trim();
  const matKhau = String(duLieu.get('matKhau') ?? '');
  const tiep = String(duLieu.get('tiep') ?? '') || '/bang-dieu-khien';

  if (!email || !matKhau) {
    return { loi: 'Nhập email và mật khẩu để đăng nhập.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: matKhau,
  });

  if (error || !data.user) {
    return { loi: 'Email hoặc mật khẩu không đúng. Kiểm tra lại giúp bạn.' };
  }

  // Có tài khoản Supabase nhưng chưa được cấp hồ sơ trong hệ thống.
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      loi: 'Tài khoản này chưa được cấp quyền trong hệ thống. Liên hệ quản trị để được thêm vào.',
    };
  }
  if (profile.status !== 'Hoạt động') {
    await supabase.auth.signOut();
    return { loi: 'Tài khoản đã bị khóa. Liên hệ quản trị để mở lại.' };
  }

  revalidatePath('/', 'layout');
  redirect(tiep);
}

export async function dangXuat() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
