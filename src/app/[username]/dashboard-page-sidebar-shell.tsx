import {
  DashboardSidebarShell,
  type DashboardSidebarMobileProfile,
} from "@/components/dashboard/DashboardLayout";
import { getDashboardProfile } from "@/lib/dashboard-fetch";

type DashboardPageSidebarShellProps = {
  username: string;
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardPageSidebarShellFallback({
  username,
  sidebar,
  children,
}: DashboardPageSidebarShellProps) {
  const mobileProfile: DashboardSidebarMobileProfile = {
    login: username,
    displayName: username,
  };

  return (
    <DashboardSidebarShell mobileProfile={mobileProfile} sidebar={sidebar}>
      {children}
    </DashboardSidebarShell>
  );
}

export async function DashboardPageSidebarShell({
  username,
  sidebar,
  children,
}: DashboardPageSidebarShellProps) {
  const { profile } = await getDashboardProfile(username);
  const login = profile?.login ?? username;
  const displayName = profile?.name ?? login;

  return (
    <DashboardSidebarShell
      mobileProfile={{
        login,
        displayName,
        avatarUrl: profile?.avatar_url,
      }}
      sidebar={sidebar}
    >
      {children}
    </DashboardSidebarShell>
  );
}
