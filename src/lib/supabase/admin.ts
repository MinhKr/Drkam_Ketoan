import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Supabase client dùng service_role — BỎ QUA toàn bộ RLS.
 *
 * CHỈ được gọi từ mã chạy trên máy chủ. Khóa này không bao giờ
 * được lọt ra trình duyệt.
 *
 * Dùng cho hai việc:
 *   1. Người đề nghị nộp hồ sơ mà không có tài khoản đăng nhập.
 *   2. Ghi các bước duyệt — để luồng B1→B7 do mã nguồn kiểm soát,
 *      không ai gọi thẳng API mà nhảy cóc được.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Thiếu SUPABASE_SERVICE_ROLE_KEY trong .env.local — không thực hiện được thao tác này.',
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
