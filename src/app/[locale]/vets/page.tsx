import { Suspense } from "react";
import { Spot } from "@/components/illustrations/spots";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { VetCard, VetFilters } from "@/features/providers";
import { searchProviders } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { parseNear, parseRadius, widerRadius } from "@/lib/geo";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("vets.title"), t("vets.sub"), ROUTES.vets, await getLocale());
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
const int = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

async function Results({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const near = parseNear(one(sp.near));
  const radiusKm = parseRadius(one(sp.r));
  const page = int(one(sp.page)) ?? 1;
  const { featured, results, total } = await searchProviders({
    districtId: int(one(sp.district)),
    areaId: int(one(sp.area)),
    species: one(sp.species),
    q: one(sp.q),
    onlyAvailable: one(sp.now) === "1",
    near,
    radiusKm,
    page,
  });

  if (featured.length === 0 && results.length === 0) {
    if (near) {
      const wider = widerRadius(radiusKm);
      const widen = new URLSearchParams();
      for (const [k, v] of Object.entries(sp)) {
        const value = one(v);
        if (value && k !== "page") widen.set(k, value);
      }
      if (wider) widen.set("r", String(wider));
      return (
        <div className="grid justify-items-center gap-4 rounded-(--radius-xl) border-(length:--border-w) border-dashed p-10 text-center">
          <Spot name="search" className="w-36" />
          <p className="max-w-sm text-muted-foreground">{t("vets.noneNear", { km: fmt.number(radiusKm) })}</p>
          {wider ? (
            <ButtonLink
              href={`${localeHref(locale, ROUTES.vets)}/?${widen.toString()}` as never}
              scroll={false}
            >
              {t("vets.widen", { km: fmt.number(wider) })}
            </ButtonLink>
          ) : null}
        </div>
      );
    }
    return (
      <div className="grid justify-items-center gap-4 rounded-(--radius-xl) border-(length:--border-w) border-dashed p-10 text-center">
        <Spot name="search" className="w-36" />
        <p className="max-w-sm text-muted-foreground">{t("vets.noResults")}</p>
        <ButtonLink href={localeHref(locale, ROUTES.ask)} variant="outline">
          {t("account.quickAsk")}
        </ButtonLink>
      </div>
    );
  }

  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const value = one(v);
    if (value) next.set(k, value);
  }
  next.set("page", String(page + 1));

  return (
    <div className="grid gap-6">
      {featured.length > 0 ? (
        <section className="grid gap-3" aria-label={t("common.sponsored")}>
          <div className="grid gap-3 md:grid-cols-2">
            {featured.map((v) => (
              <VetCard key={v.id} vet={v} locale={locale} t={t} fmt={fmt} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("vets.sponsoredNote")}</p>
        </section>
      ) : null}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("vets.results", { n: fmt.number(total) })}
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {results.map((v) => (
          <li key={v.id}>
            <VetCard vet={v} locale={locale} t={t} fmt={fmt} />
          </li>
        ))}
      </ul>
      {results.length < total ? (
        <div className="flex justify-center">
          <ButtonLink
            href={`${localeHref(locale, ROUTES.vets)}/?${next.toString()}` as never}
            variant="outline"
            scroll={false}
          >
            {t("common.loadMore")}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div role="status" className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-(--radius-xl)" />
      ))}
    </div>
  );
}

export default async function VetsPage({ searchParams }: PageProps<"/[locale]/vets">) {
  const t = await getT();
  return (
    <PageTransition>
      <div className="container-page grid gap-8 py-8 md:py-12">
        <header className="grid max-w-2xl gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {t("vets.title")}
          </h1>
          <p className="text-pretty text-muted-foreground">{t("vets.sub")}</p>
        </header>
        <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Suspense fallback={<Skeleton className="h-64" />}>
              <VetFilters />
            </Suspense>
          </aside>
          <Suspense fallback={<ResultsSkeleton />}>
            <Results searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </PageTransition>
  );
}
