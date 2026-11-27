import { timingSafeEqual } from "node:crypto";
import {
  API_KEY_PREFIX,
  decryptEncryptedApiKey,
  isMultiTenantKeysEnabled,
} from "../src/crypto-key.js";
import {
  formatCustomTelegramMessage,
  formatOrderTelegramMessage,
  formatProjectRequestTelegramMessage,
  isTelegramConfigured,
  sendTelegramNotification,
} from "../src/index.js";

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function constantTimeMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function extractApiKey(request: Request): string {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) return headerKey;

  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function OPTIONS(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: {
      ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const providedKey = extractApiKey(request);
  if (!providedKey) {
    return jsonResponse(
      { ok: false, error: "Thiếu API key trong header x-api-key hoặc Authorization." },
      401
    );
  }

  let targetBotToken: string | undefined;
  let targetChatId: string | undefined;
  let defaultBrandName: string | undefined;
  let corsHeaders: Record<string, string> = {};

  if (providedKey.startsWith(API_KEY_PREFIX)) {
    if (!isMultiTenantKeysEnabled()) {
      return jsonResponse(
        { ok: false, error: "Server chưa bật chế độ multi-tenant API key." },
        503
      );
    }

    const decrypted = decryptEncryptedApiKey(providedKey);
    if (!decrypted.ok) {
      return jsonResponse({ ok: false, error: decrypted.error }, 401);
    }

    const reqOrigin = request.headers.get("origin")?.trim();
    if (decrypted.payload.allowedOrigin) {
      if (reqOrigin && reqOrigin !== decrypted.payload.allowedOrigin) {
        return jsonResponse(
          { ok: false, error: "Origin không khớp với domain đã đăng ký trong API key." },
          403
        );
      }
      corsHeaders = {
        "Access-Control-Allow-Origin": decrypted.payload.allowedOrigin,
      };
    }

    targetBotToken = decrypted.payload.botToken;
    targetChatId = decrypted.payload.chatId;
    defaultBrandName = decrypted.payload.brandName;
  } else {
    const masterKey = process.env.NOTIFY_API_KEY?.trim();
    if (!masterKey) {
      return jsonResponse(
        { ok: false, error: "Server chưa cấu hình biến môi trường NOTIFY_API_KEY." },
        503
      );
    }

    if (!constantTimeMatch(providedKey, masterKey)) {
      return jsonResponse(
        { ok: false, error: "API key không hợp lệ." },
        401
      );
    }

    if (!isTelegramConfigured()) {
      return jsonResponse(
        {
          ok: false,
          error: "Server chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID.",
        },
        503
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse(
        { ok: false, error: "Body phải là JSON object." },
        400,
        corsHeaders
      );
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(
      { ok: false, error: "JSON body không hợp lệ." },
      400,
      corsHeaders
    );
  }

  const brandName = isNonEmptyString(body.brandName)
    ? body.brandName
    : defaultBrandName;
  const kind = typeof body.type === "string" ? body.type : "custom";
  let htmlText: string;

  if (kind === "order") {
    if (
      !isNonEmptyString(body.orderId) ||
      !isNonEmptyString(body.itemTitle) ||
      !isNonEmptyString(body.customerName) ||
      !isNonEmptyString(body.customerContact)
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "Thiếu trường bắt buộc cho type='order': orderId, itemTitle, customerName, customerContact.",
        },
        400,
        corsHeaders
      );
    }

    const amount = Number(body.amountVnd ?? 0);
    htmlText = formatOrderTelegramMessage({
      mode: body.mode === "preview" ? "preview" : "database",
      brandName,
      orderId: body.orderId,
      itemTitle: body.itemTitle,
      amountVnd: Number.isFinite(amount) && amount >= 0 ? amount : 0,
      customerName: body.customerName,
      contactChannel: isNonEmptyString(body.contactChannel)
        ? body.contactChannel
        : "khác",
      customerContact: body.customerContact,
      note: isNonEmptyString(body.note) ? body.note : null,
    });
  } else if (kind === "project_request") {
    if (
      !isNonEmptyString(body.requestId) ||
      !isNonEmptyString(body.servicePackageName) ||
      !isNonEmptyString(body.customerName) ||
      !isNonEmptyString(body.customerContact) ||
      !isNonEmptyString(body.description)
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "Thiếu trường bắt buộc cho type='project_request': requestId, servicePackageName, customerName, customerContact, description.",
        },
        400,
        corsHeaders
      );
    }

    htmlText = formatProjectRequestTelegramMessage({
      mode: body.mode === "preview" ? "preview" : "database",
      brandName,
      requestId: body.requestId,
      servicePackageName: body.servicePackageName,
      customerName: body.customerName,
      contactChannel: isNonEmptyString(body.contactChannel)
        ? body.contactChannel
        : "khác",
      customerContact: body.customerContact,
      budgetRange: isNonEmptyString(body.budgetRange)
        ? body.budgetRange
        : "Thỏa thuận",
      timeline: isNonEmptyString(body.timeline) ? body.timeline : "Linh hoạt",
      selectedFeatures: Array.isArray(body.selectedFeatures)
        ? body.selectedFeatures.filter((item): item is string => typeof item === "string")
        : [],
      description: body.description,
      referenceUrl: isNonEmptyString(body.referenceUrl) ? body.referenceUrl : null,
    });
  } else if (kind === "custom") {
    if (!isNonEmptyString(body.title) || !isNonEmptyString(body.message)) {
      return jsonResponse(
        {
          ok: false,
          error: "Thiếu trường bắt buộc cho type='custom': title, message.",
        },
        400,
        corsHeaders
      );
    }

    const rawFields =
      body.fields && typeof body.fields === "object" && !Array.isArray(body.fields)
        ? (body.fields as Record<string, string | number | boolean | null | undefined>)
        : undefined;

    htmlText = formatCustomTelegramMessage({
      brandName,
      title: body.title,
      message: body.message,
      fields: rawFields,
    });
  } else {
    return jsonResponse(
      {
        ok: false,
        error: "Giá trị 'type' không hợp lệ. Chỉ hỗ trợ: order, project_request, custom.",
      },
      400,
      corsHeaders
    );
  }

  const sent = await sendTelegramNotification(htmlText, {
    botToken: targetBotToken,
    chatId: targetChatId,
  });
  if (!sent.ok) {
    return jsonResponse({ ok: false, error: sent.error }, 502, corsHeaders);
  }

  return jsonResponse({ ok: true, sent: true }, 200, corsHeaders);
}
