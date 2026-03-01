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
      orderBy: [{ isFree: "desc" }, { priceCoin: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        priceCoin: true,
        isFree: true,
        cooldownSec: true,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, cases });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "UNAUTHORIZED";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
