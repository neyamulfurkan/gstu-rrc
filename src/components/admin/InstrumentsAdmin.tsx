// src/components/admin/InstrumentsAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  RotateCcw,
  ChevronDown,
  AlertTriangle,
  Search,
} from "lucide-react";
import Image from "next/image";

import type {
  InstrumentCard,
  BorrowRequestCard,
  ApiListResponse,
} from "@/types/index";
import { formatDate, truncateText, cn } from "@/lib/utils";
import { Table, EmptyState, Pagination } from "@/components/ui/DataDisplay";
import type { TableColumn } from "@/components/ui/DataDisplay";
import {
  Badge,
  Alert,
  Spinner,
  toast,
} from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Overlay";
import { CloudinaryWidget } from "@/components/ui/Media";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstrumentCategory {
  id: string;
  name: string;
  color: string;
}

interface InstrumentFormData {
  name: string;
  categoryId: string;
  description: string;
  imageUrl: string;
  status: string;
}

interface BorrowRequestAdmin {
  id: string;
  status: string;
  purpose: string;
  borrowDate: string | Date;
  returnDate: string | Date;
  createdAt: string | Date;
  adminNote?: string | null;
  instrument: {
    id: string;
    name: string;
    imageUrl: string;
  };
  member?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
  } | null;
}

type Tab = "instruments" | "borrow-requests";
type RequestTab = "pending" | "approved" | "rejected" | "returned" | "all";

const REQUEST_TABS: { key: RequestTab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "returned", label: "Returned" },
  { key: "all", label: "All" },
];

const INSTRUMENT_STATUSES = [
  { value: "available", label: "Available" },
  { value: "on_loan", label: "On Loan" },
  { value: "maintenance", label: "Maintenance" },
  { value: "unavailable", label: "Unavailable" },
];

const ITEMS_PER_PAGE = 20;

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message ?? "Request failed");
  }
  return res.json();
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function InstrumentStatusBadge({ status }: { status: string }): JSX.Element {
  const variantMap: Record<string, "success" | "warning" | "error" | "neutral"> = {
    available: "success",
    on_loan: "warning",
    maintenance: "error",
    unavailable: "neutral",
  };
  const labelMap: Record<string, string> = {
    available: "Available",
    on_loan: "On Loan",
    maintenance: "Maintenance",
    unavailable: "Unavailable",
  };
  const variant = variantMap[status] ?? "neutral";
  const label = labelMap[status] ?? status;
  return <Badge variant={variant}>{label}</Badge>;
}

function RequestStatusBadge({ status }: { status: string }): JSX.Element {
  const variantMap: Record<string, "success" | "warning" | "error" | "neutral" | "primary"> = {
    pending: "warning",
    approved: "success",
    rejected: "error",
    returned: "neutral",
    cancelled: "neutral",
  };
  const variant = variantMap[status] ?? "neutral";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Instrument Form ──────────────────────────────────────────────────────────

interface InstrumentFormProps {
  initialData?: (InstrumentCard & { categoryId?: string }) | null;
  categories: InstrumentCategory[];
  onSubmit: (data: InstrumentFormData) => Promise<void>;
  onClose: () => void;
}

function InstrumentForm({
  initialData,
  categories,
  onSubmit,
  onClose,
}: InstrumentFormProps): JSX.Element {
  const [form, setForm] = useState<InstrumentFormData>({
    name: initialData?.name ?? "",
    categoryId: (initialData as { categoryId?: string } | undefined)?.categoryId ?? "",
    description: initialData?.description ?? "",
    imageUrl: initialData?.imageUrl ?? "",
    status: initialData?.status ?? "available",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (field: keyof InstrumentFormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!form.name.trim()) {
        setError("Name is required.");
        return;
      }
      if (!form.categoryId) {
        setError("Category is required.");
        return;
      }
      if (!form.description.trim()) {
        setError("Description is required.");
        return;
      }

      setSubmitting(true);
      try {
        await onSubmit(form);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save instrument.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, onSubmit]
  );

  const inputBase = cn(
    "w-full rounded-lg px-3 py-2 text-sm",
    "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
    "transition-colors duration-150"
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
      {error && (
        <Alert
          variant="error"
          message={error}
          dismissible
          onDismiss={() => setError(null)}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="inst-name"
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          Name <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="inst-name"
          type="text"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g. Oscilloscope"
          className={inputBase}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="inst-category"
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          Category <span className="text-[var(--color-error)]">*</span>
        </label>
        <div className="relative">
          <select
            id="inst-category"
            value={form.categoryId}
            onChange={(e) => handleChange("categoryId", e.target.value)}
            className={cn(inputBase, "appearance-none pr-8")}
            required
          >
            <option value="">Select category…</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="inst-description"
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          Description <span className="text-[var(--color-error)]">*</span>
        </label>
        <textarea
          id="inst-description"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Brief description of the instrument…"
          rows={3}
          className={cn(inputBase, "resize-none")}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="inst-status"
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          Initial Status
        </label>
        <div className="relative">
          <select
            id="inst-status"
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className={cn(inputBase, "appearance-none pr-8")}
          >
            {INSTRUMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
        </div>
      </div>

      <CloudinaryWidget
        folder="admin/instruments"
        value={form.imageUrl}
        onChange={(url) => handleChange("imageUrl", url)}
        label="Instrument Image"
      />

      <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className={cn(
            "rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-surface)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            submitting && "opacity-50 cursor-not-allowed"
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
            submitting && "opacity-60 cursor-not-allowed"
          )}
        >
          {submitting && <Spinner size="sm" />}
          {initialData ? "Save Changes" : "Add Instrument"}
        </button>
      </div>
    </form>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  name: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function DeleteConfirm({ name, onConfirm, onClose }: DeleteConfirmProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = useCallback(async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  }, [onConfirm]);

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-error)]/10">
        <AlertTriangle
          size={28}
          className="text-[var(--color-error)]"
          aria-hidden="true"
        />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)]">
          Delete Instrument
        </h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Are you sure you want to delete{" "}
          <span className="font-medium text-[var(--color-text-primary)]">
            {name}
          </span>
          ? This action cannot be undone.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          className={cn(
            "rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-surface)] transition-colors",
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
            "inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold",
            "bg-[var(--color-error)] text-white",
            "hover:opacity-90 transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] focus:ring-offset-2",
            deleting && "opacity-60 cursor-not-allowed"
          )}
        >
          {deleting && <Spinner size="sm" />}
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Approve/Reject Note Input ────────────────────────────────────────────────

interface ActionWithNoteProps {
  label: string;
  variant: "success" | "error";
  onConfirm: (note: string) => Promise<void>;
  onCancel: () => void;
}

function ActionWithNote({
  label,
  variant,
  onConfirm,
  onCancel,
}: ActionWithNoteProps): JSX.Element {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    try {
      await onConfirm(note);
    } finally {
      setSubmitting(false);
    }
  }, [note, onConfirm]);

  const colorClass =
    variant === "success"
      ? "bg-[var(--color-success)] focus:ring-[var(--color-success)]"
      : "bg-[var(--color-error)] focus:ring-[var(--color-error)]";

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <label
        htmlFor={`action-note-${label}`}
        className="text-xs font-medium text-[var(--color-text-secondary)]"
      >
        Admin note (optional)
      </label>
      <textarea
        id={`action-note-${label}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Add a note for the member…"
        className={cn(
          "w-full rounded-lg px-3 py-2 text-sm resize-none",
          "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
          "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
        )}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className={cn(
            "flex-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-surface)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
            colorClass,
            "hover:opacity-90 transition-all",
            "focus:outline-none focus:ring-2 focus:ring-offset-1",
            submitting && "opacity-60 cursor-not-allowed"
          )}
        >
          {submitting && <Spinner size="sm" />}
          {label}
        </button>
      </div>
    </div>
  );
}

// ─── Instruments Tab ──────────────────────────────────────────────────────────

interface InstrumentsTabProps {
  categories: InstrumentCategory[];
}

function InstrumentsTab({ categories }: InstrumentsTabProps): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<(InstrumentCard & { categoryId?: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstrumentCard | null>(null);

  const offset = (page - 1) * ITEMS_PER_PAGE;
  const query = new URLSearchParams({
    take: String(ITEMS_PER_PAGE),
    ...(search ? { search } : {}),
    status: "all",
  });

  const { data, error, isLoading, mutate } = useSWR<{
    data: (InstrumentCard & { categoryId?: string })[];
    total: number;
  }>(
    `/api/instruments?${query.toString()}`,
    fetcher,
    { keepPreviousData: true }
  );

  const instruments = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  const handleSearchInput = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 350);
  }, []);

  const handleAdd = useCallback(async (formData: InstrumentFormData) => {
    const res = await fetch("/api/instruments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create instrument" }));
      throw new Error(err.message ?? "Failed to create instrument");
    }
    toast("Instrument added successfully", "success");
    setAddOpen(false);
    mutate();
  }, [mutate]);

  const handleEdit = useCallback(async (formData: InstrumentFormData) => {
    if (!editTarget) return;
    const res = await fetch(`/api/instruments/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update instrument" }));
      throw new Error(err.message ?? "Failed to update instrument");
    }
    toast("Instrument updated", "success");
    setEditTarget(null);
    mutate();
  }, [editTarget, mutate]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/instruments/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete instrument" }));
      throw new Error(err.message ?? "Failed to delete instrument");
    }
    toast("Instrument deleted", "success");
    setDeleteTarget(null);
    mutate();
  }, [deleteTarget, mutate]);

  const columns: TableColumn<InstrumentCard & { categoryId?: string }>[] = useMemo(
    () => [
      {
        key: "imageUrl",
        header: "Image",
        width: "56px",
        render: (row) => (
          <div className="relative h-8 w-8 overflow-hidden rounded-md bg-[var(--color-bg-elevated)] flex-shrink-0">
            {row.imageUrl ? (
              <Image
                src={row.imageUrl}
                alt={row.name}
                fill
                className="object-cover"
                sizes="32px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package size={14} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
              </div>
            )}
          </div>
        ),
      },
      {
        key: "name",
        header: "Name",
        sortable: true,
        render: (row) => (
          <span className="font-medium text-[var(--color-text-primary)]">
            {row.name}
          </span>
        ),
      },
      {
        key: "category",
        header: "Category",
        render: (row) => (
          <span className="text-sm text-[var(--color-text-secondary)]">
            {row.category.name}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <InstrumentStatusBadge status={row.status} />,
      },
      {
        key: "borrower",
        header: "Current Borrower",
        render: (row) =>
          row.borrower ? (
            <span className="text-sm text-[var(--color-text-primary)]">
              {row.borrower.fullName}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-text-secondary)]">—</span>
          ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditTarget(row)}
              aria-label={`Edit ${row.name}`}
              className={cn(
                "rounded-md p-1.5 text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-surface)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors duration-150"
              )}
            >
              <Pencil size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              aria-label={`Delete ${row.name}`}
              className={cn(
                "rounded-md p-1.5 text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
                "transition-colors duration-150"
              )}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative max-w-xs w-full">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search instruments…"
            className={cn(
              "w-full rounded-lg pl-9 pr-3 py-2 text-sm",
              "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
              "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            )}
          />
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shrink-0",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
          )}
        >
          <Plus size={16} aria-hidden="true" />
          Add Instrument
        </button>
      </div>

      {error && (
        <Alert
          variant="error"
          message="Failed to load instruments. Please try again."
          className="mb-4"
        />
      )}

      <Table
        columns={columns}
        data={instruments}
        loading={isLoading}
        skeletonRows={8}
        emptyMessage="No instruments found."
        rowKey={(row) => row.id}
        striped
      />

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Instrument"
        size="md"
      >
        <InstrumentForm
          categories={categories}
          onSubmit={handleAdd}
          onClose={() => setAddOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Instrument"
        size="md"
      >
        {editTarget && (
          <InstrumentForm
            initialData={editTarget}
            categories={categories}
            onSubmit={handleEdit}
            onClose={() => setEditTarget(null)}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Deletion"
        size="sm"
      >
        {deleteTarget && (
          <DeleteConfirm
            name={deleteTarget.name}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
          />
        )}
      </Modal>
    </>
  );
}

// ─── Borrow Requests Tab ──────────────────────────────────────────────────────

function BorrowRequestsTab(): JSX.Element {
  const [activeTab, setActiveTab] = useState<RequestTab>("pending");
  const [page, setPage] = useState(1);

  // Per-row action state: requestId -> "approve" | "reject" | null
  const [rowAction, setRowAction] = useState<Record<string, "approve" | "reject" | null>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const query = new URLSearchParams({
    status: activeTab === "all" ? "" : activeTab,
    take: String(ITEMS_PER_PAGE),
    skip: String((page - 1) * ITEMS_PER_PAGE),
  });

  const swrKey = `/api/admin/instrument-requests?${query.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<{
    data: BorrowRequestAdmin[];
    total: number;
  }>(swrKey, fetcher, { keepPreviousData: true });

  const requests = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleTabChange = useCallback((tab: RequestTab) => {
    setActiveTab(tab);
    setPage(1);
    setRowAction({});
  }, []);

  const toggleRowAction = useCallback(
    (requestId: string, action: "approve" | "reject") => {
      setRowAction((prev) => {
        const current = prev[requestId];
        if (current === action) {
          return { ...prev, [requestId]: null };
        }
        return { ...prev, [requestId]: action };
      });
    },
    []
  );

  const performAction = useCallback(
    async (
      request: BorrowRequestAdmin,
      action: "approve_borrow" | "reject_borrow" | "mark_returned",
      note: string
    ) => {
      setProcessingIds((prev) => new Set(prev).add(request.id));
      try {
        const res = await fetch(`/api/instruments/${request.instrument.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            requestId: request.id,
            note: note.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Action failed" }));
          throw new Error(err.message ?? "Action failed");
        }

        const actionLabel =
          action === "approve_borrow"
            ? "Request approved"
            : action === "reject_borrow"
            ? "Request rejected"
            : "Marked as returned";

        toast(actionLabel, action === "reject_borrow" ? "info" : "success");

        setRowAction((prev) => {
          const updated = { ...prev };
          delete updated[request.id];
          return updated;
        });

        mutate();
        globalMutate((key: string) =>
          typeof key === "string" && key.startsWith("/api/admin/instrument-requests")
        );
      } catch (err) {
        toast(
          err instanceof Error ? err.message : "Action failed. Try again.",
          "error"
        );
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(request.id);
          return next;
        });
      }
    },
    [mutate]
  );

  const columns: TableColumn<BorrowRequestAdmin>[] = useMemo(
    () => [
      {
        key: "instrument",
        header: "Instrument",
        render: (row) => (
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-md bg-[var(--color-bg-elevated)] flex-shrink-0">
              {row.instrument.imageUrl ? (
                <Image
                  src={row.instrument.imageUrl}
                  alt={row.instrument.name}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package size={14} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
                </div>
              )}
            </div>
            <span className="font-medium text-[var(--color-text-primary)] text-sm">
              {row.instrument.name}
            </span>
          </div>
        ),
      },
      {
        key: "member",
        header: "Requester",
        render: (row) => {
          if (!row.member) {
            return (
              <span className="text-sm text-[var(--color-text-secondary)]">Unknown</span>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <div className="relative h-6 w-6 overflow-hidden rounded-full bg-[var(--color-bg-elevated)] flex-shrink-0">
                {row.member.avatarUrl && (
                  <Image
                    src={row.member.avatarUrl}
                    alt={row.member.fullName ?? "Member"}
                    fill
                    className="object-cover"
                    sizes="24px"
                  />
                )}
              </div>
              <span className="text-sm text-[var(--color-text-primary)]">
                {row.member.fullName ?? row.member.username ?? "Unknown"}
              </span>
            </div>
          );
        },
      },
      {
        key: "purpose",
        header: "Purpose",
        render: (row) => (
          <span
            className="text-sm text-[var(--color-text-secondary)]"
            title={row.purpose}
          >
            {truncateText(row.purpose, 60)}
          </span>
        ),
      },
      {
        key: "borrowDate",
        header: "Borrow Date",
        render: (row) => (
          <span className="text-sm text-[var(--color-text-secondary)] font-[var(--font-mono)]">
            {formatDate(row.borrowDate, "short")}
          </span>
        ),
      },
      {
        key: "returnDate",
        header: "Return Date",
        render: (row) => (
          <span className="text-sm text-[var(--color-text-secondary)] font-[var(--font-mono)]">
            {formatDate(row.returnDate, "short")}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Requested",
        render: (row) => (
          <span className="text-xs text-[var(--color-text-secondary)]">
            {formatDate(row.createdAt, "relative")}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <RequestStatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => {
          const isProcessing = processingIds.has(row.id);
          const currentAction = rowAction[row.id];

          if (row.status === "pending") {
            return (
              <div className="flex flex-col items-end gap-2">
                {!currentAction && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRowAction(row.id, "approve")}
                      disabled={isProcessing}
                      aria-label={`Approve borrow request for ${row.instrument.name}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold",
                        "bg-[var(--color-success)]/10 text-[var(--color-success)]",
                        "hover:bg-[var(--color-success)]/20 transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-success)]",
                        isProcessing && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Check size={13} aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRowAction(row.id, "reject")}
                      disabled={isProcessing}
                      aria-label={`Reject borrow request for ${row.instrument.name}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold",
                        "bg-[var(--color-error)]/10 text-[var(--color-error)]",
                        "hover:bg-[var(--color-error)]/20 transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
                        isProcessing && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <X size={13} aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                )}
                {currentAction === "approve" && (
                  <ActionWithNote
                    label="Approve"
                    variant="success"
                    onConfirm={(note) => performAction(row, "approve_borrow", note)}
                    onCancel={() => toggleRowAction(row.id, "approve")}
                  />
                )}
                {currentAction === "reject" && (
                  <ActionWithNote
                    label="Reject"
                    variant="error"
                    onConfirm={(note) => performAction(row, "reject_borrow", note)}
                    onCancel={() => toggleRowAction(row.id, "reject")}
                  />
                )}
              </div>
            );
          }

          if (row.status === "approved") {
            return (
              <button
                type="button"
                onClick={() => performAction(row, "mark_returned", "")}
                disabled={isProcessing}
                aria-label={`Mark ${row.instrument.name} as returned`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold",
                  "bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
                  "hover:bg-[var(--color-accent)]/20 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <Spinner size="sm" />
                ) : (
                  <RotateCcw size={13} aria-hidden="true" />
                )}
                Mark Returned
              </button>
            );
          }

          return <span className="text-xs text-[var(--color-text-secondary)]">—</span>;
        },
      },
    ],
    [processingIds, rowAction, toggleRowAction, performAction]
  );

  return (
    <>
      {/* Sub-tabs */}
      <div
        className="flex items-center gap-1 mb-4 border-b border-[var(--color-border)] overflow-x-auto"
        role="tablist"
        aria-label="Filter borrow requests by status"
      >
        {REQUEST_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              "shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset",
              activeTab === tab.key
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <Alert
          variant="error"
          message="Failed to load borrow requests. Please try again."
          className="mb-4"
        />
      )}

      {isLoading ? (
        <Table
          columns={columns}
          data={[]}
          loading
          skeletonRows={6}
          emptyMessage=""
        />
      ) : requests.length === 0 ? (
        <EmptyState
          icon="Package"
          heading="No requests found"
          description={
            activeTab === "pending"
              ? "There are no pending borrow requests."
              : `No ${activeTab} borrow requests.`
          }
        />
      ) : (
        <Table
          columns={columns}
          data={requests}
          rowKey={(row) => row.id}
          striped
        />
      )}

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InstrumentsAdmin(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>("instruments");

  const { data: categoriesData } = useSWR<{ data: InstrumentCategory[] }>(
    "/api/admin/instrument-categories",
    fetcher
  );

  const categories = categoriesData?.data ?? [];

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "instruments",
      label: "Instruments",
      icon: <Package size={16} aria-hidden="true" />,
    },
    {
      key: "borrow-requests",
      label: "Borrow Requests",
      icon: <RotateCcw size={16} aria-hidden="true" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
          Instruments
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Manage lab instruments and borrow requests from members.
        </p>
      </div>

      {/* Main Tabs */}
      <div
        className="flex items-center gap-1 border-b border-[var(--color-border)]"
        role="tablist"
        aria-label="Instruments admin sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset",
              activeTab === tab.key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div role="tabpanel">
        {activeTab === "instruments" && (
          <InstrumentsTab categories={categories} />
        )}
        {activeTab === "borrow-requests" && <BorrowRequestsTab />}
      </div>
    </div>
  );
}