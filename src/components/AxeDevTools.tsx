"use client";

import { useEffect } from "react";

function logAxeViolations(
  violations: import("axe-core").AxeResults["violations"],
) {
  if (violations.length === 0) {
    return;
  }

  console.group("New axe issues");
  for (const violation of violations) {
    console.log(
      `${violation.impact}: ${violation.help} ${violation.helpUrl}`,
    );
  }
  console.groupEnd();
}

/**
 * Runs axe-core accessibility checks in the browser during local development.
 * Uses axe-core directly (not @axe-core/react) for React 19 compatibility.
 */
export function AxeDevTools() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    let cancelled = false;

    void import("axe-core").then((axeModule) => {
      if (cancelled) {
        return;
      }

      const axe = axeModule.default;
      void axe
        .run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          },
        })
        .then((results) => {
          if (!cancelled) {
            logAxeViolations(results.violations);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
