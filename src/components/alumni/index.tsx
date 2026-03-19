// src/components/alumni/index.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Users, X } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Badge, Skeleton, Spinner } from "@/components/ui/Feedback";
import { MemberCard } from "@/components/members/Card";
import type { MemberPublic } from "@/types/index";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlumniGridProps {
  initialAlumni: MemberPublic[];
  sessions: string[];
  initialTotal?: number;
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function AlumniGridSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] overflow-hidden"
        >
          <Skeleton className="w-full" height={200} rounded="sm" />
          <div className="p-4 space-y-2">
            <Skeleton height={20} width="70%" rounded="md" />
            <Skeleton height={14} width="50%" rounded="md" />
            <Skeleton height={14} width="40%" rounded="md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Session Timeline Bar ─────────────────────────────────────────────────────

interface SessionBarProps {
  sessions: string[];
  selected: string | null;
  onSelect: (session: string | null) => void;
}

function SessionBar({ sessions, selected, onSelect }: SessionBarProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  const pills = ["All Sessions", ...sessions];

  const handleSelect = (pill: string): void => {
    if (pill === "All Sessions") {
      onSelect(null);
    } else {
      onSelect(pill);
    }
  };

  const isActive = (pill: string): boolean => {
    if (pill === "All Sessions") return selected === null;
    return selected === pill;
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        role="tablist"
        aria-label="Filter by session"
      >
        {pills.map((pill) => {
          const active = isActive(pill);
          return (
            <button
              key={pill}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelect(pill)}
              className={cn(
                "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium",
                "transition-all duration-200 border",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-bg-base)] border-[var(--color-accent)] shadow-[0_0_8px_var(--color-glow-accent)]"
                  : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text-primary)]"
              )}
            >
              {pill}
            </button>
          );
        })}
      </div>
      {/* Fade hint on right edge */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-[var(--color-bg-base)] to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

// ─── AlumniGrid ───────────────────────────────────────────────────────────────

export function AlumniGrid({
  initialAlumni,
  sessions,
  initialTotal = 0,
}: AlumniGridProps): JSX.Element {
  const [alumni, setAlumni] = useState<MemberPublic[]>(initialAlumni);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [total, setTotal] = useState<number>(initialTotal);

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const isFetchingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Build query URL ──────────────────────────────────────────────────────
  const buildUrl = useCallback(
    (cursor?: string): string => {
      const params = new URLSearchParams();
      params.set("memberType", "alumni");
      params.set("status", "active");
      params.set("take", "20");

      if (selectedSession) params.set("session", selectedSession);
      if (debouncedSearch.trim().length >= 1) params.set("search", debouncedSearch.trim());
      if (departmentId) params.set("departmentId", departmentId);
      if (cursor) params.set("cursor", cursor);

      return `/api/members?${params.toString()}`;
    },
    [selectedSession, debouncedSearch, departmentId]
  );

  // ── Initial / filter fetch ───────────────────────────────────────────────
  useEffect(() => {
    // If filters match initial state, use SSR data
    if (
      selectedSession === null &&
      debouncedSearch.trim() === "" &&
      departmentId === ""
    ) {
      setAlumni(initialAlumni);
      setNextCursor(undefined);
      setTotal(initialTotal);
      setError(null);
      return;
    }

    // Abort previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchAlumni = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      setAlumni([]);
      setNextCursor(undefined);

      try {
        const res = await fetch(buildUrl(), { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setAlumni(json.data ?? []);
        setNextCursor(json.nextCursor);
        setTotal(json.total ?? 0);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Failed to load alumni. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAlumni();

    return () => {
      controller.abort();
    };
  }, [selectedSession, debouncedSearch, departmentId, buildUrl, initialAlumni, initialTotal]);

  // ── Infinite scroll load more ────────────────────────────────────────────
  const handleLoadMore = useCallback(async (): Promise<void> => {
    if (!nextCursor || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsFetchingMore(true);

    try {
      const res = await fetch(buildUrl(nextCursor));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAlumni((prev) => [...prev, ...(json.data ?? [])]);
      setNextCursor(json.nextCursor);
    } catch {
      // Silently fail for load-more; user can scroll up and back down to retry
    } finally {
      setIsFetchingMore(false);
      isFetchingRef.current = false;
    }
  }, [nextCursor, buildUrl]);

  const { ref: sentinelRef } = useInfiniteScroll(handleLoadMore);

  // ── Session change resets filters ────────────────────────────────────────
  const handleSessionSelect = (session: string | null): void => {
    setSelectedSession(session);
  };

  // ── Clear all filters ────────────────────────────────────────────────────
  const handleClearFilters = (): void => {
    setSearch("");
    setDepartmentId("");
    setSelectedSession(null);
  };

  const hasActiveFilters =
    selectedSession !== null || search.trim() !== "" || departmentId !== "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="w-full space-y-6">
      {/* ── Heading ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users
            size={22}
            className="text-[var(--color-accent)]"
            aria-hidden="true"
          />
          <h2
            className="text-2xl font-bold text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            All Alumni
          </h2>
          {total > 0 && (
            <Badge variant="accent" size="md">
              {total.toLocaleString()}
            </Badge>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
              "border border-[var(--color-border)]",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-surface)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <X size={14} aria-hidden="true" />
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Session Timeline Bar ── */}
      {sessions.length > 0 && (
        <SessionBar
          sessions={sessions}
          selected={selectedSession}
          onSelect={handleSessionSelect}
        />
      )}

      {/* ── Search & Department Filter ── */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alumni by name, username…"
            aria-label="Search alumni"
            className={cn(
              "block w-full rounded-lg py-2 pl-9 pr-3 text-sm",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
              "border border-[var(--color-border)]",
              "placeholder:text-[var(--color-text-secondary)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
            )}
          />
        </div>
      </div>

      {/* ── Active filter pills ── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2" aria-label="Active filters">
          {selectedSession && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/25 text-[var(--color-accent)]"
              )}
            >
              Session: {selectedSession}
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                aria-label={`Remove session filter: ${selectedSession}`}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--color-accent)]/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
              >
                <X size={10} aria-hidden="true" />
              </button>
            </span>
          )}
          {search.trim() !== "" && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 text-[var(--color-primary)]"
              )}
            >
              Search: {search.trim()}
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={`Remove search filter: ${search}`}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--color-primary)]/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
              >
                <X size={10} aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Error State ── */}
      {error && (
        <div
          role="alert"
          className={cn(
            "rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10",
            "px-4 py-3 text-sm text-[var(--color-error)]"
          )}
        >
          {error}
        </div>
      )}

      {/* ── Loading State ── */}
      {isLoading ? (
        <AlumniGridSkeleton />
      ) : alumni.length === 0 && !error ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div
            className="rounded-full p-5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
            aria-hidden="true"
          >
            <Users size={36} className="text-[var(--color-text-secondary)]" />
          </div>
          <div className="space-y-1.5">
            <h3
              className="text-lg font-semibold text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              No Alumni Found
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
              {hasActiveFilters
                ? "Try adjusting or clearing your filters."
                : "No alumni have joined yet. Check back later."}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className={cn(
                "mt-2 rounded-lg border border-[var(--color-border)]",
                "px-4 py-2 text-sm text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
                "transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        /* ── Alumni Grid ── */
        <>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            aria-label="Alumni directory"
          >
            {alumni.map((member) => (
              <MemberCard key={member.id} member={member} view="grid" />
            ))}
          </div>

          {/* ── Infinite Scroll Sentinel ── */}
          {nextCursor && (
            <div
              ref={sentinelRef}
              className="flex justify-center py-6"
              aria-live="polite"
              aria-label="Loading more alumni"
            >
              {isFetchingMore && <Spinner size="md" label="Loading more alumni…" />}
            </div>
          )}

          {/* ── End of results ── */}
          {!nextCursor && alumni.length > 0 && (
            <p className="text-center text-xs text-[var(--color-text-secondary)] py-4">
              Showing all {alumni.length.toLocaleString()} alumni
              {hasActiveFilters ? " matching your filters" : ""}
            </p>
          )}
        </>
      )}
    </section>
  );
}