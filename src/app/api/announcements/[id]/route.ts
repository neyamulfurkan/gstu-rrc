// src/app/api/announcements/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { AnnouncementDetail } from "@/types/index";

// ─── Audit Logger (inline fallback since FILE 155 is not yet generated) ───────

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
  } catch (error) {
    console.error("[auditLogger] Failed to write audit log:", error);
  }
}

// ─── GET /api/announcements/[id] ──────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Invalid announcement identifier." },
      { status: 400 }
    );
  }

  try {
    const session = await auth();
    const userPermissions = (
      session?.user as { permissions?: Record<string, boolean> }
    )?.permissions;
    const isAdminUser =
      (session?.user as { isAdmin?: boolean })?.isAdmin === true;
    const canManage =
      isAdminUser && hasPermission(userPermissions ?? null, "manage_announcements");

    const now = new Date();

    // Build where clause based on access level
    const whereClause = canManage
      ? { id }
      : {
          id,
          isPublished: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        };

    const announcement = await prisma.announcement.findFirst({
      where: whereClause,
      select: {
        id: true,
        title: true,
        excerpt: true,
        content: true,
        isPublished: true,
        expiresAt: true,
        createdAt: true,
        category: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found." },
        { status: 404 }
      );
    }

    const detail: AnnouncementDetail = {
      id: announcement.id,
      title: announcement.title,
      excerpt: announcement.excerpt,
      content: announcement.content as AnnouncementDetail["content"],
      category: {
        name: announcement.category.name,
        color: announcement.category.color,
      },
      expiresAt: announcement.expiresAt ?? undefined,
      createdAt: announcement.createdAt,
    };

    return NextResponse.json(detail, {
      status: 200,
      headers: canManage
        ? {}
        : { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch (error) {
    console.error("[GET /api/announcements/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ─── PUT /api/announcements/[id] ──────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const userPermissions = (
      session.user as { permissions?: Record<string, boolean> }
    )?.permissions;
    const isAdminUser =
      (session.user as { isAdmin?: boolean })?.isAdmin === true;

    if (!isAdminUser || !hasPermission(userPermissions ?? null, "manage_announcements")) {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    const existing = await prisma.announcement.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found." },
        { status: 404 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    // Validate required fields
    if (data.title !== undefined && typeof data.title !== "string") {
      return NextResponse.json(
        { error: "title must be a string." },
        { status: 400 }
      );
    }
    if (typeof data.title === "string" && data.title.trim().length < 2) {
      return NextResponse.json(
        { error: "title must be at least 2 characters." },
        { status: 400 }
      );
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) {
      updateData.title = (data.title as string).trim();
    }
    if (data.excerpt !== undefined) {
      updateData.excerpt =
        typeof data.excerpt === "string" ? data.excerpt.trim() : "";
    }
    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    if (data.categoryId !== undefined) {
      if (typeof data.categoryId !== "string") {
        return NextResponse.json(
          { error: "categoryId must be a string." },
          { status: 400 }
        );
      }
      updateData.categoryId = data.categoryId;
    }
    if (data.isPublished !== undefined) {
      updateData.isPublished = Boolean(data.isPublished);
    }
    if (data.expiresAt !== undefined) {
      updateData.expiresAt =
        data.expiresAt === null ? null : new Date(data.expiresAt as string);
    }
    if (data.sendEmail !== undefined) {
      // sendEmail is a trigger flag, not a stored field — handled above the update
    }

    const existingForFb = await prisma.announcement.findUnique({
      where: { id },
      select: { isPublished: true, excerpt: true },
    });

    const updated = await prisma.announcement.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        excerpt: true,
        isPublished: true,
        expiresAt: true,
        createdAt: true,
        category: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

    // Facebook auto-post if transitioning from unpublished to published
    if (existingForFb && !existingForFb.isPublished && updated.isPublished) {
      try {
        const fbConfig = await prisma.clubConfig.findUnique({
          where: { id: "main" },
          select: {
            fbAutoPost: true,
            fbPageId: true,
            fbPageToken: true,
            fbRequireApproval: true,
          },
        });
        const fbAutoPost = fbConfig?.fbAutoPost as Record<string, boolean> | null;
        if (fbAutoPost?.announcements) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
          const announcementUrl = `${baseUrl}/announcements/${id}`;
          const excerpt = updated.excerpt ?? existingForFb.excerpt ?? "";
          const message = [
            `📢 ${updated.title}`,
            ``,
            excerpt ? excerpt : null,
            ``,
            `🔗 ${announcementUrl}`,
            ``,
            `#GSTURobotics #GSTURRC #Announcement`,
          ]
            .filter((l) => l !== null)
            .join("\n");
          const requiresApproval = (fbConfig as any)?.fbRequireApproval === true;
          if (requiresApproval) {
            const { queuePostForReview } = await import("@/lib/facebook");
            await queuePostForReview({
              entityType: "announcement",
              entityId: id,
              entityTitle: updated.title,
              message,
              imageUrl: null,
              link: announcementUrl,
            });
          } else if (fbConfig?.fbPageId && fbConfig?.fbPageToken) {
            const { postToPage } = await import("@/lib/facebook");
            await postToPage({
              message,
              link: announcementUrl,
              name: updated.title,
              description: excerpt,
            });
          }
        }
      } catch (fbErr) {
        console.error("[PUT /api/announcements/[id]] Facebook post error:", fbErr);
      }
    }

    const adminId = (session.user as { userId?: string })?.userId ?? "unknown";
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    await logAction({
      adminId,
      actionType: "announcement_updated",
      description: `Updated announcement: "${updated.title}"`,
      entityType: "Announcement",
      entityId: id,
      ipAddress,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("[PUT /api/announcements/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/announcements/[id] ──────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const userPermissions = (
      session.user as { permissions?: Record<string, boolean> }
    )?.permissions;
    const isAdminUser =
      (session.user as { isAdmin?: boolean })?.isAdmin === true;

    if (!isAdminUser || !hasPermission(userPermissions ?? null, "manage_announcements")) {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    const existing = await prisma.announcement.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found." },
        { status: 404 }
      );
    }

    await prisma.announcement.delete({
      where: { id },
    });

    const adminId = (session.user as { userId?: string })?.userId ?? "unknown";
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    await logAction({
      adminId,
      actionType: "announcement_deleted",
      description: `Deleted announcement: "${existing.title}"`,
      entityType: "Announcement",
      entityId: id,
      ipAddress,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/announcements/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}