"use client";

import { Copy, Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { business } from "@/config";
import { useMounted } from "@/hooks/use-mounted";
import type { MessageKey } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { clock, isInAppBrowser, type CallMedia, type EndReason } from "../../calls";
import { answerCall, callBeat, endCall, pendingCall, startCall } from "../../server/call-actions";
import { PeerCall, type PeerSignal, type PeerState } from "./peer";
import { startTone } from "./ringtone";

/** The chat hands call signals (broadcast event "call") to the call through this. */
export type CallSignals = RefObject<((payload: Record<string, unknown>) => void) | null>;

type Phase =
  | { name: "idle" }
  | { name: "outgoing"; callId: string; media: CallMedia }
  | { name: "incoming"; callId: string; media: CallMedia }
  | { name: "live"; callId: string; media: CallMedia; peer: PeerState; since: number | null };

type Signal =
  | { kind: "ring"; callId: string; media: CallMedia }
  | { kind: "accept"; callId: string }
  | { kind: "decline"; callId: string }
  | { kind: "hangup"; callId: string }
  | { kind: "cam"; callId: string; on: boolean }
  | ({ callId: string } & PeerSignal);

const BEAT_MS = 30_000;

function asSignal(p: Record<string, unknown>): Signal | null {
  if (typeof p.callId !== "string" || typeof p.kind !== "string") return null;
  if (p.kind === "ring" && p.media !== "audio" && p.media !== "video") return null;
  return p as unknown as Signal;
}

function support(): "ok" | "inApp" | "unsupported" {
  if (isInAppBrowser(navigator.userAgent)) return "inApp";
  if (!window.isSecureContext || !("RTCPeerConnection" in window) || !navigator.mediaDevices?.getUserMedia)
    return "unsupported";
  return "ok";
}

async function acquire(media: CallMedia): Promise<MediaStream | MessageKey> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video:
        media === "video"
          ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 24 } }
          : false,
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") return "call.permission";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "call.noDevice";
    return "call.unsupported";
  }
}

const stopAll = (s: MediaStream | null) => s?.getTracks().forEach((t) => t.stop());

export function ConsultCall({
  consultId,
  otherName,
  enabled,
  otherOnline,
  ready,
  send,
  signalsRef,
}: {
  consultId: string;
  otherName: string;
  /** The consult is open (calls only happen in an active consult). */
  enabled: boolean;
  otherOnline: boolean;
  ready: boolean;
  send: (event: string, payload: Record<string, unknown>) => unknown;
  signalsRef: CallSignals;
}) {
  const t = useT();
  const locale = useLocale();
  const mounted = useMounted();
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(true);
  /** What this side sends: an owner can answer a video call with audio only. */
  const [myMedia, setMyMedia] = useState<CallMedia>("audio");
  const [remoteCam, setRemoteCam] = useState(true);
  const [now, setNow] = useState(0);
  const [starting, setStarting] = useState(false);

  const phaseRef = useRef<Phase>(phase);
  const local = useRef<MediaStream | null>(null);
  const peer = useRef<PeerCall | null>(null);
  const ice = useRef<RTCIceServer[]>([]);
  const early = useRef<PeerSignal[]>([]);
  const timers = useRef<number[]>([]);
  const tone = useRef<(() => void) | null>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const firstButton = useRef<HTMLButtonElement>(null);

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const every = (fn: () => void, ms: number) => timers.current.push(window.setInterval(fn, ms));
  const signal = (payload: Record<string, unknown>) => send("call", payload);
  const stopTone = () => {
    tone.current?.();
    tone.current = null;
  };

  function cleanup() {
    for (const id of timers.current) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
    timers.current = [];
    stopTone();
    peer.current?.close();
    peer.current = null;
    stopAll(local.current);
    local.current = null;
    remoteStream.current = null;
    early.current = [];
    setMuted(false);
    setCamOn(true);
    setRemoteCam(true);
    go({ name: "idle" });
  }

  /** Ends the call here and tells the other side and the server. */
  function finish(reason: EndReason, note?: MessageKey) {
    const p = phaseRef.current;
    if (p.name === "idle") return;
    const talked = p.name === "live" && p.since ? Math.round((Date.now() - p.since) / 1000) : 0;
    signal({ kind: reason === "decline" ? "decline" : "hangup", callId: p.callId });
    void endCall(locale, p.callId, reason);
    cleanup();
    if (note) toast(t(note, { name: otherName }));
    else if (talked > 0) toast(t("call.endedToast", { time: clock(talked) }));
  }

  function connect(callId: string, media: CallMedia, polite: boolean) {
    const stream = local.current;
    if (!stream) return;
    const pc = new PeerCall(ice.current, polite, {
      signal: (s) => signal({ ...s, callId }),
      remoteStream: (rs) => {
        remoteStream.current = rs;
        if (remoteVideo.current) remoteVideo.current.srcObject = rs;
        if (remoteAudio.current) remoteAudio.current.srcObject = rs;
      },
      state: (s) => onPeerState(s),
    });
    peer.current = pc;
    pc.addLocal(stream);
    go({ name: "live", callId, media, peer: "connecting", since: null });
    for (const s of early.current.splice(0)) void pc.handle(s);
  }

  function onPeerState(s: PeerState) {
    const p = phaseRef.current;
    if (p.name !== "live" || s === "closed") return;
    if (s === "failed") {
      finish(p.since ? "hangup" : "failed", p.since ? undefined : "call.failed");
      return;
    }
    const since = s === "connected" && !p.since ? Date.now() : p.since;
    go({ ...p, peer: s, since });
    if (s === "connected" && !p.since) {
      // Heartbeat: keeps the call's length right if a tab dies, and notes the relay.
      every(() => {
        const cur = phaseRef.current;
        if (cur.name !== "live") return;
        void (async () => {
          const relayed = (await peer.current?.usesRelay()) ?? null;
          const r = await callBeat(cur.callId, relayed);
          if (!r.live && phaseRef.current.name === "live") finish("hangup");
        })();
      }, BEAT_MS);
    }
  }

  async function begin(media: CallMedia) {
    if (phaseRef.current.name !== "idle" || starting) return;
    setStarting(true);
    try {
      await placeCall(media);
    } finally {
      setStarting(false);
    }
  }

  async function placeCall(media: CallMedia) {
    const stream = await acquire(media);
    if (typeof stream === "string") {
      toast.error(t(stream));
      return;
    }
    const r = await startCall(locale, consultId, media);
    if (!r.ok) {
      stopAll(stream);
      toast.error(t(r.error));
      return;
    }
    local.current = stream;
    ice.current = r.ice;
    setCamOn(media === "video");
    setMyMedia(media);
    go({ name: "outgoing", callId: r.callId, media });
    tone.current = startTone("out");
    const ring = () => signal({ kind: "ring", callId: r.callId, media });
    ring();
    // Ring again now and then: the other side may open the chat from the notification.
    every(ring, 4000);
    later(() => {
      if (phaseRef.current.name === "outgoing") finish("no_answer", "call.noAnswer");
    }, business.consult.call.ringSeconds * 1000);
  }

  async function accept(audioOnly: boolean) {
    const p = phaseRef.current;
    if (p.name !== "incoming") return;
    stopTone();
    const media: CallMedia = audioOnly ? "audio" : p.media;
    const stream = await acquire(media);
    if (typeof stream === "string") {
      toast.error(t(stream));
      return;
    }
    const r = await answerCall(p.callId);
    if (!r.ok) {
      stopAll(stream);
      cleanup();
      toast.error(t(r.error));
      return;
    }
    local.current = stream;
    ice.current = r.ice;
    setCamOn(media === "video");
    setMyMedia(media);
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
    signal({ kind: "accept", callId: p.callId });
    connect(p.callId, p.media, true);
    if (media === "audio" && p.media === "video") signal({ kind: "cam", callId: p.callId, on: false });
  }

  function ringIn(callId: string, media: CallMedia) {
    if (phaseRef.current.name !== "idle") return;
    go({ name: "incoming", callId, media });
    tone.current = startTone("in");
    later(
      () => {
        if (phaseRef.current.name === "incoming") cleanup();
      },
      (business.consult.call.ringSeconds + 5) * 1000,
    );
  }

  const onSignal = useEffectEvent((raw: Record<string, unknown>) => {
    const s = asSignal(raw);
    if (!s) return;
    const p = phaseRef.current;
    if (s.kind === "ring") {
      if (p.name === "idle") ringIn(s.callId, s.media);
      return;
    }
    if (p.name === "idle" || p.callId !== s.callId) return;
    switch (s.kind) {
      case "accept":
        if (p.name === "outgoing") {
          stopTone();
          for (const id of timers.current) {
            window.clearTimeout(id);
            window.clearInterval(id);
          }
          timers.current = [];
          connect(p.callId, p.media, false);
        }
        return;
      case "decline":
        cleanup();
        toast(t("call.declined", { name: otherName }));
        return;
      case "hangup": {
        const talked = p.name === "live" && p.since ? Math.round((Date.now() - p.since) / 1000) : 0;
        cleanup();
        if (talked > 0) toast(t("call.endedToast", { time: clock(talked) }));
        return;
      }
      case "cam":
        setRemoteCam(s.on);
        return;
      case "sdp":
      case "ice":
        if (peer.current) void peer.current.handle(s);
        else early.current.push(s);
        return;
    }
  });

  // The chat passes "call" broadcasts here.
  useEffect(() => {
    signalsRef.current = (payload) => onSignal(payload);
    return () => {
      signalsRef.current = null;
    };
  }, [signalsRef]);

  // Opened the chat from a "calling you" notification or popup: the call may still be
  // ringing. "?answer=<callId>" means they already tapped Answer, so pick up at once.
  const checkPending = useEffectEvent(async () => {
    const c = await pendingCall(consultId);
    if (!c) return;
    ringIn(c.callId, c.media);
    const params = new URLSearchParams(window.location.search);
    if (params.get("answer") !== c.callId) return;
    params.delete("answer");
    const q = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
    await accept(false);
  });
  useEffect(() => {
    if (enabled && ready) void checkPending();
  }, [enabled, ready]);

  // Leaving the page ends the call; a network change looks for a new path.
  const onLeave = useEffectEvent(() => {
    const p = phaseRef.current;
    if (p.name === "outgoing") finish("cancel");
    else if (p.name === "incoming") finish("decline");
    else if (p.name === "live") finish("hangup");
  });
  const onOnline = useEffectEvent(() => peer.current?.restart());
  useEffect(() => {
    const leave = () => onLeave();
    const online = () => onOnline();
    window.addEventListener("pagehide", leave);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("online", online);
      onLeave();
    };
  }, []);

  // Call timer.
  const live = phase.name === "live" && phase.since !== null;
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  // Wire the media elements whenever the call screen (re)renders them.
  useEffect(() => {
    if (localVideo.current && local.current) localVideo.current.srcObject = local.current;
    if (remoteVideo.current && remoteStream.current) remoteVideo.current.srcObject = remoteStream.current;
    if (remoteAudio.current && remoteStream.current) remoteAudio.current.srcObject = remoteStream.current;
  }, [phase.name, camOn]);

  useEffect(() => {
    if (phase.name !== "idle") firstButton.current?.focus();
  }, [phase.name]);

  function toggleMute() {
    const next = !muted;
    for (const tr of local.current?.getAudioTracks() ?? []) tr.enabled = !next;
    setMuted(next);
  }

  async function toggleCamera() {
    const p = phaseRef.current;
    if (p.name !== "live" || !local.current) return;
    if (camOn) {
      for (const tr of local.current.getVideoTracks()) {
        tr.stop();
        local.current.removeTrack(tr);
      }
      await peer.current?.replaceVideo(null);
      setCamOn(false);
      signal({ kind: "cam", callId: p.callId, on: false });
      return;
    }
    const cam = await acquire("video");
    if (typeof cam === "string") {
      toast.error(t(cam));
      return;
    }
    const track = cam.getVideoTracks()[0];
    for (const a of cam.getAudioTracks()) a.stop();
    if (!track) return;
    local.current.addTrack(track);
    await peer.current?.replaceVideo(track);
    setCamOn(true);
    signal({ kind: "cam", callId: p.callId, on: true });
  }

  if (!mounted) return null;
  const can = support();

  if (phase.name === "idle") {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <span className="flex min-w-0 flex-1 basis-full items-center gap-2 text-xs text-muted-foreground sm:basis-0">
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-full",
              otherOnline ? "bg-success" : "bg-muted-foreground/40",
            )}
          />
          {can === "inApp"
            ? t("call.inApp")
            : can === "unsupported"
              ? t("call.unsupported")
              : t(otherOnline ? "call.online" : "call.offline", { name: otherName })}
        </span>
        {can === "inApp" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(window.location.href)
                .then(() => toast(t("call.linkCopied")));
            }}
          >
            <Copy aria-hidden="true" />
            {t("call.copyLink")}
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={!enabled || !ready || starting || can !== "ok"}
              aria-busy={starting}
              onClick={() => void begin("audio")}
            >
              <Phone aria-hidden="true" />
              {t("call.audio")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!enabled || !ready || starting || can !== "ok"}
              aria-busy={starting}
              onClick={() => void begin("video")}
            >
              <Video aria-hidden="true" />
              {t("call.video")}
            </Button>
          </>
        )}
      </div>
    );
  }

  const isVideo = phase.media === "video";
  const showRemoteVideo = phase.name === "live" && isVideo && remoteCam;
  const status =
    phase.name === "outgoing"
      ? t("call.calling", { name: otherName })
      : phase.name === "incoming"
        ? t("call.incoming", { name: otherName })
        : phase.since && phase.peer === "connected"
          ? clock((now - phase.since) / 1000)
          : t(phase.peer === "reconnecting" ? "call.reconnecting" : "call.connecting");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-title"
      aria-describedby="call-status"
      className="fixed inset-0 z-50 flex flex-col bg-foreground text-background"
    >
      {/* Remote media fills the screen; audio-only calls show the name instead. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className={cn("absolute inset-0 size-full object-cover", showRemoteVideo ? "block" : "hidden")}
        />
        <audio ref={remoteAudio} autoPlay className="hidden" />
        {!showRemoteVideo ? (
          <div className="grid justify-items-center gap-4 px-6 text-center">
            <span className="relative grid size-28 place-items-center rounded-full bg-background/10 text-4xl font-semibold">
              {phase.name !== "live" ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-background/15 motion-safe:animate-ping"
                />
              ) : null}
              {otherName.trim().charAt(0).toUpperCase() || "?"}
            </span>
            {phase.name === "live" && isVideo && !remoteCam ? (
              <span className="text-sm opacity-75">{t("call.cameraIsOff")}</span>
            ) : null}
          </div>
        ) : null}

        <div className="absolute inset-x-0 top-0 grid gap-1 bg-linear-to-b from-foreground/80 to-transparent px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-8 text-center">
          <h2 id="call-title" className="text-lg font-semibold">
            {otherName}
          </h2>
          <p id="call-status" aria-live="polite" className="text-sm tabular-nums opacity-85">
            {status}
          </p>
          <p className="text-xs opacity-60">{t("call.private")}</p>
        </div>

        {myMedia === "video" && camOn && phase.name !== "incoming" ? (
          <video
            ref={localVideo}
            autoPlay
            playsInline
            muted
            aria-label={t("call.yourCamera")}
            className="absolute right-4 bottom-4 aspect-3/4 w-28 rounded-(--radius-xl) object-cover shadow-(--shadow-card) ring-2 ring-background/30 sm:w-36"
          />
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {phase.name === "incoming" ? (
          <>
            <Button
              ref={firstButton}
              size="icon-lg"
              className="size-16 rounded-full bg-success text-success-foreground hover:bg-success/90"
              aria-label={t("call.accept")}
              onClick={() => void accept(false)}
            >
              {isVideo ? (
                <Video aria-hidden="true" className="size-7" />
              ) : (
                <Phone aria-hidden="true" className="size-7" />
              )}
            </Button>
            {isVideo ? (
              <Button
                size="icon-lg"
                variant="secondary"
                className="size-14 rounded-full"
                aria-label={t("call.acceptAudio")}
                onClick={() => void accept(true)}
              >
                <Phone aria-hidden="true" className="size-6" />
              </Button>
            ) : null}
            <Button
              size="icon-lg"
              variant="destructive"
              className="size-16 rounded-full"
              aria-label={t("call.decline")}
              onClick={() => finish("decline")}
            >
              <PhoneOff aria-hidden="true" className="size-7" />
            </Button>
          </>
        ) : (
          <>
            {phase.name === "live" ? (
              <Button
                size="icon-lg"
                variant="secondary"
                className="size-14 rounded-full"
                aria-pressed={muted}
                aria-label={t(muted ? "call.unmute" : "call.mute")}
                onClick={toggleMute}
              >
                {muted ? (
                  <MicOff aria-hidden="true" className="size-6" />
                ) : (
                  <Mic aria-hidden="true" className="size-6" />
                )}
              </Button>
            ) : null}
            {phase.name === "live" && myMedia === "video" ? (
              <Button
                size="icon-lg"
                variant="secondary"
                className="size-14 rounded-full"
                aria-pressed={!camOn}
                aria-label={t(camOn ? "call.cameraOff" : "call.cameraOn")}
                onClick={() => void toggleCamera()}
              >
                {camOn ? (
                  <Video aria-hidden="true" className="size-6" />
                ) : (
                  <VideoOff aria-hidden="true" className="size-6" />
                )}
              </Button>
            ) : null}
            <Button
              ref={firstButton}
              size="icon-lg"
              variant="destructive"
              className="size-16 rounded-full"
              aria-label={t(phase.name === "outgoing" ? "call.cancel" : "call.hangup")}
              onClick={() => finish(phase.name === "outgoing" ? "cancel" : "hangup")}
            >
              <PhoneOff aria-hidden="true" className="size-7" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
