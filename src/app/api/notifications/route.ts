// src/app/api/notifications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NotificationItem } from "@/types/index";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberId = session.user.userId;
    const { searchParams } = new URL(request.url);

    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const cursor = searchParams.get("cursor") ?? undefined;
    const takeParam = searchParams.get("take");
    const take = takeParam ? Math.min(Math.max(parseInt(takeParam, 10) || 20, 1), 100) : 20;

    const where: {
      memberId: string;
      isRead?: boolean;
    } = { memberId };

    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          link: true,
          isRead: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { memberId, isRead: false },
      }),
    ]);

    let nextCursor: string | undefined;
    if (notifications.length > take) {
      const lastItem = notifications.pop();
      nextCursor = lastItem?.id;
    }

    const data: NotificationItem[] = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link ?? null,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));

    return NextResponse.json({
      data,
      nextCursor,
      total,
      unreadCount,
    });
  } catch (error) {
    console.error("[GET /api/notifications] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberId = session.user.userId;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;

    if (payload.markAllRead === true) {
      await prisma.notification.updateMany({
        where: { memberId, isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (typeof payload.id === "string" && payload.id.trim().length > 0) {
      const notificationId = payload.id.trim();

      const existing = await prisma.notification.findFirst({
        where: { id: notificationId, memberId },
        select: { id: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Notification not found or does not belong to you" },
          { status: 404 }
        );
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      return NextResponse.json({ message: "Notification marked as read" });
    }

    return NextResponse.json(
      { error: "Provide either { markAllRead: true } or { id: string }" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[PATCH /api/notifications] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}