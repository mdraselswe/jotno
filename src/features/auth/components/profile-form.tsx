"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { AreaPicker } from "@/components/forms/area-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/client";
import { updateProfile } from "../server/actions";

export interface ProfileValues {
  fullName: string;
  phone: string;
  districtId: number | null;
  areaId: number | null;
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
      });
      if (r.ok) toast.success(t("common.saved"));
      else toast.error(t(r.error));
    });
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4" noValidate>
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
