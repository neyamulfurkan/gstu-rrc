// src/lib/notifications.ts

import { prisma } from "@/lib/prisma";

export async function createNotification(params: {
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
  } catch (error) {
    console.error("[notifications] createNotification failed:", error);
  }
}

export async function notifyAdmins(params: {
  type: string;
  title: string;
  body: string;
  link?: string;
  permission: string;
}): Promise<void> {
  try {
    const admins = await prisma.member.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        adminRole: {
          select: { permissions: true },
        },
      },
    });

    const eligibleIds = admins
      .filter((admin) => {
        const perms = admin.adminRole?.permissions;
        if (!perms || typeof perms !== "object") return false;
        return (perms as Record<string, boolean>)[params.permission] === true;
      })
      .map((admin) => admin.id);

    if (eligibleIds.length === 0) return;

    await prisma.notification.createMany({
      data: eligibleIds.map((memberId) => ({
        memberId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
        isRead: false,
      })),
    });
  } catch (error) {
    console.error("[notifications] notifyAdmins failed:", error);
  }
}