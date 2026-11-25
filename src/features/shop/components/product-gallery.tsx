"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useFormatter, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * The product's photos: one large (swipe, arrow buttons or ← → keys), the
 * rest as thumbnails below. `badge` sits on the large photo (e.g. −20%).
 */
export function ProductGallery({ urls, alt, badge }: { urls: string[]; alt: string; badge?: ReactNode }) {
  const t = useT();
  const fmt = useFormatter();
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const main = urls[index] ?? urls[0];
  if (!main) return null;
  const many = urls.length > 1;
  const go = (step: number) => setIndex((i) => (i + step + urls.length) % urls.length);

  return (
    <div className="grid gap-3">
      <div
        role={many ? "region" : undefined}
        aria-roledescription={many ? t("shopui.gallery") : undefined}
        aria-label={
          many ? t("shopui.photoOf", { n: fmt.number(index + 1), total: fmt.number(urls.length) }) : undefined
        }
        tabIndex={many ? 0 : undefined}
        onKeyDown={(e) => {
          if (!many) return;
          if (e.key === "ArrowRight") go(1);
          else if (e.key === "ArrowLeft") go(-1);
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (many && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
        className="group relative aspect-square touch-pan-y overflow-hidden rounded-(--radius-2xl) bg-muted shadow-(--shadow-card) ring-1 ring-foreground/6 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- storage URL */}
        <img key={main} src={main} alt={alt} className="size-full animate-in object-cover fade-in-0" />
        {badge ? <div className="pointer-events-none absolute top-3 left-3">{badge}</div> : null}
        {many ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("shopui.prevPhoto")}
              className="absolute top-1/2 left-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow-(--shadow-control) backdrop-blur transition-opacity duration-(--motion-fast) hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("shopui.nextPhoto")}
              className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow-(--shadow-control) backdrop-blur transition-opacity duration-(--motion-fast) hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-foreground/75 px-2 py-0.5 text-xs font-medium text-background tabular-nums">
              {fmt.number(index + 1)} / {fmt.number(urls.length)}
            </span>
          </>
        ) : null}
      </div>
      {many ? (
        <ul
          className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 py-1"
          aria-label={t("shop.photos")}
        >
          {urls.map((url, i) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                aria-label={t("shop.photoN", { n: i + 1 })}
                className={cn(
                  "block size-16 overflow-hidden rounded-(--radius-lg) ring-2 ring-offset-2 ring-offset-background transition-[opacity,box-shadow] duration-(--motion-fast) focus-visible:outline-none sm:size-20",
                  i === index
                    ? "ring-primary"
                    : "opacity-70 ring-transparent hover:opacity-100 focus-visible:ring-ring",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- storage URL */}
                <img src={url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
