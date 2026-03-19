// src/components/layout/AdminSidebar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Calendar,
  FolderKanban,
  Image,
  Megaphone,
  MessageSquare,
  Wrench,
  UsersRound,
  GraduationCap,
  Award,
  Mail,
  LayoutTemplate,
  Facebook,
  Bot,
  ShieldCheck,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

import type { AdminSection, SidebarNavItem } from "@/types/ui";
import { canAccess } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { Session } from "next-auth";

// ─── Nav Item Config ──────────────────────────────────────────────────────────

interface SidebarNavItemExtended extends SidebarNavItem {
  Icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: SidebarNavItemExtended[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      {
        label: "Dashboard",
        section: "dashboard",
        icon: "LayoutDashboard",
        Icon: LayoutDashboard,
        permission: "manage_members",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Members",
        section: "members",
        icon: "Users",
        Icon: Users,
        permission: "manage_members",
      },
      {
        label: "Applications",
        section: "applications",
        icon: "ClipboardList",
        Icon: ClipboardList,
        permission: "approve_applications",
      },
      {
        label: "Events",
        section: "events",
        icon: "Calendar",
        Icon: Calendar,
        permission: "manage_events",
      },
      {
        label: "Projects",
        section: "projects",
        icon: "FolderKanban",
        Icon: FolderKanban,
        permission: "manage_projects",
      },
      {
        label: "Gallery",
        section: "gallery",
        icon: "Image",
        Icon: Image,
        permission: "manage_gallery",
      },
      {
        label: "Announcements",
        section: "announcements",
        icon: "Megaphone",
        Icon: Megaphone,
        permission: "manage_announcements",
      },
      {
        label: "Feed",
        section: "feed",
        icon: "MessageSquare",
        Icon: MessageSquare,
        permission: "manage_feed",
      },
      {
        label: "Instruments",
        section: "instruments",
        icon: "Wrench",
        Icon: Wrench,
        permission: "manage_instruments",
      },
    ],
  },
  {
    label: "Club",
    items: [
      {
        label: "Committee",
        section: "committee",
        icon: "UsersRound",
        Icon: UsersRound,
        permission: "manage_members",
      },
      {
        label: "Certificates",
        section: "certifications",
        icon: "Award",
        Icon: Award,
        permission: "manage_certificates",
      },
      {
        label: "Emails",
        section: "emails",
        icon: "Mail",
        Icon: Mail,
        permission: "manage_emails",
      },
      {
        label: "Custom Cards",
        section: "custom-cards",
        icon: "LayoutTemplate",
        Icon: LayoutTemplate,
        permission: "manage_club_config",
      },
    ],
  },
  {
    label: "Integration",
    items: [
      {
        label: "Facebook",
        section: "facebook",
        icon: "Facebook",
        Icon: Facebook,
        permission: "manage_facebook",
      },
      {
        label: "AI Config",
        section: "ai-config",
        icon: "Bot",
        Icon: Bot,
        permission: "manage_ai_config",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Roles",
        section: "roles",
        icon: "ShieldCheck",
        Icon: ShieldCheck,
        permission: "manage_roles",
      },
      {
        label: "Audit Logs",
        section: "audit-logs",
        icon: "ScrollText",
        Icon: ScrollText,
        permission: "view_audit_logs",
      },
      {
        label: "Club Config",
        section: "club-config",
        icon: "Settings",
        Icon: Settings,
        permission: "manage_club_config",
      },
    ],
  },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipLabelProps {
  label: string;
  visible: boolean;
}

function TooltipLabel({ label, visible }: TooltipLabelProps): JSX.Element | null {
  if (!visible) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] shadow-lg"
    >
      {label}
    </div>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  item: SidebarNavItemExtended;
  isActive: boolean;
  collapsed: boolean;
}

function NavItem({ item, isActive, collapsed }: NavItemProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);
  const { Icon, label, section } = item;

  return (
    <div
      className="relative"
      onMouseEnter={() => collapsed && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => collapsed && setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <Link
        href={`/admin/${section}`}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg-surface)]",
          isActive
            ? "border-l-2 border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] pl-[10px] text-[var(--color-text-primary)]"
            : "border-l-2 border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon
          size={18}
          className={cn(
            "shrink-0 transition-colors",
            isActive
              ? "text-[var(--color-primary)]"
              : "text-[var(--color-text-secondary)]"
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap font-medium transition-all duration-200",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          {label}
        </span>
      </Link>
      {collapsed && <TooltipLabel label={label} visible={showTooltip} />}
    </div>
  );
}

// ─── AdminSidebar ─────────────────────────────────────────────────────────────

export function AdminSidebar(): JSX.Element {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { canAccess: canAccessSection, isSuperAdmin } = usePermissions();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Persist collapse preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // localStorage may be unavailable in some environments
    }
  }, [collapsed]);

  // Active section detection
  const activeSection = useMemo<string>(() => {
    const segments = pathname.split("/").filter(Boolean);
    // /admin/[section] → last segment
    if (segments[0] === "admin" && segments.length >= 2) {
      return segments[1];
    }
    return "dashboard";
  }, [pathname]);

  // Filtered nav groups based on permissions
  const filteredGroups = useMemo<NavGroup[]>(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (isSuperAdmin) return true;
        return canAccessSection(item.section);
      }),
    })).filter((group) => group.items.length > 0);
  }, [canAccessSection, isSuperAdmin]);

  // Session user data
  const user = session?.user as
    | {
        name?: string;
        email?: string;
        image?: string;
        username?: string;
        adminRole?: string;
      }
    | undefined;

  const displayName = user?.name ?? user?.username ?? "Admin";
  const roleName = user?.adminRole ?? "Admin";
  const avatarUrl = user?.image;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-surface)] transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
      aria-label="Admin navigation"
    >
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className={cn(
          "absolute -right-3 top-[72px] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] shadow-sm transition-colors hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight size={12} aria-hidden="true" />
        ) : (
          <ChevronLeft size={12} aria-hidden="true" />
        )}
      </button>

      {/* Logo / Header */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-[var(--color-border)] px-4",
          collapsed ? "justify-center" : "justify-start gap-3"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)] text-[var(--color-text-inverse)]">
          <Settings size={14} aria-hidden="true" />
        </div>
        {!collapsed && (
          <span className="overflow-hidden whitespace-nowrap text-sm font-semibold text-[var(--color-text-primary)]">
            Admin Panel
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin"
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col gap-1 px-2">
          {filteredGroups.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-4")}>
              {/* Group Label */}
              {!collapsed && (
                <div className="mb-1 px-3 py-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {group.label}
                  </span>
                </div>
              )}
              {collapsed && groupIndex > 0 && (
                <div className="my-2 border-t border-[var(--color-border)]" />
              )}

              {/* Items */}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.section}
                    item={item}
                    isActive={activeSection === item.section}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom: User Info */}
      <div className="shrink-0 border-t border-[var(--color-border)] p-3">
        {collapsed ? (
          <div className="flex justify-center">
            <div
              className="relative h-8 w-8 shrink-0"
              title={`${displayName} — ${roleName}`}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-[var(--color-border)]"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-elevated)] text-xs font-bold text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)]">
                  {initials}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative h-8 w-8 shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-[var(--color-border)]"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-elevated)] text-xs font-bold text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)]">
                  {initials}
                </div>
              )}
            </div>

            {/* Name + Role */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
                {displayName}
              </p>
              <span
                className={cn(
                  "mt-0.5 inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                  "bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] text-[var(--color-primary)]"
                )}
              >
                {roleName}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}