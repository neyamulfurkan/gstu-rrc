// src/app/layout.tsx

import React from "react";
import type { Metadata } from "next";
import { Orbitron, Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";

import { prisma } from "@/lib/prisma";
import { DEFAULT_COLORS, buildCssVariableBlock } from "@/lib/colorSystem";
import { generateOrganizationJsonLd } from "@/lib/seo";
import type { ClubConfigPublic, AnnouncementCard } from "@/types/index";

import { NavBar } from "@/components/layout/NavBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { headers } from "next/headers";

import "./globals.css";

// ─── Dynamic client-only imports ─────────────────────────────────────────────

const CustomCursor = dynamic(
  () => import("@/components/layout/CustomCursor").then((m) => m.CustomCursor),
  { ssr: false }
);

const ScrollProgress = dynamic(
  () =>
    import("@/components/layout/ScrollProgress").then(
      (m) => m.ScrollProgress
    ),
  { ssr: false }
);

const AIAssistant = dynamic(
  () =>
    import("@/components/layout/AIAssistant").then((m) => m.AIAssistant),
  { ssr: false }
);

const PageTransition = dynamic(
  () =>
    import("@/components/layout/PageTransition").then(
      (m) => m.PageTransition
    ),
  { ssr: false }
);

// ─── Font loading ─────────────────────────────────────────────────────────────

const orbitron = Orbitron({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-loaded",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading-loaded",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body-loaded",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-loaded",
  weight: ["300", "400", "500", "600", "700"],
});

// ─── Fallback config ──────────────────────────────────────────────────────────

const FALLBACK_CONFIG: ClubConfigPublic = {
  clubName: "GSTU Robotics & Research Club",
  clubShortName: "GSTU RRC",
  clubMotto: "Innovate. Build. Inspire.",
  clubDescription: "",
  universityName: "Gopalganj Science and Technology University",
  universityLogoUrl: "",
  universityWebUrl: "",
  departmentName: "Computer Science & Engineering",
  foundedYear: 2020,
  address: "Gopalganj, Bangladesh",
  email: "",
  phone: "",
  logoUrl: "",
  faviconUrl: "",
  fbUrl: "",
  ytUrl: "",
  igUrl: "",
  liUrl: "",
  ghUrl: "",
  twitterUrl: "",
  extraSocialLinks: [],
  metaDescription: "GSTU Robotics & Research Club — Innovate. Build. Inspire.",
  seoKeywords: "robotics, research, GSTU, club",
  gscVerifyTag: "",
  ogImageUrl: "",
  regStatus: "open",
  membershipFee: 200,
  bkashNumber: "",
  nagadNumber: "",
  heroType: "particles",
  heroVideoUrl: "",
  heroFallbackImg: "",
  heroImages: [],
  heroCtaLabel1: "Join Us",
  heroCtaUrl1: "/membership",
  heroCtaLabel2: "Explore Projects",
  heroCtaUrl2: "/projects",
  overlayOpacity: 0.6,
  colorConfig: DEFAULT_COLORS as Record<string, string>,
  displayFont: "Orbitron",
  bodyFont: "DM Sans",
  monoFont: "JetBrains Mono",
  headingFont: "Syne",
  animationStyle: "standard",
  transitionStyle: "fade",
  particleEnabled: true,
  particleCount: 80,
  particleSpeed: 1,
  particleColor: "#00E5FF",
  announcementTickerSpeed: 40,
  privacyPolicy: "",
  termsOfUse: "",
  footerCopyright: "© {year} GSTU Robotics & Research Club. All rights reserved.",
  aiEnabled: false,
  aiChatHistory: "session",
  constitutionUrl: "",
};

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        metaDescription: true,
        seoKeywords: true,
        ogImageUrl: true,
        gscVerifyTag: true,
        faviconUrl: true,
      },
    });

    const clubName = config?.clubName ?? FALLBACK_CONFIG.clubName;
    const description = config?.metaDescription ?? FALLBACK_CONFIG.metaDescription;
    const keywords = config?.seoKeywords ?? FALLBACK_CONFIG.seoKeywords;
    const ogImage = config?.ogImageUrl ?? "";
    const gscTag = config?.gscVerifyTag ?? "";
    const faviconUrl = config?.faviconUrl ?? "";

    return {
      title: {
        default: clubName,
        template: `%s | ${clubName}`,
      },
      description,
      keywords,
      metadataBase: process.env.NEXT_PUBLIC_BASE_URL
        ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
        : undefined,
      openGraph: {
        siteName: clubName,
        locale: "en_BD",
        type: "website",
        images: ogImage
          ? [{ url: ogImage, width: 1200, height: 630, alt: clubName }]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        images: ogImage ? [ogImage] : [],
      },
      verification: gscTag ? { google: gscTag } : undefined,
      icons: faviconUrl
        ? { icon: faviconUrl, apple: faviconUrl }
        : undefined,
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
    };
  } catch {
    return {
      title: {
        default: FALLBACK_CONFIG.clubName,
        template: `%s | ${FALLBACK_CONFIG.clubName}`,
      },
      description: FALLBACK_CONFIG.metaDescription,
    };
  }
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const headersList = await headers();
  const xPathname = headersList.get("x-pathname") ?? "";
  const isAuthPage =
    xPathname === "/login" ||
    xPathname.startsWith("/login/");
  const searchParams: { previewColors?: string } = {};
  // ── 1. Fetch ClubConfig ───────────────────────────────────────────────────
  let config: ClubConfigPublic = FALLBACK_CONFIG;
  let announcements: AnnouncementCard[] = [];

  try {
    const [dbConfig, dbAnnouncements] = await Promise.all([
      prisma.clubConfig.findUnique({
        where: { id: "main" },
        select: {
          clubName: true,
          clubShortName: true,
          clubMotto: true,
          clubDescription: true,
          universityName: true,
          universityLogoUrl: true,
          universityWebUrl: true,
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
          aiEnabled: true,
          aiChatHistory: true,
          constitutionUrl: true,
        },
      }),
      prisma.announcement.findMany({
        where: {
          isPublished: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          excerpt: true,
          expiresAt: true,
          createdAt: true,
          category: {
            select: { name: true, color: true },
          },
        },
      }),
    ]);

    if (dbConfig) {
      config = {
        clubName: dbConfig.clubName ?? FALLBACK_CONFIG.clubName,
        clubShortName: dbConfig.clubShortName ?? FALLBACK_CONFIG.clubShortName,
        clubMotto: dbConfig.clubMotto ?? FALLBACK_CONFIG.clubMotto,
        clubDescription: dbConfig.clubDescription ?? FALLBACK_CONFIG.clubDescription,
        universityName: dbConfig.universityName ?? FALLBACK_CONFIG.universityName,
        universityLogoUrl: (dbConfig as any).universityLogoUrl ?? FALLBACK_CONFIG.universityLogoUrl,
        universityWebUrl: (dbConfig as any).universityWebUrl ?? FALLBACK_CONFIG.universityWebUrl,
        departmentName: dbConfig.departmentName ?? FALLBACK_CONFIG.departmentName,
        foundedYear: dbConfig.foundedYear ?? FALLBACK_CONFIG.foundedYear,
        address: dbConfig.address ?? FALLBACK_CONFIG.address,
        email: dbConfig.email ?? FALLBACK_CONFIG.email,
        phone: dbConfig.phone ?? FALLBACK_CONFIG.phone,
        logoUrl: dbConfig.logoUrl ?? FALLBACK_CONFIG.logoUrl,
        faviconUrl: dbConfig.faviconUrl ?? FALLBACK_CONFIG.faviconUrl,
        fbUrl: dbConfig.fbUrl ?? FALLBACK_CONFIG.fbUrl,
        ytUrl: dbConfig.ytUrl ?? FALLBACK_CONFIG.ytUrl,
        igUrl: dbConfig.igUrl ?? FALLBACK_CONFIG.igUrl,
        liUrl: dbConfig.liUrl ?? FALLBACK_CONFIG.liUrl,
        ghUrl: dbConfig.ghUrl ?? FALLBACK_CONFIG.ghUrl,
        twitterUrl: dbConfig.twitterUrl ?? FALLBACK_CONFIG.twitterUrl,
        extraSocialLinks: Array.isArray(dbConfig.extraSocialLinks)
          ? (dbConfig.extraSocialLinks as Array<{ label: string; url: string }>)
          : FALLBACK_CONFIG.extraSocialLinks,
        metaDescription: dbConfig.metaDescription ?? FALLBACK_CONFIG.metaDescription,
        seoKeywords: dbConfig.seoKeywords ?? FALLBACK_CONFIG.seoKeywords,
        gscVerifyTag: dbConfig.gscVerifyTag ?? FALLBACK_CONFIG.gscVerifyTag,
        ogImageUrl: dbConfig.ogImageUrl ?? FALLBACK_CONFIG.ogImageUrl,
        regStatus: dbConfig.regStatus ?? FALLBACK_CONFIG.regStatus,
        membershipFee: dbConfig.membershipFee ?? FALLBACK_CONFIG.membershipFee,
        bkashNumber: dbConfig.bkashNumber ?? FALLBACK_CONFIG.bkashNumber,
        nagadNumber: dbConfig.nagadNumber ?? FALLBACK_CONFIG.nagadNumber,
        heroType: dbConfig.heroType ?? FALLBACK_CONFIG.heroType,
        heroVideoUrl: dbConfig.heroVideoUrl ?? FALLBACK_CONFIG.heroVideoUrl,
        heroFallbackImg: dbConfig.heroFallbackImg ?? FALLBACK_CONFIG.heroFallbackImg,
        heroImages: Array.isArray(dbConfig.heroImages)
          ? (dbConfig.heroImages as Array<{ url: string; order: number }>)
          : FALLBACK_CONFIG.heroImages,
        heroCtaLabel1: dbConfig.heroCtaLabel1 ?? FALLBACK_CONFIG.heroCtaLabel1,
        heroCtaUrl1: dbConfig.heroCtaUrl1 ?? FALLBACK_CONFIG.heroCtaUrl1,
        heroCtaLabel2: dbConfig.heroCtaLabel2 ?? FALLBACK_CONFIG.heroCtaLabel2,
        heroCtaUrl2: dbConfig.heroCtaUrl2 ?? FALLBACK_CONFIG.heroCtaUrl2,
        overlayOpacity: dbConfig.overlayOpacity ?? FALLBACK_CONFIG.overlayOpacity,
        colorConfig:
          dbConfig.colorConfig && typeof dbConfig.colorConfig === "object"
            ? (dbConfig.colorConfig as Record<string, string>)
            : (DEFAULT_COLORS as Record<string, string>),
        displayFont: dbConfig.displayFont ?? FALLBACK_CONFIG.displayFont,
        bodyFont: dbConfig.bodyFont ?? FALLBACK_CONFIG.bodyFont,
        monoFont: dbConfig.monoFont ?? FALLBACK_CONFIG.monoFont,
        headingFont: dbConfig.headingFont ?? FALLBACK_CONFIG.headingFont,
        animationStyle: dbConfig.animationStyle ?? FALLBACK_CONFIG.animationStyle,
        transitionStyle: dbConfig.transitionStyle ?? FALLBACK_CONFIG.transitionStyle,
        particleEnabled: dbConfig.particleEnabled ?? FALLBACK_CONFIG.particleEnabled,
        particleCount: dbConfig.particleCount ?? FALLBACK_CONFIG.particleCount,
        particleSpeed: dbConfig.particleSpeed ?? FALLBACK_CONFIG.particleSpeed,
        particleColor: dbConfig.particleColor ?? FALLBACK_CONFIG.particleColor,
        announcementTickerSpeed:
          dbConfig.announcementTickerSpeed ?? FALLBACK_CONFIG.announcementTickerSpeed,
        privacyPolicy: dbConfig.privacyPolicy ?? FALLBACK_CONFIG.privacyPolicy,
        termsOfUse: dbConfig.termsOfUse ?? FALLBACK_CONFIG.termsOfUse,
        footerCopyright: dbConfig.footerCopyright ?? FALLBACK_CONFIG.footerCopyright,
        aiEnabled: dbConfig.aiEnabled ?? FALLBACK_CONFIG.aiEnabled,
        aiChatHistory: dbConfig.aiChatHistory ?? FALLBACK_CONFIG.aiChatHistory,
        constitutionUrl: dbConfig.constitutionUrl ?? FALLBACK_CONFIG.constitutionUrl,
      };
    }

    announcements = dbAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt ?? "",
      category: a.category
        ? { name: a.category.name, color: a.category.color ?? "#00E5FF" }
        : { name: "General", color: "#00E5FF" },
      expiresAt: a.expiresAt ?? null,
      createdAt: a.createdAt,
    }));
  } catch (error) {
    console.error("[RootLayout] Failed to fetch ClubConfig or announcements:", error);
    // config and announcements remain as fallback/empty
  }

  // ── 2. Handle preview color override ─────────────────────────────────────
  let activeColorConfig = config.colorConfig;

  if (searchParams?.previewColors) {
    try {
      const decoded = Buffer.from(searchParams.previewColors, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded) as Record<string, string>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        activeColorConfig = parsed;
      }
    } catch {
      // Invalid preview colors — silently ignore and use DB config
    }
  }

  // ── 3. Build CSS variable block ───────────────────────────────────────────
  let cssVariableBlock = "";
  try {
    // Try to use the cached colorInject approach
    const { getColorStyleBlock } = await import("@/lib/colorInject");

    if (searchParams?.previewColors) {
      // For preview mode, build directly without caching
      cssVariableBlock = buildCssVariableBlock(activeColorConfig, {
        display: config.displayFont || "Orbitron",
        heading: config.headingFont || "Syne",
        body: config.bodyFont || "DM Sans",
        mono: config.monoFont || "JetBrains Mono",
      });
    } else {
      cssVariableBlock = await getColorStyleBlock();
    }
  } catch {
    // Fallback: build directly
    cssVariableBlock = buildCssVariableBlock(activeColorConfig, {
      display: config.displayFont || "Orbitron",
      heading: config.headingFont || "Syne",
      body: config.bodyFont || "DM Sans",
      mono: config.monoFont || "JetBrains Mono",
    });
  }

  // ── 4. Organization JSON-LD ───────────────────────────────────────────────
  let orgJsonLd = "";
  try {
    orgJsonLd = generateOrganizationJsonLd(config);
  } catch {
    orgJsonLd = "";
  }

  // ── 5. Font class names ───────────────────────────────────────────────────
  const fontClassNames = [
    orbitron.variable,
    syne.variable,
    dmSans.variable,
    jetbrainsMono.variable,
  ].join(" ");

  // ── 6. AI assistant props ─────────────────────────────────────────────────
  const aiProps = {
    aiEnabled: config.aiEnabled,
    aiChatHistory: config.aiChatHistory,
    clubName: config.clubName,
    logoUrl: config.logoUrl,
  };

  return (
    <html lang="en" className={fontClassNames} suppressHydrationWarning style={{ overflowX: "hidden", maxWidth: "100%" }}>
      <head>
        {/* Color system — injected FIRST to prevent FOUC */}
        <style
          id="color-system"
          dangerouslySetInnerHTML={{ __html: cssVariableBlock }}
        />

        {/* Font variable bridge — maps next/font CSS vars to our design system vars */}
        <style
          id="font-bridge"
          dangerouslySetInnerHTML={{
            __html: `:root {
  --font-display: var(--font-display-loaded, 'Orbitron', sans-serif);
  --font-heading: var(--font-heading-loaded, 'Syne', sans-serif);
  --font-body: var(--font-body-loaded, 'DM Sans', sans-serif);
  --font-mono: var(--font-mono-loaded, 'JetBrains Mono', monospace);
}`,
          }}
        />

        {/* Organization JSON-LD */}
        {orgJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: orgJsonLd }}
          />
        )}

        {/* GSC verification if present */}
        {config.gscVerifyTag && (
          <meta name="google-site-verification" content={config.gscVerifyTag} />
        )}

        {/* Favicon */}
        {config.faviconUrl && (
          <>
            <link rel="icon" href={config.faviconUrl} />
            <link rel="apple-touch-icon" href={config.faviconUrl} />
          </>
        )}
      </head>
      <body
        data-transition-style={config.transitionStyle}
        style={{
          backgroundColor: "var(--color-bg-base)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-body)",
          overflowX: "hidden",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
        suppressHydrationWarning
      >
        <SessionProvider>
          {/* Scroll progress bar — client only */}
          <ScrollProgress />

          {/* Custom cursor — client only, hidden on touch devices */}
          <CustomCursor />

          {/* Desktop navigation */}
          {!isAuthPage && <NavBar config={config} />}

          {/* Mobile navigation */}
          {!isAuthPage && <MobileNav config={config} />}

          {/* Main content with page transitions */}
          <main id="main-content" style={{ overflowX: "hidden", width: "100%", minHeight: "100vh" }}>
            <PageTransition>
              {children}
            </PageTransition>
          </main>

          {/* Footer */}
          {!isAuthPage && <Footer config={config} announcements={announcements} />}

          {/* AI Assistant — client only, conditionally rendered based on aiEnabled */}
          {config.aiEnabled && (
            <AIAssistant config={aiProps} />
          )}
        </SessionProvider>
      </body>
    </html>
  );
}