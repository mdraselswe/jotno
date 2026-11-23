"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** The product's photos: one large, the rest as thumbnails that swap it. */
export function ProductGallery({ urls, alt }: { urls: string[]; alt: string }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const main = urls[index] ?? urls[0];
  if (!main) return null;
  return (
    <div className="grid gap-3">
      <div className="glow-border relative aspect-square overflow-hidden rounded-(--radius-2xl) bg-muted shadow-(--shadow-card)">
        {/* eslint-disable-next-line @next/next/no-img-element -- storage URL */}
        <img src={main} alt={alt} className="size-full object-cover" />
      </div>
      {urls.length > 1 ? (
        <ul className="flex flex-wrap gap-2" aria-label={t("shop.photos")}>
          {urls.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                aria-label={t("shop.photoN", { n: i + 1 })}
                className={cn(
                  "size-16 overflow-hidden rounded-(--control-radius) border-2 outline-offset-2 transition-opacity duration-(--motion-fast)",
                  i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- storage URL */}
                <img src={url} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
