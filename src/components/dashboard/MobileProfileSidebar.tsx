"use client";

import { useId } from "react";
import { Card } from "@/components/ui/Card";
import { GitHubAvatar } from "@/components/ui/GitHubAvatar";
import { useSidebarToggle } from "@/hooks/useSidebarToggle";
import { getGithubAvatarUrl, PROFILE_COMPACT_AVATAR_SIZES } from "@/lib/avatar";
import { PROFILE_SIDEBAR_COMPACT_AVATAR_PX } from "@/components/dashboard/profile-sidebar-ui";
import { ghBtnSubtle } from "@/lib/interactive-classes";
import { cn } from "@/lib/utils";

export type MobileProfileSidebarProps = {
  login: string;
  displayName: string;
  avatarUrl?: string;
  sidebar: React.ReactNode;
};

export function MobileProfileSidebar({
  login,
  displayName,
  avatarUrl,
  sidebar,
}: MobileProfileSidebarProps) {
  const { open, toggle } = useSidebarToggle();
  const panelId = useId();
  const resolvedAvatarUrl =
    avatarUrl ?? getGithubAvatarUrl(login, PROFILE_SIDEBAR_COMPACT_AVATAR_PX);

  return (
    <div className="profile-sidebar-mobile no-print mb-4 md:hidden">
      <Card className="profile-sidebar-mobile-strip" padding="sm">
        <GitHubAvatar
          login={login}
          src={resolvedAvatarUrl}
          size={PROFILE_SIDEBAR_COMPACT_AVATAR_PX}
          sizes={PROFILE_COMPACT_AVATAR_SIZES}
          priority
          className="profile-sidebar-mobile-avatar"
        />

        <div className="profile-sidebar-mobile-identity min-w-0">
          <p className="profile-sidebar-mobile-name truncate">{displayName}</p>
          <p className="profile-sidebar-mobile-username truncate">@{login}</p>
        </div>

        <button
          type="button"
          className={`${ghBtnSubtle} profile-sidebar-mobile-toggle tap-target-mobile shrink-0`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          Details {open ? "\u25B4" : "\u25BE"}
        </button>
      </Card>

      <div
        id={panelId}
        className={cn("profile-sidebar-mobile-panel", open && "is-open")}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="profile-sidebar-mobile-panel-inner">{sidebar}</div>
      </div>
    </div>
  );
}
