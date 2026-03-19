// src/app/api/verify/[serial]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 10) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { serial: string } }
): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { valid: false, message: "Too many requests. Please try again in a minute." },
      { status: 429 }
    );
  }

  const { serial } = params;

  if (!serial || typeof serial !== "string" || serial.trim() === "") {
    return NextResponse.json(
      { valid: false, message: "Certificate serial number is required." },
      { status: 200 }
    );
  }

  try {
    const certificate = await prisma.certificate.findUnique({
      where: { serial: serial.trim() },
      select: {
        id: true,
        serial: true,
        isRevoked: true,
        issuedAt: true,
        achievement: true,
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
        { valid: false, message: "Certificate not found." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        isRevoked: certificate.isRevoked,
        serial: certificate.serial,
        recipient: {
          fullName: certificate.recipient.fullName,
          username: certificate.recipient.username,
          avatarUrl: certificate.recipient.avatarUrl,
        },
        achievement: certificate.achievement,
        issuedAt: certificate.issuedAt.toISOString(),
        templateName: certificate.template.name,
        templateType: certificate.template.type,
        signedByName: certificate.signedByName,
        signedByDesignation: certificate.signedByDesignation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/verify/[serial]]", error);
    return NextResponse.json(
      { valid: false, message: "An error occurred while verifying the certificate." },
      { status: 500 }
    );
  }
}