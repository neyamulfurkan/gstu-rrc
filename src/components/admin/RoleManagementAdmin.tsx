// src/components/admin/RoleManagementAdmin.tsx
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
  ShieldOff,
  Shield,
  Users,
  ClipboardList,
  Grid3X3,
  Check,
  X,
  Plus,
  Loader2,
  ChevronDown,
  UserMinus,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PERMISSION_LIST } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { Table, EmptyState } from "@/components/ui/DataDisplay";
import {
  Badge,
  Alert,
  Spinner,
  Skeleton,
  toast,
} from "@/components/ui/Feedback";
import { Modal, Drawer } from "@/components/ui/Overlay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminRole {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
  memberCount?: number;
}

interface AdminMember {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  adminRole?: {
    id: string;
    name: string;
  } | null;
  permissions?: Record<string, boolean>;
}

interface RoleRequest {
  id: string;
  memberId: string;
  member: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    avatarUrl: string;
  };
  requestedRoleId: string;
  requestedRole?: {
    id: string;
    name: string;
  };
  reason: string;
  status: string;
  createdAt: string;
}

interface MinimalMember {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  email: string;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "Error");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Permission Label Formatter ───────────────────────────────────────────────

function formatPermissionLabel(perm: string): string {
  return perm
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Tab Type ─────────────────────────────────────────────────────────────────

type Tab = "admin-users" | "role-requests" | "permission-matrix";

// ─── Main Component ───────────────────────────────────────────────────────────

export function RoleManagementAdmin(): JSX.Element {
  const { isSuperAdmin, isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<Tab>("admin-users");

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center px-6">
        <div
          className={cn(
            "flex items-center justify-center w-20 h-20 rounded-full",
            "bg-[var(--color-error)]/10 text-[var(--color-error)]"
          )}
          aria-hidden="true"
        >
          <ShieldOff size={36} />
        </div>
        <h2
          className={cn(
            "text-2xl font-bold text-[var(--color-text-primary)]",
            "font-[var(--font-display)]"
          )}
        >
          Super Admin Access Required
        </h2>
        <p className="text-[var(--color-text-secondary)] max-w-sm text-sm leading-relaxed">
          You do not have permission to manage admin roles and permissions. Contact
          a Super Admin to request access.
        </p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "admin-users", label: "Admin Users", icon: <Users size={16} /> },
    { key: "role-requests", label: "Role Requests", icon: <ClipboardList size={16} /> },
    { key: "permission-matrix", label: "Permission Matrix", icon: <Grid3X3 size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-primary)]/10"
          aria-hidden="true"
        >
          <Shield size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Role Management
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage admin users, role requests, and permission matrices
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={cn(
          "flex gap-1 p-1 rounded-xl",
          "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
        )}
        role="tablist"
        aria-label="Role management sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg",
              "text-sm font-medium transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset",
              activeTab === tab.key
                ? "bg-[var(--color-primary)] text-white shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]"
            )}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div
        id={`tabpanel-admin-users`}
        role="tabpanel"
        aria-labelledby="admin-users"
        hidden={activeTab !== "admin-users"}
      >
        {activeTab === "admin-users" && <AdminUsersTab />}
      </div>

      <div
        id={`tabpanel-role-requests`}
        role="tabpanel"
        aria-labelledby="role-requests"
        hidden={activeTab !== "role-requests"}
      >
        {activeTab === "role-requests" && <RoleRequestsTab />}
      </div>

      <div
        id={`tabpanel-permission-matrix`}
        role="tabpanel"
        aria-labelledby="permission-matrix"
        hidden={activeTab !== "permission-matrix"}
      >
        {activeTab === "permission-matrix" && <PermissionMatrixTab />}
      </div>
    </div>
  );
}

// ─── Admin Users Tab ──────────────────────────────────────────────────────────

function AdminUsersTab(): JSX.Element {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminMember | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: adminMembersData, error: membersError, isLoading: membersLoading } =
    useSWR<{ data: AdminMember[] }>("/api/members?isAdmin=true&take=100", fetcher);

  const { data: rolesData } =
    useSWR<{ data: AdminRole[] }>("/api/admin/admin-roles", fetcher);

  const adminMembers = adminMembersData?.data ?? [];
  const adminRoles = rolesData?.data ?? [];

  const handleRevoke = useCallback(
    async (member: AdminMember) => {
      setIsRevoking(true);
      setActionError(null);
      try {
        const res = await fetch("/api/admin/revoke-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: member.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to revoke admin access");
        }
        toast("Admin access revoked successfully", "success");
        await globalMutate("/api/members?isAdmin=true&take=100");
        setRevokeTarget(null);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to revoke admin");
      } finally {
        setIsRevoking(false);
      }
    },
    []
  );

  const columns = useMemo(
    () => [
      {
        key: "member",
        header: "Member",
        render: (row: AdminMember) => (
          <div className="flex items-center gap-3">
            <img
              src={row.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.fullName)}&size=32`}
              alt={row.fullName}
              className="w-8 h-8 rounded-full object-cover bg-[var(--color-bg-elevated)]"
            />
            <div>
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                {row.fullName}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                @{row.username}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "email",
        header: "Email",
        render: (row: AdminMember) => (
          <span className="text-sm text-[var(--color-text-secondary)]">
            {row.email}
          </span>
        ),
      },
      {
        key: "adminRole",
        header: "Admin Role",
        render: (row: AdminMember) =>
          row.adminRole ? (
            <Badge variant="primary">{row.adminRole.name}</Badge>
          ) : (
            <Badge variant="neutral">No Role</Badge>
          ),
      },
      {
        key: "permissions",
        header: "Permissions",
        render: (row: AdminMember) => {
          const count = row.permissions
            ? Object.values(row.permissions).filter(Boolean).length
            : 0;
          return (
            <span className="text-sm font-mono text-[var(--color-accent)]">
              {count} / {PERMISSION_LIST.length}
            </span>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        align: "right" as const,
        render: (row: AdminMember) => (
          <button
            type="button"
            onClick={() => setRevokeTarget(row)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              "text-[var(--color-error)] border border-[var(--color-error)]/30",
              "hover:bg-[var(--color-error)]/10 transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
            )}
          >
            <UserMinus size={12} aria-hidden="true" />
            Revoke
          </button>
        ),
      },
    ],
    []
  );

  if (membersError) {
    return (
      <Alert
        variant="error"
        message="Failed to load admin users. Please refresh and try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {adminMembers.length} admin{adminMembers.length !== 1 ? "s" : ""} total
        </p>
        <button
          type="button"
          onClick={() => setIsAssignModalOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <Plus size={16} aria-hidden="true" />
          Assign Admin Role
        </button>
      </div>

      {actionError && (
        <Alert
          variant="error"
          message={actionError}
          dismissible
          onDismiss={() => setActionError(null)}
        />
      )}

      {membersLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={56} className="w-full rounded-lg" />
          ))}
        </div>
      ) : adminMembers.length === 0 ? (
        <EmptyState
          icon="Shield"
          heading="No admin users yet"
          description="Assign admin roles to members to give them access to the admin panel."
          action={{ label: "Assign Admin Role", onClick: () => setIsAssignModalOpen(true) }}
        />
      ) : (
        <Table
          columns={columns}
          data={adminMembers}
          rowKey={(row) => row.id}
          striped
        />
      )}

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={!!revokeTarget}
        onClose={() => {
          setRevokeTarget(null);
          setActionError(null);
        }}
        title="Revoke Admin Access"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
            <AlertTriangle size={20} className="text-[var(--color-error)] shrink-0" aria-hidden="true" />
            <p className="text-sm text-[var(--color-text-primary)]">
              Are you sure you want to revoke admin access for{" "}
              <strong>{revokeTarget?.fullName}</strong>? They will immediately lose
              access to the admin panel.
            </p>
          </div>
          {actionError && (
            <Alert variant="error" message={actionError} />
          )}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setRevokeTarget(null);
                setActionError(null);
              }}
              disabled={isRevoking}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "text-[var(--color-text-secondary)] border border-[var(--color-border)]",
                "hover:bg-[var(--color-bg-elevated)] transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => revokeTarget && handleRevoke(revokeTarget)}
              disabled={isRevoking}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-error)] text-white",
                "hover:opacity-90 transition-opacity",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isRevoking ? (
                <Spinner size="sm" />
              ) : (
                <UserMinus size={14} aria-hidden="true" />
              )}
              Revoke Access
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Admin Role Modal */}
      {isAssignModalOpen && (
        <AssignAdminModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          adminRoles={adminRoles}
          onSuccess={() => {
            globalMutate("/api/members?isAdmin=true&take=100");
            setIsAssignModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Assign Admin Modal ───────────────────────────────────────────────────────

interface AssignAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminRoles: AdminRole[];
  onSuccess: () => void;
}

function AssignAdminModal({
  isOpen,
  onClose,
  adminRoles,
  onSuccess,
}: AssignAdminModalProps): JSX.Element {
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<MinimalMember | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<MinimalMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search for members
  useEffect(() => {
    if (memberQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/members?search=${encodeURIComponent(memberQuery)}&take=10&select=minimal`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.data ?? []);
          setShowDropdown(true);
        }
      } catch {
        // silently fail
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [memberQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedMember || !selectedRoleId) {
      setError("Please select both a member and a role.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          adminRoleId: selectedRoleId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to assign admin role");
      }

      toast(`Admin role assigned to ${selectedMember.fullName}`, "success");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMember, selectedRoleId, onSuccess]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Admin Role" size="sm">
      <div className="p-6 space-y-4">
        {error && (
          <Alert
            variant="error"
            message={error}
            dismissible
            onDismiss={() => setError(null)}
          />
        )}

        {/* Member Search */}
        <div className="space-y-1.5">
          <label
            htmlFor="member-search"
            className="block text-sm font-medium text-[var(--color-text-primary)]"
          >
            Search Member <span className="text-[var(--color-error)]">*</span>
          </label>
          <div className="relative" ref={dropdownRef}>
            {selectedMember ? (
              <div
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
                )}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={selectedMember.avatarUrl}
                    alt={selectedMember.fullName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {selectedMember.fullName}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    @{selectedMember.username}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(null);
                    setMemberQuery("");
                  }}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
                  aria-label="Remove selected member"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <input
                  id="member-search"
                  type="text"
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="Search by name or username…"
                  autoComplete="off"
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg text-sm",
                    "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
                    "transition-colors"
                  )}
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
                {showDropdown && searchResults.length > 0 && (
                  <div
                    className={cn(
                      "absolute top-full left-0 right-0 z-50 mt-1",
                      "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                      "rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                    )}
                  >
                    {searchResults.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedMember(member);
                          setMemberQuery("");
                          setShowDropdown(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 text-left",
                          "hover:bg-[var(--color-bg-surface)] transition-colors",
                          "focus:outline-none focus:bg-[var(--color-bg-surface)]"
                        )}
                      >
                        <img
                          src={member.avatarUrl}
                          alt={member.fullName}
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        />
                        <div>
                          <div className="text-sm font-medium text-[var(--color-text-primary)]">
                            {member.fullName}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)]">
                            @{member.username}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Role Select */}
        <div className="space-y-1.5">
          <label
            htmlFor="role-select"
            className="block text-sm font-medium text-[var(--color-text-primary)]"
          >
            Admin Role <span className="text-[var(--color-error)]">*</span>
          </label>
          <div className="relative">
            <select
              id="role-select"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className={cn(
                "w-full px-3 py-2.5 rounded-lg text-sm appearance-none",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
                "transition-colors"
              )}
            >
              <option value="">Select a role…</option>
              {adminRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              "text-[var(--color-text-secondary)] border border-[var(--color-border)]",
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
            disabled={isSubmitting || !selectedMember || !selectedRoleId}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-[var(--color-primary)] text-white",
              "hover:opacity-90 transition-opacity",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <Spinner size="sm" />
            ) : (
              <UserCheck size={14} aria-hidden="true" />
            )}
            Assign Role
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Role Requests Tab ────────────────────────────────────────────────────────

function RoleRequestsTab(): JSX.Element {
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ data: RoleRequest[] }>(
    "/api/admin/member-requests",
    fetcher
  );

  const { data: rolesData } = useSWR<{ data: AdminRole[] }>(
    "/api/admin/admin-roles",
    fetcher
  );

  const requests = data?.data ?? [];
  const adminRoles = rolesData?.data ?? [];
  const pendingRequests = requests.filter((r) => r.status === "pending");

  const handleAction = useCallback(
    async (
      request: RoleRequest,
      action: "approve" | "reject"
    ) => {
      setActioningId(request.id);
      setActionError(null);
      try {
        const res = await fetch("/api/admin/member-requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: request.id,
            action,
            memberId: request.memberId,
            adminRoleId: request.requestedRoleId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error ?? `Failed to ${action} request`);
        }

        toast(
          action === "approve"
            ? "Role request approved successfully"
            : "Role request rejected",
          action === "approve" ? "success" : "info"
        );
        await mutate();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : `Failed to ${action}`);
      } finally {
        setActioningId(null);
      }
    },
    [mutate]
  );

  const columns = useMemo(
    () => [
      {
        key: "member",
        header: "Member",
        render: (row: RoleRequest) => (
          <div className="flex items-center gap-3">
            <img
              src={row.member.avatarUrl}
              alt={row.member.fullName}
              className="w-8 h-8 rounded-full object-cover bg-[var(--color-bg-elevated)]"
            />
            <div>
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                {row.member.fullName}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                {row.member.email}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "requestedRole",
        header: "Requested Role",
        render: (row: RoleRequest) => {
          const role = adminRoles.find((r) => r.id === row.requestedRoleId);
          return role ? (
            <Badge variant="accent">{role.name}</Badge>
          ) : (
            <Badge variant="neutral">Unknown Role</Badge>
          );
        },
      },
      {
        key: "reason",
        header: "Reason",
        render: (row: RoleRequest) => (
          <span className="text-sm text-[var(--color-text-secondary)] line-clamp-2 max-w-xs">
            {row.reason || "No reason provided"}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Date",
        render: (row: RoleRequest) => (
          <span className="text-xs text-[var(--color-text-secondary)] font-mono whitespace-nowrap">
            {new Date(row.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right" as const,
        render: (row: RoleRequest) => {
          if (row.status !== "pending") {
            return (
              <Badge variant={row.status === "approved" ? "success" : "error"}>
                {row.status}
              </Badge>
            );
          }

          const isActioning = actioningId === row.id;

          return (
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                disabled={isActioning}
                onClick={() => handleAction(row, "approve")}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium",
                  "text-[var(--color-success)] border border-[var(--color-success)]/30",
                  "hover:bg-[var(--color-success)]/10 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-success)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isActioning ? (
                  <Spinner size="sm" />
                ) : (
                  <Check size={12} aria-hidden="true" />
                )}
                Approve
              </button>
              <button
                type="button"
                disabled={isActioning}
                onClick={() => handleAction(row, "reject")}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium",
                  "text-[var(--color-error)] border border-[var(--color-error)]/30",
                  "hover:bg-[var(--color-error)]/10 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isActioning ? (
                  <Spinner size="sm" />
                ) : (
                  <X size={12} aria-hidden="true" />
                )}
                Reject
              </button>
            </div>
          );
        },
      },
    ],
    [adminRoles, actioningId, handleAction]
  );

  if (error) {
    return (
      <Alert
        variant="error"
        message="Failed to load role requests. Please refresh and try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {pendingRequests.length} pending request
          {pendingRequests.length !== 1 ? "s" : ""}
        </p>
        {pendingRequests.length > 0 && (
          <Badge variant="warning">{pendingRequests.length} pending</Badge>
        )}
      </div>

      {actionError && (
        <Alert
          variant="error"
          message={actionError}
          dismissible
          onDismiss={() => setActionError(null)}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={56} className="w-full rounded-lg" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon="ClipboardList"
          heading="No role requests"
          description="Members who request admin access will appear here for review."
        />
      ) : (
        <Table
          columns={columns}
          data={requests}
          rowKey={(row) => row.id}
          striped
        />
      )}
    </div>
  );
}

// ─── Permission Matrix Tab ────────────────────────────────────────────────────

function PermissionMatrixTab(): JSX.Element {
  const [localPermissions, setLocalPermissions] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{ data: AdminRole[] }>(
    "/api/admin/admin-roles",
    fetcher
  );

  const adminRoles = data?.data ?? [];

  // Initialize local state when data loads
  useEffect(() => {
    if (adminRoles.length > 0) {
      const initial: Record<string, Record<string, boolean>> = {};
      for (const role of adminRoles) {
        initial[role.id] = { ...role.permissions };
      }
      setLocalPermissions(initial);
      setIsDirty(false);
    }
  }, [data]);

  const handleToggle = useCallback(
    (roleId: string, permission: string) => {
      setLocalPermissions((prev) => {
        const current = prev[roleId] ?? {};
        return {
          ...prev,
          [roleId]: {
            ...current,
            [permission]: !current[permission],
          },
        };
      });
      setIsDirty(true);
      setSaveSuccess(false);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Build updates array
      const updates = adminRoles.map((role) => ({
        id: role.id,
        permissions: localPermissions[role.id] ?? role.permissions,
      }));

      const res = await fetch("/api/admin/admin-roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: updates }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to save permissions");
      }

      toast("Permission matrix saved successfully", "success");
      setSaveSuccess(true);
      setIsDirty(false);
      await mutate();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save permissions"
      );
    } finally {
      setIsSaving(false);
    }
  }, [adminRoles, localPermissions, mutate]);

  const handleReset = useCallback(() => {
    const initial: Record<string, Record<string, boolean>> = {};
    for (const role of adminRoles) {
      initial[role.id] = { ...role.permissions };
    }
    setLocalPermissions(initial);
    setIsDirty(false);
    setSaveSuccess(false);
    setSaveError(null);
  }, [adminRoles]);

  if (error) {
    return (
      <Alert
        variant="error"
        message="Failed to load admin roles. Please refresh and try again."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton height={48} className="w-full rounded-lg" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={40} className="w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (adminRoles.length === 0) {
    return (
      <EmptyState
        icon="Grid3X3"
        heading="No admin roles defined"
        description="Create admin roles first in the Roles section to configure permissions."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {adminRoles.length} role{adminRoles.length !== 1 ? "s" : ""} ·{" "}
            {PERMISSION_LIST.length} permissions
          </p>
          {isDirty && (
            <p className="text-xs text-[var(--color-warning)] mt-0.5">
              Unsaved changes
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium",
                "text-[var(--color-text-secondary)] border border-[var(--color-border)]",
                "hover:bg-[var(--color-bg-elevated)] transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-[var(--color-primary)] text-white",
              "hover:opacity-90 transition-opacity",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <>
                <Spinner size="sm" />
                Saving…
              </>
            ) : (
              <>
                <Check size={14} aria-hidden="true" />
                Save All Changes
              </>
            )}
          </button>
        </div>
      </div>

      {saveError && (
        <Alert
          variant="error"
          message={saveError}
          dismissible
          onDismiss={() => setSaveError(null)}
        />
      )}

      {saveSuccess && (
        <Alert
          variant="success"
          message="Permission matrix saved successfully."
          dismissible
          onDismiss={() => setSaveSuccess(false)}
        />
      )}

      {/* Matrix Table */}
      <div
        className={cn(
          "w-full overflow-x-auto rounded-xl border border-[var(--color-border)]",
          "bg-[var(--color-bg-surface)]"
        )}
        role="region"
        aria-label="Permission matrix table"
      >
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)]">
              {/* Permission name column header */}
              <th
                scope="col"
                className={cn(
                  "sticky left-0 z-10 bg-[var(--color-bg-elevated)]",
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                  "text-[var(--color-text-secondary)] border-r border-[var(--color-border)]",
                  "min-w-[180px]"
                )}
              >
                Permission
              </th>
              {/* Role column headers */}
              {adminRoles.map((role) => (
                <th
                  key={role.id}
                  scope="col"
                  className={cn(
                    "px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider",
                    "text-[var(--color-text-secondary)]",
                    "min-w-[120px]"
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[var(--color-text-primary)]">
                      {role.name}
                    </span>
                    <span className="text-[var(--color-text-secondary)] font-normal normal-case">
                      {Object.values(localPermissions[role.id] ?? {}).filter(Boolean).length} active
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_LIST.map((permission, permIdx) => (
              <tr
                key={permission}
                className={cn(
                  "border-b border-[var(--color-border)] last:border-0",
                  "transition-colors duration-100",
                  permIdx % 2 === 0
                    ? "bg-transparent"
                    : "bg-[var(--color-bg-elevated)]/30"
                )}
              >
                {/* Permission label */}
                <td
                  className={cn(
                    "sticky left-0 z-10 px-4 py-2.5",
                    "border-r border-[var(--color-border)]",
                    permIdx % 2 === 0
                      ? "bg-[var(--color-bg-surface)]"
                      : "bg-[var(--color-bg-elevated)]/30"
                  )}
                >
                  <span className="font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                    {formatPermissionLabel(permission)}
                  </span>
                  <div className="text-[var(--color-text-secondary)] font-mono mt-0.5">
                    {permission}
                  </div>
                </td>

                {/* Checkboxes per role */}
                {adminRoles.map((role) => {
                  const isChecked =
                    localPermissions[role.id]?.[permission] ?? false;
                  const checkboxId = `perm-${role.id}-${permission}`;

                  return (
                    <td
                      key={role.id}
                      className="px-3 py-2.5 text-center"
                    >
                      <label
                        htmlFor={checkboxId}
                        className={cn(
                          "relative inline-flex items-center justify-center cursor-pointer",
                          "w-5 h-5 rounded",
                          "focus-within:ring-2 focus-within:ring-[var(--color-accent)] focus-within:ring-offset-1"
                        )}
                        aria-label={`${role.name}: ${formatPermissionLabel(permission)}`}
                      >
                        <input
                          type="checkbox"
                          id={checkboxId}
                          checked={isChecked}
                          onChange={() => handleToggle(role.id, permission)}
                          className="sr-only"
                          aria-checked={isChecked}
                        />
                        <div
                          aria-hidden="true"
                          className={cn(
                            "w-5 h-5 rounded transition-all duration-150",
                            "border-2 flex items-center justify-center",
                            isChecked
                              ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                              : "bg-transparent border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                          )}
                        >
                          {isChecked && (
                            <Check
                              size={11}
                              className="text-white"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "w-4 h-4 rounded border-2",
              "bg-[var(--color-primary)] border-[var(--color-primary)]",
              "flex items-center justify-center"
            )}
            aria-hidden="true"
          >
            <Check size={9} className="text-white" />
          </div>
          <span>Permission granted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "w-4 h-4 rounded border-2",
              "border-[var(--color-border)]"
            )}
            aria-hidden="true"
          />
          <span>Permission denied</span>
        </div>
      </div>
    </div>
  );
}