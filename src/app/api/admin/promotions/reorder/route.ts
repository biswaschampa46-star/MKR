import { NextResponse } from "next/server";
import { db } from "@/db";
import { promoCampaigns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";

/**
 * Persist a drag-and-drop order. Sort values are written per id so the
 * public carousel order matches the admin's arrangement (priority is
 * respected first; sort_order breaks ties within the same priority).
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = (await request.json()) as { order?: string[] };
    const ids = Array.isArray(body.order) ? body.order.slice(0, 200) : [];
    if (ids.length === 0)
      return NextResponse.json({ ok: false, message: "No order provided." }, { status: 400 });

    for (let i = 0; i < ids.length; i++) {
      await db
        .update(promoCampaigns)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(promoCampaigns.id, ids[i]));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin campaign reorder failed", err);
    return NextResponse.json({ ok: false, message: "Could not save the new order." }, { status: 500 });
  }
}
