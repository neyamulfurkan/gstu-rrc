// src/app/api/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
// ─── Rate Limiting ────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  if (entry.count >= 10) {
    return true;
  }

  entry.count += 1;
  return false;
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before searching again." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters." },
        { status: 400 }
      );
    }

    const containsFilter = { contains: q, mode: "insensitive" as const };

    const [members, events, projects, announcements] = await Promise.all([
      prisma.member.findMany({
        where: {
          status: "active",
          OR: [
            { fullName: containsFilter },
            { username: containsFilter },
          ],
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
        take: 5,
      }),

      prisma.event.findMany({
        where: {
          isPublished: true,
          title: containsFilter,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          coverUrl: true,
        },
        take: 5,
      }),

      prisma.project.findMany({
        where: {
          isPublished: true,
          title: containsFilter,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          coverUrl: true,
        },
        take: 5,
      }),

      prisma.announcement.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: containsFilter },
            { excerpt: containsFilter },
          ],
        },
        select: {
          id: true,
          title: true,
          excerpt: true,
        },
        take: 5,
      }),
    ]);

    const formattedMembers = members.map((m) => ({
      id: m.id,
      name: m.fullName,
      identifier: m.username,
      avatarUrl: m.avatarUrl,
      type: "member" as const,
    }));

    const formattedEvents = events.map((e) => ({
      id: e.id,
      name: e.title,
      identifier: e.slug,
      coverUrl: e.coverUrl,
      type: "event" as const,
    }));

    const formattedProjects = projects.map((p) => ({
      id: p.id,
      name: p.title,
      identifier: p.slug,
      coverUrl: p.coverUrl,
      type: "project" as const,
    }));

    const formattedAnnouncements = announcements.map((a) => ({
      id: a.id,
      name: a.title,
      identifier: a.id,
      excerpt: a.excerpt,
      type: "announcement" as const,
    }));

    return NextResponse.json(
      {
        members: formattedMembers,
        events: formattedEvents,
        projects: formattedProjects,
        announcements: formattedAnnouncements,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/search] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}