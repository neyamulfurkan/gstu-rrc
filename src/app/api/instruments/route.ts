// src/app/api/instruments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import {
  instrumentSchema,
  borrowRequestSchema,
  paginationSchema,
} from "@/lib/validations";
import type { Session } from "next-auth";

// ─── GET /api/instruments ─────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const session = (await auth()) as Session | null;

    const myRequests = searchParams.get("myRequests") === "true";

    // ── My Borrow Requests (member-specific) ────────────────────────────────
    if (myRequests) {
      if (!session?.user?.userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const paginationResult = paginationSchema.safeParse({
        cursor: searchParams.get("cursor") ?? undefined,
        take: searchParams.get("take")
          ? parseInt(searchParams.get("take")!, 10)
          : 20,
      });

      const take = paginationResult.success ? paginationResult.data.take : 20;
      const cursor = paginationResult.success
        ? paginationResult.data.cursor
        : undefined;

      const requests = await prisma.borrowRequest.findMany({
        where: {
          requesterId: session.user.userId,
        },
        select: {
          id: true,
          purpose: true,
          borrowDate: true,
          returnDate: true,
          status: true,
          adminNote: true,
          createdAt: true,
          instrument: {
            select: {
              name: true,
              imageUrl: true,
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
      if (requests.length > take) {
        const lastItem = requests.pop();
        nextCursor = lastItem?.id;
      }

      return NextResponse.json({
        data: requests,
        nextCursor,
        total: requests.length,
      });
    }

    // ── Standard Instrument List ─────────────────────────────────────────────
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const paginationResult = paginationSchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      take: searchParams.get("take")
        ? parseInt(searchParams.get("take")!, 10)
        : 20,
    });

    const take = paginationResult.success ? paginationResult.data.take : 20;
    const cursor = paginationResult.success
      ? paginationResult.data.cursor
      : undefined;

    const where: Record<string, unknown> = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const instruments = await prisma.instrument.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        status: true,
        returnDate: true,
        category: {
          select: {
            name: true,
          },
        },
        borrower: {
          select: {
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    let nextCursor: string | undefined;
    if (instruments.length > take) {
      nextCursor = instruments[take]?.id;
    }

    const data = instruments.slice(0, take).map((instrument) => ({
      id: instrument.id,
      name: instrument.name,
      category: (instrument as typeof instrument & { category: { name: string } }).category,
      description: instrument.description,
      imageUrl: instrument.imageUrl,
      status: instrument.status,
      borrower:
        instrument.status === "on_loan" && (instrument as typeof instrument & { borrower?: { username: string; fullName: string; avatarUrl: string } | null }).borrower
          ? {
              username: (instrument as typeof instrument & { borrower: { username: string; fullName: string; avatarUrl: string } }).borrower.username ?? "",
              fullName: (instrument as typeof instrument & { borrower: { username: string; fullName: string; avatarUrl: string } }).borrower.fullName ?? "Unknown",
              avatarUrl: (instrument as typeof instrument & { borrower: { username: string; fullName: string; avatarUrl: string } }).borrower.avatarUrl ?? "",
            }
          : undefined,
      returnDate:
        instrument.status === "on_loan" ? instrument.returnDate : undefined,
    }));

    return NextResponse.json({
      data,
      nextCursor,
      total: data.length,
    });
  } catch (error) {
    console.error("[GET /api/instruments] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/instruments ────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = (await auth()) as Session | null;

    if (!session?.user?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = session.user as {
      userId: string;
      isAdmin?: boolean;
      permissions?: Record<string, boolean>;
    };

    if (
      !user.isAdmin ||
      !hasPermission(user.permissions ?? null, "manage_instruments")
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
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

    const parseResult = instrumentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, categoryId, description, imageUrl, status, quantity } = parseResult.data;
    const safeImageUrl = imageUrl ?? "";

    // Verify category exists
    const category = await prisma.instrumentCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 400 }
      );
    }

    const instrument = await prisma.instrument.create({
      data: {
        name,
        categoryId,
        description,
        imageUrl: safeImageUrl,
        status: status ?? "available",
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        status: true,
        category: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ data: instrument }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/instruments] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/instruments ───────────────────────────────────────────────────

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = (await auth()) as Session | null;

    if (!session?.user?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = session.user as {
      userId: string;
      isAdmin?: boolean;
      permissions?: Record<string, boolean>;
    };

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const bodyObj = body as Record<string, unknown>;

    if (bodyObj.action !== "request_borrow") {
      return NextResponse.json(
        { error: "Invalid action. Expected 'request_borrow'" },
        { status: 400 }
      );
    }

    // Members and admins can submit borrow requests
    const parseResult = borrowRequestSchema.safeParse({
      instrumentId: bodyObj.instrumentId,
      purpose: bodyObj.purpose,
      borrowDate: bodyObj.borrowDate,
      returnDate: bodyObj.returnDate,
      notes: bodyObj.notes,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { instrumentId, purpose, borrowDate, returnDate, notes } =
      parseResult.data;

    // Verify instrument exists and is available
    const instrument = await prisma.instrument.findUnique({
      where: { id: instrumentId },
      select: {
        id: true,
        status: true,
        name: true,
      },
    });

    if (!instrument) {
      return NextResponse.json(
        { error: "Instrument not found" },
        { status: 404 }
      );
    }

    if (instrument.status !== "available") {
      return NextResponse.json(
        {
          error: `Instrument is not available for borrowing. Current status: ${instrument.status}`,
        },
        { status: 409 }
      );
    }

    // Check for existing pending request from this member for this instrument
    const existingRequest = await prisma.borrowRequest.findFirst({
      where: {
        requesterId: user.userId,
        instrumentId,
        status: "pending",
      },
      select: { id: true },
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            "You already have a pending borrow request for this instrument",
        },
        { status: 409 }
      );
    }

    const borrowRequest = await prisma.borrowRequest.create({
      data: {
        requesterId: user.userId,
        instrumentId,
        purpose,
        borrowDate,
        returnDate,
        status: "pending",
        ...(notes ? { notes } : {}),
      },
      select: {
        id: true,
        purpose: true,
        borrowDate: true,
        returnDate: true,
        status: true,
        createdAt: true,
        instrument: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    // Notify admins with manage_instruments permission
    try {
      const adminMembers = await prisma.member.findMany({
        where: {
          isAdmin: true,
          status: "active",
        },
        select: {
          id: true,
          adminRole: {
            select: {
              permissions: true,
            },
          },
        },
      });

      const eligibleAdmins = adminMembers.filter((admin) => {
        const perms = admin.adminRole?.permissions;
        if (!perms || typeof perms !== "object" || Array.isArray(perms))
          return false;
        return (perms as Record<string, boolean>)["manage_instruments"] === true;
      });

      if (eligibleAdmins.length > 0) {
        await prisma.notification.createMany({
          data: eligibleAdmins.map((admin) => ({
            memberId: admin.id,
            type: "borrow_request",
            title: "New Borrow Request",
            body: `A member has requested to borrow "${instrument.name}"`,
            link: "/admin/instruments",
            isRead: false,
          })),
          skipDuplicates: true,
        });
      }
    } catch (notifyError) {
      console.error(
        "[PATCH /api/instruments] Failed to notify admins:",
        notifyError
      );
      // Non-fatal — continue
    }

    return NextResponse.json({ data: borrowRequest }, { status: 201 });
  } catch (error) {
    console.error("[PATCH /api/instruments] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}