"use client";

import { useEffect } from "react";
import { reportClientIssue, SLOW_LOAD_MS } from "@/lib/client-issue";

/**
 * Tells the server log (src/lib/client-issue.ts) when this page's own files
 * took very long to arrive, with the protocol they came over. That covers a
 * first visit too, before the service worker can retry anything. Renders
 * nothing; one report per page load at most.
 */
export function LoadWatch() {
  useEffect(() => {
    const check = () => {
      const slow = performance
        .getEntriesByType("resource")
        .filter(
          (e): e is PerformanceResourceTiming =>
            e instanceof PerformanceResourceTiming &&
            e.name.startsWith(location.origin) &&
            e.duration >= SLOW_LOAD_MS,
        )
        .sort((a, b) => b.duration - a.duration);
      const worst = slow[0];
      if (!worst) return;
      reportClientIssue({
        kind: "slow-load",
        path: location.pathname,
        ms: Math.round(worst.duration),
        proto: worst.nextHopProtocol || undefined,
        detail: `${slow.length} slow; worst ${new URL(worst.name).pathname}`,
      });
    };
    // Look once the page has finished loading (and a little after, for late files).
    const later = () => window.setTimeout(check, 2000);
    let timer = 0;
    if (document.readyState === "complete") timer = later();
    else
      window.addEventListener(
        "load",
        () => {
          timer = later();
        },
        { once: true },
      );
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
