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

  console.log("[DEBUG] processMessageEvent called", { senderPsid, messageText });

  if (!senderPsid || !messageText) {
    console.log("[DEBUG] Skipping — missing senderPsid or messageText");
    return;
  }

  if (!config.fbPageToken || !config.fbPageId) {
    console.error("[DEBUG] Missing pageToken or pageId", {
      hasToken: !!config.fbPageToken,
      hasPageId: !!config.fbPageId,
    });
    return;
  }

  // Don't reply to the page's own messages
  if (senderPsid === config.fbPageId) {
    console.log("[DEBUG] Skipping — sender is the page itself");
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
  console.log("[DEBUG] processWebhookBody called, object:", body.object);
  console.log("[DEBUG] entry count:", body.entry?.length);

  const config = await getFacebookConfig();

  if (!config) {
    console.error("[facebook/webhook] Could not load Facebook config.");
    return;
  }

  console.log("[DEBUG] config loaded", {
    fbAutoReplyMessages: config.fbAutoReplyMessages,
    fbAutoReplyComments: config.fbAutoReplyComments,
    hasPageId: !!config.fbPageId,
    hasPageToken: !!config.fbPageToken,
  });

  if (!Array.isArray(body.entry)) {
    console.log("[DEBUG] body.entry is not an array");
    return;
  }

  for (const entry of body.entry) {
    console.log("[DEBUG] processing entry", {
      hasChanges: Array.isArray(entry.changes),
      hasMessaging: Array.isArray(entry.messaging),
      messagingCount: entry.messaging?.length,
    });

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
    if (Array.isArray(entry.messaging)) {
      console.log("[DEBUG] messaging array found, fbAutoReplyMessages:", config.fbAutoReplyMessages);
      for (const messagingEntry of entry.messaging) {
        console.log("[DEBUG] messagingEntry keys:", Object.keys(messagingEntry));
        console.log("[DEBUG] has message:", !!messagingEntry.message, "has text:", !!messagingEntry.message?.text);
        // Only process standard messages (not deliveries, reads, etc.)
        if (messagingEntry.message && messagingEntry.message.text) {
          if (!config.fbAutoReplyMessages) {
            console.log("[DEBUG] fbAutoReplyMessages is false — skipping");
            continue;
          }
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
      console.error("[facebook/webhook] Missing params:", { mode, token: !!token, challenge: !!challenge });
      return new NextResponse("Missing verification parameters", { status: 400 });
    }

    if (mode !== "subscribe") {
      console.error("[facebook/webhook] Invalid mode:", mode);
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