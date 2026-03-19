// src/app/gallery/page.tsx

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBaseMetadata } from "@/lib/seo";
import { GalleryGrid } from "@/components/gallery/index";
import type { GalleryItemCard, ClubConfigPublic } from "@/types/index";

export const revalidate = 60;

async function getConfig(): Promise<ClubConfigPublic> {
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

  if (!config) {
    return {
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
      metaDescription: "GSTU Robotics & Research Club Gallery",
      seoKeywords: "",
      gscVerifyTag: "",
      ogImageUrl: "",
      regStatus: "open",
      membershipFee: 0,
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
      overlayOpacity: 0.7,
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
      announcementTickerSpeed: 30,
      privacyPolicy: "",
      termsOfUse: "",
      footerCopyright: "",
      aiEnabled: false,
      aiChatHistory: "session",
      constitutionUrl: "",
    } as ClubConfigPublic;
  }

  return config as unknown as ClubConfigPublic;
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  const base = generateBaseMetadata(config);

  return {
    ...base,
    title: `Gallery | ${config.clubName}`,
    description: `Browse photos and videos from ${config.clubName} events, projects, and activities.`,
    openGraph: {
      ...base.openGraph,
      title: `Gallery | ${config.clubName}`,
      description: `Browse photos and videos from ${config.clubName} events, projects, and activities.`,
      type: "website",
    },
  };
}

export default async function GalleryPage(): Promise<JSX.Element> {
  const session = await auth();

  const [initialItemsRaw, categories, eventNames, distinctYearsRaw] =
    await Promise.all([
      prisma.galleryItem.findMany({
        where: { status: "approved" },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          url: true,
          type: true,
          title: true,
          altText: true,
          category: { select: { name: true } },
          uploaderId: true,
          uploader: {
            select: { username: true, fullName: true, avatarUrl: true },
          },
          eventId: true,
          projectId: true,
          downloadEnabled: true,
          year: true,
          createdAt: true,
        },
      }),

      prisma.galleryCategory.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.event.findMany({
        where: { isPublished: true },
        select: { id: true, title: true },
        orderBy: { startDate: "desc" },
      }),

      prisma.galleryItem
        .findMany({
          where: { status: "approved" },
          select: { year: true },
          distinct: ["year"],
        })
        .then((rows) =>
          [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a)
        ),
    ]);

  const initialItems: GalleryItemCard[] = (initialItemsRaw as any[]).map((item) => ({
    id: item.id,
    url: item.url,
    type: item.type,
    title: item.title ?? null,
    altText: item.altText,
    category: { name: item.category?.name ?? "Uncategorized" },
    uploaderId: item.uploaderId ?? null,
    uploader: item.uploader
      ? {
          username: item.uploader.username,
          fullName: item.uploader.fullName,
          avatarUrl: item.uploader.avatarUrl,
        }
      : null,
    eventId: item.eventId ?? null,
    projectId: item.projectId ?? null,
    downloadEnabled: item.downloadEnabled,
    year: item.year,
    createdAt: item.createdAt,
  }));

  const filterOptions = {
    categories: (categories as Array<{ id: string; name: string }>).map((c) => ({ id: c.id, name: c.name })),
    eventNames: (eventNames as Array<{ id: string; title: string }>).map((e) => ({ id: e.id, name: e.title })),
    years: distinctYearsRaw as number[],
    currentMemberId: session?.user?.userId ?? undefined,
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)]">
      {/* Page Header */}
      <section className="pt-28 pb-10 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-mono tracking-[0.25em] uppercase text-[var(--color-accent)] mb-3">
            Visual Archive
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold text-[var(--color-text-primary)] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Gallery
          </h1>
          <p className="text-base text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed">
            Moments captured from events, projects, workshops, and club activities.
          </p>
        </div>
      </section>

      {/* Decorative accent line */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30 mb-8" />

      {/* Gallery Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 max-w-screen-xl mx-auto">
        <GalleryGrid
          initialItems={initialItems}
          initialFilter={{
            types: [],
            categories: [],
          }}
          filterOptions={filterOptions}
        />
      </section>
    </main>
  );
}