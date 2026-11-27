import { describe, expect, it } from "vitest";
import {
  API_KEY_PREFIX,
  decryptEncryptedApiKey,
  issueEncryptedApiKey,
  validateIssueKeyInput,
} from "../src/crypto-key.js";

describe("crypto-key (AES-256-GCM stateless API keys)", () => {
  const SECRET = "test-encryption-secret-32-chars-min";

  it("validates Telegram Bot Token, Chat ID, and optional origin", () => {
    expect(
      validateIssueKeyInput({
        botToken: "bad-token",
        chatId: "7245779125",
      }).ok
    ).toBe(false);

    expect(
      validateIssueKeyInput({
        botToken: "8728454048:AAGbymwh_ivKwkjvJlJS72YbXp7BBCXTZ08",
        chatId: "abc",
      }).ok
    ).toBe(false);

    const valid = validateIssueKeyInput({
      botToken: "8728454048:AAGbymwh_ivKwkjvJlJS72YbXp7BBCXTZ08",
      chatId: "-1001234567890",
      brandName: "Shop Minh Anh",
      allowedOrigin: "https://shop.vn/checkout, http://localhost:3000/test",
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.allowedOrigin).toBe("https://shop.vn, http://localhost:3000");
    }
  });

  it("encrypts and decrypts user credentials cleanly without exposing botToken", () => {
    const issued = issueEncryptedApiKey(
      {
        botToken: "8728454048:AAGbymwh_ivKwkjvJlJS72YbXp7BBCXTZ08",
        chatId: "7245779125",
        brandName: "My Shop",
      },
      SECRET
    );

    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    expect(issued.apiKey.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(issued.apiKey).not.toContain("8728454048");
    expect(issued.apiKey).not.toContain("7245779125");

    const decrypted = decryptEncryptedApiKey(issued.apiKey, SECRET);
    expect(decrypted.ok).toBe(true);
    if (decrypted.ok) {
      expect(decrypted.payload.botToken).toBe(
        "8728454048:AAGbymwh_ivKwkjvJlJS72YbXp7BBCXTZ08"
      );
      expect(decrypted.payload.chatId).toBe("7245779125");
      expect(decrypted.payload.brandName).toBe("My Shop");
    }
  });

  it("rejects tampered keys or decryption with wrong secret", () => {
    const issued = issueEncryptedApiKey(
      {
        botToken: "8728454048:AAGbymwh_ivKwkjvJlJS72YbXp7BBCXTZ08",
        chatId: "7245779125",
      },
      SECRET
    );
    if (!issued.ok) throw new Error("Expected key issuance to succeed");

    // Tamper last char
    const lastChar = issued.apiKey.slice(-1) === "a" ? "b" : "a";
    const tampered = issued.apiKey.slice(0, -1) + lastChar;
    expect(decryptEncryptedApiKey(tampered, SECRET).ok).toBe(false);

    // Wrong server secret
    expect(decryptEncryptedApiKey(issued.apiKey, "different-secret-12345").ok).toBe(
      false
    );
  });
});
