import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { bot } from "@/lib/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  amountStars: z.number().int().min(1).max(10_000),
});

function makeNonce(bytes = 12) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = BodySchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tgId: true } });
    if (!user) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });

    // payload должен быть 1..128 байт (Telegram ограничение)
    let payload = "";
    for (let i = 0; i < 5; i++) {
      payload = `kcpay:${userId}:${body.amountStars}:${makeNonce(10)}`;
      try {
        await prisma.pendingPayment.create({
          data: { userId, payload, starsToAdd: body.amountStars, consumed: false },
        });
        break;
      } catch {
        payload = "";
      }
    }
    if (!payload) {
      return NextResponse.json({ ok: false, error: "PAYLOAD_CREATE_FAILED" }, { status: 500 });
    }

    // Telegram Stars (XTR): для Stars provider_token НЕ нужен.
    // Важно: prices должен содержать ровно 1 item.
    try {
      await bot.api.sendInvoice(
        Number(user.tgId),
        `KARABAS Top Up`,
        `Пополнение баланса KARABAS CASE на ${body.amountStars} ⭐`,
        payload,
        "XTR",
        [{ label: "Top Up", amount: body.amountStars }],
        {
          need_name: false,
          need_email: false,
          need_phone_number: false,
          need_shipping_address: false,
        }
      );
    } catch (e: any) {
      await prisma.pendingPayment.delete({ where: { payload } }).catch(() => {});
      const desc = typeof e?.description === "string" ? e.description : typeof e?.message === "string" ? e.message : "";
      return NextResponse.json({ ok: false, error: "SEND_INVOICE_FAILED", details: desc }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      amountStars: body.amountStars,
      note: "Инвойс отправлен в чат с ботом. Оплатите и вернитесь в Mini App — баланс обновится.",
    });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
