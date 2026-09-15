import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, type VariantGroup } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";
import { randomInt } from "crypto";

export type ProductInput = {
  name?: string;
  slug?: string;
  description?: string;
  material?: string;
  price?: number;
  compareAtPrice?: number | null;
  image?: string;
  stock?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  variants?: { name?: string; options?: string[] }[];
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents after NFKD
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

export function normalizeVariants(input: ProductInput["variants"]): VariantGroup[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((g) => g && typeof g.name === "string" && g.name.trim())
    .map((g) => ({
      name: g.name!.trim().slice(0, 60),
      options: (Array.isArray(g.options) ? g.options : [])
        .map((o) => String(o).trim().slice(0, 60))
        .filter(Boolean),
    }))
    .slice(0, 6);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = (await request.json()) as ProductInput;
    const name = (body.name ?? "").trim();
    const price = Math.floor(Number(body.price));
    const image = (body.image ?? "").trim();
    if (name.length < 2) return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });
    if (!Number.isFinite(price) || price < 0) return NextResponse.json({ ok: false, message: "Valid price is required." }, { status: 400 });
    if (!image) return NextResponse.json({ ok: false, message: "An image URL or upload is required." }, { status: 400 });

    let slug = (body.slug ?? "").trim().slice(0, 160) || slugify(name);
    if (!slug) slug = `product-${randomInt(1000, 9999)}`;
    const exists = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (exists.length > 0) slug = `${slug}-${randomInt(100, 999)}`;

    const compare = body.compareAtPrice == null ? null : Math.floor(Number(body.compareAtPrice));

    const [created] = await db
      .insert(products)
      .values({
        name: name.slice(0, 160),
        slug,
        description: (body.description ?? "").trim(),
        material: (body.material ?? "").trim(),
        price,
        compareAtPrice: Number.isFinite(compare) && compare! > 0 ? compare : null,
        image: image.slice(0, 300),
        stock: Number.isFinite(Number(body.stock)) ? Math.max(0, Math.floor(Number(body.stock))) : 25,
        isNew: Boolean(body.isNew),
        isFeatured: Boolean(body.isFeatured),
        variants: normalizeVariants(body.variants),
      })
      .returning({ id: products.id });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error("admin product create failed", err);
    return NextResponse.json({ ok: false, message: "Could not save the product." }, { status: 500 });
  }
}
