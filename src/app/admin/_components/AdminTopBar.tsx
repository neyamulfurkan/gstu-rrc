"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Menu,
  ExternalLink,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Bell,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface AdminTopBarProps {
  clubName: string;
  clubShortName: string;
  logoUrl: string;
  onMenuClick?: () => void;
  user: {
    displayName: string;
    username: string;
    avatarUrl: string;
    adminRole: string;
    userId: string;
  };
}

export function AdminTopBar({
  clubName,
  clubShortName,
  logoUrl,
  user,
  onMenuClick,
}: AdminTopBarProps): JSX.Element {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between h-14 px-4 flex-shrink-0",
        "border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]",
        "z-30"
      )}
    >
      {/* Left: hamburger (mobile) + logo + name */}
      <div className="flex items-center gap-3">
        {/* Hamburger — only visible on mobile */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className={cn(
            "md:hidden flex items-center justify-center w-8 h-8 rounded-lg",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-elevated)] transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <Menu size={18} aria-hidden="true" />
        </button>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`${clubName} logo`}
            width={28}
            height={28}
            className="rounded object-contain"
          />
        ) : (
          <div className="w-7 h-7 rounded bg-[var(--color-primary)]/20 flex items-center justify-center">
            <span className="text-xs font-bold text-[var(--color-primary)] font-[var(--font-display)]">
              {clubShortName.slice(0, 2)}
            </span>
          </div>
        )}
        <div className="hidden sm:block">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] font-[var(--font-display)]">
            {clubShortName}
          </span>
          <span className="ml-2 text-xs text-[var(--color-text-secondary)] font-[var(--font-mono)]">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* View site */}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
            "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
            "hover:text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/40",
            "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <ExternalLink size={12} aria-hidden="true" />
          View Site
        </Link>

        {/* Notifications */}
        <Link
          href="/profile/notifications"
          className={cn(
            "relative flex items-center justify-center w-8 h-8 rounded-lg",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-elevated)] transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
        >
          <Bell size={16} aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-error)]"
              aria-hidden="true"
            />
          )}
        </Link>

        {/* User dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className={cn(
              "flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg",
              "hover:bg-[var(--color-bg-elevated)] transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                width={28}
                height={28}
                className="rounded-full object-cover ring-1 ring-[var(--color-border)]"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                <User
                  size={14}
                  className="text-[var(--color-primary)]"
                  aria-hidden="true"
                />
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-tight">
                {user.displayName}
              </p>
              <p className="text-[10px] text-[var(--color-text-secondary)] leading-tight font-[var(--font-mono)]">
                {user.adminRole}
              </p>
            </div>
            <ChevronDown
              size={12}
              className={cn(
                "text-[var(--color-text-secondary)] transition-transform duration-200",
                dropdownOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
                aria-hidden="true"
              />
              <div
                className={cn(
                  "absolute right-0 top-full mt-1 w-52 rounded-xl border z-50 py-1 overflow-hidden",
                  "bg-[var(--color-bg-elevated)] border-[var(--color-border)]",
                  "shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                )}
                role="menu"
                aria-label="User menu"
              >
                {/* User info header */}
                <div className="px-3 py-2.5 border-b border-[var(--color-border)]">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-secondary)] truncate font-[var(--font-mono)]">
                    @{user.username}
                  </p>
                </div>

                {/* Menu items */}
                <Link
                  href={`/members/${user.username}`}
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--color-text-secondary)]",
                    "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
                    "transition-colors duration-100 focus:outline-none focus:bg-[var(--color-bg-surface)]"
                  )}
                >
                  <User size={13} aria-hidden="true" />
                  View Profile
                </Link>

                <Link
                  href="/admin/club-config"
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--color-text-secondary)]",
                    "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
                    "transition-colors duration-100 focus:outline-none focus:bg-[var(--color-bg-surface)]"
                  )}
                >
                  <Settings size={13} aria-hidden="true" />
                  Club Settings
                </Link>

                <div className="border-t border-[var(--color-border)] my-1" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setDropdownOpen(false);
                    void handleSignOut();
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--color-error)]",
                    "hover:bg-[var(--color-error)]/10 transition-colors duration-100",
                    "focus:outline-none focus:bg-[var(--color-error)]/10"
                  )}
                >
                  <LogOut size={13} aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}