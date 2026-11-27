import { isTelegramConfigured } from "../src/index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(): Promise<Response> {
  return jsonResponse({
    ok: true,
    service: "tp91-telegram-notifier",
    telegramConfigured: isTelegramConfigured(),
    apiKeyConfigured: Boolean(process.env.NOTIFY_API_KEY?.trim()),
    timestamp: new Date().toISOString(),
  });
}
