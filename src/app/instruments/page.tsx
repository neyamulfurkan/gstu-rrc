// src/app/instruments/page.tsx

import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateBaseMetadata } from "@/lib/seo";
import { InstrumentsPage } from "@/components/instruments/index";
import type { ClubConfigPublic, InstrumentCard } from "@/types/index";

export const revalidate = 60;

async function getClubConfig(): Promise<ClubConfigPublic | null> {
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
        aiEnabled: true,
        aiChatHistory: true,
        constitutionUrl: true,
      },
    });

    if (!config) return null;

    return {
      ...config,
      extraSocialLinks: Array.isArray(config.extraSocialLinks)
        ? (config.extraSocialLinks as Array<{ label: string; url: string }>)
        : [],
      heroImages: Array.isArray(config.heroImages)
        ? (config.heroImages as Array<{ url: string; order: number }>)
        : [],
      colorConfig:
        config.colorConfig &&
        typeof config.colorConfig === "object" &&
        !Array.isArray(config.colorConfig)
          ? (config.colorConfig as Record<string, string>)
          : {},
    } as ClubConfigPublic;
  } catch (error) {
    console.error("[InstrumentsPage] getClubConfig error:", error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getClubConfig();

  if (!config) {
    return {
      title: "Instruments",
      description: "Browse and borrow instruments from the club.",
    };
  }

  const base = generateBaseMetadata(config);

  return {
    ...base,
    title: `Instruments | ${config.clubName}`,
    description: `Browse and request to borrow instruments and equipment from ${config.clubName}. Check availability and submit borrow requests online.`,
    openGraph: {
      ...(base.openGraph ?? {}),
      title: `Instruments | ${config.clubName}`,
      description: `Browse and request to borrow instruments and equipment from ${config.clubName}.`,
      url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/instruments`,
    },
  };
}

export default async function InstrumentsPageRoute(): Promise<JSX.Element> {
  const session = await auth();

  // Fetch instruments and categories in parallel
  const [rawInstruments, rawCategories] = await Promise.all([
    prisma.instrument.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        status: true,
        returnDate: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        borrower: {
          select: {
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.instrumentCategory.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const instruments: InstrumentCard[] = rawInstruments.map((inst) => ({
    id: inst.id,
    name: inst.name,
    category: { name: inst.category.name },
    description: inst.description,
    imageUrl: inst.imageUrl,
    status: inst.status,
    borrower:
      inst.status === "on_loan" && inst.borrower
        ? {
            username: inst.borrower.username,
            fullName: inst.borrower.fullName,
            avatarUrl: inst.borrower.avatarUrl,
          }
        : null,
    returnDate: inst.returnDate ?? null,
  }));

  const categories = rawCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
  }));

  const currentMemberId = session?.user?.userId ?? null;

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)]">
      {/* Page Header */}
      <section className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--color-accent)] mb-2">
                Equipment Library
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[var(--color-text-primary)] leading-tight">
                Instruments
              </h1>
              <p className="mt-3 text-[var(--color-text-secondary)] max-w-xl text-sm sm:text-base">
                Browse available equipment and scientific instruments. Members
                can request to borrow items for research, projects, or events.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-success)]" />
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {instruments.filter((i) => i.status === "available").length}{" "}
                  Available
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-warning)]" />
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {instruments.filter((i) => i.status === "on_loan").length} On
                  Loan
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instruments Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <InstrumentsPage
          initialInstruments={instruments}
          categories={categories}
          currentMemberId={currentMemberId ?? undefined}
        />
      </section>
    </main>
  );
}