import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /app/* and /settings/* routes
  if (pathname.startsWith("/app") || pathname.startsWith("/settings")) {
    const sessionCookie = getSessionCookie(request);

    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/auth?tab=login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/settings/:path*"],
};
