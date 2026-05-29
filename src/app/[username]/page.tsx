import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileDetailsSkeleton } from "@/components/dashboard/skeletons";
import { SmartErrorBoundary } from "@/components/ui/SmartErrorBoundary";
import { getOgImageUrl } from "@/lib/og-image-url";
import { DashboardCaptureShell } from "./dashboard-capture-shell";
import {
  DashboardPageSidebarShell,
  DashboardPageSidebarShellFallback,
} from "./dashboard-page-sidebar-shell";
import {
  ProfileSidebarAvatar,
  ProfileSidebarPanel,
} from "@/components/dashboard/profile-sidebar-ui";
import { ProfileTabNav } from "@/components/dashboard/ProfileTabNav";
import { parseProfileTab } from "@/lib/profile-tabs";
import { ProfileSidebarContent } from "./sections/profile-sidebar";
import { ProfileDashboard } from "./profile-dashboard";

/**
 * CDN Cache-Control target: `s-maxage=300, stale-while-revalidate=3600`.
 * `revalidate` sets `s-maxage=300`; platform ISR adds `stale-while-revalidate`.
 */
export const revalidate = 300;

type UsernamePageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: UsernamePageProps): Promise<Metadata> {
  const { username } = await params;
  const title = `${username} | GitInsight`;
  const description = `GitHub activity dashboard for ${username}`;
  const ogImageUrl = getOgImageUrl(username);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${username} GitInsight dashboard preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function UsernameDashboardPage({ params, searchParams }: UsernamePageProps) {
  const { username } = await params;
  const tab = parseProfileTab((await searchParams).tab);

  const sidebar = (
    <>
      <ProfileSidebarPanel>
        <ProfileSidebarAvatar login={username} />
        <SmartErrorBoundary sectionName="Profile">
          <Suspense fallback={<ProfileDetailsSkeleton />}>
            <ProfileSidebarContent username={username} />
          </Suspense>
        </SmartErrorBoundary>
      </ProfileSidebarPanel>
    </>
  );

  const main = (
    <DashboardCaptureShell username={username}>
      <div className="flex min-w-0 flex-col gap-6">
        <ProfileTabNav username={username} activeTab={tab} />
        <ProfileDashboard username={username} tab={tab} />
      </div>
    </DashboardCaptureShell>
  );

  // github.com profile page rhythm — 24px vertical gaps at lg (gap-6); full-width layout
  return (
    <div className="app-page-scroll app-dashboard-shell gh-dashboard-container flex w-full flex-col gap-4 pb-6 sm:gap-6 sm:pb-8">
      <div className="w-full">
        <Suspense
          fallback={
            <DashboardPageSidebarShellFallback username={username} sidebar={sidebar}>
              {main}
            </DashboardPageSidebarShellFallback>
          }
        >
          <DashboardPageSidebarShell username={username} sidebar={sidebar}>
            {main}
          </DashboardPageSidebarShell>
        </Suspense>
      </div>
    </div>
  );
}
