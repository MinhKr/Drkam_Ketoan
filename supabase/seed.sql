-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DrKam Duyệt Chi — Dữ liệu khởi tạo                            ║
-- ║  Chạy SAU 0001_init.sql, trong SQL Editor của Supabase.        ║
-- ║  Nguồn: 2026_DNTT_MARKETING_v2.xlsx (phòng Marketing)          ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Cài đặt hệ thống ───────────────────────────────────────────
insert into public.settings (key, value, description) values
  ('HAN_MUC_KE_TOAN_TRUONG', '20000000',
   'Từ mức này trở lên, kế toán trưởng duyệt thay cho kế toán tổng hợp (đồng)'),
  ('HAN_MUC_GIAM_DOC', '50000000',
   'Từ mức này trở lên, hồ sơ phải qua giám đốc duyệt (đồng)'),
  ('DUNG_LUONG_TEP_TOI_DA_MB', '10',
   'Dung lượng tối đa mỗi tệp đính kèm (MB)'),
  ('TEN_CONG_TY', 'CÔNG TY CỔ PHẦN THE FAMIDOC VIỆT NAM',
   'Tên công ty in trên phiếu ĐNTT và tờ trình'),
  ('DIA_CHI_CONG_TY',
   'P.14-15A, Tầng 7, Charmvit Tower, Số 117 Trần Duy Hưng, Q.Cầu Giấy, Hà Nội',
   'Địa chỉ công ty in trên phiếu ĐNTT và tờ trình'),
  ('THANH_PHO', 'Hà Nội',
   'Địa danh đứng trước ngày tháng trên phiếu ĐNTT'),
  ('KINH_GUI', 'Ban Giám đốc Công ty Cổ phần The Famidoc Việt Nam',
   'Dòng "Kính gửi:" trên phiếu ĐNTT'),
  ('GHI_CHU_MAU_PHIEU', 'Ban hành kèm QT-PKT-01 của P.TCKT',
   'Chữ trong ngoặc sau mã mẫu, góc phải phiếu ĐNTT'),
  ('TEN_GIAM_DOC', '',
   'Tên in sẵn ở ô ký của giám đốc trên phiếu ĐNTT. Để trống thì ô đó bỏ trắng.')
on conflict (key) do nothing;

-- ── Phòng ban ──────────────────────────────────────────────────
-- Bảy phòng, đúng theo luồng nhận ĐNTT công ty chốt ngày 19/08/2026.
-- Mã phòng là tiền tố số BK (MKT/101, KHO/1…) nên đặt ngắn.
--
-- requires_head_approval tắt hết: trưởng bộ phận ký trên BẢN IN chứ không duyệt
-- trong app. Cột head_name là tên in sẵn ở ô ký đó — điền trong Quản trị ›
-- Phòng ban, để trống thì phiếu in ra bỏ trắng cho ký tay.
--
-- 'SALE' đang đặt tên là "Sale online" — suy ra từ chỗ đã có "Sale offline"
-- riêng. Đây là phòng của chị Ly. Tên khác thì sửa lại.
insert into public.departments (code, name, head_name, requires_head_approval, sort_order) values
  ('MKT',     'Marketing',          'Hồ Diệu Linh', false, 1),
  ('SALE',    'Sale online',        null,           false, 2),
  ('SALEOFF', 'Sale offline',       null,           false, 3),
  ('KHO',     'Kho',                null,           false, 4),
  ('HCNS',    'Hành chính nhân sự', null,           false, 5),
  ('KT',      'Kế toán',            null,           false, 6),
  ('BGD',     'Ban giám đốc',       null,           false, 7)
on conflict (code) do nothing;

-- ── Bộ đếm số BK khởi đầu ──────────────────────────────────────
-- File Excel đang chạy tới khoảng MKT/43. Đặt bộ đếm phòng Marketing ở 100 để
-- số của hệ thống mới không đè lên số đã phát hành trên giấy — hồ sơ đầu tiên
-- sẽ là MKT/101. Sửa con số này nếu muốn mốc khác.
-- Phòng mới chưa có lịch sử giấy thì để 0, đánh số từ 1.
insert into public.request_counters (department_id, last_no)
select id, 100 from public.departments where code = 'MKT'
on conflict (department_id) do nothing;

-- ── Nhân sự phòng Marketing ────────────────────────────────────
-- Lấy từ cột "Người ĐNTT" và bảng tổng hợp theo người trong file Excel.
-- Tên viết tắt giữ nguyên như trong file; sửa lại thành họ tên đầy đủ
-- trong màn hình Quản trị khi có danh sách chính thức.
insert into public.staff (full_name, department_id)
select v.full_name, d.id
from (values
  ('Hồ Diệu Linh'), ('Hà'), ('Đức'), ('Minh'), ('Nhi'),
  ('Đặng Kim Khánh'), ('Huyền'), ('Hải'), ('Khải'), ('Sơn')
) as v(full_name)
cross join (select id from public.departments where code = 'MKT') d
where not exists (
  select 1 from public.staff s
   where s.full_name = v.full_name and s.department_id = d.id
);

-- ── Loại chi phí ───────────────────────────────────────────────
-- Rút từ cột "Loại chi phí" của 56 giao dịch trong file.
insert into public.expense_types (name, sort_order) values
  ('Nạp ads Facebook',        1),
  ('VIA chạy quảng cáo',      2),
  ('Tài khoản AI làm video',  3),
  ('Tài khoản ChatGPT',       4),
  ('Tài khoản Gemini',        5),
  ('Tài khoản Capcut',        6),
  ('Zalo Business',           7),
  ('Booking KOC',             8),
  ('Gói sàn thương mại điện tử', 9),
  ('Đơn hàng kéo đánh giá',  10),
  ('Ladipage',               11),
  ('Đào tạo',                12),
  ('Công tác phí',           13),
  ('Thanh toán nha khoa',    14),
  ('Khác',                   99)
on conflict (name) do nothing;

-- ── Tài khoản chi của công ty ──────────────────────────────────
-- Cột "TK gửi" trong file Excel.
insert into public.bank_accounts
  (account_number, bank_name, account_holder, is_company_account)
select '110614778688', 'VietinBank', 'CÔNG TY CỔ PHẦN THE FAMIDOC VIỆT NAM', true
where not exists (
  select 1 from public.bank_accounts
   where account_number = '110614778688' and is_company_account
);

-- ── Nhà cung cấp và tài khoản nhận tiền ────────────────────────
insert into public.suppliers (name)
select v.name
from (values
  ('Nguyễn Thị Hà'),
  ('Hồ Diệu Linh'),
  ('Đặng Văn Hào'),
  ('Đàm Thị Huyền'),
  ('Mòng Văn Khánh'),
  ('Công ty TNHH Giải trí TDN'),
  ('CTCP CN Ladipage Việt Nam'),
  ('Công ty TNHH Công nghệ và Giáo dục Taki'),
  ('Bùi Phương Anh'),
  ('Nguyễn Hồng Minh Châu'),
  ('Bùi Đăng Dương')
) as v(name)
where not exists (select 1 from public.suppliers s where s.name = v.name);

-- Số tài khoản đọc được nguyên vẹn từ file.
insert into public.bank_accounts
  (supplier_id, account_number, bank_name, account_holder)
select s.id, v.acc, v.bank, v.holder
from (values
  ('Nguyễn Thị Hà',                          '0917469148',     'VPBank',      'NGUYEN THI HA'),
  ('Hồ Diệu Linh',                           '0977072211',     'VPBank',      'HO DIEU LINH'),
  ('Hồ Diệu Linh',                           '022922111991',   'Sacombank',   'HO DIEU LINH'),
  ('Đặng Văn Hào',                           '6789666789999',  'MB',          'DANG VAN HAO'),
  ('Đàm Thị Huyền',                          '0968881463',     'MB',          'DAM THI HUYEN'),
  ('Mòng Văn Khánh',                         '1368299999',     'Techcombank', 'MONG VAN KHANH'),
  ('Công ty TNHH Giải trí TDN',              '119003013110',   'VietinBank',  'CÔNG TY TNHH GIẢI TRÍ TDN'),
  ('CTCP CN Ladipage Việt Nam',              '19036184902015', 'Techcombank', 'CTCP CN LADIPAGE VIET NAM'),
  ('Công ty TNHH Công nghệ và Giáo dục Taki','626636688',      'ACB',         'CÔNG TY TNHH CÔNG NGHỆ VÀ GIÁO DỤC TAKI')
) as v(supplier, acc, bank, holder)
join public.suppliers s on s.name = v.supplier
where not exists (
  select 1 from public.bank_accounts b
   where b.account_number = v.acc and b.supplier_id = s.id
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ⚠ BA TÀI KHOẢN KHÔNG THỂ KHÔI PHỤC TỪ FILE EXCEL              ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Excel đã bóp số tài khoản của ba người dưới đây thành dạng số khoa học,
-- làm mất hẳn chữ số. Không có cách nào suy ngược ra số đúng:
--
--   Bùi Phương Anh        Techcombank   6.635E+14  và  6.635E+13
--                         (hai dòng lệch nhau một chữ số — không biết số nào đúng)
--   Nguyễn Hồng Minh Châu VietinBank    1.07882E+11
--   Bùi Đăng Dương        Techcombank   1.90761E+13
--
-- Ba người này đã được tạo trong danh mục nhà cung cấp nhưng CHƯA có
-- tài khoản ngân hàng. Phải mở chứng từ gốc, đối chiếu rồi nhập lại bằng tay
-- trong màn hình Danh mục. Ràng buộc bank_accounts_number_not_scientific
-- sẽ chặn nếu ai đó lỡ dán lại đúng chuỗi hỏng đó.

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Tài khoản đăng nhập                                           ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Không tạo được bằng SQL vì phải qua Supabase Auth.
-- Chạy lệnh sau ở thư mục dự án để tạo tài khoản quản trị đầu tiên:
--
--     npm run tao-quan-tri
--
-- Sau đó đăng nhập và tạo các tài khoản kế toán còn lại trong màn hình Quản trị.
