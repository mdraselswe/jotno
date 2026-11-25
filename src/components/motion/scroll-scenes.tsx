"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * App-wide scroll reveals, mounted once in the layout. Light on purpose: one
 * IntersectionObserver pair and a CSS keyframe on `translate`/`opacity` (both
 * composited), no scroll listeners or GSAP.
 *
 * Inside <main> sections and the footer, section headings, cards
 * (.glow-border, [data-animate]), photos and `.reveal` elements rise in.
 * One way only: they play while scrolling DOWN (entering from the bottom of
 * the screen). Scrolling back up shows everything as it is, with no reverse
 * animation. Once an element has gone back below the screen it is re-armed,
 * so the next scroll down plays it again (every visit, every time).
 *
 * Never hides what is already on screen (or above it) when the page loads, so
 * the hero and LCP stay put. Skips [data-no-reveal], elements that run their
 * own CSS animation, and everything with reduced motion.
 */
const SCOPE = "main section, main [data-reveal], body footer";
const TARGETS = "h2, .glow-border, [data-animate], img, .reveal";
const SKIP = "[data-no-reveal]";
const MAX_STAGGER = 6;

export function ScrollScenes() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const seen = new WeakSet<Element>();
    const vh = () => window.innerHeight || document.documentElement.clientHeight;

    // Plays when an armed element crosses into the lower part of the screen.
    const play = new IntersectionObserver(
      (entries) => {
        let i = 0;
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (!e.isIntersecting || el.dataset.sr !== "wait") continue;
          if (e.boundingClientRect.top < 0) {
            // Came in from the top (scrolling up past a jump): just show it.
            delete el.dataset.sr;
            continue;
          }
          el.style.setProperty("--sr-i", String(Math.min(i++, MAX_STAGGER)));
          el.dataset.sr = "in";
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    // Re-arms an element once it has left through the bottom of the screen.
    const rearm = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting && e.boundingClientRect.top >= vh() - 1) {
          (e.target as HTMLElement).dataset.sr = "wait";
        }
      }
    });

    const scan = () => {
      const fold = vh();
      for (const el of document.querySelectorAll<HTMLElement>(TARGETS)) {
        if (seen.has(el) || !el.closest(SCOPE) || el.closest(SKIP)) continue;
        // The outer card animates; its heading, photo or inner card ride along.
        if (el.parentElement?.closest(".glow-border, [data-animate], .reveal")) continue;
        seen.add(el);
        if (getComputedStyle(el).animationName !== "none") continue;
        if (el.getBoundingClientRect().top >= fold) el.dataset.sr = "wait";
        play.observe(el);
        rearm.observe(el);
      }
    };

    let timer = 0;
    const mutations = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(scan, 120);
    });
    const begin = () => {
      scan();
      const main = document.querySelector("main");
      if (main) mutations.observe(main, { childList: true, subtree: true });
    };
    const raf = window.requestAnimationFrame(begin);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      mutations.disconnect();
      play.disconnect();
      rearm.disconnect();
      for (const el of document.querySelectorAll<HTMLElement>("[data-sr]")) delete el.dataset.sr;
    };
  }, [pathname]);

  return null;
}
