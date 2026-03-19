// src/app/api/events/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eventSchema } from "@/lib/validations";
import type { EventDetail } from "@/types/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CUID_REGEX = /^c[a-z0-9]{24,}$/i;

function isCuid(value: string): boolean {
  return CUID_REGEX.test(value);
}

async function logAction(params: {
  adminId: string;
  actionType: string;
  description: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        actionType: params.actionType,
        description: params.description,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error("[auditLogger] Failed to write audit log:", err);
  }
}

async function postToFacebook(
  title: string,
  venue: string,
  startDate: Date | string,
  coverUrl: string | null
): Promise<void> {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: { fbPageId: true, fbPageToken: true },
    });

    if (!config?.fbPageId || !config?.fbPageToken) return;

    const message = `📅 New Event: ${title}\n📍 Venue: ${venue}\n🗓 Date: ${new Date(startDate).toLocaleDateString("en-BD", { dateStyle: "long" })}`;

    const body: Record<string, string> = {
      message,
      access_token: config.fbPageToken,
    };
    if (coverUrl) body.link = coverUrl;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${config.fbPageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("[facebook] postToPage failed:", errData);
    }
  } catch (err) {
    console.error("[facebook] postToPage exception:", err);
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
  }

  try {
    const session = await auth();
    const isAdmin =
      session?.user?.isAdmin === true ||
      hasPermission(session?.user?.permissions ?? null, "manage_events");

    const whereClause = isCuid(id) ? { id } : { slug: id };

    const event = await prisma.event.findFirst({
      where: whereClause,
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        startDate: true,
        endDate: true,
        allDay: true,
        venue: true,
        mapLink: true,
        organizerName: true,
        description: true,
        metaDescription: true,
        isPublished: true,
        registrationEnabled: true,
        registrationDeadline: true,
        category: {
          select: { name: true, color: true },
        },
        galleryItems: {
          where: { status: "approved" },
          select: {
            id: true,
            url: true,
            type: true,
            title: true,
            altText: true,
            downloadEnabled: true,
            year: true,
            createdAt: true,
            category: { select: { name: true } },
            uploaderId: true,
            uploader: {
              select: { username: true, fullName: true, avatarUrl: true },
            },
            eventId: true,
            projectId: true,
          },
        },
        attendees: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            coverUrl: true,
            session: true,
            memberType: true,
            skills: true,
            socialLinks: true,
            bio: true,
            interests: true,
            workplace: true,
            createdAt: true,
            department: { select: { name: true } },
            role: { select: { name: true, color: true, category: true } },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!event.isPublished && !isAdmin) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const eventDetail: EventDetail = {
      id: event.id,
      slug: event.slug,
      title: event.title,
      coverUrl: event.coverUrl ?? "",
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate ?? null,
      allDay: event.allDay,
      venue: event.venue,
      description: event.description as EventDetail["description"],
      organizerName: event.organizerName ?? "",
      mapLink: event.mapLink ?? null,
      metaDescription: event.metaDescription ?? null,
      isPublished: event.isPublished,
      registrationEnabled: event.registrationEnabled,
      galleryItems: event.galleryItems.map((g) => ({
        id: g.id,
        url: g.url,
        type: g.type,
        title: g.title ?? null,
        altText: g.altText,
        category: g.category,
        uploaderId: g.uploaderId ?? null,
        uploader: g.uploader ?? null,
        eventId: g.eventId ?? null,
        projectId: g.projectId ?? null,
        downloadEnabled: g.downloadEnabled,
        year: g.year,
        createdAt: g.createdAt,
      })),
      attendees: event.attendees.map((a) => ({
        id: a.id,
        username: a.username,
        fullName: a.fullName,
        avatarUrl: a.avatarUrl ?? "",
        coverUrl: a.coverUrl ?? "",
        department: a.department,
        role: a.role,
        session: a.session,
        memberType: a.memberType,
        skills: a.skills as string[],
        socialLinks: (a.socialLinks as Record<string, string>) ?? {},
        bio: a.bio ?? null,
        interests: a.interests ?? null,
        workplace: a.workplace ?? null,
        createdAt: a.createdAt,
      })),
    };

    return NextResponse.json({ data: eventDetail }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/events/[id]] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
  }

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.permissions ?? null, "manage_events")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const bodyRecord = body as Record<string, unknown>;
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const whereClause = isCuid(id) ? { id } : { slug: id };

    const existingEvent = await prisma.event.findFirst({
      where: whereClause,
      select: { id: true, isPublished: true, slug: true, title: true, startDate: true, venue: true, coverUrl: true },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Slug uniqueness check if slug is being changed
    if (data.slug && data.slug !== existingEvent.slug) {
      const slugConflict = await prisma.event.findFirst({
        where: { slug: data.slug, id: { not: existingEvent.id } },
        select: { id: true },
      });
      if (slugConflict) {
        return NextResponse.json(
          { error: "An event with this slug already exists" },
          { status: 409 }
        );
      }
    }

    const wasPublished = existingEvent.isPublished;
    const willBePublished = data.isPublished;
    const becomingPublished = !wasPublished && willBePublished;

    const updatedEvent = await prisma.event.update({
      where: { id: existingEvent.id },
      data: {
        title: data.title,
        slug: data.slug ?? existingEvent.slug,
        categoryId: data.categoryId,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        allDay: data.allDay,
        venue: data.venue,
        mapLink: data.mapLink || null,
        organizerName: data.organizerName ?? undefined,
        description: data.description ?? {},
        registrationEnabled: data.registrationEnabled,
        registrationDeadline: data.registrationDeadline ?? null,
        metaDescription: data.metaDescription ?? null,
        isPublished: data.isPublished,
        coverUrl: bodyRecord.coverUrl as string ?? existingEvent.coverUrl ?? "",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        startDate: true,
        venue: true,
        isPublished: true,
      },
    });

    // Facebook auto-post if event becomes published
    if (becomingPublished) {
      try {
        const clubConfig = await prisma.clubConfig.findUnique({
          where: { id: "main" },
          select: { fbAutoPost: true },
        });

        const fbAutoPost = clubConfig?.fbAutoPost as Record<string, boolean> | null;
        if (fbAutoPost?.events === true) {
          void postToFacebook(
            updatedEvent.title,
            updatedEvent.venue,
            updatedEvent.startDate,
            updatedEvent.coverUrl ?? null
          );
        }
      } catch (fbErr) {
        console.error("[PUT /api/events/[id]] Facebook config fetch error:", fbErr);
      }
    }

    await logAction({
      adminId: session.user.userId,
      actionType: "UPDATE_EVENT",
      description: `Updated event "${updatedEvent.title}" (id: ${updatedEvent.id})`,
      entityType: "Event",
      entityId: updatedEvent.id,
      ipAddress:
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        undefined,
    });

    return NextResponse.json(
      { data: updatedEvent, message: "Event updated successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[PUT /api/events/[id]] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
  }

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.permissions ?? null, "manage_events")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const whereClause = isCuid(id) ? { id } : { slug: id };

    const existingEvent = await prisma.event.findFirst({
      where: whereClause,
      select: { id: true, title: true },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id: existingEvent.id },
    });

    await logAction({
      adminId: session.user.userId,
      actionType: "DELETE_EVENT",
      description: `Deleted event "${existingEvent.title}" (id: ${existingEvent.id})`,
      entityType: "Event",
      entityId: existingEvent.id,
      ipAddress:
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        undefined,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/events/[id]] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}