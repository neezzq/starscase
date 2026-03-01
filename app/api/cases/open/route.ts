import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getClientIp, requireUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  caseId: z.string().min(1),
});

function pickWeighted<T extends { weight: number }>(items: T[]) {
  const total = items.reduce((sum, it) => sum + Math.max(0, it.weight), 0);
  if (total <= 0) throw new Error("Case has invalid weights");

  const r = crypto.randomInt(0, total);
  let acc = 0;
  for (const it of items) {
    acc += Math.max(0, it.weight);
    if (r < acc) return it;
  }
  return items[items.length - 1]!;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    const ip = getClientIp(req);
    const rl = rateLimit(`open:${userId}:${ip}`, { limit: 6, windowMs: 10_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT", retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      );
    }

    const body = BodySchema.parse(await req.json());

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const c = await tx.case.findUnique({
        where: { id: body.caseId },
        select: {
          id: true,
          title: true,
          priceCoin: true,
          isFree: true,
          cooldownSec: true,
          isActive: true,
          items: { select: { id: true, title: true, rarity: true, weight: true, rewardType: true, rewardValue: true } },
        },
      });
      if (!c || !c.isActive) throw new Error("CASE_NOT_FOUND");

      const lastOpen = await tx.opening.findFirst({
        where: { userId, caseId: c.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      if (c.cooldownSec > 0 && lastOpen) {
        const diffSec = Math.floor((now.getTime() - lastOpen.createdAt.getTime()) / 1000);
        const remaining = c.cooldownSec - diffSec;
        if (remaining > 0) {
          const err: any = new Error("COOLDOWN");
          err.remainingSec = remaining;
          throw err;
        }
      }

      if (!c.items?.length) throw new Error("CASE_EMPTY");

      // Списываем стоимость (если не free)
      if (!c.isFree && c.priceCoin > 0) {
        const updated = await tx.user.updateMany({
          where: { id: userId, balanceCoin: { gte: c.priceCoin } },
          data: { balanceCoin: { decrement: c.priceCoin } },
        });
        if (updated.count !== 1) throw new Error("INSUFFICIENT_BALANCE");
      }

      const item = pickWeighted(c.items);

      // Добавляем в инвентарь
      await tx.inventory.upsert({
        where: {
          user_title_rarity_unique: { userId, title: item.title, rarity: item.rarity },
        },
        create: { userId, title: item.title, rarity: item.rarity, qty: 1 },
        update: { qty: { increment: 1 } },
      });

      // Доп. награда монетами (если rewardType=COIN)
      if (item.rewardType === "COIN" && item.rewardValue > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { balanceCoin: { increment: item.rewardValue } },
        });
      }

      const opening = await tx.opening.create({
        data: {
          userId,
          caseId: c.id,
          resultTitle: item.title,
          rarity: item.rarity,
        },
        select: { id: true, createdAt: true },
      });

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balanceCoin: true },
      });

      return {
        case: { id: c.id, title: c.title, priceCoin: c.priceCoin, isFree: c.isFree, cooldownSec: c.cooldownSec },
        result: {
          openingId: opening.id,
          title: item.title,
          rarity: item.rarity,
          rewardType: item.rewardType,
          rewardValue: item.rewardValue,
          createdAt: opening.createdAt,
        },
        balanceCoin: user?.balanceCoin ?? 0,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "ERROR";

    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (msg === "COOLDOWN") {
      return NextResponse.json(
        { ok: false, error: "COOLDOWN", remainingSec: e.remainingSec ?? null },
        { status: 429 }
      );
    }

    if (msg === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ ok: false, error: "INSUFFICIENT_BALANCE" }, { status: 400 });
    }

    if (msg === "CASE_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "CASE_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
