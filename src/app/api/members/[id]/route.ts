// src/app/api/members/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  memberSchema,
  accountSchema,
} from "@/lib/validations";
import { z } from "zod";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CUID_REGEX = /^c[a-z0-9]{24}$/i;
const MEMBER_ID_REGEX = /^member_/i;

function isCuid(value: string): boolean {
  return CUID_REGEX.test(value) || MEMBER_ID_REGEX.test(value);
}

async function findMemberByIdOrUsername(idOrUsername: string) {
  const where = isCuid(idOrUsername)
    ? { id: idOrUsername }
    : { username: idOrUsername };

  return where;
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

// ─── SELECT blocks ────────────────────────────────────────────────────────────

const PUBLIC_SELECT = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  coverUrl: true,
  department: { select: { name: true } },
  role: { select: { name: true, color: true, category: true } },
  session: true,
  memberType: true,
  skills: true,
  socialLinks: true,
  bio: true,
  interests: true,
  createdAt: true,
  workplace: true,
} as const;

const PRIVATE_SELECT = {
  ...PUBLIC_SELECT,
  email: true,
  phone: true,
  gender: true,
  dob: true,
  address: true,
  studentId: true,
  adminNotes: true,
  lastLogin: true,
} as const;

// ─── GET /api/members/[id] ────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Member ID or username is required" }, { status: 400 });
  }

  try {
    const session = await auth();
    // ── Stats select mode ──────────────────────────────────────────────────
    const selectMode = request.nextUrl.searchParams.get("select");
    if (selectMode === "stats") {
      const where = await findMemberByIdOrUsername(id);
      const memberForStats = await prisma.member.findUnique({
        where,
        select: { id: true },
      });

      if (!memberForStats) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      const [postsCount, projectsCount, certificatesCount, eventsAttended] =
        await Promise.all([
          prisma.post.count({
            where: { authorId: memberForStats.id, isDeleted: false },
          }),
          prisma.project.count({
            where: {
              teamMembers: { some: { id: memberForStats.id } },
              isPublished: true,
            },
          }),
          prisma.certificate.count({
            where: { recipientId: memberForStats.id, isRevoked: false },
          }),
          prisma.event.count({
            where: {
              attendees: { some: { id: memberForStats.id } },
              isPublished: true,
            },
          }),
        ]);

      return NextResponse.json({
        data: {
          postsCount,
          projectsCount,
          certificatesCount,
          eventsAttended,
        },
      });
    }

    const where = await findMemberByIdOrUsername(id);

    const isOwnProfile = session?.user?.userId
      ? isCuid(id)
        ? session.user.userId === id
        : false
      : false;

    // Check if it's own profile by username
    const isOwnUsername =
      session?.user?.username && !isCuid(id)
        ? session.user.username === id
        : false;

    const isAdminWithPermission =
      session?.user?.isAdmin &&
      session.user.permissions?.["manage_members"] === true;

    const canSeePrivate = isOwnProfile || isOwnUsername || isAdminWithPermission;

    const member = await prisma.member.findUnique({
      where,
      select: canSeePrivate ? PRIVATE_SELECT : PUBLIC_SELECT,
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Non-admins cannot see suspended/inactive members
    if (
      !isAdminWithPermission &&
      !isOwnProfile &&
      !isOwnUsername
    ) {
      const rawMember = await prisma.member.findUnique({
        where,
        select: { status: true },
      });
      if (rawMember && rawMember.status !== "active") {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ data: member });
  } catch (error) {
    console.error("[GET /api/members/[id]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PUT /api/members/[id] ────────────────────────────────────────────────────

const selfEditSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().regex(/^01[3-9]\d{8}$/).optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  interests: z.string().optional(),
  skills: z.array(z.string()).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  coverUrl: z.string().url().optional().or(z.literal("")),
  workplace: z.string().optional(),
  gender: z.string().optional(),
  dob: z.coerce.date().optional(),
  // Password change
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8)
    .refine((val) => /[A-Z]/.test(val), { message: "Uppercase required" })
    .refine((val) => /[0-9]/.test(val), { message: "Number required" })
    .refine((val) => /[^a-zA-Z0-9]/.test(val), { message: "Special char required" })
    .optional(),
  // Username change
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  // Email change
  email: z.string().email().optional(),
});

const adminEditSchema = selfEditSchema.extend({
  roleId: z.string().cuid().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  adminNotes: z.string().optional(),
  studentId: z.string().min(5).optional(),
  session: z.string().min(4).optional(),
  departmentId: z.string().cuid().optional(),
  memberType: z.enum(["member", "alumni"]).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Member ID or username is required" }, { status: 400 });
  }

  try {
    const session = await auth();

    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const where = await findMemberByIdOrUsername(id);

    // Fetch the target member first
    const targetMember = await prisma.member.findUnique({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        status: true,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const isOwnProfile =
      session.user.userId === targetMember.id;

    const isAdminWithPermission =
      session.user.isAdmin &&
      session.user.permissions?.["manage_members"] === true;

    // Must be own profile or admin
    if (!isOwnProfile && !isAdminWithPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate based on access level
    let validated: z.infer<typeof adminEditSchema>;

    if (isAdminWithPermission) {
      const result = adminEditSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Validation failed", details: result.error.flatten() },
          { status: 400 }
        );
      }
      validated = result.data;
    } else {
      // Self edit — strip admin-only fields
      const result = selfEditSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Validation failed", details: result.error.flatten() },
          { status: 400 }
        );
      }
      validated = result.data as z.infer<typeof adminEditSchema>;
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Fields both can update
    if (validated.fullName !== undefined) updateData.fullName = validated.fullName;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.address !== undefined) updateData.address = validated.address;
    if (validated.bio !== undefined) updateData.bio = validated.bio;
    if (validated.interests !== undefined) updateData.interests = validated.interests;
    if (validated.skills !== undefined) updateData.skills = validated.skills;
    if (validated.socialLinks !== undefined) updateData.socialLinks = validated.socialLinks;
    if (validated.avatarUrl !== undefined) updateData.avatarUrl = validated.avatarUrl || "";
    if (validated.coverUrl !== undefined) updateData.coverUrl = validated.coverUrl || "";
    if (validated.workplace !== undefined) updateData.workplace = validated.workplace;
    if (validated.gender !== undefined) updateData.gender = validated.gender;
    if (validated.dob !== undefined) updateData.dob = validated.dob;

    // Email uniqueness check
    if (validated.email !== undefined && validated.email !== targetMember.email) {
      const existingEmail = await prisma.member.findFirst({
        where: { email: validated.email, NOT: { id: targetMember.id } },
        select: { id: true },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "Email address is already in use" },
          { status: 409 }
        );
      }
      updateData.email = validated.email;
    }

    // Username uniqueness check
    if (validated.username !== undefined && validated.username !== targetMember.username) {
      const existingUsername = await prisma.member.findFirst({
        where: { username: validated.username, NOT: { id: targetMember.id } },
        select: { id: true },
      });
      if (existingUsername) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 }
        );
      }
      updateData.username = validated.username;
    }

    // Password change
    if (validated.newPassword) {
      if (!isAdminWithPermission) {
        // Self password change requires current password
        if (!validated.currentPassword) {
          return NextResponse.json(
            { error: "Current password is required to change password" },
            { status: 400 }
          );
        }
        const passwordMatch = await bcryptjs.compare(
          validated.currentPassword,
          targetMember.passwordHash
        );
        if (!passwordMatch) {
          return NextResponse.json(
            { error: "Current password is incorrect" },
            { status: 400 }
          );
        }
      }
      updateData.passwordHash = await bcryptjs.hash(validated.newPassword, 12);
    }

    // Admin-only fields
    if (isAdminWithPermission) {
      if (validated.roleId !== undefined) {
        updateData.roleId = validated.roleId;
      }
      if (validated.status !== undefined) {
        updateData.status = validated.status;
      }
      if (validated.adminNotes !== undefined) {
        updateData.adminNotes = validated.adminNotes;
      }
      if (validated.studentId !== undefined) {
        updateData.studentId = validated.studentId;
      }
      if (validated.session !== undefined) {
        updateData.session = validated.session;
      }
      if (validated.departmentId !== undefined) {
        updateData.departmentId = validated.departmentId;
      }
      if (validated.memberType !== undefined) {
        updateData.memberType = validated.memberType;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updatedMember = await prisma.member.update({
      where: { id: targetMember.id },
      data: updateData,
      select: PUBLIC_SELECT,
    });

    // Audit log for admin updates
    if (isAdminWithPermission && !isOwnProfile) {
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

      await logAction({
        adminId: session.user.userId,
        actionType: "MEMBER_UPDATE",
        description: `Updated member profile: ${targetMember.username ?? targetMember.id}`,
        entityType: "Member",
        entityId: targetMember.id,
        ipAddress,
      });
    }

    return NextResponse.json({ data: updatedMember });
  } catch (error) {
    console.error("[PUT /api/members/[id]] Error:", error);

    // Handle Prisma unique constraint violation
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const meta = (error as { meta?: { target?: string[] } }).meta;
      const field = meta?.target?.[0] ?? "field";
      return NextResponse.json(
        { error: `A member with this ${field} already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/members/[id] ─────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Member ID or username is required" }, { status: 400 });
  }

  try {
    const session = await auth();

    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (
      !session.user.isAdmin ||
      session.user.permissions?.["manage_members"] !== true
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where = await findMemberByIdOrUsername(id);

    const targetMember = await prisma.member.findUnique({
      where,
      select: { id: true, username: true, status: true },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent self-deactivation of own admin account
    if (targetMember.id === session.user.userId) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Soft delete — set status to "inactive"
    await prisma.member.update({
      where: { id: targetMember.id },
      data: { status: "inactive" },
    });

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    await logAction({
      adminId: session.user.userId,
      actionType: "MEMBER_DEACTIVATE",
      description: `Deactivated member: ${targetMember.username ?? targetMember.id}`,
      entityType: "Member",
      entityId: targetMember.id,
      ipAddress,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/members/[id]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}