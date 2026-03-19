// src/app/api/certificates/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/permissions";

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

function isSerial(id: string): boolean {
  return id.startsWith("GSTU-");
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  try {
    const session = await auth();

    // Public serial-based lookup for verification page
    if (isSerial(id)) {
      const certificate = await prisma.certificate.findUnique({
        where: { serial: id },
        select: {
          id: true,
          serial: true,
          achievement: true,
          issuedAt: true,
          isRevoked: true,
          pdfUrl: true,
          signedByName: true,
          signedByDesignation: true,
          template: {
            select: {
              name: true,
              type: true,
            },
          },
          recipient: {
            select: {
              fullName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (!certificate) {
        return NextResponse.json(
          { valid: false, message: "Certificate not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: certificate }, { status: 200 });
    }

    // cuid-based lookup — requires auth
    if (!session?.user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = (session.user as { userId: string }).userId;
    const userIsAdmin = isAdmin(session);
    const permissions = (session.user as { permissions?: Record<string, boolean> }).permissions ?? {};

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      select: {
        id: true,
        serial: true,
        achievement: true,
        issuedAt: true,
        isRevoked: true,
        pdfUrl: true,
        recipientId: true,
        signedByName: true,
        signedByDesignation: true,
        template: {
          select: {
            name: true,
            type: true,
          },
        },
        recipient: {
          select: {
            fullName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { message: "Certificate not found" },
        { status: 404 }
      );
    }

    const isRecipient = certificate.recipientId === userId;
    const canView =
      isRecipient ||
      (userIsAdmin && hasPermission(permissions, "manage_certificates"));

    if (!canView) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: certificate }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/certificates/[id]] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const userIsAdmin = isAdmin(session);
    const permissions = (session.user as { permissions?: Record<string, boolean> }).permissions ?? {};

    if (!userIsAdmin || !hasPermission(permissions, "manage_certificates")) {
      return NextResponse.json(
        { message: "Forbidden: manage_certificates permission required" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("action" in body) ||
      typeof (body as Record<string, unknown>).action !== "string"
    ) {
      return NextResponse.json(
        { message: "Invalid request body: action is required" },
        { status: 400 }
      );
    }

    const action = (body as { action: string }).action;

    if (action !== "revoke" && action !== "unrevoke") {
      return NextResponse.json(
        { message: 'Invalid action: must be "revoke" or "unrevoke"' },
        { status: 400 }
      );
    }

    const existing = await prisma.certificate.findUnique({
      where: { id },
      select: { id: true, serial: true, recipientId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Certificate not found" },
        { status: 404 }
      );
    }

    const updatedCertificate = await prisma.certificate.update({
      where: { id },
      data: {
        isRevoked: action === "revoke",
      },
      select: {
        id: true,
        serial: true,
        achievement: true,
        issuedAt: true,
        isRevoked: true,
        pdfUrl: true,
        template: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    const adminId = (session.user as { userId: string }).userId;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    await logAction({
      adminId,
      actionType: action === "revoke" ? "certificate_revoked" : "certificate_unrevoked",
      description: `Certificate ${existing.serial} ${action === "revoke" ? "revoked" : "unrevoked"}`,
      entityType: "Certificate",
      entityId: id,
      ipAddress,
    });

    return NextResponse.json({ data: updatedCertificate }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/certificates/[id]] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const userIsAdmin = isAdmin(session);
    const permissions = (session.user as { permissions?: Record<string, boolean> }).permissions ?? {};

    if (!userIsAdmin || !hasPermission(permissions, "manage_certificates")) {
      return NextResponse.json(
        { message: "Forbidden: manage_certificates permission required" },
        { status: 403 }
      );
    }

    const existing = await prisma.certificate.findUnique({
      where: { id },
      select: { id: true, serial: true },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Certificate not found" },
        { status: 404 }
      );
    }

    await prisma.certificate.delete({
      where: { id },
    });

    const adminId = (session.user as { userId: string }).userId;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    await logAction({
      adminId,
      actionType: "certificate_deleted",
      description: `Certificate ${existing.serial} permanently deleted`,
      entityType: "Certificate",
      entityId: id,
      ipAddress,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/certificates/[id]] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}