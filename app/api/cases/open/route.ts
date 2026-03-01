import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { pickWeighted } from "@/lib/weighted";

export const runtime = "nodejs";

type Body = {
  caseId: string;
  qty?: number;       // 1..5
  demo?: boolean;     // demo mode: no balance/inventory changes
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  const rl = rateLimit(`open:${user.id}:${ip}`, 8, 30_000); // 8 opens / 30s
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = (await req.json()) as Body;
  const qty = Math.max(1, Math.min(5, body.qty ?? 1));
  const demo = !!body.demo;

  const theCase = await prisma.case.findUnique({
    where: { id: body.caseId },
    include: { items: true },
  });

  if (!theCase || !theCase.isActive) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (!theCase.items.length) {
    return NextResponse.json({ error: "Case items are not configured yet" }, { status: 400 });
  }

  // Demo: allow opening without touching DB (except Opening record if you want).
  // Requirement: demo should be free and NOT show inventory changes.
  // We'll still record openings with demo=true flag in result payload, but not write to DB to keep it clean.
  if (demo) {
   const results = Array.from({ length: qty }).map(() => {
  const item = pickWeighted(theCase.items, (x) => x.weight);
  return { title: item.title, rarity: item.rarity };
});
    return NextResponse.json({
      ok: true,
      demo: true,
      spentStars: 0,
      results,
    });
  }

  // Real open: transactional, charges stars, writes opening + inventory
  const pricePer = theCase.isFree ? 0 : theCase.priceStars;
  const totalPrice = pricePer * qty;

  const now = new Date();

  const out = await prisma.$transaction(async (tx) => {
    const dbUser = await tx.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new Error("User not found");

    // Cooldown: for paid cases usually 0; for free could be enforced
    if (theCase.cooldownSec > 0) {
      const last = await tx.opening.findFirst({
        where: { userId: user.id, caseId: theCase.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (last) {
        const nextAt = new Date(last.createdAt.getTime() + theCase.cooldownSec * 1000);
        if (nextAt > now) {
          return { error: "Cooldown", cooldownUntil: nextAt.toISOString() } as const;
        }
      }
    }

    if (dbUser.balanceStars < totalPrice) {
      return { error: "Not enough stars" } as const;
    }

    // charge
    if (totalPrice > 0) {
      await tx.user.update({
        where: { id: user.id },
        data: { balanceStars: { decrement: totalPrice } },
      });
    }

    const results: Array<{ title: string; rarity: any; imageUrl: string | null }> = [];

    for (let i = 0; i < qty; i++) {
      const item = pickWeighted(theCase.items, (x) => x.weight);
      results.push({ title: item.title, rarity: item.rarity, imageUrl: item.imageUrl ?? null });

      await tx.opening.create({
        data: {
          userId: user.id,
          caseId: theCase.id,
          resultTitle: item.title,
          rarity: item.rarity,
        },
      });

      // Inventory adds
      await tx.inventory.upsert({
        where: {
          userId_title_rarity: { userId: user.id, title: item.title, rarity: item.rarity },
        },
        update: { qty: { increment: 1 } },
        create: { userId: user.id, title: item.title, rarity: item.rarity, qty: 1, imageUrl: item.imageUrl ?? null },
      });
    }

    return { results, spentStars: totalPrice } as const;
  });

  if ("error" in out) {
    return NextResponse.json(out, { status: out.error === "Cooldown" ? 429 : 400 });
  }

  return NextResponse.json({ ok: true, demo: false, ...out });
}
