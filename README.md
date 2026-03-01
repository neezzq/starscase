# KARABAS CASE — Telegram Mini App (Next.js + Prisma + PostgreSQL + grammY + Stars)

Монорепозиторий: Telegram Mini App + Bot webhook в Next.js (Vercel).

## Стек
- TypeScript
- Next.js (App Router)
- Prisma + PostgreSQL
- grammY bot + Webhook через Next Route Handler
- Telegram Stars (XTR)

## Локальный запуск
```bash
npm i
cp .env.example .env
# заполни переменные
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## .env
Смотри `.env.example`.

## Деплой на Vercel
1) Залей репозиторий на GitHub.
2) Import в Vercel.
3) Добавь env vars в Vercel (production):
   - `BOT_TOKEN`
   - `DATABASE_URL`
   - `NEXT_PUBLIC_WEBAPP_URL` (твой домен Vercel)
   - `SESSION_SECRET`
   - `TELEGRAM_WEBHOOK_SECRET`
4) Redeploy.

## Webhook
Установить webhook:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<VERCEL_DOMAIN>/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Проверить:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

## BotFather: имя и WebApp домен
- **Переименовать бота**: @BotFather → `mybots` → выбери бота → **Edit Name** → поставь `KARABAS CASE`.
- **Web App домен**: @BotFather → настройки Web App / Mini App → укажи URL `https://<VERCEL_DOMAIN>`.

## Валюта
Внутренняя валюта Mini App — ⭐ (Stars). Пополнение идёт через Telegram Stars (XTR) 1:1.

