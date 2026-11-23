"use client";

import { Eye } from "lucide-react";
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

/** Admin: give a reason (logged), then open the consult's chat read-only. */
export function ReadConsultForm({ consultId, minutes }: { consultId: string; minutes: number }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

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
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
      aria-labelledby="read-title"
    >
      <h2 id="read-title" className="font-heading text-lg font-semibold">
        {t("monitor.read")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("monitor.readSub", { n: minutes })}</p>
      <div className="grid gap-2">
        <Label htmlFor="read-reason">{t("monitor.reason")}</Label>
        <Textarea
          id="read-reason"
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        className="justify-self-start"
        disabled={pending || reason.trim().length < 10}
      >
        <Eye aria-hidden="true" />
        {t("monitor.openChat")}
      </Button>
    </form>
  );
}
