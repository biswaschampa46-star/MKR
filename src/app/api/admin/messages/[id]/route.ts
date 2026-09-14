import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    await db.delete(messages).where(eq(messages.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin message delete failed", err);
    return NextResponse.json({ ok: false, message: "Could not delete the message." }, { status: 500 });
  }
}
