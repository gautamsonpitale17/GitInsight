export const NAVIGATION_START_EVENT = "gitinsight:navigation-start";

/** Signal that a client-side route change has begun (e.g. before router.push). */
export function emitNavigationStart(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(NAVIGATION_START_EVENT));
}

export function onNavigationStart(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(NAVIGATION_START_EVENT, listener);
  return () => window.removeEventListener(NAVIGATION_START_EVENT, listener);
}

export function isSameOriginNavigation(anchor: HTMLAnchorElement): boolean {
  if (anchor.hasAttribute("download")) {
    return false;
  }

  const target = anchor.getAttribute("target");
  if (target && target !== "_self") {
    return false;
  }

  const href = anchor.getAttribute("href");
  if (!href) {
    return false;
  }

  if (href.startsWith("#")) {
    return false;
  }

  if (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  ) {
    return false;
  }

  if (href.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function getPathnameFromHref(href: string): string {
  if (href.startsWith("/")) {
    return href.split("?")[0] ?? href;
  }

  return new URL(href, window.location.href).pathname;
}
