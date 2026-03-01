import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "sc_session";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is missing");
  return new TextEncoder().encode(secret);
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export async function signSessionToken(userId: string) {
  const secretKey = getSecretKey();
  return await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function requireUserId(req: NextRequest): Promise<string> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const session = await verifySessionToken(token);
  if (!session) throw new Error("UNAUTHORIZED");
  return session.userId;
}

export function getClientIp(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30d
  };
}
