"use client";

import { ArrowUpCircle, Banknote, Loader2, Send } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale, useT } from "@/i18n/client";
import { formatClock, parseClock } from "../rules";
import { answerQuick, saveDuty, takeQuickRefund, upgradeQuick } from "../server/actions";

const MIN_ANSWER = 20;

/** Vet: answer an open quick-help question (the first answer takes it). */
export function QuickAnswerForm({ requestId }: { requestId: string }) {
  const t = useT();
  const locale = useLocale();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const short = body.trim().length < MIN_ANSWER;
  const id = `qa-${requestId}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await answerQuick(locale, requestId, body);
      if (r && !r.ok) toast.error(t(r.error));
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-2" noValidate>
      <Label htmlFor={id}>{t("quick.yourAnswer")}</Label>
      <Textarea
        id={id}
        rows={4}
        value={body}
        maxLength={4000}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("quick.answerHint")}
        aria-describedby={`${id}-min`}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-min`} className="text-xs text-muted-foreground" aria-live="polite">
          {short ? t("quick.answerMin", { min: MIN_ANSWER, n: body.trim().length }) : t("quick.answerNote")}
        </p>
        <Button type="submit" variant="brand" size="sm" disabled={pending || short} aria-busy={pending}>
          {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}
          {t("quick.answerSend")}
        </Button>
      </div>
    </form>
  );
}

/** Vet: the hours they take quick help (Dhaka time). */
export function DutyForm({ start: from, end: to }: { start: number | null; end: number | null }) {
  const t = useT();
  const locale = useLocale();
  const [start, setStart] = useState(from === null ? "" : formatClock(from));
  const [end, setEnd] = useState(to === null ? "" : formatClock(to));
  const [pending, run] = useTransition();

  function save(off: boolean) {
    run(async () => {
      const s = off ? null : parseClock(start);
      const e = off ? null : parseClock(end);
      if (!off && (s === null || e === null)) {
        toast.error(t("quick.dutyInvalid"));
        return;
      }
      const r = await saveDuty(locale, s, e);
      if (r.ok) {
        if (off) {
          setStart("");
          setEnd("");
        }
        toast.success(t(off ? "quick.dutyOffDone" : "quick.dutySaved"));
      } else toast.error(t(r.error));
    });
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="duty-start">{t("quick.dutyFrom")}</Label>
          <Input id="duty-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="duty-end">{t("quick.dutyTo")}</Label>
          <Input id="duty-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("quick.dutyHint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="brand" disabled={pending}>
          {t("quick.dutySave")}
        </Button>
        {from !== null ? (
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => save(true)}>
            {t("quick.dutyOff")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** Owner: nobody answered; take the money back instead of the free retry. */
export function QuickRefundButton({ requestId }: { requestId: string }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await takeQuickRefund(locale, requestId);
          if (r.ok) toast.success(t("quick.refundAsked"));
          else toast.error(t(r.error));
        })
      }
    >
      <Banknote aria-hidden="true" />
      {t("quick.takeRefund")}
    </Button>
  );
}

/** Owner, in a quick chat: continue as the vet's full chat (calls, 24 hours), paying the difference. */
export function UpgradeQuickButton({ consultId, label }: { consultId: string; label: string }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="brand"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          const r = await upgradeQuick(locale, consultId);
          if (r && !r.ok) toast.error(t(r.error));
        })
      }
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        <ArrowUpCircle aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}
