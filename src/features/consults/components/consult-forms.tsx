"use client";

import { Camera, Loader2, Lock, Star, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useUpload } from "@/features/uploads";
import { Textarea } from "@/components/ui/textarea";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { closeConsult, leaveReview, startConsult } from "../server/actions";

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

  async function addPhoto(file: File | undefined) {
    if (!file || photos.length >= maxPhotos) return;
    const path = await upload(file);
    if (path) setPhotos((list) => [...list, { path, preview: URL.createObjectURL(file) }]);
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
    <form onSubmit={submit} className="grid gap-5" noValidate>
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
          minLength={10}
          maxLength={1000}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={t("consult.problemHint")}
        />
      </div>
      {maxPhotos > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{t("consult.photos", { max: maxPhotos })}</legend>
          <p className="text-sm text-muted-foreground">{t("consult.photosHint")}</p>
          <ul className="flex flex-wrap gap-3">
            {photos.map((p, n) => (
              <li
                key={p.path}
                className="relative size-20 overflow-hidden rounded-(--control-radius) bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file */}
                <img src={p.preview} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((list) => list.filter((x) => x.path !== p.path))}
                  aria-label={t("consult.removePhoto", { n: n + 1 })}
                  className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-background/90 text-foreground shadow-(--shadow-control)"
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
                  className="grid size-20 place-items-center rounded-(--control-radius) border-(length:--border-w) border-dashed border-border bg-muted text-muted-foreground transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
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
              {t(uploadError)}
            </p>
          ) : null}
        </fieldset>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending || busy || summary.trim().length < 10}>
        <Lock aria-hidden="true" />
        {pending ? t("pay.redirecting") : t("consult.pay", { fee: feeLabel })}
      </Button>
    </form>
  );
}

/** Owner sees how long the vet has to answer before the automatic refund. */
export function ReplyCountdown({ deadline }: { deadline: string }) {
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
    <p className="rounded-(--control-radius) bg-info/10 px-3 py-2 text-sm text-info" aria-live="polite">
      {left > 0 ? t("consult.waitingReply", { n: left }) : t("consult.refundSoon")}
    </p>
  );
}

export function CloseConsultButton({ consultId }: { consultId: string }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await closeConsult(locale, consultId);
          if (!r.ok) toast.error(t(r.error));
        })
      }
    >
      {t("consult.close")}
    </Button>
  );
}

export function ReviewForm({ consultId }: { consultId: string }) {
  const t = useT();
  const locale = useLocale();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <p className="text-sm text-success">{t("consult.thanksReview")}</p>;
  return (
    <form
      className="grid gap-3 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await leaveReview(locale, consultId, { rating, body });
          if (r.ok) setDone(true);
          else toast.error(t(r.error));
        });
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="font-medium">{t("consult.rate")}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
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
                  "size-8 transition-colors",
                  n <= rating ? "fill-highlight text-highlight" : "text-muted-foreground",
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
      />
      <div>
        <Button type="submit" disabled={pending || rating === 0}>
          {t("common.submit")}
        </Button>
      </div>
    </form>
  );
}
