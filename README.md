# StarsCase — Telegram Mini App (Next.js + Prisma + PostgreSQL + grammY + Stars)

Один репозиторий под всё:
- Telegram Bot (webhook) на **grammY**
- Telegram Mini App UI внутри **Next.js App Router**
- Backend API на **Next Route Handlers**
- **Prisma + PostgreSQL** (Neon/Supabase совместимо)
- Покупки пакетов **SC Coin** через **Telegram Stars (XTR)**

## Быстрый старт (локально)

1) Установить зависимости:
```bash
npm i
```

2) Создать `.env` по примеру:
```bash
cp .env.example .env
```

3) Миграции и сид:
```bash
npx prisma migrate dev
npx prisma db seed
```

4) Запуск:
```bash
npm run dev
```

> Важно: Telegram Mini App работает корректно, когда открывается из Telegram через кнопку `web_app`.
> Для локального теста удобнее деплоить на Vercel preview или использовать HTTPS туннель (ngrok/Cloudflare Tunnel) и поставить webhook на него.

## Деплой на Vercel

1) Залей репозиторий на GitHub → импортируй в Vercel.

2) В Vercel добавь ENV:
- `BOT_TOKEN`
- `DATABASE_URL`
- `NEXT_PUBLIC_WEBAPP_URL` (например `https://<your-app>.vercel.app`)
- `SESSION_SECRET` (случайная строка 32+ символа)
- `TELEGRAM_WEBHOOK_SECRET` (опционально, но рекомендуется)

3) Prisma:
- В Vercel обычно достаточно `postinstall` → `prisma generate` уже есть.
- Миграции делай локально и пушь миграции в репозиторий **или** запускай `prisma migrate deploy` через CI.
  Для простоты: сделай `npx prisma migrate dev` локально и закоммить папку `prisma/migrations`.

## Установка webhook Telegram

Минимально (как в требовании):
```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<VERCEL_DOMAIN>/api/telegram/webhook
```

Рекомендуемый вариант с secret token (проверяется заголовок `X-Telegram-Bot-Api-Secret-Token`):
```bash
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -d "url=https://<VERCEL_DOMAIN>/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Проверка:
- Открой `https://<VERCEL_DOMAIN>/api/telegram/webhook` (GET) — должен вернуть `{ ok: true }`.

## Настройка Mini App домена в BotFather

Чтобы WebView внутри Telegram открывал твой Mini App:
1) Открой **@BotFather**
2) Для твоего бота:
   - либо команда **/setdomain** → выбери бота → укажи домен (например `your-app.vercel.app`)
   - дополнительно можно настроить постоянную кнопку: **/setmenubutton** → URL Mini App (`https://...`) и текст кнопки
3) Если ты создавал Mini App как отдельную сущность (BotFather /newapp), убедись что в настройках Mini App указан актуальный **Web App URL** (HTTPS).

## Что внутри

### UI (Mini App)
- `/` — список кейсов (free + платные), кнопка “Открыть”, анимация открытия
- `/profile` — баланс + последние 20 открытий + инвентарь
- `/topup` — выбор пакета → API инициирует invoice в Stars (инвойс приходит в чат с ботом)

### API
- `POST /api/auth/telegram` — принимает `Telegram.WebApp.initData`, валидирует подпись (HMAC SHA-256), создаёт/обновляет пользователя, ставит HttpOnly cookie с JWT
- `GET /api/me` — профиль + openings + inventory
- `GET /api/cases` — список кейсов
- `POST /api/cases/open` — открытие кейса **строго на сервере**: транзакция Prisma, проверка баланса/кулдауна, взвешенный рандом, запись Opening + Inventory
- `POST /api/payments/create-invoice` — создаёт PendingPayment и отправляет invoice пользователю через bot API
- `POST /api/telegram/webhook` — webhook endpoint (Telegram updates → `bot.handleUpdate()`)

## Пакеты SC Coin (Stars)

Пакеты настраиваются в `lib/packs.ts` (coins + stars).
> Stars invoices требуют `currency="XTR"` и `prices` ровно из **одного** элемента. (Telegram Payments via Stars)

## Примечания по безопасности
- Все критичные операции на сервере: баланс, рандом, начисления.
- initData валидируется по алгоритму Telegram WebApps.
- Дедуп платежей по `telegram_payment_charge_id` (unique).
- Простое rate-limit ограничение на `/api/cases/open` по `userId + IP`.

---

Если нужно — могу:
- добавить админку для управления кейсами/лутом,
- сделать красивее UI и анимацию,
- добавить историю платежей / реферальную систему.
