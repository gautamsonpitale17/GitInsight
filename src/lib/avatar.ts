/** Responsive `sizes` for primary GitHub profile avatars (48px mobile, 64px desktop). */
export const GITHUB_AVATAR_SIZES = "(max-width: 640px) 48px, 64px";

/** Responsive `sizes` for dashboard profile sidebar (github.com Layout-sidebar widths). */
export const PROFILE_SIDEBAR_AVATAR_SIZES =
  "(min-width: 1012px) 296px, (min-width: 768px) 256px, 220px";

/** Responsive `sizes` for compact mobile profile bar avatars. */
export const PROFILE_COMPACT_AVATAR_SIZES = "56px";

/** Accessible alt text for GitHub profile avatars. */
export function avatarAlt(login: string): string {
  return `${login}'s avatar`;
}

/** One or two initials for avatar fallback circles. */
export function getAvatarInitials(login: string): string {
  const trimmed = login.trim();
  if (!trimmed) {
    return "?";
  }

  const parts = trimmed.replace(/[-_]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}

/** GitHub avatar URL compatible with Next.js Image optimization. */
export function getGithubAvatarUrl(login: string, size = 64): string {
  return `https://avatars.githubusercontent.com/${encodeURIComponent(login)}?s=${size}`;
}

const BLUR_HUE_STEP = 10;

/** Precomputed 4×4 PNG blur placeholders keyed by hue bucket (0–35). */
const AVATAR_BLUR_BY_HUE_BUCKET = [
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPY7OsLRwzEcQAj0hTRreDwRAAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPYHOcLRwzEcQA/chXhHwI4PQAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPYnOcLRwzEcQBZchbhSqWswQAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPY3OALRwzEcQB2shgBBIrobAAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGPYPNEXjhiI4wAAklIZESMeF3UAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGPYvMgXjhiI4wAArfIaIW4BM/cAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGPYvNkXjhiI4wAAyZIbMQGDGDUAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGNYtNkXjhiI4wAArOIaIYRWav4AAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGOYuNkXjhiI4wAAkDIZEeam2lAAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGNo2OwLRwzEcQBzghgBuTCcTgAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPI2+wLRwzEcQBVIhbhvxJCKAAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGOI2+wLRwzEcQA6IhXhSvdnFQAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPw3ewLRwzEcQAdchTRK6bVxgAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPw3RwLRwzEcQA2chXRzE2r1AAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPw3ZwPRwzEcQBSkhbxv6L9zgAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPw3dwARwzEcQBtIhgB1sl22QAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGPw3TwRjhiI4wAAh7IZEV6G6B8AAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGPw3bwIjhiI4wAAokIaIcQmMgIAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGPw3bwZjhiI4wAAvNIbMeInkHAAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGPwXbQZjhiI4wAAoTIaIUt8vV4AAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGPwnbgZjhiI4wAAhZIZEahNQgUAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPwbdgMRwzEcQBp8hgBCikeVgAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPwzd8MRwzEcQBOUhbxnEequAAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPwjd0MRwzEcQAxEhXRp83qiAAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPw9d0MRwzEcQAXEhTRGcncIQAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGOI890MRwzEcQAzwhXhixjanAAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPI890MRwzEcQBOwhbhhO1gtQAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGNo8N0MRwzEcQBtIhgBxYvDIQAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGOY6LsZjhiI4wAAidIZEf3A/AUAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGNY5LsZjhiI4wAApoIaITypr1oAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGPY7LsZjhiI4wAAwzIbMSjTS9EAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEUlEQVR4nGPY7LsIjhiI4wAAqKIaIVIzuQ0AAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPY7DsRjhiI4wAAjhIZEaq8QT4AAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPY7NsARwzEcQBzghgB8L38ZQAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPY7JsHRwzEcQBXYhbhfBLZzAAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGPY7BsHRwzEcQA+YhXhZvAHGQAAAABJRU5ErkJggg==",
] as const;

function hashAvatarUrl(avatarUrl: string): number {
  let hash = 0;
  for (let i = 0; i < avatarUrl.length; i++) {
    hash = (hash << 5) - hash + avatarUrl.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function avatarHueFromUrl(avatarUrl: string): number {
  return hashAvatarUrl(avatarUrl) % 360;
}

/**
 * Returns a tiny 4×4 PNG blur placeholder derived from the avatar URL hue.
 * Safe for both server and client components.
 */
export function getAvatarBlurUrl(avatarUrl: string): string {
  const hue = avatarHueFromUrl(avatarUrl);
  const bucket = Math.floor(hue / BLUR_HUE_STEP) % AVATAR_BLUR_BY_HUE_BUCKET.length;
  return AVATAR_BLUR_BY_HUE_BUCKET[bucket]!;
}
