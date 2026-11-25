"use client";

import { Check, Eye, Flag, Lightbulb, LoaderCircle, Send, Siren, ThumbsUp } from "lucide-react";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SPECIES } from "@/content/geo";
import { ImageUpload } from "@/features/uploads";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { answerQuestion, askQuestion, reportContent, toggleHelpful } from "../server/actions";

const TITLE_MIN = 10;
const TITLE_MAX = 140;
const BODY_MIN = 20;
const BODY_MAX = 3000;

/** One numbered step of the ask form. */
function Step({
  n,
  title,
  sub,
  htmlFor,
  optional,
  children,
}: {
  n: number;
  title: string;
  sub?: string;
  /** The field the title labels (steps with one field). */
  htmlFor?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  const fmt = useFormatter();
  const heading = (
    <>
      {title}
      {optional ? (
        <span className="ms-2 text-sm font-normal text-muted-foreground">({t("common.optional")})</span>
      ) : null}
    </>
  );
  const cls = "font-heading text-lg leading-snug font-semibold";
  return (
    <section className="grid gap-4 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-6">
      <div className="flex gap-3.5">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground tabular-nums"
        >
          {fmt.number(n)}
        </span>
        <div className="grid gap-0.5">
          {htmlFor ? (
            <Label htmlFor={htmlFor} className={cls}>
              {heading}
            </Label>
          ) : (
            <h2 className={cls}>{heading}</h2>
          )}
          {sub ? <p className="text-sm text-pretty text-muted-foreground">{sub}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

/** "12/140" under a field, with the minimum that turns green once reached. */
function Counter({ id, value, min, max }: { id: string; value: string; min: number; max: number }) {
  const t = useT();
  const fmt = useFormatter();
  const n = value.trim().length;
  const ok = n >= min;
  return (
    <p id={id} className="flex items-center justify-between gap-3 text-xs">
      <span className={cn("inline-flex items-center gap-1", ok ? "text-success" : "text-muted-foreground")}>
        {ok ? <Check aria-hidden="true" className="size-3.5" /> : null}
        {t("pubui.ask.min", { n: fmt.number(min) })}
      </span>
      <span className="text-muted-foreground tabular-nums">
        {t("pubui.ask.count", { n: fmt.number(n), max: fmt.number(max) })}
      </span>
    </p>
  );
}

/** Owner: ask a free question, in four short guided steps. */
export function AskForm() {
  const t = useT();
  const locale = useLocale();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [speciesId, setSpeciesId] = useState<number | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // A photo still uploading would be left out of the question.
  const [uploading, setUploading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    setError(null);
    start(async () => {
      const res = await askQuestion(locale, { title, body, speciesId, photoPath });
      if (!res.ok) setError(t(res.error));
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4" aria-busy={pending}>
      <Step n={1} title={t("pubui.ask.step1")} sub={t("pubui.ask.step1Sub")}>
        <div role="group" aria-label={t("common.species")} className="flex flex-wrap gap-2">
          {SPECIES.map((s) => {
            const on = speciesId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => setSpeciesId(on ? null : s.id)}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium ring-1 transition-colors duration-(--motion-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  on
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card text-foreground/80 ring-foreground/12 hover:bg-muted",
                )}
              >
                {on ? <Check aria-hidden="true" className="size-4" /> : null}
                {locale === "bn" ? s.bn : s.en}
              </button>
            );
          })}
        </div>
      </Step>

      <Step n={2} title={t("pubui.ask.step2")} sub={t("pubui.ask.step2Sub")} htmlFor="ask-title">
        <div className="grid gap-1.5">
          <Input
            id="ask-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={TITLE_MIN}
            maxLength={TITLE_MAX}
            placeholder={t("qa.titleHint")}
            aria-describedby="ask-title-count"
            className="h-(--control-h-lg) text-base"
            required
          />
          <Counter id="ask-title-count" value={title} min={TITLE_MIN} max={TITLE_MAX} />
        </div>
      </Step>

      <Step n={3} title={t("pubui.ask.step3")} sub={t("qa.askSub")} htmlFor="ask-body">
        <div className="grid gap-1.5">
          <Textarea
            id="ask-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            minLength={BODY_MIN}
            maxLength={BODY_MAX}
            rows={6}
            placeholder={t("qa.bodyHint")}
            aria-describedby="ask-body-count ask-tips"
            className="text-base"
            required
          />
          <Counter id="ask-body-count" value={body} min={BODY_MIN} max={BODY_MAX} />
        </div>
        <div id="ask-tips" className="grid gap-2 rounded-(--radius-xl) bg-muted/60 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Lightbulb aria-hidden="true" className="size-4 text-primary" />
            {t("pubui.ask.tipsTitle")}
          </p>
          <ul className="grid list-disc gap-1 ps-6 text-muted-foreground">
            <li>{t("pubui.ask.tip1")}</li>
            <li>{t("pubui.ask.tip2")}</li>
            <li>{t("pubui.ask.tip3")}</li>
          </ul>
        </div>
      </Step>

      <Step n={4} title={t("pubui.ask.step4")} sub={t("pubui.ask.step4Sub")} optional>
        <ImageUpload
          kind="question"
          value={photoPath}
          onChange={setPhotoPath}
          onBusyChange={setUploading}
          label={t("common.uploadPhoto")}
        />
      </Step>

      <div className="grid gap-2 text-sm">
        <p className="flex gap-2 rounded-(--radius-xl) bg-warning/15 px-4 py-3 text-pretty">
          <Siren aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          {t("qa.emergencyNote")}
        </p>
        <p className="flex gap-2 px-1 text-pretty text-muted-foreground">
          <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("pubui.ask.public")}
        </p>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-(--radius-lg) bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {/* Phones: the submit button stays in reach above the tab bar */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t bg-background/92 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button
          type="submit"
          variant="brand"
          size="lg"
          disabled={pending || uploading}
          className="w-full md:w-auto"
        >
          {pending || uploading ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <Send aria-hidden="true" />
          )}
          {pending ? t("pubui.ask.posting") : uploading ? t("common.uploading") : t("qa.post")}
        </Button>
      </div>
    </form>
  );
}

/** Verified vet: write an answer. */
export function AnswerForm({ questionId }: { questionId: string }) {
  const t = useT();
  const locale = useLocale();
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <p className="text-sm text-success">{t("qa.thanksAnswer")}</p>;
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await answerQuestion(locale, questionId, { body });
          if (res.ok) {
            setDone(true);
            toast.success(t("qa.thanksAnswer"));
          } else toast.error(t(res.error));
        });
      }}
    >
      <Label htmlFor="ans-body">{t("qa.yourAnswer")}</Label>
      <Textarea
        id="ans-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        minLength={30}
        maxLength={4000}
        aria-describedby="ans-body-hint ans-body-count"
        required
      />
      <Counter id="ans-body-count" value={body} min={30} max={4000} />
      <p id="ans-body-hint" className="text-xs text-muted-foreground">
        {t("qa.answerHint")}
      </p>
      <Button type="submit" variant="brand" disabled={pending} className="justify-self-start">
        {pending ? t("common.saving") : t("qa.postAnswer")}
      </Button>
    </form>
  );
}

/** "Helpful" toggle with a count. */
export function HelpfulButton({
  answerId,
  count,
  voted,
  canVote,
}: {
  answerId: string;
  count: number;
  voted: boolean;
  canVote: boolean;
}) {
  const t = useT();
  const fmt = useFormatter();
  const [state, setState] = useState({ count, voted });
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={state.voted}
      disabled={pending || !canVote}
      onClick={() =>
        start(async () => {
          const r = await toggleHelpful(answerId);
          if (r.ok) setState({ count: r.count, voted: r.voted });
        })
      }
      className={cn(state.voted && "text-primary")}
    >
      <ThumbsUp aria-hidden="true" />
      {t("qa.helpful")} · <span className="tabular-nums">{fmt.number(state.count)}</span>
    </Button>
  );
}

/** Report a question, answer or review. */
export function ReportButton({ entity, id }: { entity: "question" | "answer" | "review"; id: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag aria-hidden="true" />
            {t("qa.report")}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("qa.reportTitle")}</DialogTitle>
          <DialogDescription>{t("qa.reportSub")}</DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label={t("qa.reportTitle")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={300}
        />
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={pending || reason.trim().length < 3}
            onClick={() =>
              start(async () => {
                const r = await reportContent({ entity, id, reason });
                if (r.ok) {
                  toast.success(t("qa.reported"));
                  setOpen(false);
                  setReason("");
                } else toast.error(t(r.error));
              })
            }
          >
            {t("qa.report")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
