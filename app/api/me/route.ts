import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tgId: true,
        username: true,
        photoUrl: true,
        balanceStars: true,
        createdAt: true,
        openings: {
          take: 20,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            caseId: true,
            resultTitle: true,
            rarity: true,
            createdAt: true,
            case: { select: { title: true } },
          },
        },
        inventory: {
          take: 50,
          orderBy: { qty: "desc" },
          select: { id: true, title: true, rarity: true, qty: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        tgId: String(user.tgId),
        username: user.username,
        photoUrl: user.photoUrl,
        balanceStars: user.balanceStars,
        createdAt: user.createdAt,
      },
      openings: user.openings.map((o) => ({
        id: o.id,
        caseId: o.caseId,
        caseTitle: o.case.title,
        resultTitle: o.resultTitle,
        rarity: o.rarity,
        createdAt: o.createdAt,
      })),
      inventory: user.inventory,
    });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "UNAUTHORIZED";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
