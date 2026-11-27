import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as healthGet } from "../api/health.js";
import { POST as keysPost } from "../api/keys.js";
import { POST as notifyPost } from "../api/notify.js";
import { issueEncryptedApiKey } from "../src/crypto-key.js";

describe("Vercel API endpoints (/api/health, /api/keys, /api/notify)", () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChatId = process.env.TELEGRAM_CHAT_ID;
  const originalApiKey = process.env.NOTIFY_API_KEY;
  const originalEncSecret = process.env.KEY_ENCRYPTION_SECRET;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.NOTIFY_API_KEY;
    delete process.env.KEY_ENCRYPTION_SECRET;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalToken;

    if (originalChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = originalChatId;

    if (originalApiKey === undefined) delete process.env.NOTIFY_API_KEY;
    else process.env.NOTIFY_API_KEY = originalApiKey;

    if (originalEncSecret === undefined) delete process.env.KEY_ENCRYPTION_SECRET;
    else process.env.KEY_ENCRYPTION_SECRET = originalEncSecret;
  });

  it("GET /api/health reports status without leaking secrets", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:secret";
    process.env.TELEGRAM_CHAT_ID = "999";
    process.env.NOTIFY_API_KEY = "my-secret-key";
    process.env.KEY_ENCRYPTION_SECRET = "my-enc-secret-1234";

    const res = await healthGet();
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(json.multiTenantKeysEnabled).toBe(true);
    expect(json.telegramConfigured).toBe(true);
    expect(json.apiKeyConfigured).toBe(true);
    expect(JSON.stringify(json)).not.toContain("my-secret-key");
    expect(JSON.stringify(json)).not.toContain("my-enc-secret");
  });

  it("POST /api/keys issues encrypted tp91_live_ key and tests bot when requested", async () => {
    process.env.KEY_ENCRYPTION_SECRET = "server-aes-secret-key-1234";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const req = new Request("https://example.com/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botToken: "8728454048:AAGbymwh_ivKwkjvJlJS72YbXp7BBCXTZ08",
        chatId: "7245779125",
        brandName: "User Shop",
        sendTestMessage: true,
      }),
    });

    const res = await keysPost(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; apiKey: string; tested: boolean };
    expect(json.ok).toBe(true);
    expect(json.tested).toBe(true);
    expect(json.apiKey.startsWith("tp91_live_")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "8728454048%3AAAGbymwh_ivKwkjvJlJS72YbXp7BBCXTZ08"
    );
  });

  it("POST /api/notify routes encrypted user key to that user's own Telegram bot/chat", async () => {
    process.env.KEY_ENCRYPTION_SECRET = "server-aes-secret-key-1234";
    const issued = issueEncryptedApiKey({
      botToken: "999999999:UserSpecificBotTokenValue123456",
      chatId: "555666777",
      brandName: "Khách Hàng A",
    });
    if (!issued.ok) throw new Error("Issue failed");

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const req = new Request("https://example.com/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": issued.apiKey,
      },
      body: JSON.stringify({
        type: "order",
        orderId: "ORD-888",
        itemTitle: "Áo khoác",
        amountVnd: 350000,
        customerName: "Nam",
        contactChannel: "zalo",
        customerContact: "0911222333",
      }),
    });

    const res = await notifyPost(req);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("999999999%3AUserSpecificBotTokenValue123456");
    const sentBody = JSON.parse(String(init?.body));
    expect(sentBody.chat_id).toBe("555666777");
    expect(sentBody.text).toContain("Khách Hàng A");
    expect(sentBody.text).toContain("ORD-888");
  });

  it("POST /api/notify enforces allowedOrigin when key is domain-locked", async () => {
    process.env.KEY_ENCRYPTION_SECRET = "server-aes-secret-key-1234";
    const issued = issueEncryptedApiKey({
      botToken: "999999999:UserSpecificBotTokenValue123456",
      chatId: "555666777",
      allowedOrigin: "https://myshop.vn",
    });
    if (!issued.ok) throw new Error("Issue failed");

    const req = new Request("https://example.com/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.com",
        "x-api-key": issued.apiKey,
      },
      body: JSON.stringify({ title: "Hi", message: "Test" }),
    });

    const res = await notifyPost(req);
    expect(res.status).toBe(403);
  });

  it("POST /api/notify still supports master NOTIFY_API_KEY", async () => {
    process.env.NOTIFY_API_KEY = "super-secret-api-key";
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "999";

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const req = new Request("https://example.com/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer super-secret-api-key",
      },
      body: JSON.stringify({
        type: "custom",
        title: "Đăng ký mới",
        message: "Có khách hàng vừa để lại thông tin.",
      }),
    });

    const res = await notifyPost(req);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("POST /api/notify rejects invalid key with 401", async () => {
    process.env.NOTIFY_API_KEY = "super-secret-api-key";
    process.env.KEY_ENCRYPTION_SECRET = "server-aes-secret-key-1234";

    const req = new Request("https://example.com/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "tp91_live_tampered_invalid_key",
      },
      body: JSON.stringify({ title: "Test", message: "Hello" }),
    });

    const res = await notifyPost(req);
    expect(res.status).toBe(401);
  });
});
