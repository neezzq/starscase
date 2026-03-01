import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireUserId(req);

    const cases = await prisma.case.findMany({
      where: { isActive: true },
      orderBy: [{ isFree: "desc" }, { priceStars: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        imageUrl: true,
        priceStars: true,
        isFree: true,
        cooldownSec: true,
        isActive: true,
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      cases: cases.map((c) => ({
        id: c.id,
        title: c.title,
        imageUrl: c.imageUrl,
        priceStars: c.priceStars,
        isFree: c.isFree,
        cooldownSec: c.cooldownSec,
        isActive: c.isActive,
        itemCount: c._count.items,
      })),
    });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "UNAUTHORIZED";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
