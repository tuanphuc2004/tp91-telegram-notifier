export type ContactChannel = "zalo" | "telegram" | "facebook" | "email" | string;

export interface TelegramOrderPayload {
  mode?: "database" | "preview";
  brandName?: string;
  orderId: string;
  itemTitle: string;
  amountVnd: number;
  customerName: string;
  contactChannel: ContactChannel;
  customerContact: string;
  note?: string | null;
}

export interface TelegramProjectRequestPayload {
  mode?: "database" | "preview";
  brandName?: string;
  requestId: string;
  servicePackageName: string;
  customerName: string;
  contactChannel: ContactChannel;
  customerContact: string;
  budgetRange: string;
  timeline: string;
  selectedFeatures?: string[];
  description: string;
  referenceUrl?: string | null;
}

export interface TelegramSendOptions {
  botToken?: string;
  chatId?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_CHANNEL_LABELS: Record<string, string> = {
  zalo: "Zalo",
  telegram: "Telegram",
  facebook: "Facebook",
  email: "Email",
};

export function isTelegramConfigured(
  options?: Pick<TelegramSendOptions, "botToken" | "chatId">
): boolean {
  const token = options?.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options?.chatId ?? process.env.TELEGRAM_CHAT_ID;
  return Boolean(token?.trim() && chatId?.trim());
}

export function escapeTelegramHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function formatVnd(amount: number): string {
  if (amount <= 0) return "Miễn phí";
  return `${new Intl.NumberFormat("vi-VN").format(amount)} đ`;
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatVietnamTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function resolveBrand(brandName?: string): string {
  return brandName?.trim() || process.env.TELEGRAM_BRAND_NAME?.trim() || "TP91tool";
}

function resolveChannelLabel(channel: ContactChannel): string {
  return DEFAULT_CHANNEL_LABELS[channel.toLowerCase()] ?? channel;
}

export function formatOrderTelegramMessage(
  input: TelegramOrderPayload,
  now: Date = new Date()
): string {
  const modeTag = input.mode === "preview" ? " [PREVIEW]" : "";
  const brand = resolveBrand(input.brandName);

  const lines = [
    `<b>🛒 ĐƠN HÀNG MỚI${modeTag} — ${escapeTelegramHtml(brand)}</b>`,
    ``,
    `• <b>Mã đơn:</b> <code>${escapeTelegramHtml(input.orderId)}</code>`,
    `• <b>Sản phẩm:</b> ${escapeTelegramHtml(input.itemTitle)}`,
    `• <b>Giá trị:</b> ${escapeTelegramHtml(formatVnd(input.amountVnd))}`,
    `• <b>Khách hàng:</b> ${escapeTelegramHtml(input.customerName)}`,
    `• <b>Liên hệ (${escapeTelegramHtml(resolveChannelLabel(input.contactChannel))}):</b> <code>${escapeTelegramHtml(input.customerContact)}</code>`,
  ];

  if (input.note && input.note.trim().length > 0) {
    lines.push(
      `• <b>Ghi chú:</b> ${escapeTelegramHtml(truncateText(input.note, 500))}`
    );
  }

  lines.push(`• <b>Thời gian:</b> ${escapeTelegramHtml(formatVietnamTime(now))}`);
  return lines.join("\n");
}

export function formatProjectRequestTelegramMessage(
  input: TelegramProjectRequestPayload,
  now: Date = new Date()
): string {
  const modeTag = input.mode === "preview" ? " [PREVIEW]" : "";
  const brand = resolveBrand(input.brandName);
  const features = input.selectedFeatures ?? [];

  const lines = [
    `<b>🧩 YÊU CẦU MỚI${modeTag} — ${escapeTelegramHtml(brand)}</b>`,
    ``,
    `• <b>Mã yêu cầu:</b> <code>${escapeTelegramHtml(input.requestId)}</code>`,
    `• <b>Gói dịch vụ:</b> ${escapeTelegramHtml(input.servicePackageName)}`,
    `• <b>Ngân sách:</b> ${escapeTelegramHtml(input.budgetRange)}`,
    `• <b>Thời gian:</b> ${escapeTelegramHtml(input.timeline)}`,
    `• <b>Khách hàng:</b> ${escapeTelegramHtml(input.customerName)}`,
    `• <b>Liên hệ (${escapeTelegramHtml(resolveChannelLabel(input.contactChannel))}):</b> <code>${escapeTelegramHtml(input.customerContact)}</code>`,
  ];

  if (features.length > 0) {
    lines.push(`• <b>Tính năng:</b> ${escapeTelegramHtml(features.join(", "))}`);
  }

  if (input.referenceUrl) {
    lines.push(`• <b>Link mẫu:</b> ${escapeTelegramHtml(input.referenceUrl)}`);
  }

  lines.push(
    `• <b>Mô tả:</b> ${escapeTelegramHtml(truncateText(input.description, 1000))}`
  );
  lines.push(`• <b>Gửi lúc:</b> ${escapeTelegramHtml(formatVietnamTime(now))}`);

  return lines.join("\n");
}

export async function sendTelegramNotification(
  htmlText: string,
  options: TelegramSendOptions = {}
): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string }> {
  const token = (options.botToken ?? process.env.TELEGRAM_BOT_TOKEN)?.trim();
  const chatId = (options.chatId ?? process.env.TELEGRAM_CHAT_ID)?.trim();
  const timeoutMs = options.timeoutMs ?? 4500;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!token || !chatId) {
    return { ok: true, skipped: true };
  }

  try {
    const response = await fetchImpl(
      `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: truncateText(htmlText, 4000),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Telegram API HTTP ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Telegram request failed",
    };
  }
}

export async function notifyTelegramNewOrder(
  input: TelegramOrderPayload,
  options?: TelegramSendOptions
): Promise<void> {
  const result = await sendTelegramNotification(
    formatOrderTelegramMessage(input),
    options
  );
  if (!result.ok) {
    console.warn("Telegram order notification failed:", result.error);
  }
}

export async function notifyTelegramProjectRequest(
  input: TelegramProjectRequestPayload,
  options?: TelegramSendOptions
): Promise<void> {
  const result = await sendTelegramNotification(
    formatProjectRequestTelegramMessage(input),
    options
  );
  if (!result.ok) {
    console.warn("Telegram project request notification failed:", result.error);
  }
}
