// src/app/api/projects/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { projectSchema } from "@/lib/validations";
import { isAdmin, hasPermission, isSuperAdmin } from "@/lib/permissions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCuid(value: string): boolean {
  return /^c[a-z0-9]{20,30}$/.test(value);
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

// ─── GET /api/projects/[id] ───────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();
    const identifier = params.id;
    const isAdminUser =
      isAdmin(session) ||
      isSuperAdmin(session) ||
      hasPermission(
        (session?.user as { permissions?: Record<string, boolean> })
          ?.permissions ?? null,
        "manage_projects"
      );

    const project = await prisma.project.findFirst({
      where: isAdminUser
        ? { OR: [{ id: identifier }, { slug: identifier }] }
        : { OR: [{ id: identifier }, { slug: identifier }], isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        status: true,
        year: true,
        technologies: true,
        description: true,
        githubUrl: true,
        demoUrl: true,
        reportUrl: true,
        youtubeUrl: true,
        milestones: true,
        isPublished: true,
        createdAt: true,
        categoryId: true,
        category: {
          select: {
            name: true,
            color: true,
          },
        },
        teamMembers: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            coverUrl: true,
            bio: true,
            interests: true,
            skills: true,
            socialLinks: true,
            session: true,
            memberType: true,
            workplace: true,
            createdAt: true,
            department: {
              select: { name: true },
            },
            role: {
              select: { name: true, color: true, category: true },
            },
          },
        },
        galleryItems: {
          where: { status: "approved" },
          select: {
            id: true,
            url: true,
            type: true,
            title: true,
            altText: true,
            downloadEnabled: true,
            year: true,
            createdAt: true,
            eventId: true,
            projectId: true,
            uploaderId: true,
            category: {
              select: { name: true },
            },
            uploader: {
              select: {
                username: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Parse milestones from JSON if stored as such
    let milestones: Array<{ date: string; title: string; description: string }> =
      [];
    if (Array.isArray(project.milestones)) {
      milestones = project.milestones as Array<{
        date: string;
        title: string;
        description: string;
      }>;
    } else if (project.milestones && typeof project.milestones === "object") {
      milestones = Object.values(project.milestones) as Array<{
        date: string;
        title: string;
        description: string;
      }>;
    }

    const responseData = {
      id: project.id,
      slug: project.slug,
      title: project.title,
      coverUrl: project.coverUrl,
      category: (project as any).category ?? { name: "", color: "" },
      status: project.status,
      year: project.year,
      technologies: project.technologies,
      teamMembers: (project as any).teamMembers ?? [],
      description: project.description,
      githubUrl: project.githubUrl,
      demoUrl: project.demoUrl,
      reportUrl: project.reportUrl,
      youtubeUrl: project.youtubeUrl,
      milestones,
      galleryItems: (project as any).galleryItems ?? [],
      isPublished: project.isPublished,
      createdAt: project.createdAt,
    };

    return NextResponse.json({ data: responseData });
  } catch (error) {
    console.error("[GET /api/projects/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/projects/[id] ───────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userPermissions = (
      session.user as { permissions?: Record<string, boolean> }
    )?.permissions ?? null;

    if (
      !isAdmin(session) ||
      (!isSuperAdmin(session) &&
        !hasPermission(userPermissions, "manage_projects"))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // If only isPublished is being toggled, skip full schema validation
    const bodyRecord = body as Record<string, unknown>;
    const isPublishedOnlyToggle =
      Object.keys(bodyRecord).length === 1 &&
      "isPublished" in bodyRecord &&
      typeof bodyRecord.isPublished === "boolean";

    if (isPublishedOnlyToggle) {
      const identifier2 = params.id;
      const existing2 = await prisma.project.findFirst({
        where: isCuid(identifier2) ? { id: identifier2 } : { slug: identifier2 },
        select: { id: true, title: true, slug: true, isPublished: true },
      });
      if (!existing2) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      const willBePublished = bodyRecord.isPublished as boolean;
      const updated2 = await prisma.project.update({
        where: { id: existing2.id },
        data: { isPublished: willBePublished },
        select: { id: true, slug: true, title: true, isPublished: true, coverUrl: true },
      });

      // Facebook auto-post on publish toggle
      if (!existing2.isPublished && willBePublished) {
        try {
          const fbConfig2 = await prisma.clubConfig.findUnique({
            where: { id: "main" },
            select: { fbAutoPost: true, fbPageId: true, fbPageToken: true, fbRequireApproval: true },
          });
          const fbAutoPost2 = fbConfig2?.fbAutoPost as Record<string, boolean> | null;
          if (fbAutoPost2?.projects) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
            const projectUrl = `${baseUrl}/projects/${existing2.slug}`;
            const message = `🚀 New Project: ${existing2.title}

🔗 ${projectUrl}

#GSTURobotics #GSTURRC #Project`;
            const requiresApproval2 = (fbConfig2 as any)?.fbRequireApproval === true;
            if (requiresApproval2) {
              const { queuePostForReview } = await import("@/lib/facebook");
              await queuePostForReview({ entityType: "project", entityId: existing2.id, entityTitle: existing2.title, message, imageUrl: (updated2 as any).coverUrl || null, link: projectUrl });
            } else if (fbConfig2?.fbPageId && fbConfig2?.fbPageToken) {
              const { postToPage } = await import("@/lib/facebook");
              await postToPage({ message, link: projectUrl, name: existing2.title });
            }
          }
        } catch {}
      }

      await logAction({
        adminId: (session.user as { userId?: string }).userId ?? session.user.email ?? "unknown",
        actionType: "UPDATE_PROJECT",
        description: `Toggled publish status of project "${existing2.title}" to ${willBePublished}`,
        entityType: "Project",
        entityId: existing2.id,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? request.headers.get("x-real-ip") ?? undefined,
      });
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/projects");
      revalidatePath(`/projects/${existing2.slug}`);
      return NextResponse.json({ data: updated2, message: "Project updated successfully" });
    }

    const parsed = projectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const identifier = params.id;

    // Find the existing project
    const existing = await prisma.project.findFirst({
      where: isCuid(identifier) ? { id: identifier } : { slug: identifier },
      select: { id: true, slug: true, isPublished: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Handle slug uniqueness if changed
    let finalSlug = existing.slug;
    if (data.slug && data.slug !== existing.slug) {
      let candidate = data.slug;
      let suffix = 1;
      while (suffix <= 10) {
        const conflict = await prisma.project.findFirst({
          where: { slug: candidate, id: { not: existing.id } },
          select: { id: true },
        });
        if (!conflict) {
          finalSlug = candidate;
          break;
        }
        candidate = `${data.slug}-${++suffix}`;
      }
      if (suffix > 10) {
        return NextResponse.json(
          {
            error:
              "Could not generate a unique slug. Please provide a different title or slug.",
          },
          { status: 409 }
        );
      }
    }

    // Auto-generate slug from title if not provided and no existing slug
    if (!data.slug && !existing.slug) {
      const base = data.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 80);
      let candidate = base;
      let suffix = 1;
      while (suffix <= 10) {
        const conflict = await prisma.project.findFirst({
          where: { slug: candidate, id: { not: existing.id } },
          select: { id: true },
        });
        if (!conflict) {
          finalSlug = candidate;
          break;
        }
        candidate = `${base}-${++suffix}`;
      }
    }

    // Update the project using set then connect for team members
    const updatedProject = await prisma.project.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        slug: finalSlug,
        status: data.status,
        year: data.year,
        coverUrl: data.coverUrl || undefined,
        technologies: data.technologies,
        description: data.description ?? null,
        githubUrl: data.githubUrl || null,
        demoUrl: data.demoUrl || null,
        reportUrl: data.reportUrl || null,
        youtubeUrl: data.youtubeUrl || null,
        milestones: data.milestones ?? [],
        isPublished: data.isPublished,
        category: {
          connect: { id: data.categoryId },
        },
        teamMembers: {
          set: [],
          connect: (data.teamMemberIds ?? []).map((id: string) => ({ id })),
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        isPublished: true,
      },
    });

    // Facebook auto-post if transitioning to published
    if (!existing.isPublished && data.isPublished) {
      try {
        const config = await prisma.clubConfig.findUnique({
          where: { id: "main" },
          select: {
            fbAutoPost: true,
            fbPageId: true,
            fbPageToken: true,
          },
        });

        const fbAutoPost = config?.fbAutoPost as
          | Record<string, boolean>
          | null
          | undefined;
        if (fbAutoPost?.projects && config?.fbPageId && config?.fbPageToken) {
          const postUrl = `https://graph.facebook.com/v19.0/${config.fbPageId}/feed`;
          const message = `🚀 New Project: ${data.title}\n\n${
            typeof data.description === "string"
              ? data.description.slice(0, 200)
              : ""
          }\n\nCheck it out at ${process.env.NEXT_PUBLIC_BASE_URL}/projects/${updatedProject.slug}`;

          fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message,
              access_token: config.fbPageToken,
            }),
          }).catch((err) => {
            console.error("[PUT /api/projects/[id]] Facebook post error:", err);
          });
        }
      } catch (fbError) {
        console.error(
          "[PUT /api/projects/[id]] Facebook config fetch error:",
          fbError
        );
      }
    }

    // Audit log
    await logAction({
      adminId: (session.user as { userId?: string }).userId ?? session.user.email ?? "unknown",
      actionType: "UPDATE_PROJECT",
      description: `Updated project "${data.title}" (slug: ${updatedProject.slug})`,
      entityType: "Project",
      entityId: existing.id,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        request.headers.get("x-real-ip") ??
        undefined,
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/projects");
    revalidatePath(`/projects/${updatedProject.slug}`);
    return NextResponse.json({
      data: updatedProject,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("[PUT /api/projects/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/projects/[id] ────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userPermissions = (
      session.user as { permissions?: Record<string, boolean> }
    )?.permissions ?? null;

    if (
      !isAdmin(session) ||
      (!isSuperAdmin(session) &&
        !hasPermission(userPermissions, "manage_projects"))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const identifier = params.id;

    const existing = await prisma.project.findFirst({
      where: isCuid(identifier) ? { id: identifier } : { slug: identifier },
      select: { id: true, title: true, slug: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Hard-delete the project (team member connections removed automatically via many-to-many)
    await prisma.project.delete({
      where: { id: existing.id },
    });

    // Audit log
    await logAction({
      adminId: (session.user as { userId?: string }).userId ?? session.user.email ?? "unknown",
      actionType: "DELETE_PROJECT",
      description: `Deleted project "${existing.title}" (slug: ${existing.slug})`,
      entityType: "Project",
      entityId: existing.id,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        request.headers.get("x-real-ip") ??
        undefined,
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/projects");
    revalidatePath(`/projects/${existing.slug}`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/projects/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}