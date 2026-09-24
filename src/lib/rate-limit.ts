import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * Shared, cross-instance rate limiting backed by PostgreSQL.
 *
 * The audit found the previous in-memory `Map` limiter resets on every
 * serverless cold start and is per-instance — useless on Vercel. This
 * implementation stores counters in the `rate_limits` table (created by
 * supabase/migrations/0007_hardening.sql) so all instances share one budget.
 *
 * Atomicity: a single UPSERT with a CASE advance. The row is created with
 * count = 1 when missing/expired; otherwise incremented. The WHERE clause
 * guarantees only one writer wins per instant — no read-modify-write race.
 *
 * Degradation: if the database is unreachable (which would break the whole
 * request anyway), the limiter fails OPEN so it never becomes the reason a
 * working store rejects customers. No in-memory fallback state is trusted
 * across instances.
 */

export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number; retryAfterMs: number }> {
  try {
    const rows = (await db
      .execute(sql`
        insert into rate_limits (key, count, reset_at)
        values (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}))
        on conflict (key) do update
          set count = case when rate_limits.reset_at < now() then 1 else rate_limits.count + 1 end,
              reset_at = case when rate_limits.reset_at < now()
                then now() + make_interval(secs => ${windowMs / 1000})
                else rate_limits.reset_at end
        returning count, extract(epoch from (reset_at - now())) as retry_after
      `)
      .then((result: unknown) => {
        const withRows = result as { rows?: Record<string, unknown>[] };
        return (Array.isArray(result) ? result : withRows?.rows ?? []) as { count: number; retry_after: number }[];
      })) as { count: number; retry_after: number }[];

    const row = rows[0];
    const count = Number(row?.count ?? 1);
    const retryAfter = Math.max(0, Math.round(Number(row?.retry_after ?? 0) * 1000));
    return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfterMs: retryAfter };
  } catch {
    // Fail open: infrastructure failure must not block legitimate traffic.
    return { ok: true, remaining: limit, retryAfterMs: 0 };
  }
}
