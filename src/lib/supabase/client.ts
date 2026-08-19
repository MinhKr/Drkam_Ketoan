import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/** Supabase client dùng ở phía trình duyệt (Client Components). */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Chưa cấu hình Supabase. Tạo file .env.local từ .env.example và điền NEXT_PUBLIC_SUPABASE_URL cùng NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return createBrowserClient<Database>(url, anon);
}

/** Đã cấu hình Supabase hay chưa. */
export const daCauHinh = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
