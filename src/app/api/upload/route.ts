// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSignedUploadParams } from "@/lib/cloudinary";
import type { NextRequest } from "next/server";

const ALLOWED_FOLDERS = [
  "members/avatars",
  "members/covers",
  "gallery",
  "applications",
  "payments",
  "admin/events",
  "admin/projects",
  "admin/instruments",
  "admin/gallery",
  "admin/certificates",
] as const;

type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

function isAllowedFolder(folder: string): folder is AllowedFolder {
  return (ALLOWED_FOLDERS as readonly string[]).includes(folder);
}

export const POST = auth(async function POST(request: NextRequest & { auth: Awaited<ReturnType<typeof auth>> | null }): Promise<NextResponse> {
  try {
    const session = request.auth;

    const PUBLIC_FOLDERS = ["applications", "payments", "members/avatars"];
    const requestedFolder = (() => {
      try {
        const raw = request.clone();
        return null;
      } catch { return null; }
    })();

    if (!session?.user?.userId) {
      let bodyForCheck: unknown;
      try {
        bodyForCheck = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid request body. Expected JSON." },
          { status: 400 }
        );
      }
      if (typeof bodyForCheck !== "object" || bodyForCheck === null) {
        return NextResponse.json(
          { error: "Invalid request body. Expected a JSON object." },
          { status: 400 }
        );
      }
      const { folder: f, publicId: pid } = bodyForCheck as { folder?: unknown; publicId?: unknown };
      if (!f || typeof f !== "string") {
        return NextResponse.json(
          { error: "Missing or invalid 'folder' field. Must be a non-empty string." },
          { status: 400 }
        );
      }
      if (!PUBLIC_FOLDERS.includes(f)) {
        return NextResponse.json(
          { error: "Unauthorized. You must be logged in to upload files." },
          { status: 401 }
        );
      }
      if (!isAllowedFolder(f)) {
        return NextResponse.json(
          { error: `Invalid folder '${f}'.` },
          { status: 400 }
        );
      }
      if (pid !== undefined && typeof pid !== "string") {
        return NextResponse.json(
          { error: "Invalid 'publicId' field. Must be a string if provided." },
          { status: 400 }
        );
      }
      const resolvedPid = typeof pid === "string" && pid.trim().length > 0 ? pid.trim() : undefined;
      const p = getSignedUploadParams(f, resolvedPid);
      return NextResponse.json(
        { signature: p.signature, timestamp: p.timestamp, cloudName: p.cloudName, apiKey: p.apiKey, folder: f },
        { status: 200 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid request body. Expected a JSON object." },
        { status: 400 }
      );
    }

    const { folder, publicId } = body as { folder?: unknown; publicId?: unknown };

    if (!folder || typeof folder !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'folder' field. Must be a non-empty string." },
        { status: 400 }
      );
    }

    if (!isAllowedFolder(folder)) {
      return NextResponse.json(
        {
          error: `Invalid folder '${folder}'. Must be one of: ${ALLOWED_FOLDERS.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (publicId !== undefined && typeof publicId !== "string") {
      return NextResponse.json(
        { error: "Invalid 'publicId' field. Must be a string if provided." },
        { status: 400 }
      );
    }

    const resolvedPublicId =
      typeof publicId === "string" && publicId.trim().length > 0
        ? publicId.trim()
        : undefined;

    const params = getSignedUploadParams(folder, resolvedPublicId);

    return NextResponse.json(
      {
        signature: params.signature,
        timestamp: params.timestamp,
        cloudName: params.cloudName,
        apiKey: params.apiKey,
        folder,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[/api/upload] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error. Failed to generate upload parameters." },
      { status: 500 }
    );
  }
});