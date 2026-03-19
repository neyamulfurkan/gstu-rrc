// src/app/about/page.tsx

import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { prisma } from "@/lib/prisma";
import { generateBaseMetadata, generateBreadcrumbJsonLd } from "@/lib/seo";
import { Timeline, EmptyState } from "@/components/ui/DataDisplay";
import { AdvisorsSection, WhyJoinSection } from "@/components/home/HomeSections";
import { ExCommitteeAccordion } from "@/components/about/ExCommitteeAccordion";
import type {
  ClubConfigPublic,
  CommitteeMemberEntry,
  AdvisorEntry,
  ClubMilestone,
  Achievement,
} from "@/types/index";
import { cn, cloudinaryUrl } from "@/lib/utils";

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
      return { title: "About" };
    }

    const base = generateBaseMetadata(config as ClubConfigPublic);
    const breadcrumbJsonLd = generateBreadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "About", url: "/about" },
    ]);

    return {
      ...base,
      title: `About | ${config.clubName}`,
      description: config.metaDescription ?? undefined,
      other: {
        "application/ld+json": breadcrumbJsonLd,
      },
    };
  } catch (err) {
    console.error("[about/generateMetadata]", err);
    return { title: "About" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AboutPage(): Promise<JSX.Element> {
  let config: ClubConfigPublic | null = null;
  let milestones: ClubMilestone[] = [];
  let advisors: AdvisorEntry[] = [];
  let executiveCommittee: CommitteeMemberEntry[] = [];
  let subExecutiveCommittee: CommitteeMemberEntry[] = [];
  let exCommitteeRaw: Array<{
    id: string;
    memberName: string;
    designation: string;
    committeeType: string;
    session: string | null;
    sortOrder: number;
    memberId: string | null;
    member: { username: string; avatarUrl: string; fullName: string } | null;
  }> = [];
  let achievements: Achievement[] = [];
  let memberCount = 0;
  let eventCount = 0;
  let projectCount = 0;

  try {
    const [
      configRaw,
      milestonesRaw,
      advisorsRaw,
      committeeRaw,
      exCommittee,
      achievementsRaw,
      memberCountRaw,
      eventCountRaw,
      projectCountRaw,
    ] = await Promise.all([
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
      prisma.advisor.findMany({
        orderBy: [{ isCurrent: "desc" }, { sortOrder: "asc" }],
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
      prisma.committeeMember.findMany({
        where: { session: null },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          memberId: true,
          memberName: true,
          designation: true,
          committeeType: true,
          session: true,
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
      prisma.committeeMember.findMany({
        where: { session: { not: null } },
        orderBy: [{ session: "desc" }, { sortOrder: "asc" }],
        select: {
          id: true,
          memberId: true,
          memberName: true,
          designation: true,
          committeeType: true,
          session: true,
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
      prisma.member.count({ where: { status: "active" } }),
      prisma.event.count({ where: { isPublished: true } }),
      prisma.project.count({ where: { isPublished: true } }),
    ]);

    config = configRaw as ClubConfigPublic | null;
    milestones = milestonesRaw as ClubMilestone[];
    advisors = advisorsRaw.map((a) => ({
      ...a,
      researchInterests: Array.isArray(a.researchInterests)
        ? (a.researchInterests as string[])
        : [],
      socialLinks:
        typeof a.socialLinks === "object" && a.socialLinks !== null
          ? (a.socialLinks as Record<string, string>)
          : {},
    })) as AdvisorEntry[];

    executiveCommittee = committeeRaw
      .filter((c) => c.committeeType === "executive")
      .map((c) => ({
        id: c.id,
        memberId: c.memberId,
        memberName: c.memberName,
        designation: c.designation,
        committeeType: c.committeeType,
        sortOrder: c.sortOrder,
        member: c.member ?? null,
      }));

    subExecutiveCommittee = committeeRaw
      .filter((c) => c.committeeType === "sub_executive")
      .map((c) => ({
        id: c.id,
        memberId: c.memberId,
        memberName: c.memberName,
        designation: c.designation,
        committeeType: c.committeeType,
        sortOrder: c.sortOrder,
        member: c.member ?? null,
      }));

    exCommitteeRaw = exCommittee.map((c) => ({
      ...c,
      session: c.session ?? null,
    }));

    achievements = achievementsRaw as Achievement[];
    memberCount = memberCountRaw;
    eventCount = eventCountRaw;
    projectCount = projectCountRaw;
  } catch (err) {
    console.error("[about/AboutPage]", err);
  }

  if (!config) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">
          Unable to load page. Please try again later.
        </p>
      </main>
    );
  }

  // Group ex-committee by session
  const exCommitteeBySession: Record<
    string,
    typeof exCommitteeRaw
  > = {};
  for (const entry of exCommitteeRaw) {
    const key = entry.session ?? "Unknown Session";
    if (!exCommitteeBySession[key]) {
      exCommitteeBySession[key] = [];
    }
    exCommitteeBySession[key].push(entry);
  }
  const exCommitteeSessions = Object.keys(exCommitteeBySession).sort(
    (a, b) => b.localeCompare(a)
  );

  const timelineItems = milestones.map((m) => ({
    date: m.date,
    title: m.title,
    description: m.description,
    imageUrl: m.imageUrl ?? undefined,
  }));

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "About", url: "/about" },
  ]);

  const currentYear = new Date().getFullYear();
  const yearsActive = currentYear - config.foundedYear;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />

      <main className="min-h-screen bg-[var(--color-bg-base)]">
        {/* ── Hero Banner ─────────────────────────────────────────────────── */}
        <section
          aria-label="About hero"
          className={cn(
            "relative py-24 px-6 overflow-hidden",
            "bg-[var(--color-bg-surface)] border-b border-[var(--color-border)]"
          )}
        >
          {/* Background gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 50% 0%, var(--color-primary) 0%, transparent 60%)",
              opacity: 0.06,
            }}
          />

          {/* Circuit grid decoration */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            aria-hidden="true"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M10 10h40M10 30h40M10 50h40M10 10v40M30 10v40M50 10v40' stroke='rgba(255,255,255,1)' stroke-width='0.5'/%3E%3C/svg%3E")`,
              backgroundSize: "60px 60px",
            }}
          />

          <div className="max-w-5xl mx-auto relative z-10 text-center">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="mb-8 flex items-center justify-center gap-2 text-xs text-[var(--color-text-secondary)]"
            >
              <Link
                href="/"
                className="hover:text-[var(--color-accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
              >
                Home
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-[var(--color-text-primary)]">About</span>
            </nav>

            {/* Logo */}
            {config.logoUrl && (
              <div className="flex justify-center mb-6">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2">
                  <Image
                    src={cloudinaryUrl(config.logoUrl, { width: 80, height: 80 })}
                    alt={`${config.clubName} logo`}
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                  />
                </div>
              </div>
            )}

            {/* Founded year badge */}
            <div className="flex justify-center mb-4">
              <span
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold",
                  "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20",
                  "font-[var(--font-mono)] uppercase tracking-wider"
                )}
              >
                Est. {config.foundedYear} · {yearsActive} Years of Excellence
              </span>
            </div>

            {/* Club name */}
            <h1
              className={cn(
                "text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4",
                "text-[var(--color-text-primary)] font-[var(--font-display)]"
              )}
            >
              {config.clubName}
            </h1>

            {/* Motto */}
            {config.clubMotto && (
              <p className="text-lg md:text-xl text-[var(--color-accent)] font-medium italic mb-4 font-[var(--font-heading)]">
                &ldquo;{config.clubMotto}&rdquo;
              </p>
            )}

            {/* University */}
            <p className="text-sm text-[var(--color-text-secondary)] mb-8">
              {config.departmentName && `${config.departmentName} · `}
              {config.universityName}
            </p>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-10">
              {[
                { value: memberCount, label: "Members" },
                { value: eventCount, label: "Events" },
                { value: projectCount, label: "Projects" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] tabular-nums">
                    {value.toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-1 uppercase tracking-wider font-[var(--font-mono)]">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
              <Link
                href="/membership"
                className={cn(
                  "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg",
                  "bg-[var(--color-primary)] text-white font-semibold text-sm",
                  "hover:opacity-90 active:scale-95 transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
                )}
              >
                Join the Club
              </Link>
              {config.constitutionUrl && (
                <a
                  href={config.constitutionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg",
                    "border border-[var(--color-border)] text-[var(--color-text-secondary)] font-semibold text-sm",
                    "hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-all duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
                  )}
                >
                  Read Constitution
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M2 7h10M9.5 4.5L12 7l-2.5 2.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ── Mission & Vision ─────────────────────────────────────────────── */}
        {config.clubDescription && (
          <section
            aria-labelledby="mission-heading"
            className="py-20 px-6 bg-[var(--color-bg-base)]"
          >
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                <div>
                  <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
                    Who We Are
                  </span>
                  <h2
                    id="mission-heading"
                    className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] mb-4"
                  >
                    Our Mission & Vision
                  </h2>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed text-base">
                    {config.clubDescription}
                  </p>
                </div>

                {/* Contact card */}
                <div
                  className={cn(
                    "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6",
                    "space-y-4"
                  )}
                >
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)] font-[var(--font-heading)] uppercase tracking-wider mb-4">
                    Contact Information
                  </h3>

                  {config.email && (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <rect x="1" y="2.5" width="12" height="9" rx="1.5" stroke="var(--color-primary)" strokeWidth="1.2" />
                          <path d="M1 4l6 4 6-4" stroke="var(--color-primary)" strokeWidth="1.2" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">Email</p>
                        <a
                          href={`mailto:${config.email}`}
                          className="text-sm text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors break-all"
                        >
                          {config.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {config.phone && (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M2 2.5a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 .75l.5 2a1 1 0 0 1-.5 1.1L5 6a8.5 8.5 0 0 0 3 3l.65-.5a1 1 0 0 1 1.1-.5l2 .5a1 1 0 0 1 .75 1V11a1 1 0 0 1-1 1c-5.5 0-9.5-4-9.5-9.5z" stroke="var(--color-primary)" strokeWidth="1.2" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">Phone</p>
                        <a
                          href={`tel:${config.phone}`}
                          className="text-sm text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
                        >
                          {config.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {config.address && (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M7 1a4 4 0 0 1 4 4c0 3-4 8-4 8S3 8 3 5a4 4 0 0 1 4-4z" stroke="var(--color-primary)" strokeWidth="1.2" />
                          <circle cx="7" cy="5" r="1.2" fill="var(--color-primary)" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">Address</p>
                        <p className="text-sm text-[var(--color-text-primary)]">{config.address}</p>
                      </div>
                    </div>
                  )}

                  {/* Social links */}
                  <div className="pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-2">
                    {[
                      { url: config.fbUrl, label: "Facebook", icon: "F" },
                      { url: config.ytUrl, label: "YouTube", icon: "Y" },
                      { url: config.ghUrl, label: "GitHub", icon: "G" },
                      { url: config.liUrl, label: "LinkedIn", icon: "in" },
                    ]
                      .filter((s) => s.url)
                      .map((social) => (
                        <a
                          key={social.label}
                          href={social.url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social.label}
                          className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold",
                            "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                            "hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-all duration-150",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          )}
                        >
                          {social.icon}
                        </a>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Club Milestones ──────────────────────────────────────────────── */}
        {timelineItems.length > 0 && (
          <section
            aria-labelledby="milestones-heading"
            className="py-20 px-6 bg-[var(--color-bg-surface)]"
          >
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
                  Our Journey
                </span>
                <h2
                  id="milestones-heading"
                  className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]"
                >
                  Club Milestones
                </h2>
              </div>
              <Timeline items={timelineItems} />
            </div>
          </section>
        )}

        {/* ── Current Executive Committee ──────────────────────────────────── */}
        {(executiveCommittee.length > 0 || subExecutiveCommittee.length > 0) && (
          <section
            aria-labelledby="committee-heading"
            className="py-20 px-6 bg-[var(--color-bg-base)]"
          >
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
                  Leadership
                </span>
                <h2
                  id="committee-heading"
                  className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]"
                >
                  Current Committee
                </h2>
              </div>

              {/* Executive Committee */}
              {executiveCommittee.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] font-[var(--font-mono)] mb-6">
                    Executive Committee
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {executiveCommittee.map((entry) => (
                      <CommitteeMemberCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Executive Committee */}
              {subExecutiveCommittee.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] font-[var(--font-mono)] mb-6">
                    Sub-Executive Committee
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {subExecutiveCommittee.map((entry) => (
                      <CommitteeMemberCard key={entry.id} entry={entry} compact />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Ex-Committee Accordion ───────────────────────────────────────── */}
        {exCommitteeSessions.length > 0 && (
          <section
            aria-labelledby="ex-committee-heading"
            className="py-20 px-6 bg-[var(--color-bg-surface)]"
          >
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
                  Alumni Leadership
                </span>
                <h2
                  id="ex-committee-heading"
                  className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]"
                >
                  Ex-Committee
                </h2>
              </div>
              <ExCommitteeAccordion
                sessions={exCommitteeSessions}
                bySession={exCommitteeBySession}
              />
            </div>
          </section>
        )}

        {/* ── Advisors Section ─────────────────────────────────────────────── */}
        {advisors.length > 0 && <AdvisorsSection advisors={advisors} />}

        {/* ── Achievements ─────────────────────────────────────────────────── */}
        {achievements.length > 0 && (
          <section
            aria-labelledby="achievements-heading"
            className="py-20 px-6 bg-[var(--color-bg-base)]"
          >
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">
                  Recognition
                </span>
                <h2
                  id="achievements-heading"
                  className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]"
                >
                  Achievements
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.map((achievement) => (
                  <article
                    key={achievement.id}
                    className={cn(
                      "group relative rounded-xl border border-[var(--color-border)] p-6",
                      "bg-[var(--color-bg-surface)] transition-all duration-300",
                      "hover:-translate-y-1 hover:border-[var(--color-card-border-hover)]",
                      "hover:shadow-[0_0_16px_var(--color-glow-accent)]"
                    )}
                  >
                    {/* Year badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={cn(
                          "inline-flex items-center justify-center w-12 h-12 rounded-xl text-xl",
                          "bg-[var(--color-accent)]/10"
                        )}
                        aria-hidden="true"
                      >
                        {achievement.icon}
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                          "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20",
                          "font-[var(--font-mono)]"
                        )}
                      >
                        {achievement.year}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] font-[var(--font-heading)] mb-2">
                      {achievement.title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {achievement.description}
                    </p>

                    {achievement.link && (
                      <a
                        href={achievement.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "mt-4 inline-flex items-center gap-1.5 text-xs font-semibold",
                          "text-[var(--color-accent)] hover:underline",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                        )}
                      >
                        Learn more
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path d="M1.5 5h7M6 2.5l2.5 2.5L6 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Empty states ─────────────────────────────────────────────────── */}
        {milestones.length === 0 &&
          advisors.length === 0 &&
          achievements.length === 0 && (
            <section className="py-20 px-6">
              <div className="max-w-2xl mx-auto">
                <EmptyState
                  icon="Info"
                  heading="Content Coming Soon"
                  description="Club information and milestones will be available here soon."
                />
              </div>
            </section>
          )}
      </main>
    </>
  );
}

// ─── CommitteeMemberCard (Server Component helper) ────────────────────────────

interface CommitteeMemberCardProps {
  entry: CommitteeMemberEntry;
  compact?: boolean;
}

function CommitteeMemberCard({
  entry,
  compact = false,
}: CommitteeMemberCardProps): JSX.Element {
  const avatarUrl = entry.member?.avatarUrl
    ? cloudinaryUrl(entry.member.avatarUrl, { width: compact ? 40 : 56, height: compact ? 40 : 56 })
    : null;

  const displayName = entry.member?.fullName ?? entry.memberName;
  const profileHref = entry.member?.username
    ? `/members/${entry.member.username}`
    : null;

  const cardContent = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-[var(--color-border)]",
        "bg-[var(--color-bg-surface)] p-4 transition-all duration-200",
        profileHref && "hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-bg-elevated)]",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "relative flex-shrink-0 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-elevated)]",
          compact ? "w-10 h-10" : "w-14 h-14"
        )}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`Photo of ${displayName}`}
            fill
            sizes={compact ? "40px" : "56px"}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] font-bold font-[var(--font-display)]">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold text-[var(--color-text-primary)] truncate font-[var(--font-heading)]",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {displayName}
        </p>
        <p
          className={cn(
            "text-[var(--color-accent)] truncate mt-0.5",
            compact ? "text-xs" : "text-xs font-medium"
          )}
        >
          {entry.designation}
        </p>
      </div>
    </div>
  );

  if (profileHref) {
    return (
      <Link
        href={profileHref}
        className={cn(
          "block focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-xl"
        )}
        aria-label={`View profile of ${displayName}`}
      >
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

