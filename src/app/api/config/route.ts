// src/app/api/config/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest): Promise<NextResponse> {
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
      },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Configuration not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: config },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
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