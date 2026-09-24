import { sql } from "drizzle-orm";
import { db, rawQuery } from "@/db/client";
import { storageMode } from "@/lib/storage";
import { supabasePublicConfigured, supabaseAdminConfigured } from "@/lib/env";

export async function dashboardDiagnostics() {
  let database: "connected" | "unavailable" = "connected";
  let counts: { label: string; value: number }[] = [];
  const notes: string[] = [];

  try {
    const rows = await rawQuery<{
      products: string;
      active_products: string;
      orders: string;
      customers: string;
      media: string;
      coupons: string;
      reviews: string;
    }>(sql`select
      (select count(*)::text from products) as products,
      (select count(*)::text from products where status = 'active') as active_products,
      (select count(*)::text from orders) as orders,
      (select count(*)::text from customers) as customers,
      (select count(*)::text from media_assets) as media,
      (select count(*)::text from coupons) as coupons,
      (select count(*)::text from reviews) as reviews`);
    const row = rows[0];
    counts = [
      { label: "Products", value: Number(row?.products ?? 0) },
      { label: "Published products", value: Number(row?.active_products ?? 0) },
      { label: "Orders", value: Number(row?.orders ?? 0) },
      { label: "Customers", value: Number(row?.customers ?? 0) },
      { label: "Media assets", value: Number(row?.media ?? 0) },
      { label: "Coupons", value: Number(row?.coupons ?? 0) },
      { label: "Reviews", value: Number(row?.reviews ?? 0) },
    ];
    await db.execute(sql`select 1`);
  } catch (error) {
    database = "unavailable";
    notes.push(`Database error: ${error instanceof Error ? error.message : "unknown"}.`);
  }

  if (storageMode() === "database") {
    notes.push(
      "Supabase Storage credentials are absent, so uploads are persisted in the media_assets table and served via /api/media. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to switch to bucket storage (existing paths keep working).",
    );
  }
  if (!supabasePublicConfigured() || !supabaseAdminConfigured()) {
    notes.push(
      "Without Supabase Auth/Realtime keys the app uses signed httpOnly cookie sessions and a durable SSE feed over the realtime_events table — both are drop-in compatible once the keys are present.",
    );
  }

  return { database, counts, notes };
}
