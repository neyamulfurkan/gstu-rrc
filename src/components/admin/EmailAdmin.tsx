// src/components/admin/EmailAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Mail,
  Send,
  FileText,
  Clock,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  RefreshCw,
  Eye,
  Copy,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { Badge, Alert, Spinner, Skeleton, toast } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Overlay";
import { Input, Select, FormLabel, FormError } from "@/components/ui/Forms";

// ─── Dynamic TipTap Import ─────────────────────────────────────────────────────

const TipTapEditor = dynamic(
  () =>
    import("@tiptap/react").then(async (mod) => {
      const { useEditor, EditorContent } = mod;
      const { default: StarterKit } = await import("@tiptap/starter-kit");
      const { default: Link } = await import("@tiptap/extension-link");
      const { default: Underline } = await import("@tiptap/extension-underline");

      function TipTapWrapper({
        value,
        onChange,
        placeholder,
      }: {
        value: string;
        onChange: (html: string) => void;
        placeholder?: string;
      }) {
        const editor = useEditor({
          extensions: [StarterKit, Link, Underline],
          content: value || "",
          onUpdate: ({ editor: e }) => {
            onChange(e.getHTML());
          },
          editorProps: {
            attributes: {
              class: cn(
                "min-h-[160px] max-h-[400px] overflow-y-auto p-3 text-sm",
                "text-[var(--color-text-primary)] focus:outline-none",
                "prose prose-sm prose-invert max-w-none"
              ),
            },
          },
        });

        useEffect(() => {
          if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || "", false);
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        if (!editor) {
          return (
            <div className="min-h-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          );
        }

        const toolbarBtn = (
          active: boolean,
          onClick: () => void,
          label: string,
          content: React.ReactNode
        ) => (
          <button
            type="button"
            title={label}
            onClick={onClick}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              active
                ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]"
            )}
          >
            {content}
          </button>
        );

        return (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
            <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
              {toolbarBtn(
                editor.isActive("bold"),
                () => editor.chain().focus().toggleBold().run(),
                "Bold",
                <strong>B</strong>
              )}
              {toolbarBtn(
                editor.isActive("italic"),
                () => editor.chain().focus().toggleItalic().run(),
                "Italic",
                <em>I</em>
              )}
              {toolbarBtn(
                editor.isActive("underline"),
                () => editor.chain().focus().toggleUnderline().run(),
                "Underline",
                <span className="underline">U</span>
              )}
              {toolbarBtn(
                editor.isActive("bulletList"),
                () => editor.chain().focus().toggleBulletList().run(),
                "Bullet List",
                "• List"
              )}
              {toolbarBtn(
                editor.isActive("orderedList"),
                () => editor.chain().focus().toggleOrderedList().run(),
                "Ordered List",
                "1. List"
              )}
            </div>
            <EditorContent editor={editor} />
            {placeholder && !editor.getText() && (
              <div className="pointer-events-none absolute top-12 left-3 text-sm text-[var(--color-text-secondary)]">
                {placeholder}
              </div>
            )}
          </div>
        );
      }

      return TipTapWrapper;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex items-center justify-center">
        <Spinner size="sm" />
      </div>
    ),
  }
);

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  key: string;
  name: string;
  description: string;
  placeholders: string[];
  sampleData: Record<string, string>;
}

interface EmailTemplateData {
  subject: string;
  body: string;
}

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: "delivered" | "bounced" | "failed" | "pending";
  sentAt: string;
}

interface EmailLogsResponse {
  data: EmailLog[];
  total: number;
  nextCursor?: string;
}

type TabKey = "templates" | "logs" | "broadcast";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    key: "application_received",
    name: "Application Received",
    description: "Sent to applicant immediately after submitting a membership application.",
    placeholders: ["{{applicantName}}", "{{applicationId}}", "{{statusUrl}}", "{{clubName}}"],
    sampleData: {
      "{{applicantName}}": "Rafiq Ahmed",
      "{{applicationId}}": "APP-2026-001",
      "{{statusUrl}}": "https://example.vercel.app/membership/status",
      "{{clubName}}": "GSTU Robotics & Research Club",
    },
  },
  {
    key: "application_approved",
    name: "Application Approved",
    description: "Sent when an admin approves a pending membership application.",
    placeholders: ["{{applicantName}}", "{{loginUrl}}", "{{email}}", "{{clubName}}"],
    sampleData: {
      "{{applicantName}}": "Rafiq Ahmed",
      "{{loginUrl}}": "https://example.vercel.app/login",
      "{{email}}": "rafiq@example.com",
      "{{clubName}}": "GSTU Robotics & Research Club",
    },
  },
  {
    key: "application_rejected",
    name: "Application Rejected",
    description: "Sent when an admin rejects a pending membership application.",
    placeholders: ["{{applicantName}}", "{{rejectionReason}}", "{{clubName}}"],
    sampleData: {
      "{{applicantName}}": "Rafiq Ahmed",
      "{{rejectionReason}}": "Unable to verify payment transaction.",
      "{{clubName}}": "GSTU Robotics & Research Club",
    },
  },
  {
    key: "certificate_issued",
    name: "Certificate Issued",
    description: "Sent when a certificate is issued to a member.",
    placeholders: [
      "{{memberName}}",
      "{{achievement}}",
      "{{certificateType}}",
      "{{pdfUrl}}",
      "{{verifyUrl}}",
      "{{serial}}",
      "{{clubName}}",
    ],
    sampleData: {
      "{{memberName}}": "Rafiq Ahmed",
      "{{achievement}}": "Excellence in Robotics",
      "{{certificateType}}": "Achievement",
      "{{pdfUrl}}": "https://res.cloudinary.com/example/certificate.pdf",
      "{{verifyUrl}}": "https://example.vercel.app/verify/GSTU-2026-A3F8E1C2",
      "{{serial}}": "GSTU-2026-A3F8E1C2",
      "{{clubName}}": "GSTU Robotics & Research Club",
    },
  },
  {
    key: "instrument_approved",
    name: "Instrument Borrow Approved",
    description: "Sent when a borrow request is approved by an admin.",
    placeholders: [
      "{{memberName}}",
      "{{instrumentName}}",
      "{{borrowDate}}",
      "{{returnDate}}",
      "{{adminNote}}",
      "{{clubName}}",
    ],
    sampleData: {
      "{{memberName}}": "Rafiq Ahmed",
      "{{instrumentName}}": "Oscilloscope",
      "{{borrowDate}}": "March 20, 2026",
      "{{returnDate}}": "March 27, 2026",
      "{{adminNote}}": "Please handle with care.",
      "{{clubName}}": "GSTU Robotics & Research Club",
    },
  },
  {
    key: "instrument_rejected",
    name: "Instrument Borrow Rejected",
    description: "Sent when a borrow request is rejected by an admin.",
    placeholders: ["{{memberName}}", "{{instrumentName}}", "{{rejectionReason}}", "{{clubName}}"],
    sampleData: {
      "{{memberName}}": "Rafiq Ahmed",
      "{{instrumentName}}": "Oscilloscope",
      "{{rejectionReason}}": "Instrument is reserved for lab use during this period.",
      "{{clubName}}": "GSTU Robotics & Research Club",
    },
  },
  {
    key: "event_reminder",
    name: "Event Reminder",
    description: "Sent as a reminder before an upcoming event.",
    placeholders: [
      "{{memberName}}",
      "{{eventName}}",
      "{{eventDate}}",
      "{{eventVenue}}",
      "{{eventUrl}}",
      "{{clubName}}",
    ],
    sampleData: {
      "{{memberName}}": "Rafiq Ahmed",
      "{{eventName}}": "Arduino Workshop 2026",
      "{{eventDate}}": "March 25, 2026 at 10:00 AM",
      "{{eventVenue}}": "CSE Lab, GSTU",
      "{{eventUrl}}": "https://example.vercel.app/events/arduino-workshop-2026",
      "{{clubName}}": "GSTU Robotics & Research Club",
    },
  },
  {
    key: "announcement",
    name: "New Announcement",
    description: "Sent when a new announcement is published and broadcast is enabled.",
    placeholders: [
      "{{memberName}}",
      "{{announcementTitle}}",
      "{{announcementExcerpt}}",
      "{{readMoreUrl}}",
      "{{clubName}}",
    ],
    sampleData: {
      "{{memberName}}": "Rafiq Ahmed",
      "{{announcementTitle}}": "Club General Meeting — March 2026",
      "{{announcementExcerpt}}": "All members are requested to attend the general meeting scheduled for March 30.",
      "{{readMoreUrl}}": "https://example.vercel.app",
      "{{clubName}}": "GSTU Robotics & Research Club",
    },
  },
];

const STATUS_CONFIG: Record<
  EmailLog["status"],
  { label: string; variant: "success" | "error" | "warning" | "neutral" }
> = {
  delivered: { label: "Delivered", variant: "success" },
  bounced: { label: "Bounced", variant: "warning" },
  failed: { label: "Failed", variant: "error" },
  pending: { label: "Pending", variant: "neutral" },
};

const SWR_FETCHER = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch error");
    return r.json();
  });

// ─── Template Editor Modal ─────────────────────────────────────────────────────

interface TemplateEditorModalProps {
  template: EmailTemplate;
  existingData: EmailTemplateData | null;
  onClose: () => void;
  onSave: (key: string, data: EmailTemplateData) => Promise<void>;
}

function TemplateEditorModal({
  template,
  existingData,
  onClose,
  onSave,
}: TemplateEditorModalProps) {
  const [subject, setSubject] = useState(existingData?.subject ?? "");
  const [body, setBody] = useState(existingData?.body ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function insertPlaceholder(placeholder: string) {
    setSubject((prev) => prev + placeholder);
  }

  function renderPreviewHtml(): string {
    let previewBody = body;
    let previewSubject = subject;

    Object.entries(template.sampleData).forEach(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedKey, "g");
      previewBody = previewBody.replace(regex, value);
      previewSubject = previewSubject.replace(regex, value);
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${previewSubject}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f4f4f5; color: #18181b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #0050FF; padding: 20px 24px; color: white; }
    .header h2 { margin: 0; font-size: 18px; }
    .subject-bar { background: #f0f4ff; padding: 10px 24px; font-size: 12px; color: #555; border-bottom: 1px solid #e0e7ff; }
    .body { padding: 24px; font-size: 14px; line-height: 1.6; }
    .footer { padding: 16px 24px; background: #fafafa; font-size: 12px; color: #888; border-top: 1px solid #eee; }
    a { color: #0050FF; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>GSTU Robotics &amp; Research Club</h2></div>
    <div class="subject-bar"><strong>Subject:</strong> ${previewSubject || "(no subject)"}</div>
    <div class="body">${previewBody || "<em style='color:#999'>No body content yet.</em>"}</div>
    <div class="footer">This is a preview with sample data. Actual emails will contain member-specific values.</div>
  </div>
</body>
</html>`;
  }

  useEffect(() => {
    if (showPreview && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(renderPreviewHtml());
        doc.close();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, subject, body]);

  async function handleSave() {
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    if (!body.trim()) {
      setError("Body is required.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(template.key, { subject: subject.trim(), body });
      toast("Template saved successfully.", "success");
      onClose();
    } catch {
      setError("Failed to save template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Edit Template: ${template.name}`}
      size="xl"
    >
      <div className="p-6 space-y-5">
        {error && <Alert variant="error" message={error} dismissible onDismiss={() => setError(null)} />}

        <div className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] rounded-lg p-3 border border-[var(--color-border)]">
          {template.description}
        </div>

        {/* Subject */}
        <div>
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Your application to {{clubName}} has been received"
            required
          />
        </div>

        {/* Body + Placeholders side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-1.5">
            <FormLabel>Body</FormLabel>
            <TipTapEditor
              value={body}
              onChange={setBody}
              placeholder="Write the email body here…"
            />
          </div>

          <div className="space-y-1.5">
            <FormLabel>Available Placeholders</FormLabel>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 space-y-1.5">
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                Click to insert into subject
              </p>
              {template.placeholders.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => insertPlaceholder(ph)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono",
                    "bg-[var(--color-bg-elevated)] text-[var(--color-accent)]",
                    "border border-[var(--color-accent)]/20",
                    "hover:border-[var(--color-accent)]/60 hover:bg-[var(--color-accent)]/5",
                    "transition-colors duration-150"
                  )}
                  title={`Sample: ${template.sampleData[ph] ?? ph}`}
                >
                  {ph}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview Toggle */}
        {showPreview && (
          <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-surface)] border-b border-[var(--color-border)]">
              <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Preview (sample data)
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Hide
              </button>
            </div>
            <iframe
              ref={iframeRef}
              title="Email preview"
              className="w-full border-0"
              style={{ height: "420px" }}
              sandbox="allow-same-origin"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm",
              "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
              "hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]",
              "transition-colors duration-150"
            )}
          >
            <Eye size={15} />
            {showPreview ? "Hide Preview" : "Preview"}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded-lg text-sm",
                "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-text-primary)] transition-colors duration-150"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-primary)] text-white",
                "hover:bg-[var(--color-primary-hover)] transition-colors duration-150",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {isSaving ? <Spinner size="sm" /> : null}
              Save Template
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Templates Tab ─────────────────────────────────────────────────────────────

interface TemplatesTabProps {
  emailTemplates: Record<string, EmailTemplateData>;
  onEdit: (template: EmailTemplate) => void;
}

function TemplatesTab({ emailTemplates, onEdit }: TemplatesTabProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Customize the email templates used for automated notifications. Changes override the default system templates.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EMAIL_TEMPLATES.map((template) => {
          const hasCustom = !!emailTemplates[template.key];
          return (
            <div
              key={template.key}
              className={cn(
                "rounded-xl border p-4 flex flex-col gap-3",
                "bg-[var(--color-bg-surface)] border-[var(--color-border)]",
                "hover:border-[var(--color-accent)]/30 transition-colors duration-150"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                      hasCustom
                        ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"
                    )}
                  >
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-5">
                      {template.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-4">
                      {template.description}
                    </p>
                  </div>
                </div>
                {hasCustom && (
                  <Badge variant="accent" size="sm" className="flex-shrink-0">
                    Custom
                  </Badge>
                )}
              </div>

              {hasCustom && emailTemplates[template.key]?.subject && (
                <div className="text-xs bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] truncate">
                  <span className="font-medium text-[var(--color-text-primary)]">Subj:</span>{" "}
                  {emailTemplates[template.key].subject}
                </div>
              )}

              <button
                type="button"
                onClick={() => onEdit(template)}
                className={cn(
                  "flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-sm font-medium",
                  "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40",
                  "transition-colors duration-150"
                )}
              >
                <FileText size={14} />
                {hasCustom ? "Edit Template" : "Customize Template"}
                <ChevronRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────

function LogsTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const pageSize = 25;

  const queryParams = new URLSearchParams({
    page: String(page),
    take: String(pageSize),
    ...(statusFilter ? { status: statusFilter } : {}),
  });

  const { data, error, isLoading, mutate } = useSWR<EmailLogsResponse>(
    `/api/admin/email-logs?${queryParams.toString()}`,
    SWR_FETCHER,
    { revalidateOnFocus: false }
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-48"
          options={[
            { value: "", label: "All Statuses" },
            { value: "delivered", label: "Delivered" },
            { value: "bounced", label: "Bounced" },
            { value: "failed", label: "Failed" },
            { value: "pending", label: "Pending" },
          ]}
        />
        <button
          type="button"
          onClick={() => mutate()}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm",
            "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
            "hover:text-[var(--color-text-primary)] transition-colors duration-150"
          )}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={48} rounded="md" className="w-full" />
          ))}
        </div>
      )}

      {error && (
        <Alert variant="error" message="Failed to load email logs. Please try again." />
      )}

      {!isLoading && !error && data && (
        <>
          {data.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Mail
                size={40}
                className="text-[var(--color-text-secondary)] mb-3 opacity-40"
              />
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                No email logs found
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 opacity-70">
                Email logs will appear here once emails are sent.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                        To
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider hidden md:table-cell">
                        Template
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider hidden sm:table-cell">
                        Sent At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((log, i) => {
                      const statusConf = STATUS_CONFIG[log.status] ?? {
                        label: log.status,
                        variant: "neutral" as const,
                      };
                      return (
                        <tr
                          key={log.id}
                          className={cn(
                            "border-b border-[var(--color-border)] last:border-0 transition-colors duration-100",
                            i % 2 === 0
                              ? "bg-[var(--color-bg-surface)]"
                              : "bg-[var(--color-bg-elevated)]",
                            "hover:bg-[var(--color-bg-elevated)]"
                          )}
                        >
                          <td className="px-4 py-3 text-[var(--color-text-primary)] max-w-[160px] truncate">
                            {log.to}
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-[200px] truncate">
                            {log.subject}
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden md:table-cell">
                            <code className="text-xs bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                              {log.template}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {log.status === "delivered" && (
                                <CheckCircle size={13} className="text-[var(--color-success)]" />
                              )}
                              {log.status === "failed" && (
                                <XCircle size={13} className="text-[var(--color-error)]" />
                              )}
                              {log.status === "bounced" && (
                                <AlertCircle size={13} className="text-[var(--color-warning)]" />
                              )}
                              {log.status === "pending" && (
                                <Clock size={13} className="text-[var(--color-text-secondary)]" />
                              )}
                              <Badge variant={statusConf.variant} size="sm">
                                {statusConf.label}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text-secondary)] text-xs hidden sm:table-cell whitespace-nowrap">
                            {formatDate(log.sentAt, "short")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[var(--color-text-secondary)]">
                {data.total} total log{data.total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border border-[var(--color-border)]",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                    "disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                  )}
                >
                  Previous
                </button>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border border-[var(--color-border)]",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                    "disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Broadcast Tab ─────────────────────────────────────────────────────────────

interface RoleOption {
  id: string;
  name: string;
}

function BroadcastTab() {
  const [recipientType, setRecipientType] = useState<"all" | "role">("all");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [isCountLoading, setIsCountLoading] = useState(false);

  const { data: rolesData } = useSWR<{ data: RoleOption[] }>(
    "/api/admin/roles",
    SWR_FETCHER,
    { revalidateOnFocus: false }
  );

  const roles: RoleOption[] = rolesData?.data ?? [];

  const fetchCount = useCallback(async () => {
    setIsCountLoading(true);
    try {
      const params = new URLSearchParams({ countOnly: "true" });
      if (recipientType === "role" && selectedRoleId) {
        params.set("roleId", selectedRoleId);
      }
      const res = await fetch(`/api/members?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setRecipientCount(json.total ?? null);
      }
    } catch {
      setRecipientCount(null);
    } finally {
      setIsCountLoading(false);
    }
  }, [recipientType, selectedRoleId]);

  function handleOpenConfirm() {
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    if (!body.trim()) {
      setError("Email body is required.");
      return;
    }
    if (recipientType === "role" && !selectedRoleId) {
      setError("Please select a role.");
      return;
    }
    setError(null);
    fetchCount();
    setConfirmOpen(true);
  }

  async function handleSend() {
    setIsSending(true);
    setError(null);
    try {
      const payload: Record<string, string> = {
        subject: subject.trim(),
        body,
        recipientType,
      };
      if (recipientType === "role" && selectedRoleId) {
        payload.roleId = selectedRoleId;
      }

      const res = await fetch("/api/admin/broadcast-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Failed to send broadcast email.");
      }

      toast("Broadcast email queued successfully.", "success");
      setSubject("");
      setBody("");
      setSelectedRoleId("");
      setRecipientType("all");
      setConfirmOpen(false);
      globalMutate((key: string) => typeof key === "string" && key.includes("email-logs"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send broadcast email.";
      setError(msg);
      setConfirmOpen(false);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Send a custom email to all members or a specific role group.
      </p>

      {error && (
        <Alert variant="error" message={error} dismissible onDismiss={() => setError(null)} />
      )}

      {/* Recipient Selection */}
      <div className="space-y-3">
        <FormLabel>Recipients</FormLabel>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setRecipientType("all");
              setSelectedRoleId("");
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150",
              recipientType === "all"
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40"
            )}
          >
            <Users size={16} />
            All Members
          </button>
          <button
            type="button"
            onClick={() => setRecipientType("role")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150",
              recipientType === "role"
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40"
            )}
          >
            <FileText size={16} />
            By Role
          </button>
        </div>

        {recipientType === "role" && (
          <Select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            placeholder="Select a role…"
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
          />
        )}
      </div>

      {/* Subject */}
      <Input
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Enter email subject…"
        required
      />

      {/* Body */}
      <div className="space-y-1.5">
        <FormLabel required>Body</FormLabel>
        <TipTapEditor
          value={body}
          onChange={setBody}
          placeholder="Write your broadcast message here…"
        />
      </div>

      {/* Send Button */}
      <div className="flex items-center justify-end pt-2 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={handleOpenConfirm}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:bg-[var(--color-primary-hover)] transition-colors duration-150"
          )}
        >
          <Send size={15} />
          Review & Send
        </button>
      </div>

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Broadcast Email"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
              <span>Recipients</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {recipientType === "all"
                  ? "All active members"
                  : `Role: ${roles.find((r) => r.id === selectedRoleId)?.name ?? selectedRoleId}`}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
              <span>Estimated recipients</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {isCountLoading ? (
                  <Spinner size="sm" />
                ) : recipientCount !== null ? (
                  `${recipientCount} member${recipientCount !== 1 ? "s" : ""}`
                ) : (
                  "—"
                )}
              </span>
            </div>

            <div className="flex items-start justify-between py-2 border-b border-[var(--color-border)]">
              <span>Subject</span>
              <span className="font-medium text-[var(--color-text-primary)] text-right max-w-[200px]">
                {subject}
              </span>
            </div>
          </div>

          <Alert
            variant="warning"
            message="This will send an email to all selected recipients immediately. This action cannot be undone."
          />

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg text-sm border border-[var(--color-border)]",
                "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                "transition-colors duration-150"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-primary)] text-white",
                "hover:bg-[var(--color-primary-hover)] transition-colors duration-150",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {isSending ? <Spinner size="sm" /> : <Send size={14} />}
              Send Now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main EmailAdmin Component ─────────────────────────────────────────────────

export function EmailAdmin(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>("templates");
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Fetch existing custom templates from config
  const { data: configData, mutate: mutateConfig } = useSWR<{
    emailTemplates?: Record<string, EmailTemplateData>;
  }>("/api/config?select=emailTemplates", SWR_FETCHER, {
    revalidateOnFocus: false,
  });

  const emailTemplates: Record<string, EmailTemplateData> =
    configData?.emailTemplates ?? {};

  const handleSaveTemplate = useCallback(
    async (key: string, data: EmailTemplateData) => {
      setIsSavingTemplate(true);
      try {
        const updated = { ...emailTemplates, [key]: data };
        const res = await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tab: "email-templates",
            emailTemplates: updated,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message || "Failed to save template.");
        }
        await mutateConfig();
      } finally {
        setIsSavingTemplate(false);
      }
    },
    [emailTemplates, mutateConfig]
  );

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "templates", label: "Templates", icon: <FileText size={15} /> },
    { key: "logs", label: "Logs", icon: <Clock size={15} /> },
    { key: "broadcast", label: "Broadcast", icon: <Send size={15} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Mail size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-heading)]">
            Email Management
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage email templates, view logs, and send broadcasts
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="flex gap-1" aria-label="Email admin tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg",
                "border border-transparent border-b-0 transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset",
                activeTab === tab.key
                  ? "border-[var(--color-border)] border-b-[var(--color-bg-base)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] -mb-px"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]"
              )}
              aria-selected={activeTab === tab.key}
              role="tab"
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div role="tabpanel">
        {activeTab === "templates" && (
          <TemplatesTab
            emailTemplates={emailTemplates}
            onEdit={(template) => setEditingTemplate(template)}
          />
        )}
        {activeTab === "logs" && <LogsTab />}
        {activeTab === "broadcast" && <BroadcastTab />}
      </div>

      {/* Template Editor Modal */}
      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          existingData={emailTemplates[editingTemplate.key] ?? null}
          onClose={() => setEditingTemplate(null)}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
}