// src/app/api/admin/facebook-oauth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/admin/facebook?error=oauth_cancelled", req.url)
    );
  }

  const appId = process.env.FB_APP_ID ?? process.env.NEXT_PUBLIC_FB_APP_ID ?? "";
  const appSecret = process.env.FB_APP_SECRET ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`;
  const redirectUri = `${baseUrl}/api/admin/facebook-oauth`;

  try {
    // Exchange code for short-lived token
    const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json() as { access_token?: string; error?: { message?: string } };

    if (!tokenData.access_token) {
      console.error("[facebook-oauth] Token exchange failed:", tokenData.error);
      return NextResponse.redirect(
        new URL("/admin/facebook?error=token_exchange_failed", req.url)
      );
    }

    const userToken = tokenData.access_token;

    // Exchange for long-lived token
    const longLivedUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", userToken);

    const llRes = await fetch(longLivedUrl.toString());
    const llData = await llRes.json() as { access_token?: string; error?: { message?: string } };

    if (!llData.access_token) {
      console.error("[facebook-oauth] Long-lived token failed:", llData.error);
      return NextResponse.redirect(
        new URL("/admin/facebook?error=longtoken_failed", req.url)
      );
    }

    const longLivedToken = llData.access_token;

    // Get pages managed by this user
    const pagesUrl = new URL("https://graph.facebook.com/v19.0/me/accounts");
    pagesUrl.searchParams.set("access_token", longLivedToken);
    pagesUrl.searchParams.set("fields", "id,name,access_token");

    const pagesRes = await fetch(pagesUrl.toString());
    const pagesData = await pagesRes.json() as {
      data?: Array<{ id: string; name: string; access_token: string }>;
      error?: { message?: string };
    };

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(
        new URL("/admin/facebook?error=no_pages_found", req.url)
      );
    }

    const page = pagesData.data[0];

    // Save to ClubConfig
    await prisma.clubConfig.update({
      where: { id: "main" },
      data: {
        fbPageId: page.id,
        fbPageToken: page.access_token,
      },
    });

    return NextResponse.redirect(
      new URL("/admin/facebook?success=connected", req.url)
    );
  } catch (err) {
    console.error("[facebook-oauth] Error:", err);
    return NextResponse.redirect(
      new URL("/admin/facebook?error=server_error", req.url)
    );
  }
}