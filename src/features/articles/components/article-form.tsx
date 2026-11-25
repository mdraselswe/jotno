"use client";

import { FileText, Globe, PenLine, Settings2, Trash2, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SectionCard, StatusBadge } from "@/components/layout/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SPECIES } from "@/content/geo";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { readingMinutes } from "../blocks";
import { deleteArticle, saveArticle } from "../server/actions";

export interface ArticleValues {
  title: string;
  excerpt: string;
  body: string;
  speciesId: string;
}

export const EMPTY_ARTICLE: ArticleValues = { title: "", excerpt: "", body: "", speciesId: "" };

/** Same limits as the server (articleSchema in server/actions.ts). */
const TITLE_MIN = 8;
const TITLE_MAX = 140;
const BODY_MIN = 200;

/**
 * Vet: write or edit a guide. The writing card takes the space; details
 * (status, animal, summary, delete) sit beside it on desktop and below it on
 * phones; draft/publish stay in a bar at the bottom of the screen.
 */
export function ArticleForm({
  id,
  initial,
  published,
  canPublish,
}: {
  id: string | null;
  initial: ArticleValues;
  published: boolean;
  canPublish: boolean;
}) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const set = (patch: Partial<ArticleValues>) => setV((x) => ({ ...x, ...patch }));

  const titleLen = v.title.trim().length;
  const bodyLen = v.body.trim().length;
  const titleShort = titleLen < TITLE_MIN;
  const bodyShort = bodyLen < BODY_MIN;
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);

  const save = (publish: boolean) => {
    if (titleShort || bodyShort) {
      toast.error(t("art.invalid"));
      return;
    }
    const snapshot = v;
    start(async () => {
      const res = await saveArticle(locale, id, {
        title: snapshot.title,
        excerpt: snapshot.excerpt,
        body: snapshot.body,
        speciesId: snapshot.speciesId ? Number(snapshot.speciesId) : null,
        publish,
      });
      if (res.ok) {
        setSaved(snapshot);
        toast.success(publish ? t("art.publishedToast") : t("common.saved"));
      } else toast.error(t(res.error));
    });
  };

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save(published);
      }}
      noValidate
    >
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <SectionCard title={t("vetui.art.writing")} icon={PenLine} bodyClassName="grid gap-5">
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="ar-title">{t("art.titleField")}</Label>
              <span
                id="ar-title-count"
                className={cn("text-xs tabular-nums", titleShort ? "text-muted-foreground" : "text-success")}
              >
                {t("vetui.art.titleCount", { n: fmt.number(titleLen) })}
              </span>
            </div>
            <Input
              id="ar-title"
              value={v.title}
              onChange={(e) => set({ title: e.target.value })}
              minLength={TITLE_MIN}
              maxLength={TITLE_MAX}
              required
              aria-describedby="ar-title-count"
              className="h-12 font-heading text-lg font-semibold"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ar-body">{t("art.body")}</Label>
            <Textarea
              id="ar-body"
              value={v.body}
              onChange={(e) => set({ body: e.target.value })}
              rows={18}
              minLength={BODY_MIN}
              maxLength={20_000}
              required
              aria-describedby="ar-body-count ar-body-hint"
              className="min-h-80 text-base leading-relaxed"
            />
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs">
              <p id="ar-body-hint" className="max-w-prose text-pretty text-muted-foreground">
                {t("art.bodyHint")}
              </p>
              <p
                id="ar-body-count"
                aria-live="polite"
                className={cn(
                  "shrink-0 font-medium tabular-nums",
                  bodyShort ? "text-muted-foreground" : "text-success",
                )}
              >
                {bodyShort
                  ? t("vetui.art.bodyCount", { n: fmt.number(bodyLen) })
                  : t("vetui.art.bodyOk", {
                      n: fmt.number(bodyLen),
                      min: fmt.number(readingMinutes(v.body)),
                    })}
              </p>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-5 lg:sticky lg:top-24">
          <SectionCard
            title={t("vetui.art.details")}
            icon={Settings2}
            actions={
              published ? (
                <StatusBadge tone="success">{t("art.statusPublished")}</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">{t("art.statusDraft")}</StatusBadge>
              )
            }
            bodyClassName="grid gap-5"
          >
            <div className="grid gap-2">
              <Label htmlFor="ar-species">{t("common.species")}</Label>
              <NativeSelect
                id="ar-species"
                value={v.speciesId}
                onChange={(e) => set({ speciesId: e.target.value })}
                aria-describedby="ar-species-hint"
                className="w-full"
              >
                <option value="">{t("common.all")}</option>
                {SPECIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {locale === "bn" ? s.bn : s.en}
                  </option>
                ))}
              </NativeSelect>
              <p id="ar-species-hint" className="text-xs text-pretty text-muted-foreground">
                {t("vetui.art.speciesHint")}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ar-excerpt">
                {t("art.excerpt")}{" "}
                <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
              </Label>
              <Textarea
                id="ar-excerpt"
                value={v.excerpt}
                onChange={(e) => set({ excerpt: e.target.value })}
                rows={3}
                maxLength={300}
                aria-describedby="ar-excerpt-hint"
              />
              <p id="ar-excerpt-hint" className="text-xs text-pretty text-muted-foreground">
                {t("vetui.art.excerptHint")}
              </p>
            </div>
            {!canPublish ? (
              <p className="rounded-(--radius-lg) bg-warning/15 px-3 py-2 text-xs text-pretty ring-1 ring-warning/40">
                {t("vetui.art.verifyFirst")}
              </p>
            ) : null}
            {id ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-start text-destructive hover:text-destructive"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(t("art.deleteConfirm")))
                    start(async () => void (await deleteArticle(locale, id)));
                }}
              >
                <Trash2 aria-hidden="true" />
                {t("common.delete")}
              </Button>
            ) : null}
          </SectionCard>
        </div>
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 md:bottom-4">
        <div className="flex flex-wrap items-center gap-2 rounded-(--radius-2xl) bg-card/95 p-3 shadow-(--shadow-card-hover) ring-1 ring-foreground/8 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4">
          <p className="flex min-w-0 flex-1 basis-40 items-center gap-2 text-sm" aria-live="polite">
            <span
              aria-hidden="true"
              className={cn("size-2 shrink-0 rounded-full", dirty ? "bg-warning" : "bg-success")}
            />
            <span className="truncate text-muted-foreground">
              {dirty ? t("vetui.save.unsaved") : t("vetui.save.saved")}
            </span>
          </p>
          <div className="flex gap-2 max-sm:w-full max-sm:*:flex-1">
            <Button type="button" variant="outline" disabled={pending} onClick={() => save(false)}>
              {published ? <Undo2 aria-hidden="true" /> : <FileText aria-hidden="true" />}
              {published ? t("art.unpublish") : t("art.saveDraft")}
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={pending || !canPublish}
              onClick={() => save(true)}
            >
              <Globe aria-hidden="true" />
              {pending ? t("common.saving") : published ? t("common.save") : t("art.publish")}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/** Loading twin of the editor page: header, writing card, details card. */
export function ArticleFormSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-5 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-full rounded-(--control-radius)" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-80 w-full rounded-(--control-radius)" />
        </div>
        <div className="grid gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-(--control-h) w-full rounded-(--control-radius)" />
          <Skeleton className="h-20 w-full rounded-(--control-radius)" />
        </div>
      </div>
    </div>
  );
}
