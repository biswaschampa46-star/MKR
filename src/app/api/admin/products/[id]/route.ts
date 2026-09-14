import { NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";
import { validateProduct, type ProductPayload } from "@/lib/product-validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    const body = (await request.json()) as ProductPayload;
    const result = validateProduct(body, { requireImage: body.status !== "draft" });
    if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    await db.update(products).set(result.data).where(eq(products.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin product update failed", err);
    return NextResponse.json({ ok: false, message: "Could not update the product. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    await db.delete(products).where(eq(products.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin product delete failed", err);
    return NextResponse.json({ ok: false, message: "Could not delete the product." }, { status: 500 });
  }
}
