"use client";

import { MapPin, MessagesSquare, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ROUTES } from "@/config/routes";
import { DISTRICTS, SPECIES } from "@/content/geo";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { localeHref } from "@/lib/locale-href";

type Mode = "online" | "clinic";

/**
 * Hero search with two paths. Online: no place needed (a chat works from
 * anywhere), the list ranks vets online now first. Clinic visit: the district
 * matters, so it asks for one.
 */
export function HomeSearch() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("online");
  const [species, setSpecies] = useState("");
  const [district, setDistrict] = useState("");
  const clinic = mode === "clinic";
  const modes: { value: Mode; label: string; Icon: typeof Search }[] = [
    { value: "online", label: t("home.modeOnline"), Icon: MessagesSquare },
    { value: "clinic", label: t("home.modeClinic"), Icon: MapPin },
  ];

  return (
    <form
      role="search"
      className="grid gap-2 rounded-(--radius-2xl) bg-card p-2 shadow-(--shadow-card)"
      onSubmit={(e) => {
        e.preventDefault();
        const qs = new URLSearchParams();
        if (species) qs.set("species", species);
        if (clinic && district) qs.set("district", district);
        const base = localeHref(locale, ROUTES.vets);
        router.push((qs.size > 0 ? `${base}/?${qs.toString()}` : base) as never);
      }}
    >
      <div
        role="group"
        aria-label={t("home.mode")}
        className="grid grid-cols-2 gap-1 rounded-(--radius-xl) bg-muted p-1"
      >
        {modes.map(({ value, label, Icon }) => {
          const on = mode === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => setMode(value)}
              className={cn(
                "inline-flex h-9 items-center justify-center gap-2 rounded-(--radius-lg) text-sm font-semibold transition-colors duration-(--motion-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                on
                  ? "bg-card text-foreground shadow-(--shadow-control)"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className={cn("size-4", on && "text-primary")} />
              {label}
            </button>
          );
        })}
      </div>
      <div
        className={cn("grid gap-2", clinic ? "sm:grid-cols-[1fr_1.35fr_auto]" : "sm:grid-cols-[1fr_auto]")}
      >
        <NativeSelect
          aria-label={t("common.species")}
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
        >
          <option value="">{t("home.anyPet")}</option>
          {SPECIES.map((s) => (
            <option key={s.id} value={s.slug}>
              {locale === "bn" ? s.bn : s.en}
            </option>
          ))}
        </NativeSelect>
        {clinic ? (
          <NativeSelect
            aria-label={t("common.district")}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="">{t("home.anywhere")}</option>
            {DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {locale === "bn" ? d.bn : d.en}
              </option>
            ))}
          </NativeSelect>
        ) : null}
        <Button type="submit" size="lg" variant="brand">
          <Search aria-hidden="true" />
          {clinic ? t("home.findClinic") : t("home.findOnline")}
        </Button>
      </div>
      <p className="px-2 pb-1 text-xs text-pretty text-muted-foreground" aria-live="polite">
        {clinic ? t("home.clinicHint") : t("home.onlineHint")}
      </p>
    </form>
  );
}
