---
name: tp91-telegram-notifier
description: Zero-cost Telegram Bot API notification helper for website orders, checkout flows, and customer/project inquiry forms in Next.js Server Actions, API Routes, or Node.js. Use when adding instant order or lead alerts to a web app without paid messaging APIs or extra runtime dependencies.
---

# TP91 Telegram Notifier

Zero-dependency TypeScript module for sending formatted HTML notifications to a Telegram Bot (`api.telegram.org/bot.../sendMessage`) from Next.js Server Actions, Route Handlers, or Node.js backends.

## When to Use

- Sending instant Telegram alerts when a customer places an order, submits a contact/quote form, or triggers a webhook.
- Operating on a `0đ` serverless stack (Vercel Hobby + Supabase Free) without paid SMS or email-only delays.

## Key Files

- `src/index.ts` — Core helper exports:
  - `isTelegramConfigured(options?)` — checks `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
  - `escapeTelegramHtml(value)` — escapes `&`, `<`, `>` for Telegram `HTML` parse mode
  - `formatOrderTelegramMessage(input)` / `formatProjectRequestTelegramMessage(input)` / `formatCustomTelegramMessage(input)`
  - `sendTelegramNotification(htmlText, options?)` — `POST` request with `4.5s` default timeout and non-throwing error return
  - `notifyTelegramNewOrder(input, options?)` / `notifyTelegramProjectRequest(input, options?)`
- `src/crypto-key.ts` — Stateless AES-256-GCM API Key issuer & verifier (`tp91_live_...`) encoding `{ botToken, chatId, brandName, allowedOrigin }` without database storage.
- `api/keys.ts` — `POST /api/keys` endpoint to validate Telegram credentials, optionally send a verification message, and issue an encrypted `tp91_live_...` key.
- `api/notify.ts` & `api/health.ts` — Standalone Vercel Functions (`GET /api/health`, `POST /api/notify`, `OPTIONS /api/notify`) supporting both multi-tenant `tp91_live_...` keys (with optional `allowedOrigin` CORS lock) and owner `NOTIFY_API_KEY` (`x-api-key` or `Authorization: Bearer`) via `timingSafeEqual`.
- `public/index.html` — Self-service portal for users to generate API keys and copy Next.js / PHP / cURL / HTML snippets.
- `examples/nextjs-server-action.ts` — Ready-to-copy Next.js Server Action example.
- `scripts/test-send.ts` — Manual CLI smoke test (`npm run test:send`).
- `tests/telegram.test.ts`, `tests/crypto-key.test.ts` & `tests/api.test.ts` — Vitest unit tests.

## Required Environment Variables

Server-only (never expose with `NEXT_PUBLIC_`):

- `KEY_ENCRYPTION_SECRET` (32+ char secret for issuing/decrypting `tp91_live_...` keys; falls back to `NOTIFY_API_KEY` if unset)
- `TELEGRAM_BOT_TOKEN` (optional if only operating in multi-tenant `tp91_live_...` mode)
- `TELEGRAM_CHAT_ID` (optional if only operating in multi-tenant `tp91_live_...` mode)
- `NOTIFY_API_KEY` (optional owner master key for `/api/notify`)
- `TELEGRAM_BRAND_NAME` (optional header label, defaults to `TP91tool`)

## Implementation Rules

1. Always `await` notification calls inside serverless handlers (e.g. Next.js Server Actions on Vercel) so the runtime does not terminate the fetch before completion.
2. Never fail or throw to the end-user checkout flow if Telegram fails or env vars are missing — log a warning and return the saved order response.
3. Always pass user-supplied fields through `escapeTelegramHtml` before embedding inside `HTML` formatted messages.

## Verification

```bash
npm test
npm run typecheck
```
