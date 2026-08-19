import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Supabase client phía máy chủ, chạy dưới danh nghĩa người đang đăng nhập.
 * Dùng trong Server Components, Route Handlers và Server Actions.
 * Mọi truy vấn qua client này đều bị RLS kiểm soát.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Chưa cấu hình Supabase. Tạo file .env.local từ .env.example và điền NEXT_PUBLIC_SUPABASE_URL cùng NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Gọi từ Server Component — bỏ qua, middleware sẽ làm mới phiên.
        }
      },
    },
  });
}
