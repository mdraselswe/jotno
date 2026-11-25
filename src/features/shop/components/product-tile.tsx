import { Bath, Bone, PawPrint, Puzzle, Shirt, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { productPath } from "@/config/routes";
import type { Formatter, Translate } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";
import { percentOff } from "../cart";
import type { ProductCard } from "../server/queries";
import { AddToCartButton } from "./add-to-cart";

/** Placeholder art per category, until a product has a photo. */
const ART: Record<string, { icon: LucideIcon; tone: string }> = {
  food: { icon: Bone, tone: "bg-band-dog" },
  grooming: { icon: Bath, tone: "bg-band-rabbit" },
  accessories: { icon: PawPrint, tone: "bg-band-cow" },
  toys: { icon: Puzzle, tone: "bg-band-bird" },
  dress: { icon: Shirt, tone: "bg-band-chicken" },
};

export const productArt = (category: string) => ART[category] ?? { icon: PawPrint, tone: "bg-band-care" };

/** The placeholder: the category's icon, drawn thin and large. */
export function ProductArt({ category, className }: { category: string; className?: string }) {
  const Icon = productArt(category).icon;
  return <Icon aria-hidden="true" className={className} style={{ strokeWidth: 1.25 }} />;
}

/** A product photo (or its placeholder art) in a square frame. Decorative: the name is next to it. */
export function ProductThumb({
  imageUrl,
  category,
  className,
  zoom = false,
}: {
  imageUrl: string | null;
  category: string;
  className?: string;
  /** Grow a little on hover of the surrounding `group`. */
  zoom?: boolean;
}) {
  const grow = zoom && "transition-transform duration-(--motion-slow) ease-(--ease-ui) group-hover:scale-105";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block aspect-square overflow-hidden",
        imageUrl ? "bg-muted" : productArt(category).tone,
        className,
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- storage URL, works in static mode too
        <img src={imageUrl} alt="" loading="lazy" className={cn("size-full object-cover", grow)} />
      ) : (
        <span className="grid size-full place-items-center">
          <ProductArt category={category} className={cn("size-2/5 text-primary/60", grow)} />
        </span>
      )}
    </span>
  );
}

/** Product card for the shop grid: photo, name, price (with the old price and % off), stock, quick add. */
export function ProductTile({
  p,
  locale,
  t,
  fmt,
}: {
  p: ProductCard;
  locale: string;
  t: Translate;
  fmt: Formatter;
}) {
  const href = localeHref(locale, productPath(p.slug));
  const off = percentOff(p.price, p.compareAt);
  const out = p.stock <= 0;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6 transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) motion-reduce:hover:translate-y-0">
      <div className="relative">
        <ProductThumb imageUrl={p.imageUrl} category={p.category} zoom className={cn(out && "opacity-60")} />
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start gap-1.5">
          {off > 0 ? (
            <span className="rounded-full bg-highlight px-2 py-0.5 text-xs font-bold text-highlight-foreground tabular-nums shadow-(--shadow-control)">
              {t("shopui.off", { n: fmt.number(off) })}
            </span>
          ) : null}
          {out ? (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
              {t("shop.outOfStock")}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h3 className="text-sm leading-snug font-semibold sm:text-base">
          {/* The whole card is the link (the add button sits above it). */}
          <Link
            href={href}
            className="line-clamp-2 after:absolute after:inset-0 after:z-0 after:rounded-(--radius-2xl) focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {p.name}
          </Link>
        </h3>
        {p.unit ? <p className="text-xs text-muted-foreground">{p.unit}</p> : null}
        <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          <span className="font-heading text-lg font-bold tabular-nums sm:text-xl">{taka(fmt, p.price)}</span>
          {off > 0 && p.compareAt ? (
            <span className="text-xs text-muted-foreground tabular-nums line-through sm:text-sm">
              <span className="sr-only">{t("shopui.wasPrice")} </span>
              {taka(fmt, p.compareAt)}
            </span>
          ) : null}
        </p>
        {!out && p.stock <= 5 ? (
          <p className="text-xs font-medium text-warning-foreground dark:text-warning">
            {t("shop.onlyLeft", { n: fmt.number(p.stock) })}
          </p>
        ) : null}
        <div className="relative z-10 pt-2">
          <AddToCartButton productId={p.id} name={p.name} stock={p.stock} />
        </div>
      </div>
    </article>
  );
}

/** Loading twin of ProductTile. */
export function ProductTileSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6">
      <Skeleton className="aspect-square rounded-none" />
      <div className="grid gap-2 p-3 sm:p-4">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-1 h-6 w-1/2" />
        <Skeleton className="mt-1 h-(--control-h-sm) w-full rounded-(--control-radius)" />
      </div>
    </div>
  );
}
