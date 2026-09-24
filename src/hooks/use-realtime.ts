"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export type RealtimePayload = { id: number; channel: string; event: string; payload: Record<string, unknown> };

type Handler = (event: RealtimePayload) => void;
type Subscription = { handlers: Set<Handler>; cleanup: () => void };

const channels = new Map<string, Subscription>();

function ensureChannel(channel: string): Subscription {
  const existing = channels.get(channel);
  if (existing) return existing;

  const subscription: Subscription = { handlers: new Set(), cleanup: () => {} };
  channels.set(channel, subscription);

  const deliver = (data: RealtimePayload) => {
    for (const handler of subscription.handlers) handler(data);
  };

  const supabase = getBrowserSupabase();
  if (supabase) {
    const realtimeChannel = supabase
      .channel(`mkr:${channel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "realtime_events",
          filter: `channel=eq.${channel}`,
        },
        (message: { new?: unknown }) => {
          const row = (message.new ?? {}) as { id?: number; channel?: string; event?: string; payload?: Record<string, unknown> };
          if (typeof row.id !== "number") return;
          deliver({ id: row.id, channel: row.channel ?? channel, event: row.event ?? "change", payload: row.payload ?? {} });
        },
      )
      .subscribe();
    subscription.cleanup = () => {
      void supabase.removeChannel(realtimeChannel);
    };
    return subscription;
  }

  const source = new EventSource(`/api/realtime?channel=${encodeURIComponent(channel)}`);
  source.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as RealtimePayload;
      if (typeof parsed?.id === "number") deliver(parsed);
    } catch {
      /* ignore malformed frames */
    }
  };
  subscription.cleanup = () => source.close();
  return subscription;
}

/**
 * One shared subscription per channel (module-level, ref-counted). Mounting the
 * same component repeatedly reuses the channel and never duplicates it, and the
 * subscription is always released on unmount.
 */
export function useRealtime(channel: string | null, handler: Handler, enabled = true) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!channel || !enabled) return;
    const subscription = ensureChannel(channel);
    const wrapped: Handler = (event) => handlerRef.current(event);
    subscription.handlers.add(wrapped);

    return () => {
      subscription.handlers.delete(wrapped);
      if (subscription.handlers.size === 0) {
        subscription.cleanup();
        channels.delete(channel);
      }
    };
  }, [channel, enabled]);
}
