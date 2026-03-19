// src/components/admin/AuditLogAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import {
  Download,
  Filter,
  Search,
  X,
  User,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { cn, formatDate } from "@/lib/utils";
import { Table, Pagination, EmptyState } from "@/components/ui/DataDisplay";
import {
  Badge,
  Spinner,
  Skeleton,
  Alert,
} from "@/components/ui/Feedback";
import type { BadgeVariant } from "@/types/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  actionType: string;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
  admin: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    adminRole?: {
      name: string;
    } | null;
  };
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

interface FilterState {
  adminSearch: string;
  actionTypes: string[];
  fromDate: string;
  toDate: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_TYPES = [
  { value: "create", label: "Create" },
  { value: "edit", label: "Edit" },
  { value: "delete", label: "Delete" },
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "login", label: "Login" },
  { value: "config_change", label: "Config Change" },
] as const;

const ACTION_TYPE_VARIANTS: Record<string, BadgeVariant> = {
  create: "success",
  edit: "primary",
  delete: "error",
  approve: "success",
  reject: "warning",
  login: "neutral",
  config_change: "accent",
};

const ENTITY_SECTION_MAP: Record<string, string> = {
  member: "members",
  event: "events",
  project: "projects",
  gallery: "gallery",
  announcement: "announcements",
  instrument: "instruments",
  certificate: "certifications",
  application: "applications",
  committee: "committee",
  role: "roles",
  config: "club-config",
  feed: "feed",
};

const PAGE_SIZE = 25;

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = async (url: string): Promise<AuditLogResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message ?? "Failed to fetch audit logs");
  }
  return res.json() as Promise<AuditLogResponse>;
};

// ─── Helper: build query string ───────────────────────────────────────────────

function buildQuery(
  filters: FilterState,
  page: number
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("take", String(PAGE_SIZE));
  if (filters.adminSearch.trim()) {
    params.set("adminSearch", filters.adminSearch.trim());
  }
  if (filters.actionTypes.length > 0) {
    params.set("actionTypes", filters.actionTypes.join(","));
  }
  if (filters.fromDate) {
    params.set("fromDate", filters.fromDate);
  }
  if (filters.toDate) {
    params.set("toDate", filters.toDate);
  }
  return params.toString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AdminCellProps {
  admin: AuditLogEntry["admin"];
}

function AdminCell({ admin }: AdminCellProps): JSX.Element {
  return (
    <Link
      href={`/admin/members?highlight=${admin.id}`}
      className="inline-flex items-center gap-2 group"
    >
      <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
        {admin.avatarUrl ? (
          <Image
            src={admin.avatarUrl}
            alt={admin.fullName}
            fill
            className="object-cover"
            sizes="32px"
            unoptimized={admin.avatarUrl.startsWith("data:")}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User size={14} className="text-[var(--color-text-secondary)]" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent)] transition-colors">
          {admin.fullName}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] truncate">
          @{admin.username}
        </p>
      </div>
    </Link>
  );
}

interface RoleCellProps {
  roleName?: string | null;
}

function RoleCell({ roleName }: RoleCellProps): JSX.Element {
  if (!roleName) {
    return (
      <span className="text-xs text-[var(--color-text-secondary)] italic">
        No role
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Shield size={12} className="text-[var(--color-accent)]" aria-hidden="true" />
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">
        {roleName}
      </span>
    </span>
  );
}

interface ActionTypeCellProps {
  actionType: string;
}

function ActionTypeCell({ actionType }: ActionTypeCellProps): JSX.Element {
  const variant: BadgeVariant = ACTION_TYPE_VARIANTS[actionType] ?? "neutral";
  const label =
    ACTION_TYPES.find((a) => a.value === actionType)?.label ??
    actionType.replace(/_/g, " ");

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

interface EntityCellProps {
  entityType?: string | null;
  entityId?: string | null;
}

function EntityCell({ entityType, entityId }: EntityCellProps): JSX.Element {
  if (!entityType && !entityId) {
    return <span className="text-xs text-[var(--color-text-secondary)]">—</span>;
  }

  const section = entityType ? ENTITY_SECTION_MAP[entityType.toLowerCase()] : null;

  const display = (
    <span className="text-xs font-mono text-[var(--color-text-secondary)]">
      {entityType && (
        <span className="font-medium text-[var(--color-text-primary)]">
          {entityType}
        </span>
      )}
      {entityType && entityId && <span className="mx-1">/</span>}
      {entityId && (
        <span className="text-[var(--color-text-secondary)]">
          {entityId.length > 12 ? `${entityId.slice(0, 8)}…` : entityId}
        </span>
      )}
    </span>
  );

  if (section) {
    return (
      <Link
        href={`/admin/${section}`}
        className="hover:text-[var(--color-accent)] transition-colors"
        title={`${entityType ?? ""}${entityId ? ` / ${entityId}` : ""}`}
      >
        {display}
      </Link>
    );
  }

  return <span title={`${entityType ?? ""}${entityId ? ` / ${entityId}` : ""}`}>{display}</span>;
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
}

function FilterPanel({
  filters,
  onFiltersChange,
  onReset,
}: FilterPanelProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeFilterCount =
    (filters.adminSearch.trim() ? 1 : 0) +
    filters.actionTypes.length +
    (filters.fromDate ? 1 : 0) +
    (filters.toDate ? 1 : 0);

  const toggleActionType = useCallback(
    (value: string) => {
      const next = filters.actionTypes.includes(value)
        ? filters.actionTypes.filter((v) => v !== value)
        : [...filters.actionTypes, value];
      onFiltersChange({ ...filters, actionTypes: next });
    },
    [filters, onFiltersChange]
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
          "border transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
          open || activeFilterCount > 0
            ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10"
            : "border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)]"
        )}
      >
        <Filter size={15} aria-hidden="true" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <Badge variant="accent" size="sm">
            {activeFilterCount}
          </Badge>
        )}
        {open ? (
          <ChevronUp size={14} aria-hidden="true" />
        ) : (
          <ChevronDown size={14} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-80 z-30 rounded-xl border border-[var(--color-border)]",
            "bg-[var(--color-bg-elevated)] shadow-lg p-4 space-y-4"
          )}
        >
          {/* Admin search */}
          <div>
            <label
              htmlFor="audit-admin-search"
              className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5"
            >
              Admin Name
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                aria-hidden="true"
              />
              <input
                id="audit-admin-search"
                type="text"
                value={filters.adminSearch}
                onChange={(e) =>
                  onFiltersChange({ ...filters, adminSearch: e.target.value })
                }
                placeholder="Search by name…"
                className={cn(
                  "w-full pl-8 pr-3 py-2 text-sm rounded-lg",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
                  "transition-colors duration-150"
                )}
              />
            </div>
          </div>

          {/* Action types */}
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              Action Types
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ACTION_TYPES.map((action) => {
                const checked = filters.actionTypes.includes(action.value);
                const variant: BadgeVariant =
                  ACTION_TYPE_VARIANTS[action.value] ?? "neutral";
                return (
                  <label
                    key={action.value}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer",
                      "border transition-colors duration-150",
                      "focus-within:ring-2 focus-within:ring-[var(--color-accent)]",
                      checked
                        ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5"
                        : "border-[var(--color-border)] hover:bg-[var(--color-bg-surface)]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleActionType(action.value)}
                      className="sr-only"
                      aria-label={`Filter by ${action.label}`}
                    />
                    <div
                      className={cn(
                        "w-4 h-4 rounded flex items-center justify-center flex-shrink-0",
                        "border-2 transition-colors duration-150",
                        checked
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                          : "border-[var(--color-border)] bg-transparent"
                      )}
                      aria-hidden="true"
                    >
                      {checked && (
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="var(--color-text-inverse)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <Badge variant={variant} size="sm">
                      {action.label}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="audit-from-date"
                className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5"
              >
                From
              </label>
              <input
                id="audit-from-date"
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  onFiltersChange({ ...filters, fromDate: e.target.value })
                }
                max={filters.toDate || undefined}
                className={cn(
                  "w-full px-2.5 py-2 text-sm rounded-lg",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
                  "transition-colors duration-150"
                )}
              />
            </div>
            <div>
              <label
                htmlFor="audit-to-date"
                className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5"
              >
                To
              </label>
              <input
                id="audit-to-date"
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  onFiltersChange({ ...filters, toDate: e.target.value })
                }
                min={filters.fromDate || undefined}
                className={cn(
                  "w-full px-2.5 py-2 text-sm rounded-lg",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
                  "transition-colors duration-150"
                )}
              />
            </div>
          </div>

          {/* Actions */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                "border border-[var(--color-error)]/30 text-[var(--color-error)]",
                "hover:bg-[var(--color-error)]/10 transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
              )}
            >
              <X size={14} aria-hidden="true" />
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Active Filter Pills ──────────────────────────────────────────────────────

interface ActiveFilterPillsProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

function ActiveFilterPills({ filters, onFiltersChange }: ActiveFilterPillsProps): JSX.Element | null {
  const pills: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.adminSearch.trim()) {
    pills.push({
      key: "adminSearch",
      label: `Admin: "${filters.adminSearch.trim()}"`,
      onRemove: () => onFiltersChange({ ...filters, adminSearch: "" }),
    });
  }

  filters.actionTypes.forEach((type) => {
    const label = ACTION_TYPES.find((a) => a.value === type)?.label ?? type;
    pills.push({
      key: `actionType-${type}`,
      label,
      onRemove: () =>
        onFiltersChange({
          ...filters,
          actionTypes: filters.actionTypes.filter((v) => v !== type),
        }),
    });
  });

  if (filters.fromDate) {
    pills.push({
      key: "fromDate",
      label: `From: ${filters.fromDate}`,
      onRemove: () => onFiltersChange({ ...filters, fromDate: "" }),
    });
  }

  if (filters.toDate) {
    pills.push({
      key: "toDate",
      label: `To: ${filters.toDate}`,
      onRemove: () => onFiltersChange({ ...filters, toDate: "" }),
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Active filters">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
            "text-[var(--color-text-secondary)]"
          )}
        >
          {pill.label}
          <button
            type="button"
            onClick={pill.onRemove}
            aria-label={`Remove filter: ${pill.label}`}
            className={cn(
              "rounded-full hover:text-[var(--color-text-primary)] transition-colors",
              "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            )}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AuditLogAdmin(): JSX.Element {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    adminSearch: "",
    actionTypes: [],
    fromDate: "",
    toDate: "",
  });
  const [debouncedAdminSearch, setDebouncedAdminSearch] = useState(
    filters.adminSearch
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce admin search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedAdminSearch(filters.adminSearch);
      setPage(1);
    }, 350);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [filters.adminSearch]);

  // Reset page when non-debounced filters change
  useEffect(() => {
    setPage(1);
  }, [filters.actionTypes, filters.fromDate, filters.toDate]);

  const effectiveFilters = useMemo<FilterState>(
    () => ({ ...filters, adminSearch: debouncedAdminSearch }),
    [filters, debouncedAdminSearch]
  );

  const query = useMemo(
    () => buildQuery(effectiveFilters, page),
    [effectiveFilters, page]
  );

  const { data, error, isLoading } = useSWR<AuditLogResponse>(
    `/api/admin/audit-log?${query}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({ adminSearch: "", actionTypes: [], fromDate: "", toDate: "" });
    setDebouncedAdminSearch("");
    setPage(1);
  }, []);

  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);

    const exportParams = new URLSearchParams();
    exportParams.set("type", "audit-log");
    if (effectiveFilters.adminSearch) {
      exportParams.set("adminSearch", effectiveFilters.adminSearch);
    }
    if (effectiveFilters.actionTypes.length > 0) {
      exportParams.set("actionTypes", effectiveFilters.actionTypes.join(","));
    }
    if (effectiveFilters.fromDate) {
      exportParams.set("fromDate", effectiveFilters.fromDate);
    }
    if (effectiveFilters.toDate) {
      exportParams.set("toDate", effectiveFilters.toDate);
    }

    try {
      const res = await fetch(
        `/api/admin/export?${exportParams.toString()}`,
        { method: "GET" }
      );

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ message: "Export failed" }));
        throw new Error(
          (errData as { message?: string }).message ?? "Export failed"
        );
      }

      const blob = await res.blob();
      const csvBlob = new Blob([blob], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(csvBlob);

      const today = new Date().toISOString().slice(0, 10);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit-log-${today}.csv`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to export CSV";
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  }, [effectiveFilters]);

  // Table skeleton rows
  const skeletonData = useMemo(
    () =>
      Array.from({ length: PAGE_SIZE }, (_, i) => ({
        _id: String(i),
      })) as Record<string, unknown>[],
    []
  );

  const tableData = useMemo((): Record<string, unknown>[] => {
    if (!data?.data) return [];
    return data.data as unknown as Record<string, unknown>[];
  }, [data]);

  const columns = useMemo(
    () => [
      {
        key: "createdAt",
        header: "Timestamp",
        width: "180px",
        render: (row: Record<string, unknown>) => {
          const entry = row as unknown as AuditLogEntry;
          return (
            <time
              dateTime={
                entry.createdAt instanceof Date
                  ? entry.createdAt.toISOString()
                  : String(entry.createdAt)
              }
              className="text-xs font-mono text-[var(--color-text-secondary)] whitespace-nowrap"
              title={formatDate(entry.createdAt, "full")}
            >
              {formatDate(entry.createdAt, "full")}
            </time>
          );
        },
      },
      {
        key: "admin",
        header: "Admin",
        width: "200px",
        render: (row: Record<string, unknown>) => {
          const entry = row as unknown as AuditLogEntry;
          return <AdminCell admin={entry.admin} />;
        },
      },
      {
        key: "adminRole",
        header: "Role",
        width: "140px",
        render: (row: Record<string, unknown>) => {
          const entry = row as unknown as AuditLogEntry;
          return <RoleCell roleName={entry.admin.adminRole?.name} />;
        },
      },
      {
        key: "actionType",
        header: "Action",
        width: "130px",
        render: (row: Record<string, unknown>) => {
          const entry = row as unknown as AuditLogEntry;
          return <ActionTypeCell actionType={entry.actionType} />;
        },
      },
      {
        key: "description",
        header: "Description",
        render: (row: Record<string, unknown>) => {
          const entry = row as unknown as AuditLogEntry;
          return (
            <span className="text-sm text-[var(--color-text-primary)] leading-5">
              {entry.description}
            </span>
          );
        },
      },
      {
        key: "entity",
        header: "Entity",
        width: "160px",
        render: (row: Record<string, unknown>) => {
          const entry = row as unknown as AuditLogEntry;
          return (
            <EntityCell
              entityType={entry.entityType}
              entityId={entry.entityId}
            />
          );
        },
      },
      {
        key: "ipAddress",
        header: "IP Address",
        width: "130px",
        render: (row: Record<string, unknown>) => {
          const entry = row as unknown as AuditLogEntry;
          return entry.ipAddress ? (
            <span className="text-xs font-mono text-[var(--color-text-secondary)]">
              {entry.ipAddress}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-text-secondary)]">—</span>
          );
        },
      },
    ],
    []
  );

  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Audit Log
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Read-only record of all admin actions
            {!isLoading && data && (
              <span className="ml-2 font-medium text-[var(--color-text-primary)]">
                ({totalCount.toLocaleString()} total)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FilterPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleReset}
          />
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting || isLoading || totalCount === 0}
            aria-label="Export audit log as CSV"
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
              "border border-[var(--color-border)] transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              isExporting || isLoading || totalCount === 0
                ? "opacity-50 cursor-not-allowed text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)]"
                : "text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {isExporting ? (
              <Spinner size="sm" label="Exporting…" />
            ) : (
              <Download size={15} aria-hidden="true" />
            )}
            <span>{isExporting ? "Exporting…" : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Export error */}
      {exportError && (
        <Alert
          variant="error"
          title="Export Failed"
          message={exportError}
          dismissible
          onDismiss={() => setExportError(null)}
        />
      )}

      {/* Active filter pills */}
      <ActiveFilterPills
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Fetch error */}
      {error && !isLoading && (
        <Alert
          variant="error"
          title="Failed to load audit logs"
          message={
            error instanceof Error
              ? error.message
              : "An unexpected error occurred. Please try again."
          }
        />
      )}

      {/* Table */}
      {isLoading && !data ? (
        // Initial skeleton
        <div className="w-full overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full min-w-full border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)]">
                {["Timestamp", "Admin", "Role", "Action", "Description", "Entity", "IP Address"].map(
                  (header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] text-left"
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, idx) => (
                <tr
                  key={`skel-${idx}`}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <Skeleton height={14} className="w-36" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Skeleton height={32} className="w-8 rounded-full flex-shrink-0" rounded="full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton height={12} className="w-24" />
                        <Skeleton height={10} className="w-16" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton height={14} className="w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton height={20} className="w-20 rounded-full" rounded="full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton height={14} className="w-48" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton height={14} className="w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton height={14} className="w-24" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !error && tableData.length === 0 ? (
        <EmptyState
          icon="ClipboardList"
          heading="No audit log entries"
          description={
            filters.adminSearch ||
            filters.actionTypes.length > 0 ||
            filters.fromDate ||
            filters.toDate
              ? "No entries match your current filters. Try adjusting or clearing them."
              : "Admin actions will be recorded here as they occur."
          }
          action={
            filters.adminSearch ||
            filters.actionTypes.length > 0 ||
            filters.fromDate ||
            filters.toDate
              ? { label: "Clear filters", onClick: handleReset }
              : undefined
          }
        />
      ) : (
        <div className="relative">
          {/* Loading overlay for paginating */}
          {isLoading && data && (
            <div
              className="absolute inset-0 z-10 flex items-start justify-center pt-16 bg-[var(--color-bg-base)]/60 rounded-lg"
              aria-live="polite"
              aria-label="Loading results"
            >
              <Spinner size="lg" label="Loading…" />
            </div>
          )}

          <Table
            columns={columns}
            data={tableData}
            striped
            loading={false}
            emptyMessage="No audit log entries found."
            rowKey={(row) => (row as unknown as AuditLogEntry).id}
            className={isLoading && data ? "opacity-60" : undefined}
          />
        </div>
      )}

      {/* Pagination */}
      {!error && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-text-secondary)] order-2 sm:order-1">
            Showing{" "}
            <span className="font-medium text-[var(--color-text-primary)]">
              {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}–
              {Math.min(page * PAGE_SIZE, totalCount)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[var(--color-text-primary)]">
              {totalCount.toLocaleString()}
            </span>{" "}
            entries
          </p>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="order-1 sm:order-2"
          />
        </div>
      )}
    </div>
  );
}