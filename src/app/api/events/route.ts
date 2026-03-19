// src/app/api/events/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eventSchema } from "@/lib/validations";
import { generateSlug } from "@/lib/utils";
import type { ApiListResponse, EventCard } from "@/types/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateUniqueSlug(baseSlug: string): Promise<string | null> {
  for (let i = 0; i <= 10; i++) {
    const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
    const existing = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return null;
}

function buildWhereClause(
  tab: string,
  categoryId: string | null,
  now: Date
): Record<string, unknown> {
  const baseWhere: Record<string, unknown> = { isPublished: true };

  if (categoryId) {
    baseWhere.categoryId = categoryId;
  }

  switch (tab) {
    case "upcoming":
      return { ...baseWhere, startDate: { gte: now } };

    case "ongoing":
      return {
        ...baseWhere,
        startDate: { lte: now },
        endDate: { gte: now },
      };

    case "past":
      return {
        ...baseWhere,
        OR: [
          { endDate: { lt: now } },
          { endDate: null, startDate: { lt: now } },
        ],
      };

    case "all":
    default:
      return baseWhere;
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const tab = searchParams.get("tab") ?? "upcoming";
    const categoryId = searchParams.get("categoryId");
    const cursor = searchParams.get("cursor");
    const takeParam = searchParams.get("take");
    const take = Math.min(
      Math.max(parseInt(takeParam ?? "20", 10) || 20, 1),
      100
    );

    const now = new Date();
    const session = await auth();
    const isAdminUser =
      session?.user?.isAdmin === true ||
      hasPermission(session?.user?.permissions ?? null, "manage_events");

    const allParam = searchParams.get("all");
    const rawWhere = buildWhereClause(tab, categoryId, now);
    const where = isAdminUser && allParam === "true" ? { ...rawWhere, isPublished: undefined } : rawWhere;
    // Remove isPublished key if admin requesting all
    if (isAdminUser && allParam === "true") {
      delete (where as Record<string, unknown>).isPublished;
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        take: take + 1,
        ...(cursor
          ? { cursor: { id: cursor }, skip: 1 }
          : {}),
        orderBy:
          tab === "past"
            ? { startDate: "desc" }
            : { startDate: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          coverUrl: true,
          category: {
            select: {
              name: true,
              color: true,
            },
          },
          startDate: true,
          endDate: true,
          allDay: true,
          venue: true,
          description: true,
          isPublished: true,
          registrationEnabled: true,
        },
      }),
      prisma.event.count({ where }),
    ]);

    let nextCursor: string | undefined;
    if (events.length > take) {
      const lastItem = events.pop();
      nextCursor = lastItem?.id;
    }

    const eventCards: EventCard[] = events.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      coverUrl: event.coverUrl ?? "",
      category: {
        name: event.category.name,
        color: event.category.color,
      },
      startDate: event.startDate,
      endDate: event.endDate ?? null,
      allDay: event.allDay,
      venue: event.venue,
      description:
        typeof event.description === "string"
          ? event.description
          : "",
      isPublished: event.isPublished,
      registrationEnabled: event.registrationEnabled,
    }));

    const response: ApiListResponse<EventCard> = {
      data: eventCards,
      nextCursor,
      total,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=30",
      },
    });
  } catch (error) {
    console.error("[GET /api/events] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = session.user as {
      isAdmin?: boolean;
      permissions?: Record<string, boolean>;
    };

    if (!user.isAdmin || !hasPermission(user.permissions ?? null, "manage_events")) {
      return NextResponse.json(
        { error: "Forbidden: manage_events permission required" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const bodyWithCover = body as Record<string, unknown>;
    const parseResult = eventSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // ── Slug generation ────────────────────────────────────────────────────
    const baseSlug = data.slug
      ? generateSlug(data.slug)
      : generateSlug(data.title);

    const uniqueSlug = await generateUniqueSlug(baseSlug);

    if (!uniqueSlug) {
      return NextResponse.json(
        {
          error:
            "Could not generate a unique slug for this event title. Please provide a custom slug.",
        },
        { status: 409 }
      );
    }

    // ── Create event ───────────────────────────────────────────────────────
    const event = await prisma.event.create({
      data: {
        title: data.title,
        slug: uniqueSlug,
        categoryId: data.categoryId,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        allDay: data.allDay,
        venue: data.venue,
        mapLink: data.mapLink || null,
        organizerName: data.organizerName ?? "",
        organizerId: data.organizerId ?? null,
        description: data.description ?? null,
        registrationEnabled: data.registrationEnabled,
        registrationDeadline: data.registrationDeadline ?? null,
        metaDescription: data.metaDescription ?? null,
        isPublished: data.isPublished,
        coverUrl: bodyWithCover.coverUrl as string ?? "",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        isPublished: true,
        coverUrl: true,
      },
    });

    // ── Facebook auto-post ─────────────────────────────────────────────────
    if (data.isPublished) {
      try {
        const config = await prisma.clubConfig.findUnique({
          where: { id: "main" },
          select: {
            fbAutoPost: true,
            fbPageId: true,
            fbPageToken: true,
          },
        });

        const fbAutoPost = config?.fbAutoPost as Record<string, unknown> | null;
        const autoPostEvents =
          fbAutoPost && typeof fbAutoPost === "object"
            ? (fbAutoPost as { events?: boolean }).events === true
            : false;

        if (autoPostEvents && config?.fbPageId && config?.fbPageToken) {
          // Dynamic import to avoid bundling facebook.ts when not needed
          try {
            const { postToPage } = await import("@/lib/facebook");
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
            const message = `📅 New Event: ${data.title}\n📍 ${data.venue}\n🗓 ${new Date(data.startDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n\nMore details: ${baseUrl}/events/${uniqueSlug}`;
            await postToPage(message);
          } catch (fbError) {
            console.error("[POST /api/events] Facebook auto-post failed:", fbError);
            // Non-fatal — event is still created
          }
        }
      } catch (configError) {
        console.error(
          "[POST /api/events] Failed to fetch config for Facebook auto-post:",
          configError
        );
        // Non-fatal
      }
    }

    return NextResponse.json(
      { data: { id: event.id, slug: event.slug } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/events] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}