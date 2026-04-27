// src/app/api/applications/route.ts

import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  memberSchema,
  accountSchema,
  paymentSchema,
  paginationSchema,
} from "@/lib/validations";
import { sendEmail } from "@/lib/resend";
import { ApplicationReceivedEmail } from "../../../../emails/ApplicationEmails";
import { createElement } from "react";
import { z } from "zod";

// ─── Combined application schema ─────────────────────────────────────────────

const applicationSchema = memberSchema
  .merge(
    z.object({
      username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must be at most 30 characters")
        .regex(
          /^[a-zA-Z0-9_]+$/,
          "Username can only contain letters, numbers, and underscores"
        ),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .refine((val) => /[A-Z]/.test(val), {
          message: "Password must contain at least one uppercase letter",
        })
        .refine((val) => /[0-9]/.test(val), {
          message: "Password must contain at least one number",
        })
        .refine((val) => /[^a-zA-Z0-9]/.test(val), {
          message: "Password must contain at least one special character",
        }),
      confirmPassword: z.string(),
    })
  )
  .merge(paymentSchema)
  .extend({
    memberType: z.enum(["member", "alumni"]),
    avatarUrl: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

// ─── GET — Admin: paginated applications list ─────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = session.user as {
      isAdmin?: boolean;
      permissions?: Record<string, boolean>;
    };

    const isSuperAdmin = user.permissions?.["super_admin"] === true;

    if (
      !user.isAdmin ||
      (!isSuperAdmin && !hasPermission(user.permissions ?? null, "approve_applications"))
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const cursorParam = searchParams.get("cursor") ?? undefined;
    const takeParam = searchParams.get("take");

    const paginationResult = paginationSchema.safeParse({
      cursor: cursorParam,
      take: takeParam ? parseInt(takeParam, 10) : 20,
    });

    const take = paginationResult.success ? paginationResult.data.take : 20;
    const cursor = paginationResult.success
      ? paginationResult.data.cursor
      : undefined;

    const where: Record<string, unknown> = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        take: take + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          studentId: true,
          email: true,
          phone: true,
          gender: true,
          dob: true,
          address: true,
          avatarUrl: true,
          departmentId: true,
          session: true,
          memberType: true,
          username: true,
          paymentMethod: true,
          transactionId: true,
          senderPhone: true,
          screenshotUrl: true,
          status: true,
          adminNote: true,
          memberId: true,
          createdAt: true,
          reviewedAt: true,
        },
      }),
      prisma.application.count({ where }),
    ]);

    let nextCursor: string | undefined;
    const data = applications;

    if (applications.length > take) {
      const lastItem = data[take - 1];
      nextCursor = lastItem?.id;
      data.splice(take);
    }

    return NextResponse.json({ data, nextCursor, total }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/applications] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST — Public: submit membership application ─────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parseResult = applicationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // ── Duplicate detection ──────────────────────────────────────────────────

    const [pendingApplication, existingMemberByEmail, existingMemberByUsername] =
      await Promise.all([
        prisma.application.findFirst({
          where: { email: data.email, status: "pending" },
          select: { id: true },
        }),
        prisma.member.findFirst({
          where: { email: data.email },
          select: { id: true },
        }),
        prisma.member.findFirst({
          where: { username: data.username },
          select: { id: true },
        }),
      ]);

    if (pendingApplication) {
      return NextResponse.json(
        { error: "Application already pending for this email." },
        { status: 409 }
      );
    }

    if (existingMemberByEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    if (existingMemberByUsername) {
      return NextResponse.json(
        { error: "This username is already taken. Please choose another." },
        { status: 409 }
      );
    }

    // Check for rejected application with same email — allow reapplication
    // (only pending applications block resubmission)

    // ── Hash password ────────────────────────────────────────────────────────

    const passwordHash = await bcryptjs.hash(data.password, 12);

    // ── Create Application record ────────────────────────────────────────────

    const application = await prisma.application.create({
      data: {
        fullName: data.fullName,
        studentId: data.studentId ?? "",
        email: data.email,
        phone: data.phone,
        departmentId: data.departmentId ?? "",
        session: data.session ?? "",
        gender: data.gender ?? null,
        dob: data.dob ?? null,
        address: data.address ?? null,
        // workplace field not in Application schema — omitted
        avatarUrl: data.avatarUrl ?? "",
        username: data.username as string,
        passwordHash,
        memberType: data.memberType as string,
        paymentMethod: data.paymentMethod as string,
        transactionId: data.transactionId as string,
        senderPhone: data.senderPhone as string,
        screenshotUrl: data.screenshotUrl ?? "",
        status: "pending",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    // ── Fetch club config for email ──────────────────────────────────────────

    const clubConfig = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        logoUrl: true,
        colorConfig: true,
      },
    });

    const emailConfig = {
      clubName: clubConfig?.clubName ?? "GSTU Robotics & Research Club",
      logoUrl: clubConfig?.logoUrl ?? "",
      primaryColor:
        (clubConfig?.colorConfig as Record<string, string> | null)?.[
          "--color-primary"
        ] ?? "#00E5FF",
    };

    // ── Send confirmation email to applicant ────────────────────────────────

    try {
      await sendEmail({
        to: application.email,
        subject: `Application Received — ${emailConfig.clubName}`,
        reactComponent: createElement(ApplicationReceivedEmail, {
          applicantName: application.fullName,
          clubConfig: emailConfig,
        }),
      });
    } catch (emailError) {
      console.error(
        "[POST /api/applications] Failed to send applicant confirmation email:",
        emailError
      );
      // Non-fatal — continue
    }

    // ── Notify admins with approve_applications permission ───────────────────

    try {
      const adminMembers = await prisma.member.findMany({
        where: {
          isAdmin: true,
          status: "active",
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          adminRole: {
            select: {
              permissions: true,
            },
          },
        },
      });

      const eligibleAdmins = adminMembers.filter((admin) => {
        const perms = admin.adminRole?.permissions;
        if (!perms || typeof perms !== "object" || Array.isArray(perms)) {
          return false;
        }
        return (perms as Record<string, boolean>)["approve_applications"] === true;
      });

      // Send notification emails to eligible admins
      if (eligibleAdmins.length > 0) {
        try {
          for (const admin of eligibleAdmins) {
            await sendEmail({
              to: admin.email,
              subject: `New Membership Application — ${data.fullName}`,
              reactComponent: createElement("div", null,
                createElement("h2", null, `New Membership Application`),
                createElement("p", null, `Hi ${admin.fullName},`),
                createElement("p", null, `A new membership application has been submitted by ${data.fullName} (${data.email}).`),
                createElement("p", null, `Please review it in the admin panel: ${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/admin/applications`)
              ),
            });
          }
        } catch (adminEmailError) {
          console.error(
            "[POST /api/applications] Failed to send admin notification emails:",
            adminEmailError
          );
          // Non-fatal
        }

        // Create in-app notifications for eligible admins
        try {
          const { notifyAdmins } = await import("@/lib/notifications");
          await notifyAdmins({
            type: "new_application",
            title: "New Membership Application",
            body: `${data.fullName} (${data.email}) has submitted a membership application.`,
            link: `/admin/applications`,
            permission: "approve_applications",
          });
        } catch (notifyError) {
          console.error(
            "[POST /api/applications] Failed to create admin notifications:",
            notifyError
          );
          // Non-fatal
        }
      }
    } catch (adminNotifyError) {
      console.error(
        "[POST /api/applications] Failed to fetch admins for notification:",
        adminNotifyError
      );
      // Non-fatal
    }

    return NextResponse.json(
      {
        data: { id: application.id },
        message: "Application submitted successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const prismaError = error as { meta?: { target?: string[] } };
      const target = prismaError.meta?.target?.[0] ?? "field";
      return NextResponse.json(
        {
          error: `An application or account with this ${target} already exists.`,
        },
        { status: 409 }
      );
    }

    console.error("[POST /api/applications] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}