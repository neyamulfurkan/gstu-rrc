// src/components/admin/CertificatesAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useForm,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Award,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  ShieldOff,
  ShieldCheck,
  FileText,
  X,
  Loader2,
  Search,
  ChevronDown,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";

import type {
  CertificateCard,
  MemberPublic,
} from "@/types/index";
import { cn, formatDate, cloudinaryUrl } from "@/lib/utils";
import { Table, EmptyState, Pagination } from "@/components/ui/DataDisplay";
import {
  Badge,
  Spinner,
  Skeleton,
  Alert,
  toast,
} from "@/components/ui/Feedback";
import {
  Modal,
  Drawer,
} from "@/components/ui/Overlay";
import { useMemberSearch } from "@/hooks/useMemberSearch";

// Dynamic imports for heavy components
const CertificateTemplateEditor = dynamic(
  () =>
    import("@/components/admin/forms/CertificateTemplateEditor").then(
      (m) => m.CertificateTemplateEditor
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    ),
    ssr: false,
  }
);

const CertificateCardComponent = dynamic(
  () =>
    import("@/components/certificates/CertificateCard").then(
      (m) => m.CertificateCard
    ),
  {
    loading: () => <Skeleton height={120} className="w-full" />,
    ssr: false,
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CertificateTemplate {
  id: string;
  name: string;
  type: string;
  previewUrl?: string | null;
  htmlContent: string;
  cssContent: string;
  createdAt: string;
}

interface IssuedCertificate extends CertificateCard {
  recipient: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string;
  };
  template: {
    name: string;
    type: string;
  };
}

interface MemberChip {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string;
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const issueSchema = z.object({
  templateId: z.string().min(1, "Please select a template"),
  achievement: z.string().min(2, "Achievement must be at least 2 characters"),
  issuedAt: z.string().min(1, "Please select a date"),
  signedByName: z.string().min(2, "Signatory name is required"),
  signedByDesignation: z.string().min(2, "Signatory designation is required"),
  signatureUrl: z.string().optional(),
});

type IssueFormValues = z.infer<typeof issueSchema>;

// ─── SWR Fetcher ──────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
  return res.json();
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

type TabId = "templates" | "issue" | "issued";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

function TabBar({ activeTab, onTabChange }: TabBarProps): JSX.Element {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "templates", label: "Templates", icon: <FileText size={16} /> },
    { id: "issue", label: "Issue Certificates", icon: <Award size={16} /> },
    { id: "issued", label: "Issued Certificates", icon: <ShieldCheck size={16} /> },
  ];

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset",
            activeTab === tab.id
              ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

interface TemplatesTabProps {
  templates: CertificateTemplate[];
  isLoading: boolean;
  onRefresh: () => void;
}

function TemplatesTab({ templates, isLoading, onRefresh }: TemplatesTabProps): JSX.Element {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CertificateTemplate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/cert-templates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to delete template");
      }
      toast("Template deleted", "success");
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleAdd(): void {
    setEditingTemplate(null);
    setEditorOpen(true);
  }

  function handleEdit(tmpl: CertificateTemplate): void {
    setEditingTemplate(tmpl);
    setEditorOpen(true);
  }

  function handleEditorClose(): void {
    setEditorOpen(false);
    setEditingTemplate(null);
  }

  function handleEditorSave(): void {
    handleEditorClose();
    onRefresh();
  }

  const typeColorMap: Record<string, "primary" | "accent" | "success" | "warning" | "neutral"> = {
    participation: "neutral",
    achievement: "accent",
    completion: "success",
    appreciation: "primary",
    excellence: "warning",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {isLoading ? "Loading..." : `${templates.length} template${templates.length !== 1 ? "s" : ""}`}
        </p>
        <button
          type="button"
          onClick={handleAdd}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <Plus size={16} />
          Add Template
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={180} className="w-full" rounded="lg" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon="FileText"
          heading="No certificate templates"
          description="Create your first template to start issuing certificates."
          action={{ label: "Add Template", onClick: handleAdd }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className={cn(
                "group rounded-xl border border-[var(--color-border)] overflow-hidden",
                "bg-[var(--color-bg-surface)] hover:border-[var(--color-card-border-hover)]",
                "transition-all duration-200"
              )}
            >
              {tmpl.previewUrl ? (
                <div className="relative h-32 bg-[var(--color-bg-elevated)] overflow-hidden">
                  <Image
                    src={cloudinaryUrl(tmpl.previewUrl, { width: 400, height: 200 })}
                    alt={tmpl.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              ) : (
                <div className="h-32 bg-[var(--color-bg-elevated)] overflow-hidden relative">
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><style>${tmpl.cssContent} body{zoom:0.18;transform-origin:top left;} </style></head><body>${tmpl.htmlContent}</body></html>`}
                    className="w-full border-0 pointer-events-none"
                    style={{ height: "550px", transform: "scale(0.18)", transformOrigin: "top left", width: "555%" }}
                    sandbox="allow-same-origin allow-scripts"
                    title={tmpl.name}
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)] leading-tight">
                    {tmpl.name}
                  </h3>
                  <Badge variant={typeColorMap[tmpl.type.toLowerCase()] ?? "neutral"} size="sm">
                    {tmpl.type}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                  Created {formatDate(tmpl.createdAt, "short")}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(tmpl)}
                    aria-label={`Edit ${tmpl.name}`}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                      "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                      "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                      "transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    )}
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(tmpl)}
                    aria-label={`Delete ${tmpl.name}`}
                    className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-lg",
                      "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                      "hover:border-[var(--color-error)] hover:text-[var(--color-error)]",
                      "transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
                    )}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Editor Modal */}
      <Modal
        isOpen={editorOpen}
        onClose={handleEditorClose}
        title={editingTemplate ? "Edit Template" : "New Certificate Template"}
        size="full"
      >
        <div className="p-6">
          <CertificateTemplateEditor
            key={editingTemplate?.id ?? "new"}
            initialData={editingTemplate ?? undefined}
            onSubmit={async (data) => {
              const method = editingTemplate?.id ? "PUT" : "POST";
              const body = editingTemplate?.id
                ? { id: editingTemplate.id, ...data }
                : data;
              const res = await fetch("/api/admin/cert-templates", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error ?? err.message ?? "Failed to save template");
              }
              handleEditorSave();
            }}
            onClose={handleEditorClose}
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        title="Delete Template"
        size="sm"
      >
        <div className="p-6">
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {deleteTarget?.name}
            </span>
            ? This cannot be undone.
          </p>
          {deleteError && (
            <Alert variant="error" message={deleteError} className="mb-4" />
          )}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-text-primary)] transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteLoading}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-error)] text-white",
                "hover:opacity-90 disabled:opacity-60 transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
              )}
            >
              {deleteLoading && <Spinner size="sm" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Recipient Multi-Select ───────────────────────────────────────────────────

interface RecipientSelectorProps {
  selected: MemberChip[];
  onAdd: (member: MemberChip) => void;
  onRemove: (memberId: string) => void;
}

function RecipientSelector({ selected, onAdd, onRemove }: RecipientSelectorProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { members, isLoading } = useMemberSearch(searchQuery);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredMembers = members.filter(
    (m) => !selected.some((s) => s.id === m.id)
  );

  function handleSelect(member: MemberChip): void {
    onAdd(member);
    setSearchQuery("");
    setDropdownOpen(false);
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          {selected.map((member) => (
            <span
              key={member.id}
              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)]"
            >
              <span className="relative w-5 h-5 rounded-full overflow-hidden bg-[var(--color-bg-elevated)] flex-shrink-0">
                {member.avatarUrl ? (
                  <Image
                    src={cloudinaryUrl(member.avatarUrl, { width: 40 })}
                    alt={member.fullName}
                    fill
                    className="object-cover"
                    sizes="20px"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] text-[8px] font-bold">
                    {member.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              {member.fullName}
              <button
                type="button"
                onClick={() => onRemove(member.id)}
                aria-label={`Remove ${member.fullName}`}
                className="hover:text-[var(--color-error)] transition-colors focus:outline-none"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <Search size={14} className="text-[var(--color-text-secondary)]" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => searchQuery.length >= 2 && setDropdownOpen(true)}
          placeholder="Search members to add..."
          className={cn(
            "w-full pl-9 pr-4 py-2.5 rounded-lg text-sm",
            "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
            "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
            "transition-colors duration-150"
          )}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <Spinner size="sm" />
          </div>
        )}

        {/* Dropdown */}
        {dropdownOpen && searchQuery.length >= 2 && (
          <div className={cn(
            "absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-[var(--color-border)]",
            "bg-[var(--color-bg-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]",
            "max-h-48 overflow-y-auto"
          )}>
            {filteredMembers.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--color-text-secondary)] text-center">
                {isLoading ? "Searching..." : "No members found"}
              </div>
            ) : (
              filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelect(member)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left",
                    "hover:bg-[var(--color-bg-surface)] transition-colors duration-100",
                    "focus:outline-none focus:bg-[var(--color-bg-surface)]"
                  )}
                >
                  <span className="relative w-7 h-7 rounded-full overflow-hidden bg-[var(--color-bg-surface)] flex-shrink-0">
                    {member.avatarUrl ? (
                      <Image
                        src={cloudinaryUrl(member.avatarUrl, { width: 56 })}
                        alt={member.fullName}
                        fill
                        className="object-cover"
                        sizes="28px"
                      />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] text-xs font-bold">
                        {member.fullName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {member.fullName}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)] truncate">
                      @{member.username}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Search and select one or more members to receive this certificate.
        </p>
      )}
    </div>
  );
}

// ─── Issue Tab ────────────────────────────────────────────────────────────────

interface IssueTabProps {
  templates: CertificateTemplate[];
  onIssueSuccess: () => void;
}

function IssueTab({ templates, onIssueSuccess }: IssueTabProps): JSX.Element {
  const [recipients, setRecipients] = useState<MemberChip[]>([]);
  const [issuing, setIssuing] = useState(false);
  const [issueProgress, setIssueProgress] = useState<{ current: number; total: number } | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [signatureUploading, setSignatureUploading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      issuedAt: today,
    },
  });

  const selectedTemplateId = watch("templateId");
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  function handleAddRecipient(member: MemberChip): void {
    setRecipients((prev) =>
      prev.some((p) => p.id === member.id) ? prev : [...prev, member]
    );
  }

  function handleRemoveRecipient(memberId: string): void {
    setRecipients((prev) => prev.filter((m) => m.id !== memberId));
  }

  async function handlePreview(): Promise<void> {
    if (!selectedTemplate) return;
    if (recipients.length === 0) {
      toast("Add at least one recipient to preview", "error");
      return;
    }
    setPreviewLoading(true);
    const formValues = watch();
    const first = recipients[0];
    let html = selectedTemplate.htmlContent;
    const css = selectedTemplate.cssContent;
    html = html
      .replace(/\{\{member_name\}\}/g, first.fullName)
      .replace(/\{\{achievement\}\}/g, formValues.achievement ?? "Achievement")
      .replace(/\{\{date\}\}/g, formValues.issuedAt ?? today)
      .replace(/\{\{signed_by_name\}\}/g, formValues.signedByName ?? "")
      .replace(/\{\{signed_by_designation\}\}/g, formValues.signedByDesignation ?? "")
      .replace(/\{\{signature_image\}\}/g, signatureUrl ? `<img src="${signatureUrl}" style="max-height:60px;" />` : "")
      .replace(/\{\{serial\}\}/g, "GSTU-2026-PREVIEW")
      .replace(/\{\{qr_code\}\}/g, "")
      .replace(/\{\{club_name\}\}/g, "GSTU Robotics & Research Club")
      .replace(/\{\{logo_url\}\}/g, "");
    const fullHtml = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
    setPreviewHtml(fullHtml);
    setPreviewOpen(true);
    setPreviewLoading(false);
  }

  async function onSubmit(data: IssueFormValues): Promise<void> {
    if (recipients.length === 0) {
      setIssueError("Please add at least one recipient.");
      return;
    }
    setIssuing(true);
    setIssueError(null);
    setIssueProgress({ current: 0, total: recipients.length });

    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: data.templateId,
          recipientIds: recipients.map((r) => r.id),
          achievement: data.achievement,
          issuedAt: data.issuedAt,
          signedByName: data.signedByName,
          signedByDesignation: data.signedByDesignation,
          signatureUrl: signatureUrl || undefined,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(result.message ?? "Failed to issue certificates");
      }

      const issued = result.data?.successCount ?? result.issued ?? recipients.length;
      const failed = result.data?.failureCount ?? result.failed ?? 0;

      if (failed > 0) {
        toast(
          `Issued ${issued} certificates. ${failed} failed.`,
          "info"
        );
      } else {
        toast(
          `Successfully issued ${issued} certificate${issued !== 1 ? "s" : ""}`,
          "success"
        );
      }

      setRecipients([]);
      onIssueSuccess();
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIssuing(false);
      setIssueProgress(null);
    }
  }

  // Cloudinary signature upload
  async function handleSignatureUpload(file: File): Promise<void> {
    if (!file) return;
    setSignatureUploading(true);
    try {
      const paramsRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "admin/certificates" }),
      });
      if (!paramsRes.ok) throw new Error("Failed to get upload params");
      const { signature, timestamp, cloudName, apiKey } = await paramsRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "admin/certificates");
      formData.append("signature", signature);
      formData.append("timestamp", String(timestamp));
      formData.append("api_key", apiKey);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      setSignatureUrl(uploadData.secure_url ?? "");
      toast("Signature uploaded", "success");
    } catch {
      toast("Failed to upload signature", "error");
    } finally {
      setSignatureUploading(false);
    }
  }

  const inputClass = cn(
    "w-full px-4 py-2.5 rounded-lg text-sm",
    "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
    "transition-colors duration-150"
  );

  const labelClass = "block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5";
  const errorClass = "mt-1 text-xs text-[var(--color-error)]";

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Template Select */}
        <div>
          <label className={labelClass} htmlFor="templateId">
            Certificate Template <span className="text-[var(--color-error)]">*</span>
          </label>
          <div className="relative">
            <select
              id="templateId"
              {...register("templateId")}
              className={cn(
                inputClass,
                "appearance-none pr-10",
                errors.templateId && "border-[var(--color-error)] focus:ring-[var(--color-error)]"
              )}
            >
              <option value="">Select a template…</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name} ({tmpl.type})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
            </div>
          </div>
          {errors.templateId && (
            <p className={errorClass} role="alert">{errors.templateId.message}</p>
          )}
        </div>

        {/* Recipients */}
        <div>
          <label className={labelClass}>
            Recipients <span className="text-[var(--color-error)]">*</span>
            {recipients.length > 0 && (
              <span className="ml-2 text-[var(--color-accent)]">
                {recipients.length} selected
              </span>
            )}
          </label>
          <RecipientSelector
            selected={recipients}
            onAdd={handleAddRecipient}
            onRemove={handleRemoveRecipient}
          />
        </div>

        {/* Achievement */}
        <div>
          <label className={labelClass} htmlFor="achievement">
            Achievement <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            id="achievement"
            type="text"
            placeholder="e.g., Outstanding Performance in Robotics Workshop 2026"
            {...register("achievement")}
            className={cn(
              inputClass,
              errors.achievement && "border-[var(--color-error)] focus:ring-[var(--color-error)]"
            )}
            aria-describedby={errors.achievement ? "achievement-error" : undefined}
          />
          {errors.achievement && (
            <p id="achievement-error" className={errorClass} role="alert">
              {errors.achievement.message}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className={labelClass} htmlFor="issuedAt">
            Issue Date <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            id="issuedAt"
            type="date"
            {...register("issuedAt")}
            className={cn(
              inputClass,
              errors.issuedAt && "border-[var(--color-error)] focus:ring-[var(--color-error)]"
            )}
            aria-describedby={errors.issuedAt ? "issuedAt-error" : undefined}
          />
          {errors.issuedAt && (
            <p id="issuedAt-error" className={errorClass} role="alert">
              {errors.issuedAt.message}
            </p>
          )}
        </div>

        {/* Signatory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="signedByName">
              Signed By (Name) <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="signedByName"
              type="text"
              placeholder="e.g., Dr. Rahim Uddin"
              {...register("signedByName")}
              className={cn(
                inputClass,
                errors.signedByName && "border-[var(--color-error)] focus:ring-[var(--color-error)]"
              )}
              aria-describedby={errors.signedByName ? "signedByName-error" : undefined}
            />
            {errors.signedByName && (
              <p id="signedByName-error" className={errorClass} role="alert">
                {errors.signedByName.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="signedByDesignation">
              Designation <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="signedByDesignation"
              type="text"
              placeholder="e.g., Faculty Advisor"
              {...register("signedByDesignation")}
              className={cn(
                inputClass,
                errors.signedByDesignation && "border-[var(--color-error)] focus:ring-[var(--color-error)]"
              )}
              aria-describedby={errors.signedByDesignation ? "signedByDesignation-error" : undefined}
            />
            {errors.signedByDesignation && (
              <p id="signedByDesignation-error" className={errorClass} role="alert">
                {errors.signedByDesignation.message}
              </p>
            )}
          </div>
        </div>

        {/* Signature Upload */}
        <div>
          <label className={labelClass}>Signature Image (optional)</label>
          <div className="flex items-center gap-4">
            {signatureUrl ? (
              <div className="relative h-14 w-32 border border-[var(--color-border)] rounded-lg overflow-hidden bg-white">
                <Image
                  src={signatureUrl}
                  alt="Signature"
                  fill
                  className="object-contain"
                  sizes="128px"
                />
              </div>
            ) : null}
            <label
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer",
                "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                "transition-colors duration-150",
                signatureUploading && "opacity-60 pointer-events-none"
              )}
            >
              {signatureUploading ? <Spinner size="sm" /> : <Plus size={14} />}
              {signatureUrl ? "Change" : "Upload Signature"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSignatureUpload(file);
                }}
              />
            </label>
            {signatureUrl && (
              <button
                type="button"
                onClick={() => setSignatureUrl("")}
                className="text-xs text-[var(--color-error)] hover:underline focus:outline-none"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {issueError && (
          <Alert variant="error" message={issueError} dismissible onDismiss={() => setIssueError(null)} />
        )}

        {issueProgress && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
            <Spinner size="sm" />
            <p className="text-sm text-[var(--color-primary)]">
              Issuing certificates ({issueProgress.current}/{issueProgress.total})…
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading || !selectedTemplate}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
              "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
              "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
              "disabled:opacity-50 disabled:pointer-events-none",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            {previewLoading ? <Spinner size="sm" /> : <Eye size={16} />}
            Preview
          </button>
          <button
            type="submit"
            disabled={issuing || recipients.length === 0}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium",
              "bg-[var(--color-primary)] text-white",
              "hover:opacity-90 active:scale-95",
              "disabled:opacity-50 disabled:pointer-events-none",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            {issuing ? <Spinner size="sm" /> : <Award size={16} />}
            {issuing
              ? "Issuing…"
              : `Issue to ${recipients.length} Recipient${recipients.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Certificate Preview"
        size="full"
      >
        <div className="p-4 h-[75vh]">
          {previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              title="Certificate Preview"
              className="w-full h-full rounded-lg border border-[var(--color-border)] bg-white"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Spinner size="lg" />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─── Issued Certificates Tab ──────────────────────────────────────────────────

interface IssuedTabProps {
  shouldRefresh: number;
}

function IssuedTab({ shouldRefresh }: IssuedTabProps): JSX.Element {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    data,
    isLoading,
    mutate,
  } = useSWR<{ data: IssuedCertificate[]; total: number }>(
    `/api/certificates?take=${PAGE_SIZE}&cursor=${page > 1 ? "use-offset" : ""}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    mutate();
  }, [shouldRefresh, mutate]);

  const [revokeTarget, setRevokeTarget] = useState<IssuedCertificate | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const certificates = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function handleRevoke(cert: IssuedCertificate, action: "revoke" | "unrevoke"): Promise<void> {
    setRevokeLoading(true);
    setRevokeError(null);
    try {
      const res = await fetch(`/api/certificates/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Action failed");
      }
      toast(
        action === "revoke" ? "Certificate revoked" : "Certificate reinstated",
        "success"
      );
      setRevokeTarget(null);
      mutate();
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setRevokeLoading(false);
    }
  }

  const columns = [
    {
      key: "recipient",
      header: "Recipient",
      render: (row: IssuedCertificate) => (
        <div className="flex items-center gap-2.5">
          <span className="relative w-8 h-8 rounded-full overflow-hidden bg-[var(--color-bg-elevated)] flex-shrink-0">
            {row.recipient?.avatarUrl ? (
              <Image
                src={cloudinaryUrl(row.recipient.avatarUrl, { width: 64 })}
                alt={row.recipient.fullName}
                fill
                className="object-cover"
                sizes="32px"
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] text-xs font-bold">
                {row.recipient?.fullName?.charAt(0).toUpperCase() ?? "?"}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {row.recipient?.fullName ?? "—"}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] truncate">
              @{row.recipient?.username ?? "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "achievement",
      header: "Achievement",
      render: (row: IssuedCertificate) => (
        <span className="text-sm text-[var(--color-text-primary)] line-clamp-2 max-w-[200px]">
          {row.achievement}
        </span>
      ),
    },
    {
      key: "template",
      header: "Template",
      render: (row: IssuedCertificate) => (
        <Badge variant="primary" size="sm">{row.template?.name ?? "—"}</Badge>
      ),
    },
    {
      key: "serial",
      header: "Serial",
      render: (row: IssuedCertificate) => (
        <code className="text-xs font-[var(--font-mono)] text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 rounded">
          {row.serial}
        </code>
      ),
    },
    {
      key: "issuedAt",
      header: "Issued",
      render: (row: IssuedCertificate) => (
        <span className="text-sm text-[var(--color-text-secondary)]">
          {formatDate(row.issuedAt, "short")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: IssuedCertificate) => (
        <Badge variant={row.isRevoked ? "error" : "success"} size="sm">
          {row.isRevoked ? "Revoked" : "Valid"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: IssuedCertificate) => (
        <div className="flex items-center gap-1.5">
          {row.pdfUrl && (
            <a
              href={row.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download certificate PDF"
              className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-lg",
                "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                "transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              <Download size={14} />
            </a>
          )}
          <button
            type="button"
            onClick={() => setRevokeTarget(row)}
            aria-label={row.isRevoked ? "Reinstate certificate" : "Revoke certificate"}
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-lg",
              "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
              row.isRevoked
                ? "hover:border-[var(--color-success)] hover:text-[var(--color-success)]"
                : "hover:border-[var(--color-error)] hover:text-[var(--color-error)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            {row.isRevoked ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {isLoading ? "Loading…" : `${total} certificate${total !== 1 ? "s" : ""} issued`}
        </p>
      </div>

      <Table
        columns={columns as never}
        data={certificates as never}
        loading={isLoading}
        skeletonRows={8}
        emptyMessage="No certificates have been issued yet."
        rowKey={(row: unknown) => (row as IssuedCertificate).id}
        striped
      />

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Revoke/Unrevoke Confirmation */}
      <Modal
        isOpen={!!revokeTarget}
        onClose={() => { setRevokeTarget(null); setRevokeError(null); }}
        title={revokeTarget?.isRevoked ? "Reinstate Certificate" : "Revoke Certificate"}
        size="sm"
      >
        <div className="p-6">
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            {revokeTarget?.isRevoked ? (
              <>
                Reinstate certificate{" "}
                <code className="font-[var(--font-mono)] text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1 rounded">
                  {revokeTarget?.serial}
                </code>{" "}
                for <span className="font-semibold text-[var(--color-text-primary)]">{revokeTarget?.recipient?.fullName}</span>?
              </>
            ) : (
              <>
                Revoke certificate{" "}
                <code className="font-[var(--font-mono)] text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1 rounded">
                  {revokeTarget?.serial}
                </code>{" "}
                for <span className="font-semibold text-[var(--color-text-primary)]">{revokeTarget?.recipient?.fullName}</span>? This will mark it as invalid.
              </>
            )}
          </p>
          {revokeError && (
            <Alert variant="error" message={revokeError} className="mb-4" />
          )}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setRevokeTarget(null); setRevokeError(null); }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-text-primary)] transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={revokeLoading}
              onClick={() => {
                if (revokeTarget) {
                  handleRevoke(revokeTarget, revokeTarget.isRevoked ? "unrevoke" : "revoke");
                }
              }}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                revokeTarget?.isRevoked
                  ? "bg-[var(--color-success)] text-white hover:opacity-90"
                  : "bg-[var(--color-error)] text-white hover:opacity-90",
                "disabled:opacity-60 transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              {revokeLoading && <Spinner size="sm" />}
              {revokeTarget?.isRevoked ? "Reinstate" : "Revoke"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CertificatesAdmin(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("templates");
  const [issueSuccessCount, setIssueSuccessCount] = useState(0);

  const {
    data: templatesData,
    isLoading: templatesLoading,
    mutate: mutateTemplates,
  } = useSWR<{ data: CertificateTemplate[]; total: number }>(
    "/api/admin/cert-templates",
    fetcher,
    { revalidateOnFocus: false }
  );

  const templates = templatesData?.data ?? [];

  const handleIssueSuccess = useCallback(() => {
    setIssueSuccessCount((c) => c + 1);
    setActiveTab("issued");
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Certificates
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Manage certificate templates and issue certificates to members
          </p>
        </div>
      </div>

      {/* Tabs */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "templates" && (
        <TemplatesTab
          templates={templates}
          isLoading={templatesLoading}
          onRefresh={mutateTemplates}
        />
      )}

      {activeTab === "issue" && (
        <IssueTab
          templates={templates}
          onIssueSuccess={handleIssueSuccess}
        />
      )}

      {activeTab === "issued" && (
        <IssuedTab shouldRefresh={issueSuccessCount} />
      )}
    </div>
  );
}