// src/components/admin/ApplicationsAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
  CheckCircle,
  XCircle,
  Eye,
  ChevronDown,
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Smartphone,
  Hash,
  Building2,
  GraduationCap,
  Clock,
  ImageIcon,
  RefreshCw,
} from "lucide-react";

import type { ApplicationItem } from "@/types/index";
import { formatDate, cn } from "@/lib/utils";
import { Table, EmptyState } from "@/components/ui/DataDisplay";
import {
  Badge,
  Spinner,
  Alert,
  useToast,
  toast,
} from "@/components/ui/Feedback";
import { Modal, Drawer } from "@/components/ui/Overlay";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApplicationStatus = "pending" | "approved" | "rejected" | "all";

interface RoleOption {
  id: string;
  name: string;
  color: string;
  category: string;
}

interface TabConfig {
  key: ApplicationStatus;
  label: string;
  badgeVariant: "warning" | "success" | "error" | "neutral";
}

const TABS: TabConfig[] = [
  { key: "pending", label: "Pending", badgeVariant: "warning" },
  { key: "approved", label: "Approved", badgeVariant: "success" },
  { key: "rejected", label: "Rejected", badgeVariant: "error" },
  { key: "all", label: "All", badgeVariant: "neutral" },
];

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? "Fetch failed");
  }
  return res.json() as Promise<T>;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }): JSX.Element {
  const safeStatus = status ?? "";
  const variantMap: Record<string, "warning" | "success" | "error" | "neutral"> = {
    pending: "warning",
    approved: "success",
    rejected: "error",
  };
  const variant = variantMap[safeStatus] ?? "neutral";
  return (
    <Badge variant={variant} size="sm">
      {safeStatus ? safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1) : "Unknown"}
    </Badge>
  );
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

function FieldRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--color-border)] last:border-0">
      <span className="flex-shrink-0 mt-0.5 text-[var(--color-text-secondary)]">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--color-text-secondary)] mb-0.5 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-[var(--color-text-primary)] break-words">
          {value ?? <span className="opacity-40 italic">Not provided</span>}
        </p>
      </div>
    </div>
  );
}

// ─── ScreenshotModal ──────────────────────────────────────────────────────────

function ScreenshotModal({
  url,
  isOpen,
  onClose,
}: {
  url: string;
  isOpen: boolean;
  onClose: () => void;
}): JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Screenshot" size="lg">
      <div className="p-4 flex items-center justify-center bg-[var(--color-bg-base)] min-h-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Payment screenshot"
          className="max-w-full max-h-[70vh] object-contain rounded-lg"
        />
      </div>
    </Modal>
  );
}

// ─── ApplicationDrawer ────────────────────────────────────────────────────────

interface ApplicationDrawerProps {
  applicationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete: () => void;
}

function ApplicationDrawer({
  applicationId,
  isOpen,
  onClose,
  onActionComplete,
}: ApplicationDrawerProps): JSX.Element {
  const [actionMode, setActionMode] = useState<"idle" | "approve" | "reject">("idle");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: appResponse, isLoading: appLoading } = useSWR<{ data: ApplicationItem }>(
    applicationId && isOpen ? `/api/applications/${applicationId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const app = appResponse?.data ?? null;

  const { data: rolesData } = useSWR<{ data: RoleOption[] }>(
    isOpen && actionMode === "approve" ? "/api/admin/roles" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const roles = rolesData?.data ?? [];

  // Reset state when drawer opens/closes or application changes
  useEffect(() => {
    if (!isOpen) {
      setActionMode("idle");
      setSelectedRoleId("");
      setNote("");
      setSubmitError(null);
      setScreenshotOpen(false);
    }
  }, [isOpen, applicationId]);

  // Set default role when roles load
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      const generalRole = roles.find((r) => r.category === "general");
      setSelectedRoleId(generalRole?.id ?? roles[0]?.id ?? "");
    }
  }, [roles, selectedRoleId]);

  const handleAction = useCallback(
    async (action: "approve" | "reject") => {
      if (!applicationId) return;
      if (action === "approve" && !selectedRoleId) {
        setSubmitError("Please select a role for the new member.");
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const body: Record<string, unknown> = { action, note: note.trim() || undefined };
        if (action === "approve") {
          body.roleId = selectedRoleId;
        }

        const res = await fetch(`/api/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            (json as { message?: string }).message ?? "Action failed. Please try again."
          );
        }

        toast(
          action === "approve"
            ? "Application approved. Member account created."
            : "Application rejected.",
          action === "approve" ? "success" : "info"
        );

        onActionComplete();
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error.";
        setSubmitError(message);
        toast(message, "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [applicationId, selectedRoleId, note, onActionComplete, onClose]
  );

  const paymentMethodLabel =
    app?.paymentMethod === "bkash"
      ? "bKash"
      : app?.paymentMethod === "nagad"
      ? "Nagad"
      : app?.paymentMethod ?? "—";

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Application Review"
        side="right"
        width="520px"
      >
        {appLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" label="Loading application..." />
          </div>
        ) : !app ? (
          <div className="p-6">
            <Alert variant="error" message="Failed to load application details." />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Applicant Header */}
            <div className="px-6 py-4 bg-[var(--color-bg-surface)] border-b border-[var(--color-border)]">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {app.avatarUrl && !app.avatarUrl.startsWith('blob:') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={app.avatarUrl}
                      alt={app.fullName}
                      className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-border)]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border)] flex items-center justify-center">
                      <User size={32} className="text-[var(--color-text-secondary)]" />
                    </div>
                  )}
                  <span
                    className={cn(
                      "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[var(--color-bg-surface)]",
                      app.status === "pending"
                        ? "bg-[var(--color-warning)]"
                        : app.status === "approved"
                        ? "bg-[var(--color-success)]"
                        : "bg-[var(--color-error)]"
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] font-[var(--font-heading)] truncate">
                    {app.fullName}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] truncate">{app.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={app.status} />
                    <Badge variant="neutral" size="sm">
                      {app.memberType === "alumni" ? "Alumni" : "Member"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-0">
              <FieldRow
                icon={<Hash size={14} />}
                label="Student ID"
                value={app.studentId}
              />
              <FieldRow
                icon={<Mail size={14} />}
                label="Email"
                value={app.email}
              />
              <FieldRow
                icon={<Phone size={14} />}
                label="Phone"
                value={app.phone}
              />
              <FieldRow
                icon={<Building2 size={14} />}
                label="Department"
                value={(app as unknown as { department?: { name: string } }).department?.name ?? app.departmentId}
              />
              <FieldRow
                icon={<GraduationCap size={14} />}
                label="Session"
                value={app.session}
              />
              <FieldRow
                icon={<Calendar size={14} />}
                label="Submitted"
                value={formatDate(app.createdAt, "full")}
              />
              {app.reviewedAt && (
                <FieldRow
                  icon={<Clock size={14} />}
                  label="Reviewed"
                  value={formatDate(app.reviewedAt, "full")}
                />
              )}

              {/* Payment Section */}
              <div className="pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                  Payment Details
                </p>
                <FieldRow
                  icon={<CreditCard size={14} />}
                  label="Method"
                  value={paymentMethodLabel}
                />
                <FieldRow
                  icon={<Hash size={14} />}
                  label="Transaction ID"
                  value={app.transactionId}
                />
                <FieldRow
                  icon={<Smartphone size={14} />}
                  label="Sender Phone"
                  value={app.senderPhone}
                />
                {app.screenshotUrl && (
                  <div className="py-2.5 border-b border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-secondary)] mb-1.5 font-medium uppercase tracking-wider">
                      Payment Screenshot
                    </p>
                    <button
                      type="button"
                      onClick={() => setScreenshotOpen(true)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                        "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                        "text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/40",
                        "transition-colors duration-150",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      )}
                    >
                      <ImageIcon size={14} className="text-[var(--color-accent)]" />
                      View Screenshot
                      <Eye size={12} className="ml-auto text-[var(--color-text-secondary)]" />
                    </button>
                  </div>
                )}
              </div>

              {/* Admin Note (if already reviewed) */}
              {app.adminNote && (
                <div className="pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                    Admin Note
                  </p>
                  <p className="text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] rounded-lg p-3 border border-[var(--color-border)]">
                    {app.adminNote}
                  </p>
                </div>
              )}
            </div>

            {/* Action Section — only for pending */}
            {app.status === "pending" && (
              <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] space-y-3">
                {submitError && (
                  <Alert variant="error" message={submitError} dismissible />
                )}

                {actionMode === "idle" && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setActionMode("approve")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
                        "bg-[var(--color-success)]/10 border border-[var(--color-success)]/30",
                        "text-[var(--color-success)] text-sm font-semibold",
                        "hover:bg-[var(--color-success)]/20 transition-colors duration-150",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-success)]"
                      )}
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionMode("reject")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
                        "bg-[var(--color-error)]/10 border border-[var(--color-error)]/30",
                        "text-[var(--color-error)] text-sm font-semibold",
                        "hover:bg-[var(--color-error)]/20 transition-colors duration-150",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
                      )}
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                )}

                {actionMode === "approve" && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[var(--color-success)]">
                      Approve Application
                    </p>

                    {/* Role selection */}
                    <div>
                      <label
                        htmlFor="role-select"
                        className="block text-xs text-[var(--color-text-secondary)] mb-1 font-medium"
                      >
                        Assign Role *
                      </label>
                      <div className="relative">
                        <select
                          id="role-select"
                          value={selectedRoleId}
                          onChange={(e) => setSelectedRoleId(e.target.value)}
                          className={cn(
                            "w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg",
                            "bg-[var(--color-bg-base)] border border-[var(--color-border)]",
                            "text-[var(--color-text-primary)]",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                            "focus:border-[var(--color-accent)]"
                          )}
                        >
                          {roles.length === 0 ? (
                            <option value="">Loading roles…</option>
                          ) : (
                            roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))
                          )}
                        </select>
                        <ChevronDown
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
                        />
                      </div>
                    </div>

                    {/* Optional note */}
                    <div>
                      <label
                        htmlFor="approve-note"
                        className="block text-xs text-[var(--color-text-secondary)] mb-1 font-medium"
                      >
                        Note (optional)
                      </label>
                      <textarea
                        id="approve-note"
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Welcome message or notes…"
                        className={cn(
                          "w-full px-3 py-2 text-sm rounded-lg resize-none",
                          "bg-[var(--color-bg-base)] border border-[var(--color-border)]",
                          "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        )}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActionMode("idle");
                          setSubmitError(null);
                        }}
                        disabled={isSubmitting}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)]",
                          "border border-[var(--color-border)] hover:border-[var(--color-text-secondary)]/40",
                          "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        )}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction("approve")}
                        disabled={isSubmitting || !selectedRoleId}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                          "bg-[var(--color-success)] text-white text-sm font-semibold",
                          "hover:opacity-90 active:scale-[0.98] transition-all",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--color-success)]"
                        )}
                      >
                        {isSubmitting ? (
                          <Spinner size="sm" label="Approving…" />
                        ) : (
                          <>
                            <CheckCircle size={15} />
                            Confirm Approval
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {actionMode === "reject" && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[var(--color-error)]">
                      Reject Application
                    </p>

                    <div>
                      <label
                        htmlFor="reject-note"
                        className="block text-xs text-[var(--color-text-secondary)] mb-1 font-medium"
                      >
                        Reason (optional — will be emailed to applicant)
                      </label>
                      <textarea
                        id="reject-note"
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Incomplete payment information…"
                        className={cn(
                          "w-full px-3 py-2 text-sm rounded-lg resize-none",
                          "bg-[var(--color-bg-base)] border border-[var(--color-border)]",
                          "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        )}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActionMode("idle");
                          setSubmitError(null);
                        }}
                        disabled={isSubmitting}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)]",
                          "border border-[var(--color-border)] hover:border-[var(--color-text-secondary)]/40",
                          "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        )}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction("reject")}
                        disabled={isSubmitting}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                          "bg-[var(--color-error)] text-white text-sm font-semibold",
                          "hover:opacity-90 active:scale-[0.98] transition-all",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
                        )}
                      >
                        {isSubmitting ? (
                          <Spinner size="sm" label="Rejecting…" />
                        ) : (
                          <>
                            <XCircle size={15} />
                            Confirm Rejection
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Screenshot Modal */}
      {app?.screenshotUrl && (
        <ScreenshotModal
          url={app.screenshotUrl}
          isOpen={screenshotOpen}
          onClose={() => setScreenshotOpen(false)}
        />
      )}
    </>
  );
}

// ─── ApplicationsAdmin ────────────────────────────────────────────────────────

export function ApplicationsAdmin(): JSX.Element {
  const [activeTab, setActiveTab] = useState<ApplicationStatus>("pending");
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch all tabs for counts
  const { data: pendingData, mutate: mutatePending } = useSWR<{
    data: ApplicationItem[];
    total: number;
  }>("/api/applications?status=pending&take=100", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: approvedData, mutate: mutateApproved } = useSWR<{
    data: ApplicationItem[];
    total: number;
  }>("/api/applications?status=approved&take=100", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: rejectedData, mutate: mutateRejected } = useSWR<{
    data: ApplicationItem[];
    total: number;
  }>("/api/applications?status=rejected&take=100", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: allData, mutate: mutateAll } = useSWR<{
    data: ApplicationItem[];
    total: number;
  }>("/api/applications?take=100", fetcher, {
    revalidateOnFocus: false,
  });

  const countMap: Record<ApplicationStatus, number> = {
    pending: pendingData?.total ?? 0,
    approved: approvedData?.total ?? 0,
    rejected: rejectedData?.total ?? 0,
    all: allData?.total ?? 0,
  };

  const dataMap: Record<ApplicationStatus, ApplicationItem[]> = {
    pending: pendingData?.data ?? [],
    approved: approvedData?.data ?? [],
    rejected: rejectedData?.data ?? [],
    all: allData?.data ?? [],
  };

  const isLoadingMap: Record<ApplicationStatus, boolean> = {
    pending: !pendingData,
    approved: !approvedData,
    rejected: !rejectedData,
    all: !allData,
  };

  const currentData = dataMap[activeTab];
  const isLoading = isLoadingMap[activeTab];

  const handleRefresh = useCallback(() => {
    mutatePending();
    mutateApproved();
    mutateRejected();
    mutateAll();
  }, [mutatePending, mutateApproved, mutateRejected, mutateAll]);

  const handleRowClick = useCallback((row: ApplicationItem) => {
    setSelectedApplicationId(row.id);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setSelectedApplicationId(null);
  }, []);

  const handleActionComplete = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const columns = useMemo(
    () => [
      {
        key: "applicant",
        header: "Applicant",
        render: (row: ApplicationItem) => (
          <div className="flex items-center gap-2.5 min-w-0">
            {row.avatarUrl && !row.avatarUrl.startsWith('blob:') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.avatarUrl}
                alt={row.fullName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[var(--color-border)]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-[var(--color-text-secondary)]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[140px]">
                {row.fullName}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate max-w-[140px]">
                {row.studentId}
              </p>
            </div>
          </div>
        ),
        width: "200px",
      },
      {
        key: "email",
        header: "Email",
        render: (row: ApplicationItem) => (
          <span className="text-sm text-[var(--color-text-secondary)] truncate max-w-[160px] block">
            {row.email}
          </span>
        ),
        width: "180px",
      },
      {
        key: "phone",
        header: "Phone",
        render: (row: ApplicationItem) => (
          <span className="text-sm text-[var(--color-text-secondary)] font-[var(--font-mono)]">
            {row.phone}
          </span>
        ),
        width: "140px",
      },
      {
        key: "session",
        header: "Session",
        render: (row: ApplicationItem) => (
          <span className="text-sm text-[var(--color-text-secondary)]">{row.session}</span>
        ),
        width: "100px",
      },
      {
        key: "memberType",
        header: "Type",
        render: (row: ApplicationItem) => (
          <Badge variant="neutral" size="sm">
            {row.memberType === "alumni" ? "Alumni" : "Member"}
          </Badge>
        ),
        width: "90px",
      },
      {
        key: "paymentMethod",
        header: "Payment",
        render: (row: ApplicationItem) => (
          <span className="text-sm text-[var(--color-text-secondary)] capitalize">
            {row.paymentMethod}
          </span>
        ),
        width: "90px",
      },
      {
        key: "createdAt",
        header: "Submitted",
        render: (row: ApplicationItem) => (
          <span className="text-xs text-[var(--color-text-secondary)]">
            {formatDate(row.createdAt, "short")}
          </span>
        ),
        sortable: true,
        width: "110px",
      },
      {
        key: "status",
        header: "Status",
        render: (row: ApplicationItem) => <StatusBadge status={row.status} />,
        width: "100px",
      },
      {
        key: "actions",
        header: "",
        render: (row: ApplicationItem) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedApplicationId(row.id);
              setDrawerOpen(true);
            }}
            aria-label={`Review application from ${row.fullName}`}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium",
              "text-[var(--color-text-secondary)] border border-[var(--color-border)]",
              "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <Eye size={12} />
            Review
          </button>
        ),
        width: "80px",
        align: "right" as const,
      },
    ],
    []
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Applications
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Review and process membership applications
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh applications"
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            "text-[var(--color-text-secondary)] border border-[var(--color-border)]",
            "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] w-fit mb-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = countMap[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium",
                "transition-all duration-150 relative",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                isActive
                  ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {tab.label}
              {count > 0 && (
                <Badge
                  variant={isActive ? tab.badgeVariant : "neutral"}
                  size="sm"
                >
                  {count > 99 ? "99+" : count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <Table
            columns={columns as Parameters<typeof Table>[0]["columns"]}
            data={[]}
            loading={true}
            skeletonRows={8}
            rowKey={(row) => (row as ApplicationItem).id}
          />
        ) : currentData.length === 0 ? (
          <EmptyState
            icon="FileText"
            heading={`No ${activeTab === "all" ? "" : activeTab} applications`}
            description={
              activeTab === "pending"
                ? "All applications have been reviewed."
                : `No ${activeTab} applications found.`
            }
          />
        ) : (
          <Table
            columns={columns as Parameters<typeof Table>[0]["columns"]}
            data={currentData as unknown as Record<string, unknown>[]}
            rowKey={(row) => (row as unknown as ApplicationItem).id}
            onRowClick={(row) => handleRowClick(row as unknown as ApplicationItem)}
            striped
          />
        )}
      </div>

      {/* Review Drawer */}
      <ApplicationDrawer
        applicationId={selectedApplicationId}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}