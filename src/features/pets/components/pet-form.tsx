"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { BREEDS, SPECIES } from "@/content/geo";
import { ImageUpload } from "@/features/uploads";
import { useLocale, useT } from "@/i18n/client";
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

const SEX_KEYS = { female: "pets.sexFemale", male: "pets.sexMale", unknown: "pets.sexUnknown" } as const;

export function PetForm({ initial }: { initial: PetFormValues }) {
  const t = useT();
  const locale = useLocale();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof PetFormValues>(key: K, value: PetFormValues[K]) =>
    setV((s) => ({ ...s, [key]: value }));
  const label = (x: { en: string; bn: string }) => (locale === "bn" ? x.bn : x.en);
  const breeds = BREEDS.filter((b) => b.sp === v.speciesId);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!v.speciesId) {
      setError(t("pets.chooseSpecies"));
      return;
    }
    setError(null);
    const input: PetInput = {
      name: v.name,
      speciesId: v.speciesId,
      breedId: v.breedId,
      sex: v.sex,
      birthDate: v.birthDate || null,
      weightKg: v.weightKg,
      color: v.color,
      notes: v.notes,
      photoPath: v.photoPath,
    };
    start(async () => {
      const result = await savePet(locale, v.id, input);
      if (result && !result.ok) setError(t(result.error));
    });
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-6" noValidate>
      <ImageUpload kind="pet" value={v.photoPath} onChange={(p) => set("photoPath", p)} shape="circle" />
      <div className="grid gap-2">
        <Label htmlFor="pet-name">{t("pets.name")}</Label>
        <Input
          id="pet-name"
          required
          maxLength={40}
          value={v.name}
          onChange={(e) => set("name", e.target.value)}
        />
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
          >
            <option value="">{t("common.chooseSpecies")}</option>
            {SPECIES.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </NativeSelect>
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
        <div className="flex flex-wrap gap-2">
          {(["female", "male", "unknown"] as const).map((sx) => (
            <label
              key={sx}
              className="flex cursor-pointer items-center gap-2 rounded-(--control-radius) border-(length:--border-w) px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="pet-birth">{t("pets.birthDate")}</Label>
          <Input
            id="pet-birth"
            type="date"
            value={v.birthDate ?? ""}
            onChange={(e) => set("birthDate", e.target.value || null)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pet-weight">{t("pets.weight")}</Label>
          <Input
            id="pet-weight"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={v.weightKg ?? ""}
            onChange={(e) => set("weightKg", e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pet-color">{t("pets.color")}</Label>
          <Input
            id="pet-color"
            maxLength={40}
            value={v.color ?? ""}
            onChange={(e) => set("color", e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pet-notes">
          {t("pets.notes")} <span className="text-muted-foreground">({t("common.optional")})</span>
        </Label>
        <Textarea
          id="pet-notes"
          rows={3}
          maxLength={1000}
          value={v.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder={t("pets.notesHint")}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="lg" disabled={pending || v.name.trim().length === 0}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
