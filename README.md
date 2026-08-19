# DrKam Duyệt Chi

Hệ thống nộp và duyệt Đề nghị thanh toán, thay cho quy trình đang chạy bằng file Excel
`2026_DNTT_MARKETING_v2.xlsx`.

- **Nhân viên các phòng** vào thẳng, gõ tên mình, chọn phòng ban, nộp hồ sơ —
  **không cần tài khoản**.
- **Kế toán, trưởng bộ phận, giám đốc** đăng nhập để duyệt.

Kế hoạch đầy đủ: [`docs/ke-hoach-v1.html`](docs/ke-hoach-v1.html)
Danh sách tài khoản đăng nhập: [`docs/tai-khoan.md`](docs/tai-khoan.md) — nội bộ, có mật khẩu
Đưa lên Vercel để demo: [`docs/deploy-vercel.md`](docs/deploy-vercel.md)
Hướng dẫn sử dụng cho người dùng cuối: [`docs/DrKam-Duyet-Chi-Huong-dan-su-dung.pdf`](docs/DrKam-Duyet-Chi-Huong-dan-su-dung.pdf)
(soạn từ `docs/huong-dan-su-dung.html` — sửa file HTML rồi in lại ra PDF bằng Chrome)

---

## Chạy lần đầu

### 1. Cài thư viện

```bash
npm install
```

### 2. Tạo dự án Supabase

Vào [supabase.com](https://supabase.com), tạo dự án mới. Chọn vùng **Singapore** cho gần
Việt Nam.

### 3. Dựng cơ sở dữ liệu

Mở **SQL Editor** trên Supabase, chạy lần lượt **đúng thứ tự** bảy file:

1. `supabase/migrations/0001_init.sql` — bảng biểu, phân quyền RLS, kho tệp đính kèm
2. `supabase/migrations/0002_nop_ho_so.sql` — bộ đếm cấp số BK
3. `supabase/migrations/0003_cap_tai_khoan.sql` — hàm cấp tài khoản đăng nhập
4. `supabase/migrations/0004_phan_cong.sql` — chức danh + hàm phân công phòng ban
5. `supabase/migrations/0005_ban_in.sql` — bản in phiếu ĐNTT
6. `supabase/migrations/0006_nguoi_de_nghi.sql` — người nộp tự gõ tên
7. `supabase/seed.sql` — bảy phòng ban, nhân sự, danh mục loại chi phí, nhà cung cấp
   và số tài khoản lấy từ file Excel hiện tại

> Thứ tự quan trọng: seed phải chạy sau cùng vì nó đặt bộ đếm số BK theo phòng ban.
> Muốn chắc chắn SQL không lỗi trước khi dán vào Supabase thì chạy `npm run kiem-tra-sql` —
> lệnh này chạy toàn bộ SQL trên một PostgreSQL thật ngay trên máy bạn.

### 4. Điền khóa

Chép `.env.example` thành `.env.local`, rồi lấy ba giá trị ở **Project Settings › API**
dán vào:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> `SUPABASE_SERVICE_ROLE_KEY` chỉ chạy phía máy chủ, không bao giờ lọt ra trình duyệt.
> Nó dùng cho luồng người đề nghị nộp hồ sơ mà không cần đăng nhập.

### 5. Cấp tài khoản cho ban kế toán

```bash
npm run tao-tai-khoan
```

Một lệnh làm hết: tạo bảy tài khoản đăng nhập, cấp vai trò, và phân công phòng ban nào
gửi về bàn ai. Chạy lại nhiều lần cũng không tạo trùng.

| Email | Bộ phận | Vai trò trong luồng duyệt |
|---|---|---|
| `ktds@drkam.vn` | Kế toán đối soát | Kế toán viên |
| `ktnh@drkam.vn` | Kế toán ngân hàng | Kế toán viên + Kế toán ngân hàng |
| `ktmh@drkam.vn` | Kế toán mua hàng | Kế toán viên |
| `ktth@drkam.vn` | Kế toán tổng hợp | Kế toán tổng hợp |
| `ktt@drkam.vn` | Kế toán trưởng | Kế toán trưởng |
| `gd@drkam.vn` | Giám đốc | Giám đốc |
| `qt@drkam.vn` | Quản trị hệ thống | Quản trị |

Mật khẩu chung đặt trong `scripts/tao-tai-khoan.mjs` — sửa hằng số `MAT_KHAU` rồi chạy
lại là đổi được cho cả bảy tài khoản.

> Tài khoản đặt theo **bộ phận**, không theo người. Đổi người phụ trách thì không phải
> cấp lại tài khoản, đổi lại thì nhật ký chỉ ghi được tên bộ phận chứ không ghi tên
> người đã bấm duyệt.

Muốn làm tay trên Dashboard thì dùng `supabase/tai-khoan-ke-toan.sql`. Chỉ cần một tài
khoản quản trị thì `npm run tao-quan-tri`.

> Kiểm lại bằng `npm run kiem-tra-ket-noi` — lệnh này liệt kê phòng nào đã có kế toán
> viên phụ trách, phòng nào còn thiếu.

### 6. Chạy

```bash
npm run dev
```

Mở http://localhost:3000, đăng nhập, vào mục **Quản trị** để khai báo phòng ban, nhân sự
và cấp tài khoản cho kế toán.

---

## Thứ tự khai báo trong mục Quản trị

Làm đúng thứ tự này, vì bước sau cần dữ liệu của bước trước:

1. **Phòng ban** — mã phòng dùng làm tiền tố số BK (Marketing mã `MKT` → hồ sơ `MKT/42`).
   Khai luôn tên trưởng bộ phận để in sẵn vào ô ký trên phiếu.
2. **Nhân sự** — chỉ dùng khi cấp tài khoản đăng nhập. Người nộp hồ sơ tự gõ tên mình
   nên không cần khai đủ mọi người ở đây.
3. **Tài khoản đăng nhập** — chỉ cấp cho người phải duyệt. Cả công ty thường chỉ cần 6–8 tài khoản.
4. **Phân công kế toán viên** — phòng nào do ai phụ trách. Phòng chưa phân công thì hồ sơ sẽ bị kẹt.
5. **Hạn mức** — mốc chuyển từ kế toán tổng hợp lên kế toán trưởng, và mốc bắt buộc giám đốc duyệt.

---

## Luồng duyệt

| # | Bước | Ai làm | Ghi chú |
|---|------|--------|---------|
| 1 | Nộp hồ sơ | Người đề nghị | Không cần tài khoản |
| 2 | **In phiếu, ký tay** | Người đề nghị + trưởng bộ phận | Ngoài app — bản giấy mang xuống kế toán |
| 3 | Định tuyến | Hệ thống | Theo bảng phân công kế toán viên |
| 4 | Kiểm tra chứng từ | Kế toán viên | Đối chiếu bản giấy với hồ sơ trên app |
| 5 | Duyệt kế toán | KTTH hoặc KTT | Chọn theo hạn mức số tiền |
| 6 | Duyệt giám đốc | Giám đốc | **Chỉ khi vượt hạn mức lớn** |
| 7 | Chi và đóng hồ sơ | Kế toán ngân hàng | Tải Ủy nhiệm chi lên |

**Trưởng bộ phận không duyệt trong app.** Nhân viên nhập liệu xong thì mở màn hình in,
phiếu in ra đã có sẵn tên trưởng bộ phận ở ô ký. Ký tay rồi mang bản giấy xuống phòng
kế toán — bản cứng vẫn là thứ phải lưu trữ. Cột `requires_head_approval` vẫn còn trong
cơ sở dữ liệu để bật lại nếu sau này chuyển sang ký điện tử.

Mọi cấp duyệt đều trả về được — trả thẳng về người đề nghị, bắt buộc ghi lý do.

Hạn mức mặc định (sửa được trong Quản trị › Hạn mức):

- Dưới 20 triệu → kế toán tổng hợp duyệt
- Từ 20 triệu → kế toán trưởng duyệt
- Từ 50 triệu → thêm giám đốc duyệt

---

## Công nghệ

Cùng bộ với dự án `DrKam_Management`, không thêm gì lạ:

| Phần | Dùng gì |
|------|---------|
| Giao diện & máy chủ | Next.js 16 (App Router) + TypeScript |
| Kiểu dáng | Tailwind CSS v4 |
| Cơ sở dữ liệu, đăng nhập, kho tệp | Supabase (PostgreSQL + Auth + Storage) |
| Phân quyền | RLS trong PostgreSQL |

Toàn bộ là mã nguồn mở, không phí bản quyền, không tính tiền theo đầu người.

### Cách phân quyền hoạt động

RLS chỉ mở quyền **đọc** cho người đã đăng nhập. **Mọi thao tác ghi đều đi qua mã phía
máy chủ** dùng `service_role`, nên không ai gọi thẳng API mà nhảy cóc bước duyệt được.

Bảng `request_events` (nhật ký hồ sơ) **không có policy sửa hay xóa** — kể cả quản trị.
Đây là điều kiện để hệ thống dùng được làm căn cứ đối chiếu khi kiểm toán.

---

## Lệnh

```bash
npm run dev            # chạy môi trường phát triển
npm run build          # dựng bản chạy thật
npm run kiem-tra       # kiểm tra kiểu TypeScript
npm run kiem-tra-sql   # chạy thử toàn bộ SQL trên PostgreSQL thật
npm run kiem-tra-ket-noi # kiểm tra đã nối Supabase và dựng đủ bảng chưa
npm run lint           # kiểm tra mã nguồn
npm run tao-tai-khoan  # cấp cả bảy tài khoản ban kế toán + phân công phòng ban
npm run tao-quan-tri   # tạo tài khoản quản trị đầu tiên (cách thủ công)
```

## Đính kèm chứng từ

App dùng chủ yếu trên máy tính, nên phần đính kèm làm theo thói quen desktop:

- **Kéo thả** tệp từ Windows Explorer vào vùng đính kèm
- **Ctrl+V** dán thẳng ảnh vừa chụp màn hình — nhanh nhất cho các khoản nạp ads
  Facebook, ChatGPT, Capcut, Zalo Business, vì chứng từ của chúng vốn là ảnh màn hình
- **Chọn tệp** để lấy nhiều tệp một lúc, hoặc file PDF nhiều trang từ máy scan
- Bấm vào ảnh để **phóng to đọc chữ** ngay trên trang, Esc để đóng
- Nút **Chụp ảnh** chỉ hiện trên điện thoại

Ảnh được resize về tối đa 2000px và nén JPEG ngay trên trình duyệt trước khi gửi —
ảnh 4 MB còn khoảng 400 KB, không tốn dung lượng lưu trữ và kế toán mở nhanh.
PDF giữ nguyên, không đụng vào.

## Số BK

Số BK giữ đúng cách đặt cũ: `MKT/42` — mã phòng gạch chéo số thứ tự, đếm liên tục
không reset theo năm.

Bộ đếm phòng Marketing được đặt sẵn ở **100**, nên hồ sơ đầu tiên trên hệ thống là
`MKT/101`. Làm vậy để không đè lên các số đã phát hành trên giấy (file Excel đang chạy tới
khoảng MKT/43). Muốn mốc khác thì sửa dòng tương ứng trong `supabase/seed.sql` trước khi chạy.

---

## ⚠ Ba số tài khoản cần nhập lại bằng tay

Excel đã bóp số tài khoản của ba người sau thành dạng số khoa học, **làm mất hẳn chữ số**.
Không có cách nào suy ngược ra số đúng:

| Người nhận | Ngân hàng | Trong file Excel |
|---|---|---|
| Bùi Phương Anh | Techcombank | `6.635E+14` và `6.635E+13` — hai dòng lệch nhau một chữ số |
| Nguyễn Hồng Minh Châu | VietinBank | `1.07882E+11` |
| Bùi Đăng Dương | Techcombank | `1.90761E+13` |

Ba người này đã có trong danh mục nhà cung cấp nhưng **chưa có số tài khoản**. Phải mở
chứng từ gốc, đối chiếu rồi nhập lại.

Trong hệ thống mới, cột số tài khoản là kiểu chữ và có ràng buộc
`bank_accounts_number_not_scientific` chặn thẳng chuỗi dạng `E+`, nên lỗi này không lặp lại.

---

## Tiến độ

- [x] **Giai đoạn 1 — Nền tảng**: cơ sở dữ liệu, phân quyền, hai lối vào, đăng nhập,
      quản trị phòng ban / nhân sự / tài khoản / phân công / hạn mức
- [x] **Giai đoạn 2 — Nộp hồ sơ**: biểu mẫu ĐNTT nhiều dòng, đính kèm và nén ảnh,
      danh mục nhà cung cấp / tài khoản ngân hàng / loại chi phí, cấp số BK, lưu nháp,
      link tra cứu, sửa và nộp lại
- [ ] **Giai đoạn 3 — Luồng duyệt**: hộp việc, duyệt, trả về kèm lý do, nhật ký
- [ ] **Giai đoạn 4 — Chi và đóng hồ sơ**: màn hình kế toán ngân hàng, tải UNC, email thông báo
- [ ] **Giai đoạn 5 — Tra cứu & báo cáo**: lọc, xuất Excel, in phiếu ĐNTT và tờ trình
- [ ] **Giai đoạn 6 — Nghiệm thu & bàn giao**
