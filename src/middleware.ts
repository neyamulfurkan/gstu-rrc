// src/middleware.ts
export { auth as middleware } from "@/lib/auth";

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