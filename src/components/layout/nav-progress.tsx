"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useEffectEvent, useState } from "react";

/**
 * A thin bar along the top of the screen from the moment an in-app link is
 * tapped until the next page is there, so a tap on a slow connection never
 * looks ignored. Only links the router handles (it prevents the default);
 * a full page load has the browser's own indicator.
 */
export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}

/** Never spin forever: a navigation that hasn't arrived by then hides the bar. */
const GIVE_UP_MS = 15_000;

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = `${pathname}?${search}`;
  // The address the tap left from; the bar runs until the address changes.
  const [from, setFrom] = useState<string | null>(null);

  const onClick = useEffectEvent((e: MouseEvent) => {
    if (!e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    setFrom(here);
  });

  useEffect(() => {
    const listener = (e: MouseEvent) => onClick(e);
    document.addEventListener("click", listener);
    return () => document.removeEventListener("click", listener);
  }, []);

  useEffect(() => {
    if (from === null) return;
    const id = window.setTimeout(() => setFrom(null), GIVE_UP_MS);
    return () => window.clearTimeout(id);
  }, [from]);

  if (from === null) return null;
  const done = from !== here;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 print:hidden">
      <div
        key={from}
        data-done={done || undefined}
        onAnimationEnd={() => {
          if (done) setFrom(null);
        }}
        className="h-full origin-left nav-progress rounded-e-full bg-primary"
      />
    </div>
  );
}
