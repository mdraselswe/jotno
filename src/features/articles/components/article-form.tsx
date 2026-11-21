"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { SPECIES } from "@/content/geo";
import { useLocale, useT } from "@/i18n/client";
import { deleteArticle, saveArticle } from "../server/actions";

export interface ArticleValues {
  title: string;
  excerpt: string;
  body: string;
  speciesId: string;
}

export const EMPTY_ARTICLE: ArticleValues = { title: "", excerpt: "", body: "", speciesId: "" };

/** Vet: write or edit an article; save as draft or publish. */
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
  const locale = useLocale();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const set = (patch: Partial<ArticleValues>) => setV((x) => ({ ...x, ...patch }));

  const save = (publish: boolean) =>
    start(async () => {
      const res = await saveArticle(locale, id, {
        title: v.title,
        excerpt: v.excerpt,
        body: v.body,
        speciesId: v.speciesId ? Number(v.speciesId) : null,
        publish,
      });
      if (res.ok) toast.success(publish ? t("art.publishedToast") : t("common.saved"));
      else toast.error(t(res.error));
    });

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save(published);
      }}
    >
      <div className="grid gap-1">
        <Label htmlFor="ar-title">{t("art.titleField")}</Label>
        <Input
          id="ar-title"
          value={v.title}
          onChange={(e) => set({ title: e.target.value })}
          minLength={8}
          maxLength={140}
          required
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="ar-species">{t("common.species")}</Label>
        <NativeSelect
          id="ar-species"
          value={v.speciesId}
          onChange={(e) => set({ speciesId: e.target.value })}
        >
          <option value="">{t("common.all")}</option>
          {SPECIES.map((s) => (
            <option key={s.id} value={s.id}>
              {locale === "bn" ? s.bn : s.en}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="ar-excerpt">
          {t("art.excerpt")} <span className="text-muted-foreground">({t("common.optional")})</span>
        </Label>
        <Textarea
          id="ar-excerpt"
          value={v.excerpt}
          onChange={(e) => set({ excerpt: e.target.value })}
          rows={2}
          maxLength={300}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="ar-body">{t("art.body")}</Label>
        <Textarea
          id="ar-body"
          value={v.body}
          onChange={(e) => set({ body: e.target.value })}
          rows={18}
          minLength={200}
          maxLength={20_000}
          className="font-mono text-sm"
          required
        />
        <p className="text-xs text-muted-foreground">{t("art.bodyHint")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={() => save(false)}>
          {published ? t("art.unpublish") : t("art.saveDraft")}
        </Button>
        <Button type="button" disabled={pending || !canPublish} onClick={() => save(true)}>
          {published ? t("common.save") : t("art.publish")}
        </Button>
        {id ? (
          <Button
            type="button"
            variant="ghost"
            className="ml-auto text-destructive"
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
      </div>
      {!canPublish ? <p className="text-sm text-muted-foreground">{t("qa.verifiedOnly")}</p> : null}
    </form>
  );
}
