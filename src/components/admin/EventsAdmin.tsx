// src/components/admin/EventsAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  Calendar,
  ChevronDown,
  Edit2,
  Eye,
  Images,
  Plus,
  Tag,
  Trash2,
  X,
  Check,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import useSWR, { mutate as globalMutate } from "swr";
import dynamic from "next/dynamic";

import type { EventCard, GalleryItemCard } from "@/types/index";
import { formatDate, cn } from "@/lib/utils";
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

// Dynamically import EventForm to keep initial bundle lean
const EventForm = dynamic(
  () =>
    import("@/components/admin/forms/EventForm").then((m) => ({
      default: m.EventForm,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={40} className="w-full" />
        ))}
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventCategory {
  id: string;
  name: string;
  color: string;
}

interface AdminEvent extends EventCard {
  _count?: { attendees: number };
  isPublished: boolean;
}

type AdminView = "events" | "categories";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventStatus(event: EventCard): {
  label: string;
  variant: "success" | "warning" | "neutral" | "primary";
} {
  const now = Date.now();
  const start = new Date(event.startDate).getTime();
  const end = event.endDate ? new Date(event.endDate).getTime() : null;

  if (end !== null && now >= start && now <= end) {
    return { label: "Ongoing", variant: "success" };
  }
  if (now < start) {
    return { label: "Upcoming", variant: "primary" };
  }
  return { label: "Past", variant: "neutral" };
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

// ─── EventFormWithCategories ─────────────────────────────────────────────────

interface EventFormWithCategoriesProps {
  initialData?: Partial<import("@/types/index").EventDetail>;
  onSubmit: (data: import("@/lib/validations").EventSchemaInput & { coverUrl?: string }) => Promise<void>;
  onClose: () => void;
}

function EventFormWithCategories({
  initialData,
  onSubmit,
  onClose,
}: EventFormWithCategoriesProps): JSX.Element {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    setCategoriesLoading(true);
    fetch("/api/admin/event-categories")
      .then((r) => r.json())
      .then((json: { data?: EventCategory[] }) => {
        if (Array.isArray(json.data)) setCategories(json.data);
      })
      .catch(() => {})
      .finally(() => setCategoriesLoading(false));
  }, []);

  if (categoriesLoading) {
    return (
      <div className="p-8 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={40} className="w-full" />
        ))}
      </div>
    );
  }

  return (
    <EventForm
      initialData={initialData}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}

// ─── PublishedToggle ──────────────────────────────────────────────────────────

interface PublishedToggleProps {
  eventId: string;
  isPublished: boolean;
  onToggled: (id: string, next: boolean) => void;
}

function PublishedToggle({ eventId, isPublished, onToggled }: PublishedToggleProps) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      if (!res.ok) throw new Error("Failed to update event");
      onToggled(eventId, !isPublished);
      toast(
        !isPublished ? "Event published" : "Event unpublished",
        !isPublished ? "success" : "info"
      );
    } catch {
      toast("Failed to update publish status", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPublished}
      aria-label={isPublished ? "Unpublish event" : "Publish event"}
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent transition-colors duration-200 ease-in-out",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1",
        "focus:ring-offset-[var(--color-bg-elevated)]",
        isPublished
          ? "bg-[var(--color-success)]"
          : "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
        loading && "opacity-60 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full",
          "bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
          isPublished ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  eventTitle: string;
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  eventTitle,
}: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Event" size="sm">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-primary)] font-medium">
              Are you sure you want to delete this event?
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              &ldquo;{eventTitle}&rdquo; will be permanently deleted. This action cannot
              be undone.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "hover:bg-[var(--color-bg-surface)] transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-[var(--color-error)] text-white",
              "hover:opacity-90 active:scale-95 transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] focus:ring-offset-2",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            )}
          >
            {deleting && <Spinner size="sm" />}
            Delete Event
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── EventGalleryDrawer ───────────────────────────────────────────────────────

interface EventGalleryDrawerProps {
  eventId: string | null;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

function EventGalleryDrawer({
  eventId,
  eventTitle,
  isOpen,
  onClose,
}: EventGalleryDrawerProps) {
  const { data, error, mutate } = useSWR<{ data: GalleryItemCard[] }>(
    eventId && isOpen ? `/api/gallery?eventId=${eventId}&status=all&take=50` : null,
    fetcher
  );

  const items = data?.data ?? [];
  const loading = !data && !error && isOpen && !!eventId;

  async function handleApprove(itemId: string) {
    try {
      const res = await fetch(`/api/gallery/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      toast("Gallery item approved", "success");
      mutate();
    } catch {
      toast("Failed to approve gallery item", "error");
    }
  }

  async function handleReject(itemId: string) {
    try {
      const res = await fetch(`/api/gallery/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      toast("Gallery item rejected", "info");
      mutate();
    } catch {
      toast("Failed to reject gallery item", "error");
    }
  }

  async function handleDelete(itemId: string) {
    try {
      const res = await fetch(`/api/gallery/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast("Gallery item deleted", "success");
      mutate();
    } catch {
      toast("Failed to delete gallery item", "error");
    }
  }

  const statusVariant = (status: string): "success" | "warning" | "error" | "neutral" => {
    if (status === "approved") return "success";
    if (status === "pending") return "warning";
    if (status === "rejected") return "error";
    return "neutral";
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Gallery — ${eventTitle}`}
      side="right"
      width="560px"
    >
      <div className="p-4 h-full overflow-y-auto">
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={160} className="w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <Alert
            variant="error"
            message="Failed to load gallery items. Please try again."
            className="mb-4"
          />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon="Images"
            heading="No Gallery Items"
            description="No images or videos have been tagged to this event yet."
          />
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => {
              const status = (item as GalleryItemCard & { status?: string }).status ?? "approved";
              return (
                <div
                  key={item.id}
                  className={cn(
                    "relative rounded-xl overflow-hidden border",
                    "bg-[var(--color-bg-surface)] border-[var(--color-border)]",
                    "group"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative h-32 bg-[var(--color-bg-elevated)]">
                    {item.type === "image" ? (
                      <Image
                        src={item.url}
                        alt={item.altText || item.title || "Gallery item"}
                        fill
                        className="object-cover"
                        sizes="240px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon
                          className="w-8 h-8 text-[var(--color-text-secondary)]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    {item.title && (
                      <p className="text-xs font-medium text-[var(--color-text-primary)] truncate mb-1">
                        {item.title}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-1">
                      <Badge
                        variant={statusVariant(status) as "success" | "warning" | "error" | "neutral" | "primary" | "accent"}
                        size="sm"
                      >
                        {status}
                      </Badge>

                      <div className="flex items-center gap-1">
                        {status !== "approved" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(item.id)}
                            aria-label="Approve item"
                            className={cn(
                              "p-1 rounded text-[var(--color-success)]",
                              "hover:bg-[var(--color-success)]/10 transition-colors",
                              "focus:outline-none focus:ring-2 focus:ring-[var(--color-success)]"
                            )}
                          >
                            <Check size={12} />
                          </button>
                        )}
                        {status !== "rejected" && (
                          <button
                            type="button"
                            onClick={() => handleReject(item.id)}
                            aria-label="Reject item"
                            className={cn(
                              "p-1 rounded text-[var(--color-warning)]",
                              "hover:bg-[var(--color-warning)]/10 transition-colors",
                              "focus:outline-none focus:ring-2 focus:ring-[var(--color-warning)]"
                            )}
                          >
                            <X size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          aria-label="Delete item"
                          className={cn(
                            "p-1 rounded text-[var(--color-error)]",
                            "hover:bg-[var(--color-error)]/10 transition-colors",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
                          )}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
}

// ─── CategoryManager ──────────────────────────────────────────────────────────

function CategoryManager() {
  const { data, error, mutate } = useSWR<{ data: EventCategory[] }>(
    "/api/admin/event-categories",
    fetcher
  );

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#0050FF");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#0050FF");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = data?.data ?? [];
  const loading = !data && !error;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/event-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      toast("Category created", "success");
      setNewName("");
      setNewColor("#0050FF");
      mutate();
    } catch {
      toast("Failed to create category", "error");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(cat: EventCategory) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  }

  async function handleEdit(catId: string) {
    if (!editName.trim()) return;
    try {
      const res = await fetch("/api/admin/event-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: catId, name: editName.trim(), color: editColor }),
      });
      if (!res.ok) throw new Error("Failed to update category");
      toast("Category updated", "success");
      setEditingId(null);
      mutate();
    } catch {
      toast("Failed to update category", "error");
    }
  }

  async function handleDelete(catId: string) {
    setDeletingId(catId);
    try {
      const res = await fetch("/api/admin/event-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: catId }),
      });
      if (!res.ok) throw new Error("Failed to delete category");
      toast("Category deleted", "success");
      mutate();
    } catch {
      toast("Failed to delete category", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Category Form */}
      <div
        className={cn(
          "rounded-xl border border-[var(--color-border)] p-4",
          "bg-[var(--color-bg-surface)]"
        )}
      >
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
          Add New Category
        </h3>
        <form onSubmit={handleAdd} className="flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="cat-name"
              className="block text-xs text-[var(--color-text-secondary)] mb-1"
            >
              Category Name
            </label>
            <input
              id="cat-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Workshop, Seminar"
              required
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "focus:border-[var(--color-accent)] transition-colors"
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
              className={cn(
                "h-9 w-14 rounded-lg cursor-pointer border border-[var(--color-border)]",
                "bg-[var(--color-bg-elevated)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-[var(--color-primary)] text-white",
              "hover:opacity-90 active:scale-95 transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            )}
          >
            {adding ? <Spinner size="sm" /> : <Plus size={14} />}
            Add
          </button>
        </form>
      </div>

      {/* Category List */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={52} className="w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <Alert
          variant="error"
          message="Failed to load categories."
          className="mb-4"
        />
      )}

      {!loading && !error && categories.length === 0 && (
        <EmptyState
          icon="Tag"
          heading="No Categories"
          description="Add your first event category above."
        />
      )}

      {!loading && categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            const isDeleting = deletingId === cat.id;

            return (
              <div
                key={cat.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border",
                  "bg-[var(--color-bg-surface)] border-[var(--color-border)]",
                  "transition-colors duration-150"
                )}
              >
                {/* Color swatch */}
                <div
                  className="w-4 h-4 rounded-full shrink-0 border border-white/10"
                  style={{ backgroundColor: isEditing ? editColor : cat.color }}
                  aria-hidden="true"
                />

                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      className={cn(
                        "flex-1 px-2 py-1 rounded text-sm",
                        "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                        "text-[var(--color-text-primary)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      )}
                    />
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-7 w-10 rounded cursor-pointer border border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleEdit(cat.id)}
                      aria-label="Save category"
                      className={cn(
                        "p-1.5 rounded text-[var(--color-success)]",
                        "hover:bg-[var(--color-success)]/10 transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-success)]"
                      )}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel edit"
                      className={cn(
                        "p-1.5 rounded text-[var(--color-text-secondary)]",
                        "hover:bg-[var(--color-bg-elevated)] transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      )}
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">
                      {cat.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      aria-label={`Edit ${cat.name}`}
                      className={cn(
                        "p-1.5 rounded text-[var(--color-text-secondary)]",
                        "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
                        "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      )}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      disabled={isDeleting}
                      aria-label={`Delete ${cat.name}`}
                      className={cn(
                        "p-1.5 rounded text-[var(--color-error)]",
                        "hover:bg-[var(--color-error)]/10 transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
                        "disabled:opacity-40 disabled:cursor-not-allowed"
                      )}
                    >
                      {isDeleting ? <Spinner size="sm" /> : <Trash2 size={13} />}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── EventsAdmin ──────────────────────────────────────────────────────────────

const EVENTS_PER_PAGE = 25;

export function EventsAdmin(): JSX.Element {
  const [view, setView] = useState<AdminView>("events");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Delete state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<AdminEvent | null>(null);

  // Gallery drawer state
  const [galleryEventId, setGalleryEventId] = useState<string | null>(null);
  const [galleryEventTitle, setGalleryEventTitle] = useState("");
  const [galleryDrawerOpen, setGalleryDrawerOpen] = useState(false);

  // SWR
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({ all: "true", take: String(EVENTS_PER_PAGE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    params.set("skip", String((page - 1) * EVENTS_PER_PAGE));
    return `/api/events?${params.toString()}`;
  }, [debouncedSearch, page]);

  const { data, error, mutate } = useSWR<{
    data: AdminEvent[];
    total: number;
    nextCursor?: string;
  }>(apiUrl, fetcher);

  const events = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / EVENTS_PER_PAGE));
  const loading = !data && !error;

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search]);

  // Local optimistic update for publish toggle
  const handlePublishToggled = useCallback(
    (id: string, next: boolean) => {
      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((ev) =>
              ev.id === id ? { ...ev, isPublished: next } : ev
            ),
          };
        },
        { revalidate: false }
      );
    },
    [mutate]
  );

  function openAddModal() {
    setEditingEventId(null);
    setFormModalOpen(true);
  }

  function openEditModal(eventId: string) {
    setEditingEventId(eventId);
    setFormModalOpen(true);
  }

  function openGallery(event: AdminEvent) {
    setGalleryEventId(event.id);
    setGalleryEventTitle(event.title);
    setGalleryDrawerOpen(true);
  }

  function openDeleteModal(event: AdminEvent) {
    setDeletingEvent(event);
    setDeleteModalOpen(true);
  }

  async function handleDelete(): Promise<void> {
    if (!deletingEvent) return;
    const res = await fetch(`/api/events/${deletingEvent.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast("Failed to delete event", "error");
      throw new Error("Delete failed");
    }
    toast("Event deleted", "success");
    mutate();
    setDeletingEvent(null);
  }

  function handleFormSuccess() {
    setFormModalOpen(false);
    setEditingEventId(null);
    mutate();
    toast(
      editingEventId ? "Event updated successfully" : "Event created successfully",
      "success"
    );
  }

  // Table columns
  const columns = useMemo(
    () => [
      {
        key: "cover",
        header: "Cover",
        width: "72px",
        render: (row: AdminEvent) => (
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--color-bg-elevated)] shrink-0 relative">
            {row.coverUrl ? (
              <Image
                src={row.coverUrl}
                alt={row.title}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar
                  size={16}
                  className="text-[var(--color-text-secondary)]"
                />
              </div>
            )}
          </div>
        ),
      },
      {
        key: "title",
        header: "Title",
        sortable: true,
        render: (row: AdminEvent) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[260px]">
              {row.title}
            </p>
            {row.venue && (
              <p className="text-xs text-[var(--color-text-secondary)] truncate max-w-[260px] mt-0.5">
                {row.venue}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        render: (row: AdminEvent) => (
          <Badge
            variant="primary"
            size="sm"
            className="whitespace-nowrap"
            style={{ color: row.category.color, borderColor: `${row.category.color}30`, backgroundColor: `${row.category.color}15` } as React.CSSProperties}
          >
            {row.category.name}
          </Badge>
        ),
      },
      {
        key: "startDate",
        header: "Date",
        sortable: true,
        render: (row: AdminEvent) => (
          <span className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
            {formatDate(row.startDate, "short")}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: AdminEvent) => {
          const { label, variant } = getEventStatus(row);
          return (
            <Badge variant={variant} size="sm">
              {label}
            </Badge>
          );
        },
      },
      {
        key: "isPublished",
        header: "Published",
        align: "center" as const,
        render: (row: AdminEvent) => (
          <div className="flex justify-center">
            <PublishedToggle
              eventId={row.id}
              isPublished={row.isPublished}
              onToggled={handlePublishToggled}
            />
          </div>
        ),
      },
      {
        key: "registrations",
        header: "Attendees",
        align: "center" as const,
        render: (row: AdminEvent) => (
          <span className="text-sm text-[var(--color-text-secondary)] tabular-nums">
            {row._count?.attendees ?? 0}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "48px",
        align: "right" as const,
        render: (row: AdminEvent) => (
          <DropdownMenu
            trigger={
              <button
                type="button"
                aria-label="Event actions"
                className={cn(
                  "p-1.5 rounded-lg text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-colors duration-150"
                )}
              >
                <ChevronDown size={16} />
              </button>
            }
            align="right"
          >
            <DropdownMenuItem
              icon={<Edit2 size={14} />}
              onClick={() => openEditModal(row.id)}
            >
              Edit Event
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={<Images size={14} />}
              onClick={() => openGallery(row)}
            >
              View Gallery
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={<Eye size={14} />}
              onClick={() => {
                window.open(`/events/${row.slug}`, "_blank", "noopener,noreferrer");
              }}
            >
              View Public Page
            </DropdownMenuItem>
            <DropdownMenuDivider />
            <DropdownMenuItem
              icon={<Trash2 size={14} />}
              variant="danger"
              onClick={() => openDeleteModal(row)}
            >
              Delete Event
            </DropdownMenuItem>
          </DropdownMenu>
        ),
      },
    ],
    [handlePublishToggled]
  );

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className={cn(
              "text-2xl font-bold text-[var(--color-text-primary)]",
              "font-[var(--font-display)]"
            )}
          >
            Events
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Manage club events and their categories
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
          )}
        >
          <Plus size={16} />
          Add Event
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
        {(
          [
            { key: "events", label: "All Events", icon: Calendar },
            { key: "categories", label: "Categories", icon: Tag },
          ] as { key: AdminView; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[]
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium",
              "border-b-2 transition-all duration-150",
              "-mb-px",
              "focus:outline-none",
              view === key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Events View */}
      {view === "events" && (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                className={cn(
                  "w-full pl-9 pr-4 py-2 rounded-lg text-sm",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "focus:border-[var(--color-accent)] transition-colors"
                )}
              />
              <Calendar
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                aria-hidden="true"
              />
            </div>

            {!loading && (
              <span className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
                {total} event{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert
              variant="error"
              message="Failed to load events. Please refresh the page."
              dismissible
            />
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <Table
              columns={columns}
              data={events}
              loading={loading}
              skeletonRows={8}
              emptyMessage="No events found. Create your first event to get started."
              rowKey={(row) => row.id}
              striped
            />
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* Categories View */}
      {view === "categories" && (
        <div className="flex-1 overflow-y-auto">
          <CategoryManager />
        </div>
      )}

      {/* Add / Edit Event Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingEventId(null);
        }}
        title={editingEventId ? "Edit Event" : "Add New Event"}
        size="lg"
        closeOnBackdrop={false}
      >
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {formModalOpen && (
            <EventFormWithCategories
              initialData={editingEventId ? { id: editingEventId } : undefined}
              onSubmit={async (_data) => { handleFormSuccess(); }}
              onClose={() => {
                setFormModalOpen(false);
                setEditingEventId(null);
              }}
            />
          )}
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingEvent(null);
        }}
        onConfirm={handleDelete}
        eventTitle={deletingEvent?.title ?? ""}
      />

      {/* Gallery Drawer */}
      <EventGalleryDrawer
        eventId={galleryEventId}
        eventTitle={galleryEventTitle}
        isOpen={galleryDrawerOpen}
        onClose={() => {
          setGalleryDrawerOpen(false);
          setGalleryEventId(null);
          setGalleryEventTitle("");
        }}
      />
    </div>
  );
}