import { NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";
import { slugifyName } from "@/lib/clothing";
import type { ProductPayload } from "@/lib/product-validation";

type BulkBody = {
  ids?: unknown;
  action?: unknown;
  data?: { category?: unknown; stock?: unknown };
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  let body: BulkBody;
  try {
    body = (await request.json()) as BulkBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((i): i is string => typeof i === "string" && UUID_RE.test(i)) : [];
  if (ids.length === 0) return NextResponse.json({ ok: false, message: "No products selected." }, { status: 400 });

  const action = String(body.action ?? "");
  try {
    switch (action) {
      case "publish":
        await db.update(products).set({ status: "active", updatedAt: new Date() }).where(inArray(products.id, ids));
        break;
      case "draft":
        await db.update(products).set({ status: "draft", updatedAt: new Date() }).where(inArray(products.id, ids));
        break;
      case "archive":
        await db.update(products).set({ status: "archived", updatedAt: new Date() }).where(inArray(products.id, ids));
        break;
      case "delete":
        await db.delete(products).where(inArray(products.id, ids));
        break;
      case "update-category": {
        const category = String(body.data?.category ?? "").trim().slice(0, 60);
        if (!category) return NextResponse.json({ ok: false, message: "Choose a category first." }, { status: 400 });
        await db.update(products).set({ category, updatedAt: new Date() }).where(inArray(products.id, ids));
        break;
      }
      case "update-stock": {
        const stock = Math.max(0, Math.floor(Number(body.data?.stock)));
        if (!Number.isFinite(stock)) return NextResponse.json({ ok: false, message: "Enter a valid stock number." }, { status: 400 });
        await db.update(products).set({ stock, updatedAt: new Date() }).where(inArray(products.id, ids));
        break;
      }
      case "duplicate": {
        const rows = await db.select().from(products).where(inArray(products.id, ids));
        for (const p of rows) {
          const { id: _id, createdAt: _c, ...rest } = p;
          let slug = `${slugifyName(`${p.name}-copy`) || "product-copy"}`;
          const exists = await db.select({ id: products.id }).from(products).where(inArray(products.slug, [slug])).limit(1);
          if (exists.length > 0) slug = `${slug}-${Date.now() % 100000}`;
          await db.insert(products).values({
            ...rest,
            name: `${p.name} (Copy)`.slice(0, 160),
            slug,
            sku: p.sku ? `${p.sku}-C${Date.now() % 1000}` : "",
            status: "draft",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        break;
      }
      default:
        return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin product bulk action failed", err);
    return NextResponse.json({ ok: false, message: "Bulk action failed. Please try again." }, { status: 500 });
  }
}
