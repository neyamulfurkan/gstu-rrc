// src/app/members/page.tsx

import { Suspense } from "react";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { generateBaseMetadata } from "@/lib/seo";
import { MembersGrid } from "@/components/members/index";
import type { MemberPublic, ClubConfigPublic } from "@/types/index";

export const revalidate = 60;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const config = await prisma.clubConfig
    .findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        clubShortName: true,
        metaDescription: true,
        seoKeywords: true,
        gscVerifyTag: true,
        ogImageUrl: true,
        foundedYear: true,
        universityName: true,
        departmentName: true,
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
        clubMotto: true,
        clubDescription: true,
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
    })
    .catch(() => null);

  if (!config) {
    return {
      title: "Members",
      description: "Browse our club members.",
    };
  }

  const base = generateBaseMetadata(config as unknown as ClubConfigPublic);

  return {
    ...base,
    title: `Members | ${config.clubName}`,
    description: `Browse the members of ${config.clubName} at ${config.universityName}.`,
    openGraph: {
      ...(base.openGraph ?? {}),
      title: `Members | ${config.clubName}`,
      description: `Browse the members of ${config.clubName} at ${config.universityName}.`,
      url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/members`,
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/members`,
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MembersPage(): Promise<JSX.Element> {
  const PAGE_SIZE = 20;

  const [membersRaw, totalCount, roles, departments, sessionRows] =
    await Promise.all([
      prisma.member.findMany({
        where: { status: "active" },
        orderBy: { role: { sortOrder: "asc" } },
        take: PAGE_SIZE,
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

      prisma.member.count({ where: { status: "active" } }),

      prisma.role.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, color: true, category: true, sortOrder: true },
      }),

      prisma.department.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),

      prisma.member
        .findMany({
          where: { status: "active" },
          select: { session: true },
          distinct: ["session"],
          orderBy: { session: "desc" },
        })
        .then((rows) => rows.map((r) => r.session)),
    ]);

  const initialMembers = membersRaw as unknown as MemberPublic[];
  const initialCursor =
    membersRaw.length === PAGE_SIZE
      ? membersRaw[membersRaw.length - 1].id
      : undefined;

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)]">
      {/* ── Page Header ── */}
      <section className="pt-24 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            {/* Label */}
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] mb-2">
              Club Directory
            </p>
            {/* Title */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[var(--color-text-primary)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Our Members
            </h1>
            {/* Subtitle */}
            <p className="mt-3 text-base text-[var(--color-text-secondary)] max-w-xl">
              Meet the talented students, researchers, and alumni who make up
              the GSTU Robotics &amp; Research Club.
            </p>
          </div>

          {/* Total count badge */}
          <div className="flex-shrink-0">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                bg-[var(--color-bg-elevated)] border border-[var(--color-border-accent)]
                text-[var(--color-accent)]"
            >
              <span
                className="w-2 h-2 rounded-full bg-[var(--color-accent)] inline-block"
                aria-hidden="true"
              />
              {totalCount.toLocaleString()}{" "}
              {totalCount === 1 ? "Member" : "Members"}
            </span>
          </div>
        </div>

        {/* Decorative separator */}
        <div className="mt-8 h-px bg-gradient-to-r from-[var(--color-border-accent)] via-[var(--color-border)] to-transparent" />
      </section>

      {/* ── Members Grid ── */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] overflow-hidden animate-pulse"
                >
                  <div className="w-full h-48 bg-[var(--color-bg-elevated)]" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-[var(--color-bg-elevated)] rounded w-3/4" />
                    <div className="h-3 bg-[var(--color-bg-elevated)] rounded w-1/2" />
                    <div className="h-3 bg-[var(--color-bg-elevated)] rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <MembersGrid
            initialMembers={initialMembers}
            initialCursor={initialCursor ?? null}
            roles={roles}
            departments={departments}
            sessions={sessionRows}
          />
        </Suspense>
      </section>
    </main>
  );
}