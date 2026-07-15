// src/app/api/certificates/[id]/regenerate/route.ts

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateCertificatePdf } from "@/lib/certificate";

async function uploadPdfToCloudinary(pdfBuffer: Buffer, publicId: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are not configured.");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    access_mode: "public",
    public_id: publicId,
    timestamp,
  };
  const paramString = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&");
  const { createHash } = await import("crypto");
  const signature = createHash("sha256").update(paramString + apiSecret).digest("hex");
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), `${publicId}.pdf`);
  formData.append("public_id", publicId);
  formData.append("access_mode", "public");
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Cloudinary upload failed: ${errText}`);
  }
  const uploadData = (await uploadRes.json()) as { secure_url: string };
  return uploadData.secure_url;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        serial: true,
        achievement: true,
        issuedAt: true,
        signedByName: true,
        signedByDesignation: true,
        signatureUrl: true,
        signedByName2: true,
        signedByDesignation2: true,
        signatureUrl2: true,
        signedByName3: true,
        signedByDesignation3: true,
        signatureUrl3: true,
        recipient: { select: { fullName: true } },
      },
    });

    if (!cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const clubConfig = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: { clubName: true, logoUrl: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const verifyUrl = `${baseUrl}/verify/${cert.serial}`;
    let qrCodeDataUrl = "";
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 2 });
    } catch {
      qrCodeDataUrl = "";
    }

    const pdfBuffer = await generateCertificatePdf("", "", {
      memberName: cert.recipient.fullName,
      achievement: cert.achievement,
      date: new Date(cert.issuedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      signedByName: cert.signedByName,
      signedByDesignation: cert.signedByDesignation,
      signatureUrl: cert.signatureUrl,
      signedByName2: cert.signedByName2,
      signedByDesignation2: cert.signedByDesignation2,
      signatureUrl2: cert.signatureUrl2,
      signedByName3: cert.signedByName3,
      signedByDesignation3: cert.signedByDesignation3,
      signatureUrl3: cert.signatureUrl3,
      serial: cert.serial,
      qrCodeDataUrl,
      clubName: clubConfig?.clubName ?? "GSTU Robotics & Research Club",
      logoUrl: clubConfig?.logoUrl ?? "",
    });

    const pdfUrl = await uploadPdfToCloudinary(pdfBuffer, `certificates/${cert.serial}-regen-${Date.now()}`);

    await prisma.certificate.update({
      where: { id: cert.id },
      data: { pdfUrl },
    });

    return NextResponse.json({ data: { pdfUrl }, message: "Certificate PDF regenerated." }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/certificates/[id]/regenerate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}