"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ROUTES } from "@/config/routes";
import { DISTRICTS, SPECIES } from "@/content/geo";
import { useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";

/** Hero search: which animal, which district → the vet list. */
export function HomeSearch() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [species, setSpecies] = useState("");
  const [district, setDistrict] = useState("");
  return (
    <form
      role="search"
      className="grid gap-2 rounded-(--radius-2xl) bg-card p-2 shadow-(--shadow-card) sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const qs = new URLSearchParams();
        if (species) qs.set("species", species);
        if (district) qs.set("district", district);
        const base = localeHref(locale, ROUTES.vets);
        router.push((qs.size > 0 ? `${base}/?${qs.toString()}` : base) as never);
      }}
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
      <Button type="submit" size="lg">
        <Search aria-hidden="true" />
        {t("home.findVet")}
      </Button>
    </form>
  );
}
