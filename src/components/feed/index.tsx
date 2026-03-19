// src/components/feed/index.tsx
"use client";

import { useCallback, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { LogIn, MessageSquare, Pin } from "lucide-react";
import Link from "next/link";

import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { MemberPublic, PostCard } from "@/types/index";
import { Skeleton, Spinner } from "@/components/ui/Feedback";
import { ComposeBox } from "@/components/feed/ComposeBox";
import { PostCard as PostCardComponent } from "@/components/feed/PostCard";
import { LeftSidebar, RightSidebar } from "@/components/feed/FeedSidebars";

// ─── Animation Variants ───────────────────────────────────────────────────────

const postEnter = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15 },
  },
};

// ─── Post Skeleton ────────────────────────────────────────────────────────────

function PostSkeleton(): JSX.Element {
  return (
    <div className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} rounded="full" />
        <div className="space-y-2 flex-1">
          <Skeleton width="35%" height={14} rounded="md" />
          <Skeleton width="20%" height={12} rounded="md" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" height={14} rounded="md" />
        <Skeleton width="90%" height={14} rounded="md" />
        <Skeleton width="75%" height={14} rounded="md" />
      </div>
      <div className="flex gap-4">
        <Skeleton width={60} height={28} rounded="md" />
        <Skeleton width={60} height={28} rounded="md" />
      </div>
    </div>
  );
}

// ─── Guest Prompt Card ────────────────────────────────────────────────────────

function GuestPromptCard(): JSX.Element {
  return (
    <div className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] p-5 flex items-center gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
        <MessageSquare size={18} className="text-[var(--color-primary)]" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Share your thoughts, projects, and updates with the community.
        </p>
      </div>
      <Link
        href="/login?callbackUrl=/feed"
        className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--color-primary)] text-[var(--color-text-inverse)] text-sm font-medium transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      >
        <LogIn size={15} aria-hidden="true" />
        Log in
      </Link>
    </div>
  );
}

// ─── Pinned Post Label ────────────────────────────────────────────────────────

function PinnedLabel(): JSX.Element {
  return (
    <div className="flex items-center gap-2 px-1 mb-1">
      <Pin size={13} className="text-[var(--color-accent)]" aria-hidden="true" />
      <span className="text-xs font-medium text-[var(--color-accent)] uppercase tracking-wider">
        Pinned Post
      </span>
    </div>
  );
}

// ─── Empty Feed State ─────────────────────────────────────────────────────────

function EmptyFeed(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center mb-4">
        <MessageSquare size={24} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
      </div>
      <p className="text-[var(--color-text-primary)] font-medium mb-1">No posts yet</p>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Be the first to share something with the community.
      </p>
    </div>
  );
}

// ─── FeedPage ─────────────────────────────────────────────────────────────────

interface FeedPageProps {
  initialPosts: PostCard[];
  pinnedPost: PostCard | null;
  currentMember: MemberPublic | null;
}

export function FeedPage({
  initialPosts,
  pinnedPost,
  currentMember,
}: FeedPageProps): JSX.Element {
  const [posts, setPosts] = useState<PostCard[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | undefined>(
    initialPosts.length === 20 ? initialPosts[initialPosts.length - 1]?.id : undefined
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(initialPosts.length < 20);
  const isFetchingRef = useRef(false);

  // ─── Handlers ───────────────────────────────────────────────────

  const handleNewPost = useCallback((post: PostCard) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (isFetchingRef.current || hasReachedEnd || !nextCursor) return;

    isFetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const res = await fetch(`/api/feed?cursor=${encodeURIComponent(nextCursor)}&take=20`);
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);

      const json = await res.json() as { data: PostCard[]; nextCursor?: string };
      const newPosts = json.data ?? [];

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const unique = newPosts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...unique];
      });

      setNextCursor(json.nextCursor ?? undefined);
      if (!json.nextCursor || newPosts.length < 20) {
        setHasReachedEnd(true);
      }
    } catch (err) {
      console.error("[FeedPage] loadMorePosts error:", err);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [nextCursor, hasReachedEnd]);

  // ─── Infinite Scroll ─────────────────────────────────────────────

  const { ref: sentinelRef } = useInfiniteScroll(loadMorePosts, { threshold: 0.1 });

  // ─── Filter out pinned post from the scrollable list ─────────────

  const feedPosts = posts.filter((p) => !pinnedPost || p.id !== pinnedPost.id);

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 px-4 py-8">
      {/* ── Left Sidebar ── */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <LeftSidebar currentMember={currentMember} />
        </div>
      </aside>

      {/* ── Center Column ── */}
      <main className="flex flex-col gap-4 min-w-0">
        {/* Compose Box or Guest Prompt */}
        {currentMember ? (
          <ComposeBox currentUser={currentMember} onPost={handleNewPost} />
        ) : (
          <GuestPromptCard />
        )}

        {/* Pinned Post */}
        {pinnedPost && (
          <div>
            <PinnedLabel />
            <PostCardComponent
              post={pinnedPost}
              currentUserId={currentMember?.id}
            />
          </div>
        )}

        {/* Posts List */}
        {feedPosts.length === 0 && !isLoadingMore ? (
          <EmptyFeed />
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {feedPosts.map((post) => (
              <motion.div
                key={post.id}
                layout
                variants={postEnter}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <PostCardComponent
                  post={post}
                  currentUserId={currentMember?.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Loading skeletons during initial state */}
        {isLoadingMore && (
          <div className="flex flex-col gap-4">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {!hasReachedEnd && (
          <div
            ref={sentinelRef}
            aria-hidden="true"
            className="flex justify-center py-4"
          >
            {isLoadingMore && (
              <Spinner size="md" label="Loading more posts…" />
            )}
          </div>
        )}

        {/* End of feed indicator */}
        {hasReachedEnd && feedPosts.length > 0 && (
          <p className="text-center text-xs text-[var(--color-text-secondary)] py-4">
            You&rsquo;ve reached the end of the feed.
          </p>
        )}
      </main>

      {/* ── Right Sidebar ── */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <RightSidebar />
        </div>
      </aside>
    </div>
  );
}