// src/app/projects/page.tsx

import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { generateBaseMetadata } from "@/lib/seo";
import { ProjectsGrid } from "@/components/projects/index";
import type { ProjectCard, ClubConfigPublic } from "@/types/index";

export const revalidate = 60;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
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
    return { title: "Projects" };
  }

  const publicConfig = config as unknown as ClubConfigPublic;
  const base = generateBaseMetadata(publicConfig);

  return {
    ...base,
    title: "Projects",
    description: `Explore research projects, innovations, and engineering work by ${config.clubName} members at ${config.universityName}.`,
    openGraph: {
      ...base.openGraph,
      title: `Projects | ${config.clubName}`,
      description: `Explore research projects, innovations, and engineering work by ${config.clubName} members at ${config.universityName}.`,
      url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/projects`,
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/projects`,
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProjectsPage(): Promise<JSX.Element> {
  // Parallel data fetching
  const [projectsResult, categories] = await Promise.all([
    prisma.project.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        status: true,
        year: true,
        technologies: true,
        category: {
          select: {
            name: true,
            color: true,
          },
        },
        teamMembers: {
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
    prisma.projectCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
      },
    }),
  ]);

  // Map Prisma results to ProjectCard shape
  const initialProjects: ProjectCard[] = projectsResult.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    coverUrl: p.coverUrl ?? "",
    category: {
      name: p.category.name,
      color: p.category.color,
    },
    status: p.status,
    year: p.year,
    technologies: p.technologies as string[],
    teamMembers: p.teamMembers.map((m) => ({
      id: m.id,
      username: m.username,
      fullName: m.fullName,
      avatarUrl: m.avatarUrl ?? "",
      coverUrl: m.coverUrl ?? "",
      department: { name: m.department.name },
      role: {
        name: m.role.name,
        color: m.role.color,
        category: m.role.category,
      },
      session: m.session,
      memberType: m.memberType,
      skills: m.skills as string[],
      socialLinks: (m.socialLinks ?? {}) as Record<string, string>,
      bio: m.bio ?? null,
      interests: m.interests ?? null,
      createdAt: m.createdAt,
      workplace: m.workplace ?? null,
    })),
  }));

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)]">
      {/* ── Page Header ── */}
      <section className="pt-28 pb-10 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto">
        <div className="mb-2">
          <span className="inline-block text-xs font-mono tracking-widest uppercase text-[var(--color-accent)] mb-3">
            Our Work
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-[var(--color-text-primary)] leading-none mb-3">
              Projects & Research
            </h1>
            <p className="text-[var(--color-text-secondary)] text-base max-w-xl leading-relaxed">
              Innovations, research, and engineering solutions built by club
              members — from robotics to software systems.
            </p>
          </div>

          {/* Project count badge */}
          {initialProjects.length > 0 && (
            <div className="flex-shrink-0">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
                  text-[var(--color-text-secondary)]"
              >
                <span
                  className="w-2 h-2 rounded-full bg-[var(--color-accent)]"
                  aria-hidden="true"
                />
                {initialProjects.length}
                {initialProjects.length === 20 ? "+" : ""} projects & research
              </span>
            </div>
          )}
        </div>

        {/* Decorative accent line */}
        <div
          className="mt-8 h-px w-full"
          style={{
            background:
              "linear-gradient(to right, var(--color-accent), transparent)",
          }}
          aria-hidden="true"
        />
      </section>

      {/* ── Projects Grid ── */}
      <section className="px-6 md:px-12 lg:px-20 pb-24 max-w-7xl mx-auto">
        <ProjectsGrid
          initialProjects={initialProjects}
          categories={categories}
        />
      </section>
    </main>
  );
}