import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as healthGet } from "../api/health";
import { POST as notifyPost } from "../api/notify";

describe("Vercel API endpoints (/api/health & /api/notify)", () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChatId = process.env.TELEGRAM_CHAT_ID;
  const originalApiKey = process.env.NOTIFY_API_KEY;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.NOTIFY_API_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalToken;

    if (originalChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = originalChatId;

    if (originalApiKey === undefined) delete process.env.NOTIFY_API_KEY;
    else process.env.NOTIFY_API_KEY = originalApiKey;
  });

  it("GET /api/health reports configuration booleans without leaking secrets", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:secret";
    process.env.TELEGRAM_CHAT_ID = "999";
    process.env.NOTIFY_API_KEY = "my-secret-key";

    const res = await healthGet();
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(json.telegramConfigured).toBe(true);
    expect(json.apiKeyConfigured).toBe(true);
    expect(JSON.stringify(json)).not.toContain("my-secret-key");
    expect(JSON.stringify(json)).not.toContain("123:secret");
  });

  it("POST /api/notify fails closed (503) when NOTIFY_API_KEY is not configured", async () => {
    const req = new Request("https://example.com/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", message: "Hello" }),
    });

    const res = await notifyPost(req);
    expect(res.status).toBe(503);
  });

  it("POST /api/notify rejects missing or invalid x-api-key with 401", async () => {
    process.env.NOTIFY_API_KEY = "super-secret-api-key";
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "999";

    const req = new Request("https://example.com/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "wrong-key",
      },
      body: JSON.stringify({ title: "Test", message: "Hello" }),
    });

    const res = await notifyPost(req);
    expect(res.status).toBe(401);
  });

  it("POST /api/notify validates required order fields (400)", async () => {
    process.env.NOTIFY_API_KEY = "super-secret-api-key";
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "999";

    const req = new Request("https://example.com/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer super-secret-api-key",
      },
      body: JSON.stringify({ type: "order", orderId: "ORD-1" }),
    });

    const res = await notifyPost(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/notify sends custom notification via Telegram when authenticated", async () => {
    process.env.NOTIFY_API_KEY = "super-secret-api-key";
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "999";

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const req = new Request("https://example.com/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "super-secret-api-key",
      },
      body: JSON.stringify({
        type: "custom",
        title: "Đăng ký mới",
        message: "Có khách hàng vừa để lại thông tin.",
        fields: { Email: "khach@example.com", Nguon: "Landing Page" },
      }),
    });

    const res = await notifyPost(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; sent: boolean };
    expect(json).toEqual({ ok: true, sent: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const bodySent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(bodySent.text).toContain("Đăng ký mới");
    expect(bodySent.text).toContain("khach@example.com");
  });

  it("POST /api/notify returns 502 if Telegram API fails", async () => {
    process.env.NOTIFY_API_KEY = "super-secret-api-key";
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "999";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Telegram error",
    }) as unknown as typeof fetch;

    const req = new Request("https://example.com/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "super-secret-api-key",
      },
      body: JSON.stringify({
        type: "order",
        orderId: "ORD-101",
        itemTitle: "Starter Kit",
        amountVnd: 290000,
        customerName: "An",
        contactChannel: "zalo",
        customerContact: "0900000000",
      }),
    });

    const res = await notifyPost(req);
    expect(res.status).toBe(502);
  });
});
