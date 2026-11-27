# TP91 Telegram Notifier (0đ Order & Lead Alert)

Module TypeScript **0 dependency runtime** giúp website (Next.js Server Actions, API Routes, Node.js) tự động gửi thông báo **đơn hàng mới** hoặc **yêu cầu báo giá/liên hệ** về Telegram cá nhân hoặc nhóm chat ngay lập tức — chi phí **0đ**.

## Tính năng

- **Miễn phí 100%:** Dùng trực tiếp Telegram Bot API (`sendMessage`) qua `fetch`.
- **An toàn cho luồng thanh toán/đặt đơn:** Tự động `escape` ký tự HTML (`<`, `>`, `&`), cắt độ dài theo giới hạn 4096 ký tự của Telegram, timeout mặc định `4.5s` và không làm lỗi đơn hàng nếu Telegram gặp sự cố mạng.
- **Sẵn mẫu tin nhắn tiếng Việt:**
  - `formatOrderTelegramMessage` / `notifyTelegramNewOrder`
  - `formatProjectRequestTelegramMessage` / `notifyTelegramProjectRequest`

## Tài liệu đi kèm

- **Hướng dẫn sử dụng chi tiết cho người dùng / bàn giao khách:** [`HUONG_DAN_SU_DUNG.md`](./HUONG_DAN_SU_DUNG.md)
- **Skill chuẩn Antigravity / Claude Code:** [`SKILL.md`](./SKILL.md)

## Cách lấy Bot Token & Chat ID (2 phút)

1. Mở Telegram, nhắn cho **@BotFather** → gửi `/newbot` → đặt tên bot và nhận `TELEGRAM_BOT_TOKEN`.
2. Nhắn 1 tin bất kỳ cho bot vừa tạo, hoặc nhắn **@userinfobot** để lấy `TELEGRAM_CHAT_ID` của bạn (nếu gửi vào nhóm thì thêm bot vào nhóm và lấy ID nhóm dạng `-100...`).
3. Thêm vào `.env.local` (hoặc Vercel Environment Variables — **không** dùng tiền tố `NEXT_PUBLIC_`):

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

## Sử dụng làm API Webhook riêng trên Vercel (0đ)

Repo đã tích hợp sẵn **Vercel Functions** chuẩn Web Standard (`api/health.ts` & `api/notify.ts`) để bạn deploy thành một API dịch vụ dùng chung cho nhiều website khác nhau:

1. Deploy repo lên **Vercel Hobby (0đ)**.
2. Trong **Settings → Environment Variables**, thêm 3 biến:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `NOTIFY_API_KEY` *(chuỗi bí mật tự đặt để chống spam API)*
3. Gọi từ backend hoặc Next.js Server Action của bất kỳ website nào:

```bash
curl -X POST https://your-notifier.vercel.app/api/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_NOTIFY_API_KEY" \
  -d '{
    "type": "order",
    "orderId": "ORD-101",
    "itemTitle": "TP91 Commerce Starter",
    "amountVnd": 490000,
    "customerName": "Nguyễn Văn A",
    "contactChannel": "zalo",
    "customerContact": "0912345678"
  }'
```

Hỗ trợ 3 loại payload (`type`):
- `order`: Báo đơn hàng (`orderId`, `itemTitle`, `amountVnd`, `customerName`, `contactChannel`, `customerContact`, `note`)
- `project_request`: Báo yêu cầu làm web/báo giá (`requestId`, `servicePackageName`, `customerName`, `contactChannel`, `customerContact`, `budgetRange`, `timeline`, `description`)
- `custom` *(mặc định)*: Tin nhắn tùy biến (`title`, `message`, `fields`)

## Sử dụng nhanh trong Next.js (nhúng trực tiếp)

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
