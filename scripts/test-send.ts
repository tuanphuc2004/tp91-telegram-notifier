import { formatOrderTelegramMessage, isTelegramConfigured, sendTelegramNotification } from "../src/index";

async function main() {
  if (!isTelegramConfigured()) {
    console.error("Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong môi trường.");
    process.exit(1);
  }

  const msg = formatOrderTelegramMessage({
    mode: "preview",
    orderId: "TEST-001",
    itemTitle: "TP91 Commerce Starter",
    amountVnd: 490000,
    customerName: "Khách kiểm thử",
    contactChannel: "zalo",
    customerContact: "0332155504",
    note: "Tin nhắn thử từ tp91-telegram-notifier",
  });

  const res = await sendTelegramNotification(msg);
  if (!res.ok) {
    console.error("Gửi thất bại:", res.error);
    process.exit(1);
  }

  console.log("Đã gửi tin nhắn thử nghiệm tới Telegram thành công!");
}

void main();
