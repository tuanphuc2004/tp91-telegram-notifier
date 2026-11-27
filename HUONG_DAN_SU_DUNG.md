# Hướng Dẫn Sử Dụng — Telegram Bot Báo Đơn Hàng Tự Động (0đ)

Tài liệu này hướng dẫn từng bước cách bật tính năng **tự động báo tin nhắn về Telegram** mỗi khi có khách đặt hàng hoặc gửi yêu cầu trên website — **hoàn toàn miễn phí (0đ)**, không cần biết lập trình.

---

## 1. Tính năng này hoạt động như thế nào?

Có **2 cách sử dụng**:
- **Cách nhanh nhất (Dùng ngay server có sẵn):** Truy cập trang web dịch vụ (ví dụ `https://tp91-telegram-notifier.vercel.app/`), nhập **Bot Token** + **Chat ID** của bạn để nhận 1 **API Key riêng (`tp91_live_...`)**, rồi copy đoạn code mẫu dán vào website của bạn là chạy ngay — không cần tự deploy server hay tạo database.
- **Cách tự chủ hoàn toàn:** Tự deploy mã nguồn này lên tài khoản Vercel 0đ của riêng bạn.

Ngay khi khách hàng bấm nút **Đặt mua** hoặc **Gửi yêu cầu** trên website:
1. Hệ thống của bạn gọi API báo tin.
2. Trong vòng 1–2 giây, Bot Telegram của riêng bạn sẽ gửi ngay 1 tin nhắn chi tiết về điện thoại gồm: **Mã đơn, Tên sản phẩm/gói dịch vụ, Giá tiền, Tên khách, Số Zalo/Telegram/Email và Ghi chú**.

---

## 2. Cách tạo Bot & lấy mã kết nối (chỉ làm 1 lần, mất ~2 phút)

### Bước 1: Tạo Bot mới và lấy `TELEGRAM_BOT_TOKEN`
1. Mở ứng dụng **Telegram** trên điện thoại hoặc máy tính.
2. Tìm tài khoản chính thức có dấu tick xanh tên **`@BotFather`** (hoặc bấm `https://t.me/BotFather`).
3. Bấm **Start** → gõ lệnh `/newbot` và gửi.
4. Nhập **tên hiển thị** cho bot (ví dụ: `Báo Đơn Web Shop`).
5. Nhập **username** cho bot — bắt buộc viết liền không dấu và **kết thúc bằng chữ `bot`** (ví dụ: `tp91_baodon_bot`).
6. `@BotFather` sẽ trả về một đoạn tin nhắn có dòng `Use this token to access the HTTP API:` kèm chuỗi ký tự dạng:
   `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
   → Đây chính là **`TELEGRAM_BOT_TOKEN`** của bạn. **Lưu giữ cẩn thận, không chia sẻ công khai.**

### Bước 2: Kích hoạt Bot & lấy `TELEGRAM_CHAT_ID`
> **Quan trọng:** Bạn bắt buộc phải bấm mở link con bot vừa tạo (link `t.me/<username_bot>`) và nhấn nút **Start** ít nhất 1 lần thì bot mới được phép nhắn tin cho bạn.

Sau đó lấy **Chat ID** theo 1 trong 2 cách sau:

- **Cách A — Nhận tin nhắn vào Telegram cá nhân của bạn:**
  1. Tìm tài khoản **`@userinfobot`** trên Telegram → bấm **Start**.
  2. Bot sẽ trả về dòng `Id: 123456789` (một dãy số).
  3. Dãy số đó chính là **`TELEGRAM_CHAT_ID`**.

- **Cách B — Nhận tin nhắn vào Nhóm Telegram chung (cho nhiều nhân viên cùng xem):**
  1. Tạo một Group Telegram mới → thêm con bot bạn vừa tạo ở Bước 1 vào Group đó.
  2. Gửi một tin nhắn bất kỳ trong Group (ví dụ: `test`).
  3. Mở trình duyệt web và truy cập đường dẫn (thay `<TOKEN>` bằng token ở Bước 1):
     `https://api.telegram.org/bot<TOKEN>/getUpdates`
  4. Tìm đoạn `"chat":{"id":-1001234567890,...}` — con số âm (ví dụ `-1001234567890`) chính là **`TELEGRAM_CHAT_ID`** của nhóm.

---

## 3. Gắn vào Website đang chạy trên Vercel (0đ)

1. Đăng nhập trang quản trị **Vercel** → chọn dự án website của bạn.
2. Vào mục **Settings** → **Environment Variables**.
3. Thêm lần lượt các biến sau (tích chọn đủ Production / Preview / Development):
   - **Key:** `TELEGRAM_BOT_TOKEN` → **Value:** *(dán Token ở Bước 1)*
   - **Key:** `TELEGRAM_CHAT_ID` → **Value:** *(dán ID số ở Bước 2)*
   - **Key:** `NOTIFY_API_KEY` → **Value:** *(tự đặt 1 chuỗi mật khẩu dài ngẫu nhiên để bảo vệ link API `/api/notify` nếu bạn deploy repo này làm dịch vụ API riêng)*
   - *(Tùy chọn)* **Key:** `TELEGRAM_BRAND_NAME` → **Value:** Tên thương hiệu/shop hiển thị trên đầu tin nhắn.
4. Bấm **Save**, sau đó sang tab **Deployments** → bấm dấu `...` ở bản deploy mới nhất → chọn **Redeploy** để hệ thống nhận cấu hình mới.

> **Kiểm tra link API sau khi deploy:** Mở `https://ten-mien-cua-ban.vercel.app/api/health` trên trình duyệt. Nếu thấy `"telegramConfigured": true` và `"apiKeyConfigured": true` nghĩa là dịch vụ API đã sẵn sàng nhận lệnh `POST /api/notify`.

> **Lưu ý bảo mật:** Tuyệt đối không đặt tiền tố `NEXT_PUBLIC_` cho 2 biến trên để tránh lộ Bot Token ra ngoài trình duyệt.

*(Nếu chạy thử trên máy tính cá nhân: mở file `.env.local` ở thư mục gốc dự án, dán 2 dòng `TELEGRAM_BOT_TOKEN=...` và `TELEGRAM_CHAT_ID=...` vào rồi khởi động lại server).*

---

## 4. Kiểm tra hoạt động & Xử lý lỗi thường gặp

### Cách kiểm tra nhanh
- Mở website, vào đặt thử 1 đơn hàng hoặc gửi thử 1 yêu cầu liên hệ.
- Kiểm tra điện thoại xem Bot Telegram có nhắn tin về trong 1–3 giây không.

### Nếu chưa thấy bot nhắn tin, hãy kiểm tra 4 điểm sau:
1. **Quên bấm Start với Bot:** Mở chat với con bot bạn vừa tạo và bấm **Start** (hoặc gửi `/start`).
2. **Chưa Redeploy trên Vercel:** Sau khi thêm biến môi trường ở Vercel, bắt buộc phải **Redeploy** thì cấu hình mới có hiệu lực.
3. **Copy dư dấu cách ở Token hoặc Chat ID:** Kiểm tra lại không để thừa khoảng trắng đầu/cuối chuỗi.
4. **Đơn hàng vẫn lưu bình thường chứ?** Có. Hệ thống được thiết kế an toàn: dù Telegram có lỗi mạng hay chưa cấu hình, đơn của khách vẫn được lưu bình thường, không bao giờ gây lỗi màn hình đặt hàng.
