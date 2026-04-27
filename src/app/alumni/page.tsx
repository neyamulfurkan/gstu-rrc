// src/app/alumni/page.tsx

import { Suspense } from "react";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { generateBaseMetadata, generateBreadcrumbJsonLd } from "@/lib/seo";
import { AlumniGrid } from "@/components/alumni/index";
import { AlumniSpotlight } from "@/components/alumni/AlumniSpotlight";
import type {
  MemberPublic,
  AlumniSpotlightEntry,
  ClubConfigPublic,
} from "@/types/index";

export const revalidate = 60;

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
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

    if (!config) {
      return { title: "Alumni" };
    }

    const base = generateBaseMetadata(config as unknown as ClubConfigPublic);

    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    return {
      ...base,
      title: `Alumni | ${config.clubName}`,
      description: `Meet the distinguished alumni of ${config.clubName} at ${config.universityName}. Connect with graduates who are making an impact across industry and research.`,
      keywords: `alumni, ${config.clubName}, ${config.universityName}, graduates, robotics alumni, GSTU alumni, former members, student network`,
      alternates: {
        canonical: `${BASE_URL}/alumni`,
      },
      openGraph: {
        ...(base.openGraph ?? {}),
        title: `Alumni | ${config.clubName}`,
        description: `Meet the distinguished alumni of ${config.clubName} at ${config.universityName}.`,
        type: "website",
        url: `${BASE_URL}/alumni`,
      },
      twitter: {
        card: "summary_large_image",
        title: `Alumni | ${config.clubName}`,
        description: `Meet the distinguished alumni of ${config.clubName}.`,
      },
    };
  } catch (err) {
    console.error("[alumni/page] generateMetadata error:", err);
    return { title: "Alumni" };
  }
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function getAlumniPageData(): Promise<{
  initialAlumni: MemberPublic[];
  spotlights: AlumniSpotlightEntry[];
  sessions: string[];
  clubName: string;
  universityName: string;
}> {
  const [alumniRaw, spotlightsRaw, sessionGroups, configRaw] =
    await Promise.all([
      // First 20 active alumni members
      prisma.member.findMany({
        where: { memberType: "alumni", status: "active", role: { category: { not: "faculty" } } },
        orderBy: { session: "desc" },
        take: 20,
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
      }),

      // Alumni spotlights ordered by sortOrder
      prisma.alumniSpotlight.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          memberId: true,
          name: true,
          position: true,
          company: true,
          quote: true,
          photoUrl: true,
          session: true,
          sortOrder: true,
        },
      }),

      // Distinct sessions of active alumni
      prisma.member.findMany({
        where: { memberType: "alumni", status: "active", role: { category: { not: "faculty" } } },
        select: { session: true },
        distinct: ["session"],
        orderBy: { session: "desc" },
      }),

      // Club config for page header labels
      prisma.clubConfig.findUnique({
        where: { id: "main" },
        select: {
          clubName: true,
          universityName: true,
        },
      }),
    ]);

  const initialAlumni: MemberPublic[] = alumniRaw.map((m) => ({
    id: m.id,
    username: m.username,
    fullName: m.fullName,
    avatarUrl: m.avatarUrl,
    coverUrl: m.coverUrl,
    department: { name: m.department.name },
    role: {
      name: m.role.name,
      color: m.role.color,
      category: m.role.category,
    },
    session: m.session,
    memberType: m.memberType,
    skills: Array.isArray(m.skills) ? (m.skills as string[]) : [],
    socialLinks: (m.socialLinks as Record<string, string>) ?? {},
    bio: m.bio ?? null,
    interests: m.interests ?? null,
    createdAt: m.createdAt,
    workplace: m.workplace ?? null,
  }));

  const spotlights: AlumniSpotlightEntry[] = spotlightsRaw.map((s) => ({
    id: s.id,
    memberId: s.memberId ?? null,
    name: s.name,
    position: s.position,
    company: s.company,
    quote: s.quote,
    photoUrl: s.photoUrl,
    session: s.session,
    sortOrder: s.sortOrder,
  }));

  const sessions: string[] = sessionGroups
    .map((g) => g.session)
    .filter(Boolean);

  return {
    initialAlumni,
    spotlights,
    sessions,
    clubName: configRaw?.clubName ?? "GSTU Robotics & Research Club",
    universityName:
      configRaw?.universityName ?? "Gopalganj Science and Technology University",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AlumniPage(): Promise<JSX.Element> {
  let data: Awaited<ReturnType<typeof getAlumniPageData>>;

  try {
    data = await getAlumniPageData();
  } catch (err) {
    console.error("[alumni/page] data fetch error:", err);
    data = {
      initialAlumni: [],
      spotlights: [],
      sessions: [],
      clubName: "GSTU Robotics & Research Club",
      universityName: "Gopalganj Science and Technology University",
    };
  }

  const { initialAlumni, spotlights, sessions, clubName, universityName } =
    data;

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: `${BASE_URL}/` },
    { name: "Alumni", url: `${BASE_URL}/alumni` },
  ]);

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
    <main className="min-h-screen bg-[var(--color-bg-base)]">
      {/* ── Page Hero ── */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-[var(--color-bg-surface)]">
        {/* Decorative circuit-board background texture */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M10 10h60M10 40h20M50 40h20M40 10v20M40 50v20M10 70h60' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.5'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%23ffffff'/%3E%3Ccircle cx='70' cy='10' r='2' fill='%23ffffff'/%3E%3Ccircle cx='10' cy='70' r='2' fill='%23ffffff'/%3E%3Ccircle cx='70' cy='70' r='2' fill='%23ffffff'/%3E%3Ccircle cx='40' cy='40' r='3' fill='%23ffffff'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />

        {/* Gradient accent glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, var(--color-accent) 0%, transparent 70%)",
            opacity: 0.06,
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Label pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] mb-6">
            <span
              className="inline-block w-2 h-2 rounded-full bg-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span className="text-xs font-mono tracking-widest uppercase text-[var(--color-text-secondary)]">
              Alumni Network
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--color-text-primary)] leading-tight mb-4">
            Our{" "}
            <span className="text-[var(--color-accent)]">Alumni</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed">
            Graduates of{" "}
            <span className="text-[var(--color-text-primary)] font-medium">
              {clubName}
            </span>{" "}
            at{" "}
            <span className="text-[var(--color-text-primary)] font-medium">
              {universityName}
            </span>{" "}
            — shaping the future through technology, research, and leadership.
          </p>

          {/* Decorative separator */}
          <div
            aria-hidden="true"
            className="mt-8 flex justify-center gap-1"
          >
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-0.5 rounded-full bg-[var(--color-accent)]"
                style={{
                  width: i === 2 ? "2.5rem" : i === 1 || i === 3 ? "1.25rem" : "0.5rem",
                  opacity: i === 2 ? 1 : i === 1 || i === 3 ? 0.6 : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Alumni Spotlights ── */}
      {spotlights.length > 0 && (
        <section className="py-16 md:py-20 bg-[var(--color-bg-base)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <div className="mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <div
                  aria-hidden="true"
                  className="w-8 h-0.5 bg-[var(--color-accent)]"
                />
                <span className="text-xs font-mono tracking-widest uppercase text-[var(--color-accent)]">
                  Featured Alumni
                </span>
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                Alumni Spotlights
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-xl">
                Hear from some of our most accomplished graduates about their
                journeys and experiences.
              </p>
            </div>

            <Suspense
              fallback={
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[...Array(Math.min(spotlights.length, 3))].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] h-64 animate-pulse"
                    />
                  ))}
                </div>
              }
            >
              <AlumniSpotlight spotlights={spotlights} />
            </Suspense>
          </div>
        </section>
      )}

      {/* ── Divider ── */}
      {spotlights.length > 0 && (
        <div
          aria-hidden="true"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
        </div>
      )}

      {/* ── Alumni Directory Grid ── */}
      <section className="py-16 md:py-20 bg-[var(--color-bg-base)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <div
                aria-hidden="true"
                className="w-8 h-0.5 bg-[var(--color-accent)]"
              />
              <span className="text-xs font-mono tracking-widest uppercase text-[var(--color-accent)]">
                All Alumni
              </span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                  Alumni Directory
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-xl">
                  Browse and connect with graduates across all sessions. Use
                  filters to find alumni by session, department, or name.
                </p>
              </div>
              {initialAlumni.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                  <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                    {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] h-56 animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <AlumniGrid initialAlumni={initialAlumni} sessions={sessions} />
          </Suspense>
        </div>
      </section>
    </main>
    </>
  );
}