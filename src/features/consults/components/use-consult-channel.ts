"use client";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { supabaseBrowser } from "@/infrastructure/supabase/browser";

export interface MessageRow {
  id: string;
  consult_id: string;
  sender_id: string | null;
  body: string | null;
  image_path: string | null;
  read_at: string | null;
  created_at: string;
}

type Broadcast = Record<string, unknown>;

/**
 * The consult's private Realtime channel ("consult:<id>"): new messages
 * (postgres changes, table RLS), typing and call signals (broadcast) and who is
 * here (presence). Only the owner and the vet may join; see migration
 * 20261123120000_consult_channel_private.sql.
 */
export function useConsultChannel({
  consultId,
  viewerId,
  enabled,
  onMessage,
  onBroadcast,
}: {
  consultId: string;
  viewerId: string;
  /** false for the admin's read-only view: admins aren't on the channel. */
  enabled: boolean;
  onMessage: (row: MessageRow) => void;
  onBroadcast: (event: string, payload: Broadcast) => void;
}) {
  const channel = useRef<RealtimeChannel | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const [ready, setReady] = useState(false);

  const message = useEffectEvent(onMessage);
  const broadcast = useEffectEvent(onBroadcast);

  useEffect(() => {
    if (!enabled) return;
    const supabase = supabaseBrowser();
    let alive = true;
    let ch: RealtimeChannel | null = null;

    void (async () => {
      // Private channels authorise with the signed-in user's token.
      await supabase.realtime.setAuth();
      if (!alive) return;
      ch = supabase
        .channel(`consult:${consultId}`, {
          config: { private: true, broadcast: { self: false }, presence: { key: viewerId } },
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages", filter: `consult_id=eq.${consultId}` },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            const row = payload.new as unknown as MessageRow | undefined;
            if (row?.id) message(row);
          },
        )
        .on("broadcast", { event: "*" }, (msg: { event: string; payload?: Broadcast }) => {
          broadcast(msg.event, msg.payload ?? {});
        })
        .on("presence", { event: "sync" }, () => {
          if (!ch) return;
          setOtherOnline(Object.keys(ch.presenceState()).some((key) => key !== viewerId));
        })
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            setReady(true);
            void ch?.track({ at: Date.now() });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setReady(false);
          }
        });
      channel.current = ch;
    })();

    return () => {
      alive = false;
      channel.current = null;
      setReady(false);
      setOtherOnline(false);
      if (ch) void supabase.removeChannel(ch);
    };
  }, [consultId, viewerId, enabled]);

  function send(event: string, payload: Broadcast = {}) {
    return channel.current?.send({ type: "broadcast", event, payload });
  }

  return { send, otherOnline, ready };
}
