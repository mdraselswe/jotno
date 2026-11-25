"use client";

import { Eye, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { chatPath } from "@/config/routes";
import { useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { openConsultTranscript } from "../server/actions";

const MIN = 10;

/** Admin: give a reason (logged), then open the consult's chat read-only. */
export function ReadConsultForm({ consultId, minutes }: { consultId: string; minutes: number }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const left = Math.max(0, MIN - reason.trim().length);

  function submit(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await openConsultTranscript(consultId, reason);
      if (!r.ok) {
        toast.error(t(r.error));
        return;
      }
      router.push(localeHref(locale, chatPath(consultId)));
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3" aria-label={t("monitor.read")}>
      <p className="flex gap-2 rounded-(--radius-lg) bg-warning/15 px-3 py-2 text-sm text-pretty">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {t("monitor.readSub", { n: minutes })}
      </p>
      <div className="grid gap-2">
        <Label htmlFor="read-reason">{t("monitor.reason")}</Label>
        <Textarea
          id="read-reason"
          rows={3}
          maxLength={300}
          value={reason}
          placeholder={t("adminui.consult.reasonHint")}
          aria-describedby="read-reason-min"
          onChange={(e) => setReason(e.target.value)}
        />
        <p id="read-reason-min" className="text-xs text-muted-foreground" aria-live="polite">
          {left > 0 ? t("adminui.reasonLeft", { n: left }) : t("adminui.reasonOk")}
        </p>
      </div>
      <Button type="submit" variant="outline" className="w-full" disabled={pending || left > 0}>
        <Eye aria-hidden="true" />
        {t("monitor.openChat")}
      </Button>
    </form>
  );
}
