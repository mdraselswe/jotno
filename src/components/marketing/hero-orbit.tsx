"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, ArrowRight, BadgeCheck, Search } from "lucide-react";
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

const AUTOPLAY_MS = 4200;

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
 * The home hero: text on one side (server-rendered children, so the heading
 * is in the first HTML), and the animals on plates going round an orbit on
 * the other. The active animal's colour floods the band behind everything.
 * Autoplays gently (paused on hover, focus, offscreen and reduced motion).
 */
export function HeroOrbit({
  pets,
  label,
  prev,
  next,
  badges,
  children,
  footer,
}: {
  pets: readonly OrbitPetItem[];
  label: string;
  prev: string;
  next: string;
  badges: readonly string[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const turns = useRef(0);
  const n = pets.length;
  const current = pets[active] ?? pets[0];

  useEffect(() => {
    const id = window.setTimeout(() => setWebgl(canAffordWebGL()), 900);
    return () => window.clearTimeout(id);
  }, []);

  // Autoplay.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setActive((a) => (a + 1) % n), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [active, paused, n]);

  // Pause while offscreen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPaused(!e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Plates and badges drift apart as the hero scrolls away.
        gsap.to("[data-orbit-stage]", {
          yPercent: -8,
          scale: 0.94,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
        });
        gsap.to("[data-orbit-spin]", {
          rotate: 40,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.8 },
        });
        gsap.utils.toArray<HTMLElement>("[data-orbit-badge]").forEach((b, i) => {
          gsap.to(b, {
            y: -40 - i * 25,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 1 },
          });
        });
        // Entrance for the decoration around the (static) heading and photo.
        gsap.from("[data-orbit-plate]", {
          scale: 0,
          opacity: 0,
          duration: 0.8,
          ease: "back.out(1.8)",
          stagger: 0.06,
          delay: 0.15,
        });
        gsap.from("[data-orbit-badge]", {
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.1,
          delay: 0.5,
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  // Turn the ring so the active plate sits at the top; swap the big photo.
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
      if (reduce) {
        gsap.set(ring.current, { rotate: angle });
        gsap.set("[data-orbit-plate-inner]", { rotate: -angle });
        gsap.set("[data-orbit-photo]", { opacity: 0, scale: 1, rotate: 0, xPercent: 0 });
        gsap.set(`[data-orbit-photo="${index}"]`, { opacity: 1 });
        return;
      }
      gsap.to(ring.current, { rotate: angle, duration: 1.1, ease: "power3.inOut" });
      gsap.to("[data-orbit-plate-inner]", { rotate: -angle, duration: 1.1, ease: "power3.inOut" });
      const dir = delta >= 0 ? 1 : -1;
      gsap.to(`[data-orbit-photo="${from}"]`, {
        opacity: 0,
        scale: 0.7,
        rotate: -25 * dir,
        xPercent: -30 * dir,
        duration: 0.55,
        ease: "power2.in",
      });
      gsap.fromTo(
        `[data-orbit-photo="${index}"]`,
        { opacity: 0, scale: 0.7, rotate: 25 * dir, xPercent: 30 * dir },
        { opacity: 1, scale: 1, rotate: 0, xPercent: 0, duration: 0.9, ease: "back.out(1.4)", delay: 0.25 },
      );
      gsap.fromTo(
        "[data-orbit-caption] > *",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.06, delay: 0.35 },
      );
    },
    { scope: root, dependencies: [active, n] },
  );

  const go = (i: number) => setActive(((i % n) + n) % n);

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label={label}
      className="relative isolate overflow-hidden"
      style={{ "--band": `var(--band-${current?.slug ?? "care"})` } as CSSProperties}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      {/* The colour band: morphs between animals. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[85%] bg-(--band) [mask-image:linear-gradient(to_bottom,black_60%,transparent)] transition-[background-color] duration-1000 ease-out-quart"
      />
      <div
        aria-hidden="true"
        className="absolute -top-40 -right-40 -z-10 size-[42rem] rounded-full bg-background/35 blur-3xl"
      />

      <div className="container-page grid items-center gap-10 pt-10 pb-16 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
        <div className="relative z-10 grid gap-6">{children}</div>

        <div data-orbit-stage className="relative mx-auto aspect-square w-full max-w-[34rem]">
          {/* Poster blob (always) and the WebGL blob on top when affordable. */}
          <div
            aria-hidden="true"
            className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklch,var(--band)_30%,white),var(--band)_70%)] shadow-[0_40px_80px_-30px_color-mix(in_oklch,var(--band)_70%,black)] transition-[background] duration-1000"
          />
          {webgl ? (
            <BlobField
              cssVar={`--band-${current?.slug ?? "care"}`}
              className="pointer-events-none absolute inset-[4%]"
            />
          ) : null}

          {/* The orbit ring with the small plates. */}
          <div data-orbit-spin className="absolute inset-0">
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
                        "group size-full overflow-hidden rounded-full bg-card p-1 shadow-(--shadow-card) transition-[box-shadow,scale] duration-(--motion-base) ease-spring hover:scale-110 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none",
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
          </div>

          {/* The big plate: every photo stacked; GSAP shows the active one. */}
          <div className="absolute inset-[19%] overflow-hidden rounded-full bg-card shadow-(--shadow-card)">
            {pets.map((p, i) => {
              const img = photo(p.slug);
              return (
                // eslint-disable-next-line @next/next/no-img-element -- pre-sized local photo, srcset included
                <img
                  key={p.slug}
                  data-orbit-photo={i}
                  src={img.src}
                  srcSet={img.srcSet}
                  sizes="(min-width: 1024px) 22rem, 60vw"
                  alt={i === active ? p.name : ""}
                  aria-hidden={i === active ? undefined : true}
                  width={800}
                  height={800}
                  fetchPriority={i === 0 ? "high" : "low"}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                  style={{ opacity: i === 0 ? 1 : 0 }}
                />
              );
            })}
          </div>

          {/* Badges floating round the plate. */}
          {badges.map((b, i) => (
            <span
              key={b}
              data-orbit-badge
              className={cn(
                "absolute z-10 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-semibold shadow-(--shadow-card) backdrop-blur sm:text-sm",
                i === 0 && "top-[6%] -left-[2%]",
                i === 1 && "top-[46%] -right-[4%]",
                i === 2 && "bottom-[8%] left-[4%]",
              )}
            >
              <span className="inline-flex float items-center gap-1.5" style={{ "--i": i } as CSSProperties}>
                <BadgeCheck aria-hidden="true" className="size-4 text-primary" />
                {b}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Caption + controls for the active animal. */}
      <div className="container-page -mt-6 pb-10 lg:-mt-14">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-(--radius-2xl) bg-card/80 p-3 shadow-(--shadow-card) backdrop-blur sm:p-4 lg:ml-auto lg:max-w-[38rem]">
          <div
            data-orbit-caption
            className="grid min-w-0 flex-1 gap-0.5 ps-2"
            aria-live={paused ? "polite" : "off"}
          >
            <p className="font-heading text-2xl leading-tight font-bold tracking-tight [font-stretch:85%]">
              {current?.name}
            </p>
            <p className="truncate text-sm text-muted-foreground">{current?.line}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label={prev}
              className="grid size-10 place-items-center rounded-full bg-muted transition-transform duration-(--motion-fast) ease-spring hover:-translate-x-0.5 active:scale-90"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label={next}
              className="grid size-10 place-items-center rounded-full bg-muted transition-transform duration-(--motion-fast) ease-spring hover:translate-x-0.5 active:scale-90"
            >
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
            {current ? (
              <Link
                href={current.href}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-(--shadow-primary) transition-transform duration-(--motion-fast) ease-spring hover:-translate-y-0.5 active:scale-95"
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
