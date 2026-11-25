"use client";

import { LoaderCircle, LocateFixed, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AreaPicker } from "@/components/forms/area-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { SPECIES } from "@/content/geo";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { DEFAULT_RADIUS_KM, locate, NEAR_RADII, parseRadius, type LocateError } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { DEFAULT_VET_SORT, parseVetSort, VET_SORTS } from "../vet-sort";

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

/**
 * The vet search lives in the URL (shareable, the back button works). Every
 * change keeps the other filters and goes back to the first page.
 */
function useVetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const qs = next.toString();
    start(() => router.replace((qs ? `${pathname}?${qs}` : pathname) as never, { scroll: false }));
  }
  return { params, update, pending };
}

/** How many filters (not the name search) are on: the badge on the phone's Filters button. */
function activeCount(params: { get: (key: string) => string | null }): number {
  let n = 0;
  if (params.get("species")) n++;
  if (params.get("now") === "1") n++;
  if (params.get("near") || params.get("district")) n++;
  return n;
}

function NearMeButton({
  update,
  className,
  size = "default",
}: {
  update: (changes: Record<string, string | null>) => void;
  className?: string;
  size?: "default" | "lg";
}) {
  const t = useT();
  const params = useSearchParams();
  const near = params.get("near");
  const [locating, setLocating] = useState(false);
  function findMe() {
    setLocating(true);
    locate()
      .then((pos) =>
        update({ near: `${pos.lat.toFixed(4)},${pos.lon.toFixed(4)}`, district: null, area: null }),
      )
      .catch((reason: LocateError) => toast.error(t(`vets.locate.${reason}`)))
      .finally(() => setLocating(false));
  }
  return (
    <Button
      type="button"
      variant={near ? "default" : "outline"}
      size={size}
      onClick={near ? () => update({ near: null, r: null }) : findMe}
      disabled={locating}
      aria-busy={locating}
      aria-pressed={Boolean(near)}
      className={className}
    >
      {near ? (
        <X aria-hidden="true" />
      ) : locating ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" />
      ) : (
        <LocateFixed aria-hidden="true" />
      )}
      {locating ? t("vets.locating") : t("vets.nearMe")}
    </Button>
  );
}

function SearchForm({ initial, onSearch }: { initial: string; onSearch: (q: string | null) => void }) {
  const t = useT();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      className="relative flex min-w-0 flex-1 items-center"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSearch(q.trim() || null);
      }}
    >
      <label htmlFor="vet-q" className="sr-only">
        {t("pubui.vets.searchLabel")}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="vet-q"
        type="search"
        enterKeyHint="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("vets.searchPlaceholder")}
        className="h-(--control-h-lg) flex-1 bg-card ps-11 pe-24 text-base"
      />
      <Button type="submit" variant="brand" className="absolute end-1.5 top-1/2 -translate-y-1/2">
        {t("common.search")}
      </Button>
    </form>
  );
}

/** The big search row in the page header: name search and "near me". */
export function VetSearchBar() {
  const { params, update, pending } = useVetParams();
  const q = params.get("q") ?? "";
  return (
    <div
      className={cn(
        "flex flex-col gap-2 transition-opacity duration-(--motion-fast) sm:flex-row",
        pending && "opacity-70",
      )}
      aria-busy={pending}
    >
      {/* Re-mount when the URL's search changes (a chip removed it), so the box shows it. */}
      <SearchForm key={q} initial={q} onSearch={(value) => update({ q: value })} />
      <NearMeButton update={update} size="lg" className="sm:min-w-36" />
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

const CHIP =
  "inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium ring-1 transition-colors duration-(--motion-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** All filters: when, which animal, where. Used in the desktop sidebar and the phone sheet. */
export function VetFilterPanel({ idPrefix = "vf" }: { idPrefix?: string }) {
  const t = useT();
  const locale = useLocale();
  const fmt = useFormatter();
  const { params, update, pending } = useVetParams();
  const species = params.get("species");
  const near = params.get("near");
  const radius = parseRadius(params.get("r"));
  const onlineId = `${idPrefix}-online`;

  return (
    <div
      className={cn("grid gap-6 transition-opacity duration-(--motion-fast)", pending && "opacity-70")}
      aria-busy={pending}
    >
      <Group title={t("pubui.vets.when")}>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-(--radius-lg) bg-success/8 px-3.5 py-3 ring-1 ring-success/20">
          <span id={onlineId} className="flex items-center gap-2 text-sm font-medium">
            <span aria-hidden="true" className="size-2 rounded-full bg-success" />
            {t("vets.onlyOnline")}
          </span>
          <Switch
            aria-labelledby={onlineId}
            checked={params.get("now") === "1"}
            onCheckedChange={(c) => update({ now: c ? "1" : null })}
          />
        </label>
      </Group>

      <Group title={t("common.species")}>
        <div className="flex flex-wrap gap-2">
          {SPECIES.map((s) => {
            const on = species === s.slug;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => update({ species: on ? null : s.slug })}
                className={cn(
                  CHIP,
                  on
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card text-foreground/80 ring-foreground/12 hover:bg-muted",
                )}
              >
                {locale === "bn" ? s.bn : s.en}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title={t("pubui.vets.where")}>
        <NearMeButton update={update} className="justify-self-start" />
        {near ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("vets.radius")}>
            <span aria-hidden="true" className="text-sm text-muted-foreground">
              {t("vets.radius")}
            </span>
            {NEAR_RADII.map((km) => {
              const on = radius === km;
              return (
                <button
                  key={km}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ r: km === DEFAULT_RADIUS_KM ? null : String(km) })}
                  className={cn(
                    CHIP,
                    "h-8 px-3",
                    on
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-card ring-foreground/12 hover:bg-muted",
                  )}
                >
                  {t("vets.km", { n: fmt.number(km) })}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{t("pubui.vets.nearMeHint")}</p>
            <AreaPicker
              idPrefix={idPrefix}
              districtId={num(params.get("district"))}
              areaId={num(params.get("area"))}
              onChange={(p) =>
                update({
                  district: p.districtId ? String(p.districtId) : null,
                  area: p.areaId ? String(p.areaId) : null,
                })
              }
            />
          </>
        )}
      </Group>
    </div>
  );
}

/** Phones and tablets: a Filters button with a count badge that opens the filters in a bottom sheet. */
export function VetFilterSheet() {
  const t = useT();
  const fmt = useFormatter();
  const params = useSearchParams();
  const n = activeCount(params);
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            aria-label={n > 0 ? t("pubui.vets.filtersOn", { n: fmt.number(n) }) : undefined}
          >
            <SlidersHorizontal aria-hidden="true" />
            {t("vets.filters")}
            {n > 0 ? (
              <span
                aria-hidden="true"
                className="grid size-5 place-items-center rounded-full bg-primary text-[0.6875rem] font-bold text-primary-foreground tabular-nums"
              >
                {fmt.number(n)}
              </span>
            ) : null}
          </Button>
        }
      />
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] rounded-t-(--radius-3xl) border-t-0 pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="border-b px-5 pt-5 pb-4">
          <SheetTitle className="font-heading text-lg font-bold">{t("vets.filters")}</SheetTitle>
          <SheetDescription className="sr-only">{t("vets.sub")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-2">
          <VetFilterPanel idPrefix="vfs" />
        </div>
        <SheetFooter className="border-t px-5 py-4">
          <SheetClose render={<Button variant="brand" size="lg" className="w-full" />}>
            {t("pubui.vets.showResults")}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** The results' sort order, kept in the URL (`?sort=`; "recommended" is the default and stays out). */
export function VetSortSelect() {
  const t = useT();
  const { params, update, pending } = useVetParams();
  const sort = parseVetSort(params.get("sort"));
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="vet-sort" className="shrink-0 text-sm text-muted-foreground max-sm:sr-only">
        {t("pubui.vets.sortLabel")}
      </label>
      <NativeSelect
        id="vet-sort"
        value={sort}
        aria-busy={pending}
        onChange={(e) => {
          const next = parseVetSort(e.target.value);
          update({ sort: next === DEFAULT_VET_SORT ? null : next });
        }}
        className="w-auto max-w-[11rem] sm:max-w-none"
      >
        {VET_SORTS.map((s) => (
          <option key={s} value={s}>
            {t(`pubui.vets.sort.${s}`)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
