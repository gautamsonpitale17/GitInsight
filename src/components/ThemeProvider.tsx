"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme-constants";

const THEME_CLASSES = ["light", "dark"] as const;
type ResolvedTheme = (typeof THEME_CLASSES)[number];
type ThemeSetting = ResolvedTheme | "system";

type ThemeContextValue = {
  theme?: string;
  setTheme: (theme: string) => void;
  resolvedTheme?: ResolvedTheme;
  themes: string[];
};

const ThemeContext = createContext<ThemeContextValue>({
  setTheme: () => {},
  themes: [...THEME_CLASSES, "system"],
});

const themeListeners = new Set<() => void>();

function notifyThemeListeners() {
  for (const listener of themeListeners) {
    listener();
  }
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

function readStoredTheme(): ThemeSetting {
  if (typeof window === "undefined") {
    return DEFAULT_THEME as ThemeSetting;
  }
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore
  }
  return DEFAULT_THEME as ThemeSetting;
}

function resolveTheme(theme: ThemeSetting): ResolvedTheme {
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  if (typeof window === "undefined") {
    return DEFAULT_THEME as ResolvedTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemeSetting) {
  if (typeof window === "undefined") {
    return;
  }
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.remove(...THEME_CLASSES);
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

function subscribeTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => onStoreChange();

  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onSystemChange);
  themeListeners.add(onStoreChange);

  return () => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onSystemChange);
    themeListeners.delete(onStoreChange);
  };
}

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: ThemeSetting;
  enableSystem?: boolean;
};

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME as ThemeSetting,
  enableSystem = true,
}: ThemeProviderProps) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readStoredTheme,
    () => defaultTheme,
  );

  const effectiveTheme: ThemeSetting = enableSystem
    ? theme
    : theme === "system"
      ? defaultTheme
      : theme;

  const resolvedTheme = useMemo(
    () => resolveTheme(effectiveTheme),
    [effectiveTheme],
  );

  useLayoutEffect(() => {
    applyTheme(effectiveTheme);
  }, [effectiveTheme]);

  const setTheme = useCallback(
    (next: string) => {
      const value = (
        next === "light" || next === "dark" || (enableSystem && next === "system")
          ? next
          : defaultTheme
      ) as ThemeSetting;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, value);
      } catch {
        // ignore
      }
      applyTheme(value);
      notifyThemeListeners();
    },
    [defaultTheme, enableSystem],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: effectiveTheme,
      setTheme,
      resolvedTheme,
      themes: enableSystem
        ? [...THEME_CLASSES, "system"]
        : [...THEME_CLASSES],
    }),
    [effectiveTheme, enableSystem, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
