// src/app/api/announcements/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { announcementSchema, paginationSchema } from "@/lib/validations";
import { hasPermission, isAdmin } from "@/lib/permissions";
import { sendEmail } from "@/lib/resend";
import type { ApiListResponse, AnnouncementCard } from "@/types/index";
import type { Session } from "next-auth";
import React from "react";

// ─── Rate Limit Store ─────────────────────────────────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

// ─── GET /api/announcements ───────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const session = (await auth()) as Session | null;
  const adminSession = session && isAdmin(session);

  const { searchParams } = request.nextUrl;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const showAll = searchParams.get("all") === "true" && adminSession;
  const cursorParam = searchParams.get("cursor") ?? undefined;
  const takeParam = searchParams.get("take");

  const paginationResult = paginationSchema.safeParse({
    cursor: cursorParam,
    take: takeParam ? parseInt(takeParam, 10) : 20,
  });

  if (!paginationResult.success) {
    return NextResponse.json(
      { error: "Invalid pagination parameters." },
      { status: 400 }
    );
  }

  const { cursor, take } = paginationResult.data;
  const now = new Date();

  try {
    // Build the where clause
    const where: Record<string, unknown> = {};

    if (!showAll) {
      // Public: only published, non-expired announcements
      where.isPublished = true;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Count total matching records
    const total = await prisma.announcement.count({ where });

    // Fetch paginated results
    const announcements = await prisma.announcement.findMany({
      where,
      select: {
        id: true,
        title: true,
        excerpt: true,
        expiresAt: true,
        createdAt: true,
        category: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    let nextCursor: string | undefined;
    if (announcements.length > take) {
      const lastItem = announcements.pop();
      nextCursor = lastItem?.id;
    }

    const data: AnnouncementCard[] = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt ?? "",
      category: {
        name: a.category.name,
        color: a.category.color,
      },
      expiresAt: a.expiresAt ?? null,
      createdAt: a.createdAt,
    }));

    const response: ApiListResponse<AnnouncementCard> = {
      data,
      nextCursor,
      total,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": showAll
          ? "no-store"
          : "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("[GET /api/announcements] Database error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ─── POST /api/announcements ──────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check first
  const session = (await auth()) as Session | null;

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const user = session.user as {
    isAdmin?: boolean;
    permissions?: Record<string, boolean>;
  };

  if (
    !user.isAdmin ||
    !hasPermission(user.permissions ?? null, "manage_announcements")
  ) {
    return NextResponse.json(
      { error: "Insufficient permissions. manage_announcements required." },
      { status: 403 }
    );
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const validation = announcementSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const {
    title,
    content,
    excerpt,
    categoryId,
    expiresAt,
    isPublished,
    sendEmail: shouldSendEmail,
  } = validation.data;

  // Verify the category exists
  try {
    const category = await prisma.announcementCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("[POST /api/announcements] Category lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }

  // Auto-generate excerpt from TipTap JSON content if not provided
  let finalExcerpt = excerpt ?? "";
  if (!finalExcerpt && content) {
    finalExcerpt = extractPlainText(content, 160);
  }

  // Create the announcement
  let announcement: {
    id: string;
    title: string;
    excerpt: string;
    isPublished: boolean;
    createdAt: Date;
    category: { name: string; color: string };
  };

  try {
    announcement = await prisma.announcement.create({
      data: {
        title,
        content: content as object,
        excerpt: finalExcerpt,
        categoryId,
        expiresAt: expiresAt ?? null,
        isPublished,
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        isPublished: true,
        createdAt: true,
        category: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[POST /api/announcements] Create error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }

  // Optional email broadcast (fire-and-forget)
  if (shouldSendEmail && isPublished) {
    broadcastAnnouncementEmail(
      announcement.id,
      announcement.title,
      finalExcerpt
    ).catch((err) => {
      console.error(
        "[POST /api/announcements] Email broadcast error:",
        err
      );
    });
  }

  return NextResponse.json(
    {
      data: {
        id: announcement.id,
        title: announcement.title,
        excerpt: announcement.excerpt,
        category: announcement.category,
        expiresAt: null,
        createdAt: announcement.createdAt,
      } satisfies AnnouncementCard,
      message: "Announcement created successfully.",
    },
    { status: 201 }
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts plain text from a TipTap JSON content node for use as excerpt.
 */
function extractPlainText(content: unknown, maxLength: number): string {
  if (typeof content === "string") {
    return content.slice(0, maxLength);
  }

  if (typeof content !== "object" || content === null) {
    return "";
  }

  const texts: string[] = [];

  function walk(node: unknown): void {
    if (typeof node !== "object" || node === null) return;

    const n = node as Record<string, unknown>;

    if (n.type === "text" && typeof n.text === "string") {
      texts.push(n.text);
      return;
    }

    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        walk(child);
        if (texts.join("").length >= maxLength) break;
      }
    }
  }

  walk(content);

  const full = texts.join(" ").replace(/\s+/g, " ").trim();
  if (full.length <= maxLength) return full;

  // Truncate at word boundary
  const truncated = full.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + "…" : truncated + "…";
}

/**
 * Sends the announcement email broadcast to all active members.
 * Fetches club config for the email layout and sends in batches.
 */
async function broadcastAnnouncementEmail(
  announcementId: string,
  title: string,
  excerpt: string
): Promise<void> {
  // Fetch club config for email branding
  let config: {
    clubName: string;
    logoUrl: string;
    colorConfig: Record<string, string>;
    resendFromEmail: string;
    resendFromName: string;
  } | null;

  try {
    const rawConfig = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        logoUrl: true,
        colorConfig: true,
        resendFromEmail: true,
        resendFromName: true,
      },
    });
    config = rawConfig ? {
      ...rawConfig,
      colorConfig: (rawConfig.colorConfig as Record<string, string>) ?? {},
    } : null;
  } catch (error) {
    console.error(
      "[announcements/broadcast] Failed to fetch club config:",
      error
    );
    return;
  }

  if (!config) return;

  // Fetch all active member emails
  let members: { id: string; email: string; fullName: string }[];
  try {
    members = await prisma.member.findMany({
      where: { status: "active" },
      select: { id: true, email: true, fullName: true },
    });
  } catch (error) {
    console.error(
      "[announcements/broadcast] Failed to fetch member emails:",
      error
    );
    return;
  }

  if (!members.length) return;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const announcementUrl = `${baseUrl}/announcements/${announcementId}`;

  const primaryColor =
    (config.colorConfig as Record<string, string>)?.["--color-primary"] ??
    "#00E5FF";

  const emailConfig = {
    clubName: config.clubName,
    logoUrl: config.logoUrl,
    primaryColor,
  };

  // Send emails in batches of 10 to avoid overwhelming Resend rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    const batch = members.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map((member) =>
        sendEmail({
          to: member.email,
          subject: `New Announcement: ${title}`,
          reactComponent: React.createElement(
            // We reference the email template component inline to avoid circular imports.
            // The actual NewAnnouncementEmail component is in emails/ActivityEmails.tsx
            // and will be imported dynamically via the sendEmail wrapper.
            // For now we build a minimal inline React element that matches the expected shape.
            AnnouncementEmailFallback,
            {
              memberName: member.fullName,
              title,
              excerpt,
              announcementUrl,
              config: emailConfig,
            }
          ),
        })
      )
    );

    // Small delay between batches to respect Resend rate limits
    if (i + BATCH_SIZE < members.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

/**
 * Inline announcement email component used for broadcasts.
 * Produces a simple, accessible HTML email without requiring a dynamic import.
 */
function AnnouncementEmailFallback(props: {
  memberName: string;
  title: string;
  excerpt: string;
  announcementUrl: string;
  config: { clubName: string; logoUrl: string; primaryColor: string };
}): React.ReactElement {
  const { memberName, title, excerpt, announcementUrl, config } = props;

  return React.createElement(
    "html",
    null,
    React.createElement(
      "body",
      {
        style: {
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#f4f4f4",
          margin: 0,
          padding: 0,
        },
      },
      React.createElement(
        "table",
        {
          width: "100%",
          cellPadding: 0,
          cellSpacing: 0,
          style: { backgroundColor: "#f4f4f4", padding: "20px 0" },
        },
        React.createElement(
          "tr",
          null,
          React.createElement(
            "td",
            { align: "center" },
            React.createElement(
              "table",
              {
                width: 600,
                cellPadding: 0,
                cellSpacing: 0,
                style: {
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  overflow: "hidden",
                  maxWidth: "600px",
                },
              },
              // Header
              React.createElement(
                "tr",
                null,
                React.createElement(
                  "td",
                  {
                    style: {
                      backgroundColor: config.primaryColor,
                      padding: "24px 32px",
                      textAlign: "center" as const,
                    },
                  },
                  config.logoUrl
                    ? React.createElement("img", {
                        src: config.logoUrl,
                        alt: config.clubName,
                        height: 48,
                        style: { display: "block", margin: "0 auto 8px" },
                      })
                    : null,
                  React.createElement(
                    "span",
                    {
                      style: {
                        color: "#ffffff",
                        fontSize: "18px",
                        fontWeight: "bold",
                      },
                    },
                    config.clubName
                  )
                )
              ),
              // Body
              React.createElement(
                "tr",
                null,
                React.createElement(
                  "td",
                  { style: { padding: "32px" } },
                  React.createElement(
                    "p",
                    { style: { margin: "0 0 16px", color: "#333333" } },
                    `Dear ${memberName},`
                  ),
                  React.createElement(
                    "p",
                    { style: { margin: "0 0 16px", color: "#333333" } },
                    "We have a new announcement for you:"
                  ),
                  React.createElement(
                    "h2",
                    {
                      style: {
                        margin: "0 0 12px",
                        color: "#111111",
                        fontSize: "20px",
                      },
                    },
                    title
                  ),
                  excerpt
                    ? React.createElement(
                        "p",
                        { style: { margin: "0 0 24px", color: "#555555" } },
                        excerpt
                      )
                    : null,
                  React.createElement(
                    "a",
                    {
                      href: announcementUrl,
                      style: {
                        display: "inline-block",
                        backgroundColor: config.primaryColor,
                        color: "#ffffff",
                        padding: "12px 24px",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontWeight: "bold",
                      },
                    },
                    "Read More"
                  )
                )
              ),
              // Footer
              React.createElement(
                "tr",
                null,
                React.createElement(
                  "td",
                  {
                    style: {
                      backgroundColor: "#f9f9f9",
                      padding: "16px 32px",
                      textAlign: "center" as const,
                      color: "#999999",
                      fontSize: "12px",
                    },
                  },
                  React.createElement(
                    "p",
                    { style: { margin: 0 } },
                    `© ${new Date().getFullYear()} ${config.clubName}. You are receiving this email because you are a registered member.`
                  )
                )
              )
            )
          )
        )
      )
    )
  );
}