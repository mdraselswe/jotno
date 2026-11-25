"use client";

import { BellRing, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { chatPath, ROUTES } from "@/config/routes";
import { useAuthUser } from "@/features/auth/components/use-auth-user";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { isChatPage } from "../calls";
import { waitingChats, type WaitingChat } from "../server/waiting-actions";

const POLL_MS = 30_000;

/** A short two-note chime (no file to load), plus a buzz on phones. */
function chime() {
  try {
    const ctx = new AudioContext();
    const note = (freq: number, at: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + at);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + at + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + at + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.4);
    };
    note(988, 0);
    note(1319, 0.18);
    window.setTimeout(() => void ctx.close().catch(() => undefined), 1000);
  } catch {
    // No audio until the page has been touched once: the banner still shows.
  }
  if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
}

const subscribeMinute = (cb: () => void) => {
  const id = window.setInterval(cb, 15_000);
  return () => window.clearInterval(id);
};
const minuteNow = () => Math.floor(Date.now() / 15_000);

/**
 * For vets, on every page: paid chats still waiting for their first reply (a
 * text or a call), with the minutes left before the owner is refunded. New
 * ones chime. Hidden on that chat's own page. Pushes cover a closed app.
 */
export function VetWaitingAlert() {
  const user = useAuthUser();
  const isVet = user?.role === "vet";
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const pathname = usePathname();
  const [chats, setChats] = useState<WaitingChat[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const tick = useSyncExternalStore(subscribeMinute, minuteNow, () => 0);

  const load = useEffectEvent(async () => {
    if (document.visibilityState !== "visible") return;
    const next = await waitingChats().catch(() => null);
    if (!next) return;
    const known = seen.current;
    if (known && next.some((c) => !known.has(c.id))) chime();
    seen.current = new Set(next.map((c) => c.id));
    setChats(next);
  });

  useEffect(() => {
    if (!isVet) return;
    // First check right after mount (a timer, so no state is set inside the effect).
    const first = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(), POLL_MS);
    const onVisible = () => void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isVet]);

  // The tab title shows the count too (seen from another tab).
  useEffect(() => {
    if (!isVet || chats.length === 0) return;
    const base = document.title.replace(/^\(\d+\)\s/, "");
    document.title = `(${chats.length}) ${base}`;
    return () => {
      document.title = document.title.replace(/^\(\d+\)\s/, "");
    };
  }, [isVet, chats.length, pathname]);

  const shown = chats.filter((c) => !isChatPage(pathname, c.id));
  const first = shown[0];
  if (!isVet || !first || tick === 0) return null;

  // `tick` is the time in 15 s steps: re-renders the countdown without reading the clock here.
  const left = Math.ceil((new Date(first.deadline).getTime() - tick * 15_000) / 60_000);
  const many = shown.length > 1;
  const href = many ? localeHref(locale, ROUTES.vetConsults) : localeHref(locale, chatPath(first.id));
  const urgent = left <= 10;
  const onChat = /\/chat\//.test(pathname);

  return (
    <div
      role="status"
      className={cn(
        "fixed inset-x-3 z-[60] mx-auto max-w-md print:hidden",
        // In another chat the composer is at the bottom: sit under the header there.
        onChat
          ? "top-[4.75rem] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4"
          : "bottom-[calc(4.25rem+env(safe-area-inset-bottom))] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 md:inset-x-auto md:end-6 md:bottom-6",
      )}
    >
      <Link
        href={href as never}
        className={cn(
          "flex items-center gap-3 rounded-(--radius-xl) p-3 pe-2 shadow-(--shadow-card) ring-1 transition-transform duration-(--motion-fast) ease-(--ease-press) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.98]",
          urgent
            ? "bg-destructive text-white ring-destructive"
            : "bg-primary text-primary-foreground ring-primary",
        )}
      >
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-current/15">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-current/25 motion-safe:animate-ping"
          />
          <BellRing aria-hidden="true" className="relative size-5" />
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate text-sm font-semibold">
            {many
              ? t("consult.waitingMany", { n: fmt.number(shown.length) })
              : t("consult.waitingOne", { name: first.ownerName ?? t("consult.nudgeSomeone") })}
          </span>
          <span className="truncate text-xs opacity-90">
            {left > 0 ? t("consult.waitingLeft", { n: fmt.number(left) }) : t("consult.waitingLate")}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-current/15 py-1.5 ps-3 pe-2 text-sm font-semibold">
          {many ? t("consult.waitingSeeAll") : t("consult.waitingReplyNow")}
          <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </span>
      </Link>
    </div>
  );
}
