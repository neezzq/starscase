import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { pickWeighted } from "@/lib/weighted";

export const runtime = "nodejs";

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  const i = Math.trunc(v);
  return Math.min(max, Math.max(min, i));
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rl = rateLimit(`open:${user.id}:${ip}`, 8, 30_000);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT", retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const caseId = typeof body.caseId === "string" ? body.caseId : "";
    const qty = clampInt(body.qty, 1, 5, 1);
    const demo = Boolean(body.demo);

    if (!caseId) {
      return NextResponse.json({ ok: false, error: "caseId_required" }, { status: 400 });
    }

    const theCase = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        title: true,
        isActive: true,
        cooldownSec: true,
        priceStars: true,
        items: {
          select: {
            id: true,
            title: true,
            rarity: true,
            weight: true,
          },
        },
      },
    });

    if (!theCase || !theCase.isActive) {
      return NextResponse.json({ ok: false, error: "case_not_found" }, { status: 404 });
    }

    if (!theCase.items.length) {
      return NextResponse.json({ ok: false, error: "case_has_no_items" }, { status: 400 });
    }

    // Cooldown applies only for real openings (not demo).
    if (!demo && (theCase.cooldownSec ?? 0) > 0) {
      const last = await prisma.opening.findFirst({
        where: { userId: user.id, caseId: theCase.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      if (last) {
        const cdMs = (theCase.cooldownSec ?? 0) * 1000;
        const nextAt = last.createdAt.getTime() + cdMs;
        const now = Date.now();
        if (now < nextAt) {
          return NextResponse.json(
            { ok: false, error: "COOLDOWN", retryAfterSec: Math.ceil((nextAt - now) / 1000) },
            { status: 429 }
          );
        }
      }
    }

    const unitPrice = demo ? 0 : (theCase.priceStars ?? 0);
    const totalPrice = demo ? 0 : unitPrice * qty;

    const out = await prisma.$transaction(async (tx) => {
      // Balance check + decrement for real openings
      let balanceBefore = user.balanceStars;

      if (!demo && totalPrice > 0) {
        const dbUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { balanceStars: true },
        });
        if (!dbUser) throw new Error("user_not_found");

        balanceBefore = dbUser.balanceStars;

        if (dbUser.balanceStars < totalPrice) {
          return {
            ok: false as const,
            error: "INSUFFICIENT_STARS",
            balanceStars: dbUser.balanceStars,
          };
        }

        await tx.user.update({
          where: { id: user.id },
          data: { balanceStars: { decrement: totalPrice } },
        });
      }

      // Generate results server-side
      const results = Array.from({ length: qty }).map(() => {
        const item = pickWeighted(theCase.items, (x) => x.weight);
        // IMPORTANT: Prisma CaseItem does not have imageUrl (we map images on the client by title).
        return { title: item.title, rarity: item.rarity };
      });

      if (demo) {
        // Demo mode: no DB writes (no openings, no inventory changes).
        return {
          ok: true as const,
          demo: true,
          spentStars: 0,
          balanceStars: balanceBefore,
          results,
        };
      }

      // Persist openings
      await tx.opening.createMany({
        data: results.map((r) => ({
          userId: user.id,
          caseId: theCase.id,
          resultTitle: r.title,
          rarity: r.rarity,
        })),
      });

      // Update inventory (group by title+rarity)
      const byKey = new Map<string, { title: string; rarity: any; qty: number }>();
      for (const r of results) {
        const key = `${r.title}::${r.rarity}`;
        const cur = byKey.get(key);
        if (cur) cur.qty += 1;
        else byKey.set(key, { title: r.title, rarity: r.rarity, qty: 1 });
      }

      for (const v of byKey.values()) {
        const existing = await tx.inventory.findFirst({
          where: { userId: user.id, title: v.title, rarity: v.rarity },
          select: { id: true },
        });

        if (existing) {
          await tx.inventory.update({
            where: { id: existing.id },
            data: { qty: { increment: v.qty } },
          });
        } else {
          await tx.inventory.create({
            data: {
              userId: user.id,
              title: v.title,
              rarity: v.rarity,
              qty: v.qty,
            },
          });
        }
      }

      const updated = await tx.user.findUnique({
        where: { id: user.id },
        select: { balanceStars: true },
      });

      return {
        ok: true as const,
        demo: false,
        spentStars: totalPrice,
        balanceStars: updated?.balanceStars ?? Math.max(0, balanceBefore - totalPrice),
        results,
      };
    });

    if (!out.ok) {
      return NextResponse.json(
        { ok: false, error: out.error, balanceStars: out.balanceStars },
        { status: 402 }
      );
    }

    return NextResponse.json({
      caseId: theCase.id,
      caseTitle: theCase.title,
      qty,
      unitPriceStars: theCase.priceStars ?? 0,
      ...out,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
