// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname, searchParams } = req.nextUrl;

  if (pathname === "/login" && token) {
    const callbackUrl = searchParams.get("callbackUrl");
    const redirectTo = callbackUrl ?? "/profile";
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!token.isAdmin) {
      const homeUrl = new URL("/", req.url);
      homeUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  const protectedPaths = ["/profile", "/feed", "/instruments", "/certificates"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/profile/:path*",
    "/feed/:path*",
    "/instruments/:path*",
    "/certificates/:path*",
    "/login",
  ],
};