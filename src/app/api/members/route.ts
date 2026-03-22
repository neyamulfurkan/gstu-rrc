// src/app/api/members/route.ts

import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { memberSchema, accountSchema } from "@/lib/validations";
import type { ApiListResponse, MemberPublic } from "@/types/index";
import { generateSlug } from "@/lib/utils";

// ─── GET /api/members ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const isAdminUser =
      session?.user?.isAdmin === true;

    const { searchParams } = request.nextUrl;

    // ── Real-time username availability check ──────────────────────────────
    const checkUsername = searchParams.get("checkUsername");
    if (checkUsername !== null) {
      const existing = await prisma.member.findUnique({
        where: { username: checkUsername.trim().toLowerCase() },
        select: { id: true },
      });
      return NextResponse.json({ available: existing === null });
    }

    // ── Minimal select for useMemberSearch ────────────────────────────────
    const selectMode = searchParams.get("select");
    if (selectMode === "minimal") {
      const searchQuery = searchParams.get("search") ?? "";
      const take = Math.min(
        parseInt(searchParams.get("take") ?? "10", 10),
        50
      );

      const members = await prisma.member.findMany({
        where: {
          status: "active",
          OR: searchQuery.length >= 2
            ? [
                { fullName: { contains: searchQuery, mode: "insensitive" } },
                { username: { contains: searchQuery, mode: "insensitive" } },
              ]
            : undefined,
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
        take,
        orderBy: { fullName: "asc" },
      });

      return NextResponse.json({ data: members, total: members.length });
    }

    // ── Query params ───────────────────────────────────────────────────────
    const search = searchParams.get("search") ?? "";
    const roleId = searchParams.get("roleId");
    const departmentId = searchParams.get("departmentId");
    const sessionParam = searchParams.get("session");
    const memberType = searchParams.get("memberType");
    const statusParam = searchParams.get("status");
    const cursor = searchParams.get("cursor");
    const rawTake = parseInt(searchParams.get("take") ?? "20", 10);
    const take = isNaN(rawTake) ? 20 : Math.min(rawTake, 100);

    // ── Build where clause ─────────────────────────────────────────────────
    const where: Record<string, unknown> = {};

    // Status filter — non-admins can only see active members
    if (statusParam && isAdminUser) {
      (where as Record<string, unknown>).status = statusParam;
    } else {
      (where as Record<string, unknown>).status = "active";
    }

    if (search.trim().length > 0) {
      (where as Record<string, unknown>).OR = [
        { fullName: { contains: search.trim(), mode: "insensitive" } },
        { username: { contains: search.trim(), mode: "insensitive" } },
        { studentId: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    if (roleId) {
      (where as Record<string, unknown>).roleId = roleId;
    }

    if (departmentId) {
      (where as Record<string, unknown>).departmentId = departmentId;
    }

    if (sessionParam) {
      (where as Record<string, unknown>).session = sessionParam;
    }

    if (memberType) {
      (where as Record<string, unknown>).memberType = memberType;
    }

    // ── isAdmin filter (for admin panel use) ──────────────────────────────
    const isAdminFilter = searchParams.get("isAdmin");
    if (isAdminFilter === "true") {
      (where as Record<string, unknown>).isAdmin = true;
    }

    // ── Count total for response ──────────────────────────────────────────
    const total = await prisma.member.count({ where: where as any });

    // ── Fetch paginated members ───────────────────────────────────────────
    const members = await prisma.member.findMany({
      where: where as any,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: isAdminUser,
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
        isAdmin: isAdminUser,
        adminRole: isAdminUser
          ? { select: { id: true, name: true, permissions: true } }
          : false,
      },
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: [{ role: { category: "asc" } }, { fullName: "asc" }],
    });

    let nextCursor: string | undefined;
    const returnedMembers = members;

    if (members.length > take) {
      const nextItem = members[take];
      nextCursor = nextItem.id;
      returnedMembers.splice(take);
    }

    const response: ApiListResponse<MemberPublic> = {
      data: returnedMembers.map((m) => ({
        id: m.id,
        username: m.username,
        fullName: m.fullName,
        avatarUrl: m.avatarUrl ?? "",
        coverUrl: m.coverUrl ?? "",
        department: { name: m.department?.name ?? "" },
        role: {
          name: m.role?.name ?? "Member",
          color: m.role?.color ?? "#7B8DB0",
          category: m.role?.category ?? "general",
        },
        session: m.session,
        memberType: m.memberType,
        skills: Array.isArray(m.skills) ? (m.skills as string[]) : [],
        socialLinks:
          typeof m.socialLinks === "object" &&
          m.socialLinks !== null &&
          !Array.isArray(m.socialLinks)
            ? (m.socialLinks as Record<string, string>)
            : {},
        bio: m.bio ?? null,
        interests: m.interests ?? null,
        createdAt: m.createdAt,
        workplace: m.workplace ?? null,
        email: (m as any).email ?? undefined,
        isAdmin: (m as any).isAdmin ?? false,
        adminRole: (m as any).adminRole ?? null,
        permissions:
          (m as any).adminRole?.permissions &&
          typeof (m as any).adminRole.permissions === "object"
            ? ((m as any).adminRole.permissions as Record<string, boolean>)
            : undefined,
      })),
      nextCursor,
      total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/members] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/members ────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── Auth check ────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const permissions = session.user.permissions as Record<string, boolean>;
    if (!hasPermission(permissions, "manage_members")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // ── Parse and validate body ───────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate personal info fields
    const memberResult = memberSchema.safeParse(body);
    if (!memberResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: memberResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Validate account fields (username + password), skip confirmPassword requirement
    const accountResult = accountSchema.safeParse(body);
    if (!accountResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: accountResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const memberData = memberResult.data;
    const accountData = accountResult.data;
    const bodyRecord = body as Record<string, unknown>;

    // Extract optional admin-specific fields
    const roleId = typeof bodyRecord.roleId === "string" ? bodyRecord.roleId : null;
    const status = typeof bodyRecord.status === "string" ? bodyRecord.status : "active";
    const adminNotes = typeof bodyRecord.adminNotes === "string" ? bodyRecord.adminNotes : null;

    // ── Uniqueness checks ─────────────────────────────────────────────────
    const [existingEmail, existingUsername] = await Promise.all([
      prisma.member.findUnique({
        where: { email: memberData.email.toLowerCase() },
        select: { id: true },
      }),
      prisma.member.findUnique({
        where: { username: accountData.username.toLowerCase() },
        select: { id: true },
      }),
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { error: "A member with this email already exists" },
        { status: 409 }
      );
    }

    if (existingUsername) {
      return NextResponse.json(
        { error: "This username is already taken" },
        { status: 409 }
      );
    }

    // ── If no roleId provided, fetch the default general member role ──────
    let resolvedRoleId: string | null = roleId;
    if (!resolvedRoleId) {
      const defaultRole = await prisma.role.findFirst({
        where: { category: "general" },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      });
      resolvedRoleId = defaultRole?.id ?? null;
    }

    // ── Fetch department to validate ──────────────────────────────────────
    const department = await prisma.department.findUnique({
      where: { id: memberData.departmentId },
      select: { id: true },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Selected department does not exist" },
        { status: 400 }
      );
    }

    // ── Hash password ─────────────────────────────────────────────────────
    const passwordHash = await bcryptjs.hash(accountData.password, 12);

    // ── Create member ─────────────────────────────────────────────────────
    const newMember = await prisma.member.create({
      data: {
        username: accountData.username.toLowerCase().trim().replace(/\s+/g, ""),
        email: memberData.email.toLowerCase().trim(),
        passwordHash,
        fullName: memberData.fullName.trim(),
        studentId: memberData.studentId.trim(),
        phone: memberData.phone.trim(),
        departmentId: memberData.departmentId,
        session: memberData.session.trim(),
        memberType: typeof bodyRecord.memberType === "string" ? bodyRecord.memberType : "member",
        gender: memberData.gender ?? null,
        dob: memberData.dob ?? null,
        address: memberData.address ?? null,
        workplace: memberData.workplace ?? null,
        status,
        adminNotes,
          roleId: resolvedRoleId ?? "",
        skills: [],
        socialLinks: {},
        avatarUrl: "",
        coverUrl: "",
      },
      select: { id: true },
    });

    return NextResponse.json(
      { data: { id: newMember.id }, message: "Member created successfully" },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Prisma unique constraint violation
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const target = (error as { meta?: { target?: string[] } }).meta?.target;
      if (target?.includes("email")) {
        return NextResponse.json(
          { error: "A member with this email already exists" },
          { status: 409 }
        );
      }
      if (target?.includes("username")) {
        return NextResponse.json(
          { error: "This username is already taken" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "A member with this information already exists" },
        { status: 409 }
      );
    }

    console.error("[POST /api/members] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}