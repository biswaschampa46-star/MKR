import { db, rawQuery } from "@/db/client";
import { realtimeEvents } from "@/db/schema";
import { sql } from "drizzle-orm";

export type RealtimeChannelName = "orders" | "products" | "inventory" | "messages" | "notifications";

export type RealtimeEvent = {
  id: number;
  channel: string;
  event: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

/** Writes to the durable event log. Supabase Realtime mirrors this table. */
export async function publishRealtimeEvent(
  channel: RealtimeChannelName | string,
  event: string,
  payload: Record<string, unknown> = {},
) {
  await db.insert(realtimeEvents).values({ channel, event, payload });
}

export async function fetchRealtimeEvents(channel: string, afterId: number, limit = 50): Promise<RealtimeEvent[]> {
  return rawQuery<RealtimeEvent>(
    sql`select id, channel, event, payload, created_at as "createdAt"
          from realtime_events
         where channel = ${channel} and id > ${afterId}
         order by id asc
         limit ${limit}`,
  );
}

export async function latestRealtimeEventId(channel: string): Promise<number> {
  const rows = await rawQuery<{ id: string | null }>(
    sql`select max(id)::text as id from realtime_events where channel = ${channel}`,
  );
  return Number(rows[0]?.id ?? 0);
}
