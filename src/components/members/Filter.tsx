// src/components/members/Filter.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { LayoutGrid, List, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Forms";
import { cn } from "@/lib/utils";
import type { FilterState } from "@/types/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoleOption {
  id: string;
  name: string;
  color: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface MembersFilterProps {
  state: FilterState;
  onChange: (state: FilterState) => void;
  roles: RoleOption[];
  departments: DepartmentOption[];
  sessions: string[];
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
}

// ─── Active pill label helpers ────────────────────────────────────────────────

function getRoleLabel(roles: RoleOption[], roleId: string): string {
  return roles.find((r) => r.id === roleId)?.name ?? roleId;
}

function getDepartmentLabel(departments: DepartmentOption[], deptId: string): string {
  return departments.find((d) => d.id === deptId)?.name ?? deptId;
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
  };
  return map[status] ?? status;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembersFilter({
  state,
  onChange,
  roles,
  departments,
  sessions,
  viewMode = "grid",
  onViewModeChange,
}: MembersFilterProps): JSX.Element {
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Sticky detection via IntersectionObserver ──────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      {
        rootMargin: "0px 0px 0px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...state, search: e.target.value });
    },
    [state, onChange]
  );

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...state, role: e.target.value || undefined });
    },
    [state, onChange]
  );

  const handleDepartmentChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...state, department: e.target.value || undefined });
    },
    [state, onChange]
  );

  const handleSessionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...state, session: e.target.value || undefined });
    },
    [state, onChange]
  );

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...state, status: e.target.value || undefined });
    },
    [state, onChange]
  );

  const clearFilter = useCallback(
    (key: keyof FilterState) => {
      onChange({ ...state, [key]: key === "search" ? "" : undefined });
    },
    [state, onChange]
  );

  const clearAll = useCallback(() => {
    onChange({
      search: "",
      role: undefined,
      department: undefined,
      session: undefined,
      status: undefined,
      memberType: undefined,
    });
  }, [onChange]);

  // ── Active filter pills computation ────────────────────────────────────────
  const activePills: Array<{ key: keyof FilterState; label: string }> = [];

  if (state.search) {
    activePills.push({ key: "search", label: `"${state.search}"` });
  }
  if (state.role) {
    activePills.push({ key: "role", label: getRoleLabel(roles, state.role) });
  }
  if (state.department) {
    activePills.push({
      key: "department",
      label: getDepartmentLabel(departments, state.department),
    });
  }
  if (state.session) {
    activePills.push({ key: "session", label: state.session });
  }
  if (state.status) {
    activePills.push({ key: "status", label: getStatusLabel(state.status) });
  }

  const hasActiveFilters = activePills.length > 0;

  return (
    <>
      {/* Sentinel div — sits just above sticky position so IntersectionObserver fires on scroll */}
      <div
        ref={sentinelRef}
        className="h-px w-full"
        aria-hidden="true"
      />

      <div
        className={cn(
          "sticky top-[64px] z-30",
          "bg-[var(--color-bg-surface)] border-b border-[var(--color-border)]",
          "transition-shadow duration-200",
          isStuck ? "shadow-[0_0_20px_var(--color-glow-primary)]" : ""
        )}
      >
        {/* ── Main filter row ── */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] z-10"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                type="search"
                value={state.search}
                onChange={handleSearchChange}
                placeholder="Search members…"
                aria-label="Search members by name, username, or student ID"
                className="pl-9"
              />
            </div>

            {/* Role */}
            <div className="w-full sm:w-36">
              <Select
                value={state.role ?? ""}
                onChange={handleRoleChange}
                aria-label="Filter by role"
                placeholder="All Roles"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Department */}
            <div className="w-full sm:w-44">
              <Select
                value={state.department ?? ""}
                onChange={handleDepartmentChange}
                aria-label="Filter by department"
                placeholder="All Departments"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Session */}
            <div className="w-full sm:w-32">
              <Select
                value={state.session ?? ""}
                onChange={handleSessionChange}
                aria-label="Filter by session"
                placeholder="All Sessions"
              >
                <option value="">All Sessions</option>
                {sessions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>

            {/* Status */}
            <div className="w-full sm:w-36">
              <Select
                value={state.status ?? ""}
                onChange={handleStatusChange}
                aria-label="Filter by status"
                placeholder="All Statuses"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>

            {/* View Toggle */}
            {onViewModeChange && (
              <div
                className="flex items-center gap-1 flex-shrink-0 p-1 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
                role="group"
                aria-label="View mode"
              >
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-md transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                    viewMode === "grid"
                      ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]"
                  )}
                >
                  <LayoutGrid size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-md transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                    viewMode === "list"
                      ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]"
                  )}
                >
                  <List size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Active filter pills ── */}
        {hasActiveFilters && (
          <div
            className="flex flex-wrap items-center gap-2 px-4 pb-3"
            aria-label="Active filters"
          >
            <span className="text-xs text-[var(--color-text-secondary)] flex-shrink-0">
              Filters:
            </span>

            {activePills.map(({ key, label }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
              >
                {label}
                <button
                  type="button"
                  onClick={() => clearFilter(key)}
                  aria-label={`Remove ${label} filter`}
                  className={cn(
                    "flex items-center justify-center rounded-full w-3.5 h-3.5 ml-0.5",
                    "hover:bg-[var(--color-accent)]/20 transition-colors duration-100",
                    "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  )}
                >
                  <X size={10} aria-hidden="true" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={clearAll}
              className={cn(
                "ml-1 text-xs text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-error)] transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
              )}
              aria-label="Clear all filters"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );
}