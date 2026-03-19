// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export default auth(function middleware(req) {
  const session = req.auth;
  const { pathname, searchParams } = req.nextUrl;

  // If user is on /login and already authenticated, redirect to /profile
  if (pathname === "/login" && session) {
    const callbackUrl = searchParams.get("callbackUrl");
    const redirectTo = callbackUrl ?? "/profile";
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const isAdmin =
      session.user?.isAdmin === true;

    if (!isAdmin) {
      const homeUrl = new URL("/", req.url);
      homeUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  }

  // Protected member routes
  const protectedPaths = ["/profile", "/feed", "/instruments", "/certificates"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

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