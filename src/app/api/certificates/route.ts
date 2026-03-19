// src/app/api/certificates/route.ts

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateSerial } from "@/lib/utils";
import { generateCertificatePdf } from "@/lib/certificate";
import { sendEmail } from "@/lib/resend";
import type { CertificateCard } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IssueCertificateBody {
  templateId: string;
  recipientIds: string[];
  achievement: string;
  issuedAt: string;
  signedByName: string;
  signedByDesignation: string;
  signatureUrl: string;
}

interface IssuanceResult {
  recipientId: string;
  certificateId?: string;
  serial?: string;
  error?: string;
}

// ─── Cloudinary raw upload helper ─────────────────────────────────────────────

async function uploadPdfToCloudinary(
  pdfBuffer: Buffer,
  publicId: string
): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are not configured.");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    public_id: publicId,
    resource_type: "raw",
    timestamp,
  };

  // Build signature string
  const paramString = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&");

  const { createHash } = await import("crypto");
  const signature = createHash("sha256")
    .update(paramString + apiSecret)
    .digest("hex");

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([pdfBuffer], { type: "application/pdf" }),
    `${publicId}.pdf`
  );
  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Cloudinary upload failed: ${errText}`);
  }

  const uploadData = (await uploadRes.json()) as { secure_url: string };
  return uploadData.secure_url;
}

// ─── GET /api/certificates ────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get("templateId");
  const recipientId = searchParams.get("recipientId");
  const isRevokedParam = searchParams.get("isRevoked");
  const cursor = searchParams.get("cursor");
  const take = Math.min(parseInt(searchParams.get("take") ?? "20", 10), 100);

  const user = session.user as {
    userId: string;
    isAdmin: boolean;
    permissions: Record<string, boolean>;
  };

  const isAdminWithCerts =
    user.isAdmin && hasPermission(user.permissions, "manage_certificates");

  try {
    // Build where clause
    const where: Record<string, unknown> = {};

    if (isAdminWithCerts) {
      // Admins can filter by any field
      if (templateId) where.templateId = templateId;
      if (recipientId) where.recipientId = recipientId;
      if (isRevokedParam !== null) where.isRevoked = isRevokedParam === "true";
    } else {
      // Members can only see their own certificates
      where.recipientId = user.userId;
    }

    const certificates = await prisma.certificate.findMany({
      where,
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
      orderBy: { issuedAt: "desc" },
      take,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const total = await prisma.certificate.count({ where });
    const nextCursor =
      certificates.length === take
        ? certificates[certificates.length - 1].id
        : undefined;

    const data: CertificateCard[] = certificates.map((cert) => ({
      id: cert.id,
      serial: cert.serial,
      achievement: cert.achievement,
      issuedAt: cert.issuedAt,
      isRevoked: cert.isRevoked,
      pdfUrl: cert.pdfUrl,
      template: {
        name: cert.template.name,
        type: cert.template.type,
      },
    }));

    return NextResponse.json({ data, nextCursor, total }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/certificates] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/certificates ───────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as {
    userId: string;
    isAdmin: boolean;
    permissions: Record<string, boolean>;
  };

  if (!user.isAdmin || !hasPermission(user.permissions, "manage_certificates")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: IssueCertificateBody;
  try {
    body = (await request.json()) as IssueCertificateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    templateId,
    recipientIds,
    achievement,
    issuedAt,
    signedByName,
    signedByDesignation,
    signatureUrl,
  } = body;

  // Validate required fields
  if (!templateId || typeof templateId !== "string") {
    return NextResponse.json(
      { error: "templateId is required" },
      { status: 400 }
    );
  }
  if (
    !Array.isArray(recipientIds) ||
    recipientIds.length === 0 ||
    recipientIds.some((id) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { error: "recipientIds must be a non-empty array of strings" },
      { status: 400 }
    );
  }
  if (!achievement || typeof achievement !== "string" || achievement.trim() === "") {
    return NextResponse.json(
      { error: "achievement is required" },
      { status: 400 }
    );
  }
  if (!issuedAt || typeof issuedAt !== "string") {
    return NextResponse.json(
      { error: "issuedAt is required" },
      { status: 400 }
    );
  }
  if (!signedByName || typeof signedByName !== "string") {
    return NextResponse.json(
      { error: "signedByName is required" },
      { status: 400 }
    );
  }
  if (!signedByDesignation || typeof signedByDesignation !== "string") {
    return NextResponse.json(
      { error: "signedByDesignation is required" },
      { status: 400 }
    );
  }

  // Fetch template
  let template: {
    id: string;
    name: string;
    type: string;
    htmlContent: string;
    cssContent: string;
  } | null = null;

  try {
    template = await prisma.certificateTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        type: true,
        htmlContent: true,
        cssContent: true,
      },
    });
  } catch (error) {
    console.error("[POST /api/certificates] Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  if (!template) {
    return NextResponse.json(
      { error: "Certificate template not found" },
      { status: 404 }
    );
  }

  // Fetch club config for club name and logo
  let clubConfig: {
    clubName: string;
    logoUrl: string;
  } | null = null;

  try {
    clubConfig = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        logoUrl: true,
      },
    });
  } catch (error) {
    console.error("[POST /api/certificates] Failed to fetch club config:", error);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const results: IssuanceResult[] = [];
  const createdIds: string[] = [];

  // Process each recipient
  for (const recipientId of recipientIds) {
    // Fetch recipient
    let recipient: {
      id: string;
      fullName: string;
      email: string;
      username: string;
      avatarUrl: string;
    } | null = null;

    try {
      recipient = await prisma.member.findUnique({
        where: { id: recipientId },
        select: {
          id: true,
          fullName: true,
          email: true,
          username: true,
          avatarUrl: true,
        },
      });
    } catch (error) {
      console.error(
        `[POST /api/certificates] Failed to fetch recipient ${recipientId}:`,
        error
      );
      results.push({
        recipientId,
        error: "Failed to fetch recipient data",
      });
      continue;
    }

    if (!recipient) {
      results.push({ recipientId, error: "Recipient not found" });
      continue;
    }

    // Generate serial
    const serial = generateSerial();

    // Generate QR code
    const verifyUrl = `${baseUrl}/verify/${serial}`;
    let qrCodeDataUrl = "";
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 200,
        margin: 2,
      });
    } catch (error) {
      console.error(
        `[POST /api/certificates] QR code generation failed for serial ${serial}:`,
        error
      );
      qrCodeDataUrl = "";
    }

    // Generate PDF
    let pdfBuffer: Buffer | null = null;
    try {
      const certData = {
        memberName: recipient.fullName,
        achievement: achievement.trim(),
        date: new Date(issuedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        signedByName: signedByName.trim(),
        signedByDesignation: signedByDesignation.trim(),
        signatureUrl: signatureUrl ?? "",
        serial,
        qrCodeDataUrl,
        clubName: clubConfig?.clubName ?? "GSTU Robotics & Research Club",
        logoUrl: clubConfig?.logoUrl ?? "",
      };

      pdfBuffer = await generateCertificatePdf(
        template.htmlContent,
        template.cssContent,
        certData
      );
    } catch (error) {
      console.error(
        `[POST /api/certificates] PDF generation failed for recipient ${recipientId}:`,
        error
      );
      results.push({ recipientId, error: "PDF generation failed" });
      continue;
    }

    // Upload PDF to Cloudinary
    let pdfUrl = "";
    try {
      const publicId = `certificates/${serial}`;
      pdfUrl = await uploadPdfToCloudinary(pdfBuffer, publicId);
    } catch (error) {
      console.error(
        `[POST /api/certificates] Cloudinary upload failed for serial ${serial}:`,
        error
      );
      results.push({ recipientId, error: "PDF upload failed" });
      continue;
    }

    // Create Certificate record
    let certificateId = "";
    try {
      const certificate = await prisma.certificate.create({
        data: {
          serial,
          achievement: achievement.trim(),
          issuedAt: new Date(issuedAt),
          isRevoked: false,
          pdfUrl,
          signedByName: signedByName.trim(),
          signedByDesignation: signedByDesignation.trim(),
          signatureUrl: signatureUrl ?? "",
          templateId: template.id,
          recipientId: recipient.id,

        },
        select: { id: true },
      });
      certificateId = certificate.id;
      createdIds.push(certificateId);
    } catch (error) {
      console.error(
        `[POST /api/certificates] DB create failed for serial ${serial}:`,
        error
      );
      results.push({ recipientId, error: "Database record creation failed" });
      continue;
    }

    // Send email (fire-and-forget style — errors logged but don't block)
    try {
      // Dynamically import CertificateIssuedEmail to avoid issues if the file
      // does not yet exist during incremental builds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailModule = await import("../../../emails/CertificateEmail").catch(() => null);
      if (emailModule?.CertificateIssuedEmail) {
        const { createElement } = await import("react");
        await sendEmail({
          to: recipient.email,
          subject: `Your Certificate: ${achievement.trim()}`,
          reactComponent: createElement(emailModule.CertificateIssuedEmail, {
            memberName: recipient.fullName,
            achievement: achievement.trim(),
            certificateType: template.type,
            pdfUrl,
            verifyUrl,
            clubConfig: {
              clubName: clubConfig?.clubName ?? "GSTU Robotics & Research Club",
              logoUrl: clubConfig?.logoUrl ?? "",
              primaryColor: "#00E5FF",
            },
          }),
        });
      }
    } catch (emailError) {
      // Non-fatal — certificate was still created
      console.error(
        `[POST /api/certificates] Email send failed for ${recipient.email}:`,
        emailError
      );
    }

    // Create in-app notification (fire-and-forget)
    try {
      const notificationsModule = await import("@/lib/notifications").catch(
        () => null
      );
      if (notificationsModule?.createNotification) {
        await notificationsModule.createNotification({
          memberId: recipient.id,
          type: "certificate_issued",
          title: "Certificate Issued",
          body: `You have been awarded a certificate for: ${achievement.trim()}`,
          link: `/certificates`,
        });
      }
    } catch (notifError) {
      console.error(
        `[POST /api/certificates] Notification failed for ${recipient.id}:`,
        notifError
      );
    }

    results.push({ recipientId, certificateId, serial });
  }

  // Determine response
  const errors = results.filter((r) => r.error);
  const successes = results.filter((r) => !r.error);

  if (successes.length === 0) {
    return NextResponse.json(
      {
        error: "All certificate issuances failed",
        details: results,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: {
        certificateIds: createdIds,
        results,
        successCount: successes.length,
        failureCount: errors.length,
      },
      message:
        errors.length > 0
          ? `${successes.length} certificate(s) issued successfully; ${errors.length} failed.`
          : `${successes.length} certificate(s) issued successfully.`,
    },
    { status: 201 }
  );
}