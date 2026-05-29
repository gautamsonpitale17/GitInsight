import {
  MobileProfileSidebarStripSkeleton,
  DashboardToolbarSkeleton,
  MainSkeletonContent,
  SidebarSkeleton,
} from "@/components/dashboard/skeletons";

function MainSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
      <DashboardToolbarSkeleton />
      <MainSkeletonContent />
    </div>
  );
}

export default function UsernameDashboardLoading() {
  return (
    <div
      className="app-page-scroll app-dashboard-shell gh-dashboard-container flex w-full flex-col gap-6 pb-8 lg:gap-6"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="dashboard-body flex w-full flex-col">
      <MobileProfileSidebarStripSkeleton />

      <div className="dashboard-layout grid w-full">
        <SidebarSkeleton />
        <div className="dashboard-main">
          <MainSkeleton />
        </div>
      </div>
      </div>
    </div>
  );
}
