// src/components/feed/ComposeBox.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  Bold,
  Italic,
  Link,
  List,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/Forms";
import { Alert, ProgressBar, Spinner } from "@/components/ui/Feedback";
import { FileUpload } from "@/components/ui/Media";
import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import type { MemberPublic, PostCard } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachedFile {
  file: File;
  objectUrl: string;
  uploadedUrl: string | null;
  uploading: boolean;
  progress: number;
  error: string | null;
}

interface ComposeBoxProps {
  currentUser: MemberPublic;
  onPost: (post: PostCard) => void;
}

// ─── Single-file upload row ───────────────────────────────────────────────────

interface FileUploadRowProps {
  item: AttachedFile;
  onRemove: () => void;
}

function FileUploadRow({ item, onRemove }: FileUploadRowProps): JSX.Element {
  const isImage = item.file.type.startsWith("image/");
  const isVideo = item.file.type.startsWith("video/");

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-2",
        item.error
          ? "border-[var(--color-error)]/40 bg-[var(--color-error)]/5"
          : item.uploadedUrl
          ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5"
          : "border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
      )}
    >
      {/* Thumbnail */}
      {isImage && item.objectUrl ? (
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
          <img
            src={item.objectUrl}
            alt={item.file.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[var(--color-bg-surface)] text-xs text-[var(--color-text-secondary)]">
          {isVideo ? "VID" : "FILE"}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
          {item.file.name}
        </p>
        {item.error ? (
          <p className="text-xs text-[var(--color-error)]">{item.error}</p>
        ) : item.uploading ? (
          <ProgressBar
            value={item.progress}
            variant="accent"
            size="sm"
            className="mt-1"
          />
        ) : item.uploadedUrl ? (
          <p className="text-xs text-[var(--color-success)]">Uploaded</p>
        ) : (
          <p className="text-xs text-[var(--color-text-secondary)]">
            {(item.file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        )}
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.file.name}`}
        className={cn(
          "flex-shrink-0 rounded p-0.5 text-[var(--color-text-secondary)]",
          "hover:text-[var(--color-error)] transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        )}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── UploadManager — handles sequential file uploads ─────────────────────────

interface UploadManagerProps {
  folder: string;
  files: AttachedFile[];
  onUpdate: (index: number, patch: Partial<AttachedFile>) => void;
}

function UploadManager({ folder, files, onUpdate }: UploadManagerProps): null {
  const { upload } = useCloudinaryUpload(folder);
  const uploadedIndexes = useRef<Set<number>>(new Set());

  useEffect(() => {
    files.forEach((item, index) => {
      if (
        !item.uploadedUrl &&
        !item.uploading &&
        !item.error &&
        !uploadedIndexes.current.has(index)
      ) {
        uploadedIndexes.current.add(index);
        onUpdate(index, { uploading: true, progress: 0 });

        upload(item.file)
          .then(({ url }) => {
            onUpdate(index, { uploading: false, progress: 100, uploadedUrl: url });
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error ? err.message : "Upload failed.";
            onUpdate(index, { uploading: false, error: message });
            uploadedIndexes.current.delete(index);
          });
      }
    });
  }, [files, upload, onUpdate]);

  return null;
}

// ─── ComposeBox ───────────────────────────────────────────────────────────────

export function ComposeBox({ currentUser, onPost }: ComposeBoxProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Expand / Collapse ──────────────────────────────────────────────────────

  const expand = useCallback(() => {
    setIsExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const collapse = useCallback(() => {
    if (content.trim() === "" && attachedFiles.length === 0) {
      setIsExpanded(false);
      setSubmitError(null);
    }
  }, [content, attachedFiles.length]);

  // Collapse on outside click when empty
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        collapse();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded, collapse]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      attachedFiles.forEach((item) => {
        if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── File handling ───────────────────────────────────────────────────────────

  const handleFiles = useCallback((files: File[]) => {
    const remaining = 5 - attachedFiles.length;
    const toAdd = files.slice(0, remaining);

    const newItems: AttachedFile[] = toAdd.map((file) => ({
      file,
      objectUrl: URL.createObjectURL(file),
      uploadedUrl: null,
      uploading: false,
      progress: 0,
      error: null,
    }));

    setAttachedFiles((prev) => [...prev, ...newItems]);
  }, [attachedFiles.length]);

  const updateFile = useCallback((index: number, patch: Partial<AttachedFile>) => {
    setAttachedFiles((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], ...patch };
      }
      return updated;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (item?.objectUrl) URL.revokeObjectURL(item.objectUrl);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  // ─── Toolbar actions (insert markdown-style syntax) ──────────────────────────

  const insertSyntax = useCallback(
    (before: string, after: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.slice(start, end);
      const replacement = `${before}${selected}${after}`;
      const newContent =
        content.slice(0, start) + replacement + content.slice(end);
      setContent(newContent);

      requestAnimationFrame(() => {
        if (!textarea) return;
        const newCursor = start + before.length + selected.length + after.length;
        textarea.setSelectionRange(newCursor, newCursor);
        textarea.focus();
      });
    },
    [content]
  );

  const handleBold = useCallback(() => insertSyntax("**", "**"), [insertSyntax]);
  const handleItalic = useCallback(() => insertSyntax("_", "_"), [insertSyntax]);
  const handleList = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const newContent =
      content.slice(0, lineStart) + "• " + content.slice(lineStart);
    setContent(newContent);
    requestAnimationFrame(() => {
      if (textarea) {
        const pos = start + 2;
        textarea.setSelectionRange(pos, pos);
        textarea.focus();
      }
    });
  }, [content]);

  const handleLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const linkText = selected || "link text";
    const replacement = `[${linkText}](https://)`;
    const newContent =
      content.slice(0, start) + replacement + content.slice(end);
    setContent(newContent);
    requestAnimationFrame(() => {
      if (textarea) {
        // Position cursor on the URL part
        const urlStart = start + linkText.length + 3;
        const urlEnd = urlStart + 8;
        textarea.setSelectionRange(urlStart, urlEnd);
        textarea.focus();
      }
    });
  }, [content]);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const isAnyUploading = attachedFiles.some((f) => f.uploading);
  const hasUploadErrors = attachedFiles.some((f) => !!f.error && !f.uploadedUrl);
  const uploadedUrls = attachedFiles
    .filter((f) => f.uploadedUrl !== null)
    .map((f) => f.uploadedUrl as string);

  const canSubmit =
    content.trim().length > 0 &&
    !isSubmitting &&
    !isAnyUploading &&
    !hasUploadErrors;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const firstFile = attachedFiles[0];
      const mediaType =
        uploadedUrls.length > 0
          ? firstFile?.file.type.startsWith("video/")
            ? "video"
            : "image"
          : undefined;

      const body: Record<string, unknown> = {
        content: content.trim(),
      };
      if (uploadedUrls.length > 0) {
        body.mediaUrls = uploadedUrls;
      }
      if (mediaType) {
        body.mediaType = mediaType;
      }

      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let message = "Failed to publish post. Please try again.";
        try {
          const data = await res.json();
          if (typeof data?.error === "string") message = data.error;
          else if (typeof data?.message === "string") message = data.message;
        } catch {
          // ignore parse error
        }
        throw new Error(message);
      }

      const responseData = await res.json();
      const newPost: PostCard = responseData.data ?? responseData;

      // Cleanup object URLs
      attachedFiles.forEach((item) => {
        if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      });

      // Reset state
      setContent("");
      setAttachedFiles([]);
      setIsExpanded(false);
      setSubmitError(null);

      onPost(newPost);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, content, uploadedUrls, attachedFiles, onPost]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  const avatarSrc = currentUser.avatarUrl;
  const displayName = currentUser.fullName || currentUser.username;

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
        "transition-shadow duration-200",
        isExpanded && "shadow-[var(--shadow-card)]"
      )}
    >
      {/* Upload manager — triggers uploads as files are added */}
      {attachedFiles.length > 0 && (
        <UploadManager
          folder="gallery"
          files={attachedFiles}
          onUpdate={updateFile}
        />
      )}

      {/* Collapsed state */}
      {!isExpanded && (
        <button
          type="button"
          onClick={expand}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left",
            "rounded-xl transition-colors hover:bg-[var(--color-bg-elevated)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset"
          )}
          aria-label="Write a post"
        >
          {/* Avatar */}
          <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-[var(--color-border)]">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={displayName}
                fill
                sizes="36px"
                className="object-cover"
                unoptimized={avatarSrc.startsWith("data:")}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: "var(--color-primary)" }}
                aria-hidden="true"
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Placeholder */}
          <span className="flex-1 text-sm text-[var(--color-text-secondary)]">
            Share something with the club…
          </span>
        </button>
      )}

      {/* Expanded state */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="compose-expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {/* Header row: avatar + textarea */}
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-[var(--color-border)]">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt={displayName}
                      fill
                      sizes="36px"
                      className="object-cover"
                      unoptimized={avatarSrc.startsWith("data:")}
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: "var(--color-primary)" }}
                      aria-hidden="true"
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Text area */}
                <div className="flex-1 min-w-0">
                  <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={collapse}
                    placeholder={`What's on your mind, ${currentUser.fullName.split(" ")[0]}?`}
                    maxLength={5000}
                    disabled={isSubmitting}
                    aria-label="Post content"
                    className="min-h-[80px] border-transparent bg-transparent px-0 py-0 focus:ring-0 focus:border-transparent resize-none text-base"
                  />
                  {/* Character counter */}
                  <div className="mt-1 text-right">
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        content.length > 4800
                          ? "text-[var(--color-error)]"
                          : "text-[var(--color-text-secondary)]"
                      )}
                    >
                      {content.length}/5000
                    </span>
                  </div>
                </div>
              </div>

              {/* Attached file list */}
              {attachedFiles.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {attachedFiles.map((item, index) => (
                    <FileUploadRow
                      key={`${item.file.name}-${index}`}
                      item={item}
                      onRemove={() => removeFile(index)}
                    />
                  ))}
                </div>
              )}

              {/* Submit error */}
              {submitError && (
                <Alert
                  variant="error"
                  message={submitError}
                  dismissible
                  onDismiss={() => setSubmitError(null)}
                  className="mt-3"
                />
              )}

              {/* Toolbar + submit */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                {/* Formatting toolbar */}
                <div className="flex items-center gap-1">
                  <ToolbarButton
                    onClick={handleBold}
                    label="Bold"
                    disabled={isSubmitting}
                  >
                    <Bold size={15} aria-hidden="true" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={handleItalic}
                    label="Italic"
                    disabled={isSubmitting}
                  >
                    <Italic size={15} aria-hidden="true" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={handleList}
                    label="Bullet list"
                    disabled={isSubmitting}
                  >
                    <List size={15} aria-hidden="true" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={handleLink}
                    label="Insert link"
                    disabled={isSubmitting}
                  >
                    <Link size={15} aria-hidden="true" />
                  </ToolbarButton>

                  {/* Divider */}
                  <span
                    className="mx-1 h-4 w-px bg-[var(--color-border)]"
                    aria-hidden="true"
                  />

                  {/* File upload trigger */}
                  {attachedFiles.length < 5 && (
                    <div className="inline-block">
                      <FileUpload
                        accept="image/*,video/*"
                        multiple
                        maxSizeMb={50}
                        onFiles={handleFiles}
                        disabled={isSubmitting}
                        label=""
                        className="[&>div]:rounded-md [&>div]:border-0 [&>div]:p-1.5 [&>div]:text-[var(--color-text-secondary)] [&>div]:hover:text-[var(--color-text-primary)] [&>div]:bg-transparent [&>div]:min-h-0 [&>div]:gap-0 [&>div]:hover:bg-[var(--color-bg-elevated)] [&_svg]:hidden [&_p]:hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Right side: upload status + submit */}
                <div className="flex items-center gap-2">
                  {isAnyUploading && (
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                      <Loader2
                        size={12}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                      Uploading…
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    aria-label="Publish post"
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                      "bg-[var(--color-primary)] text-white",
                      "transition-all duration-150",
                      "hover:bg-[var(--color-primary-hover)]",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]",
                      "disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <Spinner size="sm" label="Publishing…" />
                    ) : (
                      <Send size={14} aria-hidden="true" />
                    )}
                    <span>{isSubmitting ? "Publishing…" : "Post"}</span>
                  </button>
                </div>
              </div>

              {/* Keyboard shortcut hint */}
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                Press{" "}
                <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5 font-mono text-[10px]">
                  Ctrl + Enter
                </kbd>{" "}
                to publish
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ToolbarButton ────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  label,
  disabled = false,
  children,
}: ToolbarButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md",
        "text-[var(--color-text-secondary)] transition-colors duration-150",
        "hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
        "disabled:opacity-40 disabled:cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}