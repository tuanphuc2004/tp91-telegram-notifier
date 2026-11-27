# TP91 Telegram Notifier (0đ Order & Lead Alert)

Module TypeScript **0 dependency runtime** giúp website (Next.js Server Actions, API Routes, Node.js) tự động gửi thông báo **đơn hàng mới** hoặc **yêu cầu báo giá/liên hệ** về Telegram cá nhân hoặc nhóm chat ngay lập tức — chi phí **0đ**.

## Tính năng

- **Miễn phí 100%:** Dùng trực tiếp Telegram Bot API (`sendMessage`) qua `fetch`.
- **An toàn cho luồng thanh toán/đặt đơn:** Tự động `escape` ký tự HTML (`<`, `>`, `&`), cắt độ dài theo giới hạn 4096 ký tự của Telegram, timeout mặc định `4.5s` và không làm lỗi đơn hàng nếu Telegram gặp sự cố mạng.
- **Sẵn mẫu tin nhắn tiếng Việt:**
  - `formatOrderTelegramMessage` / `notifyTelegramNewOrder`
  - `formatProjectRequestTelegramMessage` / `notifyTelegramProjectRequest`

## Cách lấy Bot Token & Chat ID (2 phút)

1. Mở Telegram, nhắn cho **@BotFather** → gửi `/newbot` → đặt tên bot và nhận `TELEGRAM_BOT_TOKEN`.
2. Nhắn 1 tin bất kỳ cho bot vừa tạo, hoặc nhắn **@userinfobot** để lấy `TELEGRAM_CHAT_ID` của bạn (nếu gửi vào nhóm thì thêm bot vào nhóm và lấy ID nhóm dạng `-100...`).
3. Thêm vào `.env.local` (hoặc Vercel Environment Variables — **không** dùng tiền tố `NEXT_PUBLIC_`):

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

## Sử dụng nhanh trong Next.js

Xem ví dụ đầy đủ tại [`examples/nextjs-server-action.ts`](./examples/nextjs-server-action.ts):

```ts
import { notifyTelegramNewOrder } from "./src";

await notifyTelegramNewOrder({
  mode: "database",
  orderId: "ORD-001",
  itemTitle: "TP91 Commerce Starter",
  amountVnd: 490000,
  customerName: "Nguyễn Văn A",
  contactChannel: "zalo",
  customerContact: "0912345678",
  note: "Giao qua Zalo",
});
```

## Kiểm thử

```bash
npm install
npm test
npm run typecheck
```

Gửi tin nhắn thử thật (khi đã đặt `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID` trong môi trường):

```bash
npm run test:send
```
