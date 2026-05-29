type OgFontWeight = 400 | 600 | 700;

const INTER_WEIGHTS: OgFontWeight[] = [400, 600, 700];

const fontCache = new Map<OgFontWeight, ArrayBuffer>();

/**
 * Loads Inter from Google Fonts (CSS → woff) for @vercel/og / ImageResponse.
 * GitHub uses Inter for its UI typeface.
 */
export async function loadInterFont(weight: OgFontWeight): Promise<ArrayBuffer> {
  const cached = fontCache.get(weight);
  if (cached) {
    return cached;
  }

  // Legacy UA so Google Fonts CSS lists woff/ttf (not woff2 — unsupported by @vercel/og).
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)",
      },
    },
  ).then((response) => response.text());

  // @vercel/og supports woff/ttf — not woff2 (OpenType signature wOF2).
  const woff =
    css.match(/src: url\((.+?)\) format\('woff'\)/) ??
    css.match(/src: url\((.+?)\) format\('truetype'\)/) ??
    css.match(/src: url\((.+?)\) format\('opentype'\)/);

  if (!woff?.[1]) {
    throw new Error(`Failed to load Inter ${weight} (woff) from Google Fonts`);
  }

  const data = await fetch(woff[1]).then((response) => response.arrayBuffer());
  fontCache.set(weight, data);
  return data;
}

export async function loadInterFonts() {
  const buffers = await Promise.all(INTER_WEIGHTS.map((weight) => loadInterFont(weight)));

  return INTER_WEIGHTS.map((weight, index) => ({
    name: "Inter",
    data: buffers[index]!,
    weight,
    style: "normal" as const,
  }));
}
