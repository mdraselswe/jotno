"use client";

import {
  Check,
  CheckCheck,
  FileText,
  ImagePlus,
  Loader2,
  Phone,
  PhoneMissed,
  SendHorizontal,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUpload } from "@/features/uploads";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { prescriptionPath } from "@/config/routes";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { clock, parseCallLine } from "../calls";
import { chatImageUrl, markRead, sendMessage } from "../server/actions";
import type { ChatMessage } from "../server/queries";
import { ConsultCall, type CallSignals } from "./call/consult-call";
import { useConsultChannel, type MessageRow } from "./use-consult-channel";

const fromRow = (r: MessageRow): ChatMessage => ({
  id: r.id,
  senderId: r.sender_id,
  body: r.body,
  hasImage: Boolean(r.image_path),
  readAt: r.read_at,
  createdAt: new Date(r.created_at).toISOString(),
});

const SYSTEM_KEYS = {
  "system:opened": "consult.sysOpened",
  "system:closed": "consult.sysClosed",
  "system:refunded": "consult.sysRefunded",
} as const;

function ChatImage({ messageId }: { messageId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const t = useT();
  useEffect(() => {
    let alive = true;
    void chatImageUrl(messageId).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [messageId]);
  if (!url) return <div className="h-40 w-48 animate-pulse rounded-(--control-radius) bg-muted" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
      <img
        src={url}
        alt={t("consult.photo")}
        className="max-h-72 max-w-full rounded-(--control-radius) object-cover"
      />
    </a>
  );
}

export function ChatRoom({
  consultId,
  viewerId,
  canWrite,
  live,
  callable,
  initial,
  otherName,
  children,
}: {
  consultId: string;
  viewerId: string;
  canWrite: boolean;
  /** Joins the live channel (participants only; the admin view is a snapshot). */
  live: boolean;
  /** Audio/video calls are possible (an open consult, a participant). */
  callable: boolean;
  initial: ChatMessage[];
  otherName: string;
  /** Extra actions next to the call buttons (the vet's prescription button). */
  children?: React.ReactNode;
}) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [pending, start] = useTransition();
  const { upload, busy, error: uploadError } = useUpload("chat");
  const list = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastTyping = useRef(0);
  const callSignals: CallSignals = useRef(null);

  const upsert = (m: ChatMessage) =>
    setMessages((prev) => {
      const i = prev.findIndex((x) => x.id === m.id);
      if (i === -1) return [...prev, m].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const next = prev.slice();
      next[i] = m;
      return next;
    });

  const channel = useConsultChannel({
    consultId,
    viewerId,
    enabled: live,
    onMessage: (row) => {
      const m = fromRow(row);
      upsert(m);
      if (m.senderId && m.senderId !== viewerId) {
        setOtherTyping(false);
        if (document.visibilityState === "visible") void markRead(consultId);
      }
    },
    onBroadcast: (event, payload) => {
      if (event === "typing") {
        setOtherTyping(true);
        window.setTimeout(() => setOtherTyping(false), 4000);
      } else if (event === "call") {
        callSignals.current?.(payload);
      }
    },
  });

  useEffect(() => {
    if (live) void markRead(consultId);
  }, [consultId, live]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, otherTyping]);

  function typing() {
    const now = Date.now();
    if (now - lastTyping.current < 2500) return;
    lastTyping.current = now;
    void channel.send("typing");
  }

  function send(e?: FormEvent, imagePath?: string) {
    e?.preventDefault();
    const body = imagePath ? "" : text.trim();
    if (!body && !imagePath) return;
    start(async () => {
      const r = await sendMessage(locale, consultId, {
        body: body || undefined,
        imagePath: imagePath ?? null,
      });
      if (!r.ok) {
        toast.error(t(r.error));
        return;
      }
      upsert(r.message);
      if (!imagePath) setText("");
    });
  }

  async function attach(file: File | undefined) {
    if (!file) return;
    const path = await upload(file);
    if (path) send(undefined, path);
  }

  const lastMine = [...messages].reverse().find((m) => m.senderId === viewerId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {live ? (
        <div className="grid gap-2">
          <ConsultCall
            consultId={consultId}
            otherName={otherName}
            enabled={callable}
            otherOnline={channel.otherOnline}
            ready={channel.ready}
            send={channel.send}
            signalsRef={callSignals}
          />
          {children}
        </div>
      ) : (
        children
      )}
      <div
        ref={list}
        role="log"
        aria-live="polite"
        aria-label={t("consult.messages")}
        className="flex min-h-[50svh] flex-1 flex-col gap-2 overflow-y-auto px-1 py-4"
      >
        {messages.map((m) => {
          const system = m.senderId === null;
          if (system) {
            if (m.body === "system:rx" || m.body === "system:rx:updated") {
              return (
                <Link
                  key={m.id}
                  href={localeHref(locale, prescriptionPath(consultId))}
                  className="mx-auto flex items-center gap-2 rounded-(--control-radius) bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/15"
                >
                  <FileText aria-hidden="true" className="size-4" />
                  <span>
                    {t(m.body === "system:rx" ? "rx.line" : "rx.lineUpdated")} ·{" "}
                    <span className="font-semibold underline-offset-2 hover:underline">{t("rx.view")}</span>
                  </span>
                </Link>
              );
            }
            const callInfo = parseCallLine(m.body);
            if (callInfo) {
              const media = t(`call.media.${callInfo.media}`);
              const Icon =
                callInfo.status !== "ended" ? PhoneMissed : callInfo.media === "video" ? Video : Phone;
              return (
                <p
                  key={m.id}
                  className={cn(
                    "mx-auto flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-center text-xs",
                    callInfo.status === "ended" ? "text-muted-foreground" : "text-destructive",
                  )}
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                  {callInfo.status === "ended"
                    ? t("call.line.ended", { media, time: clock(callInfo.seconds) })
                    : t(
                        callInfo.status === "declined"
                          ? "call.line.declined"
                          : callInfo.status === "failed"
                            ? "call.line.failed"
                            : "call.line.missed",
                        { media },
                      )}
                  <span className="text-muted-foreground">
                    · {fmt.date(new Date(m.createdAt), { timeStyle: "short" })}
                  </span>
                </p>
              );
            }
            const key = SYSTEM_KEYS[m.body as keyof typeof SYSTEM_KEYS];
            return (
              <p
                key={m.id}
                className="mx-auto rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground"
              >
                {key ? t(key) : m.body}
              </p>
            );
          }
          const mine = m.senderId === viewerId;
          return (
            <div
              key={m.id}
              className={cn("flex max-w-[85%] flex-col gap-1", mine ? "items-end self-end" : "items-start")}
            >
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap",
                  mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted",
                )}
              >
                {m.hasImage ? <ChatImage messageId={m.id} /> : null}
                {m.body}
              </div>
              <span className="flex items-center gap-1 px-1 text-[0.6875rem] text-muted-foreground">
                {fmt.date(new Date(m.createdAt), { timeStyle: "short" })}
                {mine && m.id === lastMine?.id ? (
                  m.readAt ? (
                    <CheckCheck aria-label={t("consult.seen")} className="size-3.5 text-primary" />
                  ) : (
                    <Check aria-label={t("consult.sent")} className="size-3.5" />
                  )
                ) : null}
              </span>
            </div>
          );
        })}
        {otherTyping ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {t("consult.typing", { name: otherName })}
          </p>
        ) : null}
      </div>

      {canWrite ? (
        <form
          onSubmit={send}
          className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] flex items-end gap-2 border-t bg-background py-3 md:bottom-0"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("consult.attach")}
            disabled={busy || pending}
            onClick={() => fileInput.current?.click()}
          >
            {busy ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <ImagePlus aria-hidden="true" />
            )}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              void attach(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <label htmlFor="chat-text" className="sr-only">
            {t("consult.write")}
          </label>
          <Textarea
            id="chat-text"
            rows={1}
            value={text}
            maxLength={4000}
            placeholder={t("consult.write")}
            className="max-h-40 min-h-(--control-h) flex-1 resize-none"
            onChange={(e) => {
              setText(e.target.value);
              typing();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button type="submit" size="icon" aria-label={t("consult.send")} disabled={pending || !text.trim()}>
            <SendHorizontal aria-hidden="true" className="rtl:rotate-180" />
          </Button>
        </form>
      ) : null}
      {uploadError ? (
        <p role="alert" className="text-sm text-destructive">
          {t(uploadError, { mb: 10 })}
        </p>
      ) : null}
    </div>
  );
}
