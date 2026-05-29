import { notFound } from "next/navigation";
import {
  ProfileSidebarDetails,
  ProfileSidebarDivider,
} from "@/components/dashboard/profile-sidebar-ui";
import { ProfileCompletenessSection } from "@/components/dashboard/ProfileCompletenessSection";
import { profileCompletenessScore } from "@/lib/analytics";
import { getDashboardProfile } from "@/lib/dashboard-fetch";
import { fetchProfileSocialAccounts } from "@/lib/profile-social";
import {
  createRateLimitError,
  RATE_LIMIT_MESSAGE,
  USER_NOT_FOUND_MESSAGE,
} from "@/lib/dashboard-errors";

type ProfileSidebarProps = {
  username: string;
};

type ProfileCompletenessBlockProps = ProfileSidebarProps & {
  /** Renders a sidebar divider before the completeness card. */
  dividerBefore?: boolean;
};

export async function ProfileSidebarContent({ username }: ProfileSidebarProps) {
  const { profile, error, resetAt } = await getDashboardProfile(username);

  if (!profile) {
    if (error === USER_NOT_FOUND_MESSAGE) {
      notFound();
    }

    if (error === RATE_LIMIT_MESSAGE && process.env.NODE_ENV === "production") {
      throw createRateLimitError(resetAt ?? new Date().toISOString());
    }
  }

  const socialLinks = profile
    ? await fetchProfileSocialAccounts(profile.login)
    : [];

  return (
    <ProfileSidebarDetails
      username={username}
      profile={profile}
      socialLinks={socialLinks}
    />
  );
}

export async function ProfileCompletenessBlock({
  username,
  dividerBefore = false,
}: ProfileCompletenessBlockProps) {
  const { profile } = await getDashboardProfile(username);
  if (!profile) {
    return null;
  }

  return (
    <>
      {dividerBefore ? <ProfileSidebarDivider /> : null}
      <ProfileCompletenessSection result={profileCompletenessScore(profile)} />
    </>
  );
}
