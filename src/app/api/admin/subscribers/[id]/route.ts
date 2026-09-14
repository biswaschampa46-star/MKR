import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    await db.delete(subscribers).where(eq(subscribers.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin subscriber delete failed", err);
    return NextResponse.json({ ok: false, message: "Could not remove the subscriber." }, { status: 500 });
  }
}
