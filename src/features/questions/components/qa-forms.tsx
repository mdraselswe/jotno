"use client";

import { Flag, ThumbsUp } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { SPECIES } from "@/content/geo";
import { ImageUpload } from "@/features/uploads";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { answerQuestion, askQuestion, reportContent, toggleHelpful } from "../server/actions";

/** Owner: ask a free question. */
export function AskForm() {
  const t = useT();
  const locale = useLocale();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [speciesId, setSpeciesId] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await askQuestion(locale, {
        title,
        body,
        speciesId: speciesId ? Number(speciesId) : null,
        photoPath,
      });
      if (!res.ok) setError(t(res.error));
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-1">
        <Label htmlFor="ask-species">{t("common.species")}</Label>
        <NativeSelect id="ask-species" value={speciesId} onChange={(e) => setSpeciesId(e.target.value)}>
          <option value="">{t("common.chooseSpecies")}</option>
          {SPECIES.map((s) => (
            <option key={s.id} value={s.id}>
              {locale === "bn" ? s.bn : s.en}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="ask-title">{t("qa.titleField")}</Label>
        <Input
          id="ask-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          minLength={10}
          maxLength={140}
          placeholder={t("qa.titleHint")}
          required
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="ask-body">{t("qa.bodyField")}</Label>
        <Textarea
          id="ask-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          minLength={20}
          maxLength={3000}
          rows={6}
          placeholder={t("qa.bodyHint")}
          required
        />
      </div>
      <ImageUpload kind="question" value={photoPath} onChange={setPhotoPath} label={t("consult.photo")} />
      <p className="rounded-(--control-radius) bg-warning/10 px-3 py-2 text-sm">{t("qa.emergencyNote")}</p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="justify-self-start">
        {pending ? t("common.saving") : t("qa.post")}
      </Button>
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
        required
      />
      <p className="text-xs text-muted-foreground">{t("qa.answerHint")}</p>
      <Button type="submit" disabled={pending} className="justify-self-start">
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
      {t("qa.helpful")} · <span className="tabular-nums">{state.count}</span>
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
