// src/app/profile/notifications/page.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  AtSign,
  Award,
  Bell,
  BellOff,
  Calendar,
  CheckCircle,
  CheckCheck,
  Info,
  MessageSquare,
  Package,
  UserCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { cn, formatDate } from "@/lib/utils";
import { Badge, Skeleton, Spinner } from "@/components/ui/Feedback";
import { EmptyState, Pagination } from "@/components/ui/DataDisplay";
import type { NotificationItem } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationsApiResponse {
  data: NotificationItem[];
  total: number;
  unreadCount: number;
  nextCursor?: string;
}

type FilterMode = "all" | "unread";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNotificationIcon(
  type: string
): React.ReactElement {
  const iconProps = { size: 18, "aria-hidden": true as const };

  switch (type) {
    case "application_approved":
      return (
        <CheckCircle
          {...iconProps}
          className="text-[var(--color-success)]"
        />
      );
    case "application_rejected":
      return (
        <Info
          {...iconProps}
          className="text-[var(--color-error)]"
        />
      );
    case "certificate_issued":
      return (
        <Award
          {...iconProps}
          className="text-[var(--color-accent)]"
        />
      );
    case "mention":
      return (
        <AtSign
          {...iconProps}
          className="text-[var(--color-primary)]"
        />
      );
    case "new_comment":
      return (
        <MessageSquare
          {...iconProps}
          className="text-[var(--color-primary)]"
        />
      );
    case "instrument_approved":
      return (
        <Package
          {...iconProps}
          className="text-[var(--color-success)]"
        />
      );
    case "instrument_rejected":
      return (
        <Wrench
          {...iconProps}
          className="text-[var(--color-error)]"
        />
      );
    case "event_reminder":
      return (
        <Calendar
          {...iconProps}
          className="text-[var(--color-accent)]"
        />
      );
    case "admin_role_assigned":
      return (
        <UserCheck
          {...iconProps}
          className="text-[var(--color-primary)]"
        />
      );
    default:
      return (
        <Bell
          {...iconProps}
          className="text-[var(--color-text-secondary)]"
        />
      );
  }
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = async (url: string): Promise<NotificationsApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch notifications: ${res.status}`);
  }
  return res.json() as Promise<NotificationsApiResponse>;
};

// ─── Notification Item ────────────────────────────────────────────────────────

interface NotificationItemViewProps {
  notification: NotificationItem;
  onMarkRead: (id: string, link?: string | null) => Promise<void>;
  isMarkingRead: boolean;
}

function NotificationItemView({
  notification,
  onMarkRead,
  isMarkingRead,
}: NotificationItemViewProps): JSX.Element {
  const itemContent = (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl border transition-all duration-200",
        "cursor-pointer group",
        notification.isRead
          ? "bg-[var(--color-bg-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]/30"
          : "bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/40"
      )}
      role="button"
      tabIndex={0}
      aria-label={`${notification.isRead ? "" : "Unread: "}${notification.title}`}
      onClick={() => {
        void onMarkRead(notification.id, notification.link);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void onMarkRead(notification.id, notification.link);
        }
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full",
          notification.isRead
            ? "bg-[var(--color-bg-elevated)]"
            : "bg-[var(--color-primary)]/10"
        )}
      >
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              notification.isRead
                ? "font-normal text-[var(--color-text-primary)]"
                : "font-semibold text-[var(--color-text-primary)]"
            )}
          >
            {notification.title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!notification.isRead && (
              <span
                aria-label="Unread"
                className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0 mt-1"
              />
            )}
            {isMarkingRead && (
              <Spinner size="sm" label="Marking as read..." />
            )}
          </div>
        </div>

        {notification.body && (
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
            {notification.body}
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          <time
            dateTime={
              notification.createdAt instanceof Date
                ? notification.createdAt.toISOString()
                : String(notification.createdAt)
            }
            className="text-xs text-[var(--color-text-secondary)] font-[var(--font-mono)]"
          >
            {formatDate(notification.createdAt, "relative")}
          </time>
          {notification.link && (
            <span className="text-xs text-[var(--color-primary)] group-hover:underline">
              View →
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // If there's a link, wrap in next/link — but we handle navigation in onMarkRead
  // The div itself is the interactive element; Link is purely semantic
  return itemContent;
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function NotificationSkeleton(): JSX.Element {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <Skeleton width={40} height={40} rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} className="w-3/4" />
        <Skeleton height={12} className="w-full" />
        <Skeleton height={12} className="w-1/4" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotificationsPage(): JSX.Element {
  const { status } = useSession();
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Build SWR key
  const swrKey =
    status === "authenticated"
      ? `/api/notifications?take=${PAGE_SIZE}&skip=${(page - 1) * PAGE_SIZE}${filter === "unread" ? "&unreadOnly=true" : ""}`
      : null;

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<NotificationsApiResponse>(swrKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  // Clear action error after 5 seconds
  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 5000);
    return () => clearTimeout(timer);
  }, [actionError]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const handleMarkRead = useCallback(
    async (id: string, link?: string | null) => {
      if (markingReadId) return;

      // Find the notification — if already read and no link, nothing to do
      const notification = data?.data.find((n) => n.id === id);
      if (!notification) return;

      if (!notification.isRead) {
        setMarkingReadId(id);
        setActionError(null);

        try {
          const res = await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });

          if (!res.ok) {
            throw new Error("Failed to mark notification as read");
          }

          // Optimistically update the local data
          await mutate(
            (current) => {
              if (!current) return current;
              return {
                ...current,
                unreadCount: Math.max(0, current.unreadCount - 1),
                data: current.data.map((n) =>
                  n.id === id ? { ...n, isRead: true } : n
                ),
              };
            },
            { revalidate: false }
          );

          // Also invalidate the global notifications key used by the navbar
          await globalMutate(
            (key: unknown) =>
              typeof key === "string" && key.includes("/api/notifications"),
            undefined,
            { revalidate: true }
          );
        } catch (err) {
          console.error("[NotificationsPage] markRead error:", err);
          setActionError("Failed to mark notification as read. Please try again.");
        } finally {
          setMarkingReadId(null);
        }
      }

      // Navigate if there's a link
      if (link) {
        router.push(link);
      }
    },
    [data, markingReadId, mutate, globalMutate, router]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (isMarkingAll || !data || data.unreadCount === 0) return;

    setIsMarkingAll(true);
    setActionError(null);

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!res.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      // Optimistically update
      await mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            unreadCount: 0,
            data: current.data.map((n) => ({ ...n, isRead: true })),
          };
        },
        { revalidate: true }
      );

      // Invalidate navbar hook
      await globalMutate(
        (key: unknown) =>
          typeof key === "string" && key.includes("/api/notifications"),
        undefined,
        { revalidate: true }
      );
    } catch (err) {
      console.error("[NotificationsPage] markAllRead error:", err);
      setActionError("Failed to mark all as read. Please try again.");
    } finally {
      setIsMarkingAll(false);
    }
  }, [data, isMarkingAll, mutate, globalMutate]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.data ?? [];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pt-24 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1
                  className={cn(
                    "text-2xl font-bold text-[var(--color-text-primary)]",
                    "font-[var(--font-display)]"
                  )}
                >
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <Badge variant="primary" size="md">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Stay up to date with your activity and club announcements.
              </p>
            </div>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={isMarkingAll}
                aria-label="Mark all notifications as read"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                  "border border-[var(--color-border)] transition-all duration-150",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                  "hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-bg-elevated)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex-shrink-0"
                )}
              >
                {isMarkingAll ? (
                  <Spinner size="sm" label="Marking all as read..." />
                ) : (
                  <CheckCheck size={16} aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {isMarkingAll ? "Marking..." : "Mark all read"}
                </span>
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <div className="flex items-center gap-1 mt-4 p-1 rounded-lg bg-[var(--color-bg-elevated)] w-fit">
            {(["all", "unread"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                aria-pressed={filter === mode}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  filter === mode
                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {mode === "all" ? "All" : "Unread"}
              </button>
            ))}
          </div>
        </div>

        {/* Action error */}
        {actionError && (
          <div
            role="alert"
            className={cn(
              "mb-4 flex items-center gap-3 px-4 py-3 rounded-lg",
              "bg-[var(--color-error)]/10 border border-[var(--color-error)]/20",
              "text-sm text-[var(--color-error)]"
            )}
          >
            <Info size={16} aria-hidden="true" className="flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Unauthenticated */}
        {status === "unauthenticated" && (
          <div className="py-16 text-center">
            <BellOff
              size={48}
              className="mx-auto mb-4 text-[var(--color-text-secondary)]"
              aria-hidden="true"
            />
            <p className="text-[var(--color-text-secondary)]">
              Please{" "}
              <Link
                href="/login?callbackUrl=/profile/notifications"
                className="text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
              >
                log in
              </Link>{" "}
              to view your notifications.
            </p>
          </div>
        )}

        {/* Loading */}
        {status === "authenticated" && isLoading && (
          <div className="space-y-3" aria-label="Loading notifications" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {status === "authenticated" && error && !isLoading && (
          <div
            role="alert"
            className={cn(
              "py-12 text-center rounded-xl border border-[var(--color-error)]/20",
              "bg-[var(--color-error)]/5"
            )}
          >
            <Info
              size={40}
              className="mx-auto mb-3 text-[var(--color-error)]"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-[var(--color-error)] mb-1">
              Failed to load notifications
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              Please check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => void mutate()}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                "border border-[var(--color-border)] hover:border-[var(--color-primary)]/40",
                "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              Retry
            </button>
          </div>
        )}

        {/* Notification list */}
        {status === "authenticated" && !isLoading && !error && (
          <>
            {notifications.length === 0 ? (
              <EmptyState
                icon={filter === "unread" ? "BellOff" : "Bell"}
                heading={
                  filter === "unread"
                    ? "No unread notifications"
                    : "No notifications yet"
                }
                description={
                  filter === "unread"
                    ? "You're all caught up! Switch to \"All\" to see past notifications."
                    : "When you receive notifications about applications, certificates, mentions, and more, they'll appear here."
                }
                action={
                  filter === "unread"
                    ? {
                        label: "View all notifications",
                        onClick: () => setFilter("all"),
                      }
                    : undefined
                }
              />
            ) : (
              <div
                role="list"
                aria-label="Notifications list"
                className="space-y-2"
              >
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    role="listitem"
                  >
                    <NotificationItemView
                      notification={notification}
                      onMarkRead={handleMarkRead}
                      isMarkingRead={markingReadId === notification.id}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </div>
            )}

            {/* Page info */}
            {notifications.length > 0 && data && (
              <p className="mt-4 text-center text-xs text-[var(--color-text-secondary)]">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, data.total)} of {data.total}{" "}
                notification{data.total !== 1 ? "s" : ""}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}