"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { Phone, PhoneOff, Video } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { business } from "@/config";
import { chatPath } from "@/config/routes";
import { useAuthUser } from "@/features/auth/components/use-auth-user";
import { useLocale, useT } from "@/i18n/client";
import { loadSupabaseBrowser } from "@/infrastructure/supabase/browser-lazy";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { answerUrl, isChatPage, type CallMedia } from "../../calls";
import { endCall, ringingForMe } from "../../server/call-actions";
import { startTone } from "./ringtone";

interface Ring {
  callId: string;
  consultId: string;
  media: CallMedia;
  name: string;
}

function asRing(p: Record<string, unknown>): Ring | null {
  if (
    p.state !== "ringing" ||
    typeof p.callId !== "string" ||
    typeof p.consultId !== "string" ||
    typeof p.name !== "string" ||
    (p.media !== "audio" && p.media !== "video")
  )
    return null;
  return { callId: p.callId, consultId: p.consultId, media: p.media, name: p.name };
}

/** Closes the "calling you" notification once the call is answered or declined here. */
async function closeCallNotification(consultId: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const list = (await reg?.getNotifications({ tag: `call-${consultId}` })) ?? [];
    for (const n of list) n.close();
  } catch {
    // No service worker (dev build): nothing to close.
  }
}

/**
 * Rings on every page: the server sends "ringing" / "over" to the signed-in
 * person's private topic "user:<id>" (see server/call-signal.ts). Answer opens
 * the chat with ?answer=<call>, where the call screen picks up at once. On that
 * chat page itself the call screen rings instead, so this stays hidden there.
 */
export function IncomingCall() {
  const user = useAuthUser();
  const userId = user?.id ?? null;
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [ring, setRing] = useState<Ring | null>(null);
  const [busy, setBusy] = useState(false);
  const answerBtn = useRef<HTMLButtonElement>(null);
  const dismissTimer = useRef<number | null>(null);

  const show = useEffectEvent((r: Ring) => {
    setRing(r);
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    // The caller gives up after ringSeconds; never ring longer than that here.
    dismissTimer.current = window.setTimeout(
      () => setRing((cur) => (cur?.callId === r.callId ? null : cur)),
      (business.consult.call.ringSeconds + 5) * 1000,
    );
  });

  const onSignal = useEffectEvent((p: Record<string, unknown>) => {
    const r = asRing(p);
    if (r) {
      show(r);
      return;
    }
    if (p.state === "over" && typeof p.callId === "string") {
      setRing((cur) => (cur?.callId === p.callId ? null : cur));
      if (p.status !== "missed" && typeof p.consultId === "string") void closeCallNotification(p.consultId);
    }
  });

  const catchUp = useEffectEvent(async () => {
    const r = await ringingForMe().catch(() => null);
    if (r) show(r);
  });

  useEffect(() => {
    if (!userId || !business.consult.call.enabled) return;
    let alive = true;
    let ch: RealtimeChannel | null = null;
    let supabase: Awaited<ReturnType<typeof loadSupabaseBrowser>> | null = null;
    void (async () => {
      supabase = await loadSupabaseBrowser();
      if (!alive) return;
      await supabase.realtime.setAuth();
      if (!alive) return;
      ch = supabase
        .channel(`user:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "call" }, (msg: { payload?: Record<string, unknown> }) =>
          onSignal(msg.payload ?? {}),
        )
        .subscribe((status: string) => {
          // A ring sent before we joined (the page was opening) still shows.
          if (status === "SUBSCRIBED") void catchUp();
        });
    })();
    return () => {
      alive = false;
      if (ch && supabase) void supabase.removeChannel(ch);
    };
  }, [userId]);

  useEffect(
    () => () => {
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    },
    [],
  );

  const visible = ring !== null && !isChatPage(pathname, ring.consultId);

  // Ring and vibrate while the screen is up; focus Answer for keyboard users.
  useEffect(() => {
    if (!visible) return;
    const stop = startTone("in");
    answerBtn.current?.focus();
    return stop;
  }, [visible]);

  if (!ring || !visible) return null;
  const current = ring;

  function answer() {
    setRing(null);
    void closeCallNotification(current.consultId);
    router.push(answerUrl(localeHref(locale, chatPath(current.consultId)), current.callId) as never);
  }

  async function decline() {
    setBusy(true);
    setRing(null);
    void closeCallNotification(current.consultId);
    try {
      await endCall(locale, current.callId, "decline");
    } finally {
      setBusy(false);
    }
  }

  const Icon = current.media === "video" ? Video : Phone;
  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="incoming-call-name"
      aria-describedby="incoming-call-kind"
      className={cn(
        "fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[95] mx-auto max-w-sm",
        "rounded-(--radius-xl) border bg-card p-4 text-card-foreground shadow-(--shadow-card)",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="relative grid size-12 shrink-0 place-items-center rounded-full bg-success/15 text-success"
        >
          <span className="absolute inset-0 rounded-full bg-success/20 motion-safe:animate-ping" />
          <Icon className="relative size-5" />
        </span>
        <div className="min-w-0">
          <p id="incoming-call-name" className="truncate font-semibold">
            {current.name}
          </p>
          <p id="incoming-call-kind" className="text-sm text-muted-foreground">
            {t(current.media === "video" ? "call.incomingVideo" : "call.incomingAudio")}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="destructive" onClick={() => void decline()} disabled={busy}>
          <PhoneOff aria-hidden="true" />
          {t("call.decline")}
        </Button>
        <Button
          ref={answerBtn}
          onClick={answer}
          className="bg-success text-success-foreground hover:bg-success/90"
        >
          <Icon aria-hidden="true" />
          {t("call.accept")}
        </Button>
      </div>
    </div>
  );
}
