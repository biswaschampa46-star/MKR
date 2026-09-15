import { NextResponse } from "next/server";
import { db } from "@/db";
import { promoCampaigns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";
import { normalize, type CampaignInput } from "../route";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    const body = (await request.json()) as CampaignInput;
    const { errors, values } = normalize(body);
    if (errors.length > 0)
      return NextResponse.json({ ok: false, message: errors.join(" ") }, { status: 400 });
    if (values.startAt && values.endAt && values.endAt <= values.startAt)
      return NextResponse.json(
        { ok: false, message: "End time must be after the start time." },
        { status: 400 },
      );

    await db
      .update(promoCampaigns)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(promoCampaigns.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin campaign update failed", err);
    return NextResponse.json({ ok: false, message: "Could not update the campaign." }, { status: 500 });
  }
}

/** Toggle enable/disable without resending the whole form. */
export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    const body = (await request.json()) as { isEnabled?: boolean };
    if (typeof body.isEnabled !== "boolean")
      return NextResponse.json({ ok: false, message: "isEnabled must be a boolean." }, { status: 400 });

    await db
      .update(promoCampaigns)
      .set({ isEnabled: body.isEnabled, updatedAt: new Date() })
      .where(eq(promoCampaigns.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin campaign toggle failed", err);
    return NextResponse.json({ ok: false, message: "Could not update the campaign." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    await db.delete(promoCampaigns).where(eq(promoCampaigns.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin campaign delete failed", err);
    return NextResponse.json({ ok: false, message: "Could not delete the campaign." }, { status: 500 });
  }
}
