"use client";

import { Eye, FileUp, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useUpload } from "@/features/uploads";
import { useT } from "@/i18n/client";
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

/** Verification documents (private bucket; only the vet and admins can open them). */
export function VetDocuments({ documents, locked }: { documents: VetDocument[]; locked: boolean }) {
  const t = useT();
  const [kind, setKind] = useState<Kind>("bvc_certificate");
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = useUpload("vetDoc");
  const [pending, start] = useTransition();

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
    });
  }

  function remove(id: string) {
    start(async () => {
      const r = await removeVetDocument(id);
      if (!r.ok) toast.error(t(r.error));
    });
  }

  return (
    <div className="grid gap-4">
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("vet.docEmpty")}</p>
      ) : (
        <ul className="grid gap-2">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-(--control-radius) border-(length:--border-w) px-3 py-2 text-sm"
            >
              <span className="flex-1">{t(KINDS[d.kind as Kind] ?? "vet.docOther")}</span>
              <Button variant="ghost" size="icon-sm" aria-label={t("common.view")} onClick={() => view(d.id)}>
                <Eye aria-hidden="true" />
              </Button>
              {!locked ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("common.remove")}
                  disabled={pending}
                  onClick={() => remove(d.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {!locked ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <label htmlFor="doc-kind" className="text-xs text-muted-foreground">
              {t("vet.docKind")}
            </label>
            <NativeSelect id="doc-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {(Object.keys(KINDS) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {t(KINDS[k])}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            <FileUp aria-hidden="true" />
            {busy ? t("common.uploading") : t("vet.docUpload")}
          </Button>
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
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(error, { mb: 10 })}
        </p>
      ) : null}
    </div>
  );
}
