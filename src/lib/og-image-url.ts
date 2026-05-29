import { getAppBaseUrl } from "@/lib/app-url";

/** Absolute URL for the dynamic OG image route. */
export function getOgImageUrl(username: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/og/${encodeURIComponent(username.trim())}`;
}
