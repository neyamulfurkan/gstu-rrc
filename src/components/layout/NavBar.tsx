// src/components/layout/NavBar.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";
import {
  Bell,
  Search,
  X,
  LogIn,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Home,
  Users,
  Calendar,
  FolderOpen,
  Image as ImageIcon,
  Rss,
  Wrench,
  GraduationCap,
  Info,
  UserPlus,
  Award,
  Menu,
} from "lucide-react";

import type { ClubConfigPublic } from "@/types/index";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge, Spinner } from "@/components/ui/Feedback";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
} from "@/components/ui/Overlay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface SearchResult {
  id: string;
  name: string;
  href: string;
  type: "member" | "event" | "project" | "announcement";
  subtitle?: string;
}

interface SearchApiResponse {
  members: Array<{ id: string; fullName: string; username: string; avatarUrl?: string }>;
  events: Array<{ id: string; title: string; slug: string }>;
  projects: Array<{ id: string; title: string; slug: string }>;
  announcements: Array<{ id: string; title: string; excerpt?: string }>;
}

interface NavBarProps {
  config: ClubConfigPublic;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY_NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home", icon: <Home size={15} /> },
  { href: "/members", label: "Members", icon: <Users size={15} /> },
  { href: "/events", label: "Events", icon: <Calendar size={15} /> },
  { href: "/projects", label: "Projects", icon: <FolderOpen size={15} /> },
  { href: "/gallery", label: "Gallery", icon: <ImageIcon size={15} /> },
];

const MORE_NAV_LINKS: NavLink[] = [
  { href: "/feed", label: "Feed", icon: <Rss size={15} /> },
  { href: "/instruments", label: "Instruments", icon: <Wrench size={15} /> },
  { href: "/alumni", label: "Alumni", icon: <GraduationCap size={15} /> },
  { href: "/about", label: "About", icon: <Info size={15} /> },
  { href: "/membership", label: "Join Us", icon: <UserPlus size={15} /> },
  { href: "/certificates", label: "Certificates", icon: <Award size={15} /> },
];

const SEARCH_DEBOUNCE_MS = 300;

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const searchFetcher = async (url: string): Promise<SearchApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Search failed");
  return res.json() as Promise<SearchApiResponse>;
};

// ─── useDebounce (local, lightweight) ────────────────────────────────────────

function useLocalDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ─── SearchOverlay ─────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  onClose: () => void;
}

function SearchOverlay({ onClose }: SearchOverlayProps): JSX.Element {
  const [query, setQuery] = useState("");
  const debouncedQuery = useLocalDebounce(query, SEARCH_DEBOUNCE_MS);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const shouldFetch = debouncedQuery.length >= 2;
  const { data, isLoading } = useSWR<SearchApiResponse>(
    shouldFetch ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    searchFetcher,
    { revalidateOnFocus: false }
  );

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const results: SearchResult[] = [];

  if (data) {
    data.members.forEach((m) =>
      results.push({
        id: m.id,
        name: m.fullName,
        href: `/members/${m.username}`,
        type: "member",
        subtitle: "@" + m.username,
      })
    );
    data.events.forEach((e) =>
      results.push({
        id: e.id,
        name: e.title,
        href: `/events/${e.slug}`,
        type: "event",
      })
    );
    data.projects.forEach((p) =>
      results.push({
        id: p.id,
        name: p.title,
        href: `/projects/${p.slug}`,
        type: "project",
      })
    );
    data.announcements.forEach((a) =>
      results.push({
        id: a.id,
        name: a.title,
        href: "#",
        type: "announcement",
        subtitle: a.excerpt,
      })
    );
  }

  const typeIcon: Record<SearchResult["type"], React.ReactNode> = {
    member: <Users size={13} />,
    event: <Calendar size={13} />,
    project: <FolderOpen size={13} />,
    announcement: <Bell size={13} />,
  };

  const typeLabel: Record<SearchResult["type"], string> = {
    member: "Member",
    event: "Event",
    project: "Project",
    announcement: "Announcement",
  };

  function handleResultClick(href: string) {
    if (href !== "#") {
      router.push(href);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 25px 60px -10px rgba(0,0,0,0.8)",
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)]">
          <Search size={18} className="text-[var(--color-text-secondary)] flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search members, events, projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "flex-1 bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
              "text-base outline-none border-none"
            )}
            aria-label="Search"
          />
          {isLoading && <Spinner size="sm" />}
          <button
            onClick={onClose}
            aria-label="Close search"
            className={cn(
              "p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              "transition-colors duration-150"
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        {shouldFetch && (
          <div className="max-h-[60vh] overflow-y-auto">
            {results.length === 0 && !isLoading && (
              <div className="py-10 text-center text-sm text-[var(--color-text-secondary)]">
                No results for &ldquo;{debouncedQuery}&rdquo;
              </div>
            )}
            {results.length > 0 && (
              <ul role="listbox" aria-label="Search results">
                {results.map((result) => (
                  <li key={`${result.type}-${result.id}`} role="option" aria-selected="false">
                    <button
                      onClick={() => handleResultClick(result.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left",
                        "hover:bg-[var(--color-bg-surface)] transition-colors duration-100",
                        "focus:outline-none focus:bg-[var(--color-bg-surface)]"
                      )}
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]">
                        {typeIcon[result.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {result.name}
                        </p>
                        {result.subtitle && (
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <Badge variant="neutral" size="sm">
                        {typeLabel[result.type]}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!shouldFetch && (
          <div className="py-6 px-4 text-sm text-[var(--color-text-secondary)] text-center">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NavBar ────────────────────────────────────────────────────────────────────

export function NavBar({ config }: NavBarProps): JSX.Element {
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const { unreadCount } = useNotifications();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Avoid hydration mismatch for session-dependent UI
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Scroll listener — compress nav past 80px
  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 80);
    }

    handleScroll(); // initial check
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isAdmin =
    isMounted && session?.user &&
    ((session.user as { isAdmin?: boolean }).isAdmin === true);

  const handleSignOut = useCallback(() => {
    void signOut({ callbackUrl: "/" });
  }, []);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  function isActivePath(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      <header
        className={cn(
          "hidden lg:block fixed top-0 left-0 right-0 z-40 w-full",
          "transition-all duration-300 ease-in-out",
          // Glass effect
          "bg-[var(--color-bg-base)]/80 backdrop-blur-xl",
          "border-b border-[var(--color-border)]",
          isScrolled ? "py-2 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)]" : "py-0"
        )}
        role="banner"
      >
        <nav
          className="mx-auto flex items-center justify-between px-4 md:px-6 lg:px-8"
          style={{ height: isScrolled ? "56px" : "68px", transition: "height 0.3s ease" }}
          aria-label="Main navigation"
        >
          {/* ── Left: Logo + Club Name ─────────────────────────────── */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2.5 rounded-lg",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
              aria-label={`${config.clubName} — Home`}
            >
              {config.logoUrl ? (
                <Image
                  src={config.logoUrl}
                  alt={`${config.clubName} logo`}
                  width={isScrolled ? 32 : 40}
                  height={isScrolled ? 32 : 40}
                  className="rounded-lg object-contain transition-all duration-300"
                  priority
                />
              ) : (
                <div
                  className={cn(
                    "rounded-lg flex items-center justify-center font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10",
                    "transition-all duration-300",
                    isScrolled ? "w-8 h-8 text-sm" : "w-10 h-10 text-base"
                  )}
                >
                  {(config.clubShortName || config.clubName).slice(0, 2).toUpperCase()}
                </div>
              )}
              <span
                className={cn(
                  "font-[var(--font-display)] font-bold text-[var(--color-text-primary)]",
                  "hidden sm:block transition-all duration-300",
                  isScrolled ? "text-sm" : "text-base"
                )}
              >
                {config.clubShortName || config.clubName}
              </span>
            </Link>
          </div>

          {/* ── Center: Primary Nav Links ─────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            {PRIMARY_NAV_LINKS.map((link) => {
              const active = isActivePath(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
                    "transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                    active
                      ? "text-[var(--color-nav-active,var(--color-accent))] bg-[var(--color-accent)]/10"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span aria-hidden="true">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}

            {/* More dropdown */}
            <DropdownMenu
              trigger={
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
                    "transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  )}
                  aria-haspopup="menu"
                >
                  <Menu size={15} aria-hidden="true" />
                  More
                  <ChevronDown size={13} aria-hidden="true" />
                </button>
              }
              align="right"
            >
              {MORE_NAV_LINKS.map((link) => {
                const active = isActivePath(link.href);
                return (
                  <DropdownMenuItem
                    key={link.href}
                    icon={link.icon}
                    onClick={() => {
                      window.location.href = link.href;
                    }}
                    className={active ? "text-[var(--color-accent)]" : undefined}
                  >
                    {link.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenu>
          </div>

          {/* ── Right: Search + Bell + Auth ───────────────────────── */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Search trigger */}
            <button
              onClick={openSearch}
              aria-label="Open search (Ctrl+K)"
              title="Search (Ctrl+K)"
              className={cn(
                "p-2 rounded-lg text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "transition-colors duration-150"
              )}
            >
              <Search size={18} aria-hidden="true" />
            </button>

            {/* Notification bell */}
            {isMounted && sessionStatus === "authenticated" && (
              <Link
                href="/profile/notifications"
                className={cn(
                  "relative p-2 rounded-lg text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "transition-colors duration-150"
                )}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              >
                <Bell size={18} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      "absolute top-1 right-1 min-w-[16px] h-4 px-0.5",
                      "rounded-full flex items-center justify-center",
                      "text-[10px] font-bold text-white",
                      "bg-[var(--color-error)]",
                      "pointer-events-none"
                    )}
                    aria-hidden="true"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Auth section */}
            {!isMounted || sessionStatus === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-[var(--color-bg-surface)] animate-pulse" />
            ) : sessionStatus === "authenticated" && session?.user ? (
              <DropdownMenu
                trigger={
                  <button
                    className={cn(
                      "flex items-center gap-2 rounded-lg p-1 pr-2",
                      "hover:bg-[var(--color-bg-surface)] transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    )}
                    aria-label="User menu"
                    aria-haspopup="menu"
                  >
                    {(session.user as { avatarUrl?: string }).avatarUrl ? (
                      <Image
                        src={(session.user as { avatarUrl?: string }).avatarUrl!}
                        alt={(session.user.name ?? "User") + " avatar"}
                        width={32}
                        height={32}
                        className="rounded-full object-cover w-8 h-8 ring-2 ring-[var(--color-border)]"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center ring-2 ring-[var(--color-border)]">
                        <User size={16} className="text-[var(--color-primary)]" />
                      </div>
                    )}
                    <span className="hidden md:block text-sm font-medium text-[var(--color-text-primary)] max-w-[100px] truncate">
                      {(session.user as { username?: string }).username || session.user.name || "User"}
                    </span>
                    <ChevronDown size={13} className="text-[var(--color-text-secondary)] hidden md:block" aria-hidden="true" />
                  </button>
                }
                align="right"
              >
                <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate">
                    {session.user.email}
                  </p>
                </div>

                <DropdownMenuItem icon={<User size={14} />} onClick={() => { window.location.href = "/profile"; }}>
                  My Profile
                </DropdownMenuItem>

                {isAdmin && (
                  <DropdownMenuItem icon={<Settings size={14} />} onClick={() => { window.location.href = "/admin/dashboard"; }}>
                    Admin Panel
                  </DropdownMenuItem>
                )}

                <DropdownMenuDivider />

                <DropdownMenuItem
                  icon={<LogOut size={14} />}
                  onClick={handleSignOut}
                  variant="danger"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
                  "bg-[var(--color-primary)] text-white",
                  "hover:bg-[var(--color-primary)]/90",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
                  "transition-colors duration-150"
                )}
              >
                <LogIn size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Search overlay */}
      {isSearchOpen && <SearchOverlay onClose={closeSearch} />}
    </>
  );
}