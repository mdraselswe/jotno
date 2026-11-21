"use client";

import { LocateFixed, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { AreaPicker } from "@/components/forms/area-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SPECIES } from "@/content/geo";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

/** Search filters; every change is written to the URL (shareable, back button works). */
export function VetFilters() {
  const t = useT();
  const locale = useLocale();
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

  function locate() {
    if (!("geolocation" in navigator)) return toast.error(t("vets.nearMeFailed"));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        update({
          near: `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`,
          district: null,
          area: null,
        }),
      () => toast.error(t("vets.nearMeFailed")),
      { timeout: 10_000 },
    );
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
          onClick={near ? () => update({ near: null }) : locate}
        >
          {near ? <X aria-hidden="true" /> : <LocateFixed aria-hidden="true" />}
          {t("vets.nearMe")}
        </Button>
        <label className="flex items-center gap-2 rounded-(--control-radius) border-(length:--border-w) px-3 py-1.5 text-sm">
          <Switch
            checked={params.get("now") === "1"}
            onCheckedChange={(c) => update({ now: c ? "1" : null })}
          />
          {t("vets.onlyOnline")}
        </label>
      </div>

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
                "rounded-full border-(length:--border-w) px-3 py-1.5 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
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
