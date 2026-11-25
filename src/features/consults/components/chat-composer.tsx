"use client";

import { ImagePlus, Lock, SendHorizontal, X } from "lucide-react";
import { useLayoutEffect, useRef, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const subscribePointer = (cb: () => void) => {
  const mq = window.matchMedia(FINE_POINTER);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** A mouse and keyboard (desktop): Enter sends. On phones Enter makes a new line. */
function useEnterSends() {
  return useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia(FINE_POINTER).matches,
    () => false,
  );
}

/** About five lines; the box grows with the text up to this, then scrolls. */
const MAX_HEIGHT_PX = 144;

/**
 * The message box at the bottom: photo button, a pill text box that grows,
 * a round send button that lights up only when there is something to send.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  draft,
  onPick,
  onClearDraft,
  error,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  /** A photo picked but not sent yet. */
  draft: { preview: string } | null;
  onPick: (file: File) => void;
  onClearDraft: () => void;
  error: string | null;
}) {
  const t = useT();
  const enterSends = useEnterSends();
  const box = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const ready = value.trim().length > 0 || draft !== null;

  // Browsers without `field-sizing: content` (older Safari): grow by hand.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || CSS.supports("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!ready) return;
    onSend();
    box.current?.focus();
  }

  return (
    <form
      onSubmit={submit}
      className="shrink-0 border-t bg-card px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-3 sm:pb-3"
    >
      {draft ? (
        <div className="mb-2 flex items-center gap-3 ps-12">
          <span className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file */}
            <img
              src={draft.preview}
              alt=""
              className="size-16 rounded-(--radius-lg) object-cover ring-1 ring-foreground/10"
            />
            <button
              type="button"
              onClick={onClearDraft}
              aria-label={t("chatui.removePhoto")}
              className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full bg-foreground text-background shadow-(--shadow-control) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </span>
          <span className="text-xs text-muted-foreground">{t("chatui.photoReady")}</span>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mb-2 px-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
          aria-label={t("consult.attach")}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus aria-hidden="true" className="size-5.5" />
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />
        <div className="flex min-w-0 flex-1 rounded-[1.375rem] bg-muted/70 ring-1 ring-foreground/8 transition-shadow duration-(--motion-fast) focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/50">
          <label htmlFor="chat-text" className="sr-only">
            {t("consult.write")}
          </label>
          <textarea
            ref={box}
            id="chat-text"
            rows={1}
            value={value}
            maxLength={4000}
            enterKeyHint={enterSends ? "send" : "enter"}
            autoComplete="off"
            placeholder={t("consult.write")}
            aria-describedby={enterSends ? "chat-enter-hint" : undefined}
            className="field-sizing-content max-h-36 min-h-10 w-full resize-none bg-transparent px-4 py-2 text-base leading-6 outline-none placeholder:text-muted-foreground md:text-[0.9375rem]"
            onChange={(e) => onChange(e.target.value)}
            onPaste={(e) => {
              const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
              if (file) {
                e.preventDefault();
                onPick(file);
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || !enterSends) return;
              e.preventDefault();
              submit();
            }}
          />
          {enterSends ? (
            <span id="chat-enter-hint" className="sr-only">
              {t("chatui.enterHint")}
            </span>
          ) : null}
        </div>
        <Button
          type="submit"
          size="icon"
          variant={ready ? "brand" : "secondary"}
          className={cn(
            "size-10 shrink-0 rounded-full transition-[background-color,scale] duration-(--motion-fast) ease-(--ease-press)",
            ready ? "motion-safe:scale-100" : "motion-safe:scale-95",
          )}
          aria-label={t("consult.send")}
          disabled={!ready}
        >
          <SendHorizontal aria-hidden="true" className="size-5 rtl:rotate-180" />
        </Button>
      </div>
    </form>
  );
}

/** Shown instead of the box when nobody can write (ended, refunded, admin). */
export function ChatReadOnlyBar({ reason }: { reason: string }) {
  return (
    <p
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 border-t bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground"
    >
      <Lock aria-hidden="true" className="size-4 shrink-0" />
      {reason}
    </p>
  );
}
