"use client";

import { Camera, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/config/env";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { UploadKind } from "../kinds";
import { useUpload } from "./use-upload";

const publicUrl = (path: string) =>
  `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;

/**
 * A photo field for public images (pets, vets, questions, products). Holds the
 * stored path in a hidden input named `name`, so it works inside plain forms too.
 */
export function ImageUpload({
  kind,
  name,
  value,
  onChange,
  label,
  shape = "square",
  className,
  onBusyChange,
}: {
  kind: Exclude<UploadKind, "vetDoc" | "chat">;
  name?: string;
  value: string | null;
  onChange: (path: string | null) => void;
  label?: string;
  shape?: "square" | "circle";
  className?: string;
  /** True while a photo is uploading, so the form can hold its Save button. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = useUpload(kind);
  const [preview, setPreview] = useState<string | null>(null);
  const src = preview ?? (value ? publicUrl(value) : null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onBusyChange?.(true);
    try {
      const path = await upload(file);
      if (path) onChange(path);
      else setPreview(null);
    } finally {
      onBusyChange?.(false);
    }
  }

  return (
    <div className={cn("grid justify-items-start gap-2", className)}>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn(
            "relative grid size-24 shrink-0 place-items-center overflow-hidden border-(length:--border-w) border-dashed border-border bg-muted text-muted-foreground transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            shape === "circle" ? "rounded-full" : "rounded-(--control-radius)",
          )}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob: previews and storage URLs, sized by CSS
            <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <Camera aria-hidden="true" className="size-7" />
          )}
          {busy ? (
            <span className="absolute inset-0 grid place-items-center bg-background/60">
              <Loader2 aria-hidden="true" className="size-6 animate-spin" />
            </span>
          ) : null}
          <span className="sr-only">
            {label ?? (value ? t("common.changePhoto") : t("common.uploadPhoto"))}
          </span>
        </button>
        <div className="grid gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy
              ? t("common.uploading")
              : value
                ? t("common.changePhoto")
                : (label ?? t("common.uploadPhoto"))}
          </Button>
          {value && !busy ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreview(null);
                onChange(null);
              }}
            >
              <X aria-hidden="true" />
              {t("common.remove")}
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-sm text-destructive">
          {t(error, { mb: 5 })}
        </p>
      ) : null}
    </div>
  );
}
