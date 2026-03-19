// src/components/admin/FeedAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Pin,
  PinOff,
  Trash2,
  Eye,
  MoreHorizontal,
  Image as ImageIcon,
  MessageCircle,
  Heart,
  Search,
  Calendar,
  User,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";

import type { PostCard } from "@/types/index";
import { formatDate, truncateText, cn } from "@/lib/utils";
import { Table, Pagination, EmptyState } from "@/components/ui/DataDisplay";
import { Badge, Spinner, Alert } from "@/components/ui/Feedback";
import {
  Modal,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
} from "@/components/ui/Overlay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedAdminPost extends PostCard {
  isDeleted?: boolean;
}

interface FeedListResponse {
  data: FeedAdminPost[];
  nextCursor?: string;
  total: number;
}

interface FilterState {
  authorSearch: string;
  dateFrom: string;
  dateTo: string;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher(url: string): Promise<FeedListResponse> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to fetch feed");
  }
  return res.json();
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── PostPreviewModal ─────────────────────────────────────────────────────────

interface PostPreviewModalProps {
  post: FeedAdminPost;
  isOpen: boolean;
  onClose: () => void;
}

function PostPreviewModal({ post, isOpen, onClose }: PostPreviewModalProps): JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Post Preview" size="md">
      <div className="p-6 space-y-4">
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[var(--color-bg-elevated)] flex-shrink-0">
            {post.author.avatarUrl ? (
              <NextImage
                src={post.author.avatarUrl}
                alt={post.author.fullName}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized={post.author.avatarUrl.startsWith("data:")}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--color-text-secondary)]">
                {post.author.fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={`/members/${post.author.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
            >
              {post.author.fullName}
            </Link>
            <p className="text-xs text-[var(--color-text-secondary)]">
              @{post.author.username} · {formatDate(post.createdAt, "short")}
            </p>
          </div>
          {post.isPinned && (
            <Badge variant="accent" size="sm" className="ml-auto flex items-center gap-1">
              <Pin size={10} aria-hidden="true" />
              Pinned
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap break-words border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-bg-surface)]">
          {post.content}
        </div>

        {/* Media */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className={cn(
            "grid gap-2 rounded-lg overflow-hidden",
            post.mediaUrls.length === 1 ? "grid-cols-1" :
            post.mediaUrls.length === 2 ? "grid-cols-2" :
            "grid-cols-2"
          )}>
            {post.mediaUrls.slice(0, 4).map((url, idx) => (
              <div
                key={idx}
                className={cn(
                  "relative bg-[var(--color-bg-elevated)] rounded overflow-hidden",
                  post.mediaUrls.length === 1 ? "aspect-video" : "aspect-square"
                )}
              >
                {post.mediaType === "video" ? (
                  <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] text-xs">
                    Video
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={`Media ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {idx === 3 && post.mediaUrls.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold text-lg">
                    +{post.mediaUrls.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-border)]">
          <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
            <Heart size={14} aria-hidden="true" />
            {post.likesCount} likes
          </span>
          <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
            <MessageCircle size={14} aria-hidden="true" />
            {post.commentsCount} comments
          </span>
        </div>
      </div>
    </Modal>
  );
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  postPreview: string;
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  postPreview,
}: DeleteConfirmModalProps): JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Post" size="sm">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-[var(--color-error)]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-primary)] font-medium">
              Are you sure you want to delete this post?
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
              &ldquo;{postPreview}&rdquo;
            </p>
          </div>
        </div>

        <Alert
          variant="warning"
          message="This action cannot be undone. The post and all its comments will be permanently removed."
        />

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              "text-[var(--color-text-secondary)] border border-[var(--color-border)]",
              "hover:bg-[var(--color-bg-elevated)] transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              "bg-[var(--color-error)] text-white",
              "hover:opacity-90 transition-opacity",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center gap-2"
            )}
          >
            {isDeleting && <Spinner size="sm" />}
            Delete Post
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── FeedAdmin ────────────────────────────────────────────────────────────────

export function FeedAdmin(): JSX.Element {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [filters, setFilters] = useState<FilterState>({
    authorSearch: "",
    dateFrom: "",
    dateTo: "",
  });

  const debouncedAuthorSearch = useDebounce(filters.authorSearch, 400);

  const [selectedPost, setSelectedPost] = useState<FeedAdminPost | null>(null);
  const [viewModalPost, setViewModalPost] = useState<FeedAdminPost | null>(null);
  const [deleteModalPost, setDeleteModalPost] = useState<FeedAdminPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // postId being actioned

  // Build SWR key
  const buildKey = useCallback(() => {
    const params = new URLSearchParams();
    params.set("take", String(PAGE_SIZE));
    params.set("skip", String((page - 1) * PAGE_SIZE));
    params.set("admin", "true");
    if (debouncedAuthorSearch) params.set("authorSearch", debouncedAuthorSearch);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    return `/api/feed?${params.toString()}`;
  }, [page, debouncedAuthorSearch, filters.dateFrom, filters.dateTo]);

  const swrKey = buildKey();

  const { data, error, isLoading, mutate } = useSWR<FeedListResponse>(swrKey, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedAuthorSearch, filters.dateFrom, filters.dateTo]);

  // Dismiss error after 5s
  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 5000);
    return () => clearTimeout(timer);
  }, [actionError]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handlePinToggle = useCallback(
    async (post: FeedAdminPost) => {
      const action = post.isPinned ? "unpin" : "pin";
      setActionLoading(post.id);
      setActionError(null);

      try {
        const res = await fetch(`/api/feed/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(body.message || `Failed to ${action} post`);
        }

        await mutate();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Action failed";
        setActionError(msg);
      } finally {
        setActionLoading(null);
      }
    },
    [mutate]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteModalPost) return;
    setIsDeleting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/feed/${deleteModalPost.id}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(body.message || "Failed to delete post");
      }

      setDeleteModalPost(null);
      await mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setActionError(msg);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteModalPost, mutate]);

  // ─── Table Columns ────────────────────────────────────────────────────────

  const columns = [
    {
      key: "author",
      header: "Author",
      width: "220px",
      render: (row: FeedAdminPost) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[var(--color-bg-elevated)] flex-shrink-0">
            {row.author.avatarUrl ? (
              <NextImage
                src={row.author.avatarUrl}
                alt={row.author.fullName}
                fill
                sizes="32px"
                className="object-cover"
                unoptimized={row.author.avatarUrl.startsWith("data:")}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--color-text-secondary)]">
                {row.author.fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={`/members/${row.author.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors truncate max-w-[140px]"
              onClick={(e) => e.stopPropagation()}
            >
              {row.author.fullName}
            </Link>
            <span className="text-xs text-[var(--color-text-secondary)] truncate max-w-[140px] block">
              @{row.author.username}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "content",
      header: "Preview",
      render: (row: FeedAdminPost) => (
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-sm text-[var(--color-text-secondary)] leading-snug line-clamp-2 max-w-[280px]">
            {truncateText(row.content, 80)}
          </span>
          {row.isPinned && (
            <Pin
              size={12}
              className="text-[var(--color-accent)] flex-shrink-0 mt-0.5"
              aria-label="Pinned post"
            />
          )}
        </div>
      ),
    },
    {
      key: "media",
      header: "Media",
      width: "80px",
      align: "center" as const,
      render: (row: FeedAdminPost) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            row.mediaUrls && row.mediaUrls.length > 0
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)]"
          )}
        >
          {row.mediaUrls && row.mediaUrls.length > 0 ? (
            <>
              <ImageIcon size={12} aria-hidden="true" />
              {row.mediaUrls.length}
            </>
          ) : (
            <span className="text-[var(--color-text-secondary)] opacity-40">—</span>
          )}
        </span>
      ),
    },
    {
      key: "likesCount",
      header: "Likes",
      width: "70px",
      align: "center" as const,
      sortable: true,
      render: (row: FeedAdminPost) => (
        <span className="flex items-center justify-center gap-1 text-sm text-[var(--color-text-secondary)]">
          <Heart size={12} aria-hidden="true" />
          {row.likesCount}
        </span>
      ),
    },
    {
      key: "commentsCount",
      header: "Comments",
      width: "90px",
      align: "center" as const,
      sortable: true,
      render: (row: FeedAdminPost) => (
        <span className="flex items-center justify-center gap-1 text-sm text-[var(--color-text-secondary)]">
          <MessageCircle size={12} aria-hidden="true" />
          {row.commentsCount}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Posted",
      width: "120px",
      sortable: true,
      render: (row: FeedAdminPost) => (
        <span className="text-xs text-[var(--color-text-secondary)] font-[var(--font-mono)]">
          {formatDate(row.createdAt, "short")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "52px",
      align: "center" as const,
      render: (row: FeedAdminPost) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            align="right"
            trigger={
              <button
                type="button"
                aria-label="Post actions"
                className={cn(
                  "p-1.5 rounded-lg text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-colors duration-150",
                  actionLoading === row.id && "opacity-50 pointer-events-none"
                )}
              >
                {actionLoading === row.id ? (
                  <Spinner size="sm" />
                ) : (
                  <MoreHorizontal size={16} aria-hidden="true" />
                )}
              </button>
            }
          >
            <DropdownMenuItem
              icon={<Eye size={14} aria-hidden="true" />}
              onClick={() => setViewModalPost(row)}
            >
              View Post
            </DropdownMenuItem>

            <DropdownMenuItem
              icon={
                row.isPinned ? (
                  <PinOff size={14} aria-hidden="true" />
                ) : (
                  <Pin size={14} aria-hidden="true" />
                )
              }
              onClick={() => handlePinToggle(row)}
            >
              {row.isPinned ? "Unpin Post" : "Pin Post"}
            </DropdownMenuItem>

            <DropdownMenuDivider />

            <DropdownMenuItem
              icon={<Trash2 size={14} aria-hidden="true" />}
              variant="danger"
              onClick={() => setDeleteModalPost(row)}
            >
              Delete Post
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // ─── Derived state ────────────────────────────────────────────────────────

  const posts = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters =
    filters.authorSearch !== "" || filters.dateFrom !== "" || filters.dateTo !== "";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Feed Management
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {total > 0 ? `${total} posts total` : "Manage member posts and activity"}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {actionError && (
        <Alert
          variant="error"
          message={actionError}
          dismissible
          onDismiss={() => setActionError(null)}
        />
      )}

      {/* SWR fetch error */}
      {error && !isLoading && (
        <Alert
          variant="error"
          message="Failed to load feed posts. Please try refreshing the page."
        />
      )}

      {/* Filter Bar */}
      <div className="flex items-end gap-3 flex-wrap p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
        {/* Author search */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label
            htmlFor="feed-author-search"
            className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1"
          >
            <User size={11} aria-hidden="true" />
            Author
          </label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="feed-author-search"
              type="text"
              value={filters.authorSearch}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, authorSearch: e.target.value }))
              }
              placeholder="Search by name or username…"
              className={cn(
                "w-full pl-8 pr-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
                "transition-colors duration-150"
              )}
            />
          </div>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <label
            htmlFor="feed-date-from"
            className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1"
          >
            <Calendar size={11} aria-hidden="true" />
            From
          </label>
          <input
            id="feed-date-from"
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
            }
            className={cn(
              "px-3 py-2 rounded-lg text-sm",
              "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
              "text-[var(--color-text-primary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
              "transition-colors duration-150"
            )}
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <label
            htmlFor="feed-date-to"
            className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1"
          >
            <Calendar size={11} aria-hidden="true" />
            To
          </label>
          <input
            id="feed-date-to"
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
            }
            className={cn(
              "px-3 py-2 rounded-lg text-sm",
              "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
              "text-[var(--color-text-primary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
              "transition-colors duration-150"
            )}
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() =>
              setFilters({ authorSearch: "", dateFrom: "", dateTo: "" })
            }
            className={cn(
              "self-end px-3 py-2 rounded-lg text-sm font-medium",
              "text-[var(--color-text-secondary)] border border-[var(--color-border)]",
              "hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            Clear
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--color-text-secondary)]">Filters:</span>
          {filters.authorSearch && (
            <Badge variant="primary" size="sm">
              Author: {filters.authorSearch}
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="primary" size="sm">
              From: {filters.dateFrom}
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="primary" size="sm">
              To: {filters.dateTo}
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading && posts.length === 0 ? (
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={[]}
          loading
          skeletonRows={8}
          emptyMessage="Loading posts…"
        />
      ) : posts.length === 0 && !isLoading ? (
        <EmptyState
          icon="MessageSquare"
          heading={hasActiveFilters ? "No posts match your filters" : "No posts yet"}
          description={
            hasActiveFilters
              ? "Try adjusting your search criteria."
              : "Member posts will appear here once submitted."
          }
          action={
            hasActiveFilters
              ? {
                  label: "Clear Filters",
                  onClick: () =>
                    setFilters({ authorSearch: "", dateFrom: "", dateTo: "" }),
                }
              : undefined
          }
        />
      ) : (
        <Table<FeedAdminPost>
          columns={columns}
          data={posts}
          loading={isLoading}
          striped
          skeletonRows={PAGE_SIZE}
          emptyMessage="No posts found."
          rowKey={(row) => row.id}
          onRowClick={(row) => setViewModalPost(row)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–
            {Math.min(page * PAGE_SIZE, total)} of {total} posts
          </p>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* View Post Modal */}
      {viewModalPost && (
        <PostPreviewModal
          post={viewModalPost}
          isOpen={!!viewModalPost}
          onClose={() => setViewModalPost(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalPost && (
        <DeleteConfirmModal
          isOpen={!!deleteModalPost}
          onClose={() => {
            if (!isDeleting) setDeleteModalPost(null);
          }}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
          postPreview={truncateText(deleteModalPost.content, 60)}
        />
      )}
    </div>
  );
}