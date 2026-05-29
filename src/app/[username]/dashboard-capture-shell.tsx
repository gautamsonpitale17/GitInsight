"use client";

import {
  DashboardKeyboardShortcutsLayer,
} from "@/components/dashboard/DashboardLayout";
import { DashboardUserSearch } from "@/components/dashboard/DashboardUserSearch";
import { ServerDashboardHeader } from "@/components/dashboard/ServerDashboardHeader";
import { RateLimitToastEffect } from "@/components/dashboard/RateLimitToastEffect";

type DashboardCaptureShellProps = {
  username: string;
  children: React.ReactNode;
};

export function DashboardCaptureShell({
  username,
  children,
}: DashboardCaptureShellProps) {
  const login = username.trim();

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6 lg:gap-8">
      <DashboardKeyboardShortcutsLayer username={login} />
      <RateLimitToastEffect username={login} />
      <div className="dashboard-toolbar no-print">
        <ServerDashboardHeader username={login} />
        <DashboardUserSearch currentUsername={login} className="w-full md:max-w-sm" />
      </div>

      <div
        id="dashboard-capture-root"
        className="dashboard-capture-root flex min-w-0 flex-col gap-4 sm:gap-6 lg:gap-8"
      >
        {children}
      </div>
    </div>
  );
}
