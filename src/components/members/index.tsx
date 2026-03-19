// src/components/members/index.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, List, Users } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Badge, Skeleton, Spinner } from "@/components/ui/Feedback";
import type { MemberPublic, ApiListResponse } from "@/types/index";
import type { FilterState } from "@/types/ui";

// ─── Lazy imports for co-located components ───────────────────────────────────
// Card and Filter are sibling files; imported directly.
// They are expected to be present at these paths.
import { MemberCard } from "@/components/members/Card";
import { MembersFilter } from "@/components/members/Filter";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FILTER: FilterState = {
  search: "",
  role: "",
  department: "",
  session: "",
  status: "",
  memberType: "",
};

const ROLE_CATEGORY_ORDER: string[] = [
  "executive",
  "sub_executive",
  "general",
  "alumni",
];

const CATEGORY_LABELS: Record<string, string> = {
  executive: "Executive Committee",
  sub_executive: "Sub-Executive Committee",
  general: "General Members",
  alumni: "Alumni",
};

// ─── Animation Variants ───────────────────────────────────────────────────────

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const gridItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

const reducedMotionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MembersGridProps {
  initialMembers: MemberPublic[];
  initialCursor: string | null;
  roles: Array<{ id: string; name: string; category: string }>;
  departments: Array<{ id: string; name: string }>;
  sessions: string[];
}

interface GroupedMembers {
  category: string;
  label: string;
  members: MemberPublic[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function isFilterActive(filter: FilterState): boolean {
  return (
    filter.search.trim().length > 0 ||
    Boolean(filter.role) ||
    Boolean(filter.department) ||
    Boolean(filter.session) ||
    Boolean(filter.status) ||
    Boolean(filter.memberType)
  );
}

function buildQueryString(filter: FilterState, cursor: string | null): string {
  const params = new URLSearchParams();
  if (filter.search.trim()) params.set("search", filter.search.trim());
  if (filter.role) params.set("roleId", filter.role);
  if (filter.department) params.set("departmentId", filter.department);
  if (filter.session) params.set("session", filter.session);
  if (filter.status) params.set("status", filter.status);
  if (filter.memberType) params.set("memberType", filter.memberType);
  if (cursor) params.set("cursor", cursor);
  params.set("take", "20");
  return params.toString();
}

function groupMembersByCategory(members: MemberPublic[]): GroupedMembers[] {
  const grouped = members.reduce<Record<string, MemberPublic[]>>(
    (acc, member) => {
      const cat = member.role?.category ?? "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(member);
      return acc;
    },
    {}
  );

  return ROLE_CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0).map(
    (cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      members: grouped[cat],
    })
  );
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

function MemberCardSkeleton({ view }: { view: "grid" | "list" }): JSX.Element {
  if (view === "list") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
        <Skeleton rounded="full" width={40} height={40} />
        <div className="flex-1 flex items-center gap-4">
          <Skeleton width="30%" height={14} />
          <Skeleton width="15%" height={14} />
          <Skeleton width="20%" height={14} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] overflow-hidden">
      <Skeleton height={160} rounded="sm" className="rounded-none" />
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton rounded="full" width={48} height={48} className="-mt-8 ring-2 ring-[var(--color-bg-surface)]" />
          <Skeleton width="60%" height={14} className="mt-1" />
        </div>
        <Skeleton width="40%" height={12} />
        <Skeleton width="50%" height={12} />
      </div>
    </div>
  );
}

function GridSkeletons({ count, view }: { count: number; view: "grid" | "list" }): JSX.Element {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <MemberCardSkeleton key={i} view={view} />
      ))}
    </>
  );
}

// ─── Group Heading ─────────────────────────────────────────────────────────────

function GroupHeading({ label, count }: { label: string; count: number }): JSX.Element {
  return (
    <div className="flex items-center gap-3 mt-10 mb-4 first:mt-0">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] font-[var(--font-mono)]">
        {label}
      </h2>
      <Badge variant="neutral" size="sm">
        {count}
      </Badge>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function MembersEmptyState({ isFiltered }: { isFiltered: boolean }): JSX.Element {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center">
        <Users size={28} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[var(--color-text-primary)] font-semibold text-lg">
          {isFiltered ? "No members match your filters" : "No members yet"}
        </p>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1">
          {isFiltered
            ? "Try adjusting your search or filter criteria."
            : "Members will appear here once they join the club."}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MembersGrid({
  initialMembers,
  initialCursor,
  roles,
  departments,
  sessions,
}: MembersGridProps): JSX.Element {
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [members, setMembers] = useState<MemberPublic[]>(initialMembers);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [total, setTotal] = useState<number>(initialMembers.length);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [filterVersion, setFilterVersion] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Track whether the filter was previously active to trigger key change for AnimatePresence
  const [animationKey, setAnimationKey] = useState<string>("initial");

  // Debounce the entire filter state to avoid API call on every keystroke
  const debouncedFilter = useDebounce(filterState, 300);

  // Ref to track if the current fetch is from a filter reset (first page)
  const isMountedRef = useRef<boolean>(true);
  const isInitialRender = useRef<boolean>(true);

  // ─── Reduced Motion ─────────────────────────────────────────────────────────

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ─── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── Fetch on filter change ─────────────────────────────────────────────────

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    let cancelled = false;

    async function fetchMembers(): Promise<void> {
      setIsLoading(true);
      setMembers([]);
      setNextCursor(null);
      setAnimationKey(`filter-${Date.now()}`);

      try {
        const qs = buildQueryString(debouncedFilter, null);
        const res = await fetch(`/api/members?${qs}`);
        if (!res.ok) throw new Error("Failed to fetch members");
        const json: ApiListResponse<MemberPublic> = await res.json();
        if (!cancelled && isMountedRef.current) {
          setMembers(json.data);
          setNextCursor(json.nextCursor ?? null);
          setTotal(json.total);
        }
      } catch (err) {
        if (!cancelled && isMountedRef.current) {
          setMembers([]);
          setNextCursor(null);
          setTotal(0);
        }
      } finally {
        if (!cancelled && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    fetchMembers();

    return () => {
      cancelled = true;
    };
  }, [debouncedFilter]);

  // ─── Infinite scroll callback ───────────────────────────────────────────────

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore || isLoading) return;

    setIsLoadingMore(true);
    try {
      const qs = buildQueryString(debouncedFilter, nextCursor);
      const res = await fetch(`/api/members?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch more members");
      const json: ApiListResponse<MemberPublic> = await res.json();
      if (isMountedRef.current) {
        setMembers((prev) => [...prev, ...json.data]);
        setNextCursor(json.nextCursor ?? null);
      }
    } catch (err) {
      // Silently fail for pagination — the user can scroll back up and retry
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [nextCursor, isLoadingMore, isLoading, debouncedFilter]);

  const { ref: sentinelRef } = useInfiniteScroll(handleLoadMore);

  // ─── Grouped view ───────────────────────────────────────────────────────────

  const filterActive = isFilterActive(filterState);
  const groupedMembers = useMemo(
    () => (filterActive ? null : groupMembersByCategory(members)),
    [members, filterActive]
  );

  // ─── Animation variants ─────────────────────────────────────────────────────

  const containerVariants = prefersReducedMotion
    ? reducedMotionVariants
    : gridContainerVariants;

  const itemVariants = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.1 } } }
    : gridItemVariants;

  // ─── Grid class ─────────────────────────────────────────────────────────────

  const gridClass =
    viewMode === "grid"
      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      : "flex flex-col gap-3";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <section aria-label="Members directory" className="w-full">
      {/* Filter bar */}
      <MembersFilter
        state={filterState}
        onChange={setFilterState}
        roles={roles.map((r) => ({ ...r, color: (r as unknown as { color?: string }).color ?? "" }))}
        departments={departments}
        sessions={sessions}
      />

      {/* Toolbar: count + view toggle */}
      <div className="flex items-center justify-between mt-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner size="sm" />
                <span>Loading…</span>
              </span>
            ) : (
              <>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {total.toLocaleString()}
                </span>{" "}
                member{total !== 1 ? "s" : ""}
              </>
            )}
          </span>
          {filterActive && !isLoading && (
            <Badge variant="accent" size="sm">
              Filtered
            </Badge>
          )}
        </div>

        <div
          className="flex items-center rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-surface)]"
          role="group"
          aria-label="View mode"
        >
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-pressed={viewMode === "grid"}
            aria-label="Grid view"
            className={[
              "p-2 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-accent)]",
              viewMode === "grid"
                ? "bg-[var(--color-bg-elevated)] text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            ].join(" ")}
          >
            <LayoutGrid size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
            aria-label="List view"
            className={[
              "p-2 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-accent)]",
              viewMode === "list"
                ? "bg-[var(--color-bg-elevated)] text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            ].join(" ")}
          >
            <List size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={gridClass}
            aria-busy="true"
            aria-label="Loading members"
          >
            <GridSkeletons count={8} view={viewMode} />
          </motion.div>
        ) : members.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MembersEmptyState isFiltered={filterActive} />
          </motion.div>
        ) : filterActive ? (
          /* Flat filtered grid */
          <motion.div
            key={animationKey}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={gridClass}
          >
            {members.map((member) => (
              <motion.div key={member.id} variants={itemVariants}>
                <MemberCard member={member} view={viewMode} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* Grouped by role category */
          <motion.div
            key={animationKey}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {groupedMembers && groupedMembers.length > 0 ? (
              groupedMembers.map((group) => (
                <div key={group.category}>
                  <GroupHeading label={group.label} count={group.members.length} />
                  <div className={gridClass}>
                    {group.members.map((member) => (
                      <motion.div key={member.id} variants={itemVariants}>
                        <MemberCard member={member} view={viewMode} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <MembersEmptyState isFiltered={false} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infinite scroll sentinel */}
      {!isLoading && nextCursor && (
        <div
          ref={sentinelRef}
          className="flex justify-center py-8"
          aria-hidden="true"
        >
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
              <Spinner size="sm" />
              <span className="text-sm">Loading more…</span>
            </div>
          )}
        </div>
      )}

      {/* End of results indicator */}
      {!isLoading && !nextCursor && members.length > 0 && (
        <div className="flex justify-center py-8">
          <p className="text-xs text-[var(--color-text-secondary)] font-[var(--font-mono)]">
            — end of results —
          </p>
        </div>
      )}
    </section>
  );
}