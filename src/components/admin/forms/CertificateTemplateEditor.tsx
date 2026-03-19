// src/components/admin/forms/CertificateTemplateEditor.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Eye, EyeOff, Save, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, Select, FormLabel } from "@/components/ui/Forms";
import { Alert, Spinner } from "@/components/ui/Feedback";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CertificateTemplateEditorProps {
  initialData?: {
    id?: string;
    name?: string;
    type?: string;
    htmlContent?: string;
    cssContent?: string;
  };
  onSubmit(data: {
    name: string;
    type: string;
    htmlContent: string;
    cssContent: string;
  }): Promise<void>;
  onClose(): void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES = [
  { value: "participation", label: "Participation" },
  { value: "achievement", label: "Achievement" },
  { value: "completion", label: "Completion" },
  { value: "custom", label: "Custom" },
] as const;

const PLACEHOLDERS = [
  { key: "{{member_name}}", label: "Member Name", sample: "John Doe" },
  { key: "{{achievement}}", label: "Achievement", sample: "Excellence in Robotics" },
  { key: "{{date}}", label: "Issue Date", sample: "March 18, 2026" },
  { key: "{{signed_by_name}}", label: "Signed By Name", sample: "Dr. Jane Smith" },
  { key: "{{signed_by_designation}}", label: "Signed By Designation", sample: "Club President" },
  { key: "{{signature_image}}", label: "Signature Image URL", sample: "https://example.com/sig.png" },
  { key: "{{serial}}", label: "Serial Number", sample: "GSTU-2026-A3F8E1C2" },
  { key: "{{qr_code}}", label: "QR Code (Data URL)", sample: "" },
  { key: "{{club_name}}", label: "Club Name", sample: "GSTU Robotics & Research Club" },
  { key: "{{logo_url}}", label: "Club Logo URL", sample: "https://example.com/logo.png" },
];

const SAMPLE_DATA: Record<string, string> = {
  "{{member_name}}": "John Doe",
  "{{achievement}}": "Excellence in Robotics",
  "{{date}}": "March 18, 2026",
  "{{signed_by_name}}": "Dr. Jane Smith",
  "{{signed_by_designation}}": "Club President",
  "{{signature_image}}": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iNjAiPjxwYXRoIGQ9Ik0xMCA0MCBRNDAgMTAgODAgMzAgUTEyMCA1MCAxNTAgMjAiIHN0cm9rZT0iIzMzMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+",
  "{{serial}}": "GSTU-2026-A3F8E1C2",
  "{{qr_code}}": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "{{club_name}}": "GSTU Robotics & Research Club",
  "{{logo_url}}": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiMwMEU1RkYiLz48dGV4dCB4PSIzMiIgeT0iMzgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwNjBCMTQiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIj5HUjwvdGV4dD48L3N2Zz4=",
};

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate</title>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <img src="{{logo_url}}" alt="Club Logo" class="logo" />
      <h1 class="club-name">{{club_name}}</h1>
    </div>
    <div class="body">
      <p class="certifies">This is to certify that</p>
      <h2 class="member-name">{{member_name}}</h2>
      <p class="achievement-label">has successfully achieved</p>
      <p class="achievement">{{achievement}}</p>
    </div>
    <div class="footer">
      <div class="signature-block">
        <img src="{{signature_image}}" alt="Signature" class="signature" />
        <p class="signed-by">{{signed_by_name}}</p>
        <p class="designation">{{signed_by_designation}}</p>
      </div>
      <div class="meta">
        <p class="date">{{date}}</p>
        <p class="serial">{{serial}}</p>
        <img src="{{qr_code}}" alt="QR Code" class="qr-code" />
      </div>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Georgia, serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
.certificate { width: 800px; min-height: 560px; border: 8px double #b8860b; padding: 48px; background: linear-gradient(135deg, #fffdf0 0%, #fff8dc 100%); position: relative; }
.header { text-align: center; margin-bottom: 32px; }
.logo { width: 64px; height: 64px; margin-bottom: 12px; }
.club-name { font-size: 14px; letter-spacing: 4px; text-transform: uppercase; color: #555; font-family: Arial, sans-serif; }
.body { text-align: center; margin-bottom: 40px; }
.certifies { font-size: 14px; color: #777; margin-bottom: 12px; }
.member-name { font-size: 36px; color: #1a1a1a; font-style: italic; margin-bottom: 16px; }
.achievement-label { font-size: 14px; color: #777; margin-bottom: 8px; }
.achievement { font-size: 18px; color: #b8860b; font-weight: bold; }
.footer { display: flex; justify-content: space-between; align-items: flex-end; }
.signature-block { text-align: center; }
.signature { height: 48px; margin-bottom: 4px; }
.signed-by { font-size: 14px; font-weight: bold; color: #333; border-top: 1px solid #333; padding-top: 4px; }
.designation { font-size: 12px; color: #777; }
.meta { text-align: right; }
.date { font-size: 13px; color: #555; margin-bottom: 4px; }
.serial { font-size: 11px; color: #999; font-family: monospace; margin-bottom: 8px; }
.qr-code { width: 60px; height: 60px; }`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPreviewHtml(htmlContent: string, cssContent: string): string {
  let filled = htmlContent;
  for (const [placeholder, sample] of Object.entries(SAMPLE_DATA)) {
    filled = filled.split(placeholder).join(sample);
  }

  // Inject CSS into head if it contains a <head> tag
  const hasHead = /<head[\s>]/i.test(filled);
  const styleTag = `<style>\n${cssContent}\n</style>`;

  if (hasHead) {
    return filled.replace(/<\/head>/i, `${styleTag}\n</head>`);
  }

  // Wrap in a full document if no head
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${styleTag}</head><body>${filled}</body></html>`;
}

function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement>,
  text: string
): void {
  const el = ref.current;
  if (!el) return;

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;

  const newValue =
    el.value.slice(0, start) + text + el.value.slice(end);

  // Trigger React's onChange by using native input value setter
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, newValue);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    el.value = newValue;
  }

  // Restore cursor position after the inserted text
  const newCursor = start + text.length;
  requestAnimationFrame(() => {
    el.selectionStart = newCursor;
    el.selectionEnd = newCursor;
    el.focus();
  });
}

// ─── LineNumbers ──────────────────────────────────────────────────────────────

interface LineNumbersProps {
  content: string;
  scrollTop: number;
  lineHeight: number;
  className?: string;
}

function LineNumbers({
  content,
  scrollTop,
  lineHeight,
  className,
}: LineNumbersProps): JSX.Element {
  const lineCount = (content.match(/\n/g)?.length ?? 0) + 1;

  return (
    <div
      className={cn(
        "select-none text-right pr-2 overflow-hidden",
        "text-[var(--color-text-secondary)] font-mono text-xs leading-5",
        "bg-[var(--color-bg-surface)] border-r border-[var(--color-border)]",
        className
      )}
      style={{
        paddingTop: "8px",
        lineHeight: `${lineHeight}px`,
        transform: `translateY(-${scrollTop}px)`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: lineCount }, (_, i) => (
        <div key={i} style={{ height: lineHeight }}>
          {i + 1}
        </div>
      ))}
    </div>
  );
}

// ─── CodeEditor ───────────────────────────────────────────────────────────────

interface CodeEditorProps {
  value: string;
  onChange(value: string): void;
  label: string;
  height?: number;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  id?: string;
}

function CodeEditor({
  value,
  onChange,
  label,
  height = 300,
  textareaRef,
  id,
}: CodeEditorProps): JSX.Element {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = textareaRef ?? internalRef;
  const [scrollTop, setScrollTop] = useState(0);
  const LINE_HEIGHT = 20;

  const handleScroll = useCallback(() => {
    const el = resolvedRef.current;
    if (el) {
      setScrollTop(el.scrollTop);
    }
  }, [resolvedRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle Tab key for indentation
      if (e.key === "Tab") {
        e.preventDefault();
        const el = e.currentTarget;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newValue =
          el.value.slice(0, start) + "  " + el.value.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          el.selectionStart = start + 2;
          el.selectionEnd = start + 2;
        });
      }
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-1">
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <div
        className={cn(
          "relative flex overflow-hidden rounded-lg border border-[var(--color-border)]",
          "bg-[var(--color-bg-base)] focus-within:ring-2 focus-within:ring-[var(--color-accent)] focus-within:border-[var(--color-accent)]"
        )}
        style={{ height }}
      >
        {/* Line numbers column */}
        <div
          className="overflow-hidden shrink-0"
          style={{ width: "36px", height: "100%" }}
        >
          <LineNumbers
            content={value}
            scrollTop={scrollTop}
            lineHeight={LINE_HEIGHT}
          />
        </div>

        {/* Textarea */}
        <textarea
          ref={resolvedRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          className={cn(
            "flex-1 resize-none overflow-auto",
            "bg-transparent text-[var(--color-text-primary)]",
            "font-mono text-xs leading-5",
            "p-2 focus:outline-none",
            "placeholder:text-[var(--color-text-secondary)]"
          )}
          style={{ height: "100%", lineHeight: `${LINE_HEIGHT}px` }}
        />
      </div>
    </div>
  );
}

// ─── PlaceholderDropdown ──────────────────────────────────────────────────────

interface PlaceholderDropdownProps {
  onInsert(placeholder: string): void;
}

function PlaceholderDropdown({ onInsert }: PlaceholderDropdownProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
          "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
          "border border-[var(--color-border)]",
          "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        )}
      >
        Insert Placeholder
        <ChevronDown
          size={12}
          className={cn(
            "transition-transform duration-150",
            open ? "rotate-180" : ""
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Available placeholders"
          className={cn(
            "absolute left-0 top-full mt-1 z-50",
            "w-64 max-h-60 overflow-y-auto",
            "rounded-lg border border-[var(--color-border)]",
            "bg-[var(--color-bg-elevated)] shadow-lg",
            "py-1"
          )}
        >
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => {
                onInsert(p.key);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2",
                "hover:bg-[var(--color-bg-surface)]",
                "focus:outline-none focus:bg-[var(--color-bg-surface)]",
                "transition-colors duration-100"
              )}
            >
              <p className="text-xs font-mono text-[var(--color-accent)]">
                {p.key}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {p.label}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CertificateTemplateEditor ────────────────────────────────────────────────

export function CertificateTemplateEditor({
  initialData,
  onSubmit,
  onClose,
}: CertificateTemplateEditorProps): JSX.Element {
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState(initialData?.type ?? "participation");
  const [htmlContent, setHtmlContent] = useState(
    initialData?.htmlContent ?? DEFAULT_HTML
  );
  const [cssContent, setCssContent] = useState(
    initialData?.cssContent ?? DEFAULT_CSS
  );
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const cssRef = useRef<HTMLTextAreaElement>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update preview with debounce whenever content changes
  useEffect(() => {
    if (!previewVisible) return;

    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }

    previewDebounceRef.current = setTimeout(() => {
      setPreviewSrc(buildPreviewHtml(htmlContent, cssContent));
    }, 500);

    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
    };
  }, [htmlContent, cssContent, previewVisible]);

  // Build preview immediately when toggled on
  const handleTogglePreview = useCallback(() => {
    setPreviewVisible((prev) => {
      if (!prev) {
        setPreviewSrc(buildPreviewHtml(htmlContent, cssContent));
      }
      return !prev;
    });
  }, [htmlContent, cssContent]);

  const handleInsertPlaceholder = useCallback(
    (placeholder: string) => {
      // Determine which editor is focused or default to HTML
      const activeElement = document.activeElement;
      const isHtmlFocused = htmlRef.current === activeElement;
      const isCssFocused = cssRef.current === activeElement;

      if (isCssFocused) {
        insertAtCursor(cssRef as React.RefObject<HTMLTextAreaElement>, placeholder);
      } else {
        // Default to HTML editor
        if (htmlRef.current) {
          htmlRef.current.focus();
        }
        insertAtCursor(htmlRef as React.RefObject<HTMLTextAreaElement>, placeholder);
      }
    },
    []
  );

  const handleHtmlChange = useCallback((value: string) => {
    setHtmlContent(value);
  }, []);

  const handleCssChange = useCallback((value: string) => {
    setCssContent(value);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate
    setNameError(null);
    setSubmitError(null);

    if (!name.trim()) {
      setNameError("Template name is required.");
      return;
    }

    if (!htmlContent.trim()) {
      setSubmitError("HTML content cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        htmlContent,
        cssContent,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save template.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, type, htmlContent, cssContent, onSubmit]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-surface)] rounded-xl overflow-hidden">
      {/* ── Header ── */}
      <div
        className={cn(
          "flex items-center justify-between px-5 py-4",
          "border-b border-[var(--color-border)]",
          "bg-[var(--color-bg-elevated)] shrink-0"
        )}
      >
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {initialData?.id ? "Edit Certificate Template" : "New Certificate Template"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePreview}
            aria-pressed={previewVisible}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
              "border transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              previewVisible
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/30"
                : "bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            )}
          >
            {previewVisible ? (
              <EyeOff size={14} aria-hidden="true" />
            ) : (
              <Eye size={14} aria-hidden="true" />
            )}
            {previewVisible ? "Hide Preview" : "Show Preview"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className={cn(
              "rounded-lg p-1.5 text-[var(--color-text-secondary)]",
              "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel: Editors ── */}
        <div
          className={cn(
            "flex flex-col gap-4 overflow-y-auto p-5",
            "border-r border-[var(--color-border)]",
            previewVisible ? "w-1/2" : "w-full"
          )}
          style={{ transition: "width 0.2s ease" }}
        >
          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Template Name"
              id="cert-template-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Participation Certificate 2026"
              error={nameError ?? undefined}
              required
            />
            <Select
              label="Template Type"
              id="cert-template-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={TEMPLATE_TYPES.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
          </div>

          {/* Placeholder toolbar */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-secondary)]">
              Insert into editor:
            </span>
            <PlaceholderDropdown onInsert={handleInsertPlaceholder} />
          </div>

          {/* HTML Editor */}
          <CodeEditor
            id="cert-html-editor"
            label="HTML Template"
            value={htmlContent}
            onChange={handleHtmlChange}
            height={300}
            textareaRef={htmlRef as React.RefObject<HTMLTextAreaElement>}
          />

          {/* CSS Editor */}
          <CodeEditor
            id="cert-css-editor"
            label="CSS Styles"
            value={cssContent}
            onChange={handleCssChange}
            height={180}
            textareaRef={cssRef as React.RefObject<HTMLTextAreaElement>}
          />

          {/* Placeholder reference */}
          <details className="group">
            <summary
              className={cn(
                "cursor-pointer text-xs font-medium text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-text-primary)] transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
              )}
            >
              Available Placeholder Variables
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <div
                  key={p.key}
                  className={cn(
                    "rounded-md px-2 py-1.5",
                    "bg-[var(--color-bg-base)] border border-[var(--color-border)]"
                  )}
                >
                  <p className="text-xs font-mono text-[var(--color-accent)] truncate">
                    {p.key}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
                    {p.label}
                  </p>
                </div>
              ))}
            </div>
          </details>

          {/* Error display */}
          {submitError && (
            <Alert
              variant="error"
              message={submitError}
              dismissible
              onDismiss={() => setSubmitError(null)}
            />
          )}
        </div>

        {/* ── Right Panel: Preview ── */}
        {previewVisible && (
          <div className="flex flex-col w-1/2 overflow-hidden">
            <div
              className={cn(
                "shrink-0 px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)]",
                "bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)]",
                "flex items-center gap-2"
              )}
            >
              <Eye size={12} aria-hidden="true" />
              Live Preview — sample data applied
            </div>
            <div className="flex-1 overflow-hidden bg-[var(--color-bg-base)]">
              {previewSrc ? (
                <iframe
                  title="Certificate Preview"
                  srcDoc={previewSrc}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                  aria-label="Certificate template preview with sample data"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Spinner size="md" label="Building preview…" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className={cn(
          "shrink-0 flex items-center justify-end gap-3 px-5 py-4",
          "border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
        )}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium",
            "text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)]",
            "border border-[var(--color-border)]",
            "hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
            "hover:brightness-110 active:brightness-95",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" label="Saving…" />
              Saving…
            </>
          ) : (
            <>
              <Save size={14} aria-hidden="true" />
              {initialData?.id ? "Save Changes" : "Create Template"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}