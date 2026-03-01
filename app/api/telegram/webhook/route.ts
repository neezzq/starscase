import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const incoming = req.headers.get("x-telegram-bot-api-secret-token");
    if (incoming !== secret) return unauthorized();
  }

  const update = await req.json();

  // telegram ждёт быстрый 200 OK; handleUpdate сам вызовет хендлеры
  await bot.handleUpdate(update);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "Telegram webhook endpoint" });
}
