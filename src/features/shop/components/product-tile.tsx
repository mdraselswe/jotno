import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { productPath } from "@/config/routes";
import type { Formatter, Translate } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import type { ProductCard } from "../server/queries";
import { AddToCartButton } from "./add-to-cart";

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
  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] overflow-hidden rounded-(--radius-xl) border-(length:--border-w) bg-card shadow-(--shadow-card)">
      <Link href={href} className="block aspect-square bg-muted" tabIndex={-1} aria-hidden="true">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URL, works in static mode too
          <img src={p.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center">
            <ShoppingBag className="size-10 text-muted-foreground" />
          </span>
        )}
      </Link>
      <div className="grid content-start gap-1 p-3">
        <Link href={href} className="line-clamp-2 font-medium hover:underline">
          {p.name}
        </Link>
        <p className="flex items-baseline gap-2">
          <span className="font-heading text-lg font-semibold tabular-nums">{taka(fmt, p.price)}</span>
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
      <div className="p-3 pt-0">
        <AddToCartButton productId={p.id} inStock={p.stock > 0} size="sm" />
      </div>
    </div>
  );
}
