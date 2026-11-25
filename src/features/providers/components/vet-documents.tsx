"use client";

import { Eye, FileText, FileUp, Lock, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { StatusBadge, type BadgeTone } from "@/components/layout/app-ui";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useUpload } from "@/features/uploads";
import type { MessageKey } from "@/i18n";
import { useFormatter, useT } from "@/i18n/client";
import { addVetDocument, removeVetDocument, viewMyDocument } from "../server/actions";

const KINDS = {
  bvc_certificate: "vet.docBvc",
  degree: "vet.docDegree",
  nid: "vet.docNid",
  other: "vet.docOther",
} as const;
type Kind = keyof typeof KINDS;

export interface VetDocument {
  id: string;
  kind: string;
  createdAt: string;
}

type ProviderStatus = "draft" | "pending" | "verified" | "rejected" | "suspended";

/** What a document's pill says, from where the profile is in review. */
const REVIEW: Record<ProviderStatus, { key: MessageKey; tone: BadgeTone }> = {
  draft: { key: "vetui.doc.notSent", tone: "neutral" },
  rejected: { key: "vetui.doc.notSent", tone: "neutral" },
  pending: { key: "vetui.doc.checking", tone: "info" },
  verified: { key: "vetui.doc.checked", tone: "success" },
  suspended: { key: "vetui.doc.checked", tone: "neutral" },
};

/** Verification documents (private bucket; only the vet and admins can open them). */
export function VetDocuments({
  documents,
  locked,
  status = "draft",
}: {
  documents: VetDocument[];
  locked: boolean;
  status?: ProviderStatus;
}) {
  const t = useT();
  const fmt = useFormatter();
  const [kind, setKind] = useState<Kind>("bvc_certificate");
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = useUpload("vetDoc");
  const [pending, start] = useTransition();
  const review = REVIEW[status];

  async function pick(file: File | undefined) {
    if (!file) return;
    const path = await upload(file);
    if (!path) return;
    const r = await addVetDocument(kind, path);
    if (r.ok) toast.success(t("vet.docAdded"));
    else toast.error(t(r.error));
  }

  function view(id: string) {
    start(async () => {
      const url = await viewMyDocument(id);
      if (url) window.open(url, "_blank", "noopener");
      else toast.error(t("common.genericError"));
    });
  }

  function remove(id: string) {
    if (!window.confirm(t("vetui.doc.removeConfirm"))) return;
    start(async () => {
      const r = await removeVetDocument(id);
      if (!r.ok) toast.error(t(r.error));
    });
  }

  return (
    <div className="grid gap-4">
      {documents.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-(--radius-xl) border border-dashed border-foreground/15 px-4 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <FileText aria-hidden="true" className="size-5" />
          </span>
          <p className="font-heading font-semibold">{t("vetui.doc.empty")}</p>
          <p className="max-w-xs text-sm text-pretty text-muted-foreground">{t("vetui.doc.emptyBody")}</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-3 rounded-(--radius-xl) bg-muted/40 p-3 ring-1 ring-foreground/6"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-card text-primary shadow-(--shadow-control)">
                <FileText aria-hidden="true" className="size-5" />
              </span>
              <span className="grid min-w-0 flex-1 basis-40">
                <span className="truncate font-medium">{t(KINDS[d.kind as Kind] ?? "vet.docOther")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("vetui.doc.added", { date: fmt.date(new Date(d.createdAt)) })}
                </span>
              </span>
              <StatusBadge tone={review.tone}>{t(review.key)}</StatusBadge>
              <span className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${t("common.view")}: ${t(KINDS[d.kind as Kind] ?? "vet.docOther")}`}
                  disabled={pending}
                  onClick={() => view(d.id)}
                >
                  <Eye aria-hidden="true" />
                </Button>
                {!locked ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t("common.remove")}: ${t(KINDS[d.kind as Kind] ?? "vet.docOther")}`}
                    disabled={pending}
                    onClick={() => remove(d.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {locked ? (
        <p className="flex items-center gap-2 rounded-(--radius-lg) bg-info/10 px-3 py-2 text-sm">
          <Lock aria-hidden="true" className="size-4 shrink-0 text-info" />
          {t("vetui.doc.locked")}
        </p>
      ) : (
        <div className="grid gap-3 rounded-(--radius-xl) bg-primary/5 p-3 ring-1 ring-primary/15 sm:flex sm:flex-wrap sm:items-end">
          <div className="grid min-w-0 gap-1.5 sm:flex-1">
            <label htmlFor="doc-kind" className="text-sm font-medium">
              {t("vet.docKind")}
            </label>
            <NativeSelect
              id="doc-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="w-full"
            >
              {(Object.keys(KINDS) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {t(KINDS[k])}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button
            type="button"
            variant={documents.length === 0 ? "brand" : "outline"}
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <FileUp aria-hidden="true" />
            {busy ? t("common.uploading") : t("vet.docUpload")}
          </Button>
          <p className="text-xs text-muted-foreground sm:basis-full">{t("vetui.doc.types")}</p>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(error, { mb: 10 })}
        </p>
      ) : null}
    </div>
  );
}
