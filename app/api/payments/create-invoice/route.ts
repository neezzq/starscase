import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getPackById } from "@/lib/packs";
import { bot } from "@/lib/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  packId: z.string().min(1),
});

function makeNonce(bytes = 12) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = BodySchema.parse(await req.json());
    const pack = getPackById(body.packId);
    if (!pack) return NextResponse.json({ ok: false, error: "PACK_NOT_FOUND" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tgId: true } });
    if (!user) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });

    // payload должен быть 1..128 байт (Telegram ограничение)
    let payload = "";
    for (let i = 0; i < 5; i++) {
      payload = `scpay:${userId}:${pack.id}:${makeNonce(10)}`;
      try {
        await prisma.pendingPayment.create({
          data: { userId, payload, coinsToAdd: pack.coins, consumed: false },
        });
        break;
      } catch {
        // collision по payload, пробуем заново
        payload = "";
      }
    }
    if (!payload) {
      return NextResponse.json({ ok: false, error: "PAYLOAD_CREATE_FAILED" }, { status: 500 });
    }

    // Telegram Stars (XTR): provider_token можно передать пустой строкой,
    // prices должен содержать ровно 1 item.
    try {
      await bot.api.sendInvoice(
        Number(user.tgId),
        `Пополнение: ${pack.title}`,
        `Начисление ${pack.coins} SC Coin в StarsCase`,
        payload,
        "",
        "XTR",
        [{ label: pack.title, amount: pack.stars }],
        {
          // Необязательно, но удобно: запрещаем пересылку payload
          need_name: false,
          need_email: false,
          need_phone_number: false,
          need_shipping_address: false,
        }
      );
    } catch (e: any) {
      // если пользователь не начинал чат с ботом, Telegram вернёт 403
      await prisma.pendingPayment.delete({ where: { payload } }).catch(() => {});
      const desc = typeof e?.description === "string" ? e.description : (typeof e?.message === "string" ? e.message : "");
      return NextResponse.json(
        { ok: false, error: "SEND_INVOICE_FAILED", details: desc },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      pack: { id: pack.id, coins: pack.coins, stars: pack.stars },
      note: "Инвойс отправлен в чат с ботом. Оплатите и вернитесь в Mini App — баланс обновится.",
    });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
