// src/app/api/webhooks/facebook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGroq, type GroqMessage } from "@/lib/groq";

export const maxDuration = 60;

// ─── Types ───────────────────────────────────────────────────────────────────
interface FacebookCommentValue {
  item: string;
  comment_id: string;
  post_id: string;
  message: string;
  from?: { id: string; name: string };
  verb: string;
}

interface FacebookCommentChange {
  field: "comments";
  value: FacebookCommentValue;
}

interface FacebookMessagingEntry {
  sender: { id: string };
  recipient: { id: string };
  message?: { mid: string; text?: string };
}

interface FacebookPageEntry {
  id: string;
  time: number;
  changes?: FacebookCommentChange[];
  messaging?: FacebookMessagingEntry[];
}

interface FacebookWebhookBody {
  object: string;
  entry: FacebookPageEntry[];
}

interface FacebookConfig {
  fbWebhookToken: string | null;
  fbAutoReplyComments: boolean;
  fbAutoReplyMessages: boolean;
  fbCommentSystemPrompt: string | null;
  fbMessageSystemPrompt: string | null;
  fbCommentReplyDelay: number;
  fbPageId: string | null;
  fbPageToken: string | null;
}

// ─── Facebook Graph API helpers ───────────────────────────────────────────────

async function replyToComment(
  commentId: string,
  message: string,
  pageToken: string
): Promise<void> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${commentId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, access_token: pageToken }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error("[facebook/webhook] replyToComment API error:", err);
    }
  } catch (error) {
    console.error("[facebook/webhook] replyToComment network error:", error);
  }
}

async function sendMessage(
  recipientPsid: string,
  messageText: string,
  pageId: string,
  pageToken: string
): Promise<void> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientPsid },
          message: { text: messageText },
          access_token: pageToken,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error("[facebook/webhook] sendMessage API error:", err);
    }
  } catch (error) {
    console.error("[facebook/webhook] sendMessage network error:", error);
  }
}

// ─── Config fetcher ───────────────────────────────────────────────────────────

async function getFacebookConfig(): Promise<FacebookConfig | null> {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        fbWebhookToken: true,
        fbAutoReplyComments: true,
        fbAutoReplyMessages: true,
        fbCommentSystemPrompt: true,
        fbMessageSystemPrompt: true,
        fbCommentReplyDelay: true,
        fbPageId: true,
        fbPageToken: true,
      },
    });
    if (!config) return null;
    return {
      fbWebhookToken: config.fbWebhookToken ?? null,
      fbAutoReplyComments: config.fbAutoReplyComments ?? false,
      fbAutoReplyMessages: config.fbAutoReplyMessages ?? false,
      fbCommentSystemPrompt: config.fbCommentSystemPrompt ?? null,
      fbMessageSystemPrompt: config.fbMessageSystemPrompt ?? null,
      fbCommentReplyDelay: config.fbCommentReplyDelay ?? 2000,
      fbPageId: config.fbPageId ?? null,
      fbPageToken: config.fbPageToken ?? null,
    };
  } catch (error) {
    console.error("[facebook/webhook] Failed to fetch config:", error);
    return null;
  }
}

// ─── Async processing (non-blocking) ─────────────────────────────────────────

async function processCommentEvent(
  value: FacebookCommentValue,
  config: FacebookConfig
): Promise<void> {
  const { comment_id, message, post_id } = value;

  if (!config.fbPageToken) {
    console.error("[facebook/webhook] No page token for comment reply.");
    return;
  }

  const systemPrompt =
    config.fbCommentSystemPrompt ||
    "You are a helpful assistant for a robotics and research club. Reply politely and helpfully to comments on the club's Facebook page.";

  const messages: GroqMessage[] = [
    {
      role: "user",
      content: `Someone commented on post ${post_id}: "${message}". Please write a brief, friendly reply on behalf of the club.`,
    },
  ];

  const replyText = await callGroq(messages, systemPrompt);

  const delay = config.fbCommentReplyDelay ?? 2000;

  await new Promise<void>((resolve) => setTimeout(resolve, delay));

  await replyToComment(comment_id, replyText, config.fbPageToken!);
}

async function processMessageEvent(
  entry: FacebookMessagingEntry,
  config: FacebookConfig
): Promise<void> {
  const senderPsid = entry.sender?.id;
  const messageText = entry.message?.text;

  if (!senderPsid || !messageText) {
    return;
  }

  if (!config.fbPageToken || !config.fbPageId) {
    console.error("[facebook/webhook] No page token or page ID for message reply.");
    return;
  }

  // Don't reply to the page's own messages
  if (senderPsid === config.fbPageId) {
    return;
  }

  const systemPrompt =
    config.fbMessageSystemPrompt ||
    "You are a helpful assistant for a robotics and research club. Answer questions from students about the club politely and informatively.";

  const messages: GroqMessage[] = [
    {
      role: "user",
      content: messageText,
    },
  ];

  const replyText = await callGroq(messages, systemPrompt);

  await sendMessage(senderPsid, replyText, config.fbPageId!, config.fbPageToken!);
}

async function processWebhookBody(body: FacebookWebhookBody): Promise<void> {
  const config = await getFacebookConfig();

  if (!config) {
    console.error("[facebook/webhook] Could not load Facebook config.");
    return;
  }

  if (!Array.isArray(body.entry)) {
    return;
  }

  for (const entry of body.entry) {
    // Handle "page" comment changes
    if (Array.isArray(entry.changes) && config.fbAutoReplyComments) {
      for (const change of entry.changes) {
        if (
          change.field === "comments" &&
          change.value &&
          change.value.verb === "add" &&
          change.value.item === "comment" &&
          change.value.comment_id &&
          change.value.message
        ) {
          try {
            await processCommentEvent(change.value, config);
          } catch (error) {
            console.error(
              "[facebook/webhook] Error processing comment event:",
              error
            );
          }
        }
      }
    }

    // Handle Messenger messages
    if (Array.isArray(entry.messaging) && config.fbAutoReplyMessages) {
      for (const messagingEntry of entry.messaging) {
        // Only process standard messages (not deliveries, reads, etc.)
        if (messagingEntry.message && messagingEntry.message.text) {
          try {
            await processMessageEvent(messagingEntry, config);
          } catch (error) {
            console.error(
              "[facebook/webhook] Error processing message event:",
              error
            );
          }
        }
      }
    }
  }
}

// ─── GET — Webhook Verification ───────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (!mode || !token || !challenge) {
      return new NextResponse("Missing verification parameters", { status: 400 });
    }

    if (mode !== "subscribe") {
      return new NextResponse("Invalid mode", { status: 403 });
    }

    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: { fbWebhookToken: true },
    });

    if (!config || !config.fbWebhookToken) {
      console.error("[facebook/webhook] No webhook token configured in ClubConfig.");
      return new NextResponse("Webhook token not configured", { status: 403 });
    }

    if (token !== config.fbWebhookToken) {
      console.error("[facebook/webhook] Webhook verification token mismatch.");
      return new NextResponse("Token mismatch", { status: 403 });
    }

    // Return the raw challenge as plain text — Facebook requires this exactly
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("[facebook/webhook] GET handler error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

// ─── POST — Webhook Event Processing ─────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: FacebookWebhookBody;

  try {
    body = (await request.json()) as FacebookWebhookBody;
  } catch (parseError) {
    console.error("[facebook/webhook] Failed to parse webhook body:", parseError);
    // Facebook expects 200 even on bad payloads to prevent retries
    return new NextResponse("OK", { status: 200 });
  }

  // Validate it's a page object
  if (body.object !== "page") {
    return new NextResponse("OK", { status: 200 });
  }

  try {
    await processWebhookBody(body);
  } catch (error) {
    console.error("[facebook/webhook] Unhandled error in processWebhookBody:", error);
  }

  return new NextResponse("EVENT_RECEIVED", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}