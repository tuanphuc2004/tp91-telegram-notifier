import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export const API_KEY_PREFIX = "tp91_live_";

export interface EncryptedKeyPayload {
  v: 1;
  botToken: string;
  chatId: string;
  brandName?: string;
  allowedOrigin?: string;
  iat: number;
}

export interface IssueKeyInput {
  botToken: string;
  chatId: string;
  brandName?: string;
  allowedOrigin?: string;
}

const BOT_TOKEN_REGEX = /^\d{5,}:[A-Za-z0-9_-]{20,}$/;
const CHAT_ID_REGEX = /^(?:-?\d{3,20}|@[A-Za-z0-9_]{4,64})$/;

export function getEncryptionSecret(): string | null {
  const secret =
    process.env.KEY_ENCRYPTION_SECRET?.trim() ||
    process.env.NOTIFY_API_KEY?.trim();
  return secret && secret.length >= 8 ? secret : null;
}

export function isMultiTenantKeysEnabled(): boolean {
  return getEncryptionSecret() !== null;
}

function deriveAesKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function validateIssueKeyInput(
  raw: IssueKeyInput
):
  | { ok: true; data: Required<Pick<IssueKeyInput, "botToken" | "chatId">> & Omit<IssueKeyInput, "botToken" | "chatId"> }
  | { ok: false; error: string } {
  const botToken = raw.botToken?.trim() ?? "";
  const chatId = raw.chatId?.trim() ?? "";
  const brandName = raw.brandName?.trim() || undefined;
  const rawOrigin = raw.allowedOrigin?.trim() || undefined;

  if (!BOT_TOKEN_REGEX.test(botToken) || botToken.length > 120) {
    return {
      ok: false,
      error:
        "Bot Token không đúng định dạng (ví dụ: 123456789:ABCdef...). Hãy kiểm tra lại từ @BotFather.",
    };
  }

  if (!CHAT_ID_REGEX.test(chatId)) {
    return {
      ok: false,
      error:
        "Chat ID không hợp lệ (ví dụ: 7245779125 hoặc -1001234567890 hoặc @ten_channel).",
    };
  }

  if (brandName && brandName.length > 60) {
    return {
      ok: false,
      error: "Tên thương hiệu tối đa 60 ký tự.",
    };
  }

  let allowedOrigin: string | undefined;
  if (rawOrigin) {
    try {
      const parsed = new URL(rawOrigin);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {
          ok: false,
          error: "Allowed Origin chỉ chấp nhận http:// hoặc https://.",
        };
      }
      allowedOrigin = parsed.origin;
    } catch {
      return {
        ok: false,
        error: "Allowed Origin không phải URL hợp lệ (ví dụ: https://shop.vn).",
      };
    }
  }

  return {
    ok: true,
    data: {
      botToken,
      chatId,
      brandName,
      allowedOrigin,
    },
  };
}

export function issueEncryptedApiKey(
  input: IssueKeyInput,
  secretOverride?: string
): { ok: true; apiKey: string; payload: EncryptedKeyPayload } | { ok: false; error: string } {
  const secret = secretOverride?.trim() || getEncryptionSecret();
  if (!secret || secret.length < 8) {
    return {
      ok: false,
      error: "Server chưa cấu hình KEY_ENCRYPTION_SECRET.",
    };
  }

  const validated = validateIssueKeyInput(input);
  if (!validated.ok) {
    return validated;
  }

  const payload: EncryptedKeyPayload = {
    v: 1,
    botToken: validated.data.botToken,
    chatId: validated.data.chatId,
    ...(validated.data.brandName ? { brandName: validated.data.brandName } : {}),
    ...(validated.data.allowedOrigin
      ? { allowedOrigin: validated.data.allowedOrigin }
      : {}),
    iat: Math.floor(Date.now() / 1000),
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveAesKey(secret), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const packed = Buffer.concat([iv, authTag, encrypted]).toString("base64url");
  return {
    ok: true,
    apiKey: `${API_KEY_PREFIX}${packed}`,
    payload,
  };
}

export function decryptEncryptedApiKey(
  apiKey: string,
  secretOverride?: string
): { ok: true; payload: EncryptedKeyPayload } | { ok: false; error: string } {
  const secret = secretOverride?.trim() || getEncryptionSecret();
  if (!secret || secret.length < 8) {
    return { ok: false, error: "Server chưa cấu hình khóa giải mã." };
  }

  const trimmed = apiKey.trim();
  if (!trimmed.startsWith(API_KEY_PREFIX)) {
    return { ok: false, error: "Định dạng API key không hợp lệ." };
  }

  const encoded = trimmed.slice(API_KEY_PREFIX.length);
  if (!encoded || encoded.length > 2048) {
    return { ok: false, error: "API key không hợp lệ." };
  }

  try {
    const raw = Buffer.from(encoded, "base64url");
    if (raw.length < 12 + 16 + 2) {
      return { ok: false, error: "API key bị hỏng hoặc không đầy đủ." };
    }

    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);

    const decipher = createDecipheriv("aes-256-gcm", deriveAesKey(secret), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");

    const parsed = JSON.parse(decrypted) as Partial<EncryptedKeyPayload>;
    if (
      parsed.v !== 1 ||
      typeof parsed.botToken !== "string" ||
      typeof parsed.chatId !== "string"
    ) {
      return { ok: false, error: "Dữ liệu API key không hợp lệ." };
    }

    return {
      ok: true,
      payload: parsed as EncryptedKeyPayload,
    };
  } catch {
    return { ok: false, error: "API key không hợp lệ hoặc đã bị chỉnh sửa." };
  }
}
