// src/app/admin/layout.tsx
// Server Component — NO "use client" directive

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ToastProvider } from "@/components/ui/Feedback";
import { AdminShell } from "@/app/admin/_components/AdminShell";

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
      <AdminShell
        clubName={clubName}
        clubShortName={clubShortName}
        logoUrl={logoUrl}
        user={userProps}
      >
        {children}
      </AdminShell>
    </ToastProvider>
  );
}