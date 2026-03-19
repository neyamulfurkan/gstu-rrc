// src/components/admin/forms/ProjectForm.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Plus, X, ChevronDown, Search, Loader2 } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { projectSchema, type ProjectSchemaInput } from "@/lib/validations";
import { generateSlug, cn } from "@/lib/utils";
import {
  Input,
  Textarea,
  Select,
  Checkbox,
  FormLabel,
  FormError,
} from "@/components/ui/Forms";
import { Alert, Badge, Spinner } from "@/components/ui/Feedback";
import { CloudinaryWidget } from "@/components/ui/Media";
import { useMemberSearch } from "@/hooks/useMemberSearch";
import type { ProjectDetail } from "@/types/index";

// ─── Dynamic TipTap ───────────────────────────────────────────────────────────

const TipTapEditor = dynamic(
  () =>
    import("@tiptap/react").then(async (tiptap) => {
      const { useEditor, EditorContent } = tiptap;
      const { default: StarterKit } = await import("@tiptap/starter-kit");

      function TipTap({
        value,
        onChange,
      }: {
        value: unknown;
        onChange: (val: unknown) => void;
      }) {
        const editor = useEditor({
          extensions: [StarterKit],
          content:
            value && typeof value === "object" ? (value as object) : "",
          onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
          },
        });

        useEffect(() => {
          return () => {
            editor?.destroy();
          };
        }, [editor]);

        return (
          <div
            className={cn(
              "min-h-[200px] rounded-lg border border-[var(--color-border)]",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
              "prose prose-invert max-w-none",
              "[&_.ProseMirror]:min-h-[180px] [&_.ProseMirror]:p-3 [&_.ProseMirror]:outline-none",
              "[&_.ProseMirror:focus]:ring-2 [&_.ProseMirror:focus]:ring-[var(--color-accent)]",
              "[&_.ProseMirror:focus]:ring-inset"
            )}
          >
            {editor && (
              <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] p-2">
                {(
                  [
                    {
                      label: "B",
                      action: () =>
                        editor.chain().focus().toggleBold().run(),
                      active: editor.isActive("bold"),
                      title: "Bold",
                    },
                    {
                      label: "I",
                      action: () =>
                        editor.chain().focus().toggleItalic().run(),
                      active: editor.isActive("italic"),
                      title: "Italic",
                    },
                    {
                      label: "H2",
                      action: () =>
                        editor
                          .chain()
                          .focus()
                          .toggleHeading({ level: 2 })
                          .run(),
                      active: editor.isActive("heading", { level: 2 }),
                      title: "Heading 2",
                    },
                    {
                      label: "H3",
                      action: () =>
                        editor
                          .chain()
                          .focus()
                          .toggleHeading({ level: 3 })
                          .run(),
                      active: editor.isActive("heading", { level: 3 }),
                      title: "Heading 3",
                    },
                    {
                      label: "UL",
                      action: () =>
                        editor.chain().focus().toggleBulletList().run(),
                      active: editor.isActive("bulletList"),
                      title: "Bullet List",
                    },
                    {
                      label: "OL",
                      action: () =>
                        editor.chain().focus().toggleOrderedList().run(),
                      active: editor.isActive("orderedList"),
                      title: "Ordered List",
                    },
                  ] as const
                ).map((btn) => (
                  <button
                    key={btn.title}
                    type="button"
                    title={btn.title}
                    onClick={btn.action}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                      btn.active
                        ? "bg-[var(--color-accent)] text-[var(--color-bg-base)]"
                        : "bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
            <EditorContent editor={editor} />
          </div>
        );
      }

      return TipTap;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-48 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <Spinner size="md" label="Loading editor…" />
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectedMember {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string;
}

interface MilestoneDraft {
  date: string;
  title: string;
  description: string;
}

interface ProjectFormProps {
  initialData?: Partial<ProjectDetail>;
  categories: Array<{ id: string; name: string }>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

// ─── TeamMemberSearch ─────────────────────────────────────────────────────────

interface TeamMemberSearchProps {
  selected: SelectedMember[];
  onAdd: (member: SelectedMember) => void;
  onRemove: (id: string) => void;
}

function TeamMemberSearch({
  selected,
  onAdd,
  onRemove,
}: TeamMemberSearchProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { members, isLoading } = useMemberSearch(query);

  const filteredMembers = members.filter(
    (m) => !selected.some((s) => s.id === m.id)
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (member: SelectedMember) => {
      onAdd(member);
      setQuery("");
      setIsOpen(false);
    },
    [onAdd]
  );

  return (
    <div ref={containerRef} className="w-full space-y-2">
      <FormLabel>Team Members</FormLabel>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((member) => (
            <div
              key={member.id}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-[var(--color-border)]",
                "bg-[var(--color-bg-elevated)] py-1 pl-1.5 pr-2 text-xs"
              )}
            >
              <div className="relative h-5 w-5 overflow-hidden rounded-full flex-shrink-0">
                <Image
                  src={member.avatarUrl}
                  alt={member.fullName}
                  fill
                  sizes="20px"
                  className="object-cover"
                  unoptimized={member.avatarUrl.startsWith("data:")}
                />
              </div>
              <span className="text-[var(--color-text-primary)] max-w-[120px] truncate">
                {member.fullName}
              </span>
              <button
                type="button"
                onClick={() => onRemove(member.id)}
                aria-label={`Remove ${member.fullName}`}
                className={cn(
                  "rounded-full text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-error)] transition-colors",
                  "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                )}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search members by name or username…"
            autoComplete="off"
            className={cn(
              "block w-full rounded-lg py-2 pl-8 pr-3 text-sm",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
              "border border-[var(--color-border)]",
              "placeholder:text-[var(--color-text-secondary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
              "transition-colors duration-150"
            )}
          />
          {isLoading && (
            <Spinner
              size="sm"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
          )}
        </div>

        {isOpen && query.trim().length >= 2 && (
          <div
            className={cn(
              "absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-[var(--color-border)]",
              "bg-[var(--color-bg-elevated)] shadow-lg"
            )}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner size="sm" label="Searching…" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <p className="py-3 text-center text-sm text-[var(--color-text-secondary)]">
                No members found
              </p>
            ) : (
              <ul role="listbox" aria-label="Member search results">
                {filteredMembers.map((member) => (
                  <li key={member.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => handleSelect(member)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm",
                        "hover:bg-[var(--color-bg-surface)] transition-colors",
                        "focus:outline-none focus:bg-[var(--color-bg-surface)]"
                      )}
                    >
                      <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={member.avatarUrl}
                          alt={member.fullName}
                          fill
                          sizes="28px"
                          className="object-cover"
                          unoptimized={member.avatarUrl.startsWith("data:")}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--color-text-primary)]">
                          {member.fullName}
                        </p>
                        <p className="truncate text-xs text-[var(--color-text-secondary)]">
                          @{member.username}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TechnologyTagInput ───────────────────────────────────────────────────────

interface TechnologyTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

function TechnologyTagInput({
  value,
  onChange,
}: TechnologyTagInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState("");

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      if (value.includes(trimmed)) return;
      onChange([...value, trimmed]);
      setInputValue("");
    },
    [value, onChange]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag));
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        removeTag(value[value.length - 1]);
      }
    },
    [addTag, inputValue, removeTag, value]
  );

  return (
    <div className="w-full space-y-2">
      <FormLabel>Technologies</FormLabel>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20"
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
                className={cn(
                  "ml-0.5 rounded-full text-[var(--color-accent)]/70",
                  "hover:text-[var(--color-accent)] transition-colors",
                  "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                )}
              >
                <X size={10} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) addTag(inputValue);
        }}
        placeholder="Type a technology and press Enter…"
        className={cn(
          "block w-full rounded-lg px-3 py-2 text-sm",
          "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
          "border border-[var(--color-border)]",
          "placeholder:text-[var(--color-text-secondary)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
          "transition-colors duration-150"
        )}
      />
      <p className="text-xs text-[var(--color-text-secondary)]">
        Press Enter or comma to add a technology tag
      </p>
    </div>
  );
}

// ─── MilestonesEditor ─────────────────────────────────────────────────────────

interface MilestonesEditorProps {
  value: MilestoneDraft[];
  onChange: (milestones: MilestoneDraft[]) => void;
}

function MilestonesEditor({
  value,
  onChange,
}: MilestonesEditorProps): JSX.Element {
  const addMilestone = useCallback(() => {
    onChange([...value, { date: "", title: "", description: "" }]);
  }, [value, onChange]);

  const removeMilestone = useCallback(
    (index: number) => {
      const updated = [...value];
      updated.splice(index, 1);
      onChange(updated);
    },
    [value, onChange]
  );

  const updateMilestone = useCallback(
    (index: number, field: keyof MilestoneDraft, val: string) => {
      const updated = value.map((m, i) =>
        i === index ? { ...m, [field]: val } : m
      );
      onChange(updated);
    },
    [value, onChange]
  );

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <FormLabel className="mb-0">Milestones</FormLabel>
        <button
          type="button"
          onClick={addMilestone}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
            "bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
            "hover:bg-[var(--color-accent)]/20 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <Plus size={12} aria-hidden="true" />
          Add Milestone
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] italic">
          No milestones added yet.
        </p>
      ) : (
        <div className="space-y-3">
          {value.map((milestone, index) => (
            <div
              key={index}
              className={cn(
                "relative rounded-xl border border-[var(--color-border)]",
                "bg-[var(--color-bg-surface)] p-4"
              )}
            >
              <button
                type="button"
                onClick={() => removeMilestone(index)}
                aria-label={`Remove milestone ${index + 1}`}
                className={cn(
                  "absolute right-3 top-3 rounded p-0.5",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                <X size={14} aria-hidden="true" />
              </button>
              <p className="mb-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                Milestone {index + 1}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FormLabel htmlFor={`milestone-${index}-date`}>
                    Date
                  </FormLabel>
                  <input
                    id={`milestone-${index}-date`}
                    type="text"
                    value={milestone.date}
                    onChange={(e) =>
                      updateMilestone(index, "date", e.target.value)
                    }
                    placeholder="e.g. March 2024"
                    className={cn(
                      "block w-full rounded-lg px-3 py-2 text-sm",
                      "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                      "border border-[var(--color-border)]",
                      "placeholder:text-[var(--color-text-secondary)]",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                      "transition-colors duration-150"
                    )}
                  />
                </div>
                <div>
                  <FormLabel htmlFor={`milestone-${index}-title`}>
                    Title
                  </FormLabel>
                  <input
                    id={`milestone-${index}-title`}
                    type="text"
                    value={milestone.title}
                    onChange={(e) =>
                      updateMilestone(index, "title", e.target.value)
                    }
                    placeholder="Milestone title"
                    className={cn(
                      "block w-full rounded-lg px-3 py-2 text-sm",
                      "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                      "border border-[var(--color-border)]",
                      "placeholder:text-[var(--color-text-secondary)]",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                      "transition-colors duration-150"
                    )}
                  />
                </div>
              </div>
              <div className="mt-3">
                <FormLabel htmlFor={`milestone-${index}-desc`}>
                  Description
                </FormLabel>
                <textarea
                  id={`milestone-${index}-desc`}
                  value={milestone.description}
                  onChange={(e) =>
                    updateMilestone(index, "description", e.target.value)
                  }
                  placeholder="Brief description of this milestone…"
                  rows={2}
                  className={cn(
                    "block w-full resize-none rounded-lg px-3 py-2 text-sm",
                    "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                    "border border-[var(--color-border)]",
                    "placeholder:text-[var(--color-text-secondary)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                    "transition-colors duration-150"
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ProjectForm ──────────────────────────────────────────────────────────────

export function ProjectForm({
  initialData,
  categories,
  onSubmit,
  onClose,
}: ProjectFormProps): JSX.Element {
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>(
    () => {
      if (!initialData?.teamMembers) return [];
      return initialData.teamMembers.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        username: m.username,
        avatarUrl: m.avatarUrl,
      }));
    }
  );

  const [technologies, setTechnologies] = useState<string[]>(
    () => initialData?.technologies ?? []
  );

  const [milestones, setMilestones] = useState<MilestoneDraft[]>(
    () => initialData?.milestones ?? []
  );

  const [coverUrl, setCoverUrl] = useState<string>(
    initialData?.coverUrl ?? ""
  );

  const [descriptionContent, setDescriptionContent] = useState<unknown>(
    initialData?.description ?? null
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    !!initialData?.slug
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectSchemaInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      categoryId: initialData?.category
        ? categories.find((c) => c.name === initialData.category?.name)?.id ??
          ""
        : "",
      status: (initialData?.status as "ongoing" | "completed") ?? "ongoing",
      year: initialData?.year ?? new Date().getFullYear(),
      coverUrl: initialData?.coverUrl ?? "",
      technologies: initialData?.technologies ?? [],
      teamMemberIds: initialData?.teamMembers?.map((m) => m.id) ?? [],
      description: initialData?.description ?? null,
      githubUrl: initialData?.githubUrl ?? "",
      demoUrl: initialData?.demoUrl ?? "",
      reportUrl: initialData?.reportUrl ?? "",
      youtubeUrl: initialData?.youtubeUrl ?? "",
      milestones: initialData?.milestones ?? [],
      isPublished: initialData?.isPublished ?? false,
    },
  });

  const watchedTitle = watch("title");
  const watchedIsPublished = watch("isPublished");

  useEffect(() => {
    if (!slugManuallyEdited && watchedTitle) {
      setValue("slug", generateSlug(watchedTitle), { shouldValidate: false });
    }
  }, [watchedTitle, slugManuallyEdited, setValue]);

  const handleAddMember = useCallback((member: SelectedMember) => {
    setSelectedMembers((prev) => {
      if (prev.some((m) => m.id === member.id)) return prev;
      return [...prev, member];
    });
  }, []);

  const handleRemoveMember = useCallback((id: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleFormSubmit = useCallback(
    async (data: ProjectSchemaInput) => {
      setSubmitError(null);
      setIsSubmitting(true);
      try {
        await onSubmit({
          ...data,
          coverUrl,
          description: descriptionContent,
          technologies,
          teamMemberIds: selectedMembers.map((m) => m.id),
          milestones,
        });
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Please try again."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      onSubmit,
      coverUrl,
      descriptionContent,
      technologies,
      selectedMembers,
      milestones,
    ]
  );

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const statusOptions = [
    { value: "ongoing", label: "Ongoing" },
    { value: "completed", label: "Completed" },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1999 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex h-full flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {initialData?.id ? "Edit Project" : "Add New Project"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close form"
          className={cn(
            "rounded-lg p-1.5 text-[var(--color-text-secondary)]",
            "hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {submitError && (
          <Alert
            variant="error"
            title="Submission Error"
            message={submitError}
            dismissible
            onDismiss={() => setSubmitError(null)}
          />
        )}

        {/* Basic Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            Basic Information
          </h3>

          <Input
            label="Project Title"
            required
            placeholder="Enter project title"
            error={errors.title?.message}
            {...register("title")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FormLabel htmlFor="project-slug">
                Slug
              </FormLabel>
              <input
                id="project-slug"
                type="text"
                placeholder="auto-generated-slug"
                {...register("slug")}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setValue("slug", e.target.value, { shouldValidate: true });
                }}
                className={cn(
                  "block w-full rounded-lg px-3 py-2 text-sm font-mono",
                  "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                  "border border-[var(--color-border)]",
                  "placeholder:text-[var(--color-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                  "transition-colors duration-150",
                  errors.slug
                    ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
                    : ""
                )}
              />
              {errors.slug && (
                <FormError>{errors.slug.message}</FormError>
              )}
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Auto-generated from title. Edit to customize.
              </p>
            </div>

            <Select
              label="Category"
              required
              placeholder="Select category"
              options={categoryOptions}
              error={errors.categoryId?.message}
              {...register("categoryId")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              required
              options={statusOptions}
              error={errors.status?.message}
              {...register("status")}
            />

            <div>
              <FormLabel htmlFor="project-year" required>
                Year
              </FormLabel>
              <select
                id="project-year"
                aria-invalid={!!errors.year}
                className={cn(
                  "block w-full appearance-none rounded-lg px-3 py-2 pr-9 text-sm",
                  "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                  "border border-[var(--color-border)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                  "transition-colors duration-150",
                  errors.year
                    ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
                    : ""
                )}
                {...register("year", { valueAsNumber: true })}
              >
                {yearOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.year && (
                <FormError>{errors.year.message}</FormError>
              )}
            </div>
          </div>
        </section>

        {/* Cover Image */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            Cover Image
          </h3>
          <CloudinaryWidget
            folder="admin/projects"
            value={coverUrl || null}
            onChange={(url) => {
              setCoverUrl(url);
              setValue("coverUrl", url);
            }}
            label="Project Cover Image"
            accept="image/*"
          />
        </section>

        {/* Team Members */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            Team
          </h3>
          <TeamMemberSearch
            selected={selectedMembers}
            onAdd={handleAddMember}
            onRemove={handleRemoveMember}
          />
          {selectedMembers.length === 0 && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              No team members selected. Search above to add members.
            </p>
          )}
        </section>

        {/* Technologies */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            Technologies
          </h3>
          <TechnologyTagInput
            value={technologies}
            onChange={setTechnologies}
          />
        </section>

        {/* Description */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            Description
          </h3>
          <FormLabel>Project Description</FormLabel>
          <TipTapEditor
            value={descriptionContent}
            onChange={setDescriptionContent}
          />
        </section>

        {/* External Links */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            External Links
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="GitHub URL"
              type="url"
              placeholder="https://github.com/org/repo"
              error={errors.githubUrl?.message}
              {...register("githubUrl")}
            />
            <Input
              label="Live Demo URL"
              type="url"
              placeholder="https://demo.example.com"
              error={errors.demoUrl?.message}
              {...register("demoUrl")}
            />
            <Input
              label="Report / Paper URL"
              type="url"
              placeholder="https://drive.google.com/..."
              error={errors.reportUrl?.message}
              {...register("reportUrl")}
            />
            <Input
              label="YouTube Video URL"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              error={errors.youtubeUrl?.message}
              {...register("youtubeUrl")}
            />
          </div>
        </section>

        {/* Milestones */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            Milestones
          </h3>
          <MilestonesEditor value={milestones} onChange={setMilestones} />
        </section>

        {/* Publish */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            Visibility
          </h3>
          <Checkbox
            label="Publish this project"
            description="Published projects are visible to all visitors. Unpublished projects are only visible to admins."
            checked={watchedIsPublished}
            {...register("isPublished")}
            onChange={(e) =>
              setValue("isPublished", e.target.checked, {
                shouldValidate: true,
              })
            }
          />
        </section>
      </div>

      {/* Footer */}
      <div
        className={cn(
          "flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4",
          "bg-[var(--color-bg-surface)]"
        )}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={cn(
            "rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-elevated)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold",
            "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
            "hover:opacity-90 active:scale-95 transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isSubmitting && (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          )}
          {isSubmitting
            ? "Saving…"
            : initialData?.id
            ? "Save Changes"
            : "Create Project"}
        </button>
      </div>
    </form>
  );
}