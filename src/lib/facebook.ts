// src/lib/facebook.ts

import { prisma } from "@/lib/prisma";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

async function getPageCredentials(): Promise<{ pageId: string; pageToken: string } | null> {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: { fbPageId: true, fbPageToken: true },
    });

    if (!config || !config.fbPageId || !config.fbPageToken) {
      console.error("[facebook.ts] Facebook page credentials not configured in ClubConfig.");
      return null;
    }

    return { pageId: config.fbPageId, pageToken: config.fbPageToken };
  } catch (error) {
    console.error("[facebook.ts] Failed to fetch Facebook credentials from DB:", error);
    return null;
  }
}

export interface FacebookPostPayload {
  message: string;
  link: string;
  imageUrl?: string | null;
  name?: string;
  description?: string;
}

export async function postToPage(payload: FacebookPostPayload | string, imageUrl?: string): Promise<string | null> {
  try {
    const credentials = await getPageCredentials();
    if (!credentials) return null;

    const { pageId, pageToken } = credentials;

    // Support both legacy string call and new rich payload object
    let message: string;
    let linkUrl: string | undefined;
    let pictureUrl: string | null | undefined;
    let name: string | undefined;
    let description: string | undefined;

    if (typeof payload === "string") {
      message = payload;
      linkUrl = imageUrl;
      pictureUrl = undefined;
    } else {
      message = payload.message;
      linkUrl = payload.link;
      pictureUrl = payload.imageUrl;
      name = payload.name;
      description = payload.description;
    }

    const body: Record<string, string> = {
      message,
      access_token: pageToken,
    };

    // Use the page URL as the link for proper link preview card
    if (linkUrl) {
      body.link = linkUrl;
    }

    // Add open graph fields for a rich preview card
    if (name) body.name = name;
    if (description) body.description = description;

    // If we have a Cloudinary image, use it as the picture for the link preview
    if (pictureUrl) {
      body.picture = pictureUrl;
    }

    const response = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `[facebook.ts] postToPage failed with status ${response.status}:`,
        errorData
      );
      return null;
    }

    const data = await response.json();

    if (!data.id) {
      console.error("[facebook.ts] postToPage: No post ID returned from Graph API.", data);
      return null;
    }

    return data.id as string;
  } catch (error) {
    console.error("[facebook.ts] postToPage encountered an unexpected error:", error);
    return null;
  }
}

/**
 * Queues a Facebook post for admin review instead of posting immediately.
 * Creates a FacebookPendingPost record in the database.
 */
export async function queuePostForReview(payload: {
  entityType: string;
  entityId: string;
  entityTitle: string;
  message: string;
  imageUrl?: string | null;
  link: string;
}): Promise<void> {
  try {
    await (prisma as unknown as { facebookPendingPost: { create: (args: unknown) => Promise<unknown> } }).facebookPendingPost.create({
      data: {
        entityType: payload.entityType,
        entityId: payload.entityId,
        entityTitle: payload.entityTitle,
        message: payload.message,
        imageUrl: payload.imageUrl ?? null,
        link: payload.link,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("[facebook.ts] queuePostForReview failed:", error);
  }
}

/**
 * Approves and publishes a pending Facebook post.
 * Called from the admin Facebook panel.
 */
export async function approvePendingPost(pendingPostId: string): Promise<{ success: boolean; fbPostId?: string; error?: string }> {
  try {
    const fbPendingModel = (prisma as unknown as { facebookPendingPost: { findUnique: (args: unknown) => Promise<{ id: string; status: string; message: string; link: string; imageUrl: string | null } | null>; update: (args: unknown) => Promise<unknown> } }).facebookPendingPost;
    const pending = await fbPendingModel.findUnique({
      where: { id: pendingPostId },
    });

    if (!pending) return { success: false, error: "Pending post not found" };
    if (pending.status !== "pending") return { success: false, error: "Post is not in pending state" };

    const fbPostId = await postToPage({
      message: pending.message,
      link: pending.link,
      imageUrl: pending.imageUrl,
    });

    if (!fbPostId) {
      return { success: false, error: "Facebook API call failed" };
    }

    await fbPendingModel.update({
      where: { id: pendingPostId },
      data: {
        status: "posted",
        fbPostId,
        postedAt: new Date(),
      },
    });

    return { success: true, fbPostId };
  } catch (error) {
    console.error("[facebook.ts] approvePendingPost failed:", error);
    return { success: false, error: "Internal error" };
  }
}

/**
 * Rejects a pending Facebook post.
 */
export async function rejectPendingPost(pendingPostId: string, adminNote?: string): Promise<void> {
  try {
    await (prisma as unknown as { facebookPendingPost: { update: (args: unknown) => Promise<unknown> } }).facebookPendingPost.update({
      where: { id: pendingPostId },
      data: { status: "rejected", adminNote: adminNote ?? null },
    });
  } catch (error) {
    console.error("[facebook.ts] rejectPendingPost failed:", error);
  }
}

export async function replyToComment(commentId: string, message: string): Promise<void> {
  try {
    const credentials = await getPageCredentials();
    if (!credentials) return;

    const { pageToken } = credentials;

    const response = await fetch(`${GRAPH_API_BASE}/${commentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        access_token: pageToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `[facebook.ts] replyToComment failed with status ${response.status}:`,
        errorData
      );
    }
  } catch (error) {
    console.error("[facebook.ts] replyToComment encountered an unexpected error:", error);
  }
}

export async function sendMessage(recipientPsid: string, message: string): Promise<void> {
  try {
    const credentials = await getPageCredentials();
    if (!credentials) return;

    const { pageId, pageToken } = credentials;

    const response = await fetch(`${GRAPH_API_BASE}/${pageId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: { text: message },
        access_token: pageToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `[facebook.ts] sendMessage failed with status ${response.status}:`,
        errorData
      );
    }
  } catch (error) {
    console.error("[facebook.ts] sendMessage encountered an unexpected error:", error);
  }
}