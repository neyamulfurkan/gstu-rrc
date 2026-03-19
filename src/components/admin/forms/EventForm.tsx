// src/components/admin/forms/EventForm.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { eventSchema, type EventSchemaInput } from "@/lib/validations";
import { generateSlug } from "@/lib/utils";
import type { EventDetail } from "@/types/index";
import {
  Input,
  Textarea,
  Select,
  Checkbox,
  FormLabel,
  FormError,
} from "@/components/ui/Forms";
import { Alert, Skeleton } from "@/components/ui/Feedback";
import { CloudinaryWidget } from "@/components/ui/Media";

// ─── TipTap Editor (placeholder until TipTap is built) ───────────────────────

interface TipTapEditorProps {
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
}

function TipTapEditor({
  value,
  onChange,
  placeholder,
}: TipTapEditorProps): JSX.Element {
  return (
    <textarea
      placeholder={placeholder}
      defaultValue={
        typeof value === "string" ? value : value ? JSON.stringify(value) : ""
      }
      onChange={(e) => onChange(e.target.value)}
      className="block w-full min-h-[256px] rounded-lg px-3 py-2 text-sm bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] resize-y"
    />
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryOption {
  id: string;
  name: string;
}

interface EventFormProps {
  initialData?: Partial<EventDetail>;
  categories: CategoryOption[];
  onSubmit: (data: EventSchemaInput & { coverUrl?: string }) => Promise<void>;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateTimeLocal(value: Date | string | null | undefined): string {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "";
    // Format: YYYY-MM-DDTHH:mm
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  } catch {
    return "";
  }
}

function slugify(title: string): string {
  return generateSlug(title);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventForm({
  initialData,
  categories,
  onSubmit,
  onClose,
}: EventFormProps): JSX.Element {
  const isEditing = Boolean(initialData?.id);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>(
    initialData?.coverUrl ?? ""
  );
  const [slugTouched, setSlugTouched] = useState(false);
  const metaDescValue = useRef<string>("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<EventSchemaInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      categoryId: initialData?.category
        ? // map category name back to id if we have it
          categories.find((c) => c.name === (initialData.category as { name: string }).name)?.id ?? ""
        : "",
      startDate: initialData?.startDate
        ? new Date(initialData.startDate)
        : undefined,
      endDate: initialData?.endDate
        ? new Date(initialData.endDate)
        : undefined,
      allDay: initialData?.allDay ?? false,
      venue: initialData?.venue ?? "",
      mapLink: initialData?.mapLink ?? "",
      organizerName: (initialData as { organizerName?: string })?.organizerName ?? "",
      description: initialData?.description ?? null,
      registrationEnabled: initialData?.registrationEnabled ?? false,
      registrationDeadline: undefined,
      metaDescription: initialData?.metaDescription ?? "",
      isPublished: initialData?.isPublished ?? false,
    },
  });

  const titleValue = watch("title");
  const allDay = watch("allDay");
  const registrationEnabled = watch("registrationEnabled");
  const metaDescriptionValue = watch("metaDescription") ?? "";

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugTouched && titleValue) {
      setValue("slug", slugify(titleValue), { shouldValidate: false });
    }
  }, [titleValue, slugTouched, setValue]);

  const handleFormSubmit = useCallback(
    async (data: EventSchemaInput) => {
      setSubmitError(null);
      try {
        await onSubmit({ ...data, coverUrl: coverUrl || undefined } as EventSchemaInput & { coverUrl?: string });
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Please try again."
        );
      }
    },
    [onSubmit, coverUrl]
  );

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] font-[var(--font-display)]">
          {isEditing ? "Edit Event" : "Create New Event"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close form"
          className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 4L4 12M4 4l8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Scrollable Body */}
      <form
        id="event-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        noValidate
        className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
      >
        {submitError && (
          <Alert
            variant="error"
            title="Submission Failed"
            message={submitError}
            dismissible
            onDismiss={() => setSubmitError(null)}
          />
        )}

        {/* ── Cover Image ──────────────────────────────────────────────── */}
        <div>
          <FormLabel>Cover Image</FormLabel>
          <CloudinaryWidget
            folder="admin/events"
            value={coverUrl}
            onChange={setCoverUrl}
            label="Upload Event Cover"
            accept="image/*"
          />
        </div>

        {/* ── Title + Slug ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Event Title"
            required
            placeholder="Annual Robotics Showcase 2026"
            error={errors.title?.message}
            {...register("title")}
          />
          <div className="w-full">
            <FormLabel htmlFor="slug" required>
              URL Slug
            </FormLabel>
            <input
              id="slug"
              placeholder="annual-robotics-showcase-2026"
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? "slug-error" : undefined}
              className={[
                "block w-full rounded-lg px-3 py-2 text-sm font-mono",
                "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                "border border-[var(--color-border)]",
                "placeholder:text-[var(--color-text-secondary)]",
                "transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                errors.slug
                  ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              {...register("slug", {
                onChange: () => setSlugTouched(true),
              })}
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Auto-generated from title · edit to customise
            </p>
            {errors.slug && (
              <FormError id="slug-error">{errors.slug.message}</FormError>
            )}
          </div>
        </div>

        {/* ── Category + Venue ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select
                label="Category"
                required
                placeholder="Select a category"
                options={categoryOptions}
                error={errors.categoryId?.message}
                {...field}
              />
            )}
          />
          <Input
            label="Venue"
            required
            placeholder="GSTU Main Auditorium"
            error={errors.venue?.message}
            {...register("venue")}
          />
        </div>

        {/* ── Organizer ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Organizer Name"
            placeholder="GSTU Robotics & Research Club"
            error={errors.organizerName?.message}
            {...register("organizerName")}
          />
          <Input
            label="Map / Location Link"
            type="url"
            placeholder="https://maps.google.com/..."
            error={errors.mapLink?.message}
            {...register("mapLink")}
          />
        </div>

        {/* ── Dates ────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <Controller
            name="allDay"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="All-day event"
                description="No specific start or end time"
                checked={field.value}
                onChange={field.onChange}
                id="allDay"
              />
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="w-full">
              <FormLabel htmlFor="startDate" required>
                {allDay ? "Start Date" : "Start Date & Time"}
              </FormLabel>
              <input
                id="startDate"
                type={allDay ? "date" : "datetime-local"}
                aria-invalid={!!errors.startDate}
                aria-describedby={
                  errors.startDate ? "startDate-error" : undefined
                }
                defaultValue={toDateTimeLocal(initialData?.startDate)}
                className={[
                  "block w-full rounded-lg px-3 py-2 text-sm",
                  "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                  "border border-[var(--color-border)]",
                  "transition-colors duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                  errors.startDate
                    ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                {...register("startDate", {
                  setValueAs: (v) => (v ? new Date(v) : undefined),
                })}
              />
              {errors.startDate && (
                <FormError id="startDate-error">
                  {errors.startDate.message}
                </FormError>
              )}
            </div>

            <div className="w-full">
              <FormLabel htmlFor="endDate">
                {allDay ? "End Date" : "End Date & Time"}
                <span className="ml-1.5 text-xs text-[var(--color-text-secondary)] font-normal">
                  (optional)
                </span>
              </FormLabel>
              <input
                id="endDate"
                type={allDay ? "date" : "datetime-local"}
                aria-invalid={!!errors.endDate}
                aria-describedby={
                  errors.endDate ? "endDate-error" : undefined
                }
                defaultValue={toDateTimeLocal(initialData?.endDate)}
                className={[
                  "block w-full rounded-lg px-3 py-2 text-sm",
                  "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                  "border border-[var(--color-border)]",
                  "transition-colors duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                  errors.endDate
                    ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                {...register("endDate", {
                  setValueAs: (v) =>
                    v ? new Date(v) : undefined,
                })}
              />
              {errors.endDate && (
                <FormError id="endDate-error">
                  {errors.endDate.message}
                </FormError>
              )}
            </div>
          </div>
        </div>

        {/* ── Registration ─────────────────────────────────────────────── */}
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-bg-surface)]">
          <Controller
            name="registrationEnabled"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="Enable Event Registration"
                description="Allow members to register for this event"
                checked={field.value}
                onChange={field.onChange}
                id="registrationEnabled"
              />
            )}
          />

          {registrationEnabled && (
            <div className="w-full">
              <FormLabel htmlFor="registrationDeadline">
                Registration Deadline
                <span className="ml-1.5 text-xs text-[var(--color-text-secondary)] font-normal">
                  (optional)
                </span>
              </FormLabel>
              <input
                id="registrationDeadline"
                type="datetime-local"
                className="block w-full rounded-lg px-3 py-2 text-sm bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                {...register("registrationDeadline", {
                  setValueAs: (v) =>
                    v ? new Date(v) : undefined,
                })}
              />
            </div>
          )}
        </div>

        {/* ── Description (TipTap) ─────────────────────────────────────── */}
        <div className="w-full">
          <FormLabel required>Description</FormLabel>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TipTapEditor
                value={field.value ?? initialData?.description ?? null}
                onChange={field.onChange}
                placeholder="Describe the event — agenda, prerequisites, what to bring…"
              />
            )}
          />
          {errors.description && (
            <FormError>
              {typeof errors.description.message === "string"
                ? errors.description.message
                : "Description is required"}
            </FormError>
          )}
        </div>

        {/* ── Meta Description ─────────────────────────────────────────── */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <FormLabel htmlFor="metaDescription">
              SEO Meta Description
              <span className="ml-1.5 text-xs text-[var(--color-text-secondary)] font-normal">
                (optional)
              </span>
            </FormLabel>
            <span
              className={[
                "text-xs tabular-nums",
                metaDescriptionValue.length > 160
                  ? "text-[var(--color-error)]"
                  : "text-[var(--color-text-secondary)]",
              ].join(" ")}
              aria-live="polite"
            >
              {metaDescriptionValue.length}/160
            </span>
          </div>
          <Textarea
            id="metaDescription"
            placeholder="A short description for search engines (max 160 characters)…"
            error={errors.metaDescription?.message}
            {...register("metaDescription")}
          />
        </div>

        {/* ── Publish Toggle ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-bg-surface)]">
          <Controller
            name="isPublished"
            control={control}
            render={({ field }) => (
              <Checkbox
                label="Publish Event"
                description="Visible to all visitors. Unpublished events are only visible to admins."
                checked={field.value}
                onChange={field.onChange}
                id="isPublished"
              />
            )}
          />
        </div>
      </form>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0 bg-[var(--color-bg-surface)]">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-lg border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="event-form"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)] bg-[var(--color-accent)] text-[var(--color-bg-base)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && (
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeOpacity="0.25"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          )}
          {isSubmitting
            ? isEditing
              ? "Saving…"
              : "Creating…"
            : isEditing
            ? "Save Changes"
            : "Create Event"}
        </button>
      </div>
    </div>
  );
}