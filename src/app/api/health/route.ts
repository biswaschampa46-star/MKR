import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostic: GET /api/health
 * Reports which integrations are configured on the running host.
 * Only booleans are returned — never secret values.
 */
export async function GET() {
  let dbOk = false;
  let dbError: string | null = null;
  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "unknown database error";
  }

  return Response.json(
    {
      ok: dbOk,
      database: {
        connected: dbOk,
        configured: Boolean(process.env.DATABASE_URL?.trim()),
        error: dbError,
      },
      /* NOTE: computed inline — @/lib/supabase is a "use client" module and
         must not be imported into a server route (its exports evaluate to
         undefined here, which silently serialized as {}). */
      supabaseAuth: {
        configured: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
        ),
      },
      supabaseStorage: {
        // Service-role key (production) OR admin credentials (local dev,
        // uploads go through the uploads_admin_insert RLS policy).
        configured: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
            (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
              (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
                process.env.ADMIN_EMAIL?.trim() &&
                process.env.ADMIN_PASSWORD)),
        ),
      },
      aiAssistant: {
        configured: Boolean(
          process.env.OPENROUTER_API_KEY?.trim() ||
            process.env.OPENROUTER_API_KEY_FOR_ADMINPANEL_PRODUCT?.trim(),
        ),
      },
      admin: {
        configured: Boolean(
          process.env.ADMIN_EMAIL?.trim() && process.env.ADMIN_PASSWORD,
        ),
      },
      siteUrl: getSiteUrl(),
    },
    { status: dbOk ? 200 : 500 },
  );
}

