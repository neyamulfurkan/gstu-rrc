// src/components/admin/ProjectsAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  FolderKanban,
  Tag,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Users,
} from "lucide-react";
import useSWR, { mutate as globalMutate } from "swr";

import { cn, formatDate, cloudinaryUrl } from "@/lib/utils";
import type { ProjectCard } from "@/types/index";
import { Table, Pagination, EmptyState } from "@/components/ui/DataDisplay";
import {
  Badge,
  Spinner,
  Alert,
  Skeleton,
  toast,
} from "@/components/ui/Feedback";
import {
  Modal,
  Drawer,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
} from "@/components/ui/Overlay";

// Dynamically import ProjectForm to keep initial bundle lean
const ProjectForm = dynamic(
  () =>
    import("@/components/admin/forms/ProjectForm").then(
      (m) => m.ProjectForm
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="Loading project form…" />
      </div>
    ),
    ssr: false,
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectRow extends ProjectCard {
  isPublished: boolean;
}

interface CategoryItem {
  id: string;
  name: string;
  color: string;
  _count?: { projects: number };
}

interface ApiListResponse<T> {
  data: T[];
  nextCursor?: string;
  total: number;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message ?? "Request failed");
  }
  return res.json();
}

// ─── Published Toggle ─────────────────────────────────────────────────────────

interface PublishedToggleProps {
  projectId: string;
  isPublished: boolean;
  onToggle: (id: string, next: boolean) => void;
  disabled?: boolean;
}

function PublishedToggle({
  projectId,
  isPublished,
  onToggle,
  disabled = false,
}: PublishedToggleProps): JSX.Element {
  const [optimistic, setOptimistic] = useState(isPublished);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOptimistic(isPublished);
  }, [isPublished]);

  async function handleToggle() {
    if (loading || disabled) return;
    const next = !optimistic;
    setOptimistic(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: next }),
      });
      if (!res.ok) {
        setOptimistic(!next);
        toast("Failed to update publish status", "error");
      } else {
        onToggle(projectId, next);
        toast(`Project ${next ? "published" : "unpublished"}`, "success");
      }
    } catch {
      setOptimistic(!next);
      toast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label={optimistic ? "Unpublish project" : "Publish project"}
      onClick={handleToggle}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex items-center h-5 w-9 rounded-full transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
        "focus:ring-offset-[var(--color-bg-surface)]",
        optimistic
          ? "bg-[var(--color-success)]"
          : "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
        (disabled || loading) && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200",
          optimistic ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" label="Updating…" />
        </span>
      )}
    </button>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteConfirmProps {
  isOpen: boolean;
  projectTitle: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function DeleteConfirmModal({
  isOpen,
  projectTitle,
  onConfirm,
  onClose,
}: DeleteConfirmProps): JSX.Element {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Project"
      size="sm"
    >
      <div className="p-6 space-y-4">
        <Alert
          variant="error"
          message={`Are you sure you want to delete "${projectTitle}"? This action cannot be undone.`}
        />
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
              "hover:bg-[var(--color-bg-elevated)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "bg-[var(--color-error)] text-white",
              "hover:opacity-90 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center gap-2"
            )}
          >
            {loading && <Spinner size="sm" label="Deleting…" />}
            Delete Project
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Categories Sub-Tab ───────────────────────────────────────────────────────

interface CategoryManagerProps {
  categories: CategoryItem[];
  onRefresh: () => void;
}

function CategoryManager({
  categories,
  onRefresh,
}: CategoryManagerProps): JSX.Element {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#00E5FF");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/project-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, color: newColor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Failed to create category");
      } else {
        setNewName("");
        setNewColor("#00E5FF");
        onRefresh();
        toast("Category created", "success");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/project-categories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Failed to delete category");
      } else {
        onRefresh();
        toast("Category deleted", "success");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert
          variant="error"
          message={error}
          dismissible
          onDismiss={() => setError(null)}
        />
      )}

      {/* Add category */}
      <div
        className={cn(
          "rounded-xl border border-[var(--color-border)] p-4",
          "bg-[var(--color-bg-surface)]"
        )}
      >
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
          Add Category
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label
              htmlFor="cat-name"
              className="block text-xs text-[var(--color-text-secondary)] mb-1"
            >
              Name
            </label>
            <input
              id="cat-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="e.g. Robotics, AI, Web"
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "focus:border-[var(--color-accent)]"
              )}
            />
          </div>
          <div>
            <label
              htmlFor="cat-color"
              className="block text-xs text-[var(--color-text-secondary)] mb-1"
            >
              Color
            </label>
            <input
              id="cat-color"
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-14 rounded-lg border border-[var(--color-border)] cursor-pointer bg-transparent"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "bg-[var(--color-primary)] text-white",
              "hover:opacity-90 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center gap-2"
            )}
          >
            {adding ? <Spinner size="sm" label="Adding…" /> : <Plus size={16} />}
            Add
          </button>
        </div>
      </div>

      {/* Category list */}
      <div className="space-y-2">
        {categories.length === 0 ? (
          <EmptyState
            icon="Tag"
            heading="No categories yet"
            description="Add a category above to get started."
          />
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "transition-colors hover:border-[var(--color-border-accent)]"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {cat.name}
                </span>
                {cat._count !== undefined && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {cat._count.projects} projects
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
                aria-label={`Delete category ${cat.name}`}
                className={cn(
                  "p-1.5 rounded-md text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {deletingId === cat.id ? (
                  <Spinner size="sm" label="Deleting…" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ActiveTab = "projects" | "categories";

export function ProjectsAdmin(): JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>("projects");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);

  // Local optimistic published state
  const [publishedOverrides, setPublishedOverrides] = useState<
    Record<string, boolean>
  >({});

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // Build query params
  const projectsKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set("all", "true");
    params.set("take", String(PAGE_SIZE));
    params.set("skip", String((page - 1) * PAGE_SIZE));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
    return `/api/projects?${params.toString()}`;
  }, [debouncedSearch, statusFilter, categoryFilter, page]);

  const {
    data: projectsData,
    error: projectsError,
    isLoading: projectsLoading,
    mutate: mutateProjects,
  } = useSWR<ApiListResponse<ProjectRow>>(projectsKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    mutate: mutateCategories,
  } = useSWR<{ data: CategoryItem[] }>(
    "/api/admin/project-categories",
    fetcher,
    { revalidateOnFocus: false }
  );

  const projects = projectsData?.data ?? [];
  const totalProjects = projectsData?.total ?? 0;
  const totalPages = Math.ceil(totalProjects / PAGE_SIZE);
  const categories = categoriesData?.data ?? [];

  // Merge optimistic overrides
  const displayProjects: ProjectRow[] = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        isPublished:
          publishedOverrides[p.id] !== undefined
            ? publishedOverrides[p.id]
            : p.isPublished,
      })),
    [projects, publishedOverrides]
  );

  const handlePublishedToggle = useCallback(
    (id: string, next: boolean) => {
      setPublishedOverrides((prev) => ({ ...prev, [id]: next }));
    },
    []
  );

  function openEdit(project: ProjectRow) {
    setSelectedProject(project);
    setEditModalOpen(true);
  }

  function openDelete(project: ProjectRow) {
    setSelectedProject(project);
    setDeleteModalOpen(true);
  }

  async function handleDelete() {
    if (!selectedProject) return;
    const res = await fetch(`/api/projects/${selectedProject.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast("Project deleted", "success");
      setDeleteModalOpen(false);
      setSelectedProject(null);
      await mutateProjects();
    } else {
      const data = await res.json().catch(() => ({}));
      toast(data.message ?? "Failed to delete project", "error");
    }
  }

  function handleFormSuccess() {
    setAddModalOpen(false);
    setEditModalOpen(false);
    setSelectedProject(null);
    mutateProjects();
    toast("Project saved", "success");
  }

  const statusBadgeVariant = (status: string) => {
    if (status === "completed") return "success" as const;
    if (status === "ongoing") return "primary" as const;
    return "neutral" as const;
  };

  // Table columns
  const columns = useMemo(
    () => [
      {
        key: "cover",
        header: "Cover",
        width: "64px",
        render: (row: ProjectRow) => (
          <div className="relative w-10 h-10 rounded-md overflow-hidden bg-[var(--color-bg-elevated)] flex-shrink-0">
            {row.coverUrl ? (
              <Image
                src={cloudinaryUrl(row.coverUrl, { width: 80, height: 80 })}
                alt={row.title}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized={row.coverUrl.startsWith("data:")}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)]">
                <FolderKanban size={16} />
              </div>
            )}
          </div>
        ),
      },
      {
        key: "title",
        header: "Title",
        sortable: true,
        render: (row: ProjectRow) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[200px]">
              {row.title}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] font-mono truncate max-w-[200px]">
              {row.slug}
            </p>
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        render: (row: ProjectRow) => (
          <Badge
            variant="neutral"
            size="sm"
            className="whitespace-nowrap"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: row.category?.color ?? "#7B8DB0" }}
            />
            {row.category?.name ?? "—"}
          </Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: ProjectRow) => (
          <Badge variant={statusBadgeVariant(row.status)} size="sm">
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        ),
      },
      {
        key: "year",
        header: "Year",
        sortable: true,
        render: (row: ProjectRow) => (
          <span className="text-sm font-mono text-[var(--color-text-secondary)]">
            {row.year}
          </span>
        ),
      },
      {
        key: "team",
        header: "Team",
        align: "center" as const,
        render: (row: ProjectRow) => (
          <div className="flex items-center justify-center gap-1 text-[var(--color-text-secondary)]">
            <Users size={14} aria-hidden="true" />
            <span className="text-sm">{row.teamMembers?.length ?? 0}</span>
          </div>
        ),
      },
      {
        key: "isPublished",
        header: "Published",
        align: "center" as const,
        render: (row: ProjectRow) => (
          <div className="flex justify-center">
            <PublishedToggle
              projectId={row.id}
              isPublished={
                publishedOverrides[row.id] !== undefined
                  ? publishedOverrides[row.id]
                  : row.isPublished
              }
              onToggle={handlePublishedToggle}
            />
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "48px",
        render: (row: ProjectRow) => (
          <DropdownMenu
            trigger={
              <button
                type="button"
                aria-label="Project actions"
                className={cn(
                  "p-1.5 rounded-md text-[var(--color-text-secondary)]",
                  "hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-colors"
                )}
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="2" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="14" r="1.5" />
                </svg>
              </button>
            }
            align="right"
          >
            <DropdownMenuItem
              icon={<Pencil size={14} aria-hidden="true" />}
              onClick={() => openEdit(row)}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuDivider />
            <DropdownMenuItem
              icon={<Trash2 size={14} aria-hidden="true" />}
              variant="danger"
              onClick={() => openDelete(row)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenu>
        ),
      },
    ],
    [publishedOverrides, handlePublishedToggle]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Projects
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Manage research and development projects
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
            "focus:ring-offset-[var(--color-bg-base)]"
          )}
        >
          <Plus size={16} aria-hidden="true" />
          Add Project
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
        {(["projects", "categories"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset rounded-t-lg",
              activeTab === tab
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
            aria-selected={activeTab === tab}
            role="tab"
          >
            <span className="flex items-center gap-2">
              {tab === "projects" ? (
                <FolderKanban size={15} aria-hidden="true" />
              ) : (
                <Tag size={15} aria-hidden="true" />
              )}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "projects" && totalProjects > 0 && (
                <Badge variant="neutral" size="sm">
                  {totalProjects}
                </Badge>
              )}
            </span>
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Projects Tab */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects…"
                aria-label="Search projects"
                className={cn(
                  "w-full pl-9 pr-9 py-2 rounded-lg text-sm",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "focus:border-[var(--color-accent)]"
                )}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className={cn(
                    "absolute right-2.5 top-1/2 -translate-y-1/2",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                    "focus:outline-none"
                  )}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by status"
                className={cn(
                  "px-3 py-2 rounded-lg text-sm",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                <option value="all">All Statuses</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by category"
                disabled={categoriesLoading}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "disabled:opacity-50"
                )}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Refresh */}
              <button
                type="button"
                onClick={() => mutateProjects()}
                aria-label="Refresh projects list"
                className={cn(
                  "p-2 rounded-lg text-[var(--color-text-secondary)]",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-colors"
                )}
              >
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Error */}
          {projectsError && (
            <Alert
              variant="error"
              message={projectsError.message ?? "Failed to load projects. Please refresh."}
              dismissible
            />
          )}

          {/* Active filters summary */}
          {(statusFilter !== "all" || categoryFilter !== "all" || debouncedSearch) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Active filters:
              </span>
              {debouncedSearch && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                    "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
                    "hover:bg-[var(--color-primary)]/20 transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  )}
                >
                  Search: {debouncedSearch}
                  <X size={10} aria-hidden="true" />
                </button>
              )}
              {statusFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                    "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
                    "hover:bg-[var(--color-primary)]/20 transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  )}
                >
                  Status: {statusFilter}
                  <X size={10} aria-hidden="true" />
                </button>
              )}
              {categoryFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                    "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
                    "hover:bg-[var(--color-primary)]/20 transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  )}
                >
                  Category: {categories.find((c) => c.id === categoryFilter)?.name ?? categoryFilter}
                  <X size={10} aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* Table */}
          <Table
            columns={columns}
            data={displayProjects}
            loading={projectsLoading}
            skeletonRows={10}
            striped
            emptyMessage="No projects found. Try adjusting your filters."
            rowKey={(row) => row.id}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, totalProjects)} of {totalProjects} projects
              </p>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div>
          {categoriesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={48} className="w-full" rounded="lg" />
              ))}
            </div>
          ) : (
            <CategoryManager
              categories={categories}
              onRefresh={() => mutateCategories()}
            />
          )}
        </div>
      )}

      {/* Add Project Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Project"
        size="full"
      >
        <div className="p-6">
          <ProjectForm
            categories={categories}
            onSubmit={async (data) => {
              const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as { error?: string }).error ?? "Failed to create project");
              }
              handleFormSuccess();
            }}
            onClose={() => setAddModalOpen(false)}
          />
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedProject(null);
        }}
        title="Edit Project"
        size="full"
      >
        <div className="p-6">
          {selectedProject && (
            <ProjectForm
              initialData={selectedProject}
              categories={categories}
              onSubmit={async (data) => {
                const res = await fetch(`/api/projects/${selectedProject.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error((err as { error?: string }).error ?? "Failed to update project");
                }
                handleFormSuccess();
              }}
              onClose={() => {
                setEditModalOpen(false);
                setSelectedProject(null);
              }}
            />
          )}
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      {selectedProject && (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          projectTitle={selectedProject.title}
          onConfirm={handleDelete}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
}