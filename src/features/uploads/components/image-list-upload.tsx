"use client";

import { Camera, Loader2, X } from "lucide-react";
import { useId, useRef } from "react";
import { publicEnv } from "@/config/env";
import { useT } from "@/i18n/client";
import type { UploadKind } from "../kinds";
import { useUpload } from "./use-upload";

const publicUrl = (path: string) =>
  `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;

/** Several public photos (e.g. a product gallery): thumbnails, remove, and "add" until `max`. */
export function ImageListUpload({
  kind,
  value,
  onChange,
  max,
  label,
  hint,
  onBusyChange,
}: {
  kind: Exclude<UploadKind, "vetDoc" | "chat">;
  value: string[];
  onChange: (paths: string[]) => void;
  max: number;
  label: string;
  hint?: string;
  /** True while photos are uploading, so the form can hold its Save button. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = useUpload(kind);

  async function pick(files: FileList | null) {
    const room = max - value.length;
    const picked = Array.from(files ?? []).slice(0, Math.max(0, room));
    if (picked.length === 0) return;
    const added: string[] = [];
    onBusyChange?.(true);
    try {
      // Show each photo as soon as it is up, not after the whole batch.
      for (const file of picked) {
        const path = await upload(file);
        if (path) {
          added.push(path);
          onChange([...value, ...added]);
        }
      }
    } finally {
      onBusyChange?.(false);
    }
  }

  return (
    <fieldset className="grid gap-2" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="text-sm font-medium">{label}</legend>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-2">
        {value.map((path, i) => (
          <li key={path} className="relative size-20 overflow-hidden rounded-(--control-radius) bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- storage URL */}
            <img src={publicUrl(path)} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((p) => p !== path))}
              aria-label={t("common.removePhotoN", { n: i + 1 })}
              className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-background/90 text-foreground shadow-(--shadow-card) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </li>
        ))}
        {value.length < max ? (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="grid size-20 place-items-center rounded-(--control-radius) border-(length:--border-w) border-dashed border-border bg-muted text-muted-foreground hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="size-6 animate-spin" />
              ) : (
                <Camera aria-hidden="true" className="size-6" />
              )}
              <span className="sr-only">{busy ? t("common.uploading") : t("common.addPhoto")}</span>
            </button>
          </li>
        ) : null}
      </ul>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void pick(e.target.files);
          e.target.value = "";
        }}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(error, { mb: 5 })}
        </p>
      ) : null}
    </fieldset>
  );
}
