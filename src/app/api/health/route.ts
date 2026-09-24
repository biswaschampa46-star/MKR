import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { storageMode } from "@/lib/storage";
import { supabaseAdminConfigured, supabasePublicConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      database: "connected",
      supabaseAuth: supabasePublicConfigured() ? "configured" : "not-configured",
      supabaseStorage: supabaseAdminConfigured() ? "configured" : "not-configured",
      mediaDriver: storageMode(),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: "unavailable",
        error: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 },
    );
  }
}
