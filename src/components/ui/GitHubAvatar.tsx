"use client";

import Image from "next/image";
import { useState } from "react";
import {
  avatarAlt,
  getAvatarBlurUrl,
  getAvatarInitials,
  getGithubAvatarUrl,
} from "@/lib/avatar";
import { cn } from "@/lib/utils";

type GitHubAvatarProps = {
  login: string;
  src?: string;
  size: number;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  className?: string;
};

export function GitHubAvatar({
  login,
  src,
  size,
  sizes,
  priority = false,
  loading,
  className,
}: GitHubAvatarProps) {
  const [failed, setFailed] = useState(false);
  const resolvedLogin = login.trim() || "user";
  const avatarUrl = src ?? getGithubAvatarUrl(resolvedLogin, size);
  const initials = getAvatarInitials(resolvedLogin);

  if (failed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-gh-gray-1 font-semibold text-gh-gray-6",
          !className?.includes("profile-sidebar-") && "border border-gh-gray-2",
          className?.includes("profile-sidebar-") &&
            "border border-[var(--color-border-default)]",
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.35)) }}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  const useBlurPlaceholder = size >= 40;

  return (
    <Image
      src={avatarUrl}
      alt={avatarAlt(resolvedLogin)}
      width={size}
      height={size}
      sizes={sizes ?? `${size}px`}
      priority={priority}
      loading={loading}
      unoptimized
      {...(useBlurPlaceholder
        ? { placeholder: "blur" as const, blurDataURL: getAvatarBlurUrl(avatarUrl) }
        : {})}
      onError={() => setFailed(true)}
      className={cn(
        "rounded-full object-cover",
        !className?.includes("profile-sidebar-") && "border border-gh-gray-2",
        className,
      )}
    />
  );
}
