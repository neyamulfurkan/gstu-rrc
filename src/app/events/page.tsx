// src/app/events/page.tsx

import { Suspense } from "react";
import type { Metadata } from "next";
import { Calendar } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { generateBaseMetadata } from "@/lib/seo";
import { EventsGrid } from "@/components/events/index";
import type { EventCard, ClubConfigPublic, CustomCardSection } from "@/types/index";
import { CustomCardSections } from "@/components/home/CustomCardSections";

export const revalidate = 60;

type EventTab = "upcoming" | "ongoing" | "past";

interface EventsPageProps {
  searchParams: { tab?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveTab(raw: string | undefined): EventTab {
  if (raw === "ongoing" || raw === "past") return raw;
  return "upcoming";
}

function buildWhereClause(tab: EventTab): object {
  const now = new Date();

  switch (tab) {
    case "upcoming":
      return {
        isPublished: true,
        startDate: { gt: now },
      };
    case "ongoing":
      return {
        isPublished: true,
        startDate: { lte: now },
        endDate: { gte: now },
      };
    case "past":
      return {
        isPublished: true,
        OR: [
          { endDate: { lt: now } },
          { endDate: null, startDate: { lt: now } },
        ],
      };
    default:
      return { isPublished: true, startDate: { gt: now } };
  }
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchPageData(tab: EventTab): Promise<{
  events: EventCard[];
  categories: Array<{ id: string; name: string; color: string }>;
  config: ClubConfigPublic;
}> {
  const where = buildWhereClause(tab);
  const orderBy =
    tab === "past"
      ? { startDate: "desc" as const }
      : { startDate: "asc" as const };

  const [rawEvents, categories, rawConfig] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy,
      take: 20,
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        startDate: true,
        endDate: true,
        allDay: true,
        venue: true,
        description: true,
        isPublished: true,
        registrationEnabled: true,
        category: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    }),

    prisma.eventCategory.findMany({
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: { name: "asc" },
    }),

    prisma.clubConfig.findUnique({
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
    }),
  ]);

  const events: EventCard[] = rawEvents.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    coverUrl: e.coverUrl ?? "",
    category: {
      name: e.category?.name ?? "General",
      color: e.category?.color ?? "#7B8DB0",
    },
    startDate: e.startDate,
    endDate: e.endDate ?? null,
    allDay: e.allDay,
    venue: e.venue,
    description:
      typeof e.description === "string"
        ? e.description
        : e.description != null
        ? JSON.stringify(e.description)
        : "",
    isPublished: e.isPublished,
    registrationEnabled: e.registrationEnabled,
  }));

  const config: ClubConfigPublic = rawConfig
    ? {
        clubName: rawConfig.clubName,
        clubShortName: rawConfig.clubShortName,
        clubMotto: rawConfig.clubMotto,
        clubDescription: rawConfig.clubDescription,
        universityName: rawConfig.universityName,
        departmentName: rawConfig.departmentName,
        foundedYear: rawConfig.foundedYear,
        address: rawConfig.address,
        email: rawConfig.email,
        phone: rawConfig.phone,
        logoUrl: rawConfig.logoUrl ?? "",
        faviconUrl: rawConfig.faviconUrl ?? "",
        fbUrl: rawConfig.fbUrl ?? "",
        ytUrl: rawConfig.ytUrl ?? "",
        igUrl: rawConfig.igUrl ?? "",
        liUrl: rawConfig.liUrl ?? "",
        ghUrl: rawConfig.ghUrl ?? "",
        twitterUrl: rawConfig.twitterUrl ?? "",
        extraSocialLinks: Array.isArray(rawConfig.extraSocialLinks)
          ? (rawConfig.extraSocialLinks as Array<{ label: string; url: string }>)
          : [],
        metaDescription: rawConfig.metaDescription ?? "",
        seoKeywords: rawConfig.seoKeywords ?? "",
        gscVerifyTag: rawConfig.gscVerifyTag ?? "",
        ogImageUrl: rawConfig.ogImageUrl ?? "",
        regStatus: rawConfig.regStatus,
        membershipFee: rawConfig.membershipFee,
        bkashNumber: rawConfig.bkashNumber ?? "",
        nagadNumber: rawConfig.nagadNumber ?? "",
        heroType: rawConfig.heroType,
        heroVideoUrl: rawConfig.heroVideoUrl ?? "",
        heroFallbackImg: rawConfig.heroFallbackImg ?? "",
        heroImages: Array.isArray(rawConfig.heroImages)
          ? (rawConfig.heroImages as Array<{ url: string; order: number }>)
          : [],
        heroCtaLabel1: rawConfig.heroCtaLabel1 ?? "",
        heroCtaUrl1: rawConfig.heroCtaUrl1 ?? "",
        heroCtaLabel2: rawConfig.heroCtaLabel2 ?? "",
        heroCtaUrl2: rawConfig.heroCtaUrl2 ?? "",
        overlayOpacity: rawConfig.overlayOpacity,
        colorConfig: (rawConfig.colorConfig as Record<string, string>) ?? {},
        displayFont: rawConfig.displayFont,
        bodyFont: rawConfig.bodyFont,
        monoFont: rawConfig.monoFont,
        headingFont: rawConfig.headingFont,
        animationStyle: rawConfig.animationStyle,
        transitionStyle: rawConfig.transitionStyle,
        particleEnabled: rawConfig.particleEnabled,
        particleCount: rawConfig.particleCount,
        particleSpeed: rawConfig.particleSpeed,
        particleColor: rawConfig.particleColor ?? "",
        announcementTickerSpeed: rawConfig.announcementTickerSpeed,
        privacyPolicy: rawConfig.privacyPolicy ?? "",
        termsOfUse: rawConfig.termsOfUse ?? "",
        footerCopyright: rawConfig.footerCopyright ?? "",
        aiEnabled: rawConfig.aiEnabled,
        aiChatHistory: rawConfig.aiChatHistory,
        constitutionUrl: rawConfig.constitutionUrl ?? "",
      }
    : ({
        clubName: "GSTU Robotics & Research Club",
        clubShortName: "GSTU RRC",
        clubMotto: "",
        clubDescription: "",
        universityName: "Gopalganj Science and Technology University",
        departmentName: "",
        foundedYear: 2020,
        address: "",
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
        metaDescription: "Events by GSTU Robotics & Research Club",
        seoKeywords: "",
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
        heroCtaLabel1: "",
        heroCtaUrl1: "",
        heroCtaLabel2: "",
        heroCtaUrl2: "",
        overlayOpacity: 0.6,
        colorConfig: {},
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
        footerCopyright: "",
        aiEnabled: false,
        aiChatHistory: "session",
        constitutionUrl: "",
      } as ClubConfigPublic);

  return { events, categories, config };
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  try {
    const rawConfig = await prisma.clubConfig.findUnique({
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

    if (!rawConfig) {
      return { title: "Events" };
    }

    const config: ClubConfigPublic = {
      clubName: rawConfig.clubName,
      clubShortName: rawConfig.clubShortName,
      clubMotto: rawConfig.clubMotto,
      clubDescription: rawConfig.clubDescription,
      universityName: rawConfig.universityName,
      departmentName: rawConfig.departmentName,
      foundedYear: rawConfig.foundedYear,
      address: rawConfig.address,
      email: rawConfig.email,
      phone: rawConfig.phone,
      logoUrl: rawConfig.logoUrl ?? "",
      faviconUrl: rawConfig.faviconUrl ?? "",
      fbUrl: rawConfig.fbUrl ?? "",
      ytUrl: rawConfig.ytUrl ?? "",
      igUrl: rawConfig.igUrl ?? "",
      liUrl: rawConfig.liUrl ?? "",
      ghUrl: rawConfig.ghUrl ?? "",
      twitterUrl: rawConfig.twitterUrl ?? "",
      extraSocialLinks: Array.isArray(rawConfig.extraSocialLinks)
        ? (rawConfig.extraSocialLinks as Array<{ label: string; url: string }>)
        : [],
      metaDescription: rawConfig.metaDescription ?? "",
      seoKeywords: rawConfig.seoKeywords ?? "",
      gscVerifyTag: rawConfig.gscVerifyTag ?? "",
      ogImageUrl: rawConfig.ogImageUrl ?? "",
      regStatus: rawConfig.regStatus,
      membershipFee: rawConfig.membershipFee,
      bkashNumber: rawConfig.bkashNumber ?? "",
      nagadNumber: rawConfig.nagadNumber ?? "",
      heroType: rawConfig.heroType,
      heroVideoUrl: rawConfig.heroVideoUrl ?? "",
      heroFallbackImg: rawConfig.heroFallbackImg ?? "",
      heroImages: Array.isArray(rawConfig.heroImages)
        ? (rawConfig.heroImages as Array<{ url: string; order: number }>)
        : [],
      heroCtaLabel1: rawConfig.heroCtaLabel1 ?? "",
      heroCtaUrl1: rawConfig.heroCtaUrl1 ?? "",
      heroCtaLabel2: rawConfig.heroCtaLabel2 ?? "",
      heroCtaUrl2: rawConfig.heroCtaUrl2 ?? "",
      overlayOpacity: rawConfig.overlayOpacity,
      colorConfig: (rawConfig.colorConfig as Record<string, string>) ?? {},
      displayFont: rawConfig.displayFont,
      bodyFont: rawConfig.bodyFont,
      monoFont: rawConfig.monoFont,
      headingFont: rawConfig.headingFont,
      animationStyle: rawConfig.animationStyle,
      transitionStyle: rawConfig.transitionStyle,
      particleEnabled: rawConfig.particleEnabled,
      particleCount: rawConfig.particleCount,
      particleSpeed: rawConfig.particleSpeed,
      particleColor: rawConfig.particleColor ?? "",
      announcementTickerSpeed: rawConfig.announcementTickerSpeed,
      privacyPolicy: rawConfig.privacyPolicy ?? "",
      termsOfUse: rawConfig.termsOfUse ?? "",
      footerCopyright: rawConfig.footerCopyright ?? "",
      aiEnabled: rawConfig.aiEnabled,
      aiChatHistory: rawConfig.aiChatHistory,
      constitutionUrl: rawConfig.constitutionUrl ?? "",
    };

    const base = generateBaseMetadata(config);

    return {
      ...base,
      title: "Events",
      description: `Explore upcoming, ongoing, and past events hosted by ${config.clubName} at ${config.universityName}.`,
      openGraph: {
        ...base.openGraph,
        title: `Events | ${config.clubName}`,
        description: `Explore upcoming, ongoing, and past events hosted by ${config.clubName}.`,
        type: "website",
      },
      twitter: {
        ...base.twitter,
        title: `Events | ${config.clubName}`,
        description: `Explore upcoming, ongoing, and past events hosted by ${config.clubName}.`,
      },
    };
  } catch (err) {
    console.error("[EventsPage] generateMetadata error:", err);
    return { title: "Events" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventsPage({
  searchParams,
}: EventsPageProps): Promise<JSX.Element> {
  const initialTab = resolveTab(searchParams.tab);

  let events: EventCard[] = [];
  let categories: Array<{ id: string; name: string; color: string }> = [];
  let clubName = "GSTU Robotics & Research Club";
  let customCardSections: CustomCardSection[] = [];

  try {
    const [data, rawSections] = await Promise.all([
      fetchPageData(initialTab),
      prisma.customCardSection.findMany({
        where: { targetPage: "events", isPublished: true },
        select: {
          id: true, targetPage: true, heading: true, subtitle: true,
          position: true, isPublished: true, sortOrder: true,
          cards: {
            select: { id: true, heading: true, description: true, imageUrl: true, buttonLabel: true, buttonUrl: true, buttonStyle: true, sortOrder: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    events = data.events;
    categories = data.categories;
    clubName = data.config.clubName;
    customCardSections = rawSections as CustomCardSection[];
  } catch (err) {
    console.error("[EventsPage] data fetch error:", err);
    // Render with empty state — EventsGrid handles it gracefully
  }

  const tabLabels: Record<EventTab, string> = {
    upcoming: "Upcoming Events",
    ongoing: "Ongoing Events",
    past: "Past Events",
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)]">
      {/* ── Page Header ── */}
      <section className="relative pt-24 pb-10 px-4 md:px-6 lg:px-8 overflow-hidden">
        {/* Background glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, var(--color-gradient-hero-start, rgba(0,80,255,0.12)) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-4">
            <Calendar
              size={18}
              className="text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span
              className="text-xs font-semibold tracking-widest uppercase text-[var(--color-accent)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {clubName}
            </span>
          </div>

          {/* Heading */}
          <h1
            className="text-4xl md:text-5xl font-black tracking-tight text-[var(--color-text-primary)] mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {tabLabels[initialTab]}
          </h1>

          {/* Subheading */}
          <p className="text-base text-[var(--color-text-secondary)] max-w-xl">
            Workshops, competitions, seminars, and club gatherings — discover
            what&apos;s happening in the robotics and research community.
          </p>
        </div>
      </section>

      {/* ── Main Content ── */}
      {customCardSections.filter(s => s.position === "after_main").length > 0 && (
        <CustomCardSections sections={customCardSections.filter(s => s.position === "after_main")} />
      )}

      <section className="px-4 md:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden bg-[var(--color-bg-surface)] border border-[var(--color-border)] animate-pulse"
                    style={{ minHeight: 320 }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            }
          >
            <EventsGrid
              initialTab={initialTab}
              initialEvents={events}
              categories={categories}
            />
          </Suspense>
        </div>
      </section>

      {customCardSections.filter(s => s.position === "before_footer").length > 0 && (
        <CustomCardSections sections={customCardSections.filter(s => s.position === "before_footer")} />
      )}
    </main>
  );
}