// src/components/admin/CustomCardsAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Checkbox,
  FormLabel,
  Input,
  Select,
  Textarea,
} from "@/components/ui/Forms";
import { Modal } from "@/components/ui/Overlay";
import {
  Alert,
  Badge,
  Skeleton,
  Spinner,
  toast,
} from "@/components/ui/Feedback";
import { CloudinaryWidget } from "@/components/ui/Media";
import type { CustomCardEntry, CustomCardSection, Json } from "@/types/index";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "events", label: "Events" },
  { value: "projects", label: "Projects" },
  { value: "gallery", label: "Gallery" },
  { value: "feed", label: "Feed" },
  { value: "alumni", label: "Alumni" },
  { value: "instruments", label: "Instruments" },
  { value: "about", label: "About" },
  { value: "membership", label: "Membership" },
  { value: "certificates", label: "Certificates" },
] as const;

const POSITION_OPTIONS = [
  { value: "after_main", label: "After Main Content" },
  { value: "before_footer", label: "Before Footer" },
];

const BUTTON_STYLE_OPTIONS = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "ghost", label: "Ghost" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Inline Rich-Text Editor (dynamic TipTap) ─────────────────────────────────

interface InlineEditorProps {
  value: Json;
  onChange: (v: Json) => void;
  placeholder?: string;
  className?: string;
}

const InlineRichTextEditor = dynamic<InlineEditorProps>(
  async () => {
    const [{ useEditor, EditorContent }, { default: StarterKit }] =
      await Promise.all([
        import("@tiptap/react"),
        import("@tiptap/starter-kit"),
      ]);

    function InlineEditor({
      value,
      onChange,
      placeholder,
      className,
    }: InlineEditorProps) {
      const safeContent: string | Record<string, unknown> =
        typeof value === "string"
          ? value
          : typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : "";

      const editor = useEditor({
        extensions: [StarterKit],
        content: safeContent,
        onUpdate: ({ editor: e }) => {
          onChange(e.getJSON() as Json);
        },
        editorProps: {
          attributes: {
            class: cn(
              "min-h-[60px] px-3 py-2.5 text-sm focus:outline-none",
              "text-[var(--color-text-primary)] leading-relaxed"
            ),
          },
        },
      });

      const isEmpty = !editor?.getText()?.trim();

      return (
        <div
          role="textbox"
          aria-multiline="true"
          className={cn(
            "relative rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)]",
            "focus-within:ring-2 focus-within:ring-[var(--color-accent)] focus-within:border-[var(--color-accent)]",
            "transition-colors cursor-text",
            className
          )}
          onClick={() => editor?.commands.focus()}
        >
          {isEmpty && placeholder && (
            <p
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-2.5 text-sm text-[var(--color-text-secondary)] select-none"
            >
              {placeholder}
            </p>
          )}
          <EditorContent editor={editor} />
        </div>
      );
    }

    return { default: InlineEditor };
  },
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] min-h-[60px] px-3 py-2.5 space-y-2">
        <div className="h-4 w-3/4 rounded bg-[var(--color-bg-surface)] animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-[var(--color-bg-surface)] animate-pulse" />
      </div>
    ),
  }
);

// ─── SWR Fetcher ──────────────────────────────────────────────────────────────

const fetcher = (url: string): Promise<CustomCardSection[]> =>
  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<unknown>;
    })
    .then((d) => {
      if (Array.isArray(d)) return d as CustomCardSection[];
      if (
        d !== null &&
        typeof d === "object" &&
        "data" in d &&
        Array.isArray((d as { data: unknown }).data)
      ) {
        return (d as { data: CustomCardSection[] }).data;
      }
      return [];
    });

// ─── Section Form State ───────────────────────────────────────────────────────

interface SectionFormState {
  heading: string;
  subtitle: string;
  position: string;
  isPublished: boolean;
}

const DEFAULT_SECTION_FORM: SectionFormState = {
  heading: "",
  subtitle: "",
  position: "after_main",
  isPublished: true,
};

// ─── CardRow ──────────────────────────────────────────────────────────────────

interface CardRowProps {
  card: CustomCardEntry;
  index: number;
  sectionId: string;
  isDragOver: boolean;
  onUpdate: (
    sectionId: string,
    cardId: string,
    updates: Partial<CustomCardEntry>
  ) => void;
  onDelete: (sectionId: string, cardId: string) => void;
  onDragStart: (sectionId: string, index: number) => void;
  onDragOver: (
    e: React.DragEvent<HTMLDivElement>,
    sectionId: string,
    index: number
  ) => void;
  onDrop: (sectionId: string, index: number) => void;
  onDragEnd: () => void;
}

function CardRow({
  card,
  index,
  sectionId,
  isDragOver,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: CardRowProps): JSX.Element {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(sectionId, index)}
      onDragOver={(e) => onDragOver(e, sectionId, index)}
      onDrop={() => onDrop(sectionId, index)}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-xl border transition-colors duration-150",
        isDragOver
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 ring-1 ring-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-bg-surface)]"
      )}
    >
      {/* Card header row */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
        <GripVertical
          size={16}
          aria-hidden="true"
          className="text-[var(--color-text-secondary)] cursor-grab active:cursor-grabbing flex-shrink-0"
        />
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          Card {index + 1}
        </span>
        <div className="flex-1" />
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-error)]">Delete?</span>
            <button
              type="button"
              onClick={() => onDelete(sectionId, card.id)}
              className="rounded px-2 py-0.5 text-xs bg-[var(--color-error)]/10 text-[var(--color-error)] hover:bg-[var(--color-error)]/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-error)] transition-colors"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded px-2 py-0.5 text-xs bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label={`Delete card ${index + 1}`}
            className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-colors"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Card fields */}
      <div className="p-3 space-y-3">
        <Input
          label="Heading"
          value={card.heading}
          onChange={(e) =>
            onUpdate(sectionId, card.id, { heading: e.target.value })
          }
          placeholder="Card heading..."
        />

        <div>
          <FormLabel>Description</FormLabel>
          <InlineRichTextEditor
            value={card.description}
            onChange={(v) => onUpdate(sectionId, card.id, { description: v })}
            placeholder="Card description..."
          />
        </div>

        <CloudinaryWidget
          folder="admin/gallery"
          value={card.imageUrl ?? null}
          onChange={(url) =>
            onUpdate(sectionId, card.id, { imageUrl: url || null })
          }
          label="Image (optional)"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Button Label"
            value={card.buttonLabel ?? ""}
            onChange={(e) =>
              onUpdate(sectionId, card.id, {
                buttonLabel: e.target.value || null,
              })
            }
            placeholder="e.g. Learn More"
          />
          <Input
            label="Button URL"
            value={card.buttonUrl ?? ""}
            onChange={(e) =>
              onUpdate(sectionId, card.id, {
                buttonUrl: e.target.value || null,
              })
            }
            placeholder="/page or https://..."
          />
          <Select
            label="Button Style"
            value={card.buttonStyle ?? "primary"}
            onChange={(e) =>
              onUpdate(sectionId, card.id, {
                buttonStyle: e.target.value || null,
              })
            }
            options={BUTTON_STYLE_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  section: CustomCardSection;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (section: CustomCardSection) => void;
  onAddCard: (sectionId: string) => void;
  onUpdateCard: (
    sectionId: string,
    cardId: string,
    updates: Partial<CustomCardEntry>
  ) => void;
  onDeleteCard: (sectionId: string, cardId: string) => void;
  onReorderCards: (
    sectionId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  onPublishToggle: (sectionId: string, isPublished: boolean) => void;
  isPublishToggling: boolean;
}

function SectionCard({
  section,
  isExpanded,
  onToggleExpand,
  onDelete,
  onEdit,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onReorderCards,
  onPublishToggle,
  isPublishToggling,
}: SectionCardProps): JSX.Element {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dragOverCardIdx, setDragOverCardIdx] = useState<number>(-1);
  const dragFromRef = useRef<number>(-1);
  const dragOverRef = useRef<number>(-1);

  const handleDragStart = useCallback(
    (_sid: string, index: number) => {
      dragFromRef.current = index;
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, _sid: string, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragOverRef.current !== index) {
        dragOverRef.current = index;
        setDragOverCardIdx(index);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (_sid: string, _toIndex: number) => {
      const from = dragFromRef.current;
      const to = dragOverRef.current;
      if (from !== -1 && to !== -1 && from !== to) {
        onReorderCards(section.id, from, to);
      }
      dragFromRef.current = -1;
      dragOverRef.current = -1;
      setDragOverCardIdx(-1);
    },
    [onReorderCards, section.id]
  );

  const handleDragEnd = useCallback(() => {
    dragFromRef.current = -1;
    dragOverRef.current = -1;
    setDragOverCardIdx(-1);
  }, []);

  const positionLabel =
    POSITION_OPTIONS.find((p) => p.value === section.position)?.label ??
    section.position;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onToggleExpand(section.id)}
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
          aria-expanded={isExpanded}
          className="flex-shrink-0 rounded p-0.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-colors"
        >
          {isExpanded ? (
            <ChevronDown size={18} aria-hidden="true" />
          ) : (
            <ChevronRight size={18} aria-hidden="true" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate font-[var(--font-heading)]">
            {section.heading ?? "Untitled Section"}
          </h3>
          {section.subtitle && (
            <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
              {section.subtitle}
            </p>
          )}
        </div>

        {/* Meta badges */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <Badge variant="neutral" size="sm">
            {positionLabel}
          </Badge>
          <Badge variant="neutral" size="sm">
            {section.cards.length}{" "}
            {section.cards.length === 1 ? "card" : "cards"}
          </Badge>
        </div>

        {/* Publish toggle */}
        <button
          type="button"
          onClick={() => onPublishToggle(section.id, !section.isPublished)}
          disabled={isPublishToggling}
          aria-label={
            section.isPublished ? "Unpublish section" : "Publish section"
          }
          className={cn(
            "flex items-center gap-1.5 flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            section.isPublished
              ? "bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20"
              : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            isPublishToggling && "opacity-50 cursor-not-allowed"
          )}
        >
          {isPublishToggling ? (
            <Spinner size="sm" label="Updating..." />
          ) : section.isPublished ? (
            <Eye size={12} aria-hidden="true" />
          ) : (
            <EyeOff size={12} aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {section.isPublished ? "Published" : "Draft"}
          </span>
        </button>

        {/* Edit */}
        <button
          type="button"
          onClick={() => onEdit(section)}
          aria-label="Edit section settings"
          className="flex-shrink-0 rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-colors"
        >
          <Edit2 size={14} aria-hidden="true" />
        </button>

        {/* Delete */}
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-[var(--color-error)] whitespace-nowrap">
              Delete section?
            </span>
            <button
              type="button"
              onClick={() => {
                onDelete(section.id);
                setShowDeleteConfirm(false);
              }}
              className="rounded px-2 py-0.5 text-xs bg-[var(--color-error)]/10 text-[var(--color-error)] hover:bg-[var(--color-error)]/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-error)] transition-colors"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded px-2 py-0.5 text-xs bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete section"
            className="flex-shrink-0 rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-colors"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Expanded card list */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-3 space-y-3">
          {section.cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-[var(--color-border)] text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                No cards yet
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Click &quot;Add Card&quot; to add content to this section.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {section.cards.map((card, idx) => (
                <CardRow
                  key={card.id}
                  card={card}
                  index={idx}
                  sectionId={section.id}
                  isDragOver={dragOverCardIdx === idx}
                  onUpdate={onUpdateCard}
                  onDelete={onDeleteCard}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onAddCard(section.id)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm transition-colors",
              "border-[var(--color-border)] text-[var(--color-text-secondary)]",
              "hover:border-[var(--color-accent)]/60 hover:text-[var(--color-text-primary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <Plus size={14} aria-hidden="true" />
            Add Card
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SectionFormModal ─────────────────────────────────────────────────────────

interface SectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SectionFormState) => void;
  initialData: SectionFormState | null;
  isEditing: boolean;
}

function SectionFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing,
}: SectionFormModalProps): JSX.Element {
  const [form, setForm] = useState<SectionFormState>(
    initialData ?? DEFAULT_SECTION_FORM
  );
  const [headingError, setHeadingError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData ?? DEFAULT_SECTION_FORM);
      setHeadingError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = useCallback(() => {
    if (!form.heading.trim()) {
      setHeadingError("Section heading is required.");
      return;
    }
    setHeadingError(null);
    onSave({
      heading: form.heading.trim(),
      subtitle: form.subtitle.trim(),
      position: form.position,
      isPublished: form.isPublished,
    });
  }, [form, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "TEXTAREA" && target.tagName !== "SELECT") {
          e.preventDefault();
          handleSubmit();
        }
      }
    },
    [handleSubmit]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Section" : "Add New Section"}
      size="md"
    >
      <div className="p-6 space-y-5" onKeyDown={handleKeyDown}>
        {headingError && (
          <Alert
            variant="error"
            message={headingError}
            dismissible
            onDismiss={() => setHeadingError(null)}
          />
        )}

        <Input
          label="Section Heading"
          required
          value={form.heading}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, heading: e.target.value }));
            if (e.target.value.trim()) setHeadingError(null);
          }}
          placeholder="e.g. Featured Resources"
          error={headingError ?? undefined}
          autoFocus
        />

        <Input
          label="Subtitle (optional)"
          value={form.subtitle}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, subtitle: e.target.value }))
          }
          placeholder="e.g. Explore our curated tools"
        />

        <Select
          label="Position on Page"
          value={form.position}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, position: e.target.value }))
          }
          options={POSITION_OPTIONS}
        />

        <Checkbox
          label="Publish immediately"
          description="When unchecked, the section will be saved as a draft and hidden from visitors."
          checked={form.isPublished}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, isPublished: e.target.checked }))
          }
        />

        <div className="flex justify-end gap-3 pt-1 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={cn(
              "rounded-xl px-5 py-2 text-sm font-semibold transition-colors",
              "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
            )}
          >
            {isEditing ? "Save Changes" : "Add Section"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── CustomCardsAdmin ─────────────────────────────────────────────────────────

export function CustomCardsAdmin(): JSX.Element {
  const [selectedPage, setSelectedPage] = useState<string>("home");
  const [sections, setSections] = useState<CustomCardSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] =
    useState<CustomCardSection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishTogglingIds, setPublishTogglingIds] = useState<Set<string>>(
    new Set()
  );

  const swrKey = `/api/admin/custom-cards?targetPage=${selectedPage}`;

  const {
    data: fetchedSections,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR<CustomCardSection[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
  });

  // Reset local state when page changes
  useEffect(() => {
    setSections([]);
    setExpandedSections(new Set());
    setSaveError(null);
  }, [selectedPage]);

  // Sync server data to local editable state
  useEffect(() => {
    if (fetchedSections !== undefined) {
      setSections(
        [...fetchedSections].map((s) => ({
          ...s,
          cards: [...(s.cards ?? [])].sort(
            (a, b) => a.sortOrder - b.sortOrder
          ),
        }))
      );
    }
  }, [fetchedSections]);

  const handlePageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedPage(e.target.value);
    },
    []
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Immediate publish toggle via PATCH with optimistic update
  const handlePublishToggle = useCallback(
    async (sectionId: string, isPublished: boolean) => {
      setPublishTogglingIds((prev) => new Set(prev).add(sectionId));

      // Optimistic update
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, isPublished } : s))
      );

      try {
        const res = await fetch(`/api/admin/custom-cards`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId, isPublished }),
        });

        if (!res.ok) {
          // Revert on failure
          setSections((prev) =>
            prev.map((s) =>
              s.id === sectionId ? { ...s, isPublished: !isPublished } : s
            )
          );
          toast("Failed to update publish status.", "error");
        } else {
          toast(
            isPublished ? "Section published." : "Section set to draft.",
            "success"
          );
        }
      } catch {
        // Revert on network error
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId ? { ...s, isPublished: !isPublished } : s
          )
        );
        toast("Network error. Please try again.", "error");
      } finally {
        setPublishTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
      }
    },
    []
  );

  const handleDeleteSection = useCallback((sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  }, []);

  const handleEditSection = useCallback((section: CustomCardSection) => {
    setEditingSection(section);
    setSectionModalOpen(true);
  }, []);

  const handleOpenAddSection = useCallback(() => {
    setEditingSection(null);
    setSectionModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSectionModalOpen(false);
    setEditingSection(null);
  }, []);

  const handleSaveSectionForm = useCallback(
    (data: SectionFormState) => {
      if (editingSection) {
        setSections((prev) =>
          prev.map((s) =>
            s.id === editingSection.id
              ? {
                  ...s,
                  heading: data.heading,
                  subtitle: data.subtitle || null,
                  position: data.position,
                  isPublished: data.isPublished,
                }
              : s
          )
        );
      } else {
        const newId = generateTempId();
        setSections((prev) => [
          ...prev,
          {
            id: newId,
            targetPage: selectedPage,
            heading: data.heading,
            subtitle: data.subtitle || null,
            position: data.position,
            isPublished: data.isPublished,
            sortOrder: prev.length,
            cards: [],
          },
        ]);
        setExpandedSections((prev) => new Set(prev).add(newId));
      }
      setSectionModalOpen(false);
      setEditingSection(null);
    },
    [editingSection, selectedPage]
  );

  const handleAddCard = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          cards: [
            ...s.cards,
            {
              id: generateTempId(),
              heading: "",
              description: null,
              imageUrl: null,
              buttonLabel: null,
              buttonUrl: null,
              buttonStyle: "primary",
              sortOrder: s.cards.length,
            },
          ],
        };
      })
    );
  }, []);

  const handleUpdateCard = useCallback(
    (
      sectionId: string,
      cardId: string,
      updates: Partial<CustomCardEntry>
    ) => {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            cards: s.cards.map((c) =>
              c.id === cardId ? { ...c, ...updates } : c
            ),
          };
        })
      );
    },
    []
  );

  const handleDeleteCard = useCallback(
    (sectionId: string, cardId: string) => {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            cards: s.cards
              .filter((c) => c.id !== cardId)
              .map((c, i) => ({ ...c, sortOrder: i })),
          };
        })
      );
    },
    []
  );

  const handleReorderCards = useCallback(
    (sectionId: string, fromIndex: number, toIndex: number) => {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          const cards = [...s.cards];
          const [moved] = cards.splice(fromIndex, 1);
          cards.splice(toIndex, 0, moved);
          return {
            ...s,
            cards: cards.map((c, i) => ({ ...c, sortOrder: i })),
          };
        })
      );
    },
    []
  );

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Filter out sections with empty headings before saving
      const payload = sections.filter((s) => s.heading?.trim()).map((s, sIdx) => ({
        ...s,
        sortOrder: sIdx,
        cards: s.cards.map((c, cIdx) => ({ ...c, sortOrder: cIdx })),
      }));

      const res = await fetch(`/api/admin/custom-cards`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPage: selectedPage, sections: payload }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        const msg = body.message ?? "Failed to save. Please try again.";
        setSaveError(msg);
        toast(msg, "error");
      } else {
        toast("Custom cards saved successfully.", "success");
        await mutate();
      }
    } catch {
      const msg = "Network error. Please try again.";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  }, [sections, selectedPage, mutate]);

  const sectionFormInitialData: SectionFormState | null = editingSection
    ? {
        heading: editingSection.heading ?? "",
        subtitle: editingSection.subtitle ?? "",
        position: editingSection.position,
        isPublished: editingSection.isPublished,
      }
    : null;

  const selectedPageLabel =
    PAGE_OPTIONS.find((p) => p.value === selectedPage)?.label ?? selectedPage;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--color-border)] shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-heading)]">
            Custom Cards
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Manage custom card sections displayed on public pages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddSection}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium transition-colors",
              "text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)]",
              "hover:border-[var(--color-accent)]/60 hover:text-[var(--color-accent)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <Plus size={14} aria-hidden="true" />
            Add Section
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving || isLoading}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <Spinner size="sm" label="Saving..." />
            ) : (
              <Save size={14} aria-hidden="true" />
            )}
            {isSaving ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      {/* ── Page Selector ── */}
      <div className="flex items-end gap-4 px-6 py-3 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-bg-surface)]">
        <div className="w-56">
          <Select
            label="Target Page"
            value={selectedPage}
            onChange={handlePageChange}
            options={PAGE_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
          />
        </div>
        {!isLoading && !fetchError && (
          <p className="text-sm text-[var(--color-text-secondary)] pb-2">
            {sections.length}{" "}
            {sections.length === 1 ? "section" : "sections"} on this page
          </p>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Save error */}
        {saveError && (
          <Alert
            variant="error"
            title="Save failed"
            message={saveError}
            dismissible
            onDismiss={() => setSaveError(null)}
            className="mb-4"
          />
        )}

        {/* Fetch error */}
        {fetchError && !isLoading && (
          <Alert
            variant="error"
            title="Failed to load sections"
            message="Could not load custom card sections for this page. Please refresh and try again."
            className="mb-4"
          />
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3" aria-label="Loading sections...">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={72} rounded="lg" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && sections.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[320px] text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center mb-4">
              <Plus
                size={28}
                className="text-[var(--color-text-secondary)]"
                aria-hidden="true"
              />
            </div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2 font-[var(--font-heading)]">
              No sections on {selectedPageLabel}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mb-6">
              Add a custom card section to display curated content on the{" "}
              <strong className="text-[var(--color-text-primary)]">
                {selectedPageLabel}
              </strong>{" "}
              page.
            </p>
            <button
              type="button"
              onClick={handleOpenAddSection}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors",
                "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
              )}
            >
              <Plus size={14} aria-hidden="true" />
              Add First Section
            </button>
          </div>
        )}

        {/* Sections list */}
        {!isLoading && !fetchError && sections.length > 0 && (
          <div className="space-y-3">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                isExpanded={expandedSections.has(section.id)}
                onToggleExpand={handleToggleExpand}
                onDelete={handleDeleteSection}
                onEdit={handleEditSection}
                onAddCard={handleAddCard}
                onUpdateCard={handleUpdateCard}
                onDeleteCard={handleDeleteCard}
                onReorderCards={handleReorderCards}
                onPublishToggle={handlePublishToggle}
                isPublishToggling={publishTogglingIds.has(section.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section Form Modal ── */}
      <SectionFormModal
        isOpen={sectionModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveSectionForm}
        initialData={sectionFormInitialData}
        isEditing={!!editingSection}
      />
    </div>
  );
}