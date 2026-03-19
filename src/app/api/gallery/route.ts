import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { galleryItemSchema, paginationSchema } from "@/lib/validations";
import { isAdmin } from "@/lib/permissions";
import type { ApiListResponse, GalleryItemCard } from "@/types/index";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const eventId = searchParams.get("eventId");
    const projectId = searchParams.get("projectId");
    const yearParam = searchParams.get("year");
    const statusParam = searchParams.get("status");
    const cursorParam = searchParams.get("cursor");
    const takeParam = searchParams.get("take");

    const paginationResult = paginationSchema.safeParse({
      cursor: cursorParam ?? undefined,
      take: takeParam ? parseInt(takeParam, 10) : 30,
    });

    const take = paginationResult.success ? paginationResult.data.take : 30;
    const cursor = paginationResult.success ? paginationResult.data.cursor : undefined;

    const adminUser = session && isAdmin(session);

    let statusFilter: string | string[];
    if (adminUser && statusParam) {
      statusFilter = statusParam;
    } else {
      statusFilter = "approved";
    }

    const where: Record<string, unknown> = {};

    if (Array.isArray(statusFilter)) {
      where.status = { in: statusFilter };
    } else {
      where.status = statusFilter;
    }

    if (type) {
      where.type = type;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (eventId) {
      where.eventId = eventId;
    }
    if (projectId) {
      where.projectId = projectId;
    }
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        where.year = year;
      }
    }

    const [items, total] = await Promise.all([
      prisma.galleryItem.findMany({
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
          url: true,
          type: true,
          title: true,
          altText: true,
          category: { select: { name: true } },
          uploaderId: true,
          uploader: {
            select: { username: true, fullName: true, avatarUrl: true },
          },
          eventId: true,
          projectId: true,
          downloadEnabled: true,
          year: true,
          createdAt: true,
        },
      }),
      prisma.galleryItem.count({ where }),
    ]);

    let nextCursor: string | undefined;
    let data = items;

    if (items.length > take) {
      data = items.slice(0, take);
      nextCursor = data[data.length - 1]?.id;
    }

    const galleryItems: GalleryItemCard[] = data.map((item) => ({
      id: item.id,
      url: item.url,
      type: item.type,
      title: item.title ?? null,
      altText: item.altText,
      category: { name: item.category.name },
      uploaderId: item.uploaderId ?? null,
      uploader: item.uploader
        ? {
            username: item.uploader.username,
            fullName: item.uploader.fullName,
            avatarUrl: item.uploader.avatarUrl,
          }
        : null,
      eventId: item.eventId ?? null,
      projectId: item.projectId ?? null,
      downloadEnabled: item.downloadEnabled,
      year: item.year,
      createdAt: item.createdAt,
    }));

    const response: ApiListResponse<GalleryItemCard> = {
      data: galleryItems,
      nextCursor,
      total,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[GET /api/gallery]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { userId: string }).userId;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = galleryItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const adminUser = isAdmin(session);
    const status = adminUser ? "approved" : "pending";

    const newItem = await prisma.galleryItem.create({
      data: {
        url: data.url,
        type: data.type,
        title: data.title ?? null,
        altText: data.altText,
        categoryId: data.categoryId,
        tags: data.tags ?? [],
        eventId: data.eventId ?? null,
        projectId: data.projectId ?? null,
        year: data.year,
        downloadEnabled: data.downloadEnabled ?? false,
        description: data.description ?? null,
        status,
        uploaderId: userId,
        isAdminUpload: adminUser,
      },
      select: { id: true },
    });

    const createdItem = await prisma.galleryItem.findUnique({
      where: { id: newItem.id },
      select: {
        id: true,
        url: true,
        type: true,
        title: true,
        altText: true,
        category: { select: { name: true } },
        uploaderId: true,
        uploader: {
          select: { username: true, fullName: true, avatarUrl: true },
        },
        eventId: true,
        projectId: true,
        downloadEnabled: true,
        year: true,
        createdAt: true,
      },
    });

    if (!createdItem) {
      return NextResponse.json({ error: "Failed to retrieve created item" }, { status: 500 });
    }

    const galleryItem = {
      id: createdItem.id,
      url: createdItem.url,
      type: createdItem.type,
      title: createdItem.title ?? null,
      altText: createdItem.altText,
      category: { name: createdItem.category.name },
      uploaderId: createdItem.uploaderId ?? null,
      uploader: createdItem.uploader
        ? {
            username: createdItem.uploader.username,
            fullName: createdItem.uploader.fullName,
            avatarUrl: createdItem.uploader.avatarUrl,
          }
        : null,
      eventId: createdItem.eventId ?? null,
      projectId: createdItem.projectId ?? null,
      downloadEnabled: createdItem.downloadEnabled,
      year: createdItem.year,
      createdAt: createdItem.createdAt,
    };

    return NextResponse.json({ data: galleryItem }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/gallery]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}