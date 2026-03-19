// src/middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth as { user?: { isAdmin?: boolean } } | null;
  const isLoggedIn = !!session?.user;
  const isAdmin = !!session?.user?.isAdmin;

  const isAdminPath = nextUrl.pathname.startsWith("/admin");
  const isProtectedPath =
    nextUrl.pathname.startsWith("/profile") ||
    nextUrl.pathname.startsWith("/feed") ||
    nextUrl.pathname.startsWith("/instruments") ||
    nextUrl.pathname.startsWith("/certificates");
  const isLoginPath = nextUrl.pathname === "/login";

  if (isLoginPath && isLoggedIn) {
    return NextResponse.redirect(new URL("/profile", nextUrl));
  }

  if (isAdminPath) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/?error=unauthorized", nextUrl));
    }
  }

  if (isProtectedPath && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
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