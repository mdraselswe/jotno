"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, ArrowRight, BadgeCheck, Pause, Play, Search } from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const BlobField = dynamic(() => import("./blob-field"), { ssr: false });

export interface OrbitPetItem {
  slug: string;
  name: string;
  line: string;
  /** "Find a cat vet" */
  find: string;
  href: Route;
}

const AUTOPLAY_MS = 4800;

/** WebGL only where it is cheap enough: not on data saver or very small CPUs. */
function canAffordWebGL() {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 4) < 4) return false;
  if ((nav.deviceMemory ?? 4) < 2) return false;
  return true;
}

const photo = (slug: string) => ({
  src: `/images/pets/${slug}-800.webp`,
  srcSet: `/images/pets/${slug}-400.webp 400w, /images/pets/${slug}-800.webp 800w`,
});

/**
 * Badge spots, in the gaps between the plates' resting places (the ring
 * always stops with a plate at the top, so the seven spots never change).
 */
const BADGE_SPOTS = ["top-0 -right-[3%]", "top-[36%] -left-[3%]", "top-[73%] -right-[3%]"] as const;

/**
 * The home hero: text on one side (server-rendered children, so the heading
 * is in the first HTML), and the animals on plates going round an orbit on
 * the other. The active animal's colour glides into the band behind
 * everything. Autoplays; pauses offscreen, in a hidden tab, while a control
 * has keyboard focus, and with the pause button (reduced motion: never plays).
 */
export function HeroOrbit({
  pets,
  label,
  prev,
  next,
  pause,
  play,
  badges,
  children,
  footer,
}: {
  pets: readonly OrbitPetItem[];
  label: string;
  prev: string;
  next: string;
  pause: string;
  play: string;
  badges: readonly string[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const turns = useRef(0);
  const n = pets.length;
  const current = pets[active] ?? pets[0];
  const playing = !stopped && !offscreen && !focused;

  useEffect(() => {
    const id = window.setTimeout(() => setWebgl(canAffordWebGL()), 900);
    return () => window.clearTimeout(id);
  }, []);

  // Autoplay (also waits while the tab is hidden: timers there are throttled
  // and would fire in a burst on return).
  useEffect(() => {
    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0;
    const arm = () => {
      window.clearTimeout(id);
      if (document.visibilityState === "visible") {
        id = window.setTimeout(() => setActive((a) => (a + 1) % n), AUTOPLAY_MS);
      }
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [active, playing, n]);

  // Pause while offscreen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOffscreen(!e?.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The stage eases up and back as the hero scrolls away (no spin, so the
        // plates stay clear of the badges).
        gsap.to("[data-orbit-stage]", {
          yPercent: -6,
          scale: 0.96,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.8 },
        });
        // Entrance for the decoration around the (static) heading and photo.
        gsap.from("[data-orbit-plate]", {
          scale: 0.4,
          opacity: 0,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.06,
          delay: 0.1,
        });
        gsap.from("[data-orbit-badge]", {
          y: 16,
          opacity: 0,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.1,
          delay: 0.45,
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  // Turn the ring so the active plate sits at the top; cross-fade the big
  // photo (the new one rises over the old, so the plate is never empty).
  const prevActive = useRef(0);
  useGSAP(
    () => {
      const from = prevActive.current;
      const index = active;
      prevActive.current = active;
      if (from === index) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const step = 360 / n;
      let delta = index - from;
      if (delta > n / 2) delta -= n;
      if (delta < -n / 2) delta += n;
      turns.current -= delta * step;
      const angle = turns.current;
      const photos = gsap.utils.toArray<HTMLElement>("[data-orbit-photo]");
      const incoming = photos[index];
      const outgoing = photos[from];
      gsap.killTweensOf(photos);
      photos.forEach((el, i) => {
        if (i !== index && i !== from) gsap.set(el, { opacity: 0, zIndex: 0 });
      });
      if (reduce || !incoming) {
        gsap.set(ring.current, { rotate: angle });
        gsap.set("[data-orbit-plate-inner]", { rotate: -angle });
        gsap.set(photos, { opacity: 0, zIndex: 0, scale: 1, rotate: 0 });
        if (incoming) gsap.set(incoming, { opacity: 1, zIndex: 2 });
        return;
      }
      const dir = delta >= 0 ? 1 : -1;
      gsap.to(ring.current, { rotate: angle, duration: 1.2, ease: "expo.inOut", overwrite: true });
      gsap.to("[data-orbit-plate-inner]", {
        rotate: -angle,
        duration: 1.2,
        ease: "expo.inOut",
        overwrite: true,
      });
      if (outgoing) {
        gsap.set(outgoing, { zIndex: 1 });
        gsap.to(outgoing, { opacity: 0, scale: 1.04, duration: 0.5, delay: 0.55, ease: "power1.out" });
      }
      gsap.set(incoming, { zIndex: 2 });
      gsap.fromTo(
        incoming,
        { opacity: 0, scale: 1.14, rotate: 6 * dir },
        { opacity: 1, scale: 1, rotate: 0, duration: 1, ease: "expo.out", delay: 0.15 },
      );
      gsap.fromTo(
        "[data-orbit-caption] > *",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.05, delay: 0.2, overwrite: true },
      );
    },
    { scope: root, dependencies: [active, n] },
  );

  const go = (i: number) => setActive(((i % n) + n) % n);

  return (
    <section
      ref={root}
      data-no-reveal
      aria-roledescription="carousel"
      aria-label={label}
      // Pulled up under the floating header, so the band runs to the top.
      className="relative isolate -mt-16 overflow-hidden pt-16 transition-[--band-c] duration-[1400ms] ease-in-out-quart sm:-mt-[4.25rem] sm:pt-[4.25rem]"
      style={{ "--band-c": `var(--band-${current?.slug ?? "care"})` } as CSSProperties}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      {/* The colour band: glides between animals. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[88%] bg-[linear-gradient(180deg,var(--band-c),color-mix(in_oklch,var(--band-c)_55%,transparent)_70%,transparent)]"
      />
      <div
        aria-hidden="true"
        className="absolute -top-40 -right-40 -z-10 size-[42rem] rounded-full bg-background/30 blur-3xl"
      />

      <div className="container-page grid items-center gap-12 pt-10 pb-14 md:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-20">
        <div className="relative z-10 grid gap-6">{children}</div>

        <div
          data-orbit-stage
          className="relative mx-auto aspect-square w-[calc(100%-2.5rem)] max-w-[32rem] sm:w-[85%] lg:w-full"
        >
          {/* Poster blob (always) and the WebGL blob on top when affordable. */}
          <div
            aria-hidden="true"
            className="absolute inset-[13%] rounded-full bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklch,var(--band-c)_35%,white),var(--band-c)_72%)] shadow-[0_40px_80px_-30px_color-mix(in_oklch,var(--band-c)_70%,black)]"
          />
          {webgl ? (
            <BlobField
              cssVar={`--band-${current?.slug ?? "care"}`}
              className="pointer-events-none absolute inset-[4%]"
            />
          ) : null}

          {/* The orbit ring with the small plates. */}
          <div ref={ring} className="absolute inset-0">
            <div
              aria-hidden="true"
              className="absolute inset-[3%] rounded-full border-2 border-dashed border-foreground/15"
            />
            {pets.map((p, i) => {
              const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
              const x = 50 + Math.cos(angle) * 47;
              const y = 50 + Math.sin(angle) * 47;
              return (
                <div
                  key={p.slug}
                  data-orbit-plate
                  className="absolute size-[17%] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <button
                    type="button"
                    data-orbit-plate-inner
                    onClick={() => go(i)}
                    aria-label={p.name}
                    aria-current={i === active ? "true" : undefined}
                    className={cn(
                      "size-full overflow-hidden rounded-full bg-card p-1 shadow-(--shadow-card) transition-[box-shadow,scale] duration-(--motion-base) ease-out-expo hover:scale-105 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none",
                      i === active && "ring-4 ring-primary",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized local photo */}
                    <img
                      src={`/images/pets/${p.slug}-400.webp`}
                      alt=""
                      width={400}
                      height={400}
                      loading="lazy"
                      decoding="async"
                      className="size-full rounded-full object-cover"
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* The big plate: every photo stacked; GSAP shows the active one. */}
          <div className="absolute inset-[20%] overflow-hidden rounded-full bg-card shadow-(--shadow-card) ring-6 ring-card/70">
            {pets.map((p, i) => {
              const img = photo(p.slug);
              return (
                // eslint-disable-next-line @next/next/no-img-element -- pre-sized local photo, srcset included
                <img
                  key={p.slug}
                  data-orbit-photo={i}
                  src={img.src}
                  srcSet={img.srcSet}
                  sizes="(min-width: 1024px) 20rem, 60vw"
                  alt={i === active ? p.name : ""}
                  aria-hidden={i === active ? undefined : true}
                  width={800}
                  height={800}
                  fetchPriority={i === 0 ? "high" : "low"}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 size-full object-cover will-change-[opacity,transform]"
                  style={{ opacity: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 0 }}
                />
              );
            })}
          </div>

          {/* Badges in the gaps between the plates. */}
          {badges.slice(0, BADGE_SPOTS.length).map((b, i) => (
            <span
              key={b}
              data-orbit-badge
              className={cn(
                "absolute z-10 inline-flex max-w-[44%] items-center gap-1.5 rounded-full bg-card/85 px-3 py-1.5 text-xs leading-tight font-semibold shadow-(--shadow-card) backdrop-blur-md sm:text-sm",
                BADGE_SPOTS[i],
              )}
            >
              <span className="inline-flex float items-center gap-1.5" style={{ "--i": i } as CSSProperties}>
                <BadgeCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span className="truncate">{b}</span>
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Caption + controls for the active animal. */}
      <div className="container-page pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-2xl) bg-card/80 p-3 shadow-(--shadow-card) backdrop-blur-md sm:p-4 lg:ml-auto lg:max-w-[40rem]">
          <div
            data-orbit-caption
            className="grid min-w-0 flex-1 basis-48 gap-0.5 ps-2"
            aria-live={playing ? "off" : "polite"}
          >
            <p className="font-heading text-2xl leading-tight font-bold tracking-tight">{current?.name}</p>
            <p className="truncate text-sm text-muted-foreground">{current?.line}</p>
          </div>
          <div className="flex items-center gap-2">
            <OrbitButton label={stopped ? play : pause} onClick={() => setStopped((s) => !s)}>
              {stopped ? (
                <Play aria-hidden="true" className="size-4" />
              ) : (
                <Pause aria-hidden="true" className="size-4" />
              )}
            </OrbitButton>
            <OrbitButton label={prev} onClick={() => go(active - 1)}>
              <ArrowLeft aria-hidden="true" className="size-4" />
            </OrbitButton>
            <OrbitButton label={next} onClick={() => go(active + 1)}>
              <ArrowRight aria-hidden="true" className="size-4" />
            </OrbitButton>
            {current ? (
              <Link
                href={current.href}
                className="glass relative inline-flex h-10 items-center gap-2 rounded-full bg-primary bg-(image:--primary-sheen) px-4 text-sm font-semibold text-primary-foreground shadow-(--shadow-primary) transition-shadow duration-(--motion-base) hover:shadow-(--shadow-primary-hover)"
              >
                <Search aria-hidden="true" className="size-4" />
                <span className="max-sm:sr-only">{current.find}</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      {footer}
    </section>
  );
}

function OrbitButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="glass relative grid size-10 place-items-center rounded-full bg-muted/80 transition-[background-color,scale] duration-(--motion-fast) ease-out-expo hover:bg-muted active:scale-90"
    >
      {children}
    </button>
  );
}
