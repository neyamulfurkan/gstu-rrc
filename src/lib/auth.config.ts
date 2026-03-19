// src/lib/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.isAdmin = (user as any).isAdmin ?? false;
        token.adminRole = (user as any).adminRole ?? null;
        token.permissions = (user as any).permissions ?? {};
        token.userId = (user as any).id ?? token.sub;
        token.username = (user as any).username ?? null;
        token.fullName = (user as any).fullName ?? null;
        token.avatarUrl = (user as any).avatarUrl ?? null;
        token.email = (user as any).email ?? token.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).isAdmin = token.isAdmin ?? false;
        (session.user as any).adminRole = token.adminRole ?? null;
        (session.user as any).permissions = token.permissions ?? {};
        (session.user as any).userId = token.userId ?? token.sub;
        (session.user as any).username = token.username ?? null;
        (session.user as any).fullName = token.fullName ?? null;
        (session.user as any).avatarUrl = token.avatarUrl ?? null;
        (session.user as any).email = token.email ?? null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = !!(auth?.user as any)?.isAdmin;
      const pathname = nextUrl.pathname;

      if (pathname === "/login" && isLoggedIn) {
        const callbackUrl =
          nextUrl.searchParams.get("callbackUrl") ?? "/profile";
        return Response.redirect(new URL(callbackUrl, nextUrl));
      }

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) {
          return Response.redirect(
            new URL(`/login?callbackUrl=${pathname}`, nextUrl)
          );
        }
        return true;
      }

      const protectedPaths = [
        "/profile",
        "/feed",
        "/instruments",
        "/certificates",
      ];
      if (protectedPaths.some((p) => pathname.startsWith(p))) {
        if (!isLoggedIn) {
          return Response.redirect(
            new URL(`/login?callbackUrl=${pathname}`, nextUrl)
          );
        }
      }

      return true;
    },
  },
};