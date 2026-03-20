// src/components/admin/GalleryAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import useSWR, { mutate as globalMutate } from "swr";
import {
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  Video,
  Layers,
  Tag,
  Plus,
  Search,
  AlertTriangle,
} from "lucide-react";

import { cn, formatDate, truncateText } from "@/lib/utils";
import type { GalleryItemCard } from "@/types/index";
import {
  Badge,
  Skeleton,
  Spinner,
  Alert,
  toast,
} from "@/components/ui/Feedback";
import {
  Modal,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
} from "@/components/ui/Overlay";

// ─── Types ────────────────────────────────────────────────────────────────────

type GalleryTab = "pending" | "approved" | "rejected" | "all";
type MediaType = "all" | "image" | "video";

interface CategoryItem {
  id: string;
  name: string;
  color?: string;
}

interface GalleryListResponse {
  data: GalleryItemCard[];
  nextCursor?: string;
  total: number;
}

interface EditFormState {
  title: string;
  description: string;
  categoryId: string;
  tags: string[];
  eventId: string;
  projectId: string;
}

interface EventOption {
  id: string;
  title: string;
}

interface ProjectOption {
  id: string;
  title: string;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || "Request failed");
  }
  return res.json() as Promise<T>;
}

// ─── Debounce Hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── TagInput ─────────────────────────────────────────────────────────────────

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

function TagInput({ tags, onChange, placeholder = "Add tag..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().toLowerCase().replace(/,/g, "");
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 min-h-[42px] w-full rounded-md px-3 py-2",
        "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
        "focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]",
        "transition-colors duration-150"
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20"
          )}
        >
          <Tag size={10} aria-hidden="true" />
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Remove tag ${tag}`}
            className="ml-0.5 hover:text-[var(--color-error)] transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        className={cn(
          "flex-1 min-w-[120px] bg-transparent text-sm",
          "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
          "outline-none border-none"
        )}
      />
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemTitle: string;
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
}: DeleteConfirmModalProps) {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Gallery Item" size="sm">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-[var(--color-error)]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-primary)] font-medium">
              Delete &quot;{truncateText(itemTitle || "this item", 40)}&quot;?
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              This action cannot be undone. The item will be permanently removed from the gallery and Cloudinary.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]",
              "hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "disabled:opacity-50"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/80",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
              "disabled:opacity-50 flex items-center gap-2"
            )}
          >
            {loading && <Spinner size="sm" />}
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: GalleryItemCard | null;
  categories: CategoryItem[];
  events: EventOption[];
  projects: ProjectOption[];
  onSave: () => void;
}

function EditGalleryModal({
  isOpen,
  onClose,
  item,
  categories,
  events,
  projects,
  onSave,
}: EditGalleryModalProps) {
  const [form, setForm] = useState<EditFormState>({
    title: "",
    description: "",
    categoryId: "",
    tags: [],
    eventId: "",
    projectId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title ?? "",
        description: "",
        categoryId: "",
        tags: [],
        eventId: item.eventId ?? "",
        projectId: item.projectId ?? "",
      });
      setError(null);
    }
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title || null,
        categoryId: form.categoryId || undefined,
        tags: form.tags,
        eventId: form.eventId || null,
        projectId: form.projectId || null,
      };
      const res = await fetch(`/api/gallery/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update item");
      }
      toast("Gallery item updated successfully", "success");
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = cn(
    "w-full rounded-md px-3 py-2 text-sm transition-colors",
    "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
    "focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Gallery Item" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <Alert variant="error" message={error} dismissible onDismiss={() => setError(null)} />
        )}

        {item && (
          <div className="rounded-lg overflow-hidden h-40 bg-[var(--color-bg-surface)] flex items-center justify-center">
            {item.type === "video" ? (
              <div className="flex flex-col items-center gap-2 text-[var(--color-text-secondary)]">
                <Video size={32} aria-hidden="true" />
                <span className="text-xs">Video Item</span>
              </div>
            ) : (
              <Image
                src={item.url}
                alt={item.altText || "Gallery item"}
                width={400}
                height={160}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Enter a title..."
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Category
          </label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            className={inputClass}
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Tags
          </label>
          <TagInput
            tags={form.tags}
            onChange={(tags) => setForm((prev) => ({ ...prev, tags }))}
            placeholder="Type tag and press Enter..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
              Event
            </label>
            <select
              value={form.eventId}
              onChange={(e) => setForm((prev) => ({ ...prev, eventId: e.target.value }))}
              className={inputClass}
            >
              <option value="">No event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {truncateText(ev.title, 30)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
              Project
            </label>
            <select
              value={form.projectId}
              onChange={(e) => setForm((prev) => ({ ...prev, projectId: e.target.value }))}
              className={inputClass}
            >
              <option value="">No project</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {truncateText(proj.title, 30)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]",
              "hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "disabled:opacity-50"
            )}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
              "disabled:opacity-50 flex items-center gap-2"
            )}
          >
            {loading && <Spinner size="sm" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Bulk Upload Section ──────────────────────────────────────────────────────

interface BulkUploadSectionProps {
  categories: CategoryItem[];
  onComplete: () => void;
}

function BulkUploadSection({ categories, onComplete }: BulkUploadSectionProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, "pending" | "uploading" | "done" | "error">>({});
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setSelectedFiles((prev) => [...prev, ...imageFiles]);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadFile(file: File): Promise<string | null> {
    try {
      const sigRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "admin/gallery" }),
      });
      if (!sigRes.ok) throw new Error("Failed to get upload signature");
      const { signature, timestamp, cloudName, apiKey } = await sigRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", "admin/gallery");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) throw new Error("Upload to Cloudinary failed");
      const data = await uploadRes.json();
      return data.secure_url as string;
    } catch {
      return null;
    }
  }

  async function handleBulkUpload() {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    const initialProgress: Record<string, "pending" | "uploading" | "uploading" | "done" | "error"> = {};
    selectedFiles.forEach((f, i) => {
      initialProgress[`${i}-${f.name}`] = "pending";
    });
    setProgress(initialProgress);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const key = `${i}-${file.name}`;
      setProgress((prev) => ({ ...prev, [key]: "uploading" }));

      const url = await uploadFile(file);
      if (!url) {
        setProgress((prev) => ({ ...prev, [key]: "error" }));
        errorCount++;
        continue;
      }

      try {
        if (!bulkCategoryId) {
          setProgress((prev) => ({ ...prev, [key]: "error" }));
          errorCount++;
          continue;
        }
        const body: Record<string, unknown> = {
          url,
          type: "image",
          altText: file.name.replace(/\.[^/.]+$/, ""),
          categoryId: bulkCategoryId,
          year: new Date().getFullYear(),
          tags: [],
          downloadEnabled: false,
        };

        const apiRes = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!apiRes.ok) throw new Error("Gallery API failed");
        setProgress((prev) => ({ ...prev, [key]: "done" }));
        successCount++;
      } catch {
        setProgress((prev) => ({ ...prev, [key]: "error" }));
        errorCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast(`${successCount} image${successCount > 1 ? "s" : ""} uploaded successfully`, "success");
      onComplete();
    }
    if (errorCount > 0) {
      toast(`${errorCount} image${errorCount > 1 ? "s" : ""} failed to upload`, "error");
    }
    if (successCount > 0 || errorCount === selectedFiles.length) {
      setSelectedFiles([]);
      setProgress({});
    }
  }

  const inputClass = cn(
    "w-full rounded-md px-3 py-2 text-sm transition-colors",
    "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
    "focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)]">
          Bulk Upload
        </h3>
        <select
          value={bulkCategoryId}
          onChange={(e) => setBulkCategoryId(e.target.value)}
          className={cn(inputClass, "w-48")}
        >
          <option value="" disabled>Select a category (required)</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "border-2 border-dashed border-[var(--color-border)] rounded-xl p-8",
          "flex flex-col items-center gap-3 cursor-pointer",
          "hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5",
          "transition-colors duration-150"
        )}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Click or drag to upload images"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <Upload size={32} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Drag & drop images here, or{" "}
          <span className="text-[var(--color-accent)] font-medium">browse files</span>
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          All uploaded images are auto-approved
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-secondary)]">
              {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
            </p>
            {!uploading && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFiles([]);
                  setProgress({});
                }}
                className="text-xs text-[var(--color-error)] hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, i) => {
              const key = `${i}-${file.name}`;
              const status = progress[key];
              return (
                <div
                  key={key}
                  className="relative rounded-lg overflow-hidden bg-[var(--color-bg-surface)] aspect-square"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  {status === "uploading" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Spinner size="sm" />
                    </div>
                  )}
                  {status === "done" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <CheckCircle size={20} className="text-[var(--color-success)]" />
                    </div>
                  )}
                  {status === "error" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <XCircle size={20} className="text-[var(--color-error)]" />
                    </div>
                  )}
                  {!status && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      aria-label={`Remove ${file.name}`}
                      className={cn(
                        "absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60",
                        "flex items-center justify-center text-white",
                        "hover:bg-[var(--color-error)] transition-colors"
                      )}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleBulkUpload}
            disabled={uploading}
            className={cn(
              "w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
              "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
              "disabled:opacity-50 flex items-center justify-center gap-2"
            )}
          >
            {uploading ? (
              <>
                <Spinner size="sm" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} aria-hidden="true" />
                Upload {selectedFiles.length} image{selectedFiles.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Gallery Item Card ────────────────────────────────────────────────────────

interface GalleryItemCardProps {
  item: GalleryItemCard;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (item: GalleryItemCard) => void;
  onDelete: (item: GalleryItemCard) => void;
}

function GalleryItemTile({
  item,
  onApprove,
  onReject,
  onEdit,
  onDelete,
}: GalleryItemCardProps) {
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);

  async function handleApprove(e: React.MouseEvent) {
    e.stopPropagation();
    setActionLoading("approve");
    try {
      await onApprove(item.id);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(e: React.MouseEvent) {
    e.stopPropagation();
    setActionLoading("reject");
    try {
      await onReject(item.id);
    } finally {
      setActionLoading(null);
    }
  }

  const statusVariant =
    item.type === "image"
      ? ({ success: "success", approved: "success", pending: "warning", rejected: "error" } as Record<string, "success" | "warning" | "error" | "neutral">)[
          "approved"
        ]
      : "neutral";

  const statusMap: Record<string, "success" | "warning" | "error" | "neutral"> = {
    approved: "success",
    pending: "warning",
    rejected: "error",
  };

  return (
    <div
      className={cn(
        "relative group rounded-lg overflow-hidden break-inside-avoid mb-3",
        "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
        "hover:border-[var(--color-card-border-hover)] transition-all duration-200"
      )}
    >
      {/* Media */}
      {item.type === "video" ? (
        <div className="aspect-video bg-[var(--color-bg-elevated)] flex flex-col items-center justify-center gap-2">
          <Video size={32} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
          <span className="text-xs text-[var(--color-text-secondary)]">Video</span>
        </div>
      ) : (
        <div className="relative overflow-hidden aspect-square">
          <Image
            src={item.url}
            alt={item.altText || item.title || "Gallery image"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      )}

      {/* Status Badge */}
      <div className="absolute top-2 left-2">
        <Badge variant={statusMap["pending"] ?? "neutral"} size="sm">
          pending
        </Badge>
      </div>

      {/* Hover overlay actions */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100",
          "transition-opacity duration-200 flex items-center justify-center gap-2"
        )}
      >
        <button
          type="button"
          onClick={handleApprove}
          disabled={!!actionLoading}
          aria-label="Approve item"
          className={cn(
            "p-2 rounded-full transition-colors",
            "bg-[var(--color-success)]/90 text-white hover:bg-[var(--color-success)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-success)]",
            "disabled:opacity-50"
          )}
        >
          {actionLoading === "approve" ? (
            <Spinner size="sm" />
          ) : (
            <CheckCircle size={18} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={!!actionLoading}
          aria-label="Reject item"
          className={cn(
            "p-2 rounded-full transition-colors",
            "bg-[var(--color-error)]/90 text-white hover:bg-[var(--color-error)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
            "disabled:opacity-50"
          )}
        >
          {actionLoading === "reject" ? (
            <Spinner size="sm" />
          ) : (
            <XCircle size={18} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          aria-label="Edit item"
          className={cn(
            "p-2 rounded-full transition-colors",
            "bg-white/20 text-white hover:bg-white/30",
            "focus:outline-none focus:ring-2 focus:ring-white/50"
          )}
        >
          <Pencil size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          aria-label="Delete item"
          className={cn(
            "p-2 rounded-full transition-colors",
            "bg-[var(--color-error)]/70 text-white hover:bg-[var(--color-error)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
          )}
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Item info */}
      <div className="p-3 space-y-1">
        {item.title && (
          <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
            {item.title}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-secondary)]">
            {item.category?.name}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {formatDate(item.createdAt, "short")}
          </span>
        </div>
        {item.uploader && (
          <p className="text-xs text-[var(--color-text-secondary)] truncate">
            by {item.uploader.fullName}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Categories Manager ───────────────────────────────────────────────────────

interface CategoriesManagerProps {
  categories: CategoryItem[];
  onRefresh: () => void;
}

function CategoriesManager({ categories, onRefresh }: CategoriesManagerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#00E5FF");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      toast("Category created", "success");
      setNewName("");
      onRefresh();
    } catch {
      toast("Failed to create category", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/gallery-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast("Category deleted", "success");
      onRefresh();
    } catch {
      toast("Failed to delete category", "error");
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass = cn(
    "flex-1 rounded-md px-3 py-2 text-sm transition-colors",
    "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
    "focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name..."
          className={inputClass}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          aria-label="Category color"
          className="w-10 h-10 rounded-md cursor-pointer border border-[var(--color-border)] bg-transparent"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading || !newName.trim()}
          className={cn(
            "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
            "disabled:opacity-50 flex items-center gap-1.5"
          )}
        >
          {loading ? <Spinner size="sm" /> : <Plus size={14} aria-hidden="true" />}
          Add
        </button>
      </div>

      <div className="space-y-2">
        {categories.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
            No categories yet
          </p>
        )}
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg",
              "bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color || "var(--color-accent)" }}
                aria-hidden="true"
              />
              <span className="text-sm text-[var(--color-text-primary)]">{cat.name}</span>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(cat.id)}
              disabled={deletingId === cat.id}
              aria-label={`Delete ${cat.name} category`}
              className={cn(
                "p-1.5 rounded-md text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
                "transition-colors disabled:opacity-50"
              )}
            >
              {deletingId === cat.id ? <Spinner size="sm" /> : <Trash2 size={14} aria-hidden="true" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main GalleryAdmin Component ──────────────────────────────────────────────

export function GalleryAdmin(): JSX.Element {
  const [activeTab, setActiveTab] = useState<GalleryTab>("pending");
  const [activeSubTab, setActiveSubTab] = useState<"gallery" | "categories" | "bulk-upload">(
    "gallery"
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedType, setSelectedType] = useState<MediaType>("all");
  const [uploaderSearch, setUploaderSearch] = useState("");
  const [editingItem, setEditingItem] = useState<GalleryItemCard | null>(null);
  const [deletingItem, setDeletingItem] = useState<GalleryItemCard | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const debouncedUploaderSearch = useDebounce(uploaderSearch, 300);

  // Build gallery query URL
  const galleryQueryParams = new URLSearchParams();
  if (activeTab !== "all") galleryQueryParams.set("status", activeTab);
  if (selectedCategoryId) galleryQueryParams.set("categoryId", selectedCategoryId);
  if (selectedType !== "all") galleryQueryParams.set("type", selectedType);
  if (debouncedUploaderSearch) galleryQueryParams.set("uploaderSearch", debouncedUploaderSearch);
  galleryQueryParams.set("take", "40");

  const galleryUrl = `/api/gallery?${galleryQueryParams.toString()}`;

  const {
    data: galleryData,
    error: galleryError,
    isLoading: galleryLoading,
    mutate: mutateGallery,
  } = useSWR<GalleryListResponse>(galleryUrl, fetcher, {
    revalidateOnFocus: false,
  });

  // Pending count (separate fetch for badge)
  const { data: pendingData } = useSWR<GalleryListResponse>(
    "/api/gallery?status=pending&take=1",
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  );

  // Categories
  const { data: categoriesData, mutate: mutateCategories } = useSWR<{ data: CategoryItem[] }>(
    "/api/admin/gallery-categories",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Events for edit form
  const { data: eventsData } = useSWR<{ data: EventOption[] }>(
    "/api/events?tab=all&take=100&select=minimal",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Projects for edit form
  const { data: projectsData } = useSWR<{ data: ProjectOption[] }>(
    "/api/projects?take=100&select=minimal",
    fetcher,
    { revalidateOnFocus: false }
  );

  const categories = categoriesData?.data ?? [];
  const events = eventsData?.data ?? [];
  const projects = projectsData?.data ?? [];
  const galleryItems = galleryData?.data ?? [];
  const pendingCount = pendingData?.total ?? 0;

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/gallery/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
        if (!res.ok) throw new Error("Failed to approve");
        toast("Gallery item approved", "success");
        await mutateGallery();
        await globalMutate("/api/gallery?status=pending&take=1");
      } catch {
        toast("Failed to approve item", "error");
      }
    },
    [mutateGallery]
  );

  const handleReject = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/gallery/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected" }),
        });
        if (!res.ok) throw new Error("Failed to reject");
        toast("Gallery item rejected", "info");
        await mutateGallery();
        await globalMutate("/api/gallery?status=pending&take=1");
      } catch {
        toast("Failed to reject item", "error");
      }
    },
    [mutateGallery]
  );

  const handleEdit = useCallback((item: GalleryItemCard) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback((item: GalleryItemCard) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingItem) return;
    const res = await fetch(`/api/gallery/${deletingItem.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Delete failed");
    }
    toast("Gallery item deleted", "success");
    setIsDeleteModalOpen(false);
    setDeletingItem(null);
    await mutateGallery();
    await globalMutate("/api/gallery?status=pending&take=1");
  }, [deletingItem, mutateGallery]);

  const tabConfig: Array<{ key: GalleryTab; label: string }> = [
    { key: "pending", label: "Pending Approval" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  const subTabConfig = [
    { key: "gallery" as const, label: "Gallery", icon: <ImageIcon size={14} aria-hidden="true" /> },
    { key: "categories" as const, label: "Categories", icon: <Tag size={14} aria-hidden="true" /> },
    { key: "bulk-upload" as const, label: "Bulk Upload", icon: <Upload size={14} aria-hidden="true" /> },
  ];

  const mediaTypeOptions: Array<{ value: MediaType; label: string }> = [
    { value: "all", label: "All" },
    { value: "image", label: "Images" },
    { value: "video", label: "Videos" },
  ];

  const inputClass = cn(
    "rounded-md px-3 py-2 text-sm transition-colors",
    "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
    "focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Gallery Management
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Review, moderate, and manage all gallery items
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="warning" size="lg">
              {pendingCount} pending review{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-[var(--color-bg-surface)] rounded-lg w-fit border border-[var(--color-border)]">
        {subTabConfig.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSubTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              activeSubTab === tab.key
                ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Gallery Sub-tab */}
      {activeSubTab === "gallery" && (
        <div className="space-y-4">
          {/* Status tabs */}
          <div className="flex gap-1 border-b border-[var(--color-border)]">
            {tabConfig.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1",
                  activeTab === tab.key
                    ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {tab.label}
                {tab.key === "pending" && pendingCount > 0 && (
                  <Badge variant="warning" size="sm">
                    {pendingCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={uploaderSearch}
                onChange={(e) => setUploaderSearch(e.target.value)}
                placeholder="Search by uploader..."
                className={cn(inputClass, "pl-8 w-48")}
              />
            </div>

            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className={cn(inputClass, "w-44")}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <div className="flex gap-1 p-1 bg-[var(--color-bg-surface)] rounded-md border border-[var(--color-border)]">
              {mediaTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedType(opt.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                    selectedType === opt.value
                      ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {opt.value === "image" && <ImageIcon size={12} aria-hidden="true" />}
                  {opt.value === "video" && <Video size={12} aria-hidden="true" />}
                  {opt.value === "all" && <Layers size={12} aria-hidden="true" />}
                  {opt.label}
                </button>
              ))}
            </div>

            {(selectedCategoryId || selectedType !== "all" || uploaderSearch) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId("");
                  setSelectedType("all");
                  setUploaderSearch("");
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-error)]",
                  "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                <X size={12} aria-hidden="true" />
                Clear filters
              </button>
            )}

            <span className="ml-auto text-xs text-[var(--color-text-secondary)]">
              {galleryData ? `${galleryData.total} item${galleryData.total !== 1 ? "s" : ""}` : ""}
            </span>
          </div>

          {/* Error */}
          {galleryError && (
            <Alert
              variant="error"
              message="Failed to load gallery items. Please try again."
              dismissible
            />
          )}

          {/* Loading */}
          {galleryLoading && (
            <div
              className="columns-2 sm:columns-3 lg:columns-4 gap-3"
              aria-label="Loading gallery items"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="break-inside-avoid mb-3">
                  <Skeleton
                    height={i % 3 === 0 ? 240 : i % 3 === 1 ? 180 : 210}
                    rounded="lg"
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!galleryLoading && !galleryError && galleryItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-[var(--color-bg-surface)] flex items-center justify-center">
                <ImageIcon size={28} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-[var(--color-text-primary)]">
                No gallery items found
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {activeTab === "pending"
                  ? "No items pending review"
                  : "Try adjusting your filters"}
              </p>
            </div>
          )}

          {/* Masonry grid */}
          {!galleryLoading && galleryItems.length > 0 && (
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-3">
              {galleryItems.map((item) => (
                <GalleryItemTile
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categories Sub-tab */}
      {activeSubTab === "categories" && (
        <div className="max-w-lg">
          <div
            className={cn(
              "rounded-xl border border-[var(--color-border)] p-6",
              "bg-[var(--color-bg-surface)]"
            )}
          >
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)] mb-4">
              Gallery Categories
            </h2>
            <CategoriesManager
              categories={categories}
              onRefresh={() => mutateCategories()}
            />
          </div>
        </div>
      )}

      {/* Bulk Upload Sub-tab */}
      {activeSubTab === "bulk-upload" && (
        <div className="max-w-2xl">
          <div
            className={cn(
              "rounded-xl border border-[var(--color-border)] p-6",
              "bg-[var(--color-bg-surface)]"
            )}
          >
            <BulkUploadSection
              categories={categories}
              onComplete={() => {
                mutateGallery();
                setActiveSubTab("gallery");
                setActiveTab("approved");
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditGalleryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        categories={categories}
        events={events}
        projects={projects}
        onSave={() => mutateGallery()}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={handleConfirmDelete}
        itemTitle={deletingItem?.title ?? deletingItem?.altText ?? ""}
      />
    </div>
  );
}