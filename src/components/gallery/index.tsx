// src/components/gallery/index.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Play, Upload, X, Image as ImageIcon, Video, Filter } from "lucide-react";
import { useSession } from "next-auth/react";

import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import { Badge, Skeleton, Spinner, Alert } from "@/components/ui/Feedback";
import { Drawer } from "@/components/ui/Overlay";
import { FileUpload } from "@/components/ui/Media";
import { GalleryLightbox } from "@/components/gallery/Lightbox";
import { cn, formatDate } from "@/lib/utils";
import type { GalleryItemCard } from "@/types/index";
import type { GalleryFilter } from "@/types/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterOptions {
  categories: Array<{ id: string; name: string }>;
  eventNames: Array<{ id: string; name: string }>;
  years: number[];
  currentMemberId?: string;
}

interface GalleryGridProps {
  initialItems: GalleryItemCard[];
  initialFilter?: GalleryFilter;
  filterOptions: FilterOptions;
}

interface UploadFile {
  file: File;
  title: string;
  categoryId: string;
  previewUrl: string;
  uploading: boolean;
  uploaded: boolean;
  cloudinaryUrl: string;
  error: string | null;
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function GallerySkeleton(): JSX.Element {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="break-inside-avoid mb-3">
          <Skeleton
            className="w-full"
            height={i % 3 === 0 ? 280 : i % 3 === 1 ? 200 : 320}
            rounded="lg"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Upload Modal Content ─────────────────────────────────────────────────────

interface UploadFormProps {
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: (items: GalleryItemCard[]) => void;
}

function UploadForm({ categories, onClose, onSuccess }: UploadFormProps): JSX.Element {
  const { upload, uploading: singleUploading } = useCloudinaryUpload("gallery");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const defaultCategoryId = categories[0]?.id ?? "";

  // Warn if no categories available
  const noCategoriesAvailable = categories.length === 0;

  function handleFiles(newFiles: File[]) {
    const mapped: UploadFile[] = newFiles.map((f) => ({
      file: f,
      title: f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      categoryId: defaultCategoryId,
      previewUrl: URL.createObjectURL(f),
      uploading: false,
      uploaded: false,
      cloudinaryUrl: "",
      error: null,
    }));
    setFiles((prev) => [...prev, ...mapped]);
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  }

  function updateFile(index: number, patch: Partial<UploadFile>) {
    setFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  }

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    if (files.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    const createdItems: GalleryItemCard[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const entry = files[i];

      try {
        updateFile(i, { uploading: true, error: null });

        let cloudinaryUrl = entry.cloudinaryUrl;
        if (!cloudinaryUrl) {
          const result = await upload(entry.file);
          cloudinaryUrl = result.url;
          updateFile(i, { cloudinaryUrl });
        }

        const isVideo = entry.file.type.startsWith("video/");

        const effectiveCategoryId = entry.categoryId || categories[0]?.id || "";
        if (!effectiveCategoryId) {
          throw new Error("Please select a category before uploading");
        }

        const res = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: cloudinaryUrl,
            type: isVideo ? "video" : "image",
            title: entry.title || undefined,
            altText: entry.title || entry.file.name,
            categoryId: effectiveCategoryId,
            tags: [],
            downloadEnabled: false,
            year: new Date().getFullYear(),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Upload failed");
        }

        const data = (await res.json()) as { data: GalleryItemCard };
        createdItems.push(data.data);
        updateFile(i, { uploading: false, uploaded: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        updateFile(i, { uploading: false, error: message });
        errors.push(`${entry.file.name}: ${message}`);
      }
    }

    setSubmitting(false);

    if (createdItems.length > 0) {
      onSuccess(createdItems);
      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else if (errors.length > 0) {
      setSubmitError(errors.join("\n"));
    }
  }

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)]/10">
          <ImageIcon size={32} className="text-[var(--color-success)]" aria-hidden="true" />
        </div>
        <p className="text-lg font-semibold text-[var(--color-text-primary)]">
          Uploaded Successfully!
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Your items have been submitted for review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {noCategoriesAvailable && (
        <Alert
          variant="error"
          title="No categories available"
          message="An admin must create at least one gallery category before you can upload."
        />
      )}

      <FileUpload
        accept="image/*,video/*"
        multiple
        maxSizeMb={50}
        onFiles={handleFiles}
        label="Click or drag to add images and videos"
        disabled={submitting || noCategoriesAvailable}
      />

      {files.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </p>

          {files.map((entry, index) => (
            <div
              key={`${entry.file.name}-${index}`}
              className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3"
            >
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--color-bg-elevated)]">
                {entry.file.type.startsWith("image/") ? (
                  <img
                    src={entry.previewUrl}
                    alt={entry.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Video size={24} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
                  </div>
                )}
                {entry.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Spinner size="sm" />
                  </div>
                )}
                {entry.uploaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-success)]/20">
                    <span className="text-lg text-[var(--color-success)]">✓</span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2 min-w-0">
                <input
                  type="text"
                  value={entry.title}
                  onChange={(e) => updateFile(index, { title: e.target.value })}
                  placeholder="Title (optional)"
                  disabled={submitting || entry.uploaded}
                  className={cn(
                    "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)]",
                    "px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                    "focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
                    "disabled:opacity-50"
                  )}
                />

                {categories.length > 0 && (
                  <select
                    value={entry.categoryId}
                    onChange={(e) => updateFile(index, { categoryId: e.target.value })}
                    disabled={submitting || entry.uploaded}
                    className={cn(
                      "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)]",
                      "px-3 py-1.5 text-sm text-[var(--color-text-primary)]",
                      "focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
                      "disabled:opacity-50"
                    )}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}

                {entry.error && (
                  <p className="text-xs text-[var(--color-error)]">{entry.error}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={submitting}
                aria-label={`Remove ${entry.file.name}`}
                className={cn(
                  "flex-shrink-0 self-start rounded-md p-1 text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-error)] transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {submitError && (
        <Alert
          variant="error"
          title="Some uploads failed"
          message={submitError}
          dismissible
          onDismiss={() => setSubmitError(null)}
        />
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className={cn(
            "flex-1 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={files.length === 0 || submitting}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium",
            "bg-[var(--color-accent)] text-[var(--color-bg-base)] transition-opacity",
            "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          {submitting ? (
            <>
              <Spinner size="sm" />
              <span>Uploading…</span>
            </>
          ) : (
            <>
              <Upload size={16} aria-hidden="true" />
              <span>Submit {files.length > 0 ? `${files.length} file${files.length !== 1 ? "s" : ""}` : ""}</span>
            </>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-[var(--color-text-secondary)]">
        Uploads are reviewed before appearing publicly.
      </p>
    </div>
  );
}

// ─── Gallery Item Card ────────────────────────────────────────────────────────

interface GalleryItemTileProps {
  item: GalleryItemCard;
  isPending?: boolean;
  onClick: () => void;
}

function GalleryItemTile({ item, isPending, onClick }: GalleryItemTileProps): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const isVideo = item.type === "video";

  return (
    <div
      className="break-inside-avoid mb-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label={item.title ?? item.altText}
        className={cn(
          "relative overflow-hidden rounded-lg cursor-pointer block w-full",
          "border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
          "transition-transform duration-200",
          hovered && "scale-[1.01]"
        )}
        style={{
          boxShadow: hovered ? "0 0 16px var(--color-glow-accent)" : undefined,
        }}
      >
        <div className="relative w-full aspect-square">
          <Image
            src={item.url}
            alt={item.altText}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />

          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                <Play size={20} className="text-white ml-0.5" fill="white" aria-hidden="true" />
              </div>
            </div>
          )}

          {isPending && (
            <div className="absolute top-2 left-2">
              <Badge variant="warning" size="sm">
                Pending Review
              </Badge>
            </div>
          )}

          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 p-3 transition-transform duration-200",
              "bg-gradient-to-t from-black/80 via-black/40 to-transparent",
              hovered ? "translate-y-0" : "translate-y-full"
            )}
          >
            {item.title && (
              <p className="text-sm font-medium text-white truncate leading-tight mb-1">
                {item.title}
              </p>
            )}

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-white/70">
                {formatDate(item.createdAt, "short")}
              </p>

              {item.uploader && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="relative h-5 w-5 flex-shrink-0 overflow-hidden rounded-full border border-white/30">
                    <Image
                      src={item.uploader.avatarUrl}
                      alt={item.uploader.fullName}
                      fill
                      sizes="20px"
                      className="object-cover"
                    />
                  </div>
                  <span className="text-xs text-white/80 truncate max-w-[80px]">
                    {item.uploader.fullName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Form With Categories Fetcher ────────────────────────────────────

interface UploadFormWithCategoriesProps {
  onClose: () => void;
  onSuccess: (items: GalleryItemCard[]) => void;
}

function UploadFormWithCategories({ onClose, onSuccess }: UploadFormWithCategoriesProps): JSX.Element {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    fetch("/api/gallery/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d?.data) setCategories(d.data);
      })
      .catch(() => {})
      .finally(() => setLoadingCats(false));
  }, []);

  if (loadingCats) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="md" label="Loading categories..." />
      </div>
    );
  }

  return <UploadForm categories={categories} onClose={onClose} onSuccess={onSuccess} />;
}

// ─── Main GalleryGrid ─────────────────────────────────────────────────────────

const DEFAULT_FILTER: GalleryFilter = {
  types: [],
  categories: [],
};

export function GalleryGrid({
  initialItems,
  initialFilter,
  filterOptions,
}: GalleryGridProps): JSX.Element {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [filter, setFilter] = useState<GalleryFilter>(
    initialFilter ?? DEFAULT_FILTER
  );
  const [items, setItems] = useState<GalleryItemCard[]>(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length >= 20);
  const [error, setError] = useState<string | null>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const debouncedFilter = useDebounce(filter, 300);
  const isFirstMount = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const buildQueryString = useCallback((f: GalleryFilter, cursor?: string): string => {
    const params = new URLSearchParams();
    params.set("status", "approved");
    params.set("take", "20");

    if (f.types.length === 1) {
      params.set("type", f.types[0]);
    }
    if (f.categories.length > 0) {
      params.set("categoryId", f.categories[0]);
    }
    if (f.eventId) {
      params.set("eventId", f.eventId);
    }
    if (f.year) {
      params.set("year", String(f.year));
    }
    if (cursor) {
      params.set("cursor", cursor);
    }

    return params.toString();
  }, []);

  const fetchItems = useCallback(
    async (f: GalleryFilter, cursor?: string, append = false) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      if (!append) {
        setInitialLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const qs = buildQueryString(f, cursor);
        const res = await fetch(`/api/gallery?${qs}`, { signal });

        if (!res.ok) {
          throw new Error("Failed to load gallery");
        }

        const data = (await res.json()) as {
          data: GalleryItemCard[];
          nextCursor?: string;
          total: number;
        };

        if (append) {
          setItems((prev) => [...prev, ...data.data]);
        } else {
          setItems(data.data);
          setPendingIds(new Set());
        }

        setNextCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Failed to load gallery items. Please try again.");
      } finally {
        setInitialLoading(false);
        setLoading(false);
      }
    },
    [buildQueryString]
  );

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    fetchItems(debouncedFilter, undefined, false);
  }, [debouncedFilter, fetchItems]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || initialLoading) return;
    fetchItems(debouncedFilter, nextCursor, true);
  }, [hasMore, loading, initialLoading, fetchItems, debouncedFilter, nextCursor]);

  const { ref: sentinelRef } = useInfiniteScroll(loadMore);

  function setTypeFilter(type: string) {
    setFilter((prev) => {
      if (type === "") {
        return { ...prev, types: [] };
      }
      const already = prev.types.includes(type);
      return { ...prev, types: already ? [] : [type] };
    });
  }

  function toggleCategory(catId: string) {
    setFilter((prev) => {
      const already = prev.categories.includes(catId);
      return {
        ...prev,
        categories: already
          ? prev.categories.filter((c) => c !== catId)
          : [...prev.categories, catId],
      };
    });
  }

  function removeCategory(catId: string) {
    setFilter((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== catId),
    }));
  }

  function setEventFilter(eventId: string) {
    setFilter((prev) => ({ ...prev, eventId: eventId || undefined }));
  }

  function setYearFilter(year: string) {
    setFilter((prev) => ({ ...prev, year: year ? Number(year) : undefined }));
  }

  function clearAllFilters() {
    setFilter(DEFAULT_FILTER);
  }

  const hasActiveFilters =
    filter.types.length > 0 ||
    filter.categories.length > 0 ||
    !!filter.eventId ||
    !!filter.year;

  function handleUploadSuccess(newItems: GalleryItemCard[]) {
    setItems((prev) => {
      const combined = [...newItems, ...prev];
      return combined;
    });
    setPendingIds((prev) => {
      const next = new Set(prev);
      newItems.forEach((item) => next.add(item.id));
      return next;
    });
  }

  const activeTypePill =
    filter.types.length === 1 ? filter.types[0] : "";

  const lightboxItems = items.map((item) => ({
    id: item.id,
    url: item.url,
    type: item.type,
    title: item.title ?? undefined,
    altText: item.altText,
    category: item.category,
    uploader: item.uploader ?? undefined,
    createdAt: item.createdAt,
    downloadEnabled: item.downloadEnabled,
    uploaderId: item.uploaderId ?? undefined,
    eventId: item.eventId ?? undefined,
    projectId: item.projectId ?? undefined,
    year: item.year,
  }));

  return (
    <div className="relative min-h-screen">
      {/* ── Filter Bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[var(--color-bg-base)]/90 backdrop-blur-md border-b border-[var(--color-border)] py-4 mb-6">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          {/* Type pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5">
              <Filter size={12} aria-hidden="true" /> Filter:
            </span>

            {[
              { label: "All", value: "" },
              { label: "Images", value: "image" },
              { label: "Videos", value: "video" },
            ].map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  activeTypePill === value || (value === "" && activeTypePill === "")
                    ? "bg-[var(--color-accent)] text-[var(--color-bg-base)]"
                    : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/50"
                )}
              >
                {value === "image" && <ImageIcon size={12} aria-hidden="true" />}
                {value === "video" && <Video size={12} aria-hidden="true" />}
                {label}
              </button>
            ))}

            {/* Event filter */}
            {filterOptions.eventNames.length > 0 && (
              <select
                value={filter.eventId ?? ""}
                onChange={(e) => setEventFilter(e.target.value)}
                aria-label="Filter by event"
                className={cn(
                  "rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
                  "px-3 py-1 text-xs text-[var(--color-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                  "appearance-none cursor-pointer",
                  filter.eventId && "border-[var(--color-accent)] text-[var(--color-accent)]"
                )}
              >
                <option value="">All Events</option>
                {filterOptions.eventNames.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                  </option>
                ))}
              </select>
            )}

            {/* Year filter */}
            {filterOptions.years.length > 0 && (
              <select
                value={filter.year ?? ""}
                onChange={(e) => setYearFilter(e.target.value)}
                aria-label="Filter by year"
                className={cn(
                  "rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
                  "px-3 py-1 text-xs text-[var(--color-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                  "appearance-none cursor-pointer",
                  !!filter.year && "border-[var(--color-accent)] text-[var(--color-accent)]"
                )}
              >
                <option value="">All Years</option>
                {filterOptions.years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-[var(--color-error)]/40 px-2.5 py-1",
                  "text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                <X size={10} aria-hidden="true" />
                Clear all
              </button>
            )}
          </div>

          {/* Category pills */}
          {filterOptions.categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {filterOptions.categories.map((cat) => {
                const active = filter.categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                      active
                        ? "bg-[var(--color-primary)] text-white"
                        : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active filter pills */}
          {(filter.categories.length > 0 || filter.eventId || filter.year) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--color-text-secondary)]">Active:</span>

              {filter.categories.map((catId) => {
                const cat = filterOptions.categories.find((c) => c.id === catId);
                if (!cat) return null;
                return (
                  <span
                    key={catId}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 px-2.5 py-0.5 text-xs text-[var(--color-primary)]"
                  >
                    {cat.name}
                    <button
                      type="button"
                      onClick={() => removeCategory(catId)}
                      aria-label={`Remove ${cat.name} filter`}
                      className="hover:text-white transition-colors focus:outline-none"
                    >
                      <X size={10} aria-hidden="true" />
                    </button>
                  </span>
                );
              })}

              {filter.eventId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-secondary)]/15 border border-[var(--color-accent-secondary)]/30 px-2.5 py-0.5 text-xs text-[var(--color-accent-secondary)]">
                  {filterOptions.eventNames.find((e) => e.id === filter.eventId)?.name ?? "Event"}
                  <button
                    type="button"
                    onClick={() => setEventFilter("")}
                    aria-label="Remove event filter"
                    className="hover:text-white transition-colors focus:outline-none"
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                </span>
              )}

              {filter.year && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-warm)]/15 border border-[var(--color-accent-warm)]/30 px-2.5 py-0.5 text-xs text-[var(--color-accent-warm)]">
                  {filter.year}
                  <button
                    type="button"
                    onClick={() => setYearFilter("")}
                    aria-label="Remove year filter"
                    className="hover:text-white transition-colors focus:outline-none"
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4">
        {error && (
          <Alert
            variant="error"
            title="Failed to load gallery"
            message={error}
            dismissible
            onDismiss={() => setError(null)}
            className="mb-6"
          />
        )}

        {initialLoading ? (
          <GallerySkeleton />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-bg-elevated)]">
              <ImageIcon size={36} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                No items found
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {hasActiveFilters
                  ? "Try adjusting your filters to find more content."
                  : "The gallery is empty right now. Check back later!"}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className={cn(
                  "rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className="columns-2 md:columns-3 lg:columns-4 gap-3"
              aria-label={`Gallery — ${items.length} item${items.length !== 1 ? "s" : ""}`}
            >
              {items.map((item, index) => (
                <GalleryItemTile
                  key={item.id}
                  item={item}
                  isPending={pendingIds.has(item.id)}
                  onClick={() => setLightboxIndex(index)}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div
                ref={sentinelRef}
                className="flex justify-center py-8"
                aria-hidden="true"
              >
                {loading && <Spinner size="md" label="Loading more items..." />}
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
                All {items.length} item{items.length !== 1 ? "s" : ""} loaded
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          items={lightboxItems}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* ── Upload Button ─────────────────────────────────────────────── */}
      {isLoggedIn && (
        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          aria-label="Upload to gallery"
          className={cn(
            "fixed z-30 flex items-center gap-2 rounded-full px-5 py-3 shadow-lg",
            "bg-[var(--color-accent)] text-[var(--color-bg-base)] font-medium text-sm",
            "hover:opacity-90 transition-opacity",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
            // Mobile: above mobile nav; Desktop: bottom-right
            "bottom-24 right-4 md:bottom-8 md:right-6"
          )}
          style={{ boxShadow: "0 0 20px var(--color-glow-accent)" }}
        >
          <Upload size={16} aria-hidden="true" />
          <span>Upload</span>
        </button>
      )}

      {/* ── Upload Modal ──────────────────────────────────────────────── */}
      <Drawer
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload to Gallery"
        side="right"
        width="520px"
      >
        <UploadFormWithCategories
          onClose={() => setUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      </Drawer>
    </div>
  );
}