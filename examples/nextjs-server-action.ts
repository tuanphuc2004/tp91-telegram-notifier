"use server";

import { notifyTelegramNewOrder } from "../src/index.js";

/**
 * Example Next.js Server Action integration.
 * Place TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local / Vercel Environment Variables.
 */
export async function createOrderAction(input: {
  itemTitle: string;
  amountVnd: number;
  customerName: string;
  contactChannel: "zalo" | "telegram" | "facebook" | "email";
  customerContact: string;
  note?: string;
}) {
  // 1. Save your order to database (e.g. Supabase / Postgres)
  const orderId = `ORD-${Date.now().toString().slice(-6)}`;

  // 2. Notify owner via Telegram (safe & non-blocking on failure)
  await notifyTelegramNewOrder({
    mode: "database",
    orderId,
    itemTitle: input.itemTitle,
    amountVnd: input.amountVnd,
    customerName: input.customerName,
    contactChannel: input.contactChannel,
    customerContact: input.customerContact,
    note: input.note ?? null,
  });

  return { ok: true, orderId };
}
