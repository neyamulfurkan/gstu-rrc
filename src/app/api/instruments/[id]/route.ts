// src/app/api/instruments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// ─── Notification helper (inline since FILE 156 is not available) ─────────────

async function createNotification(params: {
  memberId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        memberId: params.memberId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
        isRead: false,
      },
    });
  } catch (error) {
    console.error("[notifications] Failed to create notification:", error);
  }
}

// ─── Audit log helper (inline since FILE 155 is not available) ────────────────

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
  } catch (error) {
    console.error("[auditLogger] Failed to log action:", error);
  }
}

// ─── GET /api/instruments/[id] ────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();
    const isAdminUser =
      session?.user?.isAdmin === true;

    const instrument = await prisma.instrument.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        status: true,
        borrowDate: true,
        returnDate: true,
        category: {
          select: { name: true },
        },
        borrower: {
          select: {
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
            requests: isAdminUser
          ? {
              where: { status: "pending" },
              select: {
                id: true,
                purpose: true,
                borrowDate: true,
                returnDate: true,
                status: true,
                adminNote: true,
                createdAt: true,
                requester: {
                  select: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatarUrl: true,
                    email: true,
                    phone: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" as const },
            }
          : false,
      },
    });

    if (!instrument) {
      return NextResponse.json(
        { error: "Instrument not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: instrument }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/instruments/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/instruments/[id] ────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !session.user.isAdmin ||
      !hasPermission(session.user.permissions, "manage_instruments")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as Record<string, unknown>;

    const existing = await prisma.instrument.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Instrument not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim().length > 0) {
      updateData.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      updateData.description = body.description;
    }
    if (typeof body.imageUrl === "string") {
      updateData.imageUrl = body.imageUrl;
    }
    if (typeof body.status === "string") {
      const validStatuses = ["available", "on_loan", "under_maintenance", "unavailable"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }
    if (typeof body.categoryId === "string") {
      updateData.categoryId = body.categoryId;
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.instrument.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        status: true,
        category: { select: { name: true } },
      },
    });

    await logAction({
      adminId: session.user.userId,
      actionType: "UPDATE_INSTRUMENT",
      description: `Updated instrument "${updated.name}"`,
      entityType: "Instrument",
      entityId: params.id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error("[PUT /api/instruments/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/instruments/[id] ─────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      action?: string;
      requestId?: string;
      note?: string;
    };

    const { action, requestId, note } = body;

    // ── Member-initiated borrow request ──────────────────────────────────────
    if (action === "request") {
      const { purpose, borrowDate, returnDate } = body as {
        action: string;
        purpose?: string;
        borrowDate?: string;
        returnDate?: string;
      };

      if (!purpose || typeof purpose !== "string" || purpose.trim().length < 10) {
        return NextResponse.json(
          { error: "Purpose must be at least 10 characters" },
          { status: 400 }
        );
      }
      if (!borrowDate || !returnDate) {
        return NextResponse.json(
          { error: "borrowDate and returnDate are required" },
          { status: 400 }
        );
      }

      const bDate = new Date(borrowDate);
      const rDate = new Date(returnDate);

      if (isNaN(bDate.getTime()) || isNaN(rDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date values" },
          { status: 400 }
        );
      }
      if (rDate <= bDate) {
        return NextResponse.json(
          { error: "returnDate must be after borrowDate" },
          { status: 400 }
        );
      }

      const instrument = await prisma.instrument.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, status: true },
      });

      if (!instrument) {
        return NextResponse.json(
          { error: "Instrument not found" },
          { status: 404 }
        );
      }

      if (instrument.status !== "available") {
        return NextResponse.json(
          { error: "Instrument is not available for borrowing" },
          { status: 409 }
        );
      }

      const existing = await prisma.borrowRequest.findFirst({
        where: {
          instrumentId: params.id,
          requesterId: session.user.userId,
          status: "pending",
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          { error: "You already have a pending request for this instrument" },
          { status: 409 }
        );
      }

      const borrowRequest = await prisma.borrowRequest.create({
        data: {
          instrumentId: params.id,
          requesterId: session.user.userId,
          purpose: purpose.trim(),
          borrowDate: bDate,
          returnDate: rDate,
          status: "pending",
        },
        select: { id: true },
      });

      return NextResponse.json(
        { data: { id: borrowRequest.id }, message: "Borrow request submitted" },
        { status: 201 }
      );
    }

    // ── Admin borrow state transitions ────────────────────────────────────────
    if (!session.user.isAdmin || !hasPermission(session.user.permissions, "manage_instruments")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!action || !["approve_borrow", "reject_borrow", "mark_returned"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be approve_borrow, reject_borrow, or mark_returned" },
        { status: 400 }
      );
    }

    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json(
        { error: "requestId is required" },
        { status: 400 }
      );
    }

    const borrowRequest = await prisma.borrowRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        requesterId: true,
        instrumentId: true,
        borrowDate: true,
        returnDate: true,
        requester: {
          select: { fullName: true, username: true },
        },
        instrument: {
          select: { name: true, status: true },
        },
      },
    });

    if (!borrowRequest) {
      return NextResponse.json(
        { error: "Borrow request not found" },
        { status: 404 }
      );
    }

    if (borrowRequest.instrumentId !== params.id) {
      return NextResponse.json(
        { error: "Borrow request does not belong to this instrument" },
        { status: 400 }
      );
    }

    // ── approve_borrow ────────────────────────────────────────────────────────
    if (action === "approve_borrow") {
      if (borrowRequest.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending requests can be approved" },
          { status: 409 }
        );
      }

      if ((borrowRequest as any).instrument.status !== "available") {
        return NextResponse.json(
          { error: "Instrument is not available for borrowing" },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.borrowRequest.update({
          where: { id: requestId },
          data: {
            status: "approved",
            adminNote: note ?? null,
          },
        }),
        prisma.instrument.update({
          where: { id: params.id },
          data: {
            status: "on_loan",
            borrowerId: borrowRequest.requesterId,
            borrowDate: borrowRequest.borrowDate,
            returnDate: borrowRequest.returnDate,
          },
        }),
        // Reject all other pending requests for this instrument
        prisma.borrowRequest.updateMany({
          where: {
            instrumentId: params.id,
            status: "pending",
            id: { not: requestId },
          },
          data: { status: "rejected", adminNote: "Another request was approved." },
        }),
      ]);

      await createNotification({
        memberId: borrowRequest.requesterId,
        type: "instrument_approved",
        title: "Borrow Request Approved",
        body: `Your request to borrow "${(borrowRequest as any).instrument.name}" has been approved.${note ? ` Note: ${note}` : ""}`,

        link: "/instruments",
      });

      await logAction({
        adminId: session.user.userId,
        actionType: "APPROVE_BORROW_REQUEST",
        description: `Approved borrow request for instrument "${(borrowRequest as any).instrument.name}" by ${(borrowRequest as any).requester.fullName}`,

        entityType: "BorrowRequest",
        entityId: requestId,
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      });

      return NextResponse.json(
        { message: "Borrow request approved" },
        { status: 200 }
      );
    }

    // ── reject_borrow ─────────────────────────────────────────────────────────
    if (action === "reject_borrow") {
      if (borrowRequest.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending requests can be rejected" },
          { status: 409 }
        );
      }

      await prisma.borrowRequest.update({
        where: { id: requestId },
        data: {
          status: "rejected",
          adminNote: note ?? null,
        },
      });

      await createNotification({
        memberId: borrowRequest.requesterId,
        type: "instrument_rejected",
        title: "Borrow Request Rejected",
        body: `Your request to borrow "${(borrowRequest as any).instrument.name}" was not approved.${note ? ` Reason: ${note}` : ""}`,

        link: "/instruments",
      });

      await logAction({
        adminId: session.user.userId,
        actionType: "REJECT_BORROW_REQUEST",
        description: `Rejected borrow request for instrument "${(borrowRequest as any).instrument.name}" by ${(borrowRequest as any).requester.fullName}`,

        entityType: "BorrowRequest",
        entityId: requestId,
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      });

      return NextResponse.json(
        { message: "Borrow request rejected" },
        { status: 200 }
      );
    }

    // ── mark_returned ─────────────────────────────────────────────────────────
    if (action === "mark_returned") {
      if (borrowRequest.status !== "approved") {
        return NextResponse.json(
          { error: "Only approved requests can be marked as returned" },
          { status: 409 }
        );
      }

      if ((borrowRequest as any).instrument.status !== "on_loan") {
        return NextResponse.json(
          { error: "Instrument is not currently on loan" },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.borrowRequest.update({
          where: { id: requestId },
          data: {
            status: "returned",
            adminNote: note ?? null,
          },
        }),
        prisma.instrument.update({
          where: { id: params.id },
          data: {
            status: "available",
            borrowerId: null,
            borrowDate: null,
            returnDate: null,
          },
        }),
      ]);

      await createNotification({
        memberId: borrowRequest.requesterId,
        type: "instrument_returned",
        title: "Instrument Return Confirmed",
        body: `The return of "${(borrowRequest as any).instrument.name}" has been confirmed. Thank you!`,
        link: "/instruments",
      });

      await logAction({
        adminId: session.user.userId,
        actionType: "MARK_INSTRUMENT_RETURNED",
        description: `Marked instrument "${(borrowRequest as any).instrument.name}" as returned by ${(borrowRequest as any).requester.fullName}`,
        entityType: "BorrowRequest",
        entityId: requestId,
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      });

      return NextResponse.json(
        { message: "Instrument marked as returned" },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/instruments/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/instruments/[id] ────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !session.user.isAdmin ||
      !hasPermission(session.user.permissions, "manage_instruments")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const instrument = await prisma.instrument.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, status: true },
    });

    if (!instrument) {
      return NextResponse.json(
        { error: "Instrument not found" },
        { status: 404 }
      );
    }

    if (instrument.status === "on_loan") {
      return NextResponse.json(
        { error: "Cannot delete an instrument that is currently on loan" },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.borrowRequest.deleteMany({
        where: { instrumentId: params.id },
      }),
      prisma.instrument.delete({
        where: { id: params.id },
      }),
    ]);

    await logAction({
      adminId: session.user.userId,
      actionType: "DELETE_INSTRUMENT",
      description: `Deleted instrument "${instrument.name}"`,
      entityType: "Instrument",
      entityId: params.id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/instruments/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}