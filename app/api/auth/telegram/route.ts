import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyInitData } from "@/lib/telegram/verifyInitData";
import { cookieOptions, signSessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  initData: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "BOT_TOKEN is missing" }, { status: 500 });
    }

    const verified = verifyInitData(body.initData, botToken);
    const tgId = BigInt(verified.user.id);
    const username = verified.user.username ?? null;

    const user = await prisma.user.upsert({
      where: { tgId },
      update: { username },
      create: { tgId, username },
    });

    const token = await signSessionToken(user.id);

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        tgId: String(user.tgId),
        username: user.username,
        balanceCoin: user.balanceCoin,
      },
    });

    res.cookies.set("sc_session", token, cookieOptions());
    return res;
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Bad Request";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
