/** Canonical app origin for absolute URLs (OG images, API callbacks). */
export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

/** Public marketing host shown on generated OG images. */
export const OG_EXPLORE_HOST = "gitinsight.vercel.app";
