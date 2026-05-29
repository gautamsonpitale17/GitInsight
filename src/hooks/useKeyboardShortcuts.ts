"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  DASHBOARD_USER_SEARCH_ID,
  exportDashboardData,
  refreshDashboardData,
} from "@/lib/dashboard-actions";

const GH_SEQUENCE_MS = 500;

type UseKeyboardShortcutsOptions = {
  username: string;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  return target.isContentEditable;
}

function hasModifierKey(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.altKey || event.metaKey;
}

export function useKeyboardShortcuts({ username }: UseKeyboardShortcutsOptions) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { success: showSuccess, error: showError } = useToast();
  const [helpOpen, setHelpOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const gPressedAtRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);
  const isExportingRef = useRef(false);

  const announce = useCallback((message: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(message));
  }, []);

  const focusSearch = useCallback(() => {
    const input = document.getElementById(DASHBOARD_USER_SEARCH_ID);
    if (!(input instanceof HTMLInputElement)) {
      announce("Username search is not available");
      return;
    }
    input.focus();
    input.select();
    announce("Focused username search");
  }, [announce]);

  const goHome = useCallback(() => {
    announce("Navigating to homepage");
    router.push("/");
  }, [announce, router]);

  const refreshDashboard = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    announce("Refreshing dashboard");

    try {
      const result = await refreshDashboardData(username);
      if (!result.ok) {
        showError(result.error);
        announce(result.error);
        return;
      }

      showSuccess("Data refreshed");
      announce("Dashboard refreshed");
      router.refresh();
    } catch {
      showError("Could not refresh data");
      announce("Could not refresh data");
    } finally {
      isRefreshingRef.current = false;
    }
  }, [announce, router, showError, showSuccess, username]);

  const exportDashboard = useCallback(async () => {
    if (isExportingRef.current) {
      return;
    }

    isExportingRef.current = true;
    announce("Exporting dashboard data");

    try {
      const result = await exportDashboardData(username);
      if (!result.ok) {
        showError(result.error);
        announce(result.error);
        return;
      }

      showSuccess("Export downloaded");
      announce("Export downloaded");
    } catch {
      showError("Export failed");
      announce("Export failed");
    } finally {
      isExportingRef.current = false;
    }
  }, [announce, showError, showSuccess, username]);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    announce(`Switched to ${next} mode`);
  }, [announce, resolvedTheme, setTheme]);

  const toggleHelp = useCallback(() => {
    setHelpOpen((open) => {
      const next = !open;
      announce(next ? "Keyboard shortcuts help opened" : "Keyboard shortcuts help closed");
      return next;
    });
  }, [announce]);

  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    announce("Keyboard shortcuts help closed");
  }, [announce]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        if (helpOpen) {
          event.preventDefault();
          closeHelp();
        }
        return;
      }

      if (hasModifierKey(event)) {
        return;
      }

      const now = Date.now();
      const gPending =
        gPressedAtRef.current !== null && now - gPressedAtRef.current < GH_SEQUENCE_MS;

      if (gPending && event.key === "h") {
        event.preventDefault();
        gPressedAtRef.current = null;
        goHome();
        return;
      }

      if (gPending) {
        gPressedAtRef.current = null;
      }

      if (event.key === "g") {
        gPressedAtRef.current = now;
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        toggleHelp();
        return;
      }

      if (helpOpen) {
        return;
      }

      switch (event.key) {
        case "/":
          event.preventDefault();
          focusSearch();
          break;
        case "r":
          event.preventDefault();
          void refreshDashboard();
          break;
        case "d":
          event.preventDefault();
          toggleTheme();
          break;
        case "e":
          event.preventDefault();
          void exportDashboard();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeHelp,
    exportDashboard,
    focusSearch,
    goHome,
    helpOpen,
    refreshDashboard,
    toggleHelp,
    toggleTheme,
  ]);

  return {
    helpOpen,
    closeHelp,
    announcement,
  };
}
