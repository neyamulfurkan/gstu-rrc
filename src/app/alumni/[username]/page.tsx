// src/app/alumni/[username]/page.tsx

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateMemberMetadata, generateBaseMetadata } from "@/lib/seo";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import type { MemberPublic, MemberPrivate, ClubConfigPublic } from "@/types/index";

export const revalidate = 60;

// ─── Static Params ────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ username: string }[]> {
  try {
    const alumni = await prisma.member.findMany({
      select: { username: true },
      where: { memberType: "alumni", status: "active" },
    });
    return alumni.map((a) => ({ username: a.username }));
  } catch (error) {
    console.error("[alumni/[username]] generateStaticParams error:", error);
    return [];
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  try {
    const [member, config] = await Promise.all([
      prisma.member.findFirst({
        where: { username: params.username, memberType: "alumni" },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          coverUrl: true,
          bio: true,
          interests: true,
          skills: true,
          socialLinks: true,
          workplace: true,
          memberType: true,
          session: true,
          createdAt: true,
          department: { select: { name: true } },
          role: { select: { name: true, color: true, category: true } },
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

    if (!member || !config) {
      return { title: "Alumni Not Found" };
    }

    const memberPublic: MemberPublic = {
      id: member.id,
      username: member.username,
      fullName: member.fullName,
      avatarUrl: member.avatarUrl,
      coverUrl: member.coverUrl,
      department: { name: member.department.name },
      role: {
        name: member.role.name,
        color: member.role.color,
        category: member.role.category,
      },
      session: member.session,
      memberType: member.memberType,
      skills: Array.isArray(member.skills) ? (member.skills as string[]) : [],
      socialLinks:
        typeof member.socialLinks === "object" && member.socialLinks !== null
          ? (member.socialLinks as Record<string, string>)
          : {},
      bio: member.bio ?? null,
      interests: member.interests ?? null,
      createdAt: member.createdAt,
      workplace: member.workplace ?? null,
    };

    const configPublic = config as unknown as ClubConfigPublic;

    return generateMemberMetadata(memberPublic, configPublic);
  } catch (error) {
    console.error("[alumni/[username]] generateMetadata error:", error);
    return { title: "Alumni Profile" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AlumniProfilePage({
  params,
}: {
  params: { username: string };
}): Promise<JSX.Element> {
  const session = await auth();
  const isOwner = session?.user?.username === params.username;
  const isAdmin = session?.user?.isAdmin === true;

  let member: MemberPublic | MemberPrivate | null = null;

  try {
    if (isOwner || isAdmin) {
      // Fetch full private data for owner or admin
      const raw = await prisma.member.findFirst({
        where: { username: params.username, memberType: "alumni" },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          coverUrl: true,
          bio: true,
          interests: true,
          skills: true,
          socialLinks: true,
          workplace: true,
          memberType: true,
          session: true,
          createdAt: true,
          status: true,
          email: true,
          phone: true,
          gender: true,
          dob: true,
          address: true,
          studentId: true,
          adminNotes: true,
          lastLogin: true,
          department: { select: { name: true } },
          role: { select: { name: true, color: true, category: true } },
        },
      });

      if (!raw || raw.memberType !== "alumni") {
        notFound();
      }

      if (raw.status !== "active" && !isAdmin) {
        notFound();
      }

      const privateData: MemberPrivate = {
        id: raw.id,
        username: raw.username,
        fullName: raw.fullName,
        avatarUrl: raw.avatarUrl,
        coverUrl: raw.coverUrl,
        department: { name: raw.department.name },
        role: {
          name: raw.role.name,
          color: raw.role.color,
          category: raw.role.category,
        },
        session: raw.session,
        memberType: raw.memberType,
        skills: Array.isArray(raw.skills) ? (raw.skills as string[]) : [],
        socialLinks:
          typeof raw.socialLinks === "object" && raw.socialLinks !== null
            ? (raw.socialLinks as Record<string, string>)
            : {},
        bio: raw.bio ?? null,
        interests: raw.interests ?? null,
        createdAt: raw.createdAt,
        workplace: raw.workplace ?? null,
        email: raw.email,
        phone: raw.phone,
        gender: raw.gender ?? null,
        dob: raw.dob ?? null,
        address: raw.address ?? null,
        studentId: raw.studentId,
        adminNotes: raw.adminNotes ?? null,
        lastLogin: raw.lastLogin ?? null,
      };

      member = privateData;
    } else {
      // Public data only
      const raw = await prisma.member.findFirst({
        where: {
          username: params.username,
          memberType: "alumni",
          status: "active",
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          coverUrl: true,
          bio: true,
          interests: true,
          skills: true,
          socialLinks: true,
          workplace: true,
          memberType: true,
          session: true,
          createdAt: true,
          department: { select: { name: true } },
          role: { select: { name: true, color: true, category: true } },
        },
      });

      if (!raw || raw.memberType !== "alumni") {
        notFound();
      }

      const publicData: MemberPublic = {
        id: raw.id,
        username: raw.username,
        fullName: raw.fullName,
        avatarUrl: raw.avatarUrl,
        coverUrl: raw.coverUrl,
        department: { name: raw.department.name },
        role: {
          name: raw.role.name,
          color: raw.role.color,
          category: raw.role.category,
        },
        session: raw.session,
        memberType: raw.memberType,
        skills: Array.isArray(raw.skills) ? (raw.skills as string[]) : [],
        socialLinks:
          typeof raw.socialLinks === "object" && raw.socialLinks !== null
            ? (raw.socialLinks as Record<string, string>)
            : {},
        bio: raw.bio ?? null,
        interests: raw.interests ?? null,
        createdAt: raw.createdAt,
        workplace: raw.workplace ?? null,
      };

      member = publicData;
    }
  } catch (error) {
    console.error("[alumni/[username]] page fetch error:", error);
    notFound();
  }

  if (!member) {
    notFound();
  }

  // Build a MemberPublic shape for ProfileTabs (it requires MemberPublic)
  const memberPublicForTabs: MemberPublic = {
    id: member.id,
    username: member.username,
    fullName: member.fullName,
    avatarUrl: member.avatarUrl,
    coverUrl: member.coverUrl,
    department: member.department,
    role: member.role,
    session: member.session,
    memberType: member.memberType,
    skills: member.skills,
    socialLinks: member.socialLinks,
    bio: member.bio,
    interests: member.interests,
    createdAt: member.createdAt,
    workplace: member.workplace,
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]"
        >
          <a
            href="/"
            className="hover:text-[var(--color-accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
          >
            Home
          </a>
          <span aria-hidden="true">/</span>
          <a
            href="/alumni"
            className="hover:text-[var(--color-accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
          >
            Alumni
          </a>
          <span aria-hidden="true">/</span>
          <span
            className="text-[var(--color-text-primary)] font-medium truncate max-w-[200px]"
            aria-current="page"
          >
            {member.fullName}
          </span>
        </nav>

        {/* Profile Header */}
        <div className="mb-6">
          <ProfileHeader
            member={member}
            isOwner={isOwner}
          />
        </div>

        {/* Profile Tabs */}
        <ProfileTabs
          member={memberPublicForTabs}
          isOwner={isOwner}
        />
      </div>
    </main>
  );
}