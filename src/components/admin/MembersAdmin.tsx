// src/components/admin/MembersAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  Users,
  Tag,
  Building2,
  CheckSquare,
  Square,
  Eye,
} from "lucide-react";
import useSWR, { mutate as globalMutate } from "swr";

import type { MemberPublic } from "@/types/index";
import { formatDate, cn, generateInitialsAvatar } from "@/lib/utils";
import { Table } from "@/components/ui/DataDisplay";
import type { TableColumn } from "@/components/ui/DataDisplay";
import {
  Badge,
  Alert,
  Spinner,
  Skeleton,
  useToast,
} from "@/components/ui/Feedback";
import {
  Modal,
  Drawer,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
} from "@/components/ui/Overlay";
import { useAuditLog } from "@/hooks/useAuditLog";

// Dynamically import MemberForm to avoid including it in initial bundle
const MemberForm = dynamic(
  () =>
    import("@/components/admin/forms/MemberForm").then((m) => ({
      default: m.MemberForm,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" label="Loading form..." />
      </div>
    ),
    ssr: false,
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminMember extends MemberPublic {
  email: string;
  phone: string;
  studentId: string;
  status: string;
  adminNotes?: string | null;
  lastLogin?: Date | string | null;
  roleId?: string | null;
  adminRole?: { name: string } | null;
  isAdmin?: boolean;
}

interface Role {
  id: string;
  name: string;
  color: string;
  category: string;
  _count?: { members: number };
}

interface Department {
  id: string;
  name: string;
  shortName?: string | null;
  _count?: { members: number };
}

interface FilterState {
  search: string;
  roleId: string;
  departmentId: string;
  status: string;
  memberType: string;
}

type AdminTab = "members" | "roles" | "departments";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const STATUS_BADGE_MAP: Record<string, { label: string; variant: "success" | "error" | "warning" | "neutral" }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
  suspended: { label: "Suspended", variant: "error" },
  pending: { label: "Pending", variant: "warning" },
};

const MEMBER_TYPE_LABELS: Record<string, string> = {
  member: "Member",
  alumni: "Alumni",
};

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Role Management Sub-Tab ──────────────────────────────────────────────────

function RolesTab(): JSX.Element {
  const { addToast } = useToast();
  const { log } = useAuditLog();

  const { data, error, isLoading, mutate } = useSWR<{ data: Role[] }>(
    "/api/admin/roles",
    fetcher
  );

  const [editRole, setEditRole] = useState<Role | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [formState, setFormState] = useState({ name: "", color: "#7B8DB0", category: "general" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setEditRole(null);
    setFormState({ name: "", color: "#7B8DB0", category: "general" });
    setFormError(null);
    setRoleModalOpen(true);
  }

  function openEdit(role: Role) {
    setEditRole(role);
    setFormState({ name: role.name, color: role.color, category: role.category });
    setFormError(null);
    setRoleModalOpen(true);
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!formState.name.trim()) {
      setFormError("Role name is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const method = editRole ? "PUT" : "POST";
      const res = await fetch("/api/admin/roles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editRole ? { id: editRole.id, ...formState } : formState
        ),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save role");
      }
      await mutate();
      setRoleModalOpen(false);
      addToast(editRole ? "Role updated." : "Role created.", "success");
      await log(
        editRole ? "update_role" : "create_role",
        editRole
          ? `Updated role: ${formState.name}`
          : `Created role: ${formState.name}`,
        "Role",
        editRole?.id
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRole() {
    if (!deleteRoleId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteRoleId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete role");
      }
      await mutate();
      addToast("Role deleted.", "success");
      await log("delete_role", `Deleted role ID: ${deleteRoleId}`, "Role", deleteRoleId);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to delete role.", "error");
    } finally {
      setSubmitting(false);
      setDeleteRoleId(null);
    }
  }

  const roleColumns: TableColumn<Role>[] = [
    {
      key: "name",
      header: "Role Name",
      render: (row) => (
        <span className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: row.color }}
          />
          <span className="font-medium text-[var(--color-text-primary)]">{row.name}</span>
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => (
        <Badge variant="neutral" size="sm">
          {row.category}
        </Badge>
      ),
    },
    {
      key: "_count",
      header: "Members",
      align: "center",
      render: (row) => (
        <span className="text-[var(--color-text-secondary)]">
          {row._count?.members ?? 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className={cn(
              "p-1.5 rounded-md text-[var(--color-text-secondary)]",
              "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "transition-colors"
            )}
            aria-label={`Edit role ${row.name}`}
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteRoleId(row.id)}
            disabled={(row._count?.members ?? 0) > 0}
            className={cn(
              "p-1.5 rounded-md text-[var(--color-text-secondary)]",
              "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            )}
            aria-label={`Delete role ${row.name}`}
            title={
              (row._count?.members ?? 0) > 0
                ? "Cannot delete a role with assigned members"
                : "Delete role"
            }
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          Member Roles
        </h3>
        <button
          type="button"
          onClick={openAdd}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white hover:opacity-90",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "transition-opacity"
          )}
        >
          <Plus size={16} />
          Add Role
        </button>
      </div>

      {error && (
        <Alert variant="error" message={error.message ?? "Failed to load roles."} />
      )}

      <Table<Role>
        columns={roleColumns}
        data={data?.data ?? []}
        loading={isLoading}
        skeletonRows={4}
        emptyMessage="No roles found."
        rowKey={(r) => r.id}
      />

      {/* Role Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editRole ? "Edit Role" : "Add Role"}
        size="sm"
      >
        <form onSubmit={handleSaveRole} className="p-6 space-y-4">
          {formError && (
            <Alert variant="error" message={formError} />
          )}
          <div className="space-y-1">
            <label
              htmlFor="role-name"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Role Name *
            </label>
            <input
              id="role-name"
              type="text"
              value={formState.name}
              onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
              required
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
              placeholder="e.g. General Secretary"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="role-category"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Category
            </label>
            <select
              id="role-category"
              value={formState.category}
              onChange={(e) => setFormState((p) => ({ ...p, category: e.target.value }))}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
            >
              <option value="executive">Executive</option>
              <option value="sub-executive">Sub-Executive</option>
              <option value="general">General</option>
              <option value="honorary">Honorary</option>
            </select>
          </div>
          <div className="space-y-1">
            <label
              htmlFor="role-color"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Badge Color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="role-color"
                type="color"
                value={formState.color}
                onChange={(e) => setFormState((p) => ({ ...p, color: e.target.value }))}
                className="h-10 w-16 rounded-lg border border-[var(--color-border)] cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={formState.color}
                onChange={(e) => setFormState((p) => ({ ...p, color: e.target.value }))}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-mono",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
                placeholder="#7B8DB0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                "hover:bg-[var(--color-bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-primary)] text-white hover:opacity-90",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "disabled:opacity-60 transition-opacity"
              )}
            >
              {submitting && <Spinner size="sm" />}
              {editRole ? "Save Changes" : "Create Role"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteRoleId}
        onClose={() => setDeleteRoleId(null)}
        title="Delete Role"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Are you sure you want to delete this role? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteRoleId(null)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteRole}
              disabled={submitting}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-error)] text-white hover:opacity-90",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
                "disabled:opacity-60 transition-opacity"
              )}
            >
              {submitting && <Spinner size="sm" />}
              Delete Role
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Departments Sub-Tab ──────────────────────────────────────────────────────

function DepartmentsTab(): JSX.Element {
  const { addToast } = useToast();
  const { log } = useAuditLog();

  const { data, error, isLoading, mutate } = useSWR<{ data: Department[] }>(
    "/api/admin/departments",
    fetcher
  );

  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deleteDeptId, setDeleteDeptId] = useState<string | null>(null);
  const [formState, setFormState] = useState({ name: "", shortName: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setEditDept(null);
    setFormState({ name: "", shortName: "" });
    setFormError(null);
    setDeptModalOpen(true);
  }

  function openEdit(dept: Department) {
    setEditDept(dept);
    setFormState({ name: dept.name, shortName: dept.shortName ?? "" });
    setFormError(null);
    setDeptModalOpen(true);
  }

  async function handleSaveDept(e: React.FormEvent) {
    e.preventDefault();
    if (!formState.name.trim()) {
      setFormError("Department name is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const method = editDept ? "PUT" : "POST";
      const res = await fetch("/api/admin/departments", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editDept ? { id: editDept.id, ...formState } : formState
        ),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save department");
      }
      await mutate();
      setDeptModalOpen(false);
      addToast(editDept ? "Department updated." : "Department created.", "success");
      await log(
        editDept ? "update_department" : "create_department",
        editDept
          ? `Updated department: ${formState.name}`
          : `Created department: ${formState.name}`,
        "Department",
        editDept?.id
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteDept() {
    if (!deleteDeptId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDeptId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete department");
      }
      await mutate();
      addToast("Department deleted.", "success");
      await log("delete_department", `Deleted department ID: ${deleteDeptId}`, "Department", deleteDeptId);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to delete department.", "error");
    } finally {
      setSubmitting(false);
      setDeleteDeptId(null);
    }
  }

  const deptColumns: TableColumn<Department>[] = [
    {
      key: "name",
      header: "Department Name",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-[var(--color-text-primary)]">{row.name}</span>
      ),
    },
    {
      key: "shortName",
      header: "Short Name",
      render: (row) => (
        <span className="text-[var(--color-text-secondary)] font-mono text-xs">
          {row.shortName ?? "—"}
        </span>
      ),
    },
    {
      key: "_count",
      header: "Members",
      align: "center",
      render: (row) => (
        <span className="text-[var(--color-text-secondary)]">
          {row._count?.members ?? 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className={cn(
              "p-1.5 rounded-md text-[var(--color-text-secondary)]",
              "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "transition-colors"
            )}
            aria-label={`Edit ${row.name}`}
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteDeptId(row.id)}
            disabled={(row._count?.members ?? 0) > 0}
            className={cn(
              "p-1.5 rounded-md text-[var(--color-text-secondary)]",
              "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            )}
            aria-label={`Delete ${row.name}`}
            title={
              (row._count?.members ?? 0) > 0
                ? "Cannot delete a department with assigned members"
                : "Delete department"
            }
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          Departments
        </h3>
        <button
          type="button"
          onClick={openAdd}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white hover:opacity-90",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "transition-opacity"
          )}
        >
          <Plus size={16} />
          Add Department
        </button>
      </div>

      {error && (
        <Alert variant="error" message={error.message ?? "Failed to load departments."} />
      )}

      <Table<Department>
        columns={deptColumns}
        data={data?.data ?? []}
        loading={isLoading}
        skeletonRows={4}
        emptyMessage="No departments found."
        rowKey={(d) => d.id}
      />

      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title={editDept ? "Edit Department" : "Add Department"}
        size="sm"
      >
        <form onSubmit={handleSaveDept} className="p-6 space-y-4">
          {formError && <Alert variant="error" message={formError} />}
          <div className="space-y-1">
            <label
              htmlFor="dept-name"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Department Name *
            </label>
            <input
              id="dept-name"
              type="text"
              value={formState.name}
              onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
              required
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
              placeholder="e.g. Computer Science & Engineering"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="dept-short"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Short Name
            </label>
            <input
              id="dept-short"
              type="text"
              value={formState.shortName}
              onChange={(e) => setFormState((p) => ({ ...p, shortName: e.target.value }))}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm font-mono",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
              placeholder="e.g. CSE"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeptModalOpen(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-primary)] text-white hover:opacity-90",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "disabled:opacity-60 transition-opacity"
              )}
            >
              {submitting && <Spinner size="sm" />}
              {editDept ? "Save Changes" : "Create Department"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteDeptId}
        onClose={() => setDeleteDeptId(null)}
        title="Delete Department"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Are you sure you want to delete this department? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteDeptId(null)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteDept}
              disabled={submitting}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-error)] text-white hover:opacity-90",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
                "disabled:opacity-60 transition-opacity"
              )}
            >
              {submitting && <Spinner size="sm" />}
              Delete Department
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Member Avatar Cell ───────────────────────────────────────────────────────

function MemberAvatarCell({ member }: { member: AdminMember }): JSX.Element {
  const fallback =
    typeof window !== "undefined"
      ? generateInitialsAvatar(member.fullName)
      : "";

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="relative flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-[var(--color-bg-elevated)]">
        <Image
          src={member.avatarUrl || fallback || "/placeholder-avatar.png"}
          alt={member.fullName}
          width={36}
          height={36}
          className="object-cover w-full h-full"
          unoptimized={member.avatarUrl?.startsWith("data:")}
        />
      </div>
      <div className="min-w-0">
        <Link
          href={`/members/${member.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "block text-sm font-semibold text-[var(--color-text-primary)] truncate",
            "hover:text-[var(--color-accent)] transition-colors"
          )}
        >
          {member.fullName}
        </Link>
        <span className="block text-xs text-[var(--color-text-secondary)] truncate">
          {member.email}
        </span>
      </div>
    </div>
  );
}

// ─── Main MembersAdmin Component ──────────────────────────────────────────────

export function MembersAdmin(): JSX.Element {
  const { addToast } = useToast();
  const { log } = useAuditLog();

  // ── Sub-tabs ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<AdminTab>("members");

  // ── Members tab state ──────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [filterState, setFilterState] = useState<FilterState>({
    search: "",
    roleId: "",
    departmentId: "",
    status: "",
    memberType: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editMember, setEditMember] = useState<AdminMember | null>(null);
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"activate" | "deactivate" | "delete" | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // For filter dropdowns
  const { data: rolesData } = useSWR<{ data: Role[] }>("/api/admin/roles", fetcher);
  const { data: deptsData } = useSWR<{ data: Department[] }>("/api/admin/departments", fetcher);

  // Debounce search input
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(filterState.search);
      setPage(0);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filterState.search]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
  }, [filterState.roleId, filterState.departmentId, filterState.status, filterState.memberType]);

  // Build API URL
  const membersUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("all", "true");
    params.set("skip", String(page * PAGE_SIZE));
    params.set("take", String(PAGE_SIZE));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterState.roleId) params.set("roleId", filterState.roleId);
    if (filterState.departmentId) params.set("departmentId", filterState.departmentId);
    if (filterState.status) params.set("status", filterState.status);
    if (filterState.memberType) params.set("memberType", filterState.memberType);
    return `/api/members?${params.toString()}`;
  }, [page, debouncedSearch, filterState.roleId, filterState.departmentId, filterState.status, filterState.memberType]);

  const { data: membersData, error: membersError, isLoading: membersLoading, mutate: mutateMembers } =
    useSWR<{ data: AdminMember[]; total: number }>(
      activeTab === "members" ? membersUrl : null,
      fetcher
    );

  const members = membersData?.data ?? [];
  const total = membersData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Select all on current page
  function handleSelectAll() {
    if (selectedIds.size === members.length && members.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.id)));
    }
  }

  function handleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── CRUD Handlers ──────────────────────────────────────────────────────────

  async function handleStatusChange(memberId: string, status: string) {
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update member status");
      }
      await mutateMembers();
      const statusLabel = status === "active" ? "activated" : status === "suspended" ? "suspended" : "deactivated";
      addToast(`Member ${statusLabel}.`, "success");
      const actionLabel = status === "active" ? "activate_member" : status === "suspended" ? "suspend_member" : "deactivate_member";
      await log(
        actionLabel,
        `Set member ${memberId} status to ${status}`,
        "Member",
        memberId
      );
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to update status.", "error");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleDeleteMember() {
    if (!deleteMemberId) return;
    setActionSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/members/${deleteMemberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to deactivate member");
      }
      await mutateMembers();
      addToast("Member archived.", "success");
      await log("archive_member", `Archived member ID: ${deleteMemberId}`, "Member", deleteMemberId);
      setDeleteMemberId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteMemberId);
        return next;
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to deactivate member.");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleBulkAction() {
    if (!bulkAction || selectedIds.size === 0) return;
    setActionSubmitting(true);
    setActionError(null);

    const ids = Array.from(selectedIds);
    const errors: string[] = [];

    try {
      await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(
            `/api/members/${id}`,
            bulkAction === "delete"
              ? { method: "DELETE" }
              : {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: bulkAction === "activate" ? "active" : bulkAction === "deactivate" ? "inactive" : "suspended",
                  }),
                }
          );
          if (!res.ok) {
            errors.push(id);
          }
        })
      );

      await mutateMembers();

      if (errors.length > 0) {
        addToast(
          `Bulk action completed with ${errors.length} error(s).`,
          "error"
        );
      } else {
        addToast(
          `Bulk ${bulkAction} applied to ${ids.length} member(s).`,
          "success"
        );
      }

      await log(
        `bulk_${bulkAction}_members`,
        `Bulk ${bulkAction} applied to ${ids.length} members`,
        "Member"
      );

      setSelectedIds(new Set());
      setBulkAction(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Bulk action failed.");
    } finally {
      setActionSubmitting(false);
    }
  }

  // ── Table Columns ──────────────────────────────────────────────────────────

  const allOnPageSelected =
    members.length > 0 && selectedIds.size === members.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < members.length;

  const columns: TableColumn<AdminMember>[] = [
    {
      key: "select",
      header: "",
      width: "40px",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectOne(row.id);
          }}
          aria-label={selectedIds.has(row.id) ? "Deselect member" : "Select member"}
          className="flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] focus:outline-none"
        >
          {selectedIds.has(row.id) ? (
            <CheckSquare size={16} className="text-[var(--color-accent)]" />
          ) : (
            <Square size={16} />
          )}
        </button>
      ),
    },
    {
      key: "member",
      header: "Member",
      render: (row) => <MemberAvatarCell member={row} />,
    },
    {
      key: "username",
      header: "Username",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono text-[var(--color-text-secondary)]">
          @{row.username}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium"
          style={{ color: row.role?.color ?? "var(--color-text-secondary)" }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: row.role?.color ?? "transparent" }}
          />
          {row.role?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (row) => (
        <span className="text-xs text-[var(--color-text-secondary)] truncate max-w-[120px] block">
          {row.department?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "session",
      header: "Session",
      render: (row) => (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {row.session ?? "—"}
        </span>
      ),
    },
    {
      key: "memberType",
      header: "Type",
      render: (row) => (
        <Badge variant="neutral" size="sm">
          {MEMBER_TYPE_LABELS[row.memberType] ?? row.memberType}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const config = STATUS_BADGE_MAP[row.status] ?? {
          label: row.status,
          variant: "neutral" as const,
        };
        return (
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {formatDate(row.createdAt, "short")}
        </span>
      ),
    },
    {
      key: "lastLogin",
      header: "Last Login",
      render: (row) => (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {row.lastLogin ? formatDate(row.lastLogin, "relative") : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <DropdownMenu
          trigger={
            <button
              type="button"
              className={cn(
                "p-1.5 rounded-md text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
              aria-label={`Actions for ${row.fullName}`}
            >
              <MoreHorizontal size={16} />
            </button>
          }
          align="right"
        >
          <DropdownMenuItem
            icon={<Eye size={14} />}
            onClick={() =>
              window.open(`/members/${row.username}`, "_blank", "noopener,noreferrer")
            }
          >
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<Edit2 size={14} />}
            onClick={() => setEditMember(row)}
          >
            Edit Member
          </DropdownMenuItem>
          <DropdownMenuDivider />
          {row.status === "active" && (
            <>
              <DropdownMenuItem
                icon={<UserX size={14} />}
                onClick={() => handleStatusChange(row.id, "inactive")}
              >
                Deactivate
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<Shield size={14} />}
                onClick={() => handleStatusChange(row.id, "suspended")}
              >
                Suspend
              </DropdownMenuItem>
            </>
          )}
          {row.status === "inactive" && (
            <>
              <DropdownMenuItem
                icon={<UserCheck size={14} />}
                onClick={() => handleStatusChange(row.id, "active")}
              >
                Activate
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<Shield size={14} />}
                onClick={() => handleStatusChange(row.id, "suspended")}
              >
                Suspend
              </DropdownMenuItem>
            </>
          )}
          {row.status === "suspended" && (
            <>
              <DropdownMenuItem
                icon={<UserCheck size={14} />}
                onClick={() => handleStatusChange(row.id, "active")}
              >
                Unsuspend (Activate)
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<UserX size={14} />}
                onClick={() => handleStatusChange(row.id, "inactive")}
              >
                Deactivate
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuDivider />
          {row.status !== "inactive" && (
            <DropdownMenuItem
              icon={<Trash2 size={14} />}
              variant="danger"
              onClick={() => setDeleteMemberId(row.id)}
            >
              Archive Member
            </DropdownMenuItem>
          )}
          {row.status === "inactive" && (
            <DropdownMenuItem
              icon={<UserCheck size={14} />}
              onClick={() => handleStatusChange(row.id, "active")}
            >
              Restore from Archive
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            Members
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Manage club members, roles, and departments
          </p>
        </div>
        {activeTab === "members" && (
          <button
            type="button"
            onClick={() => {
              setEditMember(null);
              setAddModalOpen(true);
            }}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-[var(--color-primary)] text-white hover:opacity-90",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "transition-opacity"
            )}
          >
            <Plus size={16} />
            Add Member
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
        {(
          [
            { id: "members" as AdminTab, icon: Users, label: "Members" },
            { id: "roles" as AdminTab, icon: Tag, label: "Roles" },
            { id: "departments" as AdminTab, icon: Building2, label: "Departments" },
          ] as { id: AdminTab; icon: React.ComponentType<{ size?: number }>; label: string }[]
        ).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px",
              "focus:outline-none transition-colors",
              activeTab === id
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <Icon size={15} />
            {label}
            {id === "members" && total > 0 && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold",
                  "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"
                )}
              >
                {total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeTab === "roles" && <RolesTab />}
      {activeTab === "departments" && <DepartmentsTab />}

      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            {/* Search */}
            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
              />
              <input
                type="search"
                value={filterState.search}
                onChange={(e) =>
                  setFilterState((p) => ({ ...p, search: e.target.value }))
                }
                placeholder="Search by name, username, student ID…"
                className={cn(
                  "w-full pl-9 pr-3 py-2 rounded-lg text-sm",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-colors"
                )}
              />
            </div>

            {/* Filters row — 2-column grid on mobile, inline on sm+ */}
            <div className="grid grid-cols-2 gap-2 sm:contents">
            {/* Role filter */}
            <select
              value={filterState.roleId}
              onChange={(e) =>
                setFilterState((p) => ({ ...p, roleId: e.target.value }))
              }
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              {rolesData?.data.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Department filter */}
            <select
              value={filterState.departmentId}
              onChange={(e) =>
                setFilterState((p) => ({ ...p, departmentId: e.target.value }))
              }
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
              aria-label="Filter by department"
            >
              <option value="">All Departments</option>
              {deptsData?.data.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filterState.status}
              onChange={(e) =>
                setFilterState((p) => ({ ...p, status: e.target.value }))
              }
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Type filter */}
            <select
              value={filterState.memberType}
              onChange={(e) =>
                setFilterState((p) => ({ ...p, memberType: e.target.value }))
              }
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
              aria-label="Filter by member type"
            >
              <option value="">All Types</option>
              <option value="member">Member</option>
              <option value="alumni">Alumni</option>
            </select>
            </div>

            {/* Clear filters */}
            {(filterState.search ||
              filterState.roleId ||
              filterState.departmentId ||
              filterState.status ||
              filterState.memberType) && (
              <button
                type="button"
                onClick={() => {
                  setFilterState({
                    search: "",
                    roleId: "",
                    departmentId: "",
                    status: "",
                    memberType: "",
                  });
                  setDebouncedSearch("");
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                  "hover:bg-[var(--color-bg-surface)] focus:outline-none",
                  "transition-colors"
                )}
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>

          {/* Bulk action toolbar */}
          {selectedIds.size > 0 && (
            <div
              className={cn(
                "flex items-center justify-between flex-wrap gap-3 px-4 py-3 rounded-lg",
                "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30"
              )}
              role="toolbar"
              aria-label="Bulk actions"
            >
              <span className="text-sm font-medium text-[var(--color-primary)]">
                {selectedIds.size} member{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkAction("activate")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "bg-[var(--color-success)]/10 text-[var(--color-success)]",
                    "hover:bg-[var(--color-success)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--color-success)]",
                    "transition-colors"
                  )}
                >
                  <UserCheck size={13} />
                  Activate
                </button>
                <button
                  type="button"
                  onClick={() => setBulkAction("deactivate")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
                    "hover:bg-[var(--color-warning)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--color-warning)]",
                    "transition-colors"
                  )}
                >
                  <UserX size={13} />
                  Deactivate
                </button>
                <button
                  type="button"
                  onClick={() => setBulkAction("delete")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "bg-[var(--color-error)]/10 text-[var(--color-error)]",
                    "hover:bg-[var(--color-error)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
                    "transition-colors"
                  )}
                >
                  <Trash2 size={13} />
                  Archive
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className={cn(
                    "p-1.5 rounded-lg text-[var(--color-text-secondary)]",
                    "hover:bg-[var(--color-bg-surface)] focus:outline-none",
                    "transition-colors"
                  )}
                  aria-label="Clear selection"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {membersError && (
            <Alert
              variant="error"
              message={membersError.message ?? "Failed to load members."}
            />
          )}

          {/* Table header row with select-all */}
          <div className="w-full overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full min-w-full border-collapse">
              <thead>
                <tr className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)]">
                  {/* Select-all checkbox column */}
                  <th className="px-4 py-3 w-10" scope="col">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      aria-label={allOnPageSelected ? "Deselect all" : "Select all on page"}
                      className="flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] focus:outline-none"
                    >
                      {allOnPageSelected ? (
                        <CheckSquare size={16} className="text-[var(--color-accent)]" />
                      ) : someSelected ? (
                        <CheckSquare size={16} className="text-[var(--color-text-secondary)] opacity-60" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  {[
                    { key: "member", label: "Member" },
                    { key: "username", label: "Username" },
                    { key: "role", label: "Role" },
                    { key: "department", label: "Department" },
                    { key: "session", label: "Session" },
                    { key: "memberType", label: "Type" },
                    { key: "status", label: "Status" },
                    { key: "createdAt", label: "Joined" },
                    { key: "lastLogin", label: "Last Login" },
                    { key: "actions", label: "" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] text-left whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {membersLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr
                      key={`skel-${i}`}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="px-4 py-3 w-10">
                        <Skeleton width={16} height={16} />
                      </td>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton height={18} className={j === 0 ? "w-40" : "w-20"} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : members.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-16 text-center text-sm text-[var(--color-text-secondary)]"
                    >
                      No members found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  members.map((member, idx) => (
                    <tr
                      key={member.id}
                      className={cn(
                        "border-b border-[var(--color-border)] last:border-0",
                        "transition-colors duration-100",
                        selectedIds.has(member.id)
                          ? "bg-[var(--color-primary)]/5"
                          : idx % 2 === 0
                          ? "bg-[var(--color-bg-surface)]"
                          : "bg-transparent",
                        "hover:bg-[var(--color-bg-elevated)]"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 w-10">
                        <button
                          type="button"
                          onClick={() => handleSelectOne(member.id)}
                          aria-label={
                            selectedIds.has(member.id)
                              ? `Deselect ${member.fullName}`
                              : `Select ${member.fullName}`
                          }
                          className="flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] focus:outline-none"
                        >
                          {selectedIds.has(member.id) ? (
                            <CheckSquare
                              size={16}
                              className="text-[var(--color-accent)]"
                            />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      {/* Member name + avatar */}
                      <td className="px-4 py-3">
                        <MemberAvatarCell member={member} />
                      </td>

                      {/* Username */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                          @{member.username}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium"
                          style={{
                            color:
                              member.role?.color ?? "var(--color-text-secondary)",
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                member.role?.color ?? "transparent",
                            }}
                          />
                          {member.role?.name ?? "—"}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--color-text-secondary)] truncate max-w-[120px] block">
                          {member.department?.name ?? "—"}
                        </span>
                      </td>

                      {/* Session */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {member.session ?? "—"}
                        </span>
                      </td>

                      {/* Member type */}
                      <td className="px-4 py-3">
                        <Badge variant="neutral" size="sm">
                          {MEMBER_TYPE_LABELS[member.memberType] ??
                            member.memberType}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {(() => {
                          const cfg = STATUS_BADGE_MAP[member.status] ?? {
                            label: member.status,
                            variant: "neutral" as const,
                          };
                          return (
                            <Badge variant={cfg.variant} size="sm">
                              {cfg.label}
                            </Badge>
                          );
                        })()}
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {formatDate(member.createdAt, "short")}
                        </span>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {member.lastLogin
                            ? formatDate(member.lastLogin, "relative")
                            : "Never"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu
                          trigger={
                            <button
                              type="button"
                              className={cn(
                                "p-1.5 rounded-md text-[var(--color-text-secondary)]",
                                "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
                                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                                "transition-colors"
                              )}
                              aria-label={`Actions for ${member.fullName}`}
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          }
                          align="right"
                        >
                          <DropdownMenuItem
                            icon={<Eye size={14} />}
                            onClick={() =>
                              window.open(
                                `/members/${member.username}`,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            icon={<Edit2 size={14} />}
                            onClick={() => setEditMember(member)}
                          >
                            Edit Member
                          </DropdownMenuItem>
                          <DropdownMenuDivider />
                          {member.status === "active" && (
                            <>
                              <DropdownMenuItem
                                icon={<UserX size={14} />}
                                onClick={() =>
                                  handleStatusChange(member.id, "inactive")
                                }
                              >
                                Deactivate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                icon={<Shield size={14} />}
                                onClick={() =>
                                  handleStatusChange(member.id, "suspended")
                                }
                              >
                                Suspend
                              </DropdownMenuItem>
                            </>
                          )}
                          {member.status === "inactive" && (
                            <>
                              <DropdownMenuItem
                                icon={<UserCheck size={14} />}
                                onClick={() =>
                                  handleStatusChange(member.id, "active")
                                }
                              >
                                Activate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                icon={<Shield size={14} />}
                                onClick={() =>
                                  handleStatusChange(member.id, "suspended")
                                }
                              >
                                Suspend
                              </DropdownMenuItem>
                            </>
                          )}
                          {member.status === "suspended" && (
                            <>
                              <DropdownMenuItem
                                icon={<UserCheck size={14} />}
                                onClick={() =>
                                  handleStatusChange(member.id, "active")
                                }
                              >
                                Unsuspend (Activate)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                icon={<UserX size={14} />}
                                onClick={() =>
                                  handleStatusChange(member.id, "inactive")
                                }
                              >
                                Deactivate
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuDivider />
                          {member.status !== "inactive" && (
                            <DropdownMenuItem
                              icon={<Trash2 size={14} />}
                              variant="danger"
                              onClick={() => setDeleteMemberId(member.id)}
                            >
                              Archive Member
                            </DropdownMenuItem>
                          )}
                          {member.status === "inactive" && (
                            <DropdownMenuItem
                              icon={<UserCheck size={14} />}
                              onClick={() => handleStatusChange(member.id, "active")}
                            >
                              Restore from Archive
                            </DropdownMenuItem>
                          )}
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, total)} of {total} members
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  aria-label="Previous page"
                  className={cn(
                    "inline-flex items-center justify-center w-9 h-9 rounded-md text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-colors",
                    page === 0
                      ? "text-[var(--color-text-secondary)] opacity-40 cursor-not-allowed"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i;
                  } else if (page < 4) {
                    pageNum = i < 5 ? i : i === 5 ? -1 : totalPages - 1;
                  } else if (page >= totalPages - 4) {
                    pageNum =
                      i === 0
                        ? 0
                        : i === 1
                        ? -1
                        : totalPages - 7 + i;
                  } else {
                    if (i === 0) pageNum = 0;
                    else if (i === 1) pageNum = -1;
                    else if (i === 5) pageNum = -1;
                    else if (i === 6) pageNum = totalPages - 1;
                    else pageNum = page - 1 + (i - 2);
                  }

                  if (pageNum === -1) {
                    return (
                      <span
                        key={`ellipsis-${i}`}
                        className="w-9 h-9 flex items-center justify-center text-[var(--color-text-secondary)] text-sm"
                        aria-hidden="true"
                      >
                        …
                      </span>
                    );
                  }

                  const isActive = pageNum === page;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      aria-label={`Page ${pageNum + 1}`}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "inline-flex items-center justify-center w-9 h-9 rounded-md text-sm font-medium",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-colors",
                        isActive
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
                      )}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  aria-label="Next page"
                  className={cn(
                    "inline-flex items-center justify-center w-9 h-9 rounded-md text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-colors",
                    page >= totalPages - 1
                      ? "text-[var(--color-text-secondary)] opacity-40 cursor-not-allowed"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Member"
        size="xl"
      >
        <MemberForm
          roles={rolesData?.data ?? []}
          departments={deptsData?.data ?? []}
          onSubmit={async (data) => {
            const res = await fetch("/api/members", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error ?? "Failed to create member");
            }
            const created = await res.json();
            await mutateMembers();
            addToast("Member created successfully.", "success");
            await log(
              "create_member",
              `Created member: ${data.fullName}`,

              "Member",
              created?.data?.id
            );
            setAddModalOpen(false);
          }}
          onClose={() => setAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={!!editMember}
        onClose={() => setEditMember(null)}
        title="Edit Member"
        size="xl"
      >
        {editMember && (
          <MemberForm
            initialData={editMember}
            roles={rolesData?.data ?? []}
            departments={deptsData?.data ?? []}
            onSubmit={async (data) => {
              const res = await fetch(`/api/members/${editMember.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Failed to update member");
              }
              await mutateMembers();
              addToast("Member updated successfully.", "success");
              await log(
                "update_member",
                `Updated member: ${editMember.fullName}`,
                "Member",
                editMember.id
              );
              setEditMember(null);
            }}
            onClose={() => setEditMember(null)}
          />
        )}
      </Modal>

      {/* Delete/Archive Confirmation Modal */}
      <Modal
        isOpen={!!deleteMemberId}
        onClose={() => {
          setDeleteMemberId(null);
          setActionError(null);
        }}
        title="Archive Member"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            This will deactivate the member and prevent them from logging in.
            Their data (posts, gallery items, certificates) will be preserved.
            You can reactivate them later.
          </p>
          {actionError && <Alert variant="error" message={actionError} />}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDeleteMemberId(null);
                setActionError(null);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteMember}
              disabled={actionSubmitting}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--color-error)] text-white hover:opacity-90",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]",
                "disabled:opacity-60 transition-opacity"
              )}
            >
              {actionSubmitting && <Spinner size="sm" />}
              Archive Member
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Action Confirmation Modal */}
      <Modal
        isOpen={!!bulkAction}
        onClose={() => {
          setBulkAction(null);
          setActionError(null);
        }}
        title={
          bulkAction === "activate"
            ? "Activate Members"
            : bulkAction === "deactivate"
            ? "Deactivate Members"
            : "Archive Members"
        }
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {bulkAction === "activate" &&
              `Activate ${selectedIds.size} selected member(s)? They will regain access to the platform.`}
            {bulkAction === "deactivate" &&
              `Deactivate ${selectedIds.size} selected member(s)? They will lose platform access.`}
            {bulkAction === "delete" &&
              `Archive ${selectedIds.size} selected member(s)? Their data will be preserved but they will be deactivated.`}
          </p>
          {actionError && <Alert variant="error" message={actionError} />}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setBulkAction(null);
                setActionError(null);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkAction}
              disabled={actionSubmitting}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "text-white hover:opacity-90",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "disabled:opacity-60 transition-opacity",
                bulkAction === "activate"
                  ? "bg-[var(--color-success)]"
                  : "bg-[var(--color-error)]"
              )}
            >
              {actionSubmitting && <Spinner size="sm" />}
              {bulkAction === "activate"
                ? "Activate"
                : bulkAction === "deactivate"
                ? "Deactivate"
                : "Archive"}{" "}
              {selectedIds.size} Member{selectedIds.size !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}