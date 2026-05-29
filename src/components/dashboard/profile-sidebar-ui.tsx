import Building2 from "lucide-react/dist/esm/icons/building-2.mjs";
import MapPin from "lucide-react/dist/esm/icons/map-pin.mjs";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.mjs";
import { GitHubAvatar } from "@/components/ui/GitHubAvatar";
import {
  getGithubAvatarUrl,
  PROFILE_COMPACT_AVATAR_SIZES,
  PROFILE_SIDEBAR_AVATAR_SIZES,
} from "@/lib/avatar";
import {
  buildProfileLinksFromUser,
  formatSocialCount,
  mergeProfileLinks,
  type ProfileSocialLink,
} from "@/lib/profile-display";
import { ghBtnSecondary, ghLink } from "@/lib/interactive-classes";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/github";

export const PROFILE_SIDEBAR_COMPACT_AVATAR_PX = 48;

/** github.com profile — hr spacing 16px vertical (`.profile-sidebar-divider`). */
export function ProfileSidebarDivider() {
  return <hr className="profile-sidebar-divider" />;
}

function ProfileMetaItem({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  if (!children) return null;

  return (
    <li className="profile-sidebar-meta-item">
      <Icon className="profile-sidebar-meta-icon" aria-hidden />
      <span className="profile-sidebar-meta-text min-w-0 break-words">{children}</span>
    </li>
  );
}

type ProfileSidebarAvatarProps = {
  login: string;
  avatarUrl?: string;
};

export function ProfileSidebarAvatar({ login, avatarUrl }: ProfileSidebarAvatarProps) {
  const src = avatarUrl ?? getGithubAvatarUrl(login, 296);

  return (
    <GitHubAvatar
      login={login}
      src={src}
      size={296}
      sizes={PROFILE_SIDEBAR_AVATAR_SIZES}
      priority
      className="profile-sidebar-avatar"
    />
  );
}

export function ProfileSidebarCompactAvatar({ login, avatarUrl }: ProfileSidebarAvatarProps) {
  const src = avatarUrl ?? getGithubAvatarUrl(login, PROFILE_SIDEBAR_COMPACT_AVATAR_PX);

  return (
    <GitHubAvatar
      login={login}
      src={src}
      size={PROFILE_SIDEBAR_COMPACT_AVATAR_PX}
      sizes={PROFILE_COMPACT_AVATAR_SIZES}
      priority
      className="profile-sidebar-compact-avatar"
    />
  );
}

type ProfileSidebarDetailsProps = {
  username: string;
  profile: UserProfile | null;
  socialLinks?: ProfileSocialLink[];
};

export function ProfileSidebarDetails({
  username,
  profile,
  socialLinks = [],
}: ProfileSidebarDetailsProps) {
  const login = profile?.login ?? username;
  const displayName = profile?.name ?? login;
  const githubUrl = `https://github.com/${encodeURIComponent(login)}`;
  const links = profile
    ? mergeProfileLinks(buildProfileLinksFromUser(profile), socialLinks)
    : socialLinks;

  return (
    <div className="profile-sidebar-details">
      {/* github.com .vcard-names — full name + login (no @) */}
      <div className="profile-sidebar-identity">
        <h1 className="profile-sidebar-name">{displayName}</h1>
        <p className="profile-sidebar-username">{login}</p>
      </div>

      {profile?.bio ? (
        <p className="profile-sidebar-bio">{profile.bio}</p>
      ) : null}

      {profile ? (
        <p className="profile-sidebar-follow-stats">
          <a
            href={`${githubUrl}?tab=followers`}
            target="_blank"
            rel="noopener noreferrer"
            className={ghLink}
          >
            {formatSocialCount(profile.followers, "follower", "followers")}
          </a>
          <span className="profile-sidebar-follow-separator" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <a
            href={`${githubUrl}?tab=following`}
            target="_blank"
            rel="noopener noreferrer"
            className={ghLink}
          >
            {formatSocialCount(profile.following, "following", "following")}
          </a>
        </p>
      ) : null}

      {links.length > 0 ? (
        <ul className="profile-sidebar-link-list">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(ghLink, "profile-sidebar-link")}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {profile?.location || profile?.company ? (
        <ul className="profile-sidebar-meta-list">
          <ProfileMetaItem icon={MapPin}>{profile.location}</ProfileMetaItem>
          <ProfileMetaItem icon={Building2}>{profile.company}</ProfileMetaItem>
        </ul>
      ) : null}

      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(ghBtnSecondary, "profile-sidebar-github-btn no-print")}
      >
        View on GitHub
        <ExternalLink className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
      </a>
    </div>
  );
}

export function ProfileSidebarPanel({ children }: { children: React.ReactNode }) {
  return <div className="profile-sidebar-panel">{children}</div>;
}
