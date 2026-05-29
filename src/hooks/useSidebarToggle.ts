"use client";

import { useCallback, useEffect, useState } from "react";

export const SIDEBAR_DETAILS_SESSION_KEY = "gitinsight:dashboard-sidebar-details";

function readStoredOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return sessionStorage.getItem(SIDEBAR_DETAILS_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredOpen(open: boolean): void {
  try {
    sessionStorage.setItem(SIDEBAR_DETAILS_SESSION_KEY, open ? "true" : "false");
  } catch {
    // sessionStorage unavailable
  }
}

/**
 * Persists mobile profile "Details" panel open state in sessionStorage for the tab session.
 */
export function useSidebarToggle() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOpen(readStoredOpen());
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setOpen((previous) => {
      const next = !previous;
      writeStoredOpen(next);
      return next;
    });
  }, []);

  const setOpenPersisted = useCallback((next: boolean) => {
    setOpen(next);
    writeStoredOpen(next);
  }, []);

  return {
    open: hydrated ? open : false,
    toggle,
    setOpen: setOpenPersisted,
    hydrated,
  };
}
