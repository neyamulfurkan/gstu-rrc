// src/components/layout/MobileNav.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Users,
  Calendar,
  Cpu,
  Menu,
  Bell,
  MessageSquare,
  Image as ImageIcon,
  GraduationCap,
  Wrench,
  Info,
  UserPlus,
  Award,
  LogIn,
  LogOut,
  User,
  Shield,
  X,
} from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import { Drawer } from "@/components/ui/Overlay";
import { cn, generateInitialsAvatar } from "@/lib/utils";
import type { ClubConfigPublic } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MobileNavProps {
  config: ClubConfigPublic;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface DrawerTile {
  label: string;
  href: string;
  icon: React.ElementType;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  hideWhenAuth?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Members", href: "/members", icon: Users },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Projects", href: "/projects", icon: Cpu },
];

const DRAWER_TILES: DrawerTile[] = [
  { label: "Feed", href: "/feed", icon: MessageSquare },
  { label: "Gallery", href: "/gallery", icon: ImageIcon },
  { label: "Alumni", href: "/alumni", icon: GraduationCap },
  { label: "Instruments", href: "/instruments", icon: Wrench },
  { label: "About", href: "/about", icon: Info },
  { label: "Membership", href: "/membership", icon: UserPlus },
  { label: "Certificates", href: "/certificates", icon: Award, requiresAuth: true },
  { label: "Admin", href: "/admin/dashboard", icon: Shield, requiresAdmin: true },
];

// ─── Animation Variants ───────────────────────────────────────────────────────

const tabVariants = {
  tap: { scale: 0.88 },
};

const badgeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, damping: 12, stiffness: 400 },
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotificationBell({ unreadCount, href }: { unreadCount: number; href: string }) {
  return (
    <Link
      href={href}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      className={cn(
        "relative p-2 rounded-xl text-[var(--color-text-secondary)]",
        "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
        "transition-colors duration-150"
      )}
    >
      <Bell className="w-5 h-5" />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            key="badge"
            className={cn(
              "absolute -top-0.5 -right-0.5",
              "min-w-[18px] h-[18px] px-1",
              "flex items-center justify-center",
              "rounded-full text-[10px] font-bold leading-none",
              "bg-[var(--color-accent)] text-[var(--color-bg-base)]"
            )}
            variants={badgeVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

function UserAvatar({
  avatarUrl,
  name,
  size = 32,
}: {
  avatarUrl?: string | null;
  name?: string | null;
  size?: number;
}) {
  const fallback =
    typeof window !== "undefined" && name
      ? generateInitialsAvatar(name)
      : undefined;

  const src = avatarUrl || fallback || "";

  if (!src) {
    return (
      <div
        className="rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </div>
    );
  }

  return (
    <div
      className="rounded-full overflow-hidden border border-[var(--color-border)] shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={name ?? "User avatar"}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        unoptimized={src.startsWith("data:")}
      />
    </div>
  );
}

// ─── Drawer Content ───────────────────────────────────────────────────────────

function DrawerContent({
  config,
  onClose,
}: {
  config: ClubConfigPublic;
  onClose: () => void;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = status === "authenticated";
  const isAdmin =
    isAuthenticated &&
    (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;

  const firstName = isAuthenticated
    ? (session?.user?.name ?? "").split(" ")[0] || "Member"
    : null;

  const avatarUrl = isAuthenticated
    ? ((session?.user as { avatarUrl?: string } | undefined)?.avatarUrl ??
      session?.user?.image ??
      null)
    : null;

  const userRole = isAuthenticated
    ? ((session?.user as { adminRole?: string } | undefined)?.adminRole ?? null)
    : null;

  const visibleTiles = DRAWER_TILES.filter((tile) => {
    if (tile.requiresAdmin && !isAdmin) return false;
    if (tile.requiresAuth && !isAuthenticated) return false;
    if (tile.hideWhenAuth && isAuthenticated) return false;
    return true;
  });

  async function handleSignOut() {
    onClose();
    await signOut({ callbackUrl: "/" });
  }

  function handleTileClick(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div
      className="flex flex-col h-full pb-[env(safe-area-inset-bottom)]"
      style={{ minHeight: 0 }}
    >
      {/* User Greeting */}
      <div className="px-5 pt-4 pb-4 border-b border-[var(--color-border)]">
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              onClick={onClose}
              className="focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-full"
            >
              <UserAvatar avatarUrl={avatarUrl} name={session?.user?.name} size={44} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[var(--color-text-primary)] font-semibold text-base font-[var(--font-heading)] leading-tight truncate">
                Hello, {firstName}!
              </p>
              {userRole && (
                <span
                  className={cn(
                    "inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium",
                    "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  )}
                >
                  {userRole}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[var(--color-text-primary)] font-semibold text-base font-[var(--font-heading)] leading-tight">
              Welcome to{" "}
              <span className="text-[var(--color-accent)]">{config.clubShortName}</span>!
            </p>
            <p className="text-[var(--color-text-secondary)] text-xs mt-0.5 truncate">
              {config.universityName}
            </p>
          </div>
        )}
      </div>

      {/* Tile Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          {visibleTiles.map((tile) => {
            const Icon = tile.icon;
            const isActive =
              tile.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tile.href);

            return (
              <motion.button
                key={tile.href}
                onClick={() => handleTileClick(tile.href)}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  "flex flex-col items-center justify-center gap-2",
                  "rounded-xl p-3 min-h-[72px]",
                  "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                  "text-[var(--color-text-secondary)]",
                  "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-all duration-150",
                  isActive && "border-[var(--color-accent)]/50 text-[var(--color-accent)] bg-[var(--color-accent)]/5"
                )}
                aria-label={tile.label}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[11px] font-medium leading-tight text-center">
                  {tile.label}
                </span>
              </motion.button>
            );
          })}

          {/* Profile / Login tile — always visible */}
          {isAuthenticated ? (
            <motion.button
              onClick={() => handleTileClick("/profile")}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "flex flex-col items-center justify-center gap-2",
                "rounded-xl p-3 min-h-[72px]",
                "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                "text-[var(--color-text-secondary)]",
                "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-all duration-150",
                pathname === "/profile" && "border-[var(--color-accent)]/50 text-[var(--color-accent)] bg-[var(--color-accent)]/5"
              )}
              aria-label="My Profile"
            >
              <User className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-medium leading-tight text-center">Profile</span>
            </motion.button>
          ) : (
            <motion.button
              onClick={() => handleTileClick("/login")}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "flex flex-col items-center justify-center gap-2",
                "rounded-xl p-3 min-h-[72px]",
                "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                "text-[var(--color-text-secondary)]",
                "hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-all duration-150"
              )}
              aria-label="Login"
            >
              <LogIn className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-medium leading-tight text-center">Login</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Auth Actions */}
      <div className="px-4 pt-3 pb-4 border-t border-[var(--color-border)] space-y-2">
        {isAuthenticated ? (
          <button
            onClick={() => void handleSignOut()}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
              "text-[var(--color-error)] bg-[var(--color-error)]/10",
              "hover:bg-[var(--color-error)]/20",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]/50",
              "font-medium text-sm transition-colors duration-150"
            )}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        ) : (
          <div className="flex gap-2">
            <Link
              href="/login"
              onClick={onClose}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                "border border-[var(--color-border)] text-[var(--color-text-primary)]",
                "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "font-medium text-sm transition-colors duration-150"
              )}
            >
              <LogIn className="w-4 h-4" />
              Login
            </Link>
            <Link
              href="/membership"
              onClick={onClose}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
                "hover:opacity-90",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50",
                "font-medium text-sm transition-opacity duration-150"
              )}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MobileNav({ config }: MobileNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { unreadCount } = useNotifications();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const avatarUrl =
    ((session?.user as { avatarUrl?: string } | undefined)?.avatarUrl ??
      session?.user?.image ??
      null);
  const userName = session?.user?.name ?? null;

  return (
    <>
      {/* Always-visible full-width transparent top bar */}
      <motion.header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{
          height: "56px",
          paddingTop: "env(safe-area-inset-top, 0px)",
          background: "transparent",
          backdropFilter: isScrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: isScrolled ? "1px solid color-mix(in srgb, var(--color-border) 60%, transparent)" : "none",
          transition: "background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease",
        }}
        aria-label="Mobile top bar"
      >
        {/* Left: Logo + Club name pill */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Link
            href="/"
            aria-label={`${config.clubName} Home`}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-2xl",
              "bg-[var(--color-bg-elevated)]/80 backdrop-blur-xl",
              "border border-[var(--color-border)]",
              "shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
              "hover:border-[var(--color-accent)]/40",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "transition-colors duration-150"
            )}
          >
            {config.logoUrl ? (
              <div className="w-6 h-6 relative shrink-0 rounded-md overflow-hidden">
                <Image
                  src={config.logoUrl}
                  alt={`${config.clubName} logo`}
                  fill
                  className="object-contain"
                  sizes="24px"
                  priority
                />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-md bg-[var(--color-accent)] flex items-center justify-center shrink-0">
                <Cpu className="w-3.5 h-3.5 text-[var(--color-bg-base)]" />
              </div>
            )}
            <span
              className={cn(
                "font-[var(--font-display)] text-xs font-bold tracking-wide",
                "text-[var(--color-text-primary)] max-w-[120px] truncate"
              )}
            >
              {config.clubShortName || config.clubName}
            </span>
          </Link>
        </motion.div>

        {/* Right: Notification + Avatar/Login */}
        <div className="flex items-center gap-1">
          <NotificationBell
            unreadCount={unreadCount}
            href="/profile/notifications"
          />

          {!isMounted ? (
            <div className="w-8 h-8 rounded-full bg-[var(--color-bg-surface)] animate-pulse" />
          ) : session ? (
            <Link
              href="/profile"
              aria-label="My profile"
              className="p-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-opacity hover:opacity-80"
            >
              <UserAvatar avatarUrl={avatarUrl} name={userName} size={32} />
            </Link>
          ) : (
            <Link
              href="/login"
              aria-label="Login"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
                "bg-[var(--color-primary)] text-white",
                "hover:opacity-90",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-opacity duration-150"
              )}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </motion.header>

      {/* Bottom Pill Nav */}
      <nav
        className={cn(
          "lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40",
          "flex items-center gap-1 px-3 py-2",
          "rounded-2xl",
          "backdrop-blur-xl",
          "border"
        )}
        aria-label="Primary navigation"
        style={{
          marginBottom: "env(safe-area-inset-bottom, 0px)",
          backgroundColor: "color-mix(in srgb, var(--color-bg-elevated) 85%, transparent)",
          borderColor: "var(--color-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-xl"
              )}
            >
              <motion.div
                whileTap={tabVariants.tap}
                className={cn(
                  "flex flex-col items-center justify-center gap-1",
                  "px-4 py-2 rounded-xl min-w-[52px]",
                  "transition-all duration-200"
                )}
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", damping: 20, stiffness: 400 }}
                style={{
                  color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                  backgroundColor: isActive ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                }}
              >
                <Icon
                  className="w-5 h-5 transition-all duration-150"
                  style={{
                    filter: isActive ? "drop-shadow(0 0 6px var(--color-accent))" : "none",
                  }}
                />
                <span
                  className="text-[10px] font-medium leading-none transition-colors duration-150"
                  style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)" }}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}

        {/* More Button */}
        <motion.button
          whileTap={tabVariants.tap}
          onClick={openDrawer}
          aria-label="More navigation options"
          aria-haspopup="dialog"
          aria-expanded={isDrawerOpen}
          className={cn(
            "flex flex-col items-center justify-center gap-1",
            "px-4 py-2 rounded-xl min-w-[52px]",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
          style={{
            color: isDrawerOpen ? "var(--color-accent)" : "var(--color-text-secondary)",
            backgroundColor: isDrawerOpen ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDrawerOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Menu className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
          <span
            className="text-[10px] font-medium leading-none"
            style={{ color: isDrawerOpen ? "var(--color-accent)" : "var(--color-text-secondary)" }}
          >
            More
          </span>
        </motion.button>
      </nav>

      {/* Full-Screen Bottom-Sheet Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={config.clubName}
        side="bottom"
        className="lg:hidden"
      >
        <DrawerContent config={config} onClose={closeDrawer} />
      </Drawer>
    </>
  );
}