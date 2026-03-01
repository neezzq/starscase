import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";

export type SessionUser = {
  id: string;
  tgId: string;
  username: string | null;
  photoUrl: string | null;
  balanceStars: number;
};

/**
 * Returns the authenticated user for this request based on the signed session cookie.
 * If there is no valid session, returns null.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const cookieName = getSessionCookieName();
  const token = req.cookies.get(cookieName)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      tgId: true,
      username: true,
      photoUrl: true,
      balanceStars: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    tgId: String(user.tgId),
    username: user.username,
    photoUrl: user.photoUrl,
    balanceStars: user.balanceStars,
  };
}
