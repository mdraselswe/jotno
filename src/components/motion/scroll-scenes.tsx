"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * App-wide scroll scenes (GSAP ScrollTrigger), mounted once in the layout.
 * Inside <main> sections and the footer:
 *   - section headings wipe up,
 *   - cards (.glow-border, [data-animate]) rise in batches with a slight tilt,
 *   - photos unmask and rise (no scale: a hidden, scaled photo would widen the page).
 * Every scene plays both ways: in from below while scrolling down, away
 * upwards as it leaves the top, back in from above while scrolling up, away
 * downwards as it leaves the bottom.
 *
 * Skips: the hero and anything under [data-no-reveal], elements using the CSS
 * `reveal` utility, and everything when the user prefers reduced motion.
 * GSAP is loaded on demand. New nodes (streamed Suspense content, client
 * navigation) are picked up by a MutationObserver.
 */
const SCOPE = "main section, main [data-reveal], body footer";
const SKIP = "[data-no-reveal], .reveal";

export function ScrollScenes() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {});
      const seen = new WeakSet<Element>();

      const fresh = (selector: string) =>
        Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => {
          if (seen.has(el) || !el.closest(SCOPE) || el.closest(SKIP)) return false;
          if (el.parentElement?.closest(".glow-border, [data-animate]")) return false; // the outer card animates
          seen.add(el);
          return true;
        });

      const twoWay = (
        els: HTMLElement[],
        hidden: gsap.TweenVars,
        shown: gsap.TweenVars,
        opts: { start?: string; stagger?: number } = {},
      ) => {
        if (els.length === 0) return;
        const away = (dir: 1 | -1) => ({ ...hidden, y: dir * Math.abs(Number(hidden.y ?? 40)) * 0.6 });
        ctx.add(() => {
          gsap.set(els, hidden);
          ScrollTrigger.batch(els, {
            start: opts.start ?? "top 88%",
            end: "bottom 8%",
            onEnter: (b) =>
              gsap.fromTo(b, hidden, { ...shown, stagger: opts.stagger ?? 0.08, overwrite: true }),
            onLeave: (b) => gsap.to(b, { ...away(-1), duration: 0.5, ease: "power2.in", overwrite: true }),
            onEnterBack: (b) =>
              gsap.fromTo(
                b,
                { ...hidden, y: -Math.abs(Number(hidden.y ?? 40)) },
                { ...shown, stagger: opts.stagger ?? 0.08, overwrite: true },
              ),
            onLeaveBack: (b) => gsap.to(b, { ...away(1), duration: 0.5, ease: "power2.in", overwrite: true }),
          });
        });
      };

      const scan = () => {
        twoWay(
          fresh("h2"),
          { autoAlpha: 0, y: 44, clipPath: "inset(0% 0% 100% 0%)" },
          { autoAlpha: 1, y: 0, clipPath: "inset(0% 0% -20% 0%)", duration: 1, ease: "expo.out" },
        );
        twoWay(
          fresh(".glow-border, [data-animate]"),
          { autoAlpha: 0, y: 64, scale: 0.95, rotateX: 8, transformPerspective: 900 },
          { autoAlpha: 1, y: 0, scale: 1, rotateX: 0, duration: 0.95, ease: "power3.out" },
          { start: "top 92%", stagger: 0.09 },
        );
        twoWay(
          fresh("img"),
          { autoAlpha: 0, y: 40, clipPath: "inset(14% 10% 14% 10% round 24px)" },
          {
            autoAlpha: 1,
            y: 0,
            clipPath: "inset(0% 0% 0% 0% round 0px)",
            duration: 1.2,
            ease: "expo.out",
            clearProps: "clipPath",
          },
        );
        ScrollTrigger.refresh();
      };

      let timer = 0;
      const observer = new MutationObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(scan, 150);
      });
      // Start once the page has loaded and gone idle, so streamed sections have
      // hydrated before GSAP writes inline styles onto them.
      const begin = () => {
        if (disposed) return;
        scan();
        const main = document.querySelector("main");
        if (main) observer.observe(main, { childList: true, subtree: true });
      };
      const idle = () => {
        if (typeof window.requestIdleCallback === "function")
          window.requestIdleCallback(begin, { timeout: 800 });
        else setTimeout(begin, 200); // Safari
      };
      if (document.readyState === "complete") idle();
      else window.addEventListener("load", idle, { once: true });

      cleanup = () => {
        window.removeEventListener("load", idle);
        observer.disconnect();
        window.clearTimeout(timer);
        ctx.revert();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [pathname]);

  return null;
}
