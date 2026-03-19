// src/components/projects/index.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Skeleton, Spinner } from "@/components/ui/Feedback";
import { ProjectCard } from "@/components/projects/Card";
import { ProjectDetail } from "@/components/projects/Detail";
import type { ProjectCard as ProjectCardType } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
  search: string;
  categoryId: string;
  status: string;
  year: string;
}

interface ProjectsGridProps {
  initialProjects: ProjectCardType[];
  categories: Array<{ id: string; name: string }>;
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const AVAILABLE_STATUSES = [
  { value: "", label: "All Status" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => ({
  value: String(CURRENT_YEAR - i),
  label: String(CURRENT_YEAR - i),
}));

// ─── Skeleton Grid ────────────────────────────────────────────────────────────

function ProjectsSkeletonGrid(): JSX.Element {
  return (
    <div
      className="columns-1 sm:columns-2 lg:columns-3 gap-6"
      aria-label="Loading projects"
      aria-busy="true"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="break-inside-avoid mb-6">
          <Skeleton
            className="w-full rounded-lg"
            height={i % 3 === 0 ? 320 : i % 3 === 1 ? 260 : 200}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function ProjectsEmptyState({ hasFilters }: { hasFilters: boolean }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div
        className="w-20 h-20 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center"
        aria-hidden="true"
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="4"
            y="8"
            width="28"
            height="20"
            rx="3"
            stroke="var(--color-text-secondary)"
            strokeWidth="2"
          />
          <path
            d="M4 13h28"
            stroke="var(--color-text-secondary)"
            strokeWidth="2"
          />
          <circle cx="8.5" cy="10.5" r="1.5" fill="var(--color-text-secondary)" />
          <circle cx="13.5" cy="10.5" r="1.5" fill="var(--color-text-secondary)" />
          <path
            d="M10 20h16M10 24h10"
            stroke="var(--color-text-secondary)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="text-center max-w-sm">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
          {hasFilters ? "No projects match your filters" : "No projects yet"}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {hasFilters
            ? "Try adjusting your search or filters to find what you're looking for."
            : "Projects will appear here once they've been published."}
        </p>
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: FilterState;
  onChange: (partial: Partial<FilterState>) => void;
  categories: Array<{ id: string; name: string }>;
  isLoading: boolean;
}

function FilterBar({ filters, onChange, categories, isLoading }: FilterBarProps): JSX.Element {
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sync search state if filters.search is reset externally
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.categoryId !== "" ||
    filters.status !== "" ||
    filters.year !== "";

  function clearAll() {
    setLocalSearch("");
    onChange({ search: "", categoryId: "", status: "", year: "" });
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mb-8",
        "p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
      )}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M10 6.5C10 8.43 8.43 10 6.5 10C4.57 10 3 8.43 3 6.5C3 4.57 4.57 3 6.5 3C8.43 3 10 4.57 10 6.5ZM9.3 10.01C8.55 10.64 7.57 11 6.5 11C4.01 11 2 8.99 2 6.5C2 4.01 4.01 2 6.5 2C8.99 2 11 4.01 11 6.5C11 7.57 10.64 8.55 10.01 9.3L13.35 12.65C13.55 12.84 13.55 13.16 13.35 13.35C13.16 13.55 12.84 13.55 12.65 13.35L9.3 10.01Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          placeholder="Search projects..."
          value={localSearch}
          onChange={(e) => {
            setLocalSearch(e.target.value);
            onChange({ search: e.target.value });
          }}
          className={cn(
            "w-full pl-9 pr-4 py-2 rounded-lg text-sm",
            "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
            "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
            "transition-colors duration-150"
          )}
          aria-label="Search projects"
        />
      </div>

      {/* Category */}
      <select
        value={filters.categoryId}
        onChange={(e) => onChange({ categoryId: e.target.value })}
        aria-label="Filter by category"
        className={cn(
          "px-3 py-2 rounded-lg text-sm",
          "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
          "text-[var(--color-text-primary)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
          "transition-colors duration-150 cursor-pointer"
        )}
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value })}
        aria-label="Filter by status"
        className={cn(
          "px-3 py-2 rounded-lg text-sm",
          "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
          "text-[var(--color-text-primary)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
          "transition-colors duration-150 cursor-pointer"
        )}
      >
        {AVAILABLE_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Year */}
      <select
        value={filters.year}
        onChange={(e) => onChange({ year: e.target.value })}
        aria-label="Filter by year"
        className={cn(
          "px-3 py-2 rounded-lg text-sm",
          "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
          "text-[var(--color-text-primary)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
          "transition-colors duration-150 cursor-pointer"
        )}
      >
        <option value="">All Years</option>
        {YEAR_OPTIONS.map((y) => (
          <option key={y.value} value={y.value}>
            {y.label}
          </option>
        ))}
      </select>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          aria-label="Clear all filters"
          className={cn(
            "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "border border-[var(--color-border)] hover:border-[var(--color-border-accent)]",
            "bg-transparent hover:bg-[var(--color-bg-elevated)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "transition-colors duration-150 flex items-center gap-1.5"
          )}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M1 1l11 11M12 1L1 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Clear filters
        </button>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="ml-auto flex-shrink-0">
          <Spinner size="sm" label="Loading projects" />
        </div>
      )}
    </div>
  );
}

// ─── Active Filter Pills ──────────────────────────────────────────────────────

interface ActivePillsProps {
  filters: FilterState;
  categories: Array<{ id: string; name: string }>;
  onRemove: (key: keyof FilterState) => void;
}

function ActivePills({ filters, categories, onRemove }: ActivePillsProps): JSX.Element | null {
  const pills: Array<{ key: keyof FilterState; label: string }> = [];

  if (filters.search) {
    pills.push({ key: "search", label: `"${filters.search}"` });
  }
  if (filters.categoryId) {
    const cat = categories.find((c) => c.id === filters.categoryId);
    if (cat) pills.push({ key: "categoryId", label: cat.name });
  }
  if (filters.status) {
    const s = AVAILABLE_STATUSES.find((s) => s.value === filters.status);
    if (s) pills.push({ key: "status", label: s.label });
  }
  if (filters.year) {
    pills.push({ key: "year", label: filters.year });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-5" aria-label="Active filters">
      {pills.map((pill) => (
        <button
          key={pill.key}
          type="button"
          onClick={() => onRemove(pill.key)}
          aria-label={`Remove filter: ${pill.label}`}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
            "bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
            "border border-[var(--color-accent)]/20",
            "hover:bg-[var(--color-accent)]/20 transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          {pill.label}
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M1 1l9 9M10 1L1 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── ProjectsGrid ─────────────────────────────────────────────────────────────

export function ProjectsGrid({
  initialProjects,
  categories,
}: ProjectsGridProps): JSX.Element {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    categoryId: "",
    status: "",
    year: "",
  });

  const [projects, setProjects] = useState<ProjectCardType[]>(initialProjects);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasError, setHasError] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 300);

  // Track if filters have changed to reset data
  const prevFiltersRef = useRef({
    search: "",
    categoryId: "",
    status: "",
    year: "",
  });

  // Build query string from filters
  function buildQuery(cursor?: string): string {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.status) params.set("status", filters.status);
    if (filters.year) params.set("year", filters.year);
    params.set("take", "12");
    if (cursor) params.set("cursor", cursor);
    return params.toString();
  }

  // Fetch first page when filters change
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed =
      prev.search !== debouncedSearch ||
      prev.categoryId !== filters.categoryId ||
      prev.status !== filters.status ||
      prev.year !== filters.year;

    if (!changed) return;

    prevFiltersRef.current = {
      search: debouncedSearch,
      categoryId: filters.categoryId,
      status: filters.status,
      year: filters.year,
    };

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    fetch(`/api/projects?${buildQuery()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch projects");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setProjects(json.data ?? []);
        setNextCursor(json.nextCursor ?? undefined);
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.categoryId, filters.status, filters.year]);

  // Load more (infinite scroll)
  const loadMore = useCallback(() => {
    if (!nextCursor || isFetchingMore || isLoading) return;

    let cancelled = false;
    setIsFetchingMore(true);

    fetch(`/api/projects?${buildQuery(nextCursor)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch more projects");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setProjects((prev) => [...prev, ...(json.data ?? [])]);
        setNextCursor(json.nextCursor ?? undefined);
      })
      .catch(() => {
        // Silently fail load-more — user can scroll to retry
      })
      .finally(() => {
        if (!cancelled) setIsFetchingMore(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor, isFetchingMore, isLoading, buildQuery]);

  const { ref: sentinelRef } = useInfiniteScroll(loadMore, { threshold: 0.1 });

  // Filter change handler
  function handleFilterChange(partial: Partial<FilterState>): void {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  function handleRemoveFilter(key: keyof FilterState): void {
    setFilters((prev) => ({ ...prev, [key]: "" }));
  }

  const hasActiveFilters =
    filters.search !== "" ||
    filters.categoryId !== "" ||
    filters.status !== "" ||
    filters.year !== "";

  return (
    <section aria-label="Projects directory">
      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        categories={categories}
        isLoading={isLoading}
      />

      {/* Active Filter Pills */}
      <ActivePills
        filters={filters}
        categories={categories}
        onRemove={handleRemoveFilter}
      />

      {/* Grid */}
      {isLoading ? (
        <ProjectsSkeletonGrid />
      ) : hasError ? (
        <div
          role="alert"
          className={cn(
            "flex flex-col items-center justify-center py-24 gap-4",
            "text-center"
          )}
        >
          <div
            className="w-20 h-20 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="16"
                cy="16"
                r="13"
                stroke="var(--color-error)"
                strokeWidth="2"
              />
              <path
                d="M16 9v8M16 21v2"
                stroke="var(--color-error)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
              Failed to load projects
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              There was a network error. Please try again.
            </p>
            <button
              type="button"
              onClick={() => {
                prevFiltersRef.current = { search: "__reset__", categoryId: "", status: "", year: "" };
                handleFilterChange({ search: filters.search });
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]",
                "border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors duration-150"
              )}
            >
              Retry
            </button>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <ProjectsEmptyState hasFilters={hasActiveFilters} />
      ) : (
        <>
          {/* Result count */}
          <p
            className="text-xs text-[var(--color-text-secondary)] mb-4"
            aria-live="polite"
            aria-atomic="true"
          >
            Showing {projects.length} project{projects.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " for current filters" : ""}
          </p>

          {/* Masonry Grid — CSS columns */}
          <div
            className="columns-1 sm:columns-2 lg:columns-3 gap-6"
            role="list"
            aria-label="Projects list"
          >
            {projects.map((project) => (
              <div
                key={project.id}
                role="listitem"
                className="break-inside-avoid mb-6"
              >
                <ProjectCard
                  project={project}
                  onClick={() => setSelectedProjectId(project.id)}
                />
              </div>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {nextCursor && (
            <div
              ref={sentinelRef}
              className="flex justify-center items-center py-8"
              aria-hidden="true"
            >
              {isFetchingMore && (
                <Spinner size="md" label="Loading more projects" />
              )}
            </div>
          )}

          {/* End of results */}
          {!nextCursor && projects.length > 0 && (
            <p className="text-center text-xs text-[var(--color-text-secondary)] py-8">
              All projects loaded
            </p>
          )}
        </>
      )}

      {/* Project Detail Modal */}
      {selectedProjectId !== null && (
        <ProjectDetail
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </section>
  );
}