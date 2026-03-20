import type { Session } from "next-auth";
import type { AdminSection } from "@/types/ui";

// ─── Permission List ──────────────────────────────────────────────────────────

export const PERMISSION_LIST: string[] = [
  "manage_members",
  "approve_applications",
  "manage_events",
  "manage_projects",
  "manage_gallery",
  "manage_announcements",
  "manage_feed",
  "manage_instruments",
  "manage_certificates",
  "manage_emails",
  "manage_facebook",
  "manage_ai_config",
  "manage_admins",
  "manage_roles",
  "manage_club_config",
  "send_emails",
  "view_audit_logs",
  "super_admin",
];

// ─── Section → Permission Map ─────────────────────────────────────────────────

const SECTION_PERMISSION_MAP: Record<AdminSection, string> = {
  dashboard: "manage_members",
  members: "manage_members",
  applications: "approve_applications",
  events: "manage_events",
  projects: "manage_projects",
  gallery: "manage_gallery",
  announcements: "manage_announcements",
  feed: "manage_feed",
  instruments: "manage_instruments",
  committee: "manage_members",
  advisors: "manage_members",
  certifications: "manage_certificates",
  emails: "manage_emails",
  "custom-cards": "manage_club_config",
  facebook: "manage_facebook",
  "ai-config": "manage_ai_config",
  roles: "manage_roles",
  "audit-logs": "view_audit_logs",
  "club-config": "manage_club_config",
};

// ─── Permission Checks ────────────────────────────────────────────────────────

export function hasPermission(
  permissions: Record<string, boolean> | null | undefined,
  permission: string
): boolean {
  if (!permissions) return false;
  return permissions[permission] === true;
}

export function hasAnyPermission(
  permissions: Record<string, boolean> | null | undefined,
  permissionList: string[]
): boolean {
  if (!permissions) return false;
  return permissionList.some((p) => permissions[p] === true);
}

export function isAdmin(session: Session | null): boolean {
  if (!session?.user) return false;
  return (session.user as { isAdmin?: boolean }).isAdmin === true;
}

export function isSuperAdmin(session: Session | null): boolean {
  if (!session?.user) return false;
  const user = session.user as {
    isAdmin?: boolean;
    adminRole?: string | null;
    permissions?: Record<string, boolean>;
  };
  // Super admin if: adminRole name is "super_admin", OR has super_admin permission,
  // OR is an admin with no adminRoleId (seed admin — has isAdmin=true but no role assigned)
  if (user.adminRole === "super_admin") return true;
  if (hasPermission(user.permissions ?? null, "super_admin")) return true;
  // Seed admin: isAdmin=true but adminRole is null (no role assigned yet)
  if (user.isAdmin === true && (user.adminRole === null || user.adminRole === undefined)) return true;
  return false;
}

export function canAccess(
  section: AdminSection,
  session: Session | null
): boolean {
  if (!session?.user) return false;
  if (isSuperAdmin(session)) return true;
  const user = session.user as {
    isAdmin?: boolean;
    permissions?: Record<string, boolean>;
  };
  if (!user.isAdmin) return false;
  const required = SECTION_PERMISSION_MAP[section];
  if (!required) return false;
  return hasPermission(user.permissions ?? null, required);
}