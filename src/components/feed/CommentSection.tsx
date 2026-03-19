// src/components/feed/CommentSection.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { Heart, Reply, Trash2, ChevronDown, ChevronUp, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { formatDate, cn } from "@/lib/utils";
import { Spinner, Badge } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Forms";
import type { CommentItem, MemberPublic } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentSectionProps {
  postId: string;
  currentUserId?: string;
}

interface CommentsApiResponse {
  data: CommentItem[];
  nextCursor?: string;
  total: number;
}

interface LikeState {
  liked: boolean;
  count: number;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = async (url: string): Promise<CommentsApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json() as Promise<CommentsApiResponse>;
};

// ─── AvatarImage ──────────────────────────────────────────────────────────────

function AvatarImage({
  src,
  alt,
  size = 24,
}: {
  src: string;
  alt: string;
  size?: number;
}): JSX.Element {
  const isDataUri = src.startsWith("data:");
  return (
    <Image
      src={src || "/placeholder-avatar.png"}
      alt={alt}
      width={size}
      height={size}
      unoptimized={isDataUri}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

// ─── CommentLikeButton ────────────────────────────────────────────────────────

function CommentLikeButton({
  commentId,
  postId,
  initialLiked,
  initialCount,
}: {
  commentId: string;
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}): JSX.Element {
  const [likeState, setLikeState] = useState<LikeState>({
    liked: initialLiked,
    count: initialCount,
  });
  const inFlight = useRef(false);

  const toggle = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    const prev = { ...likeState };
    setLikeState({
      liked: !likeState.liked,
      count: likeState.liked ? likeState.count - 1 : likeState.count + 1,
    });

    try {
      const res = await fetch(`/api/feed/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: likeState.liked ? "unlike_comment" : "like_comment",
          commentId,
        }),
      });
      if (!res.ok) {
        setLikeState(prev);
      }
    } catch {
      setLikeState(prev);
    } finally {
      inFlight.current = false;
    }
  }, [commentId, postId, likeState]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={likeState.liked ? "Unlike comment" : "Like comment"}
      aria-pressed={likeState.liked}
      className={cn(
        "flex items-center gap-1 text-xs transition-colors duration-150",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded",
        likeState.liked
          ? "text-[var(--color-error)]"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
      )}
    >
      <Heart
        size={12}
        aria-hidden="true"
        className={likeState.liked ? "fill-current" : ""}
      />
      {likeState.count > 0 && (
        <span className="tabular-nums">{likeState.count}</span>
      )}
    </button>
  );
}

// ─── ReplyInput ───────────────────────────────────────────────────────────────

function ReplyInput({
  postId,
  parentId,
  onSuccess,
  onCancel,
}: {
  postId: string;
  parentId: string;
  onSuccess: (reply: CommentItem) => void;
  onCancel: () => void;
}): JSX.Element {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = content.trim();
      if (!trimmed || submitting) return;

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/feed/${postId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "comment", content: trimmed, parentId }),
        });

        if (!res.ok) {
          const body = (await res.json()) as { message?: string };
          setError(body.message ?? "Failed to post reply");
          return;
        }

        const data = (await res.json()) as { data: CommentItem };
        setContent("");
        onSuccess(data.data);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [content, parentId, postId, submitting, onSuccess]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      void handleSubmit();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-1.5 pl-8">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a reply… (Ctrl+Enter to send)"
        className="text-xs min-h-[60px]"
        maxLength={2000}
        disabled={submitting}
        error={error ?? undefined}
        aria-label="Reply content"
      />
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className={cn(
            "text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "transition-colors px-2 py-1 rounded",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md",
            "bg-[var(--color-primary)] text-white",
            "hover:bg-[var(--color-primary-hover)] transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          {submitting ? <Spinner size="sm" label="Sending" /> : <Send size={12} aria-hidden="true" />}
          Reply
        </button>
      </div>
    </form>
  );
}

// ─── SingleComment ────────────────────────────────────────────────────────────

function SingleComment({
  comment,
  postId,
  currentUserId,
  depth,
  onDelete,
}: {
  comment: CommentItem;
  postId: string;
  currentUserId?: string;
  depth: number;
  onDelete: (commentId: string, parentId?: string) => void;
}): JSX.Element {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [localReplies, setLocalReplies] = useState<CommentItem[]>(
    comment.replies ?? []
  );
  const [deleting, setDeleting] = useState(false);

  const canDelete = !!currentUserId && currentUserId === comment.author.id;
  const replyCount = localReplies.length;

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/feed/${postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "comment", commentId: comment.id }),
      });
      if (res.ok) {
        onDelete(comment.id, comment.parentId ?? undefined);
      }
    } catch {
      // silently fail — comment will still appear
    } finally {
      setDeleting(false);
    }
  }, [comment.id, comment.parentId, deleting, onDelete, postId]);

  const handleReplySuccess = useCallback((reply: CommentItem) => {
    setLocalReplies((prev) => [...prev, reply]);
    setRepliesOpen(true);
    setShowReplyInput(false);
  }, []);

  const handleReplyDelete = useCallback((deletedId: string) => {
    setLocalReplies((prev) => prev.filter((r) => r.id !== deletedId));
  }, []);

  return (
    <div
      className={cn(
        "group",
        depth > 0 ? "pl-8 border-l border-[var(--color-border)] ml-3" : ""
      )}
    >
      <div className="flex gap-2 py-2">
        {/* Avatar */}
        <Link
          href={`/members/${comment.author.username}`}
          aria-label={`View ${comment.author.fullName}'s profile`}
          className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <AvatarImage
            src={comment.author.avatarUrl}
            alt={comment.author.fullName}
            size={24}
          />
        </Link>

        {/* Content bubble */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--color-bg-surface)] rounded-xl px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <Link
                href={`/members/${comment.author.username}`}
                className={cn(
                  "text-xs font-semibold text-[var(--color-text-primary)]",
                  "hover:text-[var(--color-accent)] transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                )}
              >
                {comment.author.fullName}
              </Link>
              {comment.author.role?.name && (
                <Badge
                  variant="accent"
                  size="sm"
                  className="text-[10px] px-1.5 py-0"
                  style={
                    comment.author.role.color
                      ? ({ color: comment.author.role.color } as React.CSSProperties)
                      : undefined
                  }
                >
                  {comment.author.role.name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed break-words whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {formatDate(comment.createdAt, "relative")}
            </span>

            <CommentLikeButton
              commentId={comment.id}
              postId={postId}
              initialLiked={comment.isLikedByMe}
              initialCount={comment.likesCount}
            />

            {depth === 0 && (
              <button
                type="button"
                onClick={() => setShowReplyInput((v) => !v)}
                aria-expanded={showReplyInput}
                className={cn(
                  "flex items-center gap-1 text-xs text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-accent)] transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                )}
              >
                <Reply size={12} aria-hidden="true" />
                Reply
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Delete comment"
                className={cn(
                  "flex items-center gap-1 text-xs text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-error)] transition-colors",
                  "opacity-0 group-hover:opacity-100 focus:opacity-100",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded",
                  deleting ? "opacity-50 cursor-not-allowed" : ""
                )}
              >
                {deleting ? (
                  <Spinner size="sm" label="Deleting" />
                ) : (
                  <Trash2 size={12} aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReplyInput && depth === 0 && (
            <ReplyInput
              postId={postId}
              parentId={comment.id}
              onSuccess={handleReplySuccess}
              onCancel={() => setShowReplyInput(false)}
            />
          )}

          {/* Replies toggle */}
          {depth === 0 && replyCount > 0 && (
            <div className="mt-1 px-1">
              <button
                type="button"
                onClick={() => setRepliesOpen((v) => !v)}
                aria-expanded={repliesOpen}
                className={cn(
                  "flex items-center gap-1 text-xs text-[var(--color-accent)]",
                  "hover:underline transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                )}
              >
                {repliesOpen ? (
                  <ChevronUp size={12} aria-hidden="true" />
                ) : (
                  <ChevronDown size={12} aria-hidden="true" />
                )}
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </button>
            </div>
          )}

          {/* Replies list */}
          {repliesOpen && depth === 0 && localReplies.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {localReplies.map((reply) => (
                <SingleComment
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  currentUserId={currentUserId}
                  depth={1}
                  onDelete={handleReplyDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CommentSection ───────────────────────────────────────────────────────────

export function CommentSection({
  postId,
  currentUserId,
}: CommentSectionProps): JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [extraComments, setExtraComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { mutate } = useSWRConfig();

  const swrKey = `comments-${postId}`;

  const { data, error, isLoading, mutate: mutateComments } = useSWR<CommentsApiResponse>(
    `/api/feed/${postId}?type=comments&take=3`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const initialComments = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = total > 3 + extraComments.length;

  // All comments to render: initial 3 + any extra loaded
  const allComments: CommentItem[] = [...initialComments, ...extraComments];

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);

    try {
      const lastComment = allComments[allComments.length - 1];
      const cursorParam = lastComment ? `&cursor=${lastComment.id}` : "";
      const res = await fetch(
        `/api/feed/${postId}?type=comments&take=10${cursorParam}`
      );
      if (!res.ok) throw new Error("Failed to load more");

      const json = (await res.json()) as CommentsApiResponse;
      setExtraComments((prev) => [...prev, ...json.data]);
      if (json.nextCursor) {
        setCursor(json.nextCursor);
      }
      setShowAll(true);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [allComments, loadingMore, postId]);

  const handleDeleteComment = useCallback(
    (deletedId: string) => {
      // Remove from extra comments
      setExtraComments((prev) => prev.filter((c) => c.id !== deletedId));
      // Also invalidate the SWR cache to refetch top 3
      void mutateComments();
    },
    [mutateComments]
  );

  const handleSubmitComment = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = newCommentText.trim();
      if (!trimmed || submitting) return;

      setSubmitting(true);
      setSubmitError(null);

      try {
        const res = await fetch(`/api/feed/${postId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "comment", content: trimmed }),
        });

        if (!res.ok) {
          const body = (await res.json()) as { message?: string };
          setSubmitError(body.message ?? "Failed to post comment");
          return;
        }

        const body = (await res.json()) as { data: CommentItem };
        setNewCommentText("");
        // Prepend new comment by refetching
        void mutateComments();
        setExtraComments((prev) => [body.data, ...prev]);
      } catch {
        setSubmitError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [mutateComments, newCommentText, postId, submitting]
  );

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      void handleSubmitComment();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4" aria-live="polite">
        <Spinner size="sm" label="Loading comments" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-[var(--color-error)] text-center py-2">
        Failed to load comments.
      </p>
    );
  }

  return (
    <section
      aria-label="Comments"
      className="border-t border-[var(--color-border)] pt-3 pb-2 space-y-0"
    >
      {/* Comment list */}
      {allComments.length === 0 && (
        <p className="text-xs text-[var(--color-text-secondary)] text-center py-2">
          No comments yet. Be the first to comment!
        </p>
      )}

      {allComments.map((comment) => (
        <SingleComment
          key={comment.id}
          comment={comment}
          postId={postId}
          currentUserId={currentUserId}
          depth={0}
          onDelete={handleDeleteComment}
        />
      ))}

      {/* Load more */}
      {hasMore && (
        <div className="pt-1 px-1">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={cn(
              "flex items-center gap-1.5 text-xs text-[var(--color-accent)]",
              "hover:underline transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
            )}
          >
            {loadingMore ? (
              <>
                <Spinner size="sm" label="Loading" />
                Loading more…
              </>
            ) : (
              <>
                <ChevronDown size={12} aria-hidden="true" />
                Load more comments ({total - allComments.length} remaining)
              </>
            )}
          </button>
        </div>
      )}

      {/* New comment input */}
      {currentUserId ? (
        <form
          onSubmit={handleSubmitComment}
          className="flex gap-2 pt-3 px-0 items-start"
          aria-label="Add a comment"
        >
          <div className="flex-1">
            <Textarea
              ref={inputRef}
              value={newCommentText}
              onChange={(e) => {
                setNewCommentText(e.target.value);
                if (submitError) setSubmitError(null);
              }}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Add a comment… (Ctrl+Enter to send)"
              className="text-sm min-h-[64px]"
              maxLength={2000}
              disabled={submitting}
              error={submitError ?? undefined}
              aria-label="Comment text"
            />
          </div>
          <button
            type="submit"
            disabled={!newCommentText.trim() || submitting}
            aria-label="Post comment"
            className={cn(
              "mt-0 flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0",
              "bg-[var(--color-primary)] text-white",
              "hover:bg-[var(--color-primary-hover)] transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            {submitting ? (
              <Spinner size="sm" label="Posting" />
            ) : (
              <Send size={16} aria-hidden="true" />
            )}
          </button>
        </form>
      ) : (
        <p className="text-xs text-[var(--color-text-secondary)] pt-3 text-center">
          <Link
            href="/login"
            className="text-[var(--color-accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
          >
            Log in
          </Link>{" "}
          to leave a comment.
        </p>
      )}
    </section>
  );
}