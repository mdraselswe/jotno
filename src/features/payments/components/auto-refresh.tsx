"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the page every `seconds` while it is visible (e.g. a payment being checked). */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
