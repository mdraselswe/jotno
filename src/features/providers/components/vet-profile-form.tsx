"use client";

import { LocateFixed } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { AreaPicker } from "@/components/forms/area-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SPECIES } from "@/content/geo";
import { ImageUpload } from "@/features/uploads";
import { useLocale, useT } from "@/i18n/client";
import { locate as findPosition, type LocateError } from "@/lib/geo";
import { adminSaveVetProfile, saveVetProfile } from "../server/actions";

export interface VetProfileValues {
  displayName: string;
  title: string;
  bio: string;
  qualifications: string;
  registrationNo: string;
  experienceYears: string;
  consultFeeTaka: string;
  visitFeeTaka: string;
  clinicName: string;
  address: string;
  districtId: number | null;
  areaId: number | null;
  lat: number | null;
  lon: number | null;
  phonePublic: string;
  emergency24x7: boolean;
  homeVisit: boolean;
  photoPath: string | null;
  speciesIds: number[];
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** `providerId` set: an admin is editing someone else's profile. */
export function VetProfileForm({ initial, providerId }: { initial: VetProfileValues; providerId?: string }) {
  const t = useT();
  const locale = useLocale();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [locating, setLocating] = useState(false);
  const set = <K extends keyof VetProfileValues>(k: K, value: VetProfileValues[K]) =>
    setV((s) => ({ ...s, [k]: value }));
  const text = (k: keyof VetProfileValues) => ({
    value: String(v[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(k, e.target.value as never),
  });

  function locate() {
    setLocating(true);
    findPosition()
      .then((pos) => {
        setV((s) => ({ ...s, lat: pos.lat, lon: pos.lon }));
        toast.success(t("vet.located"));
      })
      .catch((reason: LocateError) => toast.error(t(`vets.locate.${reason}`)))
      .finally(() => setLocating(false));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const input = {
        displayName: v.displayName,
        title: v.title,
        bio: v.bio,
        qualifications: v.qualifications,
        registrationNo: v.registrationNo,
        experienceYears: v.experienceYears === "" ? null : Number(v.experienceYears),
        consultFee: Math.round(Number(v.consultFeeTaka || 0) * 100),
        visitFee: Math.round(Number(v.visitFeeTaka || 0) * 100),
        clinicName: v.clinicName,
        address: v.address,
        districtId: v.districtId,
        areaId: v.areaId,
        lat: v.lat,
        lon: v.lon,
        phonePublic: v.phonePublic,
        emergency24x7: v.emergency24x7,
        homeVisit: v.homeVisit,
        photoPath: v.photoPath,
        speciesIds: v.speciesIds,
      };
      const r = providerId
        ? await adminSaveVetProfile(locale, providerId, input)
        : await saveVetProfile(locale, input);
      if (r.ok) toast.success(t("common.saved"));
      else toast.error(t(r.error));
    });
  }

  const section = "grid gap-4 rounded-(--radius-2xl) bg-card shadow-(--shadow-card) p-(--card-pad)";
  const heading = "font-heading text-lg font-semibold";

  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-6" noValidate>
      <section className={section} aria-labelledby="vp-basic">
        <h2 id="vp-basic" className={heading}>
          {t("vet.basics")}
        </h2>
        <ImageUpload
          kind="vetPhoto"
          value={v.photoPath}
          onChange={(p) => set("photoPath", p)}
          shape="circle"
          label={t("vet.photo")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="vp-name" label={t("vet.displayName")} hint={t("vet.displayNameHint")}>
            <Input id="vp-name" required maxLength={80} {...text("displayName")} />
          </Field>
          <Field id="vp-title" label={t("vet.titleField")} hint={t("vet.titleHint")}>
            <Input id="vp-title" maxLength={80} {...text("title")} />
          </Field>
        </div>
        <Field id="vp-bio" label={t("vet.bio")} hint={t("vet.bioHint")}>
          <Textarea id="vp-bio" rows={5} maxLength={2000} {...text("bio")} />
        </Field>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{t("vet.species")}</legend>
          <div className="flex flex-wrap gap-2">
            {SPECIES.map((s) => {
              const on = v.speciesIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm shadow-(--shadow-control) has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() =>
                      set("speciesIds", on ? v.speciesIds.filter((x) => x !== s.id) : [...v.speciesIds, s.id])
                    }
                  />
                  {locale === "bn" ? s.bn : s.en}
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className={section} aria-labelledby="vp-cred">
        <h2 id="vp-cred" className={heading}>
          {t("vet.credentials")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="vp-reg" label={t("vet.registrationNo")} hint={t("vet.registrationHint")}>
            <Input id="vp-reg" maxLength={40} {...text("registrationNo")} />
          </Field>
          <Field id="vp-exp" label={t("vet.experience")}>
            <Input
              id="vp-exp"
              type="number"
              inputMode="numeric"
              min={0}
              max={70}
              {...text("experienceYears")}
            />
          </Field>
        </div>
        <Field id="vp-qual" label={t("vet.qualifications")} hint={t("vet.qualificationsHint")}>
          <Input id="vp-qual" maxLength={500} {...text("qualifications")} />
        </Field>
      </section>

      <section className={section} aria-labelledby="vp-place">
        <h2 id="vp-place" className={heading}>
          {t("vet.where")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="vp-clinic" label={t("vet.clinicName")}>
            <Input id="vp-clinic" maxLength={120} {...text("clinicName")} />
          </Field>
          <Field id="vp-phone" label={t("vet.phonePublic")} hint={t("vet.phonePublicHint")}>
            <Input id="vp-phone" type="tel" maxLength={20} {...text("phonePublic")} />
          </Field>
        </div>
        <Field id="vp-address" label={t("vet.address")}>
          <Input id="vp-address" maxLength={300} {...text("address")} />
        </Field>
        <AreaPicker
          idPrefix="vp"
          districtId={v.districtId}
          areaId={v.areaId}
          onChange={(place) => setV((s) => ({ ...s, ...place }))}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating}>
            <LocateFixed aria-hidden="true" />
            {t("vet.useLocation")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {v.lat != null ? t("vet.locationSet") : t("vet.locationHint")}
          </span>
        </div>
        <div className="grid gap-3">
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>{t("vet.emergency")}</span>
            <Switch checked={v.emergency24x7} onCheckedChange={(c) => set("emergency24x7", c)} />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>{t("vet.homeVisit")}</span>
            <Switch checked={v.homeVisit} onCheckedChange={(c) => set("homeVisit", c)} />
          </label>
        </div>
      </section>

      <section className={section} aria-labelledby="vp-fees">
        <h2 id="vp-fees" className={heading}>
          {t("vet.fees")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="vp-cfee" label={t("vet.consultFee")} hint={t("vet.consultFeeHint")}>
            <Input id="vp-cfee" type="number" inputMode="numeric" min={0} {...text("consultFeeTaka")} />
          </Field>
          <Field id="vp-vfee" label={t("vet.visitFee")} hint={t("vet.visitFeeHint")}>
            <Input id="vp-vfee" type="number" inputMode="numeric" min={0} {...text("visitFeeTaka")} />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 md:bottom-4">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
