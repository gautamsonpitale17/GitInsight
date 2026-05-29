import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
} from "@/lib/theme-constants";

/** Inline script applied in <head> before paint to avoid theme flash. */
const THEME_INIT_SCRIPT = `
(function () {
  var storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  var defaultTheme = ${JSON.stringify(DEFAULT_THEME)};
  var themes = ["light", "dark"];
  var root = document.documentElement;
  try {
    var stored = localStorage.getItem(storageKey) || defaultTheme;
    var resolved = stored;
    if (stored === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    root.classList.remove.apply(root.classList, themes);
    if (resolved) {
      root.classList.add(resolved);
    }
    if (resolved === "light" || resolved === "dark") {
      root.style.colorScheme = resolved;
    }
  } catch (e) {}
})();`.trim();

/**
 * Blocking theme script for the document head. Kept in the server layout so
 * React 19 does not warn about client-rendered script tags inside providers.
 */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
      suppressHydrationWarning
    />
  );
}
