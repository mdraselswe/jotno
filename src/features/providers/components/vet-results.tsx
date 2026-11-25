"use client";

import { LoaderCircle, MapPinOff } from "lucide-react";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import type { ProviderCard } from "../server/queries";
import { loadMoreVets } from "../server/public-actions";
import { VETS_MAX_PAGES } from "../search-params";
import { VETS_PAGE_SIZE } from "../vet-sort";
import { VetCard } from "./vet-card";

const GRID = "grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2";

function CardList({ vets }: { vets: readonly ProviderCard[] }) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  return (
    <ul className={GRID}>
      {vets.map((v) => (
        <li key={v.id}>
          <VetCard vet={v} locale={locale} t={t} fmt={fmt} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The organic vet list with "load more". The server renders the first pages;
 * each "load more" fetches only the next page and appends it, and the URL's
 * `?page=` follows so the link still opens the same list. With an area
 * chosen, that area's vets come first, then a labelled divider and the rest
 * of the district (the server sorts them that way and says how many are in
 * the area).
 */
export function VetResultsList({
  initial,
  total,
  areaId,
  areaTotal,
  areaName,
  districtName,
  query,
}: {
  initial: ProviderCard[];
  total: number;
  /** The chosen area, if any (its vets are listed first). */
  areaId: number | null;
  /** With an area chosen: how many of `total` are in it. */
  areaTotal: number | null;
  areaName: string | null;
  districtName: string | null;
  /** The search params without `page`, as a query string. */
  query: string;
}) {
  const t = useT();
  const fmt = useFormatter();
  const pathname = usePathname();
  const [more, setMore] = useState<ProviderCard[]>([]);
  // Rows read from the server so far (the next page starts here), repeats included.
  const [offset, setOffset] = useState(initial.length);
  const [pending, start] = useTransition();

  const vets = [...initial, ...more];
  const hasMore = offset < total;
  const nextPage = Math.floor(offset / VETS_PAGE_SIZE) + 1;
  // Past the deepest `?page=` a link could open, "load more" is a plain button (JavaScript only).
  const asLink = nextPage <= VETS_MAX_PAGES;
  const nextHref = `${pathname}?${query ? `${query}&` : ""}page=${nextPage}` as Route;

  function loadMore() {
    start(async () => {
      try {
        const next = await loadMoreVets(query, offset);
        if (next.length === 0) {
          setOffset(total);
          return;
        }
        // The order can shift a little between pages (a vet goes online), so skip repeats.
        const seen = new Set(vets.map((v) => v.id));
        setMore((prev) => [...prev, ...next.filter((v) => !seen.has(v.id))]);
        setOffset(offset + next.length);
        const url = new URL(window.location.href);
        url.searchParams.set("page", String(Math.ceil((offset + next.length) / VETS_PAGE_SIZE)));
        window.history.replaceState(null, "", url);
      } catch {
        toast.error(t("common.genericError"));
      }
    });
  }

  const areaMode = areaId !== null && areaTotal !== null && areaName !== null && districtName !== null;
  // Split by each vet's area (not by position): repeats skipped while loading can't shift a card across.
  const inArea = areaMode ? vets.filter((v) => v.areaId === areaId) : vets;
  const others = areaMode ? vets.filter((v) => v.areaId !== areaId) : [];

  return (
    <div className="grid gap-6">
      {areaMode && areaTotal === 0 && total > 0 ? (
        <p className="flex items-start gap-2.5 rounded-(--radius-xl) bg-info/10 px-4 py-3 text-sm text-pretty ring-1 ring-info/20">
          <MapPinOff aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
          {t("pubui.vets.noneInArea", { area: areaName, district: districtName })}
        </p>
      ) : null}

      {areaMode && areaTotal > 0 ? (
        <>
          <section className="grid gap-3" aria-labelledby="vets-in-area">
            <h2 id="vets-in-area" className="font-heading text-base font-semibold">
              {t("pubui.vets.inArea", { area: areaName })}{" "}
              <span className="font-normal text-muted-foreground tabular-nums">
                ({fmt.number(areaTotal)})
              </span>
            </h2>
            <CardList vets={inArea} />
          </section>
          {others.length > 0 ? (
            <section className="grid gap-3" aria-labelledby="vets-other">
              <div className="flex items-center gap-3">
                <h2 id="vets-other" className="min-w-0 font-heading text-base font-semibold text-balance">
                  {t("pubui.vets.otherInDistrict", { district: districtName })}
                </h2>
                <span aria-hidden="true" className="h-px min-w-8 flex-1 bg-foreground/10" />
              </div>
              <CardList vets={others} />
            </section>
          ) : null}
        </>
      ) : (
        <section className="grid gap-4" aria-labelledby="vets-all">
          <h2 id="vets-all" className="sr-only">
            {t("pubui.vets.allTitle")}
          </h2>
          <CardList vets={vets} />
        </section>
      )}

      <div className="grid justify-items-center gap-3 pt-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {pending
            ? t("pubui.vets.loadingMore")
            : t("pubui.vets.showing", { shown: fmt.number(vets.length), total: fmt.number(total) })}
        </p>
        {hasMore && asLink ? (
          <ButtonLink
            href={nextHref}
            scroll={false}
            variant="outline"
            size="lg"
            aria-disabled={pending || undefined}
            onClick={(e) => {
              // Without JavaScript the link opens the next page; with it, only the next page is fetched.
              e.preventDefault();
              if (!pending) loadMore();
            }}
          >
            {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {t("common.loadMore")}
          </ButtonLink>
        ) : hasMore ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-disabled={pending || undefined}
            onClick={() => {
              if (!pending) loadMore();
            }}
          >
            {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {t("common.loadMore")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
