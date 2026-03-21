// src/app/projects/[slug]/page.tsx

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { generateProjectMetadata as genProjectMeta, generateBreadcrumbJsonLd } from "@/lib/seo";
import { ProjectDetail } from "@/components/projects/Detail";
import type { ProjectDetail as ProjectDetailType, ClubConfigPublic } from "@/types/index";

export const revalidate = 60;

// ─── Static Params ────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const projects = await prisma.project.findMany({
    where: { isPublished: true },
    select: { slug: true },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

  return projects.map((p) => ({ slug: p.slug }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchProjectBySlug(slug: string): Promise<ProjectDetailType | null> {
  const raw = await prisma.project.findFirst({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      coverUrl: true,
      status: true,
      year: true,
      technologies: true,
      isPublished: true,
      description: true,
      githubUrl: true,
      demoUrl: true,
      reportUrl: true,
      youtubeUrl: true,
      milestones: true,
      category: { select: { name: true, color: true } },
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
          uploader: {
            select: { username: true, fullName: true, avatarUrl: true },
          },
          eventId: true,
          projectId: true,
          downloadEnabled: true,
          year: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!raw) return null;

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    coverUrl: raw.coverUrl ?? "",
    category: raw.category ?? { name: "Uncategorized", color: "#7B8DB0" },
    status: raw.status,
    year: raw.year,
    technologies: raw.technologies as string[],
    isPublished: raw.isPublished,
    description: raw.description as ProjectDetailType["description"],
    githubUrl: raw.githubUrl ?? null,
    demoUrl: raw.demoUrl ?? null,
    reportUrl: raw.reportUrl ?? null,
    youtubeUrl: raw.youtubeUrl ?? null,
    milestones: Array.isArray(raw.milestones)
      ? (raw.milestones as Array<{ date: string; title: string; description: string }>)
      : [],
    teamMembers: raw.teamMembers.map((m) => ({
      id: m.id,
      username: m.username,
      fullName: m.fullName,
      avatarUrl: m.avatarUrl ?? "",
      coverUrl: m.coverUrl ?? "",
      department: m.department ?? { name: "Unknown" },
      role: m.role ?? { name: "Member", color: "#7B8DB0", category: "general" },
      session: m.session,
      memberType: m.memberType,
      skills: (m.skills as string[]) ?? [],
      socialLinks: (m.socialLinks as Record<string, string>) ?? {},
      bio: m.bio ?? null,
      interests: m.interests ?? null,
      createdAt: m.createdAt,
      workplace: m.workplace ?? null,
    })),
    galleryItems: raw.galleryItems.map((g) => ({
      id: g.id,
      url: g.url,
      type: g.type,
      title: g.title ?? null,
      altText: g.altText ?? g.title ?? "",
      category: g.category ?? { name: "General" },
      uploaderId: g.uploaderId ?? null,
      uploader: g.uploader ?? null,
      eventId: g.eventId ?? null,
      projectId: g.projectId ?? null,
      downloadEnabled: g.downloadEnabled,
      year: g.year,
      createdAt: g.createdAt,
    })),
  };
}

async function fetchPublicConfig(): Promise<Pick<
  ClubConfigPublic,
  | "clubName"
  | "clubShortName"
  | "metaDescription"
  | "seoKeywords"
  | "ogImageUrl"
  | "gscVerifyTag"
  | "universityName"
  | "fbUrl"
  | "ytUrl"
  | "igUrl"
  | "liUrl"
  | "ghUrl"
  | "twitterUrl"
  | "extraSocialLinks"
  | "foundedYear"
  | "logoUrl"
  | "faviconUrl"
  | "address"
  | "email"
  | "phone"
>> {
  const cfg = await prisma.clubConfig.findUnique({
    where: { id: "main" },
    select: {
      clubName: true,
      clubShortName: true,
      metaDescription: true,
      seoKeywords: true,
      ogImageUrl: true,
      gscVerifyTag: true,
      universityName: true,
      fbUrl: true,
      ytUrl: true,
      igUrl: true,
      liUrl: true,
      ghUrl: true,
      twitterUrl: true,
      extraSocialLinks: true,
      foundedYear: true,
      logoUrl: true,
      faviconUrl: true,
      address: true,
      email: true,
      phone: true,
    },
  });

  return {
    clubName: cfg?.clubName ?? "GSTU Robotics & Research Club",
    clubShortName: cfg?.clubShortName ?? "GSTU RRC",
    metaDescription: cfg?.metaDescription ?? "",
    seoKeywords: cfg?.seoKeywords ?? "",
    ogImageUrl: cfg?.ogImageUrl ?? "",
    gscVerifyTag: cfg?.gscVerifyTag ?? "",
    universityName: cfg?.universityName ?? "Gopalganj Science and Technology University",
    fbUrl: cfg?.fbUrl ?? "",
    ytUrl: cfg?.ytUrl ?? "",
    igUrl: cfg?.igUrl ?? "",
    liUrl: cfg?.liUrl ?? "",
    ghUrl: cfg?.ghUrl ?? "",
    twitterUrl: cfg?.twitterUrl ?? "",
    extraSocialLinks: (cfg?.extraSocialLinks as Array<{ label: string; url: string }>) ?? [],
    foundedYear: cfg?.foundedYear ?? 2020,
    logoUrl: cfg?.logoUrl ?? "",
    faviconUrl: cfg?.faviconUrl ?? "",
    address: cfg?.address ?? "",
    email: cfg?.email ?? "",
    phone: cfg?.phone ?? "",
  };
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const [project, config] = await Promise.all([
    fetchProjectBySlug(params.slug),
    fetchPublicConfig(),
  ]);

  if (!project || !project.isPublished) {
    return {
      title: "Project Not Found",
      description: "The requested project could not be found.",
    };
  }

  // Build a full ClubConfigPublic-compatible shape for generateProjectMetadata
  const fullConfig = {
    ...config,
    clubMotto: "",
    clubDescription: config.metaDescription,
    universityLogoUrl: "",
    universityWebUrl: "",
    departmentName: "",
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
    particleCount: 60,
    particleSpeed: 1,
    particleColor: "#00E5FF",
    announcementTickerSpeed: 40,
    privacyPolicy: "",
    termsOfUse: "",
    footerCopyright: "",
    aiEnabled: false,
    aiChatHistory: "session",
    constitutionUrl: "",
  } satisfies ClubConfigPublic;

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const meta = genProjectMeta(project, fullConfig);
  // Ensure og:image is always the project cover so Facebook scraper picks it up
  if (project.coverUrl) {
    return {
      ...meta,
      openGraph: {
        ...(typeof meta.openGraph === "object" && meta.openGraph !== null ? meta.openGraph : {}),
        images: [
          {
            url: project.coverUrl,
            width: 1200,
            height: 630,
            alt: project.title,
          },
        ],
        url: `${base}/projects/${project.slug}`,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: project.title,
        description: typeof meta.description === "string" ? meta.description : "",
        images: [project.coverUrl],
      },
    };
  }
  return meta;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProjectPage({
  params,
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const [project, config] = await Promise.all([
    fetchProjectBySlug(params.slug),
    fetchPublicConfig(),
  ]);

  if (!project || !project.isPublished) {
    notFound();
  }

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  const breadcrumbItems = [
    { name: "Home", url: `${BASE_URL}/` },
    { name: "Projects", url: `${BASE_URL}/projects` },
    { name: project.title, url: `${BASE_URL}/projects/${project.slug}` },
  ];

  const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />

      <div className="min-h-screen bg-[var(--color-bg-base)]">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2"
        >
          <ol
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] flex-wrap"
            role="list"
          >
            <li role="listitem">
              <Link
                href="/"
                className="flex items-center gap-1 hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded transition-colors duration-150"
                aria-label="Home"
              >
                <Home size={14} aria-hidden="true" />
                <span>Home</span>
              </Link>
            </li>
            <li role="listitem" aria-hidden="true">
              <ChevronRight size={14} className="text-[var(--color-text-secondary)]" />
            </li>
            <li role="listitem">
              <Link
                href="/projects"
                className="hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded transition-colors duration-150"
              >
                Projects
              </Link>
            </li>
            <li role="listitem" aria-hidden="true">
              <ChevronRight size={14} className="text-[var(--color-text-secondary)]" />
            </li>
            <li
              role="listitem"
              className="text-[var(--color-text-primary)] font-medium truncate max-w-[200px] sm:max-w-xs"
              aria-current="page"
            >
              {project.title}
            </li>
          </ol>
        </nav>

        {/* Project Detail */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ProjectDetail projectId={project.id} standalone />
        </main>
      </div>
    </>
  );
}