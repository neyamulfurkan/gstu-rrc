// src/app/api/admin/[...segments]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasPermission,
  isAdmin,
  isSuperAdmin,
  PERMISSION_LIST,
} from "@/lib/permissions";
import { sendEmail } from "@/lib/resend";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import React from "react";
import type { Session } from "next-auth";

// ─── In-memory rate limit for /search and /export ────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxPerMinute = 30): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count += 1;
  return true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
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
    console.error("[audit-log] Failed to write audit log:", err);
  }
}

async function createNotificationForAdmins(params: {
  type: string;
  title: string;
  body: string;
  link?: string;
  permission: string;
}): Promise<void> {
  try {
    const admins = await prisma.member.findMany({
      where: { isAdmin: true, status: "active" },
      select: {
        id: true,
        adminRole: { select: { permissions: true } },
      },
    });
    const eligible = admins.filter((a) => {
      const perms = a.adminRole?.permissions as Record<string, boolean> | null;
      return perms?.[params.permission] === true;
    });
    if (eligible.length === 0) return;
    await prisma.notification.createMany({
      data: eligible.map((a) => ({
        memberId: a.id,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
      })),
    });
  } catch (err) {
    console.error("[notifications] Failed to create admin notifications:", err);
  }
}

// ─── Route Handler Entry Points ───────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { segments: string[] } }
): Promise<NextResponse> {
  return handleRequest(req, params.segments, "GET");
}

export async function POST(
  req: NextRequest,
  { params }: { params: { segments: string[] } }
): Promise<NextResponse> {
  return handleRequest(req, params.segments, "POST");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { segments: string[] } }
): Promise<NextResponse> {
  return handleRequest(req, params.segments, "PUT");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { segments: string[] } }
): Promise<NextResponse> {
  return handleRequest(req, params.segments, "PATCH");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { segments: string[] } }
): Promise<NextResponse> {
  return handleRequest(req, params.segments, "DELETE");
}

// ─── Main Router ─────────────────────────────────────────────────────────────

async function handleRequest(
  req: NextRequest,
  segments: string[],
  method: string
): Promise<NextResponse> {
  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Top-level auth check
  const session = (await auth()) as Session | null;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [first] = segments;
  const ip = getIp(req);

  try {
    switch (first) {
      case "stats":
        return await handleStats(req, session, method);
      case "audit-log":
        return await handleAuditLog(req, session, method, ip);
      case "roles":
        return await handleRoles(req, session, method);
      case "departments":
        return await handleDepartments(req, session, method);
      case "admin-roles":
        return await handleAdminRoles(req, session, method);
      case "promote":
        return await handlePromote(req, session, method, ip);
      case "revoke-admin":
        return await handleRevokeAdmin(req, session, method, ip);
      case "broadcast-email":
        return await handleBroadcastEmail(req, session, method);
      case "milestones":
        return await handleMilestones(req, session, method, ip);
      case "advisors":
        return await handleAdvisors(req, session, method, ip);
      case "committee":
        return await handleCommittee(req, session, method, ip);
      case "achievements":
        return await handleAchievements(req, session, method, ip);
      case "why-join":
        return await handleWhyJoin(req, session, method, ip);
      case "alumni-spotlight":
        return await handleAlumniSpotlight(req, session, method, ip);
      case "custom-cards":
        return await handleCustomCards(req, session, method, ip);
      case "cert-templates":
        return await handleCertTemplates(req, session, method, ip);
      case "instrument-requests":
        return await handleInstrumentRequests(req, session, method);
      case "member-requests":
        return await handleMemberRequests(req, session, method, ip);
      case "search":
        return await handleSearch(req, session, ip);
      case "email-logs":
        return await handleEmailLogs(req, session, method);
      case "export":
        return await handleExport(req, session);
      case "facebook-oauth":
        return await handleFacebookOAuth(req, session, method, ip);
      case "event-categories":
        return await handleEventCategories(req, session, method, ip);
      case "project-categories":
        return await handleProjectCategories(req, session, method, ip);
      case "gallery-categories":
        return await handleGalleryCategories(req, session, method, ip);
      case "announcements-categories":
      case "announcement-categories":
        return await handleAnnouncementCategories(req, session, method, ip);
      case "instrument-categories":
        return await handleInstrumentCategories(req, session, method, ip);
      default:
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch (err) {
    console.error(`[admin/${first}] Unhandled error (${method}):`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── stats ────────────────────────────────────────────────────────────────────

async function handleStats(
  req: NextRequest,
  session: Session,
  method: string
): Promise<NextResponse> {
  if (method !== "GET") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const detailed = req.nextUrl.searchParams.get("detailed") === "true";
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const safeCount = async (fn: () => Promise<number>): Promise<number> => {
    try { return await fn(); } catch { return 0; }
  };

  const [
    totalMembers,
    pendingApplications,
    totalEvents,
    activeInstruments,
    feedPostsToday,
    pendingGallery,
  ] = await Promise.all([
    safeCount(() => prisma.member.count({ where: { status: "active" } })),
    safeCount(() => prisma.application.count({ where: { status: "pending" } })),
    safeCount(() => prisma.event.count({ where: { isPublished: true } })),
    safeCount(() => prisma.instrument.count({ where: { status: "available" } })),
    safeCount(() => prisma.post.count({ where: { isDeleted: false, createdAt: { gte: todayStart } } })),
    safeCount(() => prisma.galleryItem.count({ where: { status: "pending" } })),
  ]);

  const summary = {
    totalMembers,
    pendingApplications,
    totalEvents,
    activeInstruments,
    feedPostsToday,
    pendingGallery,
  };

  if (!detailed) {
    return NextResponse.json({ data: summary });
  }

  // Last 7 days data for charts
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [memberGrowth, recentEvents, memberTypes, recentApplications] =
    await Promise.all([
      prisma.member.groupBy({
        by: ["createdAt"],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.event.findMany({
        where: { isPublished: true },
        select: { startDate: true },
        orderBy: { startDate: "asc" },
        take: 50,
      }),
      prisma.member.groupBy({
        by: ["memberType"],
        _count: { id: true },
      }),
      prisma.application.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  return NextResponse.json({
    data: {
      ...summary,
      detailed: {
        memberGrowth,
        recentEvents,
        memberTypes,
        recentApplications,
      },
    },
  });
}

// ─── audit-log ────────────────────────────────────────────────────────────────

async function handleAuditLog(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (method === "GET") {
    if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "view_audit_logs")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const sp = req.nextUrl.searchParams;
    const cursor = sp.get("cursor") ?? undefined;
    const take = Math.min(parseInt(sp.get("take") ?? "25", 10), 100);
    const adminSearch = sp.get("admin") ?? undefined;
    const actionType = sp.get("actionType") ?? undefined;
    const dateFrom = sp.get("from") ? new Date(sp.get("from")!) : undefined;
    const dateTo = sp.get("to") ? new Date(sp.get("to")!) : undefined;

    const where: Record<string, unknown> = {};
    if (actionType) where.actionType = actionType;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }
    if (adminSearch) {
      where.admin = {
        OR: [
          { fullName: { contains: adminSearch, mode: "insensitive" } },
          { username: { contains: adminSearch, mode: "insensitive" } },
        ],
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          actionType: true,
          description: true,
          entityType: true,
          entityId: true,
          ipAddress: true,
          createdAt: true,
          admin: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
              adminRole: { select: { name: true } },
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const hasMore = logs.length > take;
    const data = hasMore ? logs.slice(0, take) : logs;
    const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

    return NextResponse.json({ data, nextCursor, total });
  }

  if (method === "POST") {
    // From useAuditLog hook — any admin can log
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { actionType, description, entityType, entityId } = body as {
      actionType?: string;
      description?: string;
      entityType?: string;
      entityId?: string;
    };
    if (!actionType || !description) {
      return NextResponse.json(
        { error: "actionType and description are required" },
        { status: 400 }
      );
    }
    await logAction({
      adminId: session.user.userId,
      actionType,
      description,
      entityType,
      entityId,
      ipAddress: ip,
    });
    return NextResponse.json({ data: { ok: true } }, { status: 201 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── roles ────────────────────────────────────────────────────────────────────

async function handleRoles(
  req: NextRequest,
  session: Session,
  method: string
): Promise<NextResponse> {
  if (method === "GET") {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        category: true,
        sortOrder: true,
        _count: { select: { members: true } },
      },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ data: roles });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { name, color, category, sortOrder } = body as {
      name?: string;
      color?: string;
      category?: string;
      sortOrder?: number;
    };
    if (!name || !color || !category) {
      return NextResponse.json(
        { error: "name, color, and category are required" },
        { status: 400 }
      );
    }
    try {
      const role = await prisma.role.create({
        data: { name, color, category, sortOrder: sortOrder ?? 99 },
        select: { id: true, name: true, color: true, category: true, sortOrder: true },
      });
      return NextResponse.json({ data: role }, { status: 201 });
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === "P2002") {
        return NextResponse.json(
          { error: "A role with that name already exists" },
          { status: 409 }
        );
      }
      throw err;
    }
  }

  if (method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, name, color, category, sortOrder } = body as {
      id?: string;
      name?: string;
      color?: string;
      category?: string;
      sortOrder?: number;
    };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
        ...(category ? { category } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      },
      select: { id: true, name: true, color: true, category: true, sortOrder: true },
    });
    return NextResponse.json({ data: role });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const memberCount = await prisma.member.count({ where: { roleId: id } });
    if (memberCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a role that has members assigned" },
        { status: 409 }
      );
    }
    await prisma.role.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── departments ──────────────────────────────────────────────────────────────

async function handleDepartments(
  req: NextRequest,
  session: Session,
  method: string
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (method === "GET") {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: departments });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { name, shortName } = body as { name?: string; shortName?: string };
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    try {
      const dept = await prisma.department.create({
        data: { name },
        select: { id: true, name: true },
      });
      return NextResponse.json({ data: dept }, { status: 201 });
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === "P2002") {
        return NextResponse.json(
          { error: "A department with that name already exists" },
          { status: 409 }
        );
      }
      throw err;
    }
  }

  if (method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, name, shortName } = body as {
      id?: string;
      name?: string;
      shortName?: string;
    };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const dept = await prisma.department.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
      },
      select: { id: true, name: true },
    });
    return NextResponse.json({ data: dept });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const count = await prisma.member.count({ where: { departmentId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: "Cannot delete a department with members" },
        { status: 409 }
      );
    }
    await prisma.department.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── admin-roles ──────────────────────────────────────────────────────────────

async function handleAdminRoles(
  req: NextRequest,
  session: Session,
  method: string
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_admins") && !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (method === "GET") {
    const adminRoles = await prisma.adminRole.findMany({
      select: {
        id: true,
        name: true,
        permissions: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: adminRoles });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { name, permissions } = body as {
      name?: string;
      permissions?: Record<string, boolean>;
    };
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const defaultPerms: Record<string, boolean> = {};
    for (const p of PERMISSION_LIST) {
      defaultPerms[p] = false;
    }
    const merged = { ...defaultPerms, ...(permissions ?? {}) };
    try {
      const adminRole = await prisma.adminRole.create({
        data: { name, permissions: merged },
        select: { id: true, name: true, permissions: true },
      });
      return NextResponse.json({ data: adminRole }, { status: 201 });
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === "P2002") {
        return NextResponse.json(
          { error: "An admin role with that name already exists" },
          { status: 409 }
        );
      }
      throw err;
    }
  }

  if (method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Bulk update: { roles: Array<{ id, permissions }> }
    const { roles, id, name, permissions } = body as {
      roles?: Array<{ id: string; permissions: Record<string, boolean> }>;
      id?: string;
      name?: string;
      permissions?: Record<string, boolean>;
    };

    if (Array.isArray(roles)) {
      // Bulk permission matrix save
      const updates = await Promise.all(
        roles.map((r) =>
          prisma.adminRole.update({
            where: { id: r.id },
            data: { permissions: r.permissions },
            select: { id: true, name: true, permissions: true },
          })
        )
      );
      return NextResponse.json({ data: updates });
    }

    // Single update
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const adminRole = await prisma.adminRole.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(permissions ? { permissions } : {}),
      },
      select: { id: true, name: true, permissions: true },
    });
    return NextResponse.json({ data: adminRole });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const count = await prisma.member.count({ where: { adminRoleId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: "Cannot delete an admin role with assigned members" },
        { status: 409 }
      );
    }
    await prisma.adminRole.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── promote ──────────────────────────────────────────────────────────────────

async function handlePromote(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_admins")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { memberId, adminRoleId } = body as {
    memberId?: string;
    adminRoleId?: string;
  };
  if (!memberId || !adminRoleId) {
    return NextResponse.json(
      { error: "memberId and adminRoleId are required" },
      { status: 400 }
    );
  }
  const member = await prisma.member.update({
    where: { id: memberId },
    data: { isAdmin: true, adminRoleId },
    select: { id: true, fullName: true, username: true },
  });
  await logAction({
    adminId: session.user.userId,
    actionType: "promote_admin",
    description: `Promoted ${member.fullName} (${member.username}) to admin`,
    entityType: "member",
    entityId: member.id,
    ipAddress: ip,
  });
  return NextResponse.json({ data: member });
}

// ─── revoke-admin ─────────────────────────────────────────────────────────────

async function handleRevokeAdmin(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_admins")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { memberId } = body as { memberId?: string };
  if (!memberId) {
    return NextResponse.json(
      { error: "memberId is required" },
      { status: 400 }
    );
  }
  const member = await prisma.member.update({
    where: { id: memberId },
    data: { isAdmin: false, adminRoleId: null },
    select: { id: true, fullName: true, username: true },
  });
  await logAction({
    adminId: session.user.userId,
    actionType: "revoke_admin",
    description: `Revoked admin from ${member.fullName} (${member.username})`,
    entityType: "member",
    entityId: member.id,
    ipAddress: ip,
  });
  return NextResponse.json({ data: member });
}

// ─── broadcast-email ──────────────────────────────────────────────────────────

async function handleBroadcastEmail(
  req: NextRequest,
  session: Session,
  method: string
): Promise<NextResponse> {
  if (method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "send_emails")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { subject, html, roleId } = body as {
    subject?: string;
    html?: string;
    roleId?: string;
  };
  if (!subject || !html) {
    return NextResponse.json(
      { error: "subject and html are required" },
      { status: 400 }
    );
  }

  const members = await prisma.member.findMany({
    where: {
      status: "active",
      ...(roleId ? { roleId } : {}),
    },
    select: { email: true, fullName: true },
  });

  let sent = 0;
  let failed = 0;

  // Send in batches to avoid overwhelming Resend
  const batchSize = 10;
  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (m) => {
        try {
          await sendEmail({
            to: m.email,
            subject,
            reactComponent: React.createElement("div", { dangerouslySetInnerHTML: { __html: html } }) as React.ReactElement,
          });
          sent++;
        } catch {
          failed++;
        }
      })
    );
  }

  return NextResponse.json({ data: { sent, failed, total: members.length } });
}

// ─── milestones ───────────────────────────────────────────────────────────────

async function handleMilestones(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_club_config")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (method === "GET") {
    const milestones = await prisma.clubMilestone.findMany({
      select: {
        id: true,
        date: true,
        title: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ data: milestones });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { date, title, description, imageUrl, sortOrder } = body as {
      date?: string;
      title?: string;
      description?: string;
      imageUrl?: string;
      sortOrder?: number;
    };
    if (!date || !title || !description) {
      return NextResponse.json(
        { error: "date, title, and description are required" },
        { status: 400 }
      );
    }
    const milestone = await prisma.clubMilestone.create({
      data: {
        date,
        title,
        description,
        imageUrl: imageUrl ?? null,
        sortOrder: sortOrder ?? 99,
      },
      select: { id: true, date: true, title: true, description: true, imageUrl: true, sortOrder: true },
    });
    await logAction({
      adminId: session.user.userId,
      actionType: "create_milestone",
      description: `Created milestone: ${title}`,
      entityType: "milestone",
      entityId: milestone.id,
      ipAddress: ip,
    });
    return NextResponse.json({ data: milestone }, { status: 201 });
  }

  if (method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, date, title, description, imageUrl, sortOrder } = body as {
      id?: string;
      date?: string;
      title?: string;
      description?: string;
      imageUrl?: string;
      sortOrder?: number;
    };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const milestone = await prisma.clubMilestone.update({
      where: { id },
      data: {
        ...(date ? { date } : {}),
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      },
      select: { id: true, date: true, title: true, description: true, imageUrl: true, sortOrder: true },
    });
    return NextResponse.json({ data: milestone });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await prisma.clubMilestone.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── advisors ─────────────────────────────────────────────────────────────────

async function handleAdvisors(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (method === "GET") {
    const advisors = await prisma.advisor.findMany({
      select: {
        id: true,
        name: true,
        designation: true,
        institution: true,
        photoUrl: true,
        bio: true,
        researchInterests: true,
        email: true,
        socialLinks: true,
        isCurrent: true,
        periodStart: true,
        periodEnd: true,
      },
      orderBy: [{ isCurrent: "desc" }, { periodStart: "desc" }],
    });
    return NextResponse.json({ data: advisors });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const {
      name,
      designation,
      institution,
      photoUrl,
      bio,
      researchInterests,
      email,
      socialLinks,
      isCurrent,
      periodStart,
      periodEnd,
    } = body as {
      name?: string;
      designation?: string;
      institution?: string;
      photoUrl?: string;
      bio?: string;
      researchInterests?: string[];
      email?: string;
      socialLinks?: Record<string, string>;
      isCurrent?: boolean;
      periodStart?: number;
      periodEnd?: number;
    };
    if (!name || !designation || !institution) {
      return NextResponse.json(
        { error: "name, designation, and institution are required" },
        { status: 400 }
      );
    }
    const advisor = await prisma.advisor.create({
      data: {
        name,
        designation,
        institution,
        photoUrl: photoUrl ?? "",
        bio: bio ?? "",
        researchInterests: researchInterests ?? [],
        email: email ?? null,
        socialLinks: socialLinks ?? {},
        isCurrent: isCurrent ?? true,
        periodStart: periodStart ?? null,
        periodEnd: periodEnd ?? null,
      },
      select: {
        id: true,
        name: true,
        designation: true,
        institution: true,
        photoUrl: true,
        bio: true,
        researchInterests: true,
        email: true,
        socialLinks: true,
        isCurrent: true,
        periodStart: true,
        periodEnd: true,
      },
    });
    await logAction({
      adminId: session.user.userId,
      actionType: "create_advisor",
      description: `Created advisor: ${name}`,
      entityType: "advisor",
      entityId: advisor.id,
      ipAddress: ip,
    });
    return NextResponse.json({ data: advisor }, { status: 201 });
  }

  if (method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, ...rest } = body as { id?: string } & Record<string, unknown>;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const advisor = await prisma.advisor.update({
      where: { id },
      data: rest as Parameters<typeof prisma.advisor.update>[0]["data"],
      select: {
        id: true,
        name: true,
        designation: true,
        institution: true,
        photoUrl: true,
        bio: true,
        researchInterests: true,
        email: true,
        socialLinks: true,
        isCurrent: true,
        periodStart: true,
        periodEnd: true,
      },
    });
    return NextResponse.json({ data: advisor });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await prisma.advisor.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── committee ────────────────────────────────────────────────────────────────

async function handleCommittee(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (method === "GET") {
    const all = await prisma.committeeMember.findMany({
      select: {
        id: true,
        memberId: true,
        memberName: true,
        designation: true,
        committeeType: true,
        sortOrder: true,
        session: true,
        member: {
          select: { username: true, avatarUrl: true, fullName: true },
        },
      },
      orderBy: [{ committeeType: "asc" }, { sortOrder: "asc" }],
    });

    const executive = all.filter((c) => c.committeeType === "executive");
    const subExecutive = all.filter((c) => c.committeeType === "sub_executive");
    const exCommittee = all.filter((c) => c.committeeType === "ex_committee");

    return NextResponse.json({ data: { executive, subExecutive, exCommittee } });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Support bulk replace: { replaceAll: true, items: [...] }
    const { replaceAll, items, ...single } = body as {
      replaceAll?: boolean;
      items?: Array<{
        memberId?: string;
        memberName: string;
        designation: string;
        committeeType: string;
        sortOrder?: number;
        sessionYear?: string;
      }>;
      memberId?: string;
      memberName?: string;
      designation?: string;
      committeeType?: string;
      sortOrder?: number;
      sessionYear?: string;
    };

    if (replaceAll && Array.isArray(items)) {
      // For ex_committee, delete only the specific session being replaced
      // For executive/sub_executive, delete all of that type (no session grouping)
      const currentTypes = [...new Set(items.map((i) => i.committeeType))];
      const isExCommittee = currentTypes.includes("ex_committee");

      if (isExCommittee) {
        // Group items by sessionYear so we only replace the targeted session(s)
        const sessionLabels = [...new Set(items.map((i) => i.sessionYear ?? null))];
        await prisma.$transaction([
          prisma.committeeMember.deleteMany({
            where: {
              committeeType: "ex_committee",
              session: { in: sessionLabels as string[] },
            },
          }),
          prisma.committeeMember.createMany({
            data: items.map((item, idx) => ({
              memberId: item.memberId ?? null,
              memberName: item.memberName,
              designation: item.designation,
              committeeType: item.committeeType,
              sortOrder: item.sortOrder ?? idx,
              session: item.sessionYear ?? null,
            })),
          }),
        ]);
      } else {
        await prisma.$transaction([
          prisma.committeeMember.deleteMany({
            where: { committeeType: { in: currentTypes } },
          }),
          prisma.committeeMember.createMany({
            data: items.map((item, idx) => ({
              memberId: item.memberId ?? null,
              memberName: item.memberName,
              designation: item.designation,
              committeeType: item.committeeType,
              sortOrder: item.sortOrder ?? idx,
              session: item.sessionYear ?? null,
            })),
          }),
        ]);
      }

      await logAction({
        adminId: session.user.userId,
        actionType: "update_committee",
        description: `Replaced committee members (${items.length} entries)`,
        entityType: "committee",
        ipAddress: ip,
      });
      return NextResponse.json({ data: { ok: true } });
    }

    // Single create
    const { memberId, memberName, designation, committeeType, sortOrder, sessionYear } =
      single as {
        memberId?: string;
        memberName?: string;
        designation?: string;
        committeeType?: string;
        sortOrder?: number;
        sessionYear?: string;
      };
    if (!memberName || !designation || !committeeType) {
      return NextResponse.json(
        { error: "memberName, designation, and committeeType are required" },
        { status: 400 }
      );
    }
    const member = await prisma.committeeMember.create({
      data: {
        memberId: memberId ?? null,
        memberName,
        designation,
        committeeType,
        sortOrder: sortOrder ?? 99,
        session: sessionYear ?? null,
      },
      select: {
        id: true,
        memberId: true,
        memberName: true,
        designation: true,
        committeeType: true,
        sortOrder: true,
        member: { select: { username: true, avatarUrl: true, fullName: true } },
      },
    });
    return NextResponse.json({ data: member }, { status: 201 });
  }

  if (method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, ...rest } = body as { id?: string } & Record<string, unknown>;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const cm = await prisma.committeeMember.update({
      where: { id },
      data: rest as Parameters<typeof prisma.committeeMember.update>[0]["data"],
      select: {
        id: true,
        memberId: true,
        memberName: true,
        designation: true,
        committeeType: true,
        sortOrder: true,
      },
    });
    return NextResponse.json({ data: cm });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await prisma.committeeMember.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── achievements ─────────────────────────────────────────────────────────────

async function handleAchievements(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_club_config")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (method === "GET") {
    const achievements = await prisma.achievement.findMany({
      select: {
        id: true,
        icon: true,
        title: true,
        description: true,
        year: true,
        link: true,
        sortOrder: true,
      },
      orderBy: [{ year: "desc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ data: achievements });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { icon, title, description, year, link, sortOrder } = body as {
      icon?: string;
      title?: string;
      description?: string;
      year?: number;
      link?: string;
      sortOrder?: number;
    };
    if (!title || !description || !year) {
      return NextResponse.json(
        { error: "title, description, and year are required" },
        { status: 400 }
      );
    }
    const achievement = await prisma.achievement.create({
      data: {
        icon: icon ?? "Trophy",
        title,
        description,
        year,
        link: link ?? null,
        sortOrder: sortOrder ?? 99,
      },
      select: { id: true, icon: true, title: true, description: true, year: true, link: true, sortOrder: true },
    });
    await logAction({
      adminId: session.user.userId,
      actionType: "create_achievement",
      description: `Created achievement: ${title}`,
      entityType: "achievement",
      entityId: achievement.id,
      ipAddress: ip,
    });
    return NextResponse.json({ data: achievement }, { status: 201 });
  }

  if (method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, ...rest } = body as { id?: string } & Record<string, unknown>;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const achievement = await prisma.achievement.update({
      where: { id },
      data: rest as Parameters<typeof prisma.achievement.update>[0]["data"],
      select: { id: true, icon: true, title: true, description: true, year: true, link: true, sortOrder: true },
    });
    return NextResponse.json({ data: achievement });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await prisma.achievement.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── why-join ─────────────────────────────────────────────────────────────────

async function handleWhyJoin(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_club_config")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (method === "GET") {
    const cards = await prisma.whyJoinCard.findMany({
      select: {
        id: true,
        icon: true,
        heading: true,
        description: true,
        learnMoreUrl: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ data: cards });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { icon, heading, description, learnMoreUrl, sortOrder } = body as {
      icon?: string;
      heading?: string;
      description?: string;
      learnMoreUrl?: string;
      sortOrder?: number;
    };
    if (!heading || !description) {
      return NextResponse.json(
        { error: "heading and description are required" },
        { status: 400 }
      );
    }
    const card = await prisma.whyJoinCard.create({
      data: {
        icon: icon ?? "Star",
        heading,
        description,
        learnMoreUrl: learnMoreUrl ?? null,
        sortOrder: sortOrder ?? 99,
      },
      select: { id: true, icon: true, heading: true, description: true, learnMoreUrl: true, sortOrder: true },
    });
    await logAction({
      adminId: session.user.userId,
      actionType: "create_why_join_card",
      description: `Created why-join card: ${heading}`,
      entityType: "why_join_card",
      entityId: card.id,
      ipAddress: ip,
    });
    return NextResponse.json({ data: card }, { status: 201 });
  }

  if (method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, ...rest } = body as { id?: string } & Record<string, unknown>;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const card = await prisma.whyJoinCard.update({
      where: { id },
      data: rest as Parameters<typeof prisma.whyJoinCard.update>[0]["data"],
      select: { id: true, icon: true, heading: true, description: true, learnMoreUrl: true, sortOrder: true },
    });
    return NextResponse.json({ data: card });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await prisma.whyJoinCard.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── alumni-spotlight ─────────────────────────────────────────────────────────

async function handleAlumniSpotlight(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (method === "GET") {
    const spotlights = await prisma.alumniSpotlight.findMany({
      select: {
        id: true,
        name: true,
        position: true,
        company: true,
        quote: true,
        photoUrl: true,
        session: true,
        memberId: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ data: spotlights });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { name, position, company, quote, photoUrl, session: alumniSession, memberId, sortOrder } =
      body as {
        name?: string;
        position?: string;
        company?: string;
        quote?: string;
        photoUrl?: string;
        session?: string;
        memberId?: string;
        sortOrder?: number;
      };
    if (!name || !position || !company || !quote) {
      return NextResponse.json(
        { error: "name, position, company, and quote are required" },
        { status: 400 }
      );
    }
    const spotlight = await prisma.alumniSpotlight.create({
      data: {
        name,
        position,
        company,
        quote,
        photoUrl: photoUrl ?? "",
        session: alumniSession ?? "",
        memberId: memberId ?? null,
        sortOrder: sortOrder ?? 99,
      },
      select: { id: true, name: true, position: true, company: true, quote: true, photoUrl: true, session: true, memberId: true, sortOrder: true },
    });
    await logAction({
      adminId: session.user.userId,
      actionType: "create_alumni_spotlight",
      description: `Created alumni spotlight: ${name}`,
      entityType: "alumni_spotlight",
      entityId: spotlight.id,
      ipAddress: ip,
    });
    return NextResponse.json({ data: spotlight }, { status: 201 });
  }

  if (method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, ...rest } = body as { id?: string } & Record<string, unknown>;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const spotlight = await prisma.alumniSpotlight.update({
      where: { id },
      data: rest as Parameters<typeof prisma.alumniSpotlight.update>[0]["data"],
      select: { id: true, name: true, position: true, company: true, quote: true, photoUrl: true, session: true, memberId: true, sortOrder: true },
    });
    return NextResponse.json({ data: spotlight });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await prisma.alumniSpotlight.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── custom-cards ─────────────────────────────────────────────────────────────

async function handleCustomCards(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_club_config")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;

  if (method === "GET") {
    const targetPage = sp.get("targetPage") ?? undefined;
    const sections = await prisma.customCardSection.findMany({
      where: targetPage ? { targetPage } : undefined,
      select: {
        id: true,
        targetPage: true,
        heading: true,
        subtitle: true,
        position: true,
        isPublished: true,
        sortOrder: true,
        cards: {
          select: {
            id: true,
            heading: true,
            description: true,
            imageUrl: true,
            buttonLabel: true,
            buttonUrl: true,
            buttonStyle: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ data: sections });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { type, sectionId, ...rest } = body as {
      type?: "section" | "card";
      sectionId?: string;
    } & Record<string, unknown>;

    if (type === "card" && sectionId) {
      const { heading, description, imageUrl, buttonLabel, buttonUrl, buttonStyle, sortOrder } =
        rest as {
          heading?: string;
          description?: unknown;
          imageUrl?: string;
          buttonLabel?: string;
          buttonUrl?: string;
          buttonStyle?: string;
          sortOrder?: number;
        };
      if (!heading) {
        return NextResponse.json({ error: "heading is required" }, { status: 400 });
      }
      const card = await prisma.customCard.create({
        data: {
          sectionId,
          heading,
          description: description !== undefined ? (description as object) : {},
          imageUrl: imageUrl ?? null,
          buttonLabel: buttonLabel ?? null,
          buttonUrl: buttonUrl ?? null,
          buttonStyle: buttonStyle ?? null,
          sortOrder: sortOrder ?? 99,
        },
        select: { id: true, heading: true, description: true, imageUrl: true, buttonLabel: true, buttonUrl: true, buttonStyle: true, sortOrder: true },
      });
      return NextResponse.json({ data: card }, { status: 201 });
    }

    // Default: create section
    const { targetPage, heading, subtitle, position, isPublished, sortOrder } = rest as {
      targetPage?: string;
      heading?: string;
      subtitle?: string;
      position?: string;
      isPublished?: boolean;
      sortOrder?: number;
    };
    if (!targetPage || !position) {
      return NextResponse.json({ error: "targetPage and position are required" }, { status: 400 });
    }
    const section = await prisma.customCardSection.create({
      data: {
        targetPage,
        heading: heading ?? null,
        subtitle: subtitle ?? null,
        position,
        isPublished: isPublished ?? false,
        sortOrder: sortOrder ?? 99,
      },
      select: { id: true, targetPage: true, heading: true, subtitle: true, position: true, isPublished: true, sortOrder: true },
    });
    await logAction({
      adminId: session.user.userId,
      actionType: "create_custom_card_section",
      description: `Created custom card section for page: ${targetPage}`,
      entityType: "custom_card_section",
      entityId: section.id,
      ipAddress: ip,
    });
    return NextResponse.json({ data: section }, { status: 201 });
  }

  if (method === "PATCH") {
    // Publish toggle: { sectionId, isPublished }
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { sectionId, isPublished } = body as { sectionId?: string; isPublished?: boolean };
    if (!sectionId || isPublished === undefined) {
      return NextResponse.json({ error: "sectionId and isPublished are required" }, { status: 400 });
    }
    if (sectionId.startsWith("temp_")) {
      return NextResponse.json({ data: { id: sectionId, isPublished } });
    }
    const section = await prisma.customCardSection.update({
      where: { id: sectionId },
      data: { isPublished },
      select: { id: true, isPublished: true },
    });
    return NextResponse.json({ data: section });
  }

  if (method === "PUT") {
    // Bulk upsert: { targetPage, sections: [...] }
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { targetPage, sections: incomingSections, id, entityType: eType, ...rest } = body as {
      targetPage?: string;
      sections?: Array<{
        id: string;
        heading: string;
        subtitle?: string | null;
        position: string;
        isPublished: boolean;
        sortOrder: number;
        cards: Array<{
          id: string;
          heading: string;
          description?: unknown;
          imageUrl?: string | null;
          buttonLabel?: string | null;
          buttonUrl?: string | null;
          buttonStyle?: string | null;
          sortOrder: number;
        }>;
      }>;
      id?: string;
      entityType?: "section" | "card";
    } & Record<string, unknown>;

    // Bulk save path
    if (targetPage && Array.isArray(incomingSections)) {
      // Fetch existing section IDs for this page
      const existing = await prisma.customCardSection.findMany({
        where: { targetPage },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((s) => s.id));

      for (const sec of incomingSections) {
        const isTemp = sec.id.startsWith("temp_");
        if (isTemp) {
          // Create new section
          const created = await prisma.customCardSection.create({
            data: {
              targetPage,
              heading: sec.heading ?? null,
              subtitle: sec.subtitle ?? null,
              position: sec.position,
              isPublished: sec.isPublished,
              sortOrder: sec.sortOrder,
            },
            select: { id: true },
          });
          // Create its cards
          for (const card of sec.cards ?? []) {
            await prisma.customCard.create({
              data: {
                sectionId: created.id,
                heading: card.heading ?? "",
                description: (card.description ?? {}) as object,
                imageUrl: card.imageUrl ?? null,
                buttonLabel: card.buttonLabel ?? null,
                buttonUrl: card.buttonUrl ?? null,
                buttonStyle: card.buttonStyle ?? null,
                sortOrder: card.sortOrder,
              },
            });
          }
        } else {
          // Update existing section
          await prisma.customCardSection.update({
            where: { id: sec.id },
            data: {
              heading: sec.heading ?? null,
              subtitle: sec.subtitle ?? null,
              position: sec.position,
              isPublished: sec.isPublished,
              sortOrder: sec.sortOrder,
            },
          });
          // Delete removed cards then upsert remaining
          const incomingCardIds = sec.cards.filter((c) => !c.id.startsWith("temp_")).map((c) => c.id);
          if (incomingCardIds.length > 0) {
            await prisma.customCard.deleteMany({
              where: { sectionId: sec.id, id: { notIn: incomingCardIds } },
            });
          } else {
            await prisma.customCard.deleteMany({
              where: { sectionId: sec.id },
            });
          }
          for (const card of sec.cards ?? []) {
            const isCardTemp = card.id.startsWith("temp_");
            if (isCardTemp) {
              await prisma.customCard.create({
                data: {
                  sectionId: sec.id,
                  heading: card.heading ?? "",
                  description: (card.description !== null && card.description !== undefined ? card.description : {}) as object,
                  imageUrl: card.imageUrl ?? null,
                  buttonLabel: card.buttonLabel ?? null,
                  buttonUrl: card.buttonUrl ?? null,
                  buttonStyle: card.buttonStyle ?? null,
                  sortOrder: card.sortOrder,
                },
              });
            } else {
              await prisma.customCard.update({
                where: { id: card.id },
                data: {
                  heading: card.heading ?? "",
                  description: (card.description ?? {}) as object,
                  imageUrl: card.imageUrl ?? null,
                  buttonLabel: card.buttonLabel ?? null,
                  buttonUrl: card.buttonUrl ?? null,
                  buttonStyle: card.buttonStyle ?? null,
                  sortOrder: card.sortOrder,
                },
              });
            }
          }
          existingIds.delete(sec.id);
        }
      }

      // Delete sections that were removed locally
      const incomingRealIds = incomingSections.filter((s) => !s.id.startsWith("temp_")).map((s) => s.id);
      if (incomingRealIds.length > 0) {
        await prisma.customCardSection.deleteMany({
          where: { targetPage, id: { notIn: incomingRealIds } },
        });
      } else {
        // All remaining sections are new (temp ids) — delete all old ones for this page
        const allExistingIds = existing.map((s) => s.id);
        if (allExistingIds.length > 0) {
          await prisma.customCardSection.deleteMany({
            where: { targetPage, id: { in: allExistingIds } },
          });
        }
      }

      await logAction({
        adminId: session.user.userId,
        actionType: "save_custom_cards",
        description: `Saved custom cards for page: ${targetPage}`,
        entityType: "custom_card_section",
        ipAddress: ip,
      });

      const updated = await prisma.customCardSection.findMany({
        where: { targetPage },
        select: {
          id: true, targetPage: true, heading: true, subtitle: true,
          position: true, isPublished: true, sortOrder: true,
          cards: {
            select: { id: true, heading: true, description: true, imageUrl: true, buttonLabel: true, buttonUrl: true, buttonStyle: true, sortOrder: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });
      return NextResponse.json({ data: updated });
    }

    // Single section/card update fallback
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (eType === "card") {
      const card = await prisma.customCard.update({
        where: { id },
        data: rest as Parameters<typeof prisma.customCard.update>[0]["data"],
        select: { id: true, heading: true, description: true, imageUrl: true, buttonLabel: true, buttonUrl: true, buttonStyle: true, sortOrder: true },
      });
      return NextResponse.json({ data: card });
    }
    const section = await prisma.customCardSection.update({
      where: { id },
      data: rest as Parameters<typeof prisma.customCardSection.update>[0]["data"],
      select: { id: true, targetPage: true, heading: true, subtitle: true, position: true, isPublished: true, sortOrder: true },
    });
    return NextResponse.json({ data: section });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, entityType: eType } = body as { id?: string; entityType?: "section" | "card" };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (eType === "card") {
      await prisma.customCard.delete({ where: { id } });
    } else {
      await prisma.customCardSection.delete({ where: { id } });
    }
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── cert-templates ───────────────────────────────────────────────────────────

async function handleCertTemplates(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_certificates")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (method === "GET") {
    const templates = await prisma.certificateTemplate.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        htmlContent: true,
        cssContent: true,
        previewUrl: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: templates });
  }

  if (method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { name, type, htmlContent, cssContent, previewUrl } = body as {
      name?: string;
      type?: string;
      htmlContent?: string;
      cssContent?: string;
      previewUrl?: string;
    };
    if (!name || !type || !htmlContent) {
      return NextResponse.json(
        { error: "name, type, and htmlContent are required" },
        { status: 400 }
      );
    }
    const template = await prisma.certificateTemplate.create({
      data: {
        name,
        type,
        htmlContent,
        cssContent: cssContent ?? "",
        previewUrl: previewUrl ?? null,
      },
      select: { id: true, name: true, type: true, htmlContent: true, cssContent: true, previewUrl: true, createdAt: true },
    });
    await logAction({
      adminId: session.user.userId,
      actionType: "create_cert_template",
      description: `Created certificate template: ${name}`,
      entityType: "certificate_template",
      entityId: template.id,
      ipAddress: ip,
    });
    return NextResponse.json({ data: template }, { status: 201 });
  }

  if (method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, ...rest } = body as { id?: string } & Record<string, unknown>;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const template = await prisma.certificateTemplate.update({
      where: { id },
      data: rest as Parameters<typeof prisma.certificateTemplate.update>[0]["data"],
      select: { id: true, name: true, type: true, htmlContent: true, cssContent: true, previewUrl: true, createdAt: true },
    });
    return NextResponse.json({ data: template });
  }

  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id } = body as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    // Guard: check if template has issued certificates
    const certCount = await prisma.certificate.count({ where: { templateId: id } });
    if (certCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a template that has issued certificates" },
        { status: 409 }
      );
    }
    await prisma.certificateTemplate.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── instrument-requests ──────────────────────────────────────────────────────

async function handleInstrumentRequests(
  req: NextRequest,
  session: Session,
  method: string
): Promise<NextResponse> {
  if (method !== "GET") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "manage_instruments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? undefined;
  const cursor = sp.get("cursor") ?? undefined;
  const take = Math.min(parseInt(sp.get("take") ?? "25", 10), 100);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [requests, total] = await Promise.all([
    prisma.borrowRequest.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        purpose: true,
        borrowDate: true,
        returnDate: true,
        status: true,
        adminNote: true,
        createdAt: true,
        instrument: { select: { id: true, name: true, imageUrl: true } },
        requester: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
    }),
    prisma.borrowRequest.count({ where }),
  ]);

  const hasMore = requests.length > take;
  const data = hasMore ? requests.slice(0, take) : requests;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

  return NextResponse.json({ data, nextCursor, total });
}

// ─── member-requests ──────────────────────────────────────────────────────────

async function handleMemberRequests(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (method === "GET") {
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // AdminRoleRequest model may not exist — return empty array gracefully
    let requests: unknown[] = [];
    try {
      requests = await (prisma as any).adminRoleRequest.findMany({
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
        member: { select: { id: true, fullName: true, username: true, avatarUrl: true, department: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      });
    } catch {
      // Table doesn't exist yet — return empty
    }
    return NextResponse.json({ data: requests });
  }

  if (method === "POST") {
    // Member submitting an admin role request
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { reason } = body as { reason?: string };
    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }
    // Check for existing pending request
    const existing = await (prisma as any).adminRoleRequest.findFirst({
      where: { memberId: session.user.userId, status: "pending" },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have a pending admin role request" },
        { status: 409 }
      );
    }
    const request = await (prisma as any).adminRoleRequest.create({
      data: { memberId: session.user.userId, reason, status: "pending" },
      select: { id: true, status: true, reason: true, createdAt: true },
    });
    await createNotificationForAdmins({
      type: "admin_role_request",
      title: "New Admin Role Request",
      body: `${session.user.fullName} has requested admin access.`,
      link: "/admin/roles",
      permission: "manage_admins",
    });
    return NextResponse.json({ data: request }, { status: 201 });
  }

  if (method === "PATCH") {
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, action, adminRoleId } = body as {
      id?: string;
      action?: "approve" | "reject";
      adminRoleId?: string;
    };
    if (!id || !action) {
      return NextResponse.json({ error: "id and action are required" }, { status: 400 });
    }
    const request = await (prisma as any).adminRoleRequest.findUnique({
      where: { id },
      select: { id: true, memberId: true, status: true },
    });
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (request.status !== "pending") {
      return NextResponse.json({ error: "Request already processed" }, { status: 409 });
    }
    if (action === "approve") {
      if (!adminRoleId) {
        return NextResponse.json({ error: "adminRoleId is required for approval" }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.member.update({
          where: { id: request.memberId },
          data: { isAdmin: true, adminRoleId },
        }),
        (prisma as any).adminRoleRequest.update({
          where: { id },
          data: { status: "approved" },
        }),
      ]);
    } else {
      await (prisma as any).adminRoleRequest.update({
        where: { id },
        data: { status: "rejected" },
      });
    }
    await logAction({
      adminId: session.user.userId,
      actionType: `${action}_admin_request`,
      description: `${action === "approve" ? "Approved" : "Rejected"} admin role request`,
      entityType: "admin_role_request",
      entityId: id,
      ipAddress: ip,
    });
    return NextResponse.json({ data: { ok: true } });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── search ───────────────────────────────────────────────────────────────────

async function handleSearch(
  req: NextRequest,
  session: Session,
  ip: string
): Promise<NextResponse> {
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!checkRateLimit(ip, 30)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) {
    return NextResponse.json({
      data: { members: [], events: [], projects: [], announcements: [] },
    });
  }

  const [members, events, projects, announcements] = await Promise.all([
    prisma.member.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, fullName: true, username: true, avatarUrl: true, status: true },
    }),
    prisma.event.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, title: true, slug: true, isPublished: true, startDate: true },
    }),
    prisma.project.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, title: true, slug: true, isPublished: true, status: true },
    }),
    prisma.announcement.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { excerpt: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, title: true, isPublished: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({ data: { members, events, projects, announcements } });
}

// ─── export ───────────────────────────────────────────────────────────────────

async function handleExport(
  req: NextRequest,
  session: Session
): Promise<NextResponse> {
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "view_audit_logs")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const actionType = sp.get("actionType") ?? undefined;
  const dateFrom = sp.get("from") ? new Date(sp.get("from")!) : undefined;
  const dateTo = sp.get("to") ? new Date(sp.get("to")!) : undefined;

  const where: Record<string, unknown> = {};
  if (actionType) where.actionType = actionType;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000, // safety cap
    select: {
      id: true,
      actionType: true,
      description: true,
      entityType: true,
      entityId: true,
      ipAddress: true,
      createdAt: true,
      admin: { select: { fullName: true, username: true } },
    },
  });

  const csvRows = [
    ["ID", "Admin", "Username", "Action Type", "Description", "Entity Type", "Entity ID", "IP Address", "Timestamp"],
    ...logs.map((l) => [
      l.id,
      l.admin?.fullName ?? "",
      l.admin?.username ?? "",
      l.actionType,
      `"${(l.description ?? "").replace(/"/g, '""')}"`,
      l.entityType ?? "",
      l.entityId ?? "",
      l.ipAddress ?? "",
      l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
    ]),
  ];
  const csv = csvRows.map((r) => r.join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${Date.now()}.csv"`,
    },
  });
}

// ─── facebook-oauth ───────────────────────────────────────────────────────────

async function handleFacebookOAuth(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (method === "GET") {
    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const redirectUri = `${baseUrl.replace(/\/+$/, "")}/api/admin/facebook-oauth`;

    if (error || !code) {
      return NextResponse.redirect(`${redirectUri}?error=oauth_denied`);
    }

    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.redirect(`${redirectUri}?error=token_exchange_failed`);
    }

    const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    let userToken: string;
    try {
      const tokenRes = await fetch(tokenUrl.toString());
      const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message?: string } };
      if (!tokenData.access_token) {
        console.error("[facebook-oauth] Token exchange failed:", tokenData.error);
        return NextResponse.redirect(`${redirectUri}?error=token_exchange_failed`);
      }
      userToken = tokenData.access_token;
    } catch (err) {
      console.error("[facebook-oauth] Token exchange request failed:", err);
      return NextResponse.redirect(`${redirectUri}?error=token_exchange_failed`);
    }

    const longLivedUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", userToken);

    let longLivedToken: string;
    try {
      const llRes = await fetch(longLivedUrl.toString());
      const llData = (await llRes.json()) as { access_token?: string; error?: { message?: string } };
      if (!llData.access_token) {
        console.error("[facebook-oauth] Long-lived token exchange failed:", llData.error);
        return NextResponse.redirect(`${redirectUri}?error=token_exchange_failed`);
      }
      longLivedToken = llData.access_token;
    } catch (err) {
      console.error("[facebook-oauth] Long-lived token request failed:", err);
      return NextResponse.redirect(`${redirectUri}?error=token_exchange_failed`);
    }

    const pagesUrl = new URL("https://graph.facebook.com/v19.0/me/accounts");
    pagesUrl.searchParams.set("access_token", longLivedToken);
    pagesUrl.searchParams.set("fields", "id,name,access_token,link");

    let pageId: string;
    let pageToken: string;
    let pageName: string;
    let pageLink: string;
    try {
      const pagesRes = await fetch(pagesUrl.toString());
      const pagesData = (await pagesRes.json()) as { data?: Array<{ id: string; name: string; access_token: string; link?: string }>; error?: { message?: string } };
      if (!pagesData.data || pagesData.data.length === 0) {
        return NextResponse.redirect(`${redirectUri}?error=no_pages_found`);
      }
      const page = pagesData.data[0];
      pageId = page.id;
      pageToken = page.access_token;
      pageName = page.name;
      pageLink = page.link ?? `https://www.facebook.com/${pageId}`;
    } catch (err) {
      console.error("[facebook-oauth] Pages fetch failed:", err);
      return NextResponse.redirect(`${redirectUri}?error=token_exchange_failed`);
    }

    await prisma.clubConfig.update({
      where: { id: "main" },
      data: { fbPageId: pageId, fbPageToken: pageToken, fbUrl: pageLink },
    });

    await logAction({
      adminId: session.user.userId,
      actionType: "connect_facebook",
      description: `Connected Facebook page: ${pageName} (id: ${pageId})`,
      entityType: "club_config",
      entityId: "main",
      ipAddress: ip,
    });

    return NextResponse.redirect(`${redirectUri}?connected=true`);
  }

  if (method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!hasPermission(session.user.permissions, "manage_facebook")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { code, redirectUri } = body as { code?: string; redirectUri?: string };
  if (!code || !redirectUri) {
    return NextResponse.json(
      { error: "code and redirectUri are required" },
      { status: 400 }
    );
  }

  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "Facebook app credentials not configured" },
      { status: 500 }
    );
  }

  // Exchange code for short-lived user token
  const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  let userToken: string;
  try {
    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message?: string } };
    if (!tokenData.access_token) {
      console.error("[facebook-oauth] Token exchange failed:", tokenData.error);
      return NextResponse.json(
        { error: tokenData.error?.message ?? "Failed to exchange code for token" },
        { status: 400 }
      );
    }
    userToken = tokenData.access_token;
  } catch (err) {
    console.error("[facebook-oauth] Token exchange request failed:", err);
    return NextResponse.json(
      { error: "Failed to contact Facebook API" },
      { status: 502 }
    );
  }

  // Exchange for long-lived token
  const longLivedUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId);
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", userToken);

  let longLivedToken: string;
  try {
    const llRes = await fetch(longLivedUrl.toString());
    const llData = (await llRes.json()) as { access_token?: string; error?: { message?: string } };
    if (!llData.access_token) {
      console.error("[facebook-oauth] Long-lived token exchange failed:", llData.error);
      return NextResponse.json(
        { error: llData.error?.message ?? "Failed to get long-lived token" },
        { status: 400 }
      );
    }
    longLivedToken = llData.access_token;
  } catch (err) {
    console.error("[facebook-oauth] Long-lived token request failed:", err);
    return NextResponse.json(
      { error: "Failed to contact Facebook API" },
      { status: 502 }
    );
  }

  // Fetch pages managed by this user
  const pagesUrl = new URL("https://graph.facebook.com/v19.0/me/accounts");
  pagesUrl.searchParams.set("access_token", longLivedToken);
  pagesUrl.searchParams.set("fields", "id,name,access_token,link");

  let pageId: string;
  let pageToken: string;
  let pageNamePost: string;
  let pageLinkPost: string;
  try {
    const pagesRes = await fetch(pagesUrl.toString());
    const pagesData = (await pagesRes.json()) as {
      data?: Array<{ id: string; name: string; access_token: string; link?: string }>;
      error?: { message?: string };
    };
    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.json(
        { error: "No Facebook pages found for this account" },
        { status: 404 }
      );
    }
    // Use the first page — admin can re-connect to choose another
    const page = pagesData.data[0];
    pageId = page.id;
    pageToken = page.access_token;
    pageNamePost = page.name;
    pageLinkPost = page.link ?? `https://www.facebook.com/${page.id}`;
  } catch (err) {
    console.error("[facebook-oauth] Pages fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to retrieve Facebook pages" },
      { status: 502 }
    );
  }

  // Store in ClubConfig
  await prisma.clubConfig.update({
    where: { id: "main" },
    data: { fbPageId: pageId, fbPageToken: pageToken, fbUrl: pageLinkPost },
  });

  await logAction({
    adminId: session.user.userId,
    actionType: "connect_facebook",
    description: `Connected Facebook page: ${pageNamePost} (id: ${pageId})`,
    entityType: "club_config",
    entityId: "main",
    ipAddress: ip,
  });

  return NextResponse.json({
    data: { connected: true, pageId, pageName: pageNamePost },
  });
}

// ─── event-categories ────────────────────────────────────────────────────────

async function handleEventCategories(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!hasPermission(session.user.permissions, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (method === "GET") {
    const cats = await prisma.eventCategory.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: cats });
  }
  if (method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { name, color } = body as { name?: string; color?: string };
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    try {
      const cat = await prisma.eventCategory.create({ data: { name, color: color ?? "#0050FF" }, select: { id: true, name: true, color: true } });
      return NextResponse.json({ data: cat }, { status: 201 });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2002") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
      throw err;
    }
  }
  if (method === "PUT") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { id, name, color } = body as { id?: string; name?: string; color?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const cat = await prisma.eventCategory.update({ where: { id }, data: { ...(name ? { name } : {}), ...(color ? { color } : {}) }, select: { id: true, name: true, color: true } });
    return NextResponse.json({ data: cat });
  }
  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { id } = body as { id?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await prisma.eventCategory.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── project-categories ───────────────────────────────────────────────────────

async function handleProjectCategories(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!hasPermission(session.user.permissions, "manage_projects")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (method === "GET") {
    const cats = await prisma.projectCategory.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: cats });
  }
  if (method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { name, color } = body as { name?: string; color?: string };
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    try {
      const cat = await prisma.projectCategory.create({ data: { name, color: color ?? "#0050FF" }, select: { id: true, name: true, color: true } });
      return NextResponse.json({ data: cat }, { status: 201 });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2002") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
      throw err;
    }
  }
  if (method === "PUT") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { id, name, color } = body as { id?: string; name?: string; color?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const cat = await prisma.projectCategory.update({ where: { id }, data: { ...(name ? { name } : {}), ...(color ? { color } : {}) }, select: { id: true, name: true, color: true } });
    return NextResponse.json({ data: cat });
  }
  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { id } = body as { id?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await prisma.projectCategory.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── gallery-categories ───────────────────────────────────────────────────────

async function handleGalleryCategories(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!hasPermission(session.user.permissions, "manage_gallery")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (method === "GET") {
    const cats = await prisma.galleryCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: cats });
  }
  if (method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { name } = body as { name?: string };
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    try {
      const cat = await prisma.galleryCategory.create({ data: { name }, select: { id: true, name: true } });
      return NextResponse.json({ data: cat }, { status: 201 });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2002") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
      throw err;
    }
  }
  if (method === "PUT") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { id, name } = body as { id?: string; name?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const cat = await prisma.galleryCategory.update({ where: { id }, data: { ...(name ? { name } : {}) }, select: { id: true, name: true } });
    return NextResponse.json({ data: cat });
  }
  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { id } = body as { id?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await prisma.galleryCategory.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── announcement-categories ──────────────────────────────────────────────────

async function handleAnnouncementCategories(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!hasPermission(session.user.permissions, "manage_announcements")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (method === "GET") {
    const cats = await prisma.announcementCategory.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: cats });
  }
  if (method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { name, color } = body as { name?: string; color?: string };
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    try {
      const cat = await prisma.announcementCategory.create({ data: { name, color: color ?? "#0050FF" }, select: { id: true, name: true, color: true } });
      return NextResponse.json({ data: cat }, { status: 201 });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2002") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
      throw err;
    }
  }
  if (method === "PUT") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { id, name, color } = body as { id?: string; name?: string; color?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const cat = await prisma.announcementCategory.update({ where: { id }, data: { ...(name ? { name } : {}), ...(color ? { color } : {}) }, select: { id: true, name: true, color: true } });
    return NextResponse.json({ data: cat });
  }
  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { id } = body as { id?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await prisma.announcementCategory.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── instrument-categories ────────────────────────────────────────────────────

async function handleInstrumentCategories(
  req: NextRequest,
  session: Session,
  method: string,
  ip: string
): Promise<NextResponse> {
  if (!hasPermission(session.user.permissions, "manage_instruments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (method === "GET") {
    const cats = await prisma.instrumentCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: cats });
  }
  if (method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { name } = body as { name?: string };
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    try {
      const cat = await prisma.instrumentCategory.create({ data: { name }, select: { id: true, name: true } });
      return NextResponse.json({ data: cat }, { status: 201 });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "P2002") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
      throw err;
    }
  }
  if (method === "PUT") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { id, name } = body as { id?: string; name?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const cat = await prisma.instrumentCategory.update({ where: { id }, data: { ...(name ? { name } : {}) }, select: { id: true, name: true } });
    return NextResponse.json({ data: cat });
  }
  if (method === "DELETE") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const { id } = body as { id?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await prisma.instrumentCategory.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// ─── email-logs ──────────────────────────────────────────────────────────────

async function handleEmailLogs(
  req: NextRequest,
  session: Session,
  method: string
): Promise<NextResponse> {
  if (method !== "GET") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!isSuperAdmin(session) && !hasPermission(session.user.permissions, "send_emails")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const take = Math.min(parseInt(sp.get("take") ?? "25", 10), 100);
  const skip = (page - 1) * take;

  try {
    const [logs, total] = await Promise.all([
      (prisma as any).emailLog.findMany({
        orderBy: { sentAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          to: true,
          subject: true,
          templateName: true,
          status: true,
          sentAt: true,
        },
      }),
      (prisma as any).emailLog.count(),
    ]);
    return NextResponse.json({ data: logs, total, page, take });
  } catch {
    // EmailLog table may not exist yet
    return NextResponse.json({ data: [], total: 0, page, take });
  }
}

// Re-export unused deleteCloudinaryAsset to satisfy linter for imported but
// potentially future-used utility (kept for completeness per spec imports)
void deleteCloudinaryAsset;