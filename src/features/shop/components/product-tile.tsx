import Link from "next/link";
import { Doodle, type DoodleName } from "@/components/illustrations/doodles";
import { productPath } from "@/config/routes";
import type { Formatter, Translate } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import type { ProductCard } from "../server/queries";
import { AddToCartButton } from "./add-to-cart";

/** Placeholder art per category, until a product has a photo. */
const ART: Record<string, { doodle: DoodleName; tone: string }> = {
  food: { doodle: "bone", tone: "bg-band-dog/45" },
  grooming: { doodle: "cat", tone: "bg-band-rabbit/55" },
  accessories: { doodle: "paw", tone: "bg-band-cow/55" },
  toys: { doodle: "ball", tone: "bg-band-bird/50" },
  dress: { doodle: "heart", tone: "bg-band-chicken/45" },
};

export const productArt = (category: string) =>
  ART[category] ?? { doodle: "paw" as const, tone: "bg-band-care/50" };

/** Product card for the shop grid. */
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
  const art = productArt(p.category);
  return (
    <div className="group glow-border relative grid h-full grid-rows-[auto_1fr_auto] overflow-hidden rounded-(--radius-3xl) bg-card shadow-(--shadow-card) transition-[transform,box-shadow] duration-(--motion-base) ease-(--ease-ui) hover:shadow-(--shadow-card-hover)">
      <Link
        href={href}
        className={`relative m-2 block aspect-square overflow-hidden rounded-(--radius-2xl) ${art.tone}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        {p.compareAt && p.compareAt > p.price ? (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-highlight px-2 py-0.5 text-xs font-bold text-highlight-foreground">
            −{fmt.number(Math.round((1 - p.price / p.compareAt) * 100))}%
          </span>
        ) : null}
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URL, works in static mode too
          <img
            src={p.imageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-(--motion-slow) ease-(--ease-ui) group-hover:scale-105"
          />
        ) : (
          <span className="grid size-full place-items-center">
            <Doodle
              name={art.doodle}
              className="size-2/5 text-foreground/45 transition-transform duration-(--motion-slow) ease-(--ease-ui) group-hover:scale-110 group-hover:-rotate-6"
            />
          </span>
        )}
      </Link>
      <div className="grid content-start gap-1 px-4 pt-1 pb-3">
        <Link href={href} className="line-clamp-2 font-heading font-semibold hover:underline">
          {p.name}
        </Link>
        {p.unit ? <p className="text-xs text-muted-foreground">{p.unit}</p> : null}
        <p className="flex items-baseline gap-2">
          <span className="font-heading text-xl font-bold tabular-nums">{taka(fmt, p.price)}</span>
          {p.compareAt && p.compareAt > p.price ? (
            <span className="text-sm text-muted-foreground tabular-nums line-through">
              {taka(fmt, p.compareAt)}
            </span>
          ) : null}
        </p>
        {p.stock > 0 && p.stock <= 5 ? (
          <p className="text-xs text-warning">{t("shop.onlyLeft", { n: p.stock })}</p>
        ) : null}
      </div>
      <div className="px-4 pb-4">
        <AddToCartButton productId={p.id} inStock={p.stock > 0} size="sm" />
      </div>
    </div>
  );
}
