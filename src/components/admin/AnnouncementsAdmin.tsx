// src/components/admin/AnnouncementsAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Bell,
  Calendar,
  ChevronDown,
  Edit2,
  Mail,
  Plus,
  Tag,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Megaphone,
  FolderOpen,
  X,
  Check,
} from "lucide-react";

import type { AnnouncementDetail } from "@/types/index";
import { cn, formatDate, parseRichText, truncateText } from "@/lib/utils";
import { Table, Pagination, EmptyState } from "@/components/ui/DataDisplay";
import {
  Badge,
  Alert,
  Skeleton,
  Spinner,
  toast,
} from "@/components/ui/Feedback";
import {
  Modal,
  Drawer,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
} from "@/components/ui/Overlay";

// ─── Dynamic TipTap Import ────────────────────────────────────────────────────

// TipTap editor loaded dynamically to keep admin bundle lean
const TipTapEditor = dynamic(
  () =>
    import("@tiptap/react").then(async (tiptapReact) => {
      const { useEditor, EditorContent } = tiptapReact;
      const { default: StarterKit } = await import("@tiptap/starter-kit");
      const { default: Link } = await import("@tiptap/extension-link");
      const { default: Underline } = await import(
        "@tiptap/extension-underline"
      );

      function TipTapEditorInner({
        content,
        onChange,
        placeholder,
      }: {
        content: unknown;
        onChange: (json: unknown) => void;
        placeholder?: string;
      }) {
        const editor = useEditor({
          extensions: [
            StarterKit,
            Link.configure({ openOnClick: false }),
            Underline,
          ],
          content: content as object,
          onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
          },
        });

        if (!editor) {
          return (
            <div className="min-h-[200px] rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] animate-pulse" />
          );
        }

        const btnBase = cn(
          "p-1.5 rounded text-xs font-medium transition-colors",
          "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
          "hover:bg-[var(--color-bg-elevated)]",
          "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        );
        const btnActive = cn(
          btnBase,
          "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
        );

        return (
          <div className="rounded-lg border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-surface)]">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                aria-label="Bold"
                className={editor.isActive("bold") ? btnActive : btnBase}
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                aria-label="Italic"
                className={editor.isActive("italic") ? btnActive : btnBase}
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                aria-label="Underline"
                className={editor.isActive("underline") ? btnActive : btnBase}
              >
                <u>U</u>
              </button>
              <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
              <button
                type="button"
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                aria-label="Heading 2"
                className={
                  editor.isActive("heading", { level: 2 }) ? btnActive : btnBase
                }
              >
                H2
              </button>
              <button
                type="button"
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                aria-label="Heading 3"
                className={
                  editor.isActive("heading", { level: 3 }) ? btnActive : btnBase
                }
              >
                H3
              </button>
              <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
              <button
                type="button"
                onClick={() =>
                  editor.chain().focus().toggleBulletList().run()
                }
                aria-label="Bullet list"
                className={
                  editor.isActive("bulletList") ? btnActive : btnBase
                }
              >
                • List
              </button>
              <button
                type="button"
                onClick={() =>
                  editor.chain().focus().toggleOrderedList().run()
                }
                aria-label="Ordered list"
                className={
                  editor.isActive("orderedList") ? btnActive : btnBase
                }
              >
                1. List
              </button>
              <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
              <button
                type="button"
                onClick={() =>
                  editor.chain().focus().toggleBlockquote().run()
                }
                aria-label="Blockquote"
                className={
                  editor.isActive("blockquote") ? btnActive : btnBase
                }
              >
                " Quote
              </button>
            </div>
            {/* Editor Content */}
            <EditorContent
              editor={editor}
              className={cn(
                "min-h-[200px] p-4 text-sm text-[var(--color-text-primary)]",
                "prose prose-invert max-w-none",
                "focus-within:outline-none",
                "[&_.ProseMirror]:outline-none",
                "[&_.ProseMirror]:min-h-[160px]",
                "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
                "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[var(--color-text-secondary)]",
                "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
                "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
              )}
              {...(placeholder
                ? {
                    "data-placeholder": placeholder,
                  }
                : {})}
            />
          </div>
        );
      }

      return TipTapEditorInner;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] animate-pulse flex items-center justify-center">
        <Spinner size="md" label="Loading editor..." />
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnnouncementCategory {
  id: string;
  name: string;
  color: string;
}

interface AnnouncementRow {
  id: string;
  title: string;
  excerpt: string;
  category: { id: string; name: string; color: string };
  isPublished: boolean;
  expiresAt: string | null;
  createdAt: string;
  content: unknown;
}

interface AnnouncementFormState {
  title: string;
  content: unknown;
  excerpt: string;
  categoryId: string;
  expiresAt: string;
  isPublished: boolean;
  sendEmail: boolean;
}

type ActiveTab = "announcements" | "categories";

const EMPTY_FORM: AnnouncementFormState = {
  title: "",
  content: { type: "doc", content: [{ type: "paragraph" }] },
  excerpt: "",
  categoryId: "",
  expiresAt: "",
  isPublished: false,
  sendEmail: false,
};

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(
      (err as { message?: string }).message ?? "Request failed"
    );
  }
  return res.json() as Promise<T>;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function getAnnouncementStatus(
  row: AnnouncementRow
): "active" | "expired" | "draft" {
  if (!row.isPublished) return "draft";
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return "expired";
  return "active";
}

function StatusBadge({ row }: { row: AnnouncementRow }): JSX.Element {
  const status = getAnnouncementStatus(row);
  const map = {
    active: { variant: "success" as const, label: "Active" },
    expired: { variant: "error" as const, label: "Expired" },
    draft: { variant: "neutral" as const, label: "Draft" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Published Toggle ─────────────────────────────────────────────────────────

function PublishedToggle({
  row,
  onToggle,
}: {
  row: AnnouncementRow;
  onToggle: (id: string, val: boolean) => void;
}): JSX.Element {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await onToggle(row.id, !row.isPublished);
    setLoading(false);
  }

  if (loading) return <Spinner size="sm" />;

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={row.isPublished ? "Unpublish" : "Publish"}
      className={cn(
        "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
        row.isPublished
          ? "text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
      )}
    >
      {row.isPublished ? (
        <ToggleRight size={16} aria-hidden="true" />
      ) : (
        <ToggleLeft size={16} aria-hidden="true" />
      )}
      {row.isPublished ? "Published" : "Draft"}
    </button>
  );
}

// ─── Category Manager ─────────────────────────────────────────────────────────

function CategoryManager(): JSX.Element {
  const { data, error, mutate } = useSWR<{ data: AnnouncementCategory[] }>(
    "/api/admin/announcements-categories",
    fetcher
  );

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#00E5FF");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const categories = data?.data ?? [];

  async function handleCreate() {
    if (!newName.trim()) {
      setFormError("Category name is required.");
      return;
    }
    setCreating(true);
    setFormError("");
    try {
      const res = await fetch("/api/admin/announcements-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message ?? "Failed to create category"
        );
      }
      setNewName("");
      setNewColor("#00E5FF");
      await mutate();
      toast("Category created.", "success");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create category."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/announcements-categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete category.");
      await mutate();
      toast("Category deleted.", "success");
    } catch {
      toast("Failed to delete category.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (error) {
    return (
      <Alert
        variant="error"
        message="Failed to load categories. Please refresh."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label
            htmlFor="cat-name"
            className="block text-xs font-medium text-[var(--color-text-secondary)]"
          >
            Category Name
          </label>
          <input
            id="cat-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Academic, Club Activity"
            className={cn(
              "w-full px-3 py-2 rounded-lg text-sm",
              "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
              "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
              "transition-colors"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="cat-color"
            className="block text-xs font-medium text-[var(--color-text-secondary)]"
          >
            Color
          </label>
          <input
            id="cat-color"
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-10 h-9 rounded-lg border border-[var(--color-border)] cursor-pointer bg-[var(--color-bg-surface)] p-1"
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {creating ? <Spinner size="sm" /> : <Plus size={15} />}
          Add
        </button>
      </div>

      {formError && (
        <Alert variant="error" message={formError} dismissible onDismiss={() => setFormError("")} />
      )}

      {!data ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={44} className="w-full rounded-lg" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon="Tag"
          heading="No categories yet"
          description="Add your first announcement category above."
        />
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--color-text-primary)] font-medium">
                  {cat.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
                aria-label={`Delete ${cat.name}`}
                className={cn(
                  "p-1.5 rounded-lg text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {deletingId === cat.id ? (
                  <Spinner size="sm" />
                ) : (
                  <Trash2 size={14} aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Announcement Form ────────────────────────────────────────────────────────

interface AnnouncementFormProps {
  initialData?: AnnouncementRow | null;
  categories: AnnouncementCategory[];
  totalActiveMembers: number;
  onClose: () => void;
  onSaved: () => void;
}

function AnnouncementForm({
  initialData,
  categories,
  totalActiveMembers,
  onClose,
  onSaved,
}: AnnouncementFormProps): JSX.Element {
  const isEdit = !!initialData;

  const [form, setForm] = useState<AnnouncementFormState>(() => {
    if (initialData) {
      const expiresAtFormatted = initialData.expiresAt
        ? new Date(initialData.expiresAt).toISOString().slice(0, 16)
        : "";
      return {
        title: initialData.title,
        content: initialData.content,
        excerpt: initialData.excerpt,
        categoryId: initialData.category.id,
        expiresAt: expiresAtFormatted,
        isPublished: initialData.isPublished,
        sendEmail: false,
      };
    }
    return { ...EMPTY_FORM };
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AnnouncementFormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [serverError, setServerError] = useState("");

  function updateField<K extends keyof AnnouncementFormState>(
    key: K,
    value: AnnouncementFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleContentChange(json: unknown) {
    const plainText = parseRichText(json);
    updateField("content", json);
    updateField("excerpt", truncateText(plainText, 160));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof AnnouncementFormState, string>> = {};
    if (!form.title.trim()) newErrors.title = "Title is required.";
    if (!form.categoryId) newErrors.categoryId = "Category is required.";
    const contentStr = JSON.stringify(form.content ?? {});
    const hasContent =
      contentStr !== '{"type":"doc","content":[{"type":"paragraph"}]}' &&
      contentStr !== '{"type":"doc","content":[]}' &&
      contentStr !== "{}";
    if (!hasContent) newErrors.content = "Content is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    // Show email confirmation if sendEmail is checked
    if (form.sendEmail && form.isPublished && !isEdit && !showEmailConfirm) {
      setShowEmailConfirm(true);
      return;
    }

    setShowEmailConfirm(false);
    setSubmitting(true);
    setServerError("");

    const payload = {
      title: form.title.trim(),
      content: form.content,
      excerpt: form.excerpt,
      categoryId: form.categoryId,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      isPublished: form.isPublished,
      sendEmail: form.sendEmail,
    };

    try {
      const url = isEdit
        ? `/api/announcements/${initialData!.id}`
        : "/api/announcements";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message ?? "Save failed."
        );
      }

      toast(
        isEdit ? "Announcement updated." : "Announcement created.",
        "success"
      );
      onSaved();
      onClose();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "An error occurred."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = (hasError?: boolean) =>
    cn(
      "w-full px-3 py-2 rounded-lg text-sm",
      "bg-[var(--color-bg-surface)] border",
      hasError
        ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
        : "border-[var(--color-border)] focus:ring-[var(--color-accent)]",
      "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
      "focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
    );

  const labelCls = "block text-xs font-medium text-[var(--color-text-secondary)] mb-1";
  const errorCls = "text-xs text-[var(--color-error)] mt-1";

  return (
    <div className="p-6 space-y-5">
      {serverError && (
        <Alert
          variant="error"
          message={serverError}
          dismissible
          onDismiss={() => setServerError("")}
        />
      )}

      {/* Email Confirmation Banner */}
      {showEmailConfirm && (
        <div
          className={cn(
            "rounded-xl p-4 border flex items-start gap-3",
            "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30"
          )}
        >
          <AlertTriangle
            size={18}
            className="text-[var(--color-warning)] flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-warning)] mb-1">
              Confirm Email Broadcast
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              This will send an email notification to{" "}
              <strong className="text-[var(--color-text-primary)]">
                {totalActiveMembers} active member
                {totalActiveMembers !== 1 ? "s" : ""}
              </strong>
              . This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium",
                  "bg-[var(--color-warning)] text-black",
                  "hover:opacity-90 transition-opacity",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-warning)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {submitting ? <Spinner size="sm" /> : <Mail size={14} />}
                Yes, Send Email & Publish
              </button>
              <button
                type="button"
                onClick={() => setShowEmailConfirm(false)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                  "hover:bg-[var(--color-bg-elevated)] transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="ann-title" className={labelCls}>
          Title <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="ann-title"
          type="text"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Announcement title"
          className={inputCls(!!errors.title)}
          aria-describedby={errors.title ? "ann-title-err" : undefined}
        />
        {errors.title && (
          <p id="ann-title-err" className={errorCls}>
            {errors.title}
          </p>
        )}
      </div>

      {/* Content */}
      <div>
        <label className={labelCls}>
          Content <span className="text-[var(--color-error)]">*</span>
        </label>
        <TipTapEditor
          content={form.content}
          onChange={handleContentChange}
          placeholder="Write your announcement content here..."
        />
        {errors.content && (
          <p className={errorCls}>{errors.content}</p>
        )}
      </div>

      {/* Excerpt (auto-generated) */}
      <div>
        <label htmlFor="ann-excerpt" className={labelCls}>
          Excerpt{" "}
          <span className="text-[var(--color-text-secondary)] font-normal">
            (auto-generated, editable)
          </span>
        </label>
        <textarea
          id="ann-excerpt"
          value={form.excerpt}
          onChange={(e) => updateField("excerpt", e.target.value)}
          placeholder="Short excerpt shown in lists and emails…"
          rows={2}
          maxLength={160}
          className={cn(inputCls(), "resize-none")}
        />
        <p className="text-right text-xs text-[var(--color-text-secondary)] mt-0.5">
          {form.excerpt.length}/160
        </p>
      </div>

      {/* Row: Category + Expiry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Category */}
        <div>
          <label htmlFor="ann-category" className={labelCls}>
            Category <span className="text-[var(--color-error)]">*</span>
          </label>
          <div className="relative">
            <select
              id="ann-category"
              value={form.categoryId}
              onChange={(e) => updateField("categoryId", e.target.value)}
              className={cn(inputCls(!!errors.categoryId), "pr-8 appearance-none")}
              aria-describedby={errors.categoryId ? "ann-cat-err" : undefined}
            >
              <option value="">Select category…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
              aria-hidden="true"
            />
          </div>
          {errors.categoryId && (
            <p id="ann-cat-err" className={errorCls}>
              {errors.categoryId}
            </p>
          )}
        </div>

        {/* Expiry Date */}
        <div>
          <label htmlFor="ann-expiry" className={labelCls}>
            Expiry Date{" "}
            <span className="text-[var(--color-text-secondary)] font-normal">
              (optional)
            </span>
          </label>
          <input
            id="ann-expiry"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => updateField("expiresAt", e.target.value)}
            className={inputCls()}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Published */}
        <button
          type="button"
          role="switch"
          aria-checked={form.isPublished}
          onClick={() => updateField("isPublished", !form.isPublished)}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-medium",
            "border transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            form.isPublished
              ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]"
              : "bg-[var(--color-bg-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
          )}
        >
          {form.isPublished ? (
            <ToggleRight size={18} aria-hidden="true" />
          ) : (
            <ToggleLeft size={18} aria-hidden="true" />
          )}
          {form.isPublished ? "Published" : "Draft"}
        </button>

        {/* Send Email */}
        {!isEdit && (
          <button
            type="button"
            role="switch"
            aria-checked={form.sendEmail}
            onClick={() => updateField("sendEmail", !form.sendEmail)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-medium",
              "border transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              form.sendEmail
                ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]"
                : "bg-[var(--color-bg-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
            )}
          >
            <Mail size={16} aria-hidden="true" />
            Send Email to All Members
          </button>
        )}
      </div>

      {form.sendEmail && !isEdit && (
        <Alert
          variant="info"
          message={`An email notification will be sent to ${totalActiveMembers} active member${totalActiveMembers !== 1 ? "s" : ""} when you publish this announcement.`}
        />
      )}

      {/* Footer Buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className={cn(
            "px-5 py-2 rounded-lg text-sm font-medium",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-elevated)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || showEmailConfirm}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {submitting ? (
            <Spinner size="sm" />
          ) : isEdit ? (
            <Check size={15} />
          ) : (
            <Plus size={15} />
          )}
          {isEdit ? "Save Changes" : "Create Announcement"}
        </button>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

interface DeleteConfirmProps {
  announcement: AnnouncementRow | null;
  onConfirm: (id: string) => Promise<void>;
  onClose: () => void;
}

function DeleteConfirmModal({
  announcement,
  onConfirm,
  onClose,
}: DeleteConfirmProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    if (!announcement) return;
    setDeleting(true);
    await onConfirm(announcement.id);
    setDeleting(false);
    onClose();
  }

  return (
    <Modal
      isOpen={!!announcement}
      onClose={onClose}
      title="Delete Announcement"
      size="sm"
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Are you sure you want to permanently delete{" "}
          <strong className="text-[var(--color-text-primary)]">
            "{announcement?.title}"
          </strong>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "hover:bg-[var(--color-bg-elevated)] transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "disabled:opacity-50"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-[var(--color-error)] text-white",
              "hover:opacity-90 transition-opacity",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {deleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export function AnnouncementsAdmin(): JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>("announcements");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AnnouncementRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<AnnouncementRow | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Build SWR key
  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set("all", "true");
    params.set("take", String(PAGE_SIZE));
    params.set("skip", String((page - 1) * PAGE_SIZE));
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `/api/announcements?${params.toString()}`;
  }, [page, debouncedSearch]);

  const {
    data: announcementsData,
    error: announcementsError,
    mutate: mutateAnnouncements,
    isLoading,
  } = useSWR<{ data: AnnouncementRow[]; total: number }>(swrKey, fetcher);

  const { data: categoriesData } = useSWR<{
    data: AnnouncementCategory[];
  }>("/api/admin/announcements-categories", fetcher);

  // Fetch total active member count for email broadcast confirmation
  const { data: memberCountData } = useSWR<{ total: number }>(
    "/api/members?status=active&take=1&select=count",
    fetcher
  );

  const announcements: AnnouncementRow[] = announcementsData?.data ?? [];
  const total = announcementsData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const categories: AnnouncementCategory[] = categoriesData?.data ?? [];
  const totalActiveMembers = memberCountData?.total ?? 0;

  // Handlers

  const handlePublishToggle = useCallback(
    async (id: string, newValue: boolean) => {
      // Optimistic update
      await mutateAnnouncements(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((row) =>
              row.id === id ? { ...row, isPublished: newValue } : row
            ),
          };
        },
        false
      );

      try {
        const res = await fetch(`/api/announcements/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: newValue }),
        });
        if (!res.ok) throw new Error("Toggle failed");
        toast(
          newValue ? "Announcement published." : "Announcement unpublished.",
          "success"
        );
      } catch {
        // Revert
        await mutateAnnouncements();
        toast("Failed to update publish status.", "error");
      }
    },
    [mutateAnnouncements]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/announcements/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");
        await mutateAnnouncements();
        toast("Announcement deleted.", "success");
      } catch {
        toast("Failed to delete announcement.", "error");
      }
    },
    [mutateAnnouncements]
  );

  function openCreate() {
    setEditingRow(null);
    setFormOpen(true);
  }

  function openEdit(row: AnnouncementRow) {
    setEditingRow(row);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingRow(null);
  }

  function onSaved() {
    mutateAnnouncements();
  }

  // Table columns

  const columns = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        sortable: false,
        render: (row: AnnouncementRow) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[280px]">
              {row.title}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] truncate max-w-[280px] mt-0.5">
              {row.excerpt}
            </p>
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        sortable: false,
        render: (row: AnnouncementRow) => (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
            style={{
              color: row.category.color,
              backgroundColor: `${row.category.color}18`,
              borderColor: `${row.category.color}30`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: row.category.color }}
              aria-hidden="true"
            />
            {row.category.name}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Published",
        sortable: false,
        render: (row: AnnouncementRow) => (
          <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
            {formatDate(row.createdAt, "short")}
          </span>
        ),
      },
      {
        key: "expiresAt",
        header: "Expiry",
        sortable: false,
        render: (row: AnnouncementRow) => {
          if (!row.expiresAt) {
            return (
              <span className="text-xs text-[var(--color-text-secondary)]">
                Never
              </span>
            );
          }
          const isExpired = new Date(row.expiresAt) < new Date();
          return (
            <span
              className={cn(
                "text-xs whitespace-nowrap",
                isExpired
                  ? "text-[var(--color-error)] font-medium"
                  : "text-[var(--color-text-secondary)]"
              )}
            >
              {formatDate(row.expiresAt, "short")}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        sortable: false,
        render: (row: AnnouncementRow) => <StatusBadge row={row} />,
      },
      {
        key: "isPublished",
        header: "Visibility",
        sortable: false,
        render: (row: AnnouncementRow) => (
          <PublishedToggle row={row} onToggle={handlePublishToggle} />
        ),
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        align: "right" as const,
        render: (row: AnnouncementRow) => (
          <DropdownMenu
            trigger={
              <button
                type="button"
                aria-label="More actions"
                className={cn(
                  "p-1.5 rounded-lg text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-colors"
                )}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="3" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>
            }
            align="right"
          >
            <DropdownMenuItem
              icon={<Edit2 size={14} />}
              onClick={() => openEdit(row)}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuDivider />
            <DropdownMenuItem
              variant="danger"
              icon={<Trash2 size={14} />}
              onClick={() => setDeletingRow(row)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenu>
        ),
      },
    ],
    [handlePublishToggle]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Announcements
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Manage club announcements and notifications
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "shadow-[0_0_16px_var(--color-glow-primary)]"
          )}
        >
          <Plus size={16} aria-hidden="true" />
          Add Announcement
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)] w-fit">
        {(
          [
            { id: "announcements", label: "Announcements", icon: Megaphone },
            { id: "categories", label: "Categories", icon: FolderOpen },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              activeTab === id
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
            aria-pressed={activeTab === id}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Announcements Tab */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative w-full sm:max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements…"
              className={cn(
                "w-full pl-9 pr-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
                "transition-colors"
              )}
              aria-label="Search announcements"
            />
          </div>

          {/* Error */}
          {announcementsError && (
            <Alert
              variant="error"
              message="Failed to load announcements. Please refresh the page."
            />
          )}

          {/* Table */}
          <Table<AnnouncementRow>
            columns={columns}
            data={announcements}
            loading={isLoading}
            skeletonRows={8}
            emptyMessage={
              debouncedSearch
                ? `No announcements match "${debouncedSearch}".`
                : "No announcements yet. Create your first announcement."
            }
            striped
            rowKey={(row) => row.id}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--color-text-secondary)]">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)} of {total}
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
        <div
          className={cn(
            "rounded-xl border border-[var(--color-border)] p-6",
            "bg-[var(--color-bg-surface)]"
          )}
        >
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1 font-[var(--font-heading)]">
            Announcement Categories
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Manage categories used to classify announcements.
          </p>
          <CategoryManager />
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingRow ? "Edit Announcement" : "New Announcement"}
        size="lg"
      >
        <AnnouncementForm
          key={editingRow?.id ?? "create"}
          initialData={editingRow}
          categories={categories}
          totalActiveMembers={totalActiveMembers}
          onClose={closeForm}
          onSaved={onSaved}
        />
      </Modal>

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        announcement={deletingRow}
        onConfirm={handleDelete}
        onClose={() => setDeletingRow(null)}
      />
    </div>
  );
}