"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { AreaPicker } from "@/components/forms/area-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/features/uploads";
import { useT } from "@/i18n/client";
import { supabaseBrowser } from "@/infrastructure/supabase/browser";
import { updateProfile } from "../server/actions";

export interface ProfileValues {
  fullName: string;
  phone: string;
  districtId: number | null;
  areaId: number | null;
  avatarPath: string | null;
}

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const t = useT();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
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
        if (v.avatarPath !== initial.avatarPath) await supabaseBrowser().auth.refreshSession();
      } else toast.error(t(r.error));
    });
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4" noValidate>
      <ImageUpload
        kind="avatar"
        shape="circle"
        value={v.avatarPath}
        onChange={(avatarPath) => setV({ ...v, avatarPath })}
        label={t("settings.photo")}
      />
      <div className="grid gap-2">
        <Label htmlFor="pf-name">{t("common.yourName")}</Label>
        <Input
          id="pf-name"
          autoComplete="name"
          value={v.fullName}
          onChange={(e) => setV({ ...v, fullName: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pf-phone">{t("common.phone")}</Label>
        <Input
          id="pf-phone"
          type="tel"
          autoComplete="tel"
          value={v.phone}
          placeholder="017XXXXXXXX"
          onChange={(e) => setV({ ...v, phone: e.target.value })}
        />
      </div>
      <AreaPicker
        idPrefix="pf"
        districtId={v.districtId}
        areaId={v.areaId}
        onChange={(p) => setV({ ...v, ...p })}
      />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
