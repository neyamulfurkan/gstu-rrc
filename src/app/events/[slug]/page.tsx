// src/app/events/[slug]/page.tsx

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  generateEventMetadata,
  generateBaseMetadata,
  generateBreadcrumbJsonLd,
} from "@/lib/seo";
import { EventDetail } from "@/components/events/Detail";
import type { EventDetail as EventDetailType, GalleryItemCard, MemberPublic } from "@/types/index";

export const revalidate = 60;

// ─── Static Params ────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const events = await prisma.event.findMany({
    where: { isPublished: true },
    select: { slug: true },
  });
  return events.map((e) => ({ slug: e.slug }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const [eventRow, configRow] = await Promise.all([
    prisma.event.findFirst({
      where: { slug: params.slug, isPublished: true },
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
        metaDescription: true,
        mapLink: true,
        organizerName: true,
        category: { select: { name: true, color: true } },
        galleryItems: {
          where: { status: "approved" },
          select: {
            id: true,
            url: true,
            type: true,
            title: true,
            altText: true,
            category: { select: { name: true } },
            uploaderId: true,
            uploader: { select: { username: true, fullName: true, avatarUrl: true } },
            eventId: true,
            projectId: true,
            downloadEnabled: true,
            year: true,
            createdAt: true,
          },
          take: 8,
        },
        attendees: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            coverUrl: true,
            department: { select: { name: true } },
            role: { select: { name: true, color: true, category: true } },
            session: true,
            memberType: true,
            skills: true,
            socialLinks: true,
            bio: true,
            interests: true,
            createdAt: true,
            workplace: true,
          },
          take: 20,
        },
      },
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

  if (!eventRow || !configRow) {
    return { title: "Event Not Found" };
  }

  const config = {
    ...configRow,
    universityLogoUrl: "",
    universityWebUrl: "",
    extraSocialLinks: Array.isArray(configRow.extraSocialLinks)
      ? (configRow.extraSocialLinks as Array<{ label: string; url: string }>)
      : [],
    heroImages: Array.isArray(configRow.heroImages)
      ? (configRow.heroImages as Array<{ url: string; order: number }>)
      : [],
    colorConfig: (configRow.colorConfig as Record<string, string>) ?? {},
  };

  const event: EventDetailType = {
    id: eventRow.id,
    slug: eventRow.slug,
    title: eventRow.title,
    coverUrl: eventRow.coverUrl ?? "",
    startDate: eventRow.startDate,
    endDate: eventRow.endDate ?? null,
    allDay: eventRow.allDay,
    venue: eventRow.venue,
    description: eventRow.description as EventDetailType["description"],
    isPublished: eventRow.isPublished,
    registrationEnabled: eventRow.registrationEnabled,
    metaDescription: eventRow.metaDescription ?? null,
    mapLink: eventRow.mapLink ?? null,
    organizerName: eventRow.organizerName ?? "",
    category: eventRow.category ?? { name: "", color: "" },
    galleryItems: (eventRow.galleryItems ?? []) as GalleryItemCard[],
    attendees: (eventRow.attendees ?? []) as MemberPublic[],
  };

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const meta = generateEventMetadata(event, config);
  // Ensure og:image is always the event cover so Facebook scraper picks it up
  if (eventRow.coverUrl) {
    return {
      ...meta,
      openGraph: {
        ...(typeof meta.openGraph === "object" && meta.openGraph !== null ? meta.openGraph : {}),
        images: [
          {
            url: eventRow.coverUrl,
            width: 1200,
            height: 630,
            alt: eventRow.title,
          },
        ],
        url: `${base}/events/${eventRow.slug}`,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: eventRow.title,
        description: eventRow.metaDescription ?? "",
        images: [eventRow.coverUrl],
      },
    };
  }
  return meta;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function EventPage({
  params,
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const eventRow = await prisma.event.findFirst({
    where: { slug: params.slug, isPublished: true },
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
      metaDescription: true,
      mapLink: true,
      organizerName: true,
      category: { select: { name: true, color: true } },
      galleryItems: {
        where: { status: "approved" },
        select: {
          id: true,
          url: true,
          type: true,
          title: true,
          altText: true,
          category: { select: { name: true } },
          uploaderId: true,
          uploader: { select: { username: true, fullName: true, avatarUrl: true } },
          eventId: true,
          projectId: true,
          downloadEnabled: true,
          year: true,
          createdAt: true,
        },
        take: 20,
      },
      attendees: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          coverUrl: true,
          department: { select: { name: true } },
          role: { select: { name: true, color: true, category: true } },
          session: true,
          memberType: true,
          skills: true,
          socialLinks: true,
          bio: true,
          interests: true,
          createdAt: true,
          workplace: true,
        },
        take: 50,
      },
    },
  });

  if (!eventRow) {
    notFound();
  }

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Events", url: "/events" },
    { name: eventRow.title, url: `/events/${eventRow.slug}` },
  ]);

  return (
    <>
      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />

      <main className="min-h-screen bg-[var(--color-bg-base)]">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-2"
        >
          <ol className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] flex-wrap">
            <li>
              <Link
                href="/"
                className="flex items-center gap-1 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded transition-colors duration-150"
                aria-label="Home"
              >
                <Home size={14} aria-hidden="true" />
                <span className="sr-only">Home</span>
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={14} className="text-[var(--color-border)]" />
            </li>
            <li>
              <Link
                href="/events"
                className="hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded transition-colors duration-150"
              >
                Events
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={14} className="text-[var(--color-border)]" />
            </li>
            <li
              className="text-[var(--color-text-primary)] font-medium truncate max-w-[200px] sm:max-w-xs"
              aria-current="page"
            >
              {eventRow.title}
            </li>
          </ol>
        </nav>

        {/* Event Detail */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 pb-16">
          <EventDetail
            eventId={eventRow.id}
            standalone={true}
          />
        </div>
      </main>
    </>
  );
}