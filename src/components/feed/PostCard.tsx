// src/components/feed/PostCard.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Pin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { PostCard as PostCardType } from "@/types/index";
import { formatDate, cn } from "@/lib/utils";
import { Badge, toast } from "@/components/ui/Feedback";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
  Modal,
} from "@/components/ui/Overlay";
import { VideoPlayer } from "@/components/ui/Media";
import { CommentSection } from "@/components/feed/CommentSection";

// ─── Mention Parser ───────────────────────────────────────────────────────────

interface MentionSegment {
  type: "text" | "mention";
  value: string;
}

function parseMentions(content: string): MentionSegment[] {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part) => {
    if (/^@\w+$/.test(part)) {
      return { type: "mention", value: part };
    }
    return { type: "text", value: part };
  });
}

function RenderContent({
  content,
  expanded,
}: {
  content: string;
  expanded: boolean;
}): JSX.Element {
  const displayContent = expanded ? content : content.slice(0, 300);
  const segments = parseMentions(displayContent);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "mention") {
          const username = seg.value.slice(1);
          return (
            <Link
              key={i}
              href={`/members/${username}`}
              className="text-[var(--color-accent)] hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {seg.value}
            </Link>
          );
        }
        return <React.Fragment key={i}>{seg.value}</React.Fragment>;
      })}
    </>
  );
}

// ─── Media Grid ───────────────────────────────────────────────────────────────

function isVideoUrl(url: string): boolean {
  return (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("facebook.com") ||
    /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
  );
}

interface MediaGridProps {
  mediaUrls: string[];
  mediaType?: string | null;
}

function MediaGrid({ mediaUrls, mediaType }: MediaGridProps): JSX.Element | null {
  if (!mediaUrls || mediaUrls.length === 0) return null;

  const count = mediaUrls.length;

  if (count === 1) {
    const url = mediaUrls[0];
    const isVideo = mediaType === "video" || isVideoUrl(url);

    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)]">
        {isVideo ? (
          <VideoPlayer src={url} className="w-full" />
        ) : (
          <div className="relative aspect-video w-full">
            <Image
              src={url}
              alt="Post media"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>
        )}
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl">
        {mediaUrls.map((url, i) => (
          <div key={i} className="relative aspect-square overflow-hidden">
            {isVideoUrl(url) ? (
              <VideoPlayer src={url} className="h-full w-full" />
            ) : (
              <Image
                src={url}
                alt={`Post media ${i + 1}`}
                fill
                className="object-cover"
                sizes="300px"
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl">
        <div className="relative row-span-2 aspect-auto overflow-hidden" style={{ minHeight: "200px" }}>
          {isVideoUrl(mediaUrls[0]) ? (
            <VideoPlayer src={mediaUrls[0]} className="h-full w-full" />
          ) : (
            <Image
              src={mediaUrls[0]}
              alt="Post media 1"
              fill
              className="object-cover"
              sizes="300px"
            />
          )}
        </div>
        <div className="relative aspect-square overflow-hidden">
          {isVideoUrl(mediaUrls[1]) ? (
            <VideoPlayer src={mediaUrls[1]} className="h-full w-full" />
          ) : (
            <Image
              src={mediaUrls[1]}
              alt="Post media 2"
              fill
              className="object-cover"
              sizes="150px"
            />
          )}
        </div>
        <div className="relative aspect-square overflow-hidden">
          {isVideoUrl(mediaUrls[2]) ? (
            <VideoPlayer src={mediaUrls[2]} className="h-full w-full" />
          ) : (
            <Image
              src={mediaUrls[2]}
              alt="Post media 3"
              fill
              className="object-cover"
              sizes="150px"
            />
          )}
        </div>
      </div>
    );
  }

  // 4+ items: 2×2 grid with overflow indicator
  const displayUrls = mediaUrls.slice(0, 4);
  const remaining = count - 4;

  return (
    <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-xl">
      {displayUrls.map((url, i) => (
        <div key={i} className="relative aspect-square overflow-hidden">
          {isVideoUrl(url) ? (
            <VideoPlayer src={url} className="h-full w-full" />
          ) : (
            <Image
              src={url}
              alt={`Post media ${i + 1}`}
              fill
              className="object-cover"
              sizes="300px"
            />
          )}
          {i === 3 && remaining > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="text-2xl font-bold text-white">+{remaining}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  initialContent: string;
  onSave: (newContent: string) => void;
}

function EditPostModal({
  isOpen,
  onClose,
  postId,
  initialContent,
  onSave,
}: EditPostModalProps): JSX.Element {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setError(null);
    }
  }, [isOpen, initialContent]);

  async function handleSave() {
    if (!content.trim()) {
      setError("Post content cannot be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to update post.");
      }
      onSave(content.trim());
      toast("Post updated successfully.", "success");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Post" size="md">
      <div className="p-5 flex flex-col gap-4">
        {error && (
          <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={5000}
          className={cn(
            "w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
            "px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
            "focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30",
            "transition-colors"
          )}
          placeholder="What's on your mind?"
          disabled={saving}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-secondary)]">
            {content.length}/5000
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={cn(
                "rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm",
                "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className={cn(
                "rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white",
                "hover:bg-[var(--color-primary-hover)] transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onDeleted: () => void;
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  postId,
  onDeleted,
}: DeleteConfirmModalProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/feed/${postId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete post.");
      }
      toast("Post deleted.", "success");
      onDeleted();
      onClose();
    } catch {
      toast("Failed to delete post. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Post" size="sm">
      <div className="p-5 flex flex-col gap-5">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Are you sure you want to delete this post? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className={cn(
              "rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "disabled:opacity-50"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "rounded-lg bg-[var(--color-error)] px-5 py-2 text-sm font-medium text-white",
              "hover:opacity-90 transition-opacity",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]/50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: PostCardType;
  currentUserId?: string;
  isAdminViewer?: boolean;
  onDeleted?: (postId: string) => void;
}

export function PostCard({
  post,
  currentUserId,
  isAdminViewer = false,
  onDeleted,
}: PostCardProps): JSX.Element {
  const isAuthor = !!currentUserId && currentUserId === post.author.id;

  // Optimistic like state
  const [isLiked, setIsLiked] = useState(post.isLikedByMe);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const likeInFlight = useRef(false);

  // Content expansion
  const [expanded, setExpanded] = useState(false);
  const isLong = post.content.length > 300;

  // Comment section visibility
  const [showComments, setShowComments] = useState(false);

  // Post state (may be updated by edit)
  const [content, setContent] = useState(post.content);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isPinned, setIsPinned] = useState(post.isPinned);

  // Modal states
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleLike = useCallback(async () => {
    if (likeInFlight.current || !currentUserId) return;

    const prevLiked = isLiked;
    const prevCount = likesCount;

    // Optimistic update
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount((c) => (newLiked ? c + 1 : Math.max(0, c - 1)));

    likeInFlight.current = true;
    try {
      const res = await fetch(`/api/feed/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: newLiked ? "like" : "unlike" }),
      });
      if (!res.ok) throw new Error("Like action failed.");
    } catch {
      // Revert optimistic update
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      toast("Could not update like. Please try again.", "error");
    } finally {
      likeInFlight.current = false;
    }
  }, [currentUserId, isLiked, likesCount, post.id]);

  const handlePin = useCallback(async () => {
    try {
      const res = await fetch(`/api/feed/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isPinned ? "unpin" : "pin" }),
      });
      if (!res.ok) throw new Error("Pin action failed.");
      setIsPinned((p) => !p);
      toast(isPinned ? "Post unpinned." : "Post pinned.", "success");
    } catch {
      toast("Could not update pin status. Please try again.", "error");
    }
  }, [isPinned, post.id]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/feed#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied to clipboard!", "success");
    } catch {
      toast("Could not copy link.", "error");
    }
  }, [post.id]);

  const handleDeleted = useCallback(() => {
    setIsDeleted(true);
    onDeleted?.(post.id);
  }, [onDeleted, post.id]);

  const handleEditSave = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  if (isDeleted) return <></>;

  const avatarSrc = post.author.avatarUrl;
  const showMenu = isAuthor || isAdminViewer;

  return (
    <>
      <article
        id={`post-${post.id}`}
        className={cn(
          "relative rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4",
          "transition-shadow duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
        )}
        aria-label={`Post by ${post.author.fullName}`}
      >
        {/* Pin indicator */}
        {isPinned && (
          <div
            className="absolute right-4 top-4 flex items-center gap-1 text-xs text-[var(--color-accent)]"
            aria-label="Pinned post"
          >
            <Pin size={12} aria-hidden="true" />
            <span className="font-medium">Pinned</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3">
          <Link
            href={`/members/${post.author.username}`}
            className={cn(
              "relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--color-border)]",
              "hover:ring-[var(--color-accent)] transition-all duration-150 focus:outline-none",
              "focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
            aria-label={`View ${post.author.fullName}'s profile`}
            tabIndex={0}
          >
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={post.author.fullName}
                fill
                className="object-cover"
                sizes="40px"
                unoptimized={avatarSrc.startsWith("data:")}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--color-bg-elevated)] text-sm font-bold text-[var(--color-text-primary)]">
                {post.author.fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/members/${post.author.username}`}
                className={cn(
                  "text-sm font-semibold text-[var(--color-text-primary)]",
                  "hover:text-[var(--color-accent)] transition-colors focus:outline-none",
                  "focus:underline"
                )}
              >
                {post.author.fullName}
              </Link>
              <Badge
                variant="accent"
                size="sm"
                className="shrink-0"
                style={{ color: post.author.role.color }}
              >
                {post.author.role.name}
              </Badge>
            </div>
            <time
              dateTime={
                typeof post.createdAt === "string"
                  ? post.createdAt
                  : post.createdAt.toISOString()
              }
              className="mt-0.5 block text-xs text-[var(--color-text-secondary)]"
            >
              {formatDate(post.createdAt, "relative")}
            </time>
          </div>

          {/* Context menu */}
          {showMenu && (
            <div className={isPinned ? "mr-16" : ""}>
              <DropdownMenu
                trigger={
                  <button
                    type="button"
                    aria-label="Post options"
                    className={cn(
                      "rounded-lg p-1.5 text-[var(--color-text-secondary)]",
                      "hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
                      "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    )}
                  >
                    <MoreHorizontal size={18} aria-hidden="true" />
                  </button>
                }
                align="right"
              >
                {isAuthor && (
                  <DropdownMenuItem
                    icon={<Pencil size={14} />}
                    onClick={() => setEditOpen(true)}
                  >
                    Edit
                  </DropdownMenuItem>
                )}
                {isAdminViewer && (
                  <DropdownMenuItem
                    icon={<Pin size={14} />}
                    onClick={handlePin}
                  >
                    {isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                )}
                {(isAuthor || isAdminViewer) && (
                  <>
                    {(isAuthor && isAdminViewer) && <DropdownMenuDivider />}
                    <DropdownMenuItem
                      icon={<Trash2 size={14} />}
                      variant="danger"
                      onClick={() => setDeleteOpen(true)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mt-3">
          <p className="text-sm leading-relaxed text-[var(--color-text-primary)] whitespace-pre-wrap break-words">
            <RenderContent content={content} expanded={expanded} />
          </p>
          {isLong && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-1 text-sm font-medium text-[var(--color-accent)] hover:underline focus:outline-none focus:underline"
            >
              See more
            </button>
          )}
          {isLong && expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-1 text-sm font-medium text-[var(--color-accent)] hover:underline focus:outline-none focus:underline"
            >
              See less
            </button>
          )}
        </div>

        {/* Media */}
        <MediaGrid mediaUrls={post.mediaUrls} mediaType={post.mediaType} />

        {/* Action bar */}
        <div className="mt-4 flex items-center gap-1 border-t border-[var(--color-border)] pt-3">
          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            disabled={!currentUserId}
            aria-label={isLiked ? "Unlike post" : "Like post"}
            aria-pressed={isLiked}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              isLiked
                ? "text-red-500 hover:bg-red-500/10"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
              !currentUserId && "cursor-default opacity-60"
            )}
          >
            <Heart
              size={17}
              aria-hidden="true"
              className={cn("transition-transform duration-150", isLiked && "scale-110")}
              fill={isLiked ? "currentColor" : "none"}
            />
            {likesCount > 0 && (
              <span className="font-medium tabular-nums">{likesCount}</span>
            )}
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={() => setShowComments((s) => !s)}
            aria-label={showComments ? "Hide comments" : "Show comments"}
            aria-expanded={showComments}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              showComments
                ? "text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <MessageCircle size={17} aria-hidden="true" />
            {post.commentsCount > 0 && (
              <span className="font-medium tabular-nums">{post.commentsCount}</span>
            )}
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share post"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
              "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <Share2 size={17} aria-hidden="true" />
          </button>
        </div>

        {/* Comment Section */}
        {showComments && (
          <div className="mt-1 border-t border-[var(--color-border)] pt-3">
            <CommentSection postId={post.id} currentUserId={currentUserId} />
          </div>
        )}
      </article>

      {/* Edit Modal */}
      <EditPostModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        postId={post.id}
        initialContent={content}
        onSave={handleEditSave}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        postId={post.id}
        onDeleted={handleDeleted}
      />
    </>
  );
}