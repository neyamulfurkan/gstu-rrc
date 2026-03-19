// src/app/admin/layout.tsx
// Server Component — NO "use client" directive

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { ToastProvider } from "@/components/ui/Feedback";
import { AdminTopBar } from "@/app/admin/_components/AdminTopBar";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- created below

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  // ── Auth guard (server-side, secure) ──────────────────────────────────────
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.isAdmin) {
    redirect("/?error=unauthorized");
  }

  // ── Fetch minimal config for top bar ──────────────────────────────────────
  let clubName = "Club";
  let clubShortName = "RC";
  let logoUrl = "";

  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        clubShortName: true,
        logoUrl: true,
      },
    });

    if (config) {
      clubName = config.clubName;
      clubShortName = config.clubShortName;
      logoUrl = config.logoUrl;
    }
  } catch (err) {
    console.error("[AdminLayout] Failed to fetch ClubConfig:", err);
    // Fall back to defaults — do not crash the layout
  }

  // ── Serializable user props for client top bar ────────────────────────────
  const userProps = {
    displayName: session.user.fullName ?? session.user.name ?? "Admin",
    username: session.user.username ?? "admin",
    avatarUrl: session.user.avatarUrl ?? session.user.image ?? "",
    adminRole: session.user.adminRole ?? "Admin",
    userId: session.user.userId,
  };

  return (
    <ToastProvider>
        <div className="fixed inset-0 flex overflow-hidden bg-[var(--color-bg-base)] z-[50]">
          {/* ── Sidebar ── */}
          <AdminSidebar />

          {/* ── Right column ── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top bar — client component, receives serializable props */}
            <AdminTopBar
              clubName={clubName}
              clubShortName={clubShortName}
              logoUrl={logoUrl}
              user={userProps}
            />

            {/* Scroll progress indicator */}
            <ScrollProgress />

            {/* Page content */}
            <main
              id="admin-main-content"
              tabIndex={-1}
              className="flex-1 overflow-y-auto bg-[var(--color-bg-base)] p-6 focus:outline-none"
            >
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
  );
}