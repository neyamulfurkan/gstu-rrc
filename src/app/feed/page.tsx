// src/app/feed/page.tsx

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedPage } from "@/components/feed/index";
import type { PostCard, MemberPublic } from "@/types/index";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await prisma.clubConfig
    .findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        metaDescription: true,
        ogImageUrl: true,
      },
    })
    .catch(() => null);

  const clubName = config?.clubName ?? "Robotics & Research Club";

  return {
    title: `Feed | ${clubName}`,
    description: `Community feed for ${clubName}. Share updates, posts, and connect with fellow members.`,
    openGraph: {
      title: `Feed | ${clubName}`,
      description: `Community feed for ${clubName}.`,
      type: "website",
      images: config?.ogImageUrl ? [{ url: config.ogImageUrl }] : [],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function FeedPageRoute(): Promise<JSX.Element> {
  const session = await auth();
  const currentUserId = session?.user?.userId ?? null;

  // ── Parallel fetch: posts + pinned post + current member ────────────────────

  const [rawPosts, pinnedPosts, currentMemberRaw] = await Promise.all([
    // First 20 non-deleted, non-pinned posts
    prisma.post
      .findMany({
        where: {
          isDeleted: false,
          isPinned: false,
          author: { status: "active" },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
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
      })
      .catch(() => []),

    // Pinned post (at most 1)
    prisma.post
      .findMany({
        where: {
          isPinned: true,
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
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
      })
      .catch(() => []),

    // Current member (if logged in)
    currentUserId
      ? prisma.member
          .findUnique({
            where: { id: currentUserId },
            select: {
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
            },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  // ── Collect all post IDs (regular + pinned) for like lookups ────────────────

  const allPostIds = [
    ...rawPosts.map((p) => p.id),
    ...pinnedPosts.map((p) => p.id),
  ];

  // ── Fetch likes for current user in one query ────────────────────────────────

  const userLikes: Set<string> = new Set();

  if (currentUserId && allPostIds.length > 0) {
    const likes = await prisma.like
      .findMany({
        where: {
          memberId: currentUserId,
          postId: { in: allPostIds },
          commentId: null,
        },
        select: { postId: true },
      })
      .catch(() => []);

    for (const like of likes) {
      if (like.postId) userLikes.add(like.postId);
    }
  }

  // ── Map raw post to PostCard shape ───────────────────────────────────────────

  function mapToPostCard(raw: (typeof rawPosts)[number]): PostCard {
    if (!raw.author) {
      return {
        id: raw.id,
        content: raw.content,
        mediaUrls: Array.isArray(raw.mediaUrls) ? (raw.mediaUrls as string[]) : [],
        mediaType: raw.mediaType ?? null,
        isPinned: raw.isPinned,
        author: {
          id: "",
          username: "deleted",
          fullName: "Deleted User",
          avatarUrl: "",
          coverUrl: "",
          department: { name: "" },
          role: { name: "Member", color: "#7B8DB0", category: "general" },
          session: "",
          memberType: "member",
          skills: [],
          socialLinks: {},
          bio: null,
          interests: null,
          createdAt: raw.createdAt,
          workplace: null,
        },
        likesCount: raw._count.likes,
        commentsCount: raw._count.comments,
        isLikedByMe: userLikes.has(raw.id),
        createdAt: raw.createdAt,
      };
    }
    const author: MemberPublic = {
      id: raw.author.id,
      username: raw.author.username,
      fullName: raw.author.fullName,
      avatarUrl: raw.author.avatarUrl,
      coverUrl: raw.author.coverUrl ?? "",
      department: { name: raw.author.department?.name ?? "" },
      role: {
        name: raw.author.role?.name ?? "Member",
        color: raw.author.role?.color ?? "#7B8DB0",
        category: raw.author.role?.category ?? "general",
      },
      session: raw.author.session ?? "",
      memberType: raw.author.memberType ?? "member",
      skills: Array.isArray(raw.author.skills) ? (raw.author.skills as string[]) : [],
      socialLinks:
        raw.author.socialLinks &&
        typeof raw.author.socialLinks === "object" &&
        !Array.isArray(raw.author.socialLinks)
          ? (raw.author.socialLinks as Record<string, string>)
          : {},
      bio: raw.author.bio ?? null,
      interests: raw.author.interests ?? null,
      createdAt: raw.author.createdAt,
      workplace: raw.author.workplace ?? null,
    };

    return {
      id: raw.id,
      content: raw.content,
      mediaUrls: Array.isArray(raw.mediaUrls) ? (raw.mediaUrls as string[]) : [],
      mediaType: raw.mediaType ?? null,
      isPinned: raw.isPinned,
      author,
      likesCount: raw._count.likes,
      commentsCount: raw._count.comments,
      isLikedByMe: userLikes.has(raw.id),
      createdAt: raw.createdAt,
    };
  }

  const initialPosts: PostCard[] = rawPosts.map(mapToPostCard);
  const pinnedPost: PostCard | null =
    pinnedPosts.length > 0 ? mapToPostCard(pinnedPosts[0]) : null;

  // ── Build current member shape ────────────────────────────────────────────────

  let currentMember: MemberPublic | null = null;
  if (currentMemberRaw) {
    currentMember = {
      id: currentMemberRaw.id,
      username: currentMemberRaw.username,
      fullName: currentMemberRaw.fullName,
      avatarUrl: currentMemberRaw.avatarUrl,
      coverUrl: currentMemberRaw.coverUrl ?? "",
      department: { name: currentMemberRaw.department?.name ?? "" },
      role: {
        name: currentMemberRaw.role?.name ?? "Member",
        color: currentMemberRaw.role?.color ?? "#7B8DB0",
        category: currentMemberRaw.role?.category ?? "general",
      },
      session: currentMemberRaw.session ?? "",
      memberType: currentMemberRaw.memberType ?? "member",
      skills: Array.isArray(currentMemberRaw.skills)
        ? (currentMemberRaw.skills as string[])
        : [],
      socialLinks:
        currentMemberRaw.socialLinks &&
        typeof currentMemberRaw.socialLinks === "object" &&
        !Array.isArray(currentMemberRaw.socialLinks)
          ? (currentMemberRaw.socialLinks as Record<string, string>)
          : {},
      bio: currentMemberRaw.bio ?? null,
      interests: currentMemberRaw.interests ?? null,
      createdAt: currentMemberRaw.createdAt,
      workplace: currentMemberRaw.workplace ?? null,
    };
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <FeedPage
          initialPosts={initialPosts}
          pinnedPost={pinnedPost}
          currentMember={currentMember}
        />
      </div>
    </main>
  );
}