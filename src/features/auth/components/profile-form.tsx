"use client";

import { LogOut } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { AreaPicker } from "@/components/forms/area-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/features/uploads";
import type { MessageKey } from "@/i18n";
import { useT } from "@/i18n/client";
import { supabaseBrowser } from "@/infrastructure/supabase/browser";
import { isBdMobile } from "../phone";
import { updateProfile } from "../server/actions";
import { profileChanged } from "./use-auth-user";
import { useSignOut } from "./user-menu";

export interface ProfileValues {
  fullName: string;
  phone: string;
  districtId: number | null;
  areaId: number | null;
  avatarPath: string | null;
}

type Field = "name" | "phone";

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const t = useT();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, MessageKey>>>({});
  const [pending, start] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    // Same rules as the server (name 2+ letters, an 11-digit BD mobile or nothing).
    const found: Partial<Record<Field, MessageKey>> = {};
    if (v.fullName.trim().length < 2) found.name = "onboarding.nameInvalid";
    if (v.phone.trim() && !isBdMobile(v.phone)) found.phone = "common.phoneInvalid";
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(found.name ? "pf-name" : "pf-phone")?.focus();
      return;
    }
    start(async () => {
      const r = await updateProfile({
        fullName: v.fullName,
        phone: v.phone,
        districtId: v.districtId ?? undefined,
        areaId: v.areaId ?? undefined,
        avatarPath: v.avatarPath,
      });
      if (r.ok) {
        toast.success(t("common.saved"));
        // Pick up the new photo in the header (it comes from the session).
        if (v.avatarPath !== saved.avatarPath) await supabaseBrowser().auth.refreshSession();
        profileChanged();
        setSaved(v);
      } else toast.error(t(r.error));
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <ImageUpload
        kind="avatar"
        shape="circle"
        value={v.avatarPath}
        onChange={(avatarPath) => setV({ ...v, avatarPath })}
        label={t("settings.photo")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor="pf-name">{t("common.yourName")}</Label>
          <Input
            id="pf-name"
            autoComplete="name"
            value={v.fullName}
            onChange={(e) => setV({ ...v, fullName: e.target.value })}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "pf-name-err" : undefined}
          />
          {errors.name ? (
            <p id="pf-name-err" className="text-sm text-destructive">
              {t(errors.name)}
            </p>
          ) : null}
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="pf-phone">{t("common.phone")}</Label>
          <Input
            id="pf-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={v.phone}
            placeholder="017XXXXXXXX"
            onChange={(e) => setV({ ...v, phone: e.target.value })}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "pf-phone-err" : "pf-phone-hint"}
          />
          {errors.phone ? (
            <p id="pf-phone-err" className="text-sm text-destructive">
              {t(errors.phone)}
            </p>
          ) : (
            <p id="pf-phone-hint" className="text-xs text-muted-foreground">
              {t("common.phoneHint")}
            </p>
          )}
        </div>
      </div>
      <AreaPicker
        idPrefix="pf"
        districtId={v.districtId}
        areaId={v.areaId}
        onChange={(p) => setV({ ...v, ...p })}
      />
      <div>
        <Button type="submit" variant="brand" size="lg" disabled={pending} className="max-sm:w-full">
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}

/** Signs out on this device (the same flow as the account menu). */
export function SignOutButton() {
  const t = useT();
  const signOut = useSignOut();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => start(signOut)}
      className="text-destructive hover:text-destructive max-sm:w-full"
    >
      <LogOut aria-hidden="true" className="rtl:rotate-180" />
      {pending ? t("ownerui.settings.signingOut") : t("nav.signOut")}
    </Button>
  );
}
