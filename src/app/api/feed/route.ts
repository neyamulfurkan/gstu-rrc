// src/app/api/feed/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postSchema, paginationSchema } from "@/lib/validations";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const { searchParams } = request.nextUrl;

    const cursorParam = searchParams.get("cursor") ?? undefined;
    const takeParam = searchParams.get("take");
    const authorId = searchParams.get("authorId") ?? undefined;

    const paginationResult = paginationSchema.safeParse({
      cursor: cursorParam,
      take: takeParam ? parseInt(takeParam, 10) : 20,
    });

    if (!paginationResult.success) {
      return NextResponse.json(
        { error: "Invalid pagination parameters", details: paginationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { cursor, take } = paginationResult.data;
    const currentUserId = session?.user?.userId ?? null;

    // Fetch pinned post separately (only when not filtering by author)
    let pinnedPost: ReturnType<typeof buildPostShape> | null = null;
    if (!authorId) {
      const pinned = await prisma.post.findFirst({
        where: {
          isPinned: true,
          isDeleted: false,
        },
        select: {
          id: true,
          content: true,
          mediaUrls: true,
          mediaType: true,
          isPinned: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              role: {
                select: {
                  name: true,
                  color: true,
                },
              },
            },
          },
          _count: {
            select: {
              likes: true,
              comments: {
                where: { isDeleted: false },
              },
            },
          },
          likes: currentUserId
            ? {
                where: { memberId: currentUserId },
                select: { memberId: true },
              }
            : false,
        },
      });

      if (pinned) {
        pinnedPost = buildPostShape(pinned, currentUserId);
      }
    }

    // Build where clause
    const whereClause: {
      isDeleted: boolean;
      isPinned?: boolean;
      authorId?: string;
    } = {
      isDeleted: false,
    };

    if (authorId) {
      whereClause.authorId = authorId;
    } else {
      // Exclude pinned post from main feed to avoid duplication
      whereClause.isPinned = false;
    }

    // Fetch paginated posts
    const posts = await prisma.post.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        mediaType: true,
        isPinned: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            role: {
              select: {
                name: true,
                color: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: {
              where: { isDeleted: false },
            },
          },
        },
        likes: currentUserId
          ? {
              where: { memberId: currentUserId },
              select: { memberId: true },
            }
          : false,
      },
    });

    // Determine next cursor
    let nextCursor: string | undefined;
    const hasMore = posts.length > take;
    if (hasMore) {
      posts.pop();
      nextCursor = posts[posts.length - 1]?.id;
    }

    const shapedPosts = posts.map((post) => buildPostShape(post, currentUserId));

    // Count total non-deleted posts for this query
    const total = await prisma.post.count({
      where: whereClause,
    });

    return NextResponse.json({
      pinnedPost: pinnedPost ?? null,
      data: shapedPosts,
      nextCursor,
      total,
    });
  } catch (error) {
    console.error("[GET /api/feed] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
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

    const parseResult = postSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { content, mediaUrls, mediaType } = parseResult.data;

    // Verify the member still exists and is active
    const member = await prisma.member.findUnique({
      where: { id: session.user.userId },
      select: { id: true, status: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member account not found" },
        { status: 404 }
      );
    }

    if (member.status !== "active") {
      return NextResponse.json(
        { error: "Your account is not active. You cannot post at this time." },
        { status: 403 }
      );
    }

    const post = await prisma.post.create({
      data: {
        content,
        mediaUrls: mediaUrls ?? [],
        mediaType: mediaType ?? null,
        authorId: session.user.userId,
        isPinned: false,
        isDeleted: false,
      },
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        mediaType: true,
        isPinned: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            role: {
              select: {
                name: true,
                color: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    const shapedPost = {
      id: post.id,
      content: post.content,
      mediaUrls: post.mediaUrls,
      mediaType: post.mediaType,
      isPinned: post.isPinned,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        username: post.author.username,
        fullName: post.author.fullName,
        avatarUrl: post.author.avatarUrl,
        role: {
          name: post.author.role?.name ?? "Member",
          color: post.author.role?.color ?? "#7B8DB0",
        },
      },
      likesCount: 0,
      commentsCount: 0,
      isLikedByMe: false,
    };

    return NextResponse.json(
      { data: shapedPost, message: "Post created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/feed] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to normalize a Prisma post record into the PostCard shape
function buildPostShape(
  post: {
    id: string;
    content: string;
    mediaUrls: unknown;
    mediaType: string | null;
    isPinned: boolean;
    createdAt: Date;
    author: {
      id: string;
      username: string;
      fullName: string;
      avatarUrl: string;
      role: { name: string; color: string } | null;
    };
    _count: {
      likes: number;
      comments: number;
    };
    likes?: { memberId: string }[] | false;
  },
  currentUserId: string | null
) {
  const likes = post.likes;
  const isLikedByMe =
    currentUserId !== null &&
    Array.isArray(likes) &&
    likes.some((l) => l.memberId === currentUserId);

  return {
    id: post.id,
    content: post.content,
    mediaUrls: Array.isArray(post.mediaUrls) ? (post.mediaUrls as string[]) : [],
    mediaType: post.mediaType,
    isPinned: post.isPinned,
    createdAt: post.createdAt,
    author: {
      id: post.author.id,
      username: post.author.username,
      fullName: post.author.fullName,
      avatarUrl: post.author.avatarUrl,
      role: {
        name: post.author.role?.name ?? "Member",
        color: post.author.role?.color ?? "#7B8DB0",
      },
    },
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    isLikedByMe,
  };
}