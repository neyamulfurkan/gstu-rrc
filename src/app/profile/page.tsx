// src/app/profile/page.tsx

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import type { MemberPrivate } from "@/types/index";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.userId) {
    return { title: "Profile" };
  }
  const member = await prisma.member.findUnique({
    where: { id: session.user.userId },
    select: { fullName: true },
  });
  return {
    title: member ? `${member.fullName} — My Profile` : "My Profile",
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage(): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user?.userId) {
    redirect("/login?callbackUrl=/profile");
  }

  const member = await prisma.member.findUnique({
    where: { id: session.user.userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      studentId: true,
      gender: true,
      dob: true,
      address: true,
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
      lastLogin: true,
      adminNotes: true,
      status: true,
      department: {
        select: { name: true },
      },
      role: {
        select: { name: true, color: true, category: true },
      },
    },
  });

  if (!member) {
    notFound();
  }

  if (member.status !== "active") {
    redirect("/login?error=AccountInactive");
  }

  const memberPrivate: MemberPrivate = {
    id: member.id,
    username: member.username,
    fullName: member.fullName,
    email: member.email,
    phone: member.phone,
    studentId: member.studentId,
    gender: member.gender ?? null,
    dob: member.dob ?? null,
    address: member.address ?? null,
    avatarUrl: member.avatarUrl,
    coverUrl: member.coverUrl,
    bio: member.bio ?? null,
    interests: member.interests ?? null,
    skills: Array.isArray(member.skills) ? (member.skills as string[]) : [],
    socialLinks:
      typeof member.socialLinks === "object" &&
      member.socialLinks !== null &&
      !Array.isArray(member.socialLinks)
        ? (member.socialLinks as Record<string, string>)
        : {},
    session: member.session,
    memberType: member.memberType,
    workplace: member.workplace ?? null,
    createdAt: member.createdAt,
    lastLogin: member.lastLogin ?? null,
    adminNotes: member.adminNotes ?? null,
    department: { name: member.department.name },
    role: {
      name: member.role.name,
      color: member.role.color,
      category: member.role.category,
    },
  };

  const { ProfilePageClient } = await import("./ProfilePageClient");
  return <ProfilePageClient member={memberPrivate} isOwner={true} />;
}