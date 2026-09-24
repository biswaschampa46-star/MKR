import { db } from "@/db/client";
import { sql } from "drizzle-orm";

/**
 * Phase 27 — admin audit trail.
 *
 * Writes to the `admin_audit_log` table (migration 0007): actor, action,
 * optional target, optional non-sensitive metadata. Logging failures must
 * never break the admin operation itself, so every write is fire-safe.
 */
export async function recordAdminAction(input: {
  actor: string;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.execute(sql`
      insert into admin_audit_log (actor, action, target, metadata)
      values (${input.actor}, ${input.action}, ${input.target ?? null},
              ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb)
    `);
  } catch {
    // The audit trail is best-effort; the business action has already succeeded.
  }
}
