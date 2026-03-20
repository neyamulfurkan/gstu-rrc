// src/app/api/feed/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { commentSchema, postSchema } from "@/lib/validations";
import type { CommentItem, PostCard } from "@/types/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSessionUser(req: NextRequest) {
  const session = await auth();
  return session?.user ?? null;
}

function buildMemberSelect() {
  return {
    id: true,
    username: true,
    fullName: true,
    avatarUrl: true,
    coverUrl: true,
    department: { select: { name: true } },
    role: { select: { name: true, color: true, category: true } },
    session: true,
    memberType: true,
    skills: true,
    socialLinks: true,
    bio: true,
    interests: true,
    createdAt: true,
    workplace: true,
  } as const;
}

async function createNotificationSafe(params: {
  memberId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
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
    console.error("[notifications] createNotification failed:", error);
  }
}

async function logActionSafe(params: {
  adminId: string;
  actionType: string;
  description: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
}) {
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
    console.error("[auditLogger] logAction failed:", error);
  }
}

function buildCommentSelect(currentUserId?: string) {
  return {
    id: true,
    content: true,
    parentId: true,
    createdAt: true,
    author: { select: buildMemberSelect() },
    _count: { select: { likes: true } },
    ...(currentUserId
      ? {
          likes: {
            where: { memberId: currentUserId },
            select: { id: true },
            take: 1,
          },
        }
      : {}),
  } as const;
}

function shapeComment(
  raw: {
    id: string;
    content: string;
    parentId: string | null;
    createdAt: Date;
    author: {
      id: string;
      username: string;
      fullName: string;
      avatarUrl: string;
      coverUrl: string;
      department: { name: string };
      role: { name: string; color: string; category: string };
      session: string;
      memberType: string;
      skills: string[];
      socialLinks: unknown;
      bio: string | null;
      interests: string | null;
      createdAt: Date;
      workplace?: string | null;
    };
    _count: { likes: number };
    likes?: { id: string }[];
    replies?: ReturnType<typeof shapeComment>[];
  },
  replies?: CommentItem[]
): CommentItem {
  return {
    id: raw.id,
    content: raw.content,
    parentId: raw.parentId ?? null,
    createdAt: raw.createdAt,
    author: {
      id: raw.author.id,
      username: raw.author.username,
      fullName: raw.author.fullName,
      avatarUrl: raw.author.avatarUrl,
      coverUrl: raw.author.coverUrl,
      department: raw.author.department,
      role: raw.author.role,
      session: raw.author.session,
      memberType: raw.author.memberType,
      skills: raw.author.skills,
      socialLinks: (raw.author.socialLinks as Record<string, string>) ?? {},
      bio: raw.author.bio ?? null,
      interests: raw.author.interests ?? null,
      createdAt: raw.author.createdAt,
      workplace: raw.author.workplace ?? null,
    },
    likesCount: raw._count.likes,
    isLikedByMe: (raw.likes?.length ?? 0) > 0,
    replies: replies ?? [],
  };
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const currentUserId = session?.user?.userId;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const postId = params.id;

  // Return paginated comments for a post
  if (type === "comments") {
    const cursor = searchParams.get("cursor") ?? undefined;
    const take = Math.min(Number(searchParams.get("take") ?? "20"), 100);

    try {
      const post = await prisma.post.findUnique({
        where: { id: postId, isDeleted: false },
        select: { id: true },
      });

      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      const topLevelComments = await prisma.comment.findMany({
        where: { postId, parentId: null, isDeleted: false },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          parentId: true,
          createdAt: true,
          author: { select: buildMemberSelect() },
          _count: { select: { likes: true } },
          ...(currentUserId
            ? {
                likes: {
                  where: { memberId: currentUserId },
                  select: { id: true },
                  take: 1,
                },
              }
            : {}),
        },
      });

      const hasNextPage = topLevelComments.length > take;
      const items = hasNextPage ? topLevelComments.slice(0, take) : topLevelComments;
      const nextCursor = hasNextPage ? items[items.length - 1]?.id : undefined;

      // Fetch first 2 replies per comment
      const commentIds = items.map((c) => c.id);
      const allReplies = await prisma.comment.findMany({
        where: { parentId: { in: commentIds }, isDeleted: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          parentId: true,
          createdAt: true,
          author: { select: buildMemberSelect() },
          _count: { select: { likes: true } },
          ...(currentUserId
            ? {
                likes: {
                  where: { memberId: currentUserId },
                  select: { id: true },
                  take: 1,
                },
              }
            : {}),
        },
      });

      const repliesByParent: Record<string, typeof allReplies> = {};
      for (const reply of allReplies) {
        const pid = reply.parentId ?? "";
        if (!repliesByParent[pid]) repliesByParent[pid] = [];
        repliesByParent[pid].push(reply);
      }

      const shaped = items.map((c) => {
        const rawReplies = (repliesByParent[c.id] ?? []).slice(0, 2);
        const shapedReplies = rawReplies.map((r) =>
          shapeComment(r as Parameters<typeof shapeComment>[0])
        );
        return shapeComment(c as Parameters<typeof shapeComment>[0], shapedReplies);
      });

      return NextResponse.json({
        data: shaped,
        nextCursor,
        total: await prisma.comment.count({
          where: { postId, parentId: null, isDeleted: false },
        }),
      });
    } catch (error) {
      console.error("[GET /api/feed/[id]] comments error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  // Return single post with first 3 comments and first 2 replies each
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        mediaType: true,
        isPinned: true,
        createdAt: true,
        author: { select: buildMemberSelect() },
        _count: { select: { likes: true, comments: true } },
        ...(currentUserId
          ? {
              likes: {
                where: { memberId: currentUserId },
                select: { id: true },
                take: 1,
              },
            }
          : {}),
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Fetch first 3 top-level comments
    const topComments = await prisma.comment.findMany({
      where: { postId, parentId: null, isDeleted: false },
      take: 3,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        parentId: true,
        createdAt: true,
        author: { select: buildMemberSelect() },
        _count: { select: { likes: true } },
        ...(currentUserId
          ? {
              likes: {
                where: { memberId: currentUserId },
                select: { id: true },
                take: 1,
              },
            }
          : {}),
      },
    });

    const commentIds = topComments.map((c) => c.id);
    const allReplies = await prisma.comment.findMany({
      where: { parentId: { in: commentIds }, isDeleted: false },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        parentId: true,
        createdAt: true,
        author: { select: buildMemberSelect() },
        _count: { select: { likes: true } },
        ...(currentUserId
          ? {
              likes: {
                where: { memberId: currentUserId },
                select: { id: true },
                take: 1,
              },
            }
          : {}),
      },
    });

    const repliesByParent: Record<string, typeof allReplies> = {};
    for (const reply of allReplies) {
      const pid = reply.parentId ?? "";
      if (!repliesByParent[pid]) repliesByParent[pid] = [];
      repliesByParent[pid].push(reply);
    }

    const shapedComments = topComments.map((c) => {
      const rawReplies = (repliesByParent[c.id] ?? []).slice(0, 2);
      const shapedReplies = rawReplies.map((r) =>
        shapeComment(r as Parameters<typeof shapeComment>[0])
      );
      return shapeComment(c as Parameters<typeof shapeComment>[0], shapedReplies);
    });

    const postData: PostCard & { comments: CommentItem[] } = {
      id: post.id,
      content: post.content,
      mediaUrls: Array.isArray(post.mediaUrls) ? (post.mediaUrls as string[]) : [],
      mediaType: post.mediaType ?? null,
      isPinned: post.isPinned,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        username: post.author.username,
        fullName: post.author.fullName,
        avatarUrl: post.author.avatarUrl,
        coverUrl: post.author.coverUrl,
        department: post.author.department,
        role: post.author.role,
        session: post.author.session,
        memberType: post.author.memberType,
        skills: Array.isArray(post.author.skills) ? (post.author.skills as string[]) : [],
        socialLinks: (post.author.socialLinks as Record<string, string>) ?? {},
        bio: post.author.bio ?? null,
        interests: post.author.interests ?? null,
        createdAt: post.author.createdAt,
        workplace: post.author.workplace ?? null,
      },
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isLikedByMe: ((post as { likes?: { id: string }[] }).likes?.length ?? 0) > 0,
      comments: shapedComments,
    };

    return NextResponse.json({ data: postData });
  } catch (error) {
    console.error("[GET /api/feed/[id]] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.userId;
  const isUserAdmin =
    session.user.isAdmin === true &&
    hasPermission(session.user.permissions, "manage_feed");

  const postId = params.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId !== currentUserId && !isUserAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        content: parsed.data.content,
        mediaUrls: parsed.data.mediaUrls ?? [],
        mediaType: parsed.data.mediaType ?? null,
      },
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        mediaType: true,
        isPinned: true,
        createdAt: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (isUserAdmin && post.authorId !== currentUserId) {
      await logActionSafe({
        adminId: currentUserId,
        actionType: "UPDATE_POST",
        description: `Admin edited post ${postId}`,
        entityType: "Post",
        entityId: postId,
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          undefined,
      });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PUT /api/feed/[id]] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.userId;
  const isUserAdmin =
    session.user.isAdmin === true &&
    hasPermission(session.user.permissions, "manage_feed");

  const postId = params.id;

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isAuthor = post.authorId === currentUserId;

    if (!isAuthor && !isUserAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isUserAdmin && !isAuthor) {
      // Admin hard-delete: delete likes, comments, then post
      await prisma.like.deleteMany({ where: { postId } });
      await prisma.like.deleteMany({ where: { comment: { postId } } });
      await prisma.comment.deleteMany({ where: { postId } });
      await prisma.post.delete({ where: { id: postId } });
      await logActionSafe({
        adminId: currentUserId,
        actionType: "DELETE_POST",
        description: `Admin hard-deleted post ${postId}`,
        entityType: "Post",
        entityId: postId,
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          undefined,
      });
    } else {
      // Author soft-delete
      await prisma.post.update({
        where: { id: postId },
        data: { isDeleted: true },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/feed/[id]] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.userId;
  const postId = params.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("action" in body)) {
    return NextResponse.json(
      { error: "Missing action field" },
      { status: 400 }
    );
  }

  const action = (body as { action: unknown }).action;

  if (action !== "like" && action !== "unlike" && action !== "pin" && action !== "unpin") {
    return NextResponse.json(
      { error: "Invalid action. Expected: like, unlike, pin, unpin" },
      { status: 400 }
    );
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (action === "like") {
      try {
        await prisma.like.create({
          data: { postId, memberId: currentUserId },
        });
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr?.code === "P2002") {
          // Already liked — idempotent
          return NextResponse.json({ data: { liked: true } });
        }
        throw err;
      }
      return NextResponse.json({ data: { liked: true } });
    }

    if (action === "unlike") {
      await prisma.like.deleteMany({
        where: { postId, memberId: currentUserId },
      });
      return NextResponse.json({ data: { liked: false } });
    }

    // pin / unpin requires manage_feed
    const canManageFeed =
      session.user.isAdmin === true &&
      hasPermission(session.user.permissions, "manage_feed");

    if (!canManageFeed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "pin") {
      // Clear existing pinned post first
      await prisma.post.updateMany({
        where: { isPinned: true, isDeleted: false },
        data: { isPinned: false },
      });
      await prisma.post.update({
        where: { id: postId },
        data: { isPinned: true },
      });
      await logActionSafe({
        adminId: currentUserId,
        actionType: "PIN_POST",
        description: `Admin pinned post ${postId}`,
        entityType: "Post",
        entityId: postId,
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          undefined,
      });
      return NextResponse.json({ data: { isPinned: true } });
    }

    if (action === "unpin") {
      await prisma.post.update({
        where: { id: postId },
        data: { isPinned: false },
      });
      await logActionSafe({
        adminId: currentUserId,
        actionType: "UNPIN_POST",
        description: `Admin unpinned post ${postId}`,
        entityType: "Post",
        entityId: postId,
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          undefined,
      });
      return NextResponse.json({ data: { isPinned: false } });
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/feed/[id]] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST (Comments) ──────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.userId;
  const postId = params.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    (body as { type?: unknown }).type !== "comment"
  ) {
    return NextResponse.json(
      { error: "Body must include type: 'comment'" },
      { status: 400 }
    );
  }

  const commentBody = {
    content: (body as { content?: unknown }).content,
    postId,
    parentId: (body as { parentId?: unknown }).parentId,
  };

  const parsed = commentSchema.safeParse(commentBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // If parentId provided, validate the parent comment exists on this post
    if (parsed.data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: {
          id: parsed.data.parentId,
          postId,
          isDeleted: false,
        },
        select: { id: true },
      });
      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: parsed.data.content,
        postId,
        authorId: currentUserId,
        parentId: parsed.data.parentId ?? null,
        isDeleted: false,
      },
      select: {
        id: true,
        content: true,
        parentId: true,
        createdAt: true,
        author: { select: buildMemberSelect() },
        _count: { select: { likes: true } },
      },
    });

    // Notify post author if different from commenter
    if (post.authorId !== currentUserId) {
      const commenterName = session.user.fullName ?? session.user.username ?? "Someone";
      await createNotificationSafe({
        memberId: post.authorId,
        type: "new_comment",
        title: "New comment on your post",
        body: `${commenterName} commented on your post.`,
        link: `/feed#${postId}`,
      });
    }

    const shaped = shapeComment(comment as Parameters<typeof shapeComment>[0]);

    return NextResponse.json({ data: shaped }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/feed/[id]] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}