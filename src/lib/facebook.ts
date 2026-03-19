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

export async function postToPage(content: string, imageUrl?: string): Promise<string | null> {
  try {
    const credentials = await getPageCredentials();
    if (!credentials) return null;

    const { pageId, pageToken } = credentials;

    const body: Record<string, string> = {
      message: content,
      access_token: pageToken,
    };

    if (imageUrl) {
      body.link = imageUrl;
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