"use client";

import { Camera, HeartPulse, NotebookPen, PawPrint } from "lucide-react";
import type { Route } from "next";
import { useState, useTransition, type FormEvent } from "react";
import { SectionCard } from "@/components/layout/app-ui";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { BREEDS, SPECIES } from "@/content/geo";
import { ImageUpload } from "@/features/uploads";
import type { MessageKey } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { SEX_KEYS } from "../kinds";
import { savePet, type PetInput } from "../server/actions";

export interface PetFormValues {
  id: string | null;
  name: string;
  speciesId: number | null;
  breedId: number | null;
  sex: "male" | "female" | "unknown";
  birthDate: string | null;
  weightKg: number | null;
  color: string | null;
  notes: string | null;
  photoPath: string | null;
}

export const EMPTY_PET: PetFormValues = {
  id: null,
  name: "",
  speciesId: null,
  breedId: null,
  sex: "unknown",
  birthDate: null,
  weightKg: null,
  color: null,
  notes: null,
  photoPath: null,
};

type Field = "name" | "species" | "birth" | "weight";

/** Client checks that mirror the server schema (the server checks again). */
function validate(v: PetFormValues, today: string | undefined): Partial<Record<Field, MessageKey>> {
  const errors: Partial<Record<Field, MessageKey>> = {};
  if (v.name.trim().length === 0) errors.name = "ownerui.form.nameRequired";
  if (!v.speciesId) errors.species = "pets.chooseSpecies";
  if (v.birthDate && today && v.birthDate > today) errors.birth = "ownerui.form.birthFuture";
  if (v.weightKg != null && (!Number.isFinite(v.weightKg) || v.weightKg < 0 || v.weightKg > 2000))
    errors.weight = "ownerui.form.weightInvalid";
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export function PetForm({
  initial,
  today,
  cancelHref,
}: {
  initial: PetFormValues;
  /** Today in Dhaka ("YYYY-MM-DD"), from the server: the latest birthday allowed. */
  today?: string;
  /** Where Cancel goes (the pet's page or the list). */
  cancelHref?: Route;
}) {
  const t = useT();
  const locale = useLocale();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, MessageKey>>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // A photo still uploading would be left out of the saved pet.
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof PetFormValues>(key: K, value: PetFormValues[K]) =>
    setV((s) => ({ ...s, [key]: value }));
  const label = (x: { en: string; bn: string }) => (locale === "bn" ? x.bn : x.en);
  const breeds = BREEDS.filter((b) => b.sp === v.speciesId);
  const err = (f: Field) => (errors[f] ? t(errors[f]) : undefined);
  const invalid = (f: Field) =>
    errors[f] ? { "aria-invalid": true, "aria-describedby": `pet-${f}-err` } : {};

  function submit(e: FormEvent) {
    e.preventDefault();
    if (pending || uploading) return;
    const found = validate(v, today);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setError(t("ownerui.form.fixErrors"));
      const first = (["name", "species", "birth", "weight"] as const).find((f) => found[f]);
      if (first) document.getElementById(`pet-${first}`)?.focus();
      return;
    }
    setError(null);
    const input: PetInput = {
      name: v.name,
      speciesId: v.speciesId ?? 0,
      breedId: v.breedId,
      sex: v.sex,
      birthDate: v.birthDate || null,
      weightKg: v.weightKg,
      color: v.color,
      notes: v.notes,
      photoPath: v.photoPath,
    };
    start(async () => {
      // Success redirects to the pet's page on the server.
      const result = await savePet(locale, v.id, input);
      if (result && !result.ok) setError(t(result.error));
    });
  }

  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-5" noValidate>
      <SectionCard title={t("ownerui.form.photo")} description={t("ownerui.form.photoHint")} icon={Camera}>
        <ImageUpload
          kind="pet"
          value={v.photoPath}
          onChange={(p) => set("photoPath", p)}
          onBusyChange={setUploading}
          shape="circle"
        />
      </SectionCard>

      <SectionCard
        title={t("ownerui.form.basics")}
        description={t("ownerui.form.basicsHint")}
        icon={PawPrint}
        bodyClassName="grid gap-5"
      >
        <div className="grid gap-2">
          <Label htmlFor="pet-name">{t("pets.name")}</Label>
          <Input
            id="pet-name"
            required
            maxLength={40}
            autoComplete="off"
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            {...invalid("name")}
          />
          <FieldError id="pet-name-err" message={err("name")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="pet-species">{t("common.species")}</Label>
            <NativeSelect
              id="pet-species"
              required
              value={v.speciesId ?? ""}
              onChange={(e) =>
                setV((s) => ({ ...s, speciesId: Number(e.target.value) || null, breedId: null }))
              }
              {...invalid("species")}
            >
              <option value="">{t("common.chooseSpecies")}</option>
              {SPECIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {label(s)}
                </option>
              ))}
            </NativeSelect>
            <FieldError id="pet-species-err" message={err("species")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pet-breed">{t("pets.breed")}</Label>
            <NativeSelect
              id="pet-breed"
              disabled={breeds.length === 0}
              value={v.breedId ?? ""}
              onChange={(e) => set("breedId", Number(e.target.value) || null)}
            >
              <option value="">{t("pets.breedUnknown")}</option>
              {breeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {label(b)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{t("pets.sex")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["female", "male", "unknown"] as const).map((sx) => (
              <label
                key={sx}
                className={cn(
                  "grid h-(--control-h-lg) cursor-pointer place-items-center rounded-(--control-radius) bg-card px-2 text-center text-sm font-medium shadow-(--shadow-control) ring-1 ring-foreground/10 transition-[background-color,box-shadow] duration-(--motion-fast) has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  v.sex === sx && "bg-primary/8 text-primary ring-2 ring-primary",
                )}
              >
                <input
                  type="radio"
                  name="sex"
                  className="sr-only"
                  checked={v.sex === sx}
                  onChange={() => set("sex", sx)}
                />
                {t(SEX_KEYS[sx])}
              </label>
            ))}
          </div>
        </fieldset>
      </SectionCard>

      <SectionCard
        title={t("ownerui.form.details")}
        description={t("ownerui.form.detailsHint")}
        icon={HeartPulse}
        bodyClassName="grid gap-4 sm:grid-cols-3"
      >
        <div className="grid content-start gap-2">
          <Label htmlFor="pet-birth">{t("pets.birthDate")}</Label>
          <Input
            id="pet-birth"
            type="date"
            max={today}
            value={v.birthDate ?? ""}
            onChange={(e) => set("birthDate", e.target.value || null)}
            {...invalid("birth")}
          />
          <FieldError id="pet-birth-err" message={err("birth")} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="pet-weight">{t("pets.weight")}</Label>
          <Input
            id="pet-weight"
            type="number"
            inputMode="decimal"
            min={0}
            max={2000}
            step="0.1"
            value={v.weightKg ?? ""}
            onChange={(e) => set("weightKg", e.target.value === "" ? null : Number(e.target.value))}
            {...invalid("weight")}
          />
          <FieldError id="pet-weight-err" message={err("weight")} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="pet-color">{t("pets.color")}</Label>
          <Input
            id="pet-color"
            maxLength={40}
            value={v.color ?? ""}
            onChange={(e) => set("color", e.target.value)}
          />
        </div>
      </SectionCard>

      <SectionCard title={t("pets.notes")} description={t("ownerui.form.notesHint")} icon={NotebookPen}>
        <Label htmlFor="pet-notes" className="sr-only">
          {t("pets.notes")}
        </Label>
        <Textarea
          id="pet-notes"
          rows={4}
          maxLength={1000}
          value={v.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder={t("pets.notesHint")}
        />
      </SectionCard>

      {/* Save bar: floats above the tab bar on phones, sticks to the bottom on desktop. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 grid gap-2 rounded-(--radius-2xl) bg-card/95 p-3 shadow-(--shadow-card-hover) ring-1 ring-foreground/8 backdrop-blur md:bottom-4">
        {error ? (
          <p role="alert" className="px-1 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          {cancelHref ? (
            <ButtonLink href={cancelHref} variant="ghost" size="lg">
              {t("common.cancel")}
            </ButtonLink>
          ) : null}
          <Button
            type="submit"
            variant="brand"
            size="lg"
            disabled={pending || uploading}
            className="max-sm:flex-1"
          >
            {pending ? t("common.saving") : uploading ? t("common.uploading") : t("common.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
