// src/app/members/[username]/page.tsx

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateMemberMetadata, generateBaseMetadata, generateBreadcrumbJsonLd } from "@/lib/seo";
import { MemberDetail } from "@/components/members/Detail";
import type { MemberPublic, MemberPrivate, ClubConfigPublic } from "@/types/index";

export const revalidate = 60;

interface PageProps {
  params: { username: string };
}

// ─── Static Params ────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ username: string }[]> {
  try {
    const members = await prisma.member.findMany({
      select: { username: true },
      where: { status: "active" },
      take: 200,
    });
    return members.map((m) => ({ username: m.username }));
  } catch (error) {
    console.error("[generateStaticParams] Failed to fetch member usernames:", error);
    return [];
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const [member, config] = await Promise.all([
      prisma.member.findFirst({
        where: {
          username: params.username,
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
          session: true,
          memberType: true,
          workplace: true,
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
      return { title: "Member Not Found" };
    }

    const memberPublic: MemberPublic = {
      id: member.id,
      username: member.username,
      fullName: member.fullName,
      avatarUrl: member.avatarUrl ?? "",
      coverUrl: member.coverUrl ?? "",
      department: { name: member.department?.name ?? "" },
      role: {
        name: member.role?.name ?? "Member",
        color: member.role?.color ?? "#7B8DB0",
        category: member.role?.category ?? "general",
      },
      session: member.session ?? "",
      memberType: member.memberType ?? "member",
      skills: Array.isArray(member.skills) ? (member.skills as string[]) : [],
      socialLinks:
        typeof member.socialLinks === "object" && member.socialLinks !== null
          ? (member.socialLinks as Record<string, string>)
          : {},
      bio: typeof member.bio === "string" ? member.bio : null,
      interests: typeof member.interests === "string" ? member.interests : null,
      createdAt: member.createdAt,
      workplace: typeof member.workplace === "string" ? member.workplace : null,
    };

    const configPublic = config as unknown as ClubConfigPublic;

    return generateMemberMetadata(memberPublic, configPublic);
  } catch (error) {
    console.error("[generateMetadata] Failed:", error);
    return { title: "Member Profile" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MemberProfilePage({ params }: PageProps): Promise<JSX.Element> {
  const session = await auth();

  const isAdminViewer = session?.user?.isAdmin === true;
  const isOwner = session?.user?.username === params.username;

  // Fetch member data
  let memberData: MemberPublic | MemberPrivate | null = null;

  try {
    if (isOwner || isAdminViewer) {
      // Fetch private data for owner or admin
      const raw = await prisma.member.findFirst({
        where: { username: params.username },
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
          session: true,
          memberType: true,
          workplace: true,
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

      if (!raw) {
        notFound();
      }

      // Non-admin non-owner can't see inactive members
      if (!isAdminViewer && raw.status !== "active") {
        notFound();
      }

      memberData = {
        id: raw.id,
        username: raw.username,
        fullName: raw.fullName,
        avatarUrl: raw.avatarUrl ?? "",
        coverUrl: raw.coverUrl ?? "",
        department: { name: raw.department?.name ?? "" },
        role: {
          name: raw.role?.name ?? "Member",
          color: raw.role?.color ?? "#7B8DB0",
          category: raw.role?.category ?? "general",
        },
        session: raw.session ?? "",
        memberType: raw.memberType ?? "member",
        skills: Array.isArray(raw.skills) ? (raw.skills as string[]) : [],
        socialLinks:
          typeof raw.socialLinks === "object" && raw.socialLinks !== null
            ? (raw.socialLinks as Record<string, string>)
            : {},
        bio: typeof raw.bio === "string" ? raw.bio : null,
        interests: typeof raw.interests === "string" ? raw.interests : null,
        createdAt: raw.createdAt,
        workplace: typeof raw.workplace === "string" ? raw.workplace : null,
        // Private fields
        email: raw.email,
        phone: raw.phone ?? "",
        gender: raw.gender ?? null,
        dob: raw.dob ?? null,
        address: raw.address ?? null,
        studentId: raw.studentId,
        adminNotes: raw.adminNotes ?? null,
        lastLogin: raw.lastLogin ?? null,
      } as MemberPrivate;
    } else {
      // Public fetch — active members only
      const raw = await prisma.member.findFirst({
        where: {
          username: params.username,
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
          session: true,
          memberType: true,
          workplace: true,
          createdAt: true,
          department: { select: { name: true } },
          role: { select: { name: true, color: true, category: true } },
        },
      });

      if (!raw) {
        notFound();
      }

      memberData = {
        id: raw.id,
        username: raw.username,
        fullName: raw.fullName,
        avatarUrl: raw.avatarUrl ?? "",
        coverUrl: raw.coverUrl ?? "",
        department: { name: raw.department?.name ?? "" },
        role: {
          name: raw.role?.name ?? "Member",
          color: raw.role?.color ?? "#7B8DB0",
          category: raw.role?.category ?? "general",
        },
        session: raw.session ?? "",
        memberType: raw.memberType ?? "member",
        skills: Array.isArray(raw.skills) ? (raw.skills as string[]) : [],
        socialLinks:
          typeof raw.socialLinks === "object" && raw.socialLinks !== null
            ? (raw.socialLinks as Record<string, string>)
            : {},
        bio: typeof raw.bio === "string" ? raw.bio : null,
        interests: typeof raw.interests === "string" ? raw.interests : null,
        createdAt: raw.createdAt,
        workplace: typeof raw.workplace === "string" ? raw.workplace : null,
      } as MemberPublic;
    }
  } catch (error) {
    console.error("[MemberProfilePage] Failed to fetch member:", error);
    notFound();
  }

  if (!memberData) {
    notFound();
  }

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: `${BASE_URL}/` },
    { name: "Members", url: `${BASE_URL}/members` },
    { name: memberData.fullName, url: `${BASE_URL}/members/${memberData.username}` },
  ]);

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
    <main className="min-h-screen bg-[var(--color-bg-base)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <MemberDetail
          member={memberData}
          isOwner={isOwner}
        />
      </div>
    </main>
    </>
  );
}