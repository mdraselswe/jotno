"use client";

import { LoaderCircle, LocateFixed, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { AreaPicker } from "@/components/forms/area-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SPECIES } from "@/content/geo";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { DEFAULT_RADIUS_KM, locate, NEAR_RADII, parseRadius, type LocateError } from "@/lib/geo";
import { cn } from "@/lib/utils";

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

/** Search filters; every change is written to the URL (shareable, back button works). */
export function VetFilters() {
  const t = useT();
  const locale = useLocale();
  const fmt = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();
  const species = params.get("species");
  const near = params.get("near");

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}` as never, { scroll: false }));
  }

  const [locating, setLocating] = useState(false);
  const radius = parseRadius(params.get("r"));

  function findMe() {
    setLocating(true);
    locate()
      .then((pos) =>
        update({
          near: `${pos.lat.toFixed(4)},${pos.lon.toFixed(4)}`,
          district: null,
          area: null,
        }),
      )
      .catch((reason: LocateError) => toast.error(t(`vets.locate.${reason}`)))
      .finally(() => setLocating(false));
  }

  return (
    <div className={cn("grid gap-4 transition-opacity", pending && "opacity-70")} aria-busy={pending}>
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          update({ q: q.trim() || null });
        }}
      >
        <label htmlFor="vet-q" className="sr-only">
          {t("common.search")}
        </label>
        <Input
          id="vet-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("vets.searchPlaceholder")}
          className="flex-1"
        />
        <Button type="submit" size="icon" aria-label={t("common.search")}>
          <Search aria-hidden="true" />
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={near ? "default" : "outline"}
          size="sm"
          onClick={near ? () => update({ near: null, r: null }) : findMe}
          disabled={locating}
          aria-busy={locating}
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
        <label className="flex items-center gap-2 rounded-(--control-radius) bg-card px-3 py-1.5 text-sm shadow-(--shadow-control)">
          <Switch
            checked={params.get("now") === "1"}
            onCheckedChange={(c) => update({ now: c ? "1" : null })}
          />
          {t("vets.onlyOnline")}
        </label>
      </div>

      {near ? (
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">{t("vets.radius")}</legend>
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
                  "rounded-full px-3 py-1.5 text-sm font-medium shadow-(--shadow-control) transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  on ? "bg-foreground text-background" : "bg-card hover:bg-muted",
                )}
              >
                {t("vets.km", { n: fmt.number(km) })}
              </button>
            );
          })}
        </fieldset>
      ) : null}

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{t("common.species")}</legend>
        {SPECIES.map((s) => {
          const on = species === s.slug;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => update({ species: on ? null : s.slug })}
              className={cn(
                "rounded-full bg-card px-3 py-1.5 text-sm shadow-(--shadow-control) transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {locale === "bn" ? s.bn : s.en}
            </button>
          );
        })}
      </fieldset>

      {!near ? (
        <AreaPicker
          idPrefix="vf"
          districtId={num(params.get("district"))}
          areaId={num(params.get("area"))}
          onChange={(p) =>
            update({
              district: p.districtId ? String(p.districtId) : null,
              area: p.areaId ? String(p.areaId) : null,
            })
          }
        />
      ) : null}
    </div>
  );
}
