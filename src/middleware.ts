// src/middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);
export default auth;

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