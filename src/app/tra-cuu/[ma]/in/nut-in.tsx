'use client';

/** Nút gọi hộp thoại in của trình duyệt. Ctrl+P vẫn dùng được như thường. */
export function NutIn() {
  return (
    <button type="button" className="nut nut-chinh" onClick={() => window.print()}>
      In phiếu
    </button>
  );
}
