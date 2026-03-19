// src/app/api/config/route.ts

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { ClubConfigPublic } from "@/types/index";

// ─── Select block: all ClubConfigPublic fields, no sensitive fields ───────────

const PUBLIC_CONFIG_SELECT = {
  clubName: true,
  clubShortName: true,
  clubMotto: true,
  clubDescription: true,
  universityName: true,
  departmentName: true,
  foundedYear: true,
  address: true,
  email: true,
  phone: true,
  logoUrl: true,
  faviconUrl: true,
  fbUrl: true,
  ytUrl: true,
  igUrl: true,
  liUrl: true,
  ghUrl: true,
  twitterUrl: true,
  extraSocialLinks: true,
  metaDescription: true,
  seoKeywords: true,
  gscVerifyTag: true,
  ogImageUrl: true,
  regStatus: true,
  membershipFee: true,
  bkashNumber: true,
  nagadNumber: true,
  heroType: true,
  heroVideoUrl: true,
  heroFallbackImg: true,
  heroImages: true,
  heroCtaLabel1: true,
  heroCtaUrl1: true,
  heroCtaLabel2: true,
  heroCtaUrl2: true,
  overlayOpacity: true,
  colorConfig: true,
  displayFont: true,
  bodyFont: true,
  monoFont: true,
  headingFont: true,
  animationStyle: true,
  transitionStyle: true,
  particleEnabled: true,
  particleCount: true,
  particleSpeed: true,
  particleColor: true,
  announcementTickerSpeed: true,
  privacyPolicy: true,
  termsOfUse: true,
  footerCopyright: true,
  aiEnabled: true,
  aiChatHistory: true,
  constitutionUrl: true,
} as const;

// ─── Zod schemas for each admin config tab ────────────────────────────────────

const brandingSchema = z.object({
  tab: z.literal("branding"),
  clubName: z.string().min(1).max(100).optional(),
  clubShortName: z.string().max(20).optional(),
  clubMotto: z.string().max(200).optional(),
  clubDescription: z.string().optional(),
  universityName: z.string().max(200).optional(),
  departmentName: z.string().max(200).optional(),
  foundedYear: z.number().int().min(1900).max(2100).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().url().optional().or(z.literal("")),
  constitutionUrl: z.string().url().optional().or(z.literal("")),
});

const contactSchema = z.object({
  tab: z.literal("contact"),
  address: z.string().max(500).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  fbUrl: z.string().url().optional().or(z.literal("")),
  ytUrl: z.string().url().optional().or(z.literal("")),
  igUrl: z.string().url().optional().or(z.literal("")),
  liUrl: z.string().url().optional().or(z.literal("")),
  ghUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  extraSocialLinks: z
    .array(z.object({ label: z.string(), url: z.string().url() }))
    .optional(),
});

const seoSchema = z.object({
  tab: z.literal("seo"),
  metaDescription: z.string().max(300).optional(),
  seoKeywords: z.string().max(500).optional(),
  gscVerifyTag: z.string().max(200).optional(),
  ogImageUrl: z.string().url().optional().or(z.literal("")),
});

const membershipSchema = z.object({
  tab: z.literal("membership"),
  regStatus: z.enum(["open", "closed", "invite_only"]).optional(),
  membershipFee: z.number().min(0).optional(),
  bkashNumber: z.string().max(20).optional(),
  nagadNumber: z.string().max(20).optional(),
  privacyPolicy: z.string().optional(),
  termsOfUse: z.string().optional(),
});

const designSchema = z.object({
  tab: z.literal("design"),
  colorConfig: z.record(z.string()).optional(),
  displayFont: z.string().max(100).optional(),
  bodyFont: z.string().max(100).optional(),
  monoFont: z.string().max(100).optional(),
  headingFont: z.string().max(100).optional(),
  animationStyle: z.enum(["standard", "minimal", "cinematic"]).optional(),
  transitionStyle: z.enum(["fade", "slide", "wipe"]).optional(),
  particleEnabled: z.boolean().optional(),
  particleCount: z.number().int().min(0).max(500).optional(),
  particleSpeed: z.number().min(0).max(10).optional(),
  particleColor: z.string().max(30).optional(),
});

const heroSchema = z.object({
  tab: z.literal("hero"),
  heroType: z.enum(["slideshow", "video", "particles"]).optional(),
  heroVideoUrl: z.string().url().optional().or(z.literal("")),
  heroFallbackImg: z.string().url().optional().or(z.literal("")),
  heroImages: z
    .array(z.object({ url: z.string().url(), order: z.number().int().min(0) }))
    .optional(),
  heroCtaLabel1: z.string().max(60).optional(),
  heroCtaUrl1: z.string().max(300).optional(),
  heroCtaLabel2: z.string().max(60).optional(),
  heroCtaUrl2: z.string().max(300).optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
});

const footerNavSchema = z.object({
  tab: z.literal("footer_nav"),
  footerCopyright: z.string().max(300).optional(),
  announcementTickerSpeed: z.number().min(0).max(100).optional(),
});

const emailSettingsSchema = z.object({
  tab: z.literal("email"),
  emailTemplates: z.record(z.object({ subject: z.string(), body: z.string() })).optional(),
});

const aiSchema = z.object({
  tab: z.literal("ai"),
  aiEnabled: z.boolean().optional(),
  aiChatHistory: z.string().optional(),
  aiSystemPrompt: z.string().optional(),
  aiContextItems: z.record(z.boolean()).optional(),
  groqModel: z.string().optional(),
  groqTemperature: z.number().min(0).max(2).optional(),
  groqApiKey: z.string().optional(),
});

const facebookSchema = z.object({
  tab: z.literal("facebook"),
  fbPageId: z.string().optional(),
  fbAutoPost: z.record(z.boolean()).optional(),
  fbAutoReplyComments: z.boolean().optional(),
  fbAutoReplyMessages: z.boolean().optional(),
  fbCommentReplyDelay: z.number().int().min(0).optional(),
});

const configUpdateSchema = z.discriminatedUnion("tab", [
  brandingSchema,
  contactSchema,
  seoSchema,
  membershipSchema,
  designSchema,
  heroSchema,
  footerNavSchema,
  emailSettingsSchema,
  aiSchema,
  facebookSchema,
]);

// ─── Helper: strip "tab" discriminant before writing to DB ───────────────────

function buildUpdateData(parsed: z.infer<typeof configUpdateSchema>): Record<string, unknown> {
  const { tab, ...rest } = parsed;
  void tab;
  return rest as Record<string, unknown>;
}

// ─── GET /api/config ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: PUBLIC_CONFIG_SELECT,
    });

    if (!config) {
      return NextResponse.json(
        { error: "Club configuration not found." },
        { status: 404 }
      );
    }

    // Check for ?previewColors= query param for ColorEditor live preview
    const { searchParams } = new URL(request.url);
    const previewColorsParam = searchParams.get("previewColors");

    let responseConfig: ClubConfigPublic = config as unknown as ClubConfigPublic;

    if (previewColorsParam) {
      try {
        const decoded = Buffer.from(previewColorsParam, "base64").toString("utf-8");
        const previewColorConfig = JSON.parse(decoded) as Record<string, string>;

        // Only accept a plain object of string values
        if (
          typeof previewColorConfig === "object" &&
          previewColorConfig !== null &&
          !Array.isArray(previewColorConfig) &&
          Object.values(previewColorConfig).every((v) => typeof v === "string")
        ) {
          responseConfig = {
            ...responseConfig,
            colorConfig: previewColorConfig,
          };
        }
      } catch {
        // Silently ignore malformed previewColors — fall through to normal config
      }
    }

    return NextResponse.json(responseConfig, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("[GET /api/config] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ─── POST /api/config ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth check — must be logged-in admin with manage_club_config permission
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const user = session.user as {
      isAdmin?: boolean;
      permissions?: Record<string, boolean>;
    };

    if (!user.isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!hasPermission(user.permissions ?? null, "manage_club_config")) {
      return NextResponse.json(
        { error: "You do not have permission to manage club configuration." },
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

    const parseResult = configUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updateData = buildUpdateData(parseResult.data);

    // Ensure the ClubConfig row exists before updating
    const existing = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Club configuration not found. Run the seed script first." },
        { status: 404 }
      );
    }

    // Write to DB
    await prisma.clubConfig.update({
      where: { id: "main" },
      data: updateData,
    });

    // Trigger ISR revalidation for all affected public pages
    const pathsToRevalidate = [
      "/",
      "/about",
      "/members",
      "/events",
      "/projects",
      "/gallery",
      "/feed",
      "/instruments",
      "/membership",
      "/alumni",
      "/certificates",
      "/api/config",
    ];

    for (const path of pathsToRevalidate) {
      try {
        revalidatePath(path);
      } catch (revalidateError) {
        // Log but do not fail the request if revalidation has an issue
        console.error(`[POST /api/config] revalidatePath(${path}) error:`, revalidateError);
      }
    }

    return NextResponse.json(
      { message: "Configuration updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/config] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}