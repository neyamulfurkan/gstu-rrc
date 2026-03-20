// src/app/api/applications/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { sendEmail } from "@/lib/resend";
import type { Session } from "next-auth";

// ─── Inline audit logger (FILE 155 not yet generated) ────────────────────────

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

// ─── Inline notification creator (FILE 156 not yet generated) ────────────────

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
  } catch (err) {
    console.error("[notifications] Failed to create notification:", err);
  }
}

// ─── Inline email components (FILE 060 not yet generated) ────────────────────

import React, { createElement } from "react";
import { ApplicationApprovedEmail, ApplicationRejectedEmail } from "../../../../emails/ApplicationEmails";

// ─── GET /api/applications/[id] ───────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = (await auth()) as Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as {
      isAdmin?: boolean;
      permissions?: Record<string, boolean>;
    };

    if (
      !user.isAdmin ||
      !hasPermission(user.permissions ?? null, "approve_applications")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid application ID" },
        { status: 400 }
      );
    }

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        studentId: true,
        email: true,
        phone: true,
        avatarUrl: true,
        departmentId: true,
        session: true,
        memberType: true,
        paymentMethod: true,
        transactionId: true,
        senderPhone: true,
        screenshotUrl: true,
        status: true,
        adminNote: true,
        createdAt: true,
        reviewedAt: true,
        memberId: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: application }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/applications/[id]] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/applications/[id] ────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = (await auth()) as Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as {
      userId: string;
      isAdmin?: boolean;
      permissions?: Record<string, boolean>;
      fullName?: string;
    };

    if (
      !sessionUser.isAdmin ||
      !hasPermission(sessionUser.permissions ?? null, "approve_applications")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid application ID" },
        { status: 400 }
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

    const parsed = body as {
      action?: unknown;
      note?: unknown;
      roleId?: unknown;
    };

    if (
      !parsed.action ||
      (parsed.action !== "approve" && parsed.action !== "reject")
    ) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const action = parsed.action as "approve" | "reject";
    const note =
      typeof parsed.note === "string" ? parsed.note.trim() : undefined;
    const roleId =
      typeof parsed.roleId === "string" ? parsed.roleId.trim() : undefined;

    // Fetch the application
    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        studentId: true,
        email: true,
        phone: true,
        avatarUrl: true,
        departmentId: true,
        session: true,
        memberType: true,
        status: true,
        passwordHash: true,
        gender: true,
        dob: true,
        address: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        {
          error: `Application has already been ${application.status}. Only pending applications can be actioned.`,
        },
        { status: 409 }
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    // ── APPROVE ──────────────────────────────────────────────────────────────
    if (action === "approve") {
      // Determine the role to assign
      let resolvedRoleId = roleId;

      if (!resolvedRoleId) {
        // Fetch the default general member role from ClubConfig
        const clubConfig = await prisma.clubConfig.findUnique({
          where: { id: "main" },
          select: { id: true },
        });

        const defaultRoleId = (clubConfig as any)?.defaultMemberRoleId;
        if (defaultRoleId) {
          resolvedRoleId = defaultRoleId;
        } else {
          // Fall back to first role with category "general"
          const generalRole = await prisma.role.findFirst({
            where: { category: "general" },
            select: { id: true },
            orderBy: { sortOrder: "asc" },
          });
          resolvedRoleId = generalRole?.id ?? undefined;
        }
      }

      if (!resolvedRoleId) {
        return NextResponse.json(
          {
            error:
              "No role available to assign. Please configure a default member role in Club Config or provide a roleId.",
          },
          { status: 422 }
        );
      }

      // Generate a random username from the applicant's name if username not stored
      // Applications store a username in the passwordHash row — we need to generate one
      // The Application model has a `username` field from the registration
      const appWithUsername = await prisma.application.findUnique({
        where: { id },
        select: { username: true },
      });

      const username = appWithUsername?.username ?? application.email.split("@")[0];

      let newMemberId: string | null = null;

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Create the Member record
          const newMember = await tx.member.create({
            data: {
              email: application.email,
              username: username,
              passwordHash: application.passwordHash,
              fullName: application.fullName,
              studentId: application.studentId,
              phone: application.phone,
              avatarUrl: application.avatarUrl,
              departmentId: application.departmentId,
              session: application.session,
              memberType: application.memberType,
              gender: application.gender ?? null,
              dob: application.dob ?? null,
              address: application.address ?? null,
              roleId: resolvedRoleId!,
              status: "active",
              isAdmin: false,
            },
            select: { id: true, email: true, fullName: true, username: true },
          });

          // Update the Application record
          await tx.application.update({
            where: { id },
            data: {
              status: "approved",
              adminNote: note ?? null,
              memberId: newMember.id,
              reviewedAt: new Date(),
            },
          });

          return newMember;
        });

        newMemberId = result.id;

        // Post-transaction: send approval email
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
        const loginUrl = `${baseUrl}/login`;

        const clubConfigForEmail = await prisma.clubConfig.findUnique({
          where: { id: "main" },
          select: { clubName: true, logoUrl: true, colorConfig: true },
        });

        const clubName = clubConfigForEmail?.clubName ?? "GSTU Robotics Club";
        const approvalEmailConfig = {
          clubName,
          logoUrl: clubConfigForEmail?.logoUrl ?? "",
          primaryColor:
            (clubConfigForEmail?.colorConfig as Record<string, string> | null)?.["--color-primary"] ?? "#0050FF",
        };

        await sendEmail({
          to: application.email,
          subject: `Welcome to ${clubName} — Application Approved!`,
          reactComponent: createElement(ApplicationApprovedEmail, {
            applicantName: application.fullName,
            loginUrl,
            email: application.email,
            clubConfig: approvalEmailConfig,
          }),
        });

        // Create in-app notification for the new member
        await createNotification({
          memberId: newMemberId,
          type: "application_approved",
          title: "Application Approved!",
          body: `Welcome to ${clubName}! Your membership application has been approved. You can now log in.`,
          link: "/profile",
        });

        // Audit log
        await logAction({
          adminId: sessionUser.userId,
          actionType: "application_approved",
          description: `Approved application for ${application.fullName} (${application.email}). New member ID: ${newMemberId}.`,
          entityType: "Application",
          entityId: id,
          ipAddress,
        });

        return NextResponse.json(
          {
            data: { memberId: newMemberId },
            message: "Application approved and member account created.",
          },
          { status: 200 }
        );
      } catch (txError: unknown) {
        // Handle Prisma unique constraint violation
        const prismaError = txError as { code?: string; meta?: { target?: string[] } };
        if (prismaError?.code === "P2002") {
          const target = prismaError.meta?.target ?? [];
          if (target.includes("email")) {
            return NextResponse.json(
              {
                error:
                  "A member account with this email already exists. The application may have already been approved.",
              },
              { status: 409 }
            );
          }
          if (target.includes("username")) {
            return NextResponse.json(
              {
                error:
                  "A member account with this username already exists. Please provide a unique username override.",
              },
              { status: 409 }
            );
          }
          return NextResponse.json(
            {
              error:
                "A member account with conflicting unique fields already exists.",
            },
            { status: 409 }
          );
        }

        console.error(
          "[PATCH /api/applications/[id]] Transaction failed during approve:",
          txError
        );
        return NextResponse.json(
          {
            error:
              "Failed to create member account. Application status has not changed. Please try again.",
          },
          { status: 500 }
        );
      }
    }

    // ── REJECT ───────────────────────────────────────────────────────────────
    if (action === "reject") {
      try {
        await prisma.application.update({
          where: { id },
          data: {
            status: "rejected",
            adminNote: note ?? null,
            reviewedAt: new Date(),
          },
        });
      } catch (updateError) {
        console.error(
          "[PATCH /api/applications/[id]] Failed to update application status to rejected:",
          updateError
        );
        return NextResponse.json(
          { error: "Failed to reject application. Please try again." },
          { status: 500 }
        );
      }

      // Send rejection email
      const rejectionClubConfig = await prisma.clubConfig.findUnique({
        where: { id: "main" },
        select: { clubName: true, logoUrl: true, colorConfig: true },
      });

      const clubName = rejectionClubConfig?.clubName ?? "GSTU Robotics Club";
      const rejectionEmailConfig = {
        clubName,
        logoUrl: rejectionClubConfig?.logoUrl ?? "",
        primaryColor:
          (rejectionClubConfig?.colorConfig as Record<string, string> | null)?.["--color-primary"] ?? "#0050FF",
      };

      await sendEmail({
        to: application.email,
        subject: `Application Update — ${clubName}`,
        reactComponent: createElement(ApplicationRejectedEmail, {
          applicantName: application.fullName,
          reason: note ?? undefined,
          clubConfig: rejectionEmailConfig,
        }),
      });

      // Audit log
      await logAction({
        adminId: sessionUser.userId,
        actionType: "application_rejected",
        description: `Rejected application for ${application.fullName} (${application.email}).${note ? ` Reason: ${note}` : ""}`,
        entityType: "Application",
        entityId: id,
        ipAddress,
      });

      return NextResponse.json(
        { message: "Application rejected." },
        { status: 200 }
      );
    }

    // Should never reach here
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/applications/[id]] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}