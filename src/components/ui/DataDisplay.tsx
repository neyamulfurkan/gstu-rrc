// src/components/ui/DataDisplay.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Feedback";
import { useCounterAnimation } from "@/hooks/useCounterAnimation";

// ─── Table ────────────────────────────────────────────────────────────────────

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

interface TableProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  striped?: boolean;
  loading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string;
}

export function Table<T>({
  columns,
  data,
  striped = false,
  loading = false,
  skeletonRows = 5,
  emptyMessage = "No data available.",
  className,
  onRowClick,
  rowKey,
}: TableProps<T>): JSX.Element {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDir === "asc" ? 1 : -1;
      if (bVal == null) return sortDir === "asc" ? -1 : 1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDir === "asc"
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      const cmp = aStr.localeCompare(bStr);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const alignClass = (align?: "left" | "center" | "right") => {
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
  };

  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-lg border border-[var(--color-border)]",
        className
      )}
    >
      <table className="w-full min-w-full border-collapse">
        <thead>
          <tr className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wider",
                  "text-[var(--color-text-secondary)]",
                  alignClass(col.align),
                  col.sortable &&
                    "cursor-pointer select-none hover:text-[var(--color-text-primary)] transition-colors",
                  col.sortable &&
                    "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-accent)]"
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                onKeyDown={
                  col.sortable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSort(col.key);
                        }
                      }
                    : undefined
                }
                tabIndex={col.sortable ? 0 : undefined}
                aria-sort={
                  col.sortable && sortKey === col.key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : col.sortable
                    ? "none"
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && (
                    <span aria-hidden="true" className="inline-flex flex-col">
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )
                      ) : (
                        <ArrowUpDown
                          size={14}
                          className="opacity-40"
                        />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <tr
                key={`skeleton-${rowIdx}`}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton height={20} className="w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-[var(--color-text-secondary)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIdx) => {
              const key = rowKey ? rowKey(row) : String(rowIdx);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-[var(--color-border)] last:border-0",
                    "transition-colors duration-150",
                    striped && rowIdx % 2 === 0
                      ? "bg-[var(--color-bg-surface)]"
                      : "bg-transparent",
                    onRowClick &&
                      "cursor-pointer hover:bg-[var(--color-bg-elevated)]"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-sm text-[var(--color-text-primary)]",
                        alignClass(col.align)
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps): JSX.Element | null {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | "ellipsis-start" | "ellipsis-end")[] => {
    const delta = 2;
    const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];

    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);

    if (rangeStart > 2) {
      pages.push("ellipsis-start");
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (rangeEnd < totalPages - 1) {
      pages.push("ellipsis-end");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  const btnBase = cn(
    "inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-md text-sm font-medium",
    "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
  );

  const btnNormal = cn(
    btnBase,
    "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]",
    "hover:text-[var(--color-text-primary)]"
  );

  const btnActive = cn(
    btnBase,
    "bg-[var(--color-primary)] text-white font-semibold"
  );

  const btnDisabled = cn(
    btnBase,
    "text-[var(--color-text-secondary)] opacity-40 cursor-not-allowed"
  );

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <button
        type="button"
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        className={currentPage <= 1 ? btnDisabled : btnNormal}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      {pages.map((page, idx) => {
        if (page === "ellipsis-start" || page === "ellipsis-end") {
          return (
            <span
              key={page}
              className="inline-flex items-center justify-center min-w-[36px] h-9 text-[var(--color-text-secondary)] text-sm select-none"
              aria-hidden="true"
            >
              …
            </span>
          );
        }

        const isActive = page === currentPage;
        return (
          <button
            key={`page-${page}-${idx}`}
            type="button"
            onClick={() => !isActive && onPageChange(page)}
            aria-label={`Page ${page}`}
            aria-current={isActive ? "page" : undefined}
            className={isActive ? btnActive : btnNormal}
          >
            {page}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() =>
          currentPage < totalPages && onPageChange(currentPage + 1)
        }
        disabled={currentPage >= totalPages}
        aria-label="Next page"
        className={currentPage >= totalPages ? btnDisabled : btnNormal}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  heading: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// Dynamically load a Lucide icon by name
function DynamicIcon({
  name,
  size = 48,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}): JSX.Element | null {
  const [IconComponent, setIconComponent] =
    useState<React.ComponentType<{ size?: number; className?: string }> | null>(
      null
    );

  useEffect(() => {
    let cancelled = false;
    import("lucide-react")
      .then((mod) => {
        if (!cancelled) {
          const comp = (mod as Record<string, unknown>)[name] as
            | React.ComponentType<{ size?: number; className?: string }>
            | undefined;
          setIconComponent(() => comp ?? null);
        }
      })
      .catch(() => {
        // icon not found — silently fail
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!IconComponent) return null;
  return <IconComponent size={size} className={className} />;
}

export function EmptyState({
  icon,
  heading,
  description,
  action,
  className,
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex items-center justify-center w-16 h-16 rounded-full",
            "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"
          )}
          aria-hidden="true"
        >
          <DynamicIcon name={icon} size={28} />
        </div>
      )}
      <h3
        className={cn(
          "text-lg font-semibold text-[var(--color-text-primary)] mb-2",
          "font-[var(--font-display)]"
        )}
      >
        {heading}
      </h3>
      {description && (
        <p className="text-sm text-[var(--color-text-secondary)] max-w-xs leading-relaxed mb-4">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── CounterStat ──────────────────────────────────────────────────────────────

interface CounterStatProps {
  value: number;
  suffix?: string;
  label: string;
  icon?: string;
  className?: string;
}

export function CounterStat({
  value,
  suffix = "",
  label,
  icon,
  className,
}: CounterStatProps): JSX.Element {
  const { count, ref } = useCounterAnimation(value, 1500, true);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        "flex flex-col items-center gap-2 p-6 rounded-xl",
        "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
        "hover:border-[var(--color-primary)]/40 transition-colors duration-300",
        className
      )}
    >
      {icon && (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-primary)]/10"
          aria-hidden="true"
        >
          <DynamicIcon
            name={icon}
            size={20}
            className="text-[var(--color-primary)]"
          />
        </div>
      )}
      <div
        className="text-3xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] tabular-nums"
        aria-live="polite"
        aria-label={`${value}${suffix} ${label}`}
      >
        {count.toLocaleString()}
        {suffix && (
          <span className="text-[var(--color-accent)]">{suffix}</span>
        )}
      </div>
      <div className="text-sm text-[var(--color-text-secondary)] font-medium text-center">
        {label}
      </div>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export interface TimelineItem {
  date: string;
  title: string;
  description: string;
  imageUrl?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

interface TimelineItemState {
  visible: boolean;
}

export function Timeline({ items, className }: TimelineProps): JSX.Element {
  const [visibilityMap, setVisibilityMap] = useState<
    Record<number, TimelineItemState>
  >(() => Object.fromEntries(items.map((_, i) => [i, { visible: false }])));

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      setVisibilityMap(
        Object.fromEntries(items.map((_, i) => [i, { visible: true }]))
      );
      return;
    }

    const observers: IntersectionObserver[] = [];

    itemRefs.current.forEach((el, idx) => {
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry && entry.isIntersecting) {
            setVisibilityMap((prev) => ({
              ...prev,
              [idx]: { visible: true },
            }));
            observer.disconnect();
          }
        },
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [items]);

  if (items.length === 0) {
    return (
      <EmptyState
        heading="No timeline entries"
        description="There are no milestones to display yet."
        className={className}
      />
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Vertical center line */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-[var(--color-border)] hidden md:block"
        aria-hidden="true"
      />
      {/* Mobile left line */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-[var(--color-border)] md:hidden"
        aria-hidden="true"
      />

      <ol className="space-y-12 md:space-y-16">
        {items.map((item, idx) => {
          const isEven = idx % 2 === 0;
          const isVisible = visibilityMap[idx]?.visible ?? false;

          return (
            <li
              key={`timeline-${idx}`}
              ref={(el: HTMLLIElement | null) => {
                itemRefs.current[idx] = el as unknown as HTMLDivElement | null;
              }}
              className={cn(
                "relative grid grid-cols-2 gap-4 items-center"
              )}
            >
              {/* Left column — even items go here (right-aligned), odd items leave empty */}
              <div
                className={cn(
                  "pr-6 transition-all duration-700 ease-out",
                  isVisible
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-8"
                )}
              >
                {isEven && <TimelineCard item={item} align="right" />}
              </div>

              {/* Center dot */}
              <div
                className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-10"
                aria-hidden="true"
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-500",
                    isVisible
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] scale-110"
                      : "border-[var(--color-border)] bg-[var(--color-bg-base)] scale-100"
                  )}
                />
              </div>

              {/* Right column — odd items go here (left-aligned), even items leave empty */}
              <div
                className={cn(
                  "pl-6 transition-all duration-700 ease-out",
                  isVisible
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-8"
                )}
              >
                {!isEven && <TimelineCard item={item} align="left" />}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface TimelineCardProps {
  item: TimelineItem;
  align: "left" | "right";
}

function TimelineCard({ item, align }: TimelineCardProps): JSX.Element {
  return (
    <div
      className={cn(
        "group rounded-xl border border-[var(--color-border)] overflow-hidden",
        "bg-[var(--color-bg-surface)] hover:border-[var(--color-primary)]/40",
        "transition-colors duration-300 shadow-sm"
      )}
    >
      {item.imageUrl && (
        <div className="relative h-36 overflow-hidden bg-[var(--color-bg-elevated)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        <time
          dateTime={item.date}
          className={cn(
            "block text-xs font-semibold uppercase tracking-wider mb-1",
            "text-[var(--color-accent)] font-[var(--font-mono)]"
          )}
        >
          {formatDate(item.date, "short")}
        </time>
        <h3
          className={cn(
            "text-sm font-bold text-[var(--color-text-primary)] mb-1",
            "font-[var(--font-heading)] leading-snug",
            align === "right" ? "text-right" : "text-left"
          )}
        >
          {item.title}
        </h3>
        <p
          className={cn(
            "text-xs text-[var(--color-text-secondary)] leading-relaxed",
            align === "right" ? "text-right" : "text-left"
          )}
        >
          {item.description}
        </p>
      </div>
    </div>
  );
}