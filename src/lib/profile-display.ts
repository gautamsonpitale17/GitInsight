import type { UserProfile } from "@/types/github";

export type ProfileSocialLink = {
  href: string;
  label: string;
};

const URL_IN_TEXT =
  /https?:\/\/[^\s<>"']+|(?:www\.)[^\s<>"']+|linkedin\.com\/in\/[^\s<>"']+|leetcode\.com\/[^\s<>"']+/gi;

/** "1 follower" / "2 followers" — matches github.com copy. */
export function formatSocialCount(
  count: number,
  singular: string,
  plural: string,
): string {
  const word = count === 1 ? singular : plural;
  return `${count.toLocaleString()} ${word}`;
}

function normalizeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^linkedin\.com/i.test(trimmed) || /^in\/[\w-]+/i.test(trimmed)) {
    const path = trimmed.replace(/^in\//i, "");
    return path.includes("linkedin.com")
      ? `https://${trimmed.replace(/^\/+/, "")}`
      : `https://www.linkedin.com/in/${path}`;
  }

  if (/^leetcode\.com/i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }

  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/** Display label for a profile URL (github.com-style). */
export function formatProfileLinkLabel(href: string): string {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
      const inMatch = url.pathname.match(/\/in\/([^/]+)/i);
      if (inMatch) {
        return `in/${inMatch[1]}`;
      }
    }

    if (host === "x.com" || host === "twitter.com") {
      const handle = url.pathname.replace(/^\//, "").split("/")[0];
      return handle ? handle : href;
    }

    const path = `${url.pathname}${url.search}`.replace(/\/$/, "");
    if (path && path !== "/") {
      return `${host}${path}`;
    }

    return host;
  } catch {
    return href.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

function linkLabelFromSource(raw: string, href: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return formatProfileLinkLabel(href);
}

function pushUniqueLink(
  links: ProfileSocialLink[],
  raw: string,
  seen: Set<string>,
) {
  const normalized = normalizeHref(raw);
  if (!normalized) {
    return;
  }

  const key = normalized.toLowerCase().replace(/\/$/, "");
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  links.push({
    href: normalized,
    label: linkLabelFromSource(raw, normalized),
  });
}

function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_IN_TEXT);
  return matches ?? [];
}

/** Build ordered social / website links from REST profile fields. */
export function buildProfileLinksFromUser(profile: UserProfile): ProfileSocialLink[] {
  const links: ProfileSocialLink[] = [];
  const seen = new Set<string>();

  const blog = profile.blog?.trim();
  if (blog) {
    for (const token of blog.split(/[\s,]+/).filter(Boolean)) {
      pushUniqueLink(links, token, seen);
    }
    for (const url of extractUrlsFromText(blog)) {
      pushUniqueLink(links, url, seen);
    }
  }

  if (profile.bio) {
    for (const url of extractUrlsFromText(profile.bio)) {
      pushUniqueLink(links, url, seen);
    }
  }

  if (profile.twitter_username?.trim()) {
    const handle = profile.twitter_username.trim().replace(/^@/, "");
    pushUniqueLink(links, `https://x.com/${encodeURIComponent(handle)}`, seen);
  }

  return links;
}

export function mergeProfileLinks(
  primary: ProfileSocialLink[],
  extra: ProfileSocialLink[],
): ProfileSocialLink[] {
  const seen = new Set(primary.map((link) => link.href.toLowerCase().replace(/\/$/, "")));
  const merged = [...primary];

  for (const link of extra) {
    const key = link.href.toLowerCase().replace(/\/$/, "");
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(link);
    }
  }

  return merged;
}
