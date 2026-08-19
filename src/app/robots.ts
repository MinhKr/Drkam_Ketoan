import type { MetadataRoute } from 'next';

/**
 * Chặn mọi công cụ tìm kiếm.
 *
 * Đây là hệ thống nội bộ chứa số tài khoản ngân hàng và số tiền chi thật —
 * không có lý do gì để Google lập chỉ mục. Chặn ở đây không thay cho phân
 * quyền, chỉ để nội dung không lọt ra kết quả tìm kiếm.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  };
}
