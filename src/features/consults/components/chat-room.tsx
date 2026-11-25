"use client";

import { ArrowDown, ChevronDown, FilePenLine, MessagesSquare, PawPrint, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { business, site } from "@/config";
import { prescriptionPath } from "@/config/routes";
import { PushPrompt } from "@/features/notifications";
import { useUpload } from "@/features/uploads";
import { useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { countsAsReply, parseCallLine } from "../calls";
import type { RxInput } from "../prescription";
import { markRead, sendMessage } from "../server/actions";
import type { ChatMessage } from "../server/queries";
import { ConsultCall, type CallPlacer, type CallSignals } from "./call/consult-call";
import { ChatComposer, ChatReadOnlyBar } from "./chat-composer";
import { ChatHeader, ChatMenu, type ChatPerson } from "./chat-header";
import { buildThread, countFromOthers, mergeMessages } from "./chat-thread";
import { MessageBubble, OutgoingFooter, SystemRow, TypingBubble, DayPill } from "./chat-thread-view";
import { ReplyCountdown } from "./consult-forms";
import { RxEditor } from "./rx/rx-editor";
import { useConsultChannel, type MessageRow } from "./use-consult-channel";

const fromRow = (r: MessageRow): ChatMessage => ({
  id: r.id,
  senderId: r.sender_id,
  body: r.body,
  hasImage: Boolean(r.image_path),
  readAt: r.read_at,
  createdAt: new Date(r.created_at).toISOString(),
});

/** A message I sent that the server hasn't confirmed yet (or that failed). */
interface Outgoing {
  key: string;
  body: string;
  file: File | null;
  preview: string | null;
  /** Set once the photo is uploaded, so a retry doesn't upload it again. */
  imagePath: string | null;
  state: "sending" | "failed";
  createdAt: string;
}

/** Closer than this to the bottom counts as "reading the latest". */
const NEAR_BOTTOM_PX = 120;
const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

const isEndLine = (m: ChatMessage) =>
  m.senderId === null &&
  (m.body === "system:closed" || m.body === "system:refunded" || m.body === "system:refunded:admin");

export function ChatRoom({
  consultId,
  viewerId,
  role,
  status,
  canWrite,
  live,
  callable,
  initial,
  today,
  other,
  backHref,
  stateLine,
  details,
  replyDeadline,
  canClose,
  rx,
  readOnlyReason,
  selfLabel,
  children,
}: {
  consultId: string;
  viewerId: string;
  role: "owner" | "vet" | "admin";
  status: "pending_payment" | "active" | "closed" | "refunded" | "cancelled";
  canWrite: boolean;
  /** Joins the live channel (participants only; the admin view is a snapshot). */
  live: boolean;
  /** Audio/video calls are possible (an open consult, a participant). */
  callable: boolean;
  initial: ChatMessage[];
  /** Today's day key in the site's time zone, from the server (same text on both sides). */
  today: string;
  other: ChatPerson;
  backHref: string;
  /** "Open until 3:40 PM" / "Ended": the header line when nobody is typing or online. */
  stateLine: string;
  /** The pet and the owner's description, pinned under the header. */
  details: { pet: string | null; summary: string; notes: string | null };
  /** Owner: the vet must answer before this (ISO), or the consult is refunded. */
  replyDeadline: string | null;
  /** Vet: may end the chat now. */
  canClose: boolean;
  /** Vet: may write or change the prescription now. */
  rx: { initial: RxInput | null; linkedNames: Record<string, string> } | null;
  /** Why nobody can write here (shown instead of the message box). */
  readOnlyReason: string | null;
  /** Admin view: the owner's name (their bubbles are on the right). */
  selfLabel?: string;
  /** Under the conversation (the owner's review form). */
  children?: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  // A refetch (router.refresh after a reconnect) brings a new `initial`: merge it in.
  const [lastInitial, setLastInitial] = useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setMessages((prev) => mergeMessages(prev, initial));
  }
  const [loadedIds] = useState(() => new Set(initial.map((m) => m.id)));
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<{ file: File; preview: string } | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [rxOpen, setRxOpen] = useState(false);
  const { upload, error: uploadError } = useUpload("chat");

  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const firstScroll = useRef(true);
  const everReady = useRef(false);
  const lastTyping = useRef(0);
  const typingTimer = useRef<number | null>(null);
  const seq = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const callSignals: CallSignals = useRef(null);
  const placeCall: CallPlacer = useRef(null);

  // The consult can end while the page is open (the vet ends it, time runs out).
  const endedHere = messages.some(isEndLine);
  const open = status === "active" && !endedHere;
  const writable = canWrite && open;
  const canCall = callable && open;
  // A call both sides talked on long enough counts as the reply (no text needed).
  const talked = messages.some((m) => {
    const call = m.senderId === null ? parseCallLine(m.body) : null;
    return call !== null && countsAsReply(call.status, call.seconds, business.consult.call.replySeconds);
  });
  const anyCall = messages.some((m) => m.senderId === null && parseCallLine(m.body) !== null);
  const otherReplied = talked || messages.some((m) => m.senderId !== null && m.senderId !== viewerId);
  const mineSent = messages.some((m) => m.senderId === viewerId);
  const hasRx =
    Boolean(rx?.initial) || messages.some((m) => m.body === "system:rx" || m.body === "system:rx:updated");

  const channel = useConsultChannel({
    consultId,
    viewerId,
    enabled: live,
    onMessage: (row) => {
      const m = fromRow(row);
      if (m.senderId === viewerId) {
        // The live copy of a message I'm still sending: drop its "sending" twin.
        setOutgoing((list) => {
          const i = list.findIndex(
            (o) => o.state === "sending" && o.body === (m.body ?? "") && Boolean(o.file) === m.hasImage,
          );
          return i === -1 ? list : list.filter((_, j) => j !== i);
        });
      }
      setMessages((prev) => mergeMessages(prev, [m]));
      if (m.senderId && m.senderId !== viewerId) {
        setOtherTyping(false);
        if (document.visibilityState === "visible") void markRead(consultId);
      }
    },
    onBroadcast: (event, payload) => {
      if (event === "typing") {
        setOtherTyping(true);
        if (typingTimer.current) window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(() => setOtherTyping(false), 4000);
      } else if (event === "call") {
        callSignals.current?.(payload);
      }
    },
  });

  // Mark read on open and whenever the tab comes back to the front.
  useEffect(() => {
    if (!live) return;
    void markRead(consultId);
    const onVisible = () => {
      if (document.visibilityState === "visible") void markRead(consultId);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [consultId, live]);

  // Realtime doesn't replay what was missed while offline: refetch after a reconnect.
  useEffect(() => {
    if (!channel.ready) return;
    if (everReady.current) router.refresh();
    everReady.current = true;
  }, [channel.ready, router]);

  // It just ended here: refresh the server parts (status, review form).
  useEffect(() => {
    if (endedHere && status === "active") router.refresh();
  }, [endedHere, status, router]);

  useEffect(
    () => () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    },
    [],
  );

  // Stay at the latest message only if the reader is already there; open at the bottom.
  const contentSize = messages.length + outgoing.length + (otherTyping ? 1 : 0);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (firstScroll.current) {
      firstScroll.current = false;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (stick.current) el.scrollTo({ top: el.scrollHeight, behavior: scrollBehavior() });
  }, [contentSize]);

  // The keyboard opening (or the box growing) shrinks the list: keep the latest in view.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    stick.current = near;
    if (near !== atBottom) {
      setAtBottom(near);
      setAnchor(near ? null : messages.length);
    }
  }

  function toLatest() {
    stick.current = true;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: scrollBehavior() });
  }

  function typing() {
    const now = Date.now();
    if (now - lastTyping.current < 2500) return;
    lastTyping.current = now;
    void channel.send("typing");
  }

  const patch = (key: string, p: Partial<Outgoing>) =>
    setOutgoing((list) => list.map((o) => (o.key === key ? { ...o, ...p } : o)));

  async function deliver(item: Outgoing) {
    try {
      let imagePath = item.imagePath;
      if (item.file && !imagePath) {
        imagePath = await upload(item.file);
        if (!imagePath) {
          patch(item.key, { state: "failed" });
          return;
        }
        patch(item.key, { imagePath });
      }
      const r = await sendMessage(locale, consultId, { body: item.body || undefined, imagePath });
      if (!r.ok) {
        patch(item.key, { state: "failed" });
        toast.error(t(r.error));
        return;
      }
      const preview = item.preview;
      if (preview) setPreviews((p) => ({ ...p, [r.message.id]: preview }));
      setMessages((prev) => mergeMessages(prev, [r.message]));
      setOutgoing((list) => list.filter((o) => o.key !== item.key));
    } catch {
      patch(item.key, { state: "failed" });
    }
  }

  // One at a time, in the order they were written.
  const enqueue = (item: Outgoing) => {
    queue.current = queue.current.then(() => deliver(item));
  };

  function send() {
    const body = text.trim();
    if (!writable || (!body && !draft)) return;
    seq.current += 1;
    const item: Outgoing = {
      key: `out-${seq.current}`,
      body,
      file: draft?.file ?? null,
      preview: draft?.preview ?? null,
      imagePath: null,
      state: "sending",
      createdAt: new Date().toISOString(),
    };
    stick.current = true;
    setOutgoing((list) => [...list, item]);
    setText("");
    setDraft(null);
    enqueue(item);
  }

  function retry(key: string) {
    const item = outgoing.find((o) => o.key === key);
    if (!item) return;
    patch(key, { state: "sending" });
    enqueue({ ...item, state: "sending" });
  }

  function discard(key: string) {
    const item = outgoing.find((o) => o.key === key);
    if (item?.preview) URL.revokeObjectURL(item.preview);
    setOutgoing((list) => list.filter((o) => o.key !== key));
  }

  function pick(file: File) {
    if (draft) URL.revokeObjectURL(draft.preview);
    setDraft({ file, preview: URL.createObjectURL(file) });
  }

  function clearDraft() {
    if (draft) URL.revokeObjectURL(draft.preview);
    setDraft(null);
  }

  const rows = buildThread(messages, viewerId, site.i18n.timeZone);
  const lastMineId = messages.findLast((m) => m.senderId === viewerId)?.id;
  const lastMine = messages.find((m) => m.id === lastMineId);
  const newCount = anchor === null ? 0 : countFromOthers(messages, viewerId, anchor);
  const otherForBubble = { name: other.name, photoUrl: other.photoUrl };
  const onCallBack = canCall && live ? (media: "audio" | "video") => placeCall.current?.(media) : undefined;

  const headerStatus = otherTyping
    ? { text: t("chatui.typing"), tone: "primary" as const }
    : live && channel.otherOnline
      ? { text: t("chatui.activeNow"), tone: "success" as const }
      : { text: stateLine, tone: "muted" as const };

  return (
    <section
      aria-label={other.name}
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background sm:rounded-(--radius-2xl) sm:bg-card sm:shadow-(--shadow-card) sm:ring-1 sm:ring-foreground/6"
    >
      <ChatHeader
        backHref={backHref}
        other={other}
        status={headerStatus.text}
        statusTone={headerStatus.tone}
        online={live && channel.otherOnline}
        calls={
          live ? (
            // Room for the two call buttons before hydration (no jump in the header).
            <span className={cn("flex shrink-0 justify-end", canCall && "min-w-21")}>
              <ConsultCall
                consultId={consultId}
                otherName={other.name}
                otherPhoto={other.photoUrl}
                enabled={canCall}
                otherOnline={channel.otherOnline}
                ready={channel.ready}
                send={channel.send}
                signalsRef={callSignals}
                placeRef={placeCall}
              />
            </span>
          ) : null
        }
        menu={
          <ChatMenu
            consultId={consultId}
            profileHref={other.href}
            rxHref={hasRx ? localeHref(locale, prescriptionPath(consultId)) : null}
            rx={rx ? { editing: Boolean(rx.initial), onOpen: () => setRxOpen(true) } : null}
            canClose={role === "vet" && open && (canClose || mineSent || talked)}
            canReport={role !== "admin"}
          />
        }
      />

      {/* Pinned under the header: the case, the reply clock, notices. */}
      <div className="grid shrink-0 border-b bg-card">
        {role === "admin" ? (
          <p className="flex items-center gap-2 bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning-foreground dark:text-warning">
            <ShieldAlert aria-hidden="true" className="size-4 shrink-0" />
            {t("consult.adminView")}
          </p>
        ) : null}
        <div className="flex items-start gap-2 px-3 py-2">
          <details className="group min-w-0 flex-1">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-(--radius-md) text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <PawPrint aria-hidden="true" className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{details.pet ?? t("chatui.details")}</span>
                <span className="text-muted-foreground"> · {details.summary}</span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-fast) group-open:rotate-180"
              />
            </summary>
            <div className="grid gap-1.5 ps-9 pt-2 pb-1 text-sm">
              <p className="whitespace-pre-wrap text-foreground/85">{details.summary}</p>
              {details.notes ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{details.notes}</p>
              ) : null}
            </div>
          </details>
          {rx ? (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 rounded-full"
              onClick={() => setRxOpen(true)}
            >
              <FilePenLine aria-hidden="true" />
              <span className="max-sm:sr-only">{t(rx.initial ? "rx.edit" : "rx.write")}</span>
            </Button>
          ) : null}
        </div>
        {role === "owner" && replyDeadline && open && !otherReplied ? (
          <ReplyCountdown deadline={replyDeadline} className="border-t" />
        ) : null}
        {live && canCall ? <PushPrompt className="m-2 mt-0" /> : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/35 px-2.5 pt-1 pb-4 sm:px-5"
        >
          <ol
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label={t("consult.messages")}
            className="mx-auto flex max-w-2xl flex-col"
          >
            {rows.map((row) => {
              if (row.kind === "day") return <DayPill key={row.key} day={row.day} today={today} />;
              if (row.kind === "system")
                return (
                  <SystemRow
                    key={row.key}
                    message={row.message}
                    consultId={consultId}
                    onCallBack={onCallBack}
                  />
                );
              const m = row.message;
              return (
                <MessageBubble
                  key={row.key}
                  message={m}
                  mine={row.mine}
                  position={row.position}
                  other={otherForBubble}
                  selfLabel={selfLabel}
                  fresh={!loadedIds.has(m.id)}
                  preview={previews[m.id] ?? null}
                  receipt={
                    row.mine && m.id === lastMineId && outgoing.length === 0
                      ? lastMine?.readAt
                        ? "seen"
                        : "sent"
                      : null
                  }
                />
              );
            })}
            {outgoing.map((o) => (
              <MessageBubble
                key={o.key}
                message={{ id: o.key, body: o.body, hasImage: false, createdAt: o.createdAt }}
                mine
                position="single"
                other={otherForBubble}
                selfLabel={selfLabel}
                fresh
                preview={o.preview}
                footer={
                  <OutgoingFooter
                    state={o.state}
                    onRetry={() => retry(o.key)}
                    onDiscard={() => discard(o.key)}
                  />
                }
              />
            ))}
          </ol>
          {!otherReplied && !mineSent && !anyCall && outgoing.length === 0 ? (
            <div className="mx-auto mt-8 grid max-w-xs justify-items-center gap-3 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <MessagesSquare aria-hidden="true" className="size-6" />
              </span>
              <p className="text-sm text-pretty text-muted-foreground">
                {t(role === "vet" ? "chatui.emptyThreadVet" : "chatui.emptyThread")}
              </p>
            </div>
          ) : null}
          {otherTyping ? (
            <div className="mx-auto max-w-2xl">
              <TypingBubble other={otherForBubble} />
            </div>
          ) : null}
          {children ? <div className="mx-auto mt-6 max-w-2xl">{children}</div> : null}
        </div>

        {!atBottom ? (
          <button
            type="button"
            onClick={toLatest}
            aria-label={
              newCount > 0
                ? `${t("chatui.toLatest")} (${t("chatui.newCount", { n: newCount })})`
                : t("chatui.toLatest")
            }
            className={cn(
              "absolute end-3 bottom-3 flex h-10 items-center gap-1.5 rounded-full bg-card px-3 text-sm font-semibold text-foreground shadow-(--shadow-card) ring-1 ring-foreground/10 transition-transform duration-(--motion-fast) ease-(--ease-press) hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-95 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-90",
              newCount === 0 && "w-10 justify-center px-0",
            )}
          >
            {newCount > 0 ? (
              <span className="rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground tabular-nums">
                {t("chatui.newCount", { n: newCount })}
              </span>
            ) : null}
            <ArrowDown aria-hidden="true" className="size-4.5" />
          </button>
        ) : null}
      </div>

      {writable ? (
        <ChatComposer
          value={text}
          onChange={(v) => {
            setText(v);
            typing();
          }}
          onSend={send}
          draft={draft}
          onPick={pick}
          onClearDraft={clearDraft}
          error={uploadError ? t(uploadError, { mb: 10 }) : null}
        />
      ) : (
        <ChatReadOnlyBar
          reason={readOnlyReason ?? t(endedHere ? "chatui.closedBar" : "consult.closedNote")}
        />
      )}

      {rx ? (
        <RxEditor
          consultId={consultId}
          initial={rx.initial}
          linkedNames={rx.linkedNames}
          patient={{ pet: details.pet, owner: other.name, complaint: details.summary }}
          open={rxOpen}
          onOpenChange={setRxOpen}
        />
      ) : null}
    </section>
  );
}
