"use client";

import {
  Check,
  GraduationCap,
  HeartPulse,
  House,
  LocateFixed,
  MapPin,
  PawPrint,
  Siren,
  UserRound,
  Wallet,
} from "lucide-react";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AreaPicker } from "@/components/forms/area-picker";
import { SectionCard } from "@/components/layout/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { business } from "@/config";
import { SPECIES } from "@/content/geo";
import { ImageUpload } from "@/features/uploads";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { locate as findPosition, type LocateError } from "@/lib/geo";
import { taka, toPoisha } from "@/lib/money";
import { cn } from "@/lib/utils";
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
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-pretty text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Ids of the form's cards: the dashboard checklist links to them (vet-checklist.tsx). */
const SECTION = {
  basics: "vp-basic",
  creds: "vp-cred",
  place: "vp-place",
  fees: "vp-fees",
  services: "vp-services",
} as const;

/**
 * The vet's profile, grouped into cards (photo and basics, registration,
 * clinic and location, fees, services), with a save bar that stays in reach
 * on phones. `providerId` set: an admin is editing someone else's profile.
 */
export function VetProfileForm({ initial, providerId }: { initial: VetProfileValues; providerId?: string }) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [tried, setTried] = useState(false);
  const [pending, start] = useTransition();
  const [locating, setLocating] = useState(false);
  const set = <K extends keyof VetProfileValues>(k: K, value: VetProfileValues[K]) =>
    setV((s) => ({ ...s, [k]: value }));
  const text = (k: keyof VetProfileValues) => ({
    value: String(v[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(k, e.target.value as never),
  });

  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  const consultFee = toPoisha(v.consultFeeTaka || 0);
  const visitFee = toPoisha(v.visitFeeTaka || 0);
  const experience = v.experienceYears === "" ? null : Number(v.experienceYears);
  const { minFee, maxFee, commissionBps } = business.consult;
  const errors = {
    name: v.displayName.trim().length < 3 ? t("vetui.err.name") : null,
    consultFee:
      consultFee === null || consultFee < minFee || consultFee > maxFee
        ? t("vetui.err.fee", { min: taka(fmt, minFee), max: taka(fmt, maxFee) })
        : null,
    visitFee: visitFee === null ? t("vet.invalid") : null,
    experience:
      experience !== null && (!Number.isInteger(experience) || experience < 0 || experience > 70)
        ? t("vetui.err.experience")
        : null,
  };
  const shown = (e: string | null) => (tried ? e : null);
  const invalid = Object.values(errors).some(Boolean);
  const described = (id: string, error: string | null, hint = true) =>
    [shown(error) ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;

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
    setTried(true);
    if (invalid) {
      toast.error(t("vetui.save.fixFirst"));
      return;
    }
    const snapshot = v;
    start(async () => {
      const input = {
        displayName: snapshot.displayName,
        title: snapshot.title,
        bio: snapshot.bio,
        qualifications: snapshot.qualifications,
        registrationNo: snapshot.registrationNo,
        experienceYears: experience,
        consultFee: consultFee ?? 0,
        visitFee: visitFee ?? 0,
        clinicName: snapshot.clinicName,
        address: snapshot.address,
        districtId: snapshot.districtId,
        areaId: snapshot.areaId,
        lat: snapshot.lat,
        lon: snapshot.lon,
        phonePublic: snapshot.phonePublic,
        emergency24x7: snapshot.emergency24x7,
        homeVisit: snapshot.homeVisit,
        photoPath: snapshot.photoPath,
        speciesIds: snapshot.speciesIds,
      };
      const r = providerId
        ? await adminSaveVetProfile(locale, providerId, input)
        : await saveVetProfile(locale, input);
      if (r.ok) {
        setSaved(snapshot);
        toast.success(t("common.saved"));
      } else toast.error(t(r.error));
    });
  }

  const youGet =
    consultFee !== null && !errors.consultFee
      ? t("vetui.fee.youGet", {
          amount: taka(fmt, Math.round((consultFee * (10_000 - commissionBps)) / 10_000)),
          pct: fmt.number(commissionBps / 100),
        })
      : null;

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div id={SECTION.basics} className="scroll-mt-24">
        <SectionCard title={t("vet.basics")} description={t("vetui.sec.basicsHint")} icon={UserRound}>
          <div className="grid gap-5">
            <ImageUpload
              kind="vetPhoto"
              value={v.photoPath}
              onChange={(p) => set("photoPath", p)}
              shape="circle"
              label={t("vet.photo")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="vp-name"
                label={t("vet.displayName")}
                hint={t("vet.displayNameHint")}
                error={shown(errors.name)}
              >
                <Input
                  id="vp-name"
                  required
                  maxLength={80}
                  autoComplete="name"
                  aria-invalid={shown(errors.name) ? true : undefined}
                  aria-describedby={described("vp-name", errors.name)}
                  {...text("displayName")}
                />
              </Field>
              <Field id="vp-title" label={t("vet.titleField")} hint={t("vet.titleHint")}>
                <Input id="vp-title" maxLength={80} aria-describedby="vp-title-hint" {...text("title")} />
              </Field>
            </div>
            <Field id="vp-bio" label={t("vet.bio")} hint={t("vet.bioHint")}>
              <Textarea
                id="vp-bio"
                rows={5}
                maxLength={2000}
                aria-describedby="vp-bio-hint"
                {...text("bio")}
              />
            </Field>
          </div>
        </SectionCard>
      </div>

      <div id={SECTION.creds} className="scroll-mt-24">
        <SectionCard title={t("vet.credentials")} description={t("vetui.sec.credsHint")} icon={GraduationCap}>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="vp-reg" label={t("vet.registrationNo")} hint={t("vet.registrationHint")}>
                <Input
                  id="vp-reg"
                  maxLength={40}
                  inputMode="text"
                  aria-describedby="vp-reg-hint"
                  {...text("registrationNo")}
                />
              </Field>
              <Field id="vp-exp" label={t("vet.experience")} error={shown(errors.experience)}>
                <Input
                  id="vp-exp"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={70}
                  aria-invalid={shown(errors.experience) ? true : undefined}
                  aria-describedby={described("vp-exp", errors.experience, false)}
                  {...text("experienceYears")}
                />
              </Field>
            </div>
            <Field id="vp-qual" label={t("vet.qualifications")} hint={t("vet.qualificationsHint")}>
              <Input
                id="vp-qual"
                maxLength={500}
                aria-describedby="vp-qual-hint"
                {...text("qualifications")}
              />
            </Field>
          </div>
        </SectionCard>
      </div>

      <div id={SECTION.place} className="scroll-mt-24">
        <SectionCard title={t("vet.where")} description={t("vetui.sec.placeHint")} icon={MapPin}>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="vp-clinic" label={t("vet.clinicName")}>
                <Input id="vp-clinic" maxLength={120} {...text("clinicName")} />
              </Field>
              <Field id="vp-phone" label={t("vet.phonePublic")} hint={t("vet.phonePublicHint")}>
                <Input
                  id="vp-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                  aria-describedby="vp-phone-hint"
                  {...text("phonePublic")}
                />
              </Field>
            </div>
            <Field id="vp-address" label={t("vet.address")}>
              <Input id="vp-address" maxLength={300} autoComplete="street-address" {...text("address")} />
            </Field>
            <AreaPicker
              idPrefix="vp"
              districtId={v.districtId}
              areaId={v.areaId}
              onChange={(place) => setV((s) => ({ ...s, ...place }))}
            />
            <div className="flex flex-wrap items-center gap-3 rounded-(--radius-xl) bg-muted/50 p-3">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full",
                  v.lat != null ? "bg-success/15 text-success" : "bg-card text-muted-foreground",
                )}
              >
                {v.lat != null ? <Check className="size-4" /> : <MapPin className="size-4" />}
              </span>
              <p
                className="min-w-0 flex-1 basis-48 text-xs text-pretty text-muted-foreground"
                aria-live="polite"
              >
                {v.lat != null ? t("vet.locationSet") : t("vet.locationHint")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={locate}
                disabled={locating}
                className="max-sm:w-full"
              >
                <LocateFixed aria-hidden="true" />
                {locating ? t("vets.locating") : t("vet.useLocation")}
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>

      <div id={SECTION.fees} className="scroll-mt-24">
        <SectionCard title={t("vet.fees")} description={t("vetui.sec.feesHint")} icon={Wallet}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="vp-cfee"
              label={t("vet.consultFee")}
              hint={
                <>
                  {t("vet.consultFeeHint")}
                  {youGet ? <span className="mt-1 block font-medium text-foreground">{youGet}</span> : null}
                </>
              }
              error={shown(errors.consultFee)}
            >
              <Input
                id="vp-cfee"
                type="number"
                inputMode="numeric"
                min={minFee / 100}
                max={maxFee / 100}
                aria-invalid={shown(errors.consultFee) ? true : undefined}
                aria-describedby={described("vp-cfee", errors.consultFee)}
                {...text("consultFeeTaka")}
              />
            </Field>
            <Field
              id="vp-vfee"
              label={t("vet.visitFee")}
              hint={t("vet.visitFeeHint")}
              error={shown(errors.visitFee)}
            >
              <Input
                id="vp-vfee"
                type="number"
                inputMode="numeric"
                min={0}
                aria-invalid={shown(errors.visitFee) ? true : undefined}
                aria-describedby={described("vp-vfee", errors.visitFee)}
                {...text("visitFeeTaka")}
              />
            </Field>
          </div>
        </SectionCard>
      </div>

      <div id={SECTION.services} className="scroll-mt-24">
        <SectionCard
          title={t("vetui.sec.services")}
          description={t("vetui.sec.servicesHint")}
          icon={HeartPulse}
        >
          <div className="grid gap-5">
            <fieldset className="grid gap-2">
              <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
                <PawPrint aria-hidden="true" className="size-4 text-primary" />
                {t("vet.species")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {SPECIES.map((s) => {
                  const on = v.speciesIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-medium ring-1 transition-colors duration-(--motion-fast) select-none has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                        on
                          ? "bg-primary text-primary-foreground ring-primary"
                          : "bg-card text-foreground/80 ring-foreground/12 hover:bg-muted/60",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() =>
                          set(
                            "speciesIds",
                            on ? v.speciesIds.filter((x) => x !== s.id) : [...v.speciesIds, s.id],
                          )
                        }
                      />
                      {on ? <Check aria-hidden="true" className="size-3.5" /> : null}
                      {locale === "bn" ? s.bn : s.en}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleRow
                icon={Siren}
                label={t("vet.emergency")}
                checked={v.emergency24x7}
                onChange={(c) => set("emergency24x7", c)}
              />
              <ToggleRow
                icon={House}
                label={t("vet.homeVisit")}
                checked={v.homeVisit}
                onChange={(c) => set("homeVisit", c)}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 md:bottom-4">
        <div className="flex flex-wrap items-center gap-3 rounded-(--radius-2xl) bg-card/95 p-3 shadow-(--shadow-card-hover) ring-1 ring-foreground/8 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4">
          <p className="flex min-w-0 flex-1 items-center gap-2 text-sm" aria-live="polite">
            <span
              aria-hidden="true"
              className={cn("size-2 shrink-0 rounded-full", dirty ? "bg-warning" : "bg-success")}
            />
            <span className="truncate text-muted-foreground">
              {dirty ? t("vetui.save.unsaved") : t("vetui.save.saved")}
            </span>
          </p>
          <Button type="submit" variant="brand" size="lg" disabled={pending} className="max-sm:flex-1">
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof Siren;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-(--radius-xl) bg-muted/50 px-3 py-2 text-sm">
      <Icon aria-hidden="true" className="size-4.5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
