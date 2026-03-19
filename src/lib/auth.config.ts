// src/lib/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      if (pathname === "/login" && isLoggedIn) {
        const callbackUrl = nextUrl.searchParams.get("callbackUrl") ?? "/profile";
        return Response.redirect(new URL(callbackUrl, nextUrl));
      }

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) {
          return Response.redirect(new URL(`/login?callbackUrl=${pathname}`, nextUrl));
        }
        const user = auth?.user as { isAdmin?: boolean } | undefined;
        if (!user?.isAdmin) {
          return Response.redirect(new URL("/?error=unauthorized", nextUrl));
        }
        return true;
      }

      const protectedPaths = ["/profile", "/feed", "/instruments", "/certificates"];
      if (protectedPaths.some((p) => pathname.startsWith(p))) {
        if (!isLoggedIn) {
          return Response.redirect(new URL(`/login?callbackUrl=${pathname}`, nextUrl));
        }
      }

      return true;
    },
  },
};