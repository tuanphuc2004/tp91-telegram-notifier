import {
  getEncryptionSecret,
  issueEncryptedApiKey,
  validateIssueKeyInput,
} from "../src/crypto-key.js";
import {
  formatCustomTelegramMessage,
  sendTelegramNotification,
} from "../src/index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!getEncryptionSecret()) {
    return jsonResponse(
      {
        ok: false,
        error: "Server chưa cấu hình KEY_ENCRYPTION_SECRET.",
      },
      503
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ ok: false, error: "Body phải là JSON object." }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: "JSON body không hợp lệ." }, 400);
  }

  const validated = validateIssueKeyInput({
    botToken: typeof body.botToken === "string" ? body.botToken : "",
    chatId: typeof body.chatId === "string" ? body.chatId : "",
    brandName: typeof body.brandName === "string" ? body.brandName : undefined,
    allowedOrigin:
      typeof body.allowedOrigin === "string" ? body.allowedOrigin : undefined,
  });

  if (!validated.ok) {
    return jsonResponse({ ok: false, error: validated.error }, 400);
  }

  const sendTest = body.sendTestMessage !== false;
  if (sendTest) {
    const testHtml = formatCustomTelegramMessage({
      brandName: validated.data.brandName ?? "TP91 Notifier",
      title: "Kết nối API Key thành công",
      message:
        "Bot Telegram của bạn đã liên kết thành công với TP91 Telegram Notifier. Từ bây giờ website của bạn có thể gửi thông báo qua API Key vừa tạo.",
      fields: {
        "Chat ID": validated.data.chatId,
        ...(validated.data.allowedOrigin
          ? { "Domain cho phép": validated.data.allowedOrigin }
          : {}),
      },
    });

    const testRes = await sendTelegramNotification(testHtml, {
      botToken: validated.data.botToken,
      chatId: validated.data.chatId,
    });

    if (!testRes.ok) {
      return jsonResponse(
        {
          ok: false,
          error: `Không gửi được tin nhắn thử tới Bot (${testRes.error}). Hãy kiểm tra lại Bot Token, Chat ID và chắc chắn bạn đã bấm Start với Bot.`,
        },
        400
      );
    }
  }

  const issued = issueEncryptedApiKey(validated.data);
  if (!issued.ok) {
    return jsonResponse({ ok: false, error: issued.error }, 500);
  }

  return jsonResponse({
    ok: true,
    apiKey: issued.apiKey,
    tested: sendTest,
    brandName: issued.payload.brandName ?? null,
    allowedOrigin: issued.payload.allowedOrigin ?? null,
  });
}
