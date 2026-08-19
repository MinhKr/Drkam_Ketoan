# Đưa lên Vercel để demo

Hướng dẫn này dành cho **bản demo cho phòng kế toán xem**, không phải bản chạy thật.
Lý do vì sao, đọc mục [Trước khi chạy thật](#trước-khi-chạy-thật) ở cuối.

Mã nguồn đã sẵn sàng: đã tạo kho git, đã commit, đã thêm `vercel.json`.
Bạn chỉ còn ba việc phải làm bằng tài khoản của mình.

---

## Bước 1 — Đẩy mã nguồn lên GitHub

Vercel lấy mã từ GitHub. Tạo kho mới ở [github.com/new](https://github.com/new):

- Tên: `duyet-chi` (hoặc tên nào bạn thích)
- **Chọn Private.** Không phải Public.
- **Không** tích "Add a README file" — dự án đã có sẵn

Tạo xong, GitHub hiện sẵn mấy dòng lệnh. Chạy trong thư mục dự án:

```bash
git remote add origin https://github.com/<tên-của-bạn>/duyet-chi.git
git push -u origin main
```

> **Vì sao phải Private:** kho này có toàn bộ cấu trúc cơ sở dữ liệu và tên nhà cung
> cấp thật. Ba khóa Supabase thì đã được chặn không đẩy lên (`.gitignore`), và file
> `docs/tai-khoan.md` chứa mật khẩu cũng vậy — nó chỉ nằm trên máy bạn.

## Bước 2 — Tạo dự án trên Vercel

Vào [vercel.com/new](https://vercel.com/new), đăng nhập bằng GitHub, chọn kho vừa đẩy lên.

Vercel tự nhận ra đây là Next.js, không cần đổi gì trong phần Build & Output.

**Trước khi bấm Deploy**, mở mục **Environment Variables** và điền ba dòng — lấy y nguyên
từ file `.env.local` trên máy bạn:

| Tên biến | Lấy ở đâu |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase › Project Settings › API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cùng chỗ |
| `SUPABASE_SERVICE_ROLE_KEY` | cùng chỗ, phần *service_role* |

Cả ba đều để cho **Production, Preview và Development**.

> Thiếu biến nào thì trang chủ sẽ hiện màn hình "Chưa nối cơ sở dữ liệu" thay vì lỗi 500.
> Điền bổ sung rồi vào Deployments bấm **Redeploy** là xong.

Bấm **Deploy**, đợi khoảng hai phút.

## Bước 3 — Kiểm lại

Vercel cho bạn một địa chỉ dạng `duyet-chi-xxxx.vercel.app`. Mở lên và thử đúng ba việc:

1. **Trang chủ hiện lên** — không phải màn hình "Chưa nối cơ sở dữ liệu"
2. **Nộp thử một hồ sơ** — biểu mẫu phải hiện đủ 7 phòng ban và 15 loại chi phí
3. **Đăng nhập** bằng `ktds@drkam.vn` / `123456`, thấy hồ sơ vừa nộp trong "Chờ tôi xử lý"

Được cả ba là chạy đúng.

Từ giờ, mỗi lần `git push` là Vercel tự dựng lại bản mới.

---

## Đã chuẩn bị sẵn những gì

| Việc | Đã làm |
|---|---|
| Máy chủ đặt ở Singapore | `vercel.json` → `regions: ["sin1"]`, cùng vùng với Supabase nên nhanh |
| Chặn Google lập chỉ mục | `src/app/robots.ts` + header `X-Robots-Tag` |
| Chặn nhúng vào trang khác | header `X-Frame-Options: DENY` |
| Giới hạn tải tệp | Hạ xuống **4 MB** — xem mục dưới |
| Khóa Supabase | `.gitignore` chặn `.env.local`, không lọt lên GitHub |
| Danh sách mật khẩu | `.gitignore` chặn `docs/tai-khoan.md` |

### Vì sao tệp chỉ còn 4 MB

Vercel chặn mọi request nặng quá 4,5 MB **ngay ở cổng**, trước khi mã của mình chạy —
nên tệp to sẽ hỏng kèm lỗi khó hiểu chứ không ra được thông báo tiếng Việt. Đã chặn sẵn
ở 4 MB, báo lỗi rõ ràng ngay trên trình duyệt trước khi gửi đi.

Thực tế ít khi chạm ngưỡng: ảnh được nén ngay trên trình duyệt xuống còn khoảng 400 KB.
Chỉ PDF nhiều trang từ máy scan mới có thể vượt — tách ra vài tệp là được.

Con số này nằm ở `GIOI_HAN_TAI_LEN_MB` trong `src/lib/constants.ts`. Tự dựng máy chủ
riêng thì bỏ trần này đi.

---

## Trước khi chạy thật

Bản demo thì thoải mái. Nhưng **đừng dùng bản Vercel này làm bản chạy thật** khi chưa xử
lý bốn điểm dưới đây.

### 1. Ai có link cũng nộp được hồ sơ

Biểu mẫu nộp cố tình không đòi đăng nhập — đó là yêu cầu của bạn từ đầu, và đúng khi hệ
thống chỉ chạy trong mạng nội bộ. Nhưng đưa lên Vercel là mở ra Internet: ai có địa chỉ
cũng nộp được hồ sơ và tải tệp lên kho của bạn.

Với bản demo thì chấp nhận được vì địa chỉ chỉ mình bạn biết và đã chặn Google. Chạy
thật thì cần thêm **một mã PIN chung cho toàn công ty** trước biểu mẫu — làm nhanh, báo
là mình thêm.

### 2. Mật khẩu 123456

Bảy tài khoản duyệt chi đang dùng chung mật khẩu `123456`, giờ nằm trên Internet. Đổi
trước khi demo cho người ngoài phòng: sửa `MAT_KHAU` trong `scripts/tao-tai-khoan.mjs`
rồi chạy `npm run tao-tai-khoan`.

### 3. Gói Hobby cấm dùng cho mục đích thương mại

Điều khoản của Vercel: gói miễn phí **không được dùng cho hoạt động kinh doanh**. Demo
nội bộ thì không ai bắt bẻ, nhưng vận hành thật cho cả phòng kế toán là sai điều khoản —
phải lên gói Pro (20 USD/tháng/người) hoặc tự dựng máy chủ.

### 4. Dữ liệu đặt ở nước ngoài

Máy chủ Vercel và Supabase đều ở Singapore. Số tài khoản ngân hàng và số tiền chi thật
của công ty sẽ nằm ngoài lãnh thổ Việt Nam. Cần cân nhắc với Nghị định 13/2023 về bảo vệ
dữ liệu cá nhân — hỏi ý kiến bên pháp chế trước khi chạy thật.

**Phương án thay thế đã bàn từ đầu:** dựng Docker trên một máy sẵn có của công ty, mở
trong mạng nội bộ. Không tốn phí, không vướng ba điểm trên. Bản demo Vercel này chỉ để
cho mọi người xem và góp ý trước.
