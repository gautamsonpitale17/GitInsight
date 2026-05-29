"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { PROFILE_TABS, profileTabHref, type ProfileTabId } from "@/lib/profile-tabs";
import { cn } from "@/lib/utils";

type ProfileTabNavProps = {
  username: string;
  activeTab: ProfileTabId;
};

export function ProfileTabNav({ username, activeTab }: ProfileTabNavProps) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeTab]);

  return (
    <nav
      className="profile-tab-nav no-print"
      aria-label="Profile sections"
      data-testid="profile-tab-nav"
    >
      <div className="profile-tab-nav-inner" role="tablist">
        {PROFILE_TABS.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <Link
              key={tab.id}
              ref={isActive ? activeRef : undefined}
              href={profileTabHref(username, tab.id)}
              role="tab"
              aria-selected={isActive}
              className={cn("profile-tab-nav-item", isActive && "profile-tab-nav-item-active")}
              data-testid={`profile-tab-${tab.id}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
