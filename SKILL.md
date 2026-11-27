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
- `api/notify.ts` & `api/health.ts` — Standalone Vercel Functions (`GET /api/health`, `POST /api/notify`) protected by `NOTIFY_API_KEY` (`x-api-key` or `Authorization: Bearer`) using `timingSafeEqual`.
- `examples/nextjs-server-action.ts` — Ready-to-copy Next.js Server Action example.
- `scripts/test-send.ts` — Manual CLI smoke test (`npm run test:send`).
- `tests/telegram.test.ts` & `tests/api.test.ts` — Vitest unit tests with mocked `fetch`.

## Required Environment Variables

Server-only (never expose with `NEXT_PUBLIC_`):

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `NOTIFY_API_KEY` (required for `/api/notify` endpoint; endpoint fails closed with `503` if unset)
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
