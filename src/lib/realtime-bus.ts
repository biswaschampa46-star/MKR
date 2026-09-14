"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Process-wide (per-tab) Supabase Realtime bus for `orders` table changes.
 *
 * The database trigger (supabase/migrations/…_orders_realtime_broadcast.sql)
 * broadcasts { op, id } on the public channel "admin:orders". Every admin
 * component that needs live orders subscribes through here, so exactly ONE
 * WebSocket channel exists per tab no matter how many components listen.
 *
 * - No customer PII travels through the channel — listeners fetch actual
 *   data via admin-session-guarded API routes (RLS untouched).
 * - Refcounted: subscription is removed only when the last listener leaves.
 * - Reconnects with backoff on CHANNEL_ERROR / TIMED_OUT, never stacking
 *   duplicate subscriptions.
 */

export type OrderRealtimeEvent = {
  op: "INSERT" | "UPDATE" | "DELETE";
  id: string;
};

type Listener = (event: OrderRealtimeEvent) => void;

const CHANNEL_NAME = "admin:orders";
const EVENT_NAME = "orders_changed";
const RECONNECT_DELAY_MS = 3000;
const RECONNECT_DELAY_MAX_MS = 30000;

let reconnectDelayMs = RECONNECT_DELAY_MS;

let channel: RealtimeChannel | null = null;
let refCount = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<Listener>();

function notify(event: OrderRealtimeEvent): void {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch (err) {
      console.error("order realtime: listener failed", err);
    }
  }
}

function isRealEvent(payload: unknown): payload is OrderRealtimeEvent {
  const p = payload as Partial<OrderRealtimeEvent> | null;
  return (
    !!p &&
    (p.op === "INSERT" || p.op === "UPDATE" || p.op === "DELETE") &&
    typeof p.id === "string" &&
    p.id.length > 0
  );
}

function scheduleReconnect(): void {
  if (reconnectTimer || refCount === 0) return;
  const delay = reconnectDelayMs;
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_DELAY_MAX_MS);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (refCount === 0) return; // everyone left while we were waiting
    detachChannel();
    attachChannel();
  }, delay);
}

function detachChannel(): void {
  if (channel && supabase) {
    void supabase.removeChannel(channel);
  }
  channel = null;
}

function attachChannel(): void {
  if (!supabase || channel) return;

  const ch = supabase.channel(CHANNEL_NAME);
  ch.on("broadcast", { event: EVENT_NAME }, ({ payload }) => {
    if (isRealEvent(payload)) notify(payload);
  });

  channel = ch;
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      reconnectDelayMs = RECONNECT_DELAY_MS; // healthy again — reset backoff
      return;
    }
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      // warn (not error): Next dev renders console.error as a blocking overlay,
      // and a flaky realtime socket should degrade quietly while we retry.
      console.warn(`order realtime: channel ${status} — retrying in a few seconds`);
      scheduleReconnect();
    }
    /* "CLOSED" fires on our own teardown too; refCount guards against
       reconnecting after the last listener unsubscribed. */
    if (status === "CLOSED" && refCount > 0) scheduleReconnect();
  });
}

/**
 * Register a listener for order change events. Returns an unsubscribe
 * function — call it on component unmount. Safe to call multiple times
 * from different components: they share one underlying channel.
 */
export function subscribeOrderEvents(listener: Listener): () => void {
  listeners.add(listener);
  refCount += 1;

  if (supabase) {
    attachChannel();
  } else {
    console.warn(
      "order realtime: NEXT_PUBLIC_SUPABASE_* not configured — live order updates disabled",
    );
  }

  return () => {
    listeners.delete(listener);
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0) {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      detachChannel();
    }
  };
}
