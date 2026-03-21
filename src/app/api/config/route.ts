// src/app/api/config/route.ts

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCssVariableBlock, DEFAULT_COLORS } from "@/lib/colorSystem";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  // Handle previewColors override for ColorEditor iframe preview
  const url = new URL(_request.url);
  const previewColors = url.searchParams.get("previewColors");
  let previewColorConfig: Record<string, string> | null = null;
  if (previewColors) {
    try {
      previewColorConfig = JSON.parse(Buffer.from(previewColors, "base64").toString("utf-8"));
    } catch {
      // ignore invalid preview colors
    }
  }

  // Handle admin=true for masked secrets (email tab)
  const isAdminRequest = url.searchParams.get("admin") === "true";
  if (isAdminRequest) {
    try {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const adminConfig = await prisma.clubConfig.findUnique({
        where: { id: "main" },
        select: {
          resendApiKey: true,
          resendFromEmail: true,
          resendFromName: true,
          welcomeEmailSubject: true,
          welcomeEmailBody: true,
        },
      });
      if (!adminConfig) {
        return NextResponse.json({ error: "Configuration not found." }, { status: 404 });
      }
      const aiFields = url.searchParams.get("fields") === "ai" ? await prisma.clubConfig.findUnique({
        where: { id: "main" },
        select: {
          aiEnabled: true,
          groqModel: true,
          groqTemperature: true,
          aiSystemPrompt: true,
          aiContextItems: true,
          aiChatHistory: true,
        },
      }) : null;
      if (url.searchParams.get("fields") === "ai") {
        return NextResponse.json({ data: aiFields }, { headers: { "Cache-Control": "no-store" } });
      }
      return NextResponse.json({
        resendApiKey: adminConfig.resendApiKey ? "masked" : "",
        resendFromEmail: adminConfig.resendFromEmail ?? "",
        resendFromName: adminConfig.resendFromName ?? "",
        welcomeEmailSubject: adminConfig.welcomeEmailSubject ?? "",
        welcomeEmailBody: adminConfig.welcomeEmailBody ?? "",
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("[GET /api/config?admin=true] Error:", error);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
  }
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        clubShortName: true,
        clubMotto: true,
        clubDescription: true,
        universityName: true,
        departmentName: true,
        foundedYear: true,
        address: true,
        email: true,
        phone: true,
        logoUrl: true,
        faviconUrl: true,
        fbUrl: true,
        ytUrl: true,
        igUrl: true,
        liUrl: true,
        ghUrl: true,
        twitterUrl: true,
        extraSocialLinks: true,
        metaDescription: true,
        seoKeywords: true,
        gscVerifyTag: true,
        ogImageUrl: true,
        regStatus: true,
        membershipFee: true,
        bkashNumber: true,
        nagadNumber: true,
        heroType: true,
        heroVideoUrl: true,
        heroFallbackImg: true,
        heroImages: true,
        heroCtaLabel1: true,
        heroCtaUrl1: true,
        heroCtaLabel2: true,
        heroCtaUrl2: true,
        overlayOpacity: true,
        colorConfig: true,
        displayFont: true,
        bodyFont: true,
        monoFont: true,
        headingFont: true,
        animationStyle: true,
        transitionStyle: true,
        particleEnabled: true,
        particleCount: true,
        particleSpeed: true,
        particleColor: true,
        announcementTickerSpeed: true,
        privacyPolicy: true,
        termsOfUse: true,
        footerCopyright: true,
        constitutionUrl: true,
        aiEnabled: true,
        aiChatHistory: true,
        fbPageId: true,
        fbAutoPost: true,
        fbAutoReplyComments: true,
        fbCommentSystemPrompt: true,
        fbCommentReplyDelay: true,
        fbAutoReplyMessages: true,
        fbMessageSystemPrompt: true,
        fbGreetingMessage: true,
        fbFallbackMessage: true,

      },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Configuration not found." },
        { status: 404 }
      );
    }

    const responseData = previewColorConfig
      ? { ...config, colorConfig: previewColorConfig }
      : config;

    return NextResponse.json(
      { data: responseData },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/config] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { tab, ...data } = body as { tab: string; [key: string]: unknown };

    if (!tab) {
      return NextResponse.json({ error: "Missing tab identifier" }, { status: 400 });
    }

    const allowedFields: Record<string, string[]> = {
      branding: ["clubName", "clubShortName", "clubMotto", "clubDescription", "universityName", "universityLogoUrl", "universityWebUrl", "departmentName", "foundedYear", "logoUrl", "faviconUrl"],
      ai: ["aiEnabled", "groqApiKey", "groqModel", "groqTemperature", "aiSystemPrompt", "aiContextItems", "aiChatHistory"],
      contact: ["email", "phone", "address", "fbUrl", "ytUrl", "igUrl", "liUrl", "ghUrl", "twitterUrl", "extraSocialLinks"],
      seo: ["metaDescription", "seoKeywords", "gscVerifyTag", "ogImageUrl"],
      membership: ["regStatus", "membershipFee", "bkashNumber", "nagadNumber", "bkashName", "nagadName", "autoApprove", "requireScreenshot"],
      design: ["colorConfig", "displayFont", "headingFont", "bodyFont", "monoFont", "animationStyle", "transitionStyle"],
      hero: ["heroType", "heroImages", "heroVideoUrl", "heroFallbackImg", "overlayOpacity", "heroCtaLabel1", "heroCtaUrl1", "heroCtaLabel2", "heroCtaUrl2", "particleEnabled", "particleCount", "particleSpeed", "particleColor"],
      navigation: ["footerCopyright", "constitutionUrl", "announcementTickerSpeed", "privacyPolicy", "termsOfUse"],
      email: ["resendApiKey", "resendFromEmail", "resendFromName", "welcomeEmailSubject", "welcomeEmailBody"],
      facebook: ["fbPageId", "fbPageToken", "fbWebhookToken", "fbUrl", "fbAutoPost", "fbRequireApproval", "fbAutoReplyComments", "fbCommentSystemPrompt", "fbCommentReplyPrompt", "fbCommentReplyDelay", "fbAutoReplyMessages", "fbMessageSystemPrompt", "fbMessageReplyPrompt", "fbGreetingMessage", "fbFallbackMessage"],
    };

    const allowed = allowedFields[tab];
    if (!allowed) {
      return NextResponse.json({ error: "Unknown config tab" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    for (const field of allowed) {
      if (field in data) {
        updateData[field] = data[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No fields to update" });
    }

    await prisma.clubConfig.update({
      where: { id: "main" },
      data: updateData,
    });

    // Bust the server-side colorInject module cache so next render picks up new colors
    try {
      const colorInjectModule = await import("@/lib/colorInject");
      if (typeof colorInjectModule.invalidateColorCache === "function") {
        colorInjectModule.invalidateColorCache();
      }
    } catch {
      // non-fatal
    }

    revalidatePath("/");
    revalidatePath("/members");
    revalidatePath("/events");
    revalidatePath("/projects");
    revalidatePath("/gallery");
    revalidatePath("/about");
    revalidatePath("/alumni");
    revalidatePath("/instruments");
    revalidatePath("/membership");

    return NextResponse.json({ message: "Configuration saved successfully." });
  } catch (error) {
    console.error("[POST /api/config] Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}