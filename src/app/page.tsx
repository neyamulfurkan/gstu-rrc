// src/app/page.tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import {
  generateBaseMetadata,
  generateOrganizationJsonLd,
  generateBreadcrumbJsonLd,
} from "@/lib/seo";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsBar } from "@/components/home/StatsBar";
import {
  WhyJoinSection,
  AdvisorsSection,
  CTABanner,
  InstrumentTeaser,
  CertificationSpotlight,
} from "@/components/home/HomeSections";
import { AnnouncementSection } from "@/components/home/AnnouncementSection";
import { UpcomingEventsSection } from "@/components/home/UpcomingEventsSection";
import { RecentProjectsSection } from "@/components/home/RecentProjectsSection";
import { Timeline } from "@/components/ui/DataDisplay";
import Image from "next/image";
import Link from "next/link";
import type {
  ClubConfigPublic,
  AnnouncementCard,
  EventCard,
  ProjectCard,
  WhyJoinCard,
  AdvisorEntry,
  InstrumentCard,
  GalleryItemCard,
  Achievement,
  ClubMilestone,
  CommitteeMemberEntry,
} from "@/types/index";
import { cloudinaryUrl } from "@/lib/utils";

export const revalidate = 60;

// ─── generateMetadata ─────────────────────────────────────────────────────────

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
      return {
        title: "GSTU Robotics & Research Club",
        description: "Robotics and Research Club at Gopalganj Science and Technology University",
      };
    }

    const publicConfig = config as unknown as ClubConfigPublic;
    const base = generateBaseMetadata(publicConfig);
    const orgJsonLd = generateOrganizationJsonLd(publicConfig);
    const breadcrumbJsonLd = generateBreadcrumbJsonLd([
      { name: "Home", url: "/" },
    ]);

    return {
      ...base,
      other: {
        ...(base.other ?? {}),
        "application/ld+json": `${orgJsonLd}
${breadcrumbJsonLd}`,
      } as unknown as Record<string, string>,
    };
  } catch {
    return {
      title: "GSTU Robotics & Research Club",
      description: "Robotics and Research Club at Gopalganj Science and Technology University",
    };
  }
}

// ─── Gallery Teaser ───────────────────────────────────────────────────────────

interface GalleryTeaserProps {
  items: GalleryItemCard[];
}

function GalleryTeaser({ items }: GalleryTeaserProps): JSX.Element {
  if (items.length === 0) return <></>;

  return (
    <section
      aria-label="Photo gallery preview"
      className="py-20 px-6 bg-[var(--color-bg-base)]"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
              Moments
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
              Gallery
            </h2>
          </div>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] whitespace-nowrap flex-shrink-0"
          >
            View All
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2.5 7h9M9 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item, idx) => (
            <Link
              key={item.id}
              href="/gallery"
              className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--color-bg-surface)] border border-[var(--color-border)] hover:border-[var(--color-card-border-hover)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              aria-label={item.title ?? item.altText ?? `Gallery image ${idx + 1}`}
            >
              {item.type === "video" ? (
                <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-elevated)]">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="16" cy="16" r="14" stroke="var(--color-accent)" strokeWidth="1.5" />
                    <polygon points="13,11 13,21 22,16" fill="var(--color-accent)" />
                  </svg>
                </div>
              ) : (
                <Image
                  src={cloudinaryUrl(item.url, { width: 300, height: 300 })}
                  alt={item.altText ?? item.title ?? "Gallery image"}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-[var(--color-bg-overlay)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                {item.title && (
                  <p className="text-xs text-[var(--color-text-primary)] font-medium line-clamp-2 leading-tight">
                    {item.title}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Committee Spotlight ──────────────────────────────────────────────────────

interface CommitteeSpotlightProps {
  members: CommitteeMemberEntry[];
}

function CommitteeSpotlight({ members }: CommitteeSpotlightProps): JSX.Element {
  if (members.length === 0) return <></>;

  return (
    <section
      aria-label="Current executive committee"
      className="py-20 px-6 bg-[var(--color-bg-elevated)]"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
            Leadership
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Executive Committee
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {members.map((cm) => (
            <div
              key={cm.id}
              className="flex flex-col items-center text-center w-40"
            >
              {cm.member ? (
                <Link
                  href={`/members/${cm.member.username}`}
                  className="focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-full"
                  aria-label={`View profile of ${cm.memberName}`}
                >
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--color-primary)]/40 mb-3 hover:border-[var(--color-accent)] transition-colors duration-200">
                    {cm.member.avatarUrl ? (
                      <Image
                        src={cloudinaryUrl(cm.member.avatarUrl, { width: 80, height: 80 })}
                        alt={`Photo of ${cm.memberName}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-surface)] text-[var(--color-primary)] text-xl font-bold font-[var(--font-display)]">
                        {cm.memberName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>
              ) : (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--color-border)] mb-3">
                  <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] text-xl font-bold font-[var(--font-display)]">
                    {cm.memberName.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
              <p className="text-sm font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)] leading-tight mb-0.5">
                {cm.memberName}
              </p>
              <p className="text-xs text-[var(--color-accent)] font-[var(--font-mono)] leading-tight">
                {cm.designation}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/about"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            Full Committee
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2.5 7h9M9 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Achievements Section ─────────────────────────────────────────────────────

interface AchievementsSectionProps {
  achievements: Achievement[];
}

function AchievementsSection({ achievements }: AchievementsSectionProps): JSX.Element {
  if (achievements.length === 0) return <></>;

  const sorted = [...achievements].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section
      aria-label="Club achievements"
      className="py-20 px-6 bg-[var(--color-bg-surface)]"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
            Accomplishments
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Our Achievements
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((achievement) => (
            <div
              key={achievement.id}
              className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 hover:-translate-y-1 hover:border-[var(--color-card-border-hover)] hover:shadow-[0_0_16px_var(--color-glow-accent)] transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--color-accent-secondary)]/10 text-[var(--color-accent-secondary)] flex items-center justify-center text-lg">
                  {achievement.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] font-[var(--font-heading)] leading-tight">
                      {achievement.title}
                    </h3>
                    <span className="flex-shrink-0 text-xs font-mono text-[var(--color-text-secondary)]">
                      {achievement.year}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {achievement.description}
                  </p>
                  {achievement.link && (
                    <a
                      href={achievement.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                    >
                      Learn more
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M1.5 8.5l7-7M3.5 1.5h5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Milestones Section ───────────────────────────────────────────────────────

interface MilestonesSectionProps {
  milestones: ClubMilestone[];
}

function MilestonesSection({ milestones }: MilestonesSectionProps): JSX.Element {
  if (milestones.length === 0) return <></>;

  const sorted = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);

  const timelineItems = sorted.map((m) => ({
    date: m.date,
    title: m.title,
    description: m.description,
    imageUrl: m.imageUrl ?? undefined,
  }));

  return (
    <section
      aria-label="Club milestones"
      className="py-20 px-6 bg-[var(--color-bg-base)]"
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
            Journey
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Our Milestones
          </h2>
          <p className="mt-4 text-[var(--color-text-secondary)] text-base max-w-xl mx-auto">
            Key moments that shaped our club's history.
          </p>
        </div>
        <Timeline items={timelineItems} />
      </div>
    </section>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export default async function HomePage(): Promise<JSX.Element> {
  const now = new Date();

  // Parallel data fetching with error resilience
  type AnnouncementRow = { id: string; title: string; excerpt: string; expiresAt: Date | null; createdAt: Date; category: { name: string; color: string } };
  type EventRow = { id: string; slug: string; title: string; coverUrl: string; startDate: Date; endDate: Date | null; allDay: boolean; venue: string; description: unknown; isPublished: boolean; registrationEnabled: boolean; category: { name: string; color: string } };
  type ProjectRow = { id: string; slug: string; title: string; coverUrl: string; status: string; year: number; technologies: unknown; category: { name: string; color: string }; teamMembers: Array<{ id: string; username: string; fullName: string; avatarUrl: string; coverUrl: string; department: { name: string }; role: { name: string; color: string; category: string }; session: string; memberType: string; skills: unknown; socialLinks: unknown; bio: string | null; interests: string | null; createdAt: Date; workplace: string | null }> };
  type WhyJoinRow = { id: string; icon: string; heading: string; description: string; learnMoreUrl: string | null; sortOrder: number };
  type CommitteeRow = { id: string; memberId: string | null; memberName: string; designation: string; committeeType: string; sortOrder: number; member: { username: string; avatarUrl: string; fullName: string } | null };
  type MilestoneRow = { id: string; date: string; sortOrder: number; title: string; description: string; imageUrl: string | null };
  type GalleryRow = { id: string; url: string; type: string; title: string | null; altText: string; downloadEnabled: boolean; year: number; createdAt: Date; eventId: string | null; projectId: string | null; uploaderId: string | null; category: { name: string }; uploader: { username: string; fullName: string; avatarUrl: string } | null };
  type AdvisorRow = { id: string; name: string; designation: string; institution: string; photoUrl: string; bio: string; researchInterests: unknown; email: string | null; socialLinks: unknown; isCurrent: boolean; periodStart: number | null; periodEnd: number | null };
  type InstrumentRow = { id: string; name: string; description: string; imageUrl: string; status: string; returnDate: Date | null; category: { name: string }; borrower: { username: string; fullName: string; avatarUrl: string } | null };
  type AchievementRow = { id: string; icon: string; title: string; description: string; year: number; link: string | null; sortOrder: number };

  let config: Awaited<ReturnType<typeof prisma.clubConfig.findUnique>> | null = null;
  let memberCount = 0;
  let eventCount = 0;
  let projectCount = 0;
  let announcements: AnnouncementRow[] = [];
  let upcomingEvents: EventRow[] = [];
  let recentProjects: ProjectRow[] = [];
  let whyJoinCards: WhyJoinRow[] = [];
  let committeeSpotlight: CommitteeRow[] = [];
  let milestones: MilestoneRow[] = [];
  let galleryItems: GalleryRow[] = [];
  let advisors: AdvisorRow[] = [];
  let availableInstruments: InstrumentRow[] = [];
  let achievements: AchievementRow[] = [];

  try {
  const results = await Promise.all([
    // ClubConfig — all public fields
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

    // Stats
    prisma.member.count({ where: { status: "active" } }),
    prisma.event.count({ where: { isPublished: true } }),
    prisma.project.count({ where: { isPublished: true } }),

    // 3 latest active announcements
    prisma.announcement.findMany({
      where: {
        isPublished: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        excerpt: true,
        expiresAt: true,
        createdAt: true,
        category: { select: { name: true, color: true } },
      },
    }),

    // Next 5 upcoming events
    prisma.event.findMany({
      where: {
        isPublished: true,
        startDate: { gte: now },
      },
      orderBy: { startDate: "asc" },
      take: 5,
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
        category: { select: { name: true, color: true } },
      },
    }),

    // Latest 3 published projects
    prisma.project.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        status: true,
        year: true,
        technologies: true,
        category: { select: { name: true, color: true } },
        teamMembers: {
          take: 5,
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
        },
      },
    }),

    // Why-join cards
    prisma.whyJoinCard.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        icon: true,
        heading: true,
        description: true,
        learnMoreUrl: true,
        sortOrder: true,
      },
    }),

    // Current executive committee spotlights (top 3)
    prisma.committeeMember.findMany({
      where: {
        session: null,
        committeeType: "executive",
      },
      orderBy: { sortOrder: "asc" },
      take: 3,
      select: {
        id: true,
        memberId: true,
        memberName: true,
        designation: true,
        committeeType: true,
        sortOrder: true,
        member: {
          select: {
            username: true,
            avatarUrl: true,
            fullName: true,
          },
        },
      },
    }),

    // Club milestones
    prisma.clubMilestone.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        date: true,
        sortOrder: true,
        title: true,
        description: true,
        imageUrl: true,
      },
    }),

    // 8 latest approved gallery images
    prisma.galleryItem.findMany({
      where: { status: "approved" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        url: true,
        type: true,
        title: true,
        altText: true,
        downloadEnabled: true,
        year: true,
        createdAt: true,
        eventId: true,
        projectId: true,
        uploaderId: true,
        category: { select: { name: true } },
        uploader: {
          select: { username: true, fullName: true, avatarUrl: true },
        },
      },
    }),

    // Current advisors
    prisma.advisor.findMany({
      where: { isCurrent: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        designation: true,
        institution: true,
        photoUrl: true,
        bio: true,
        researchInterests: true,
        email: true,
        socialLinks: true,
        isCurrent: true,
        periodStart: true,
        periodEnd: true,
      },
    }),

    // 4 available instruments
    prisma.instrument.findMany({
      where: { status: "available" },
      take: 4,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        status: true,
        returnDate: true,
        category: { select: { name: true } },
        borrower: {
          select: { username: true, fullName: true, avatarUrl: true },
        },
      },
    }),

    // Achievements
    prisma.achievement.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        icon: true,
        title: true,
        description: true,
        year: true,
        link: true,
        sortOrder: true,
      },
    }),
  ]);

  config = results[0] as Awaited<ReturnType<typeof prisma.clubConfig.findUnique>>;
  memberCount = results[1] as number;
  eventCount = results[2] as number;
  projectCount = results[3] as number;
  announcements = results[4] as AnnouncementRow[];
  upcomingEvents = results[5] as EventRow[];
  recentProjects = results[6] as ProjectRow[];
  whyJoinCards = results[7] as WhyJoinRow[];
  committeeSpotlight = results[8] as CommitteeRow[];
  milestones = results[9] as MilestoneRow[];
  galleryItems = results[10] as GalleryRow[];
  advisors = results[11] as AdvisorRow[];
  availableInstruments = results[12] as InstrumentRow[];
  achievements = results[13] as AchievementRow[];
  } catch (error) {
    console.error("[HomePage] Failed to fetch data:", error);
    // Continue with empty/fallback data
  }

  // Fallback config
  const publicConfig = (config ?? {
    clubName: "GSTU Robotics & Research Club",
    clubShortName: "GSTU RRC",
    clubMotto: "Innovate. Build. Inspire.",
    clubDescription: "",
    universityName: "Gopalganj Science and Technology University",
    departmentName: "",
    foundedYear: 2020,
    address: "Gopalganj, Bangladesh",
    email: "contact@gstu.edu.bd",
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
    metaDescription: "Robotics and Research Club at Gopalganj Science and Technology University",
    seoKeywords: "robotics, research, GSTU",
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
    heroCtaLabel2: "Learn More",
    heroCtaUrl2: "/about",
    overlayOpacity: 60,
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
  }) as ClubConfigPublic;

  const stats = {
    members: memberCount,
    events: eventCount,
    projects: projectCount,
    foundedYear: publicConfig.foundedYear ?? 2020,
  };

  // Normalize data for components
  const announcementCards: AnnouncementCard[] = (announcements as typeof announcements).map((a) => ({
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    expiresAt: a.expiresAt,
    createdAt: a.createdAt,
    category: a.category as { name: string; color: string },
  }));

  const eventCards: EventCard[] = (upcomingEvents as typeof upcomingEvents).map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    coverUrl: e.coverUrl,
    startDate: e.startDate,
    endDate: e.endDate,
    allDay: e.allDay,
    venue: e.venue,
    description: typeof e.description === "string" ? e.description : "",
    isPublished: e.isPublished,
    registrationEnabled: e.registrationEnabled,
    category: e.category as { name: string; color: string },
  }));

  const projectCards: ProjectCard[] = (recentProjects as typeof recentProjects).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    coverUrl: p.coverUrl,
    status: p.status,
    year: p.year,
    technologies: p.technologies as string[],
    category: p.category as { name: string; color: string },
    teamMembers: (p.teamMembers as typeof p.teamMembers).map((m) => ({
      id: m.id,
      username: m.username,
      fullName: m.fullName,
      avatarUrl: m.avatarUrl,
      coverUrl: m.coverUrl,
      department: m.department as { name: string },
      role: m.role as { name: string; color: string; category: string },
      session: m.session,
      memberType: m.memberType,
      skills: m.skills as string[],
      socialLinks: (m.socialLinks ?? {}) as Record<string, string>,
      bio: m.bio,
      interests: m.interests,
      createdAt: m.createdAt,
      workplace: m.workplace,
    })),
  }));

  const whyJoin: WhyJoinCard[] = (whyJoinCards as typeof whyJoinCards).map((c) => ({
    id: c.id,
    icon: c.icon,
    heading: c.heading,
    description: c.description,
    learnMoreUrl: c.learnMoreUrl,
    sortOrder: c.sortOrder,
  }));

  const committeeEntries: CommitteeMemberEntry[] = (committeeSpotlight as typeof committeeSpotlight).map(
    (cm) => ({
      id: cm.id,
      memberId: cm.memberId,
      memberName: cm.memberName,
      designation: cm.designation,
      committeeType: cm.committeeType,
      sortOrder: cm.sortOrder,
      member: cm.member
        ? {
            username: cm.member.username,
            avatarUrl: cm.member.avatarUrl,
            fullName: cm.member.fullName,
          }
        : null,
    })
  );

  const milestoneItems: ClubMilestone[] = (milestones as typeof milestones).map((m) => ({
    id: m.id,
    date: m.date,
    sortOrder: m.sortOrder,
    title: m.title,
    description: m.description,
    imageUrl: m.imageUrl,
  }));

  const galleryCards: GalleryItemCard[] = (galleryItems as typeof galleryItems).map((g) => ({
    id: g.id,
    url: g.url,
    type: g.type,
    title: g.title,
    altText: g.altText ?? g.title ?? "Gallery image",
    downloadEnabled: g.downloadEnabled,
    year: g.year,
    createdAt: g.createdAt,
    eventId: g.eventId,
    projectId: g.projectId,
    uploaderId: g.uploaderId,
    category: g.category as { name: string },
    uploader: g.uploader ?? null,
  }));

  const advisorEntries: AdvisorEntry[] = (advisors as typeof advisors).map((a) => ({
    id: a.id,
    name: a.name,
    designation: a.designation,
    institution: a.institution,
    photoUrl: a.photoUrl,
    bio: a.bio,
    researchInterests: a.researchInterests as string[],
    email: a.email,
    socialLinks: (a.socialLinks ?? {}) as Record<string, string>,
    isCurrent: a.isCurrent,
    periodStart: a.periodStart,
    periodEnd: a.periodEnd,
  }));

  const instrumentCards: InstrumentCard[] = (availableInstruments as typeof availableInstruments).map(
    (inst) => ({
      id: inst.id,
      name: inst.name,
      description: inst.description,
      imageUrl: inst.imageUrl,
      status: inst.status,
      returnDate: inst.returnDate,
      category: inst.category as { name: string },
      borrower: inst.borrower ?? null,
    })
  );

  const achievementItems: Achievement[] = (achievements as typeof achievements).map((a) => ({
    id: a.id,
    icon: a.icon,
    title: a.title,
    description: a.description,
    year: a.year,
    link: a.link,
    sortOrder: a.sortOrder,
  }));

  return (
    <>
      {/* Hero */}
      <HeroSection config={publicConfig} />

      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Announcements ticker + cards */}
      {announcementCards.length > 0 && (
        <AnnouncementSection
          announcements={announcementCards}
          tickerSpeed={publicConfig.announcementTickerSpeed ?? 30}
        />
      )}

      {/* Upcoming Events */}
      {eventCards.length > 0 && (
        <UpcomingEventsSection events={eventCards} />
      )}

      {/* Recent Projects */}
      {projectCards.length > 0 && (
        <RecentProjectsSection projects={projectCards} />
      )}

      {/* Why Join */}
      <WhyJoinSection cards={whyJoin} />

      {/* Committee Spotlight */}
      <CommitteeSpotlight members={committeeEntries} />

      {/* Advisors */}
      {advisorEntries.length > 0 && (
        <AdvisorsSection advisors={advisorEntries} />
      )}

      {/* Achievements */}
      {achievementItems.length > 0 && (
        <AchievementsSection achievements={achievementItems} />
      )}

      {/* Club Milestones Timeline */}
      {milestoneItems.length > 0 && (
        <MilestonesSection milestones={milestoneItems} />
      )}

      {/* Gallery Teaser */}
      {galleryCards.length > 0 && (
        <GalleryTeaser items={galleryCards} />
      )}

      {/* Instrument Teaser */}
      {instrumentCards.length > 0 && (
        <InstrumentTeaser instruments={instrumentCards} />
      )}

      {/* Certification Spotlight */}
      <CertificationSpotlight config={publicConfig} />

      {/* CTA Banner */}
      <CTABanner config={publicConfig} />
    </>
  );
}