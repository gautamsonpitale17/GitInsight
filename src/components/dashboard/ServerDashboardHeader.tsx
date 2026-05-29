"use client";

import { GitHubAvatar } from "@/components/ui/GitHubAvatar";
import { getGithubAvatarUrl } from "@/lib/avatar";

type ServerDashboardHeaderProps = {
  username: string;
};

export function ServerDashboardHeader({ username }: ServerDashboardHeaderProps) {
  const login = username.trim();
  const avatarUrl = getGithubAvatarUrl(login, 64);

  return (
    <header className="hidden min-w-0 flex-1 border-0 pb-0 md:block">
      <div className="flex min-w-0 items-center gap-4">
        <GitHubAvatar
          login={login}
          src={avatarUrl}
          size={32}
          sizes="32px"
          loading="lazy"
          className="h-8 w-8 shrink-0"
        />
        <p className="truncate text-base font-semibold text-gh-gray-7">@{login}</p>
      </div>
    </header>
  );
}
