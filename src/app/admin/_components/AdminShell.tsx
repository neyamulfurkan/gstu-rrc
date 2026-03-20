"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminTopBar } from "@/app/admin/_components/AdminTopBar";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { Drawer } from "@/components/ui/Overlay";

interface AdminShellProps {
  clubName: string;
  clubShortName: string;
  logoUrl: string;
  user: {
    displayName: string;
    username: string;
    avatarUrl: string;
    adminRole: string;
    userId: string;
  };
  children: React.ReactNode;
}

export function AdminShell({
  clubName,
  clubShortName,
  logoUrl,
  user,
  children,
}: AdminShellProps): JSX.Element {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[var(--color-bg-base)] z-[50]">
      {/* Desktop sidebar — hidden on mobile, always visible on md+ */}
      <div className="hidden md:flex md:flex-shrink-0 h-full">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar — slides in from left as an overlay, content stays fixed */}
      <Drawer
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        side="left"
        width="280px"
        showCloseButton={false}
        disableBodyScrollLock={true}
      >
        <AdminSidebar />
      </Drawer>

      {/* Right column: top bar + scrollable main content, never moves */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <AdminTopBar
          clubName={clubName}
          clubShortName={clubShortName}
          logoUrl={logoUrl}
          user={user}
          onMenuClick={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <ScrollProgress />
        <main
          id="admin-main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-[var(--color-bg-base)] p-3 md:p-6 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
