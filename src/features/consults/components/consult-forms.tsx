"use client";

import { Camera, Clock, Loader2, Lock, MessageSquareText, Star, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useUpload } from "@/features/uploads";
import { Textarea } from "@/components/ui/textarea";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { closeConsult, leaveReview, startConsult } from "../server/actions";

/** The server asks for at least this much (startConsult); the button waits for it. */
const MIN_SUMMARY = 10;

const CARD =
  "grid gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5";

/** Owner: describe the problem, pick the pet, pay. */
export function StartConsultForm({
  providerId,
  pets,
  feeLabel,
  maxPhotos,
}: {
  providerId: string;
  pets: { id: string; name: string }[];
  feeLabel: string;
  /** How many photos can go with the booking (0 hides the field). */
  maxPhotos: number;
}) {
  const t = useT();
  const locale = useLocale();
  const [petId, setPetId] = useState<string>(pets[0]?.id ?? "");
  const [summary, setSummary] = useState("");
  const [photos, setPhotos] = useState<{ path: string; preview: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { upload, busy, error: uploadError } = useUpload("chat");
  const picker = useRef<HTMLInputElement>(null);
  const tooShort = summary.trim().length < MIN_SUMMARY;

  async function addPhoto(file: File | undefined) {
    if (!file || photos.length >= maxPhotos) return;
    try {
      const path = await upload(file);
      if (path) setPhotos((list) => [...list, { path, preview: URL.createObjectURL(file) }]);
    } catch {
      toast.error(t("common.genericError"));
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await startConsult(locale, providerId, {
        patientId: petId || null,
        summary,
        photos: photos.map((p) => p.path),
      });
      if (r && !r.ok) setError(t(r.error));
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <section className={CARD} aria-labelledby="sc-tell">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
            <MessageSquareText aria-hidden="true" className="size-5" />
          </span>
          <div className="grid gap-0.5">
            <h2 id="sc-tell" className="font-heading text-lg font-bold tracking-tight">
              {t("chatui.start.tell")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("chatui.start.tellSub")}</p>
          </div>
        </div>
        {pets.length > 0 ? (
          <div className="grid gap-2">
            <Label htmlFor="sc-pet">{t("consult.whichPet")}</Label>
            <NativeSelect id="sc-pet" value={petId} onChange={(e) => setPetId(e.target.value)}>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="">{t("consult.otherAnimal")}</option>
            </NativeSelect>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="sc-summary">{t("consult.problem")}</Label>
          <Textarea
            id="sc-summary"
            rows={5}
            required
            minLength={MIN_SUMMARY}
            maxLength={1000}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t("consult.problemHint")}
            aria-describedby={tooShort ? "sc-summary-min" : undefined}
            className="min-h-32"
          />
          {tooShort ? (
            <p id="sc-summary-min" className="text-sm text-muted-foreground" aria-live="polite">
              {t("consult.problemMin", { min: MIN_SUMMARY, n: summary.trim().length })}
            </p>
          ) : null}
        </div>
      </section>

      {maxPhotos > 0 ? (
        <fieldset className={CARD}>
          <legend className="sr-only">{t("consult.photos", { max: maxPhotos })}</legend>
          <div className="grid gap-0.5">
            <p aria-hidden="true" className="font-semibold">
              {t("consult.photos", { max: maxPhotos })}
            </p>
            <p className="text-sm text-muted-foreground">{t("consult.photosHint")}</p>
          </div>
          <ul className="flex flex-wrap gap-3">
            {photos.map((p, n) => (
              <li
                key={p.path}
                className="relative size-20 overflow-hidden rounded-(--radius-xl) bg-muted ring-1 ring-foreground/8"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file */}
                <img src={p.preview} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((list) => list.filter((x) => x.path !== p.path))}
                  aria-label={t("consult.removePhoto", { n: n + 1 })}
                  className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-background/90 text-foreground shadow-(--shadow-control) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
            {photos.length < maxPhotos ? (
              <li>
                <button
                  type="button"
                  onClick={() => picker.current?.click()}
                  disabled={busy}
                  aria-busy={busy}
                  className="grid size-20 place-items-center gap-1 rounded-(--radius-xl) border-(length:--border-w) border-dashed border-primary/40 bg-primary/5 text-primary transition-colors duration-(--motion-fast) hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                  ) : (
                    <Camera aria-hidden="true" className="size-5" />
                  )}
                  <span className="sr-only">{t("consult.addPhoto")}</span>
                </button>
              </li>
            ) : null}
          </ul>
          <input
            ref={picker}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              void addPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {uploadError ? (
            <p role="alert" className="text-sm text-destructive">
              {t(uploadError, { mb: 10 })}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-(--radius-lg) bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {/* Phones: the pay button stays in reach above the tab bar. */}
      <div className="max-sm:sticky max-sm:bottom-[calc(3.5rem+env(safe-area-inset-bottom))] max-sm:z-10 max-sm:-mx-4 max-sm:border-t max-sm:bg-background/95 max-sm:px-4 max-sm:py-3">
        <Button
          type="submit"
          variant="brand"
          size="lg"
          className="w-full"
          disabled={pending || busy || tooShort}
          aria-busy={pending}
        >
          {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Lock aria-hidden="true" />}
          {pending ? t("pay.redirecting") : t("consult.pay", { fee: feeLabel })}
        </Button>
      </div>
    </form>
  );
}

/** Owner sees how long the vet has to answer before the automatic refund. */
export function ReplyCountdown({ deadline, className }: { deadline: string; className?: string }) {
  const t = useT();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((Date.parse(deadline) - Date.now()) / 60_000)));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [deadline]);
  if (left === null) return null;
  return (
    <p
      className={cn("flex items-center gap-2 bg-info/10 px-3 py-2 text-sm text-info", className)}
      aria-live="polite"
    >
      <Clock aria-hidden="true" className="size-4 shrink-0" />
      {left > 0 ? t("consult.waitingReply", { n: left }) : t("consult.refundSoon")}
    </p>
  );
}

/** Vet: end the consult early, after a confirmation (it can't be undone). */
export function CloseConsultDialog({
  consultId,
  open,
  onOpenChange,
}: {
  consultId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-(--radius-2xl) p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold tracking-tight">
            {t("chatui.endTitle")}
          </DialogTitle>
          <DialogDescription>{t("chatui.endBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
          <DialogClose render={<Button variant="outline">{t("chatui.keepOpen")}</Button>} />
          <Button
            variant="destructive"
            disabled={pending}
            aria-busy={pending}
            onClick={() =>
              start(async () => {
                const r = await closeConsult(locale, consultId);
                if (!r.ok) {
                  toast.error(t(r.error));
                  return;
                }
                onOpenChange(false);
                toast(t("consult.sysClosed"));
              })
            }
          >
            {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {t("consult.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A standalone "End chat" button (opens the confirmation). */
export function CloseConsultButton({ consultId }: { consultId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("consult.close")}
      </Button>
      <CloseConsultDialog consultId={consultId} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ReviewForm({ consultId }: { consultId: string }) {
  const t = useT();
  const locale = useLocale();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done)
    return (
      <p
        role="status"
        className="mx-auto flex w-fit items-center gap-2 rounded-full bg-success/12 px-4 py-2 text-sm font-medium text-success"
      >
        <Star aria-hidden="true" className="size-4 fill-current" />
        {t("consult.thanksReview")}
      </p>
    );
  return (
    <form
      className="mx-auto grid w-full max-w-md gap-3 rounded-(--radius-2xl) bg-card p-4 text-center shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await leaveReview(locale, consultId, { rating, body });
          if (r.ok) setDone(true);
          else toast.error(t(r.error));
        });
      }}
    >
      <fieldset className="grid justify-items-center gap-2">
        <legend className="mb-1 font-heading text-base font-bold">{t("consult.rate")}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="cursor-pointer rounded-full p-0.5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="rating"
                className="sr-only"
                checked={rating === n}
                onChange={() => setRating(n)}
              />
              <Star
                aria-hidden="true"
                className={cn(
                  "size-9 transition-[color,scale] duration-(--motion-fast) ease-(--ease-press) motion-safe:hover:scale-110",
                  n <= rating ? "fill-highlight text-highlight" : "text-muted-foreground/60",
                )}
              />
              <span className="sr-only">{t("consult.stars", { n })}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Label htmlFor="rv-body" className="sr-only">
        {t("consult.reviewText")}
      </Label>
      <Textarea
        id="rv-body"
        rows={3}
        maxLength={1000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("consult.reviewText")}
        className="text-start"
      />
      <Button type="submit" variant="brand" disabled={pending || rating === 0} aria-busy={pending}>
        {t("common.submit")}
      </Button>
    </form>
  );
}
