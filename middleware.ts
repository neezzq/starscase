import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Если Telegram открыл /topup как стартовую страницу — уводим на главную.
  // Для осознанного перехода используй /topup?open=1
  if (pathname === "/topup" && searchParams.get("open") !== "1") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/topup"],
};
