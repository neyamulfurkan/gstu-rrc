// src/app/api/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { projectSchema } from "@/lib/validations";
import { generateSlug } from "@/lib/utils";
import type { ApiListResponse, ProjectCard } from "@/types/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateUniqueSlug(baseSlug: string): Promise<string | null> {
  for (let i = 0; i <= 10; i++) {
    const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
    const existing = await prisma.project.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return null;
}

async function postProjectToFacebook(
  project: { title: string; slug: string; coverUrl?: string | null }
): Promise<void> {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: { fbAutoPost: true, fbPageId: true, fbPageToken: true },
    });

    if (!config) return;

    const fbAutoPost = config.fbAutoPost as Record<string, boolean> | null;
    if (!fbAutoPost?.projects) return;
    if (!config.fbPageId || !config.fbPageToken) return;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const projectUrl = `${baseUrl}/projects/${project.slug}`;
    const message = `📢 Check out our latest project: ${project.title}\n\n${projectUrl}`;

    const body: Record<string, string> = {
      message,
      access_token: config.fbPageToken,
    };
    if (project.coverUrl) {
      body.link = project.coverUrl;
    }

    await fetch(
      `https://graph.facebook.com/v19.0/${config.fbPageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  } catch (err) {
    console.error("[api/projects] Facebook post error:", err);
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const takeParam = searchParams.get("take");
    const take = takeParam ? Math.min(parseInt(takeParam, 10), 100) : 20;

    const session = await auth();
    const isAdminUser =
      session?.user?.isAdmin === true ||
      hasPermission(session?.user?.permissions ?? null, "manage_projects");

    const where: Record<string, unknown> = isAdminUser ? {} : { isPublished: true };

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status === "ongoing" || status === "completed") {
      where.status = status;
    }

    if (year && !isNaN(year)) {
      where.year = year;
    }

    const queryArgs: {
      where: typeof where;
      take: number;
      select: Record<string, unknown>;
      orderBy: Record<string, string>;
      cursor?: { id: string };
      skip?: number;
    } = {
      where,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        status: true,
        year: true,
        technologies: true,
        category: {
          select: { name: true, color: true },
        },
        teamMembers: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            role: { select: { name: true, color: true } },
          },
        },
      },
    };

    if (cursor) {
      queryArgs.cursor = { id: cursor };
      queryArgs.skip = 1;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany(queryArgs as Parameters<typeof prisma.project.findMany>[0]),
      prisma.project.count({ where: where as any }),
    ]);

    const lastItem = projects[projects.length - 1];
    const nextCursor =
      projects.length === take && lastItem ? lastItem.id : undefined;

    const data = projects.map((p) => {
      const raw = p as Record<string, unknown>;
      const teamMembers = (raw.teamMembers as Array<{
        id: string;
        username: string;
        fullName: string;
        avatarUrl: string;
        role: { name: string; color: string } | null;
      }>) ?? [];

      return {
        id: raw.id as string,
        slug: raw.slug as string,
        title: raw.title as string,
        coverUrl: (raw.coverUrl as string) ?? "",
        status: raw.status as string,
        year: raw.year as number,
        technologies: (raw.technologies as string[]) ?? [],
        category: raw.category as { name: string; color: string },
        teamMembers: teamMembers.map((tm) => ({
          id: tm.id,
          username: tm.username,
          fullName: tm.fullName,
          avatarUrl: tm.avatarUrl ?? "",
          coverUrl: "",
          department: { name: "" },
          role: {
            name: tm.role?.name ?? "Member",
            color: tm.role?.color ?? "#7B8DB0",
            category: "general",
          },
          session: "",
          memberType: "member",
          skills: [],
          socialLinks: {},
          bio: null,
          interests: null,
          createdAt: new Date(),
        })),
      } satisfies ProjectCard;
    });

    const response: ApiListResponse<ProjectCard> = {
      data,
      nextCursor,
      total,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=30",
      },
    });
  } catch (err) {
    console.error("[api/projects] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as {
      isAdmin?: boolean;
      permissions?: Record<string, boolean>;
    };

    if (!user.isAdmin || !hasPermission(user.permissions ?? null, "manage_projects")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = projectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // ── Slug resolution ──────────────────────────────────────────────────────
    const baseSlug = data.slug
      ? generateSlug(data.slug)
      : generateSlug(data.title);

    const uniqueSlug = await generateUniqueSlug(baseSlug);
    if (!uniqueSlug) {
      return NextResponse.json(
        { error: "Could not generate a unique slug. Please provide a custom slug." },
        { status: 409 }
      );
    }

    // ── Team member connect ──────────────────────────────────────────────────
    const teamMemberIds = data.teamMemberIds ?? [];
    const teamMemberConnect = teamMemberIds.map((id) => ({ id }));

    // ── Build milestones JSON ────────────────────────────────────────────────
    const milestones = (data.milestones ?? []).map((m) => ({
      date: m.date,
      title: m.title,
      description: m.description,
    }));

    // ── Create project ───────────────────────────────────────────────────────
    const project = await prisma.project.create({
      data: {
        title: data.title,
        slug: uniqueSlug,
        coverUrl: data.coverUrl ?? "",
        status: data.status,
        year: data.year,
        technologies: data.technologies ?? [],
        description: data.description ?? {},
        githubUrl: data.githubUrl ?? null,
        demoUrl: data.demoUrl ?? null,
        reportUrl: data.reportUrl ?? null,
        youtubeUrl: data.youtubeUrl ?? null,
        milestones: milestones as unknown as Parameters<typeof prisma.project.create>[0]["data"]["milestones"],
        isPublished: data.isPublished,
        category: { connect: { id: data.categoryId } },
        ...(teamMemberConnect.length > 0
          ? { teamMembers: { connect: teamMemberConnect } }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        isPublished: true,
      },
    });

    // ── Facebook auto-post ───────────────────────────────────────────────────
    if (data.isPublished) {
      try {
        const fbConfig = await prisma.clubConfig.findUnique({
          where: { id: "main" },
          select: {
            fbAutoPost: true,
            fbRequireApproval: true,
            fbPageId: true,
            fbPageToken: true,
          },
        });

        const fbAutoPost = fbConfig?.fbAutoPost as Record<string, boolean> | null;
        const autoPostProjects = fbAutoPost?.projects === true;

        if (autoPostProjects) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
          const projectUrl = `${baseUrl}/projects/${project.slug}`;
          const techList = (data.technologies ?? []).slice(0, 5).join(" · ");
          const message = [
            `🚀 New Project: ${project.title}`,
            ``,
            techList ? `🛠 Technologies: ${techList}` : null,
            `📅 Year: ${data.year}`,
            `📌 Status: ${data.status === "completed" ? "✅ Completed" : "🔄 Ongoing"}`,
            ``,
            `Check out the full project details:`,
            `🔗 ${projectUrl}`,
            ``,
            `#GSTURobotics #GSTURRC #Project #${project.title.replace(/\s+/g, "")}`,
          ].filter(Boolean).join("\n");

          const requiresApproval = (fbConfig as unknown as { fbRequireApproval?: boolean } | null)?.fbRequireApproval === true;

          if (requiresApproval) {
            const { queuePostForReview } = await import("@/lib/facebook");
            await queuePostForReview({
              entityType: "project",
              entityId: project.id,
              entityTitle: project.title,
              message,
              imageUrl: project.coverUrl || null,
              link: projectUrl,
            });
          } else if (fbConfig?.fbPageId && fbConfig?.fbPageToken) {
            const { postToPage } = await import("@/lib/facebook");
            await postToPage({
              message,
              link: projectUrl,
              imageUrl: project.coverUrl || null,
              name: project.title,
              description: [
                techList ? `Technologies: ${techList}` : null,
                `Year: ${data.year}`,
              ].filter(Boolean).join(" | "),
            });
          }
        }
      } catch (fbErr) {
        console.error("[api/projects] Facebook post error:", fbErr);
        // Non-fatal
      }
    }

    if (data.isPublished) {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/projects");
      revalidatePath(`/projects/${project.slug}`);
    }
    return NextResponse.json(
      { data: { id: project.id, slug: project.slug } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/projects] POST error:", err);

    // Prisma unique constraint violation
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A project with this slug already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}