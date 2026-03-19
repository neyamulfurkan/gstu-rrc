// src/app/api/gallery/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { GalleryItemCard } from "@/types/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
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

async function createNotification(params: {
  memberId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        memberId: params.memberId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
        isRead: false,
      },
    });
  } catch (err) {
    console.error("[notifications] Failed to create notification:", err);
  }
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ─── GET /api/gallery/[id] ────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid gallery item id" }, { status: 400 });
  }

  try {
    const item = await prisma.galleryItem.findUnique({
      where: { id },
      select: {
        id: true,
        url: true,
        type: true,
        title: true,
        altText: true,
        description: true,
        tags: true,
        status: true,
        downloadEnabled: true,
        year: true,
        eventId: true,
        projectId: true,
        uploaderId: true,
        isAdminUpload: true,
        createdAt: true,
        category: {
          select: { id: true, name: true },
        },
        uploader: {
          select: { username: true, fullName: true, avatarUrl: true },
        },
        event: {
          select: { id: true, title: true, slug: true },
        },
        project: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }

    const user = await getSessionUser();
    const isAdmin =
      user?.isAdmin === true &&
      hasPermission(user.permissions ?? null, "manage_gallery");

    // Non-admins can only see approved items
    if (item.status !== "approved" && !isAdmin) {
      // Allow uploaders to see their own pending/rejected items
      if (!user || item.uploaderId !== user.userId) {
        return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ data: item }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/gallery/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH /api/gallery/[id] ──────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid gallery item id" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.isAdmin || !hasPermission(user.permissions ?? null, "manage_gallery")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Fetch existing item to compare status for notification logic
  let existingItem: {
    id: string;
    status: string;
    uploaderId: string | null;
    title: string | null;
  } | null = null;

  try {
    existingItem = await prisma.galleryItem.findUnique({
      where: { id },
      select: { id: true, status: true, uploaderId: true, title: true },
    });
  } catch (err) {
    console.error("[PATCH /api/gallery/[id]] fetch existing:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!existingItem) {
    return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
  }

  // Build update data from allowed fields
  const updateData: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    const allowedStatuses = ["pending", "approved", "rejected"];
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}` },
        { status: 400 }
      );
    }
    updateData.status = body.status;
  }

  if (typeof body.title === "string") {
    updateData.title = body.title.trim() || null;
  }

  if (typeof body.description === "string") {
    updateData.description = body.description.trim() || null;
  }

  if (typeof body.altText === "string") {
    updateData.altText = body.altText.trim();
  }

  if (typeof body.categoryId === "string") {
    updateData.categoryId = body.categoryId;
  }

  if (Array.isArray(body.tags)) {
    updateData.tags = (body.tags as unknown[]).filter(
      (t): t is string => typeof t === "string"
    );
  }

  if (body.eventId === null || typeof body.eventId === "string") {
    updateData.eventId = body.eventId ?? null;
  }

  if (body.projectId === null || typeof body.projectId === "string") {
    updateData.projectId = body.projectId ?? null;
  }

  if (typeof body.downloadEnabled === "boolean") {
    updateData.downloadEnabled = body.downloadEnabled;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields provided for update" }, { status: 400 });
  }

  let updatedItem: GalleryItemCard;

  try {
    const raw = await prisma.galleryItem.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        url: true,
        type: true,
        title: true,
        altText: true,
        category: { select: { name: true } },
        uploaderId: true,
        uploader: { select: { username: true, fullName: true, avatarUrl: true } },
        eventId: true,
        projectId: true,
        downloadEnabled: true,
        year: true,
        createdAt: true,
        status: true,
      },
    });

    updatedItem = {
      id: raw.id,
      url: raw.url,
      type: raw.type,
      title: raw.title ?? null,
      altText: raw.altText,
      category: { name: raw.category.name },
      uploaderId: raw.uploaderId ?? null,
      uploader: raw.uploader ?? null,
      eventId: raw.eventId ?? null,
      projectId: raw.projectId ?? null,
      downloadEnabled: raw.downloadEnabled,
      year: raw.year,
      createdAt: raw.createdAt,
    };
  } catch (err) {
    console.error("[PATCH /api/gallery/[id]] update:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Notify uploader on status change if they exist and status actually changed
  const newStatus = updateData.status as string | undefined;
  if (
    newStatus &&
    newStatus !== existingItem.status &&
    existingItem.uploaderId &&
    (newStatus === "approved" || newStatus === "rejected")
  ) {
    const itemLabel = existingItem.title ?? "Your gallery item";

    if (newStatus === "approved") {
      await createNotification({
        memberId: existingItem.uploaderId,
        type: "gallery_approved",
        title: "Gallery Upload Approved",
        body: `"${itemLabel}" has been approved and is now visible in the gallery.`,
        link: `/gallery`,
      });
    } else if (newStatus === "rejected") {
      await createNotification({
        memberId: existingItem.uploaderId,
        type: "gallery_rejected",
        title: "Gallery Upload Rejected",
        body: `"${itemLabel}" was not approved for the gallery. Please contact an admin for more details.`,
        link: `/profile`,
      });
    }
  }

  // Audit log the admin action
  await logAction({
    adminId: user.userId,
    actionType: "gallery_item_updated",
    description: `Updated gallery item ${id}${newStatus ? ` — status changed to ${newStatus}` : ""}`,
    entityType: "GalleryItem",
    entityId: id,
    ipAddress: getIp(req),
  });

  return NextResponse.json({ data: updatedItem }, { status: 200 });
}

// ─── DELETE /api/gallery/[id] ─────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid gallery item id" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch item to determine ownership and status
  let existingItem: {
    id: string;
    status: string;
    uploaderId: string | null;
    title: string | null;
    isAdminUpload: boolean;
  } | null = null;

  try {
    existingItem = await prisma.galleryItem.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        uploaderId: true,
        title: true,
        isAdminUpload: true,
      },
    });
  } catch (err) {
    console.error("[DELETE /api/gallery/[id]] fetch:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!existingItem) {
    return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
  }

  const isAdminWithPermission =
    user.isAdmin === true &&
    hasPermission(user.permissions ?? null, "manage_gallery");

  const isUploader = existingItem.uploaderId === user.userId;

  // Access control:
  // - Admins with manage_gallery can delete any item
  // - Members can only delete their own items that are still pending
  if (!isAdminWithPermission) {
    if (!isUploader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existingItem.status !== "pending") {
      return NextResponse.json(
        { error: "You can only delete your own pending gallery items" },
        { status: 403 }
      );
    }
  }

  try {
    await prisma.galleryItem.delete({ where: { id } });
  } catch (err) {
    console.error("[DELETE /api/gallery/[id]] delete:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Only log admin deletions
  if (isAdminWithPermission) {
    await logAction({
      adminId: user.userId,
      actionType: "gallery_item_deleted",
      description: `Deleted gallery item ${id} — "${existingItem.title ?? "untitled"}"`,
      entityType: "GalleryItem",
      entityId: id,
      ipAddress: getIp(req),
    });
  }

  return new NextResponse(null, { status: 204 });
}