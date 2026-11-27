import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  escapeTelegramHtml,
  formatOrderTelegramMessage,
  formatProjectRequestTelegramMessage,
  isTelegramConfigured,
  sendTelegramNotification,
} from "../src/index";

describe("tp91-telegram-notifier", () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChatId = process.env.TELEGRAM_CHAT_ID;

  beforeEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalToken;

    if (originalChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = originalChatId;
  });

  it("escapes HTML special characters safely", () => {
    expect(escapeTelegramHtml('<script>alert("a & b")</script>')).toBe(
      '&lt;script&gt;alert("a &amp; b")&lt;/script&gt;'
    );
  });

  it("formats order notification with escaped customer input", () => {
    const msg = formatOrderTelegramMessage(
      {
        mode: "database",
        brandName: "TP91tool",
        orderId: "ORD-123",
        itemTitle: "TP91 Commerce Starter",
        amountVnd: 490000,
        customerName: "Phúc <Dev>",
        contactChannel: "zalo",
        customerContact: "0332155504",
        note: "Cần hướng dẫn deploy & cấu hình",
      },
      new Date("2026-11-27T03:00:00.000Z")
    );

    expect(msg).toContain("ĐƠN HÀNG MỚI");
    expect(msg).not.toContain("[PREVIEW]");
    expect(msg).toContain("ORD-123");
    expect(msg).toContain("490.000 đ");
    expect(msg).toContain("Phúc &lt;Dev&gt;");
    expect(msg).toContain("Cần hướng dẫn deploy &amp; cấu hình");
  });

  it("formats project request notification cleanly", () => {
    const msg = formatProjectRequestTelegramMessage(
      {
        mode: "preview",
        requestId: "REQ-999",
        servicePackageName: "Web Bán Hàng & Đặt Đơn",
        customerName: "Minh Anh",
        contactChannel: "telegram",
        customerContact: "@minhanh",
        budgetRange: "2 - 5 triệu",
        timeline: "Tiêu chuẩn (1 - 2 tuần)",
        selectedFeatures: ["Cơ sở dữ liệu", "SEO"],
        description: "Muốn làm web bán khóa học có trang quản trị đơn giản.",
        referenceUrl: "https://example.com",
      },
      new Date("2026-11-27T03:00:00.000Z")
    );

    expect(msg).toContain("YÊU CẦU MỚI [PREVIEW]");
    expect(msg).toContain("Web Bán Hàng &amp; Đặt Đơn");
    expect(msg).toContain("https://example.com");
  });

  it("skips sending cleanly when env vars are missing", async () => {
    expect(isTelegramConfigured()).toBe(false);
    const fetchMock = vi.fn();
    const res = await sendTelegramNotification("test", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(res).toEqual({ ok: true, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts JSON payload to Telegram Bot API when configured", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "999888";
    expect(isTelegramConfigured()).toBe(true);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const res = await sendTelegramNotification("<b>Hello</b>", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bot123%3Aabc/sendMessage");
    expect(init.method).toBe("POST");
    const parsedBody = JSON.parse(init.body as string);
    expect(parsedBody.chat_id).toBe("999888");
    expect(parsedBody.parse_mode).toBe("HTML");
  });

  it("handles Telegram HTTP errors gracefully without throwing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const res = await sendTelegramNotification("<b>Hello</b>", {
      botToken: "123:abc",
      chatId: "999888",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("401");
    }
  });
});
