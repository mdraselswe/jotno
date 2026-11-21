"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DISTRICTS } from "@/content/geo";
import type { Area } from "@/content/geo-areas";
import { useLocale, useT } from "@/i18n/client";

/**
 * District → area (thana/upazila) picker. Districts are bundled (64); areas
 * load on demand the first time a district is chosen.
 */
export function AreaPicker({
  idPrefix,
  districtId,
  areaId,
  onChange,
  required,
  nameDistrict,
  nameArea,
}: {
  idPrefix: string;
  districtId: number | null;
  areaId: number | null;
  onChange: (value: { districtId: number | null; areaId: number | null }) => void;
  required?: boolean;
  nameDistrict?: string;
  nameArea?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [areas, setAreas] = useState<readonly Area[] | null>(null);

  useEffect(() => {
    if (!districtId || areas) return;
    let alive = true;
    void import("@/content/geo-areas").then((m) => {
      if (alive) setAreas(m.AREAS);
    });
    return () => {
      alive = false;
    };
  }, [districtId, areas]);

  const name = (x: { en: string; bn: string }) => (locale === "bn" ? x.bn : x.en);
  const options = districtId && areas ? areas.filter((a) => a.d === districtId) : [];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-district`}>{t("common.district")}</Label>
        <NativeSelect
          id={`${idPrefix}-district`}
          name={nameDistrict}
          required={required}
          value={districtId ?? ""}
          onChange={(e) =>
            onChange({ districtId: e.target.value ? Number(e.target.value) : null, areaId: null })
          }
        >
          <option value="">{t("common.chooseDistrict")}</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {name(d)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-area`}>{t("common.area")}</Label>
        <NativeSelect
          id={`${idPrefix}-area`}
          name={nameArea}
          value={areaId ?? ""}
          disabled={!districtId}
          onChange={(e) => onChange({ districtId, areaId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">{t("common.chooseArea")}</option>
          {options.map((a) => (
            <option key={a.id} value={a.id}>
              {name(a)}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
