"use client";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { MobileProfileSidebar } from "@/components/dashboard/MobileProfileSidebar";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";

export type DashboardSidebarMobileProfile = {
  login: string;
  displayName: string;
  avatarUrl?: string;
};

type DashboardSidebarShellProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  mobileProfile: DashboardSidebarMobileProfile;
};

/**
 * Responsive profile sidebar:
 * - &lt;768px: compact strip + expandable details panel
 * - 768px+: sticky column in CSS Grid (256px sidebar, 296px at 1012px+)
 *
 * github.com/torvalds at 1280px — Layout grid `296px 0px 872px`, 24px gap (see globals.css).
 */
export function DashboardSidebarShell({
  sidebar,
  children,
  mobileProfile,
}: DashboardSidebarShellProps) {
  return (
    <div className="dashboard-body flex w-full flex-col">
      <MobileProfileSidebar {...mobileProfile} sidebar={sidebar} />
      <div className="dashboard-layout grid w-full">
        <aside
          className="dashboard-sidebar hidden md:block"
          data-testid="dashboard-sidebar"
        >
          {sidebar}
        </aside>

        <div className="dashboard-main flex w-full flex-col gap-4 sm:gap-6 lg:gap-8">{children}</div>
      </div>
    </div>
  );
}

export function DashboardKeyboardShortcutsLayer({ username }: { username: string }) {
  const { helpOpen, closeHelp, announcement } = useKeyboardShortcuts({ username });

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <KeyboardShortcutsHelp open={helpOpen} onClose={closeHelp} />
    </>
  );
}
