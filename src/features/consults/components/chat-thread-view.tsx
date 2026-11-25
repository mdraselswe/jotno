"use client";

import {
  AlertCircle,
  Check,
  CheckCheck,
  CircleCheck,
  Clock,
  ExternalLink,
  FileText,
  ImageOff,
  Lock,
  Phone,
  PhoneMissed,
  RefreshCw,
  RotateCcw,
  Video,
  VideoOff,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { prescriptionPath } from "@/config/routes";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { clock, parseCallLine, type CallMedia } from "../calls";
import { chatImageUrl } from "../server/actions";
import { isEmojiOnly, linkify, relativeDay, type BubblePosition, type ThreadMessage } from "./chat-thread";

/** A round photo with the first letter as the fallback. */
export function ChatAvatar({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-8 bg-muted", className)}>
      {photoUrl ? <AvatarImage src={photoUrl} alt="" className="object-cover" /> : null}
      <AvatarFallback className="bg-primary/12 font-semibold text-primary">
        {name.trim().charAt(0).toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

/** "Today" / "Yesterday" / a date, as a centred pill that sticks while its day scrolls by. */
export function DayPill({ day, today }: { day: string; today: string }) {
  const t = useT();
  const fmt = useFormatter();
  const rel = relativeDay(day, today);
  const label =
    rel === "today"
      ? t("chatui.today")
      : rel === "yesterday"
        ? t("chatui.yesterday")
        : fmt.date(new Date(`${day}T12:00:00Z`), {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: day.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
          });
  return (
    <li className="pointer-events-none sticky top-2 z-10 flex justify-center py-2">
      <span className="rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-(--shadow-control) ring-1 ring-foreground/6">
        {label}
      </span>
    </li>
  );
}

const SYSTEM_TEXT = {
  "system:opened": { key: "consult.sysOpened", icon: CircleCheck, tone: "text-success" },
  "system:closed": { key: "consult.sysClosed", icon: Lock, tone: "text-muted-foreground" },
  "system:refunded": { key: "consult.sysRefunded", icon: RotateCcw, tone: "text-info" },
  "system:refunded:admin": { key: "consult.sysRefundedAdmin", icon: RotateCcw, tone: "text-info" },
} as const;

/** Lines the app writes: consult opened/closed, prescriptions, calls. */
export function SystemRow({
  message,
  consultId,
  onCallBack,
}: {
  message: ThreadMessage;
  consultId: string;
  /** Set while a call can be placed: missed calls get a "Call back" button. */
  onCallBack?: (media: CallMedia) => void;
}) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const time = fmt.date(new Date(message.createdAt), { timeStyle: "short" });

  if (message.body === "system:rx" || message.body === "system:rx:updated") {
    return (
      <li className="flex justify-center py-1.5">
        <Link
          href={localeHref(locale, prescriptionPath(consultId))}
          className="flex max-w-full items-center gap-3 rounded-(--radius-2xl) bg-card py-2.5 ps-2.5 pe-4 shadow-(--shadow-card) ring-1 ring-primary/20 transition-shadow duration-(--motion-fast) hover:shadow-(--shadow-card-hover) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
            <FileText aria-hidden="true" className="size-5" />
          </span>
          <span className="grid min-w-0 text-start">
            <span className="text-sm font-semibold">
              {t(message.body === "system:rx" ? "rx.line" : "rx.lineUpdated")}
            </span>
            <span className="text-xs font-semibold text-primary">
              {t("rx.view")} <span className="font-normal text-muted-foreground">· {time}</span>
            </span>
          </span>
        </Link>
      </li>
    );
  }

  const call = parseCallLine(message.body);
  if (call) {
    const media = t(`call.media.${call.media}`);
    const missed = call.status !== "ended";
    const Icon = missed
      ? call.media === "video"
        ? VideoOff
        : PhoneMissed
      : call.media === "video"
        ? Video
        : Phone;
    const label =
      call.status === "ended"
        ? t("call.line.ended", { media, time: clock(call.seconds, fmt.number) })
        : t(
            call.status === "declined"
              ? "call.line.declined"
              : call.status === "failed"
                ? "call.line.failed"
                : "call.line.missed",
            { media },
          );
    return (
      <li className="flex justify-center py-1.5">
        <div className="flex max-w-full items-center gap-3 rounded-(--radius-2xl) bg-card py-2 ps-2 pe-3 shadow-(--shadow-card) ring-1 ring-foreground/6">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full",
              missed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            <Icon aria-hidden="true" className="size-4.5" />
          </span>
          <span className="grid min-w-0 text-start">
            <span className={cn("text-sm font-semibold", missed && "text-destructive")}>{label}</span>
            <span className="text-xs text-muted-foreground">{time}</span>
          </span>
          {missed && onCallBack ? (
            <Button
              size="sm"
              variant="outline"
              className="ms-1 rounded-full text-primary"
              onClick={() => onCallBack(call.media)}
            >
              {call.media === "video" ? <Video aria-hidden="true" /> : <Phone aria-hidden="true" />}
              {t("chatui.callBack")}
            </Button>
          ) : null}
        </div>
      </li>
    );
  }

  const known = SYSTEM_TEXT[message.body as keyof typeof SYSTEM_TEXT];
  const SysIcon = known?.icon;
  return (
    <li className="flex justify-center py-1.5">
      <p className="flex max-w-[90%] items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
        {SysIcon ? <SysIcon aria-hidden="true" className={cn("size-3.5 shrink-0", known.tone)} /> : null}
        <span>{known ? t(known.key) : message.body}</span>
      </p>
    </li>
  );
}

/** Corners that join inside a group (logical, so they mirror right-to-left). */
const CORNERS: Record<"mine" | "theirs", Record<BubblePosition, string>> = {
  mine: {
    single: "",
    first: "rounded-ee-(--radius-sm)",
    middle: "rounded-se-(--radius-sm) rounded-ee-(--radius-sm)",
    last: "rounded-se-(--radius-sm)",
  },
  theirs: {
    single: "",
    first: "rounded-es-(--radius-sm)",
    middle: "rounded-ss-(--radius-sm) rounded-es-(--radius-sm)",
    last: "rounded-ss-(--radius-sm)",
  },
};

function MessageText({ text, mine }: { text: string; mine: boolean }) {
  return linkify(text).map((part, i) =>
    part.href ? (
      <a
        key={i}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className={cn(
          "font-medium break-all underline underline-offset-2",
          mine ? "decoration-primary-foreground/60" : "text-primary decoration-primary/40",
        )}
      >
        {part.text}
      </a>
    ) : (
      <Fragment key={i}>{part.text}</Fragment>
    ),
  );
}

/** One chat bubble (and, at the end of a group, its time and sent/seen state). */
export function MessageBubble({
  message,
  mine,
  position,
  other,
  receipt,
  fresh,
  preview,
  footer,
  selfLabel,
}: {
  message: Pick<ThreadMessage, "id" | "body" | "hasImage" | "createdAt">;
  mine: boolean;
  position: BubblePosition;
  other: { name: string; photoUrl: string | null };
  /** Shown under my latest message. */
  receipt?: "sent" | "seen" | null;
  /** Arrived after the page opened: rises in (motion-safe only). */
  fresh?: boolean;
  /** A local preview of a photo I just sent (no signed URL needed). */
  preview?: string | null;
  /** Replaces the time line (sending / not sent). */
  footer?: ReactNode;
  /** Read before my bubbles ("You", or the owner's name in the admin view). */
  selfLabel?: string;
}) {
  const t = useT();
  const fmt = useFormatter();
  const created = new Date(message.createdAt);
  const endsGroup = position === "last" || position === "single";
  const startsGroup = position === "first" || position === "single";
  const text = message.body ?? "";
  const emoji = !message.hasImage && !preview && isEmojiOnly(text);
  const hasImage = message.hasImage || Boolean(preview);

  return (
    <li
      className={cn(
        "flex items-end gap-2",
        mine ? "justify-end" : "justify-start",
        startsGroup ? "mt-3" : "mt-0.5",
        fresh &&
          "motion-safe:animate-in motion-safe:duration-(--motion-base) motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2",
      )}
    >
      {!mine ? (
        endsGroup ? (
          <ChatAvatar name={other.name} photoUrl={other.photoUrl} className="mb-5 size-7" />
        ) : (
          <span aria-hidden="true" className="w-7 shrink-0" />
        )
      ) : null}
      <div
        className={cn("flex max-w-[80%] min-w-0 flex-col sm:max-w-[70%]", mine ? "items-end" : "items-start")}
      >
        <span className="sr-only">{mine ? `${selfLabel ?? t("chatui.you")}:` : `${other.name}:`}</span>
        {emoji ? (
          <p className="px-1 text-4xl leading-tight" title={fmt.dateTime(created)}>
            {text}
          </p>
        ) : (
          <div
            title={fmt.dateTime(created)}
            className={cn(
              "overflow-hidden rounded-(--radius-2xl) text-[0.9375rem] leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap",
              CORNERS[mine ? "mine" : "theirs"][position],
              mine
                ? "bg-primary text-primary-foreground"
                : "bg-card text-card-foreground shadow-(--shadow-control) ring-1 ring-foreground/6",
              hasImage ? "p-1" : "px-3.5 py-2",
            )}
          >
            {hasImage ? <ChatImage messageId={message.id} preview={preview ?? null} /> : null}
            {text ? (
              <p className={cn(hasImage && "px-2.5 pt-1.5 pb-1")}>
                <MessageText text={text} mine={mine} />
              </p>
            ) : null}
          </div>
        )}
        {footer ??
          (endsGroup ? (
            <span className="mt-1 flex items-center gap-1 px-1 text-[0.6875rem] text-muted-foreground">
              <time dateTime={message.createdAt}>{fmt.date(created, { timeStyle: "short" })}</time>
              {receipt === "seen" ? (
                <>
                  <CheckCheck aria-hidden="true" className="size-3.5 text-primary" />
                  <span>{t("consult.seen")}</span>
                </>
              ) : receipt === "sent" ? (
                <>
                  <Check aria-hidden="true" className="size-3.5" />
                  <span className="sr-only">{t("consult.sent")}</span>
                </>
              ) : null}
            </span>
          ) : null)}
      </div>
    </li>
  );
}

/** "Sending…" or "Not sent · Try again · Remove" under a bubble I just sent. */
export function OutgoingFooter({
  state,
  onRetry,
  onDiscard,
}: {
  state: "sending" | "failed";
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const t = useT();
  if (state === "sending")
    return (
      <span className="mt-1 flex items-center gap-1 px-1 text-[0.6875rem] text-muted-foreground">
        <Clock aria-hidden="true" className="size-3" />
        {t("chatui.sending")}
      </span>
    );
  return (
    <span role="alert" className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 px-1 text-xs">
      <span className="flex items-center gap-1 font-medium text-destructive">
        <AlertCircle aria-hidden="true" className="size-3.5" />
        {t("chatui.notSent")}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <RefreshCw aria-hidden="true" className="size-3" />
        {t("chatui.retry")}
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="rounded-full px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t("chatui.discard")}
      </button>
    </span>
  );
}

/** Three bouncing dots in the other person's bubble. */
export function TypingBubble({ other }: { other: { name: string; photoUrl: string | null } }) {
  const t = useT();
  return (
    <div className="mt-3 flex items-end gap-2">
      <ChatAvatar name={other.name} photoUrl={other.photoUrl} className="size-7" />
      <span className="flex h-9 items-center gap-1 rounded-(--radius-2xl) rounded-es-(--radius-sm) bg-card px-3.5 shadow-(--shadow-control) ring-1 ring-foreground/6">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="dot-bounce size-1.5 rounded-full bg-muted-foreground/70"
            style={{ "--i": i } as CSSProperties}
          />
        ))}
        <span className="sr-only">{t("consult.typing", { name: other.name })}</span>
      </span>
    </div>
  );
}

/**
 * A photo in a bubble: a fixed-size thumbnail (no jump while it loads), the
 * short-lived signed URL fetched only when it scrolls near the screen, and a
 * tap opens it large. A failed or expired link can be tried again.
 */
function ChatImage({ messageId, preview }: { messageId: string; preview: string | null }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const src = preview ?? url;

  useEffect(() => {
    const el = box.current;
    if (!el || preview) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [preview]);

  useEffect(() => {
    if (!near || preview) return;
    let alive = true;
    chatImageUrl(messageId).then(
      (u) => {
        if (!alive) return;
        if (u) setUrl(u);
        else setFailed(true);
      },
      () => {
        if (alive) setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [messageId, near, preview, attempt]);

  const retry = () => {
    setFailed(false);
    setLoaded(false);
    setUrl(null);
    setAttempt((n) => n + 1);
  };

  const frame =
    "relative block aspect-square w-56 max-w-full overflow-hidden rounded-[calc(var(--radius-2xl)-0.25rem)]";

  if (failed)
    return (
      <div ref={box} className={cn(frame, "grid place-items-center bg-muted text-muted-foreground")}>
        <button
          type="button"
          onClick={retry}
          className="grid justify-items-center gap-2 p-4 text-center text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ImageOff aria-hidden="true" className="size-6" />
          {t("chatui.photoFailed")}
        </button>
      </div>
    );

  return (
    <div ref={box}>
      <Dialog>
        <DialogTrigger
          disabled={!src}
          aria-label={t("chatui.openPhoto")}
          className={cn(
            frame,
            "bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          )}
        >
          {!loaded ? <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-muted" /> : null}
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL (or a local preview)
            <img
              src={src}
              alt={t("consult.photo")}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => {
                if (preview) return;
                if (attempt < 1) retry();
                else setFailed(true);
              }}
              className={cn(
                "size-full object-cover transition-opacity duration-(--motion-base)",
                loaded ? "opacity-100" : "opacity-0",
              )}
            />
          ) : null}
        </DialogTrigger>
        {src ? (
          <DialogContent className="max-w-[calc(100%-1rem)] gap-3 rounded-(--radius-2xl) p-2 sm:max-w-3xl">
            <DialogTitle className="sr-only">{t("consult.photo")}</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL (or a local preview) */}
            <img
              src={src}
              alt={t("consult.photo")}
              className="max-h-[80dvh] w-full rounded-(--radius-xl) object-contain"
            />
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ExternalLink aria-hidden="true" className="size-4" />
                {t("chatui.openOriginal")}
              </a>
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
