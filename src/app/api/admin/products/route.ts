import { NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";
import { randomInt } from "crypto";
import { validateProduct, type ProductPayload } from "@/lib/product-validation";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 150);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = (await request.json()) as ProductPayload;
    const result = validateProduct(body, { requireImage: body.status !== "draft" });
    if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    const values = result.data;

    let slug = values.slug;
    const exists = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (exists.length > 0) slug = `${slug}-${randomInt(100, 999)}`;

    const [created] = await db
      .insert(products)
      .values({ ...values, slug })
      .returning({ id: products.id, slug: products.slug, status: products.status });

    return NextResponse.json({ ok: true, id: created.id, slug: created.slug, status: created.status });
  } catch (err) {
    console.error("admin product create failed", err);
    const raw = err instanceof Error ? err.message : "";
    /* Safe, non-technical hints for the two environmental failures that
       produce this 500 on hosting (never echo raw DB errors to the browser). */
    const message = raw.includes("DATABASE_URL is required")
      ? "Database is not configured on the server. Set DATABASE_URL in Vercel → Settings → Environment Variables."
      : /undefined (column|table)|does not exist/i.test(raw)
        ? "Database schema is out of date. Run the SQL files in supabase/migrations/ on your Supabase project, then try again."
        : raw.includes("duplicate key")
          ? "A product with that URL slug or SKU already exists — pick a different one."
          : "Could not save the product. Please try again.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}


