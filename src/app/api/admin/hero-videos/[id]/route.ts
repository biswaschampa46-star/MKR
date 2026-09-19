import { NextResponse } from "next/server";
import { db } from "@/db";
import { heroVideos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";
import { validateHeroVideo } from "@/lib/hero-video-validation";

export const dynamic = "force-dynamic";

async function getRow(id: string) {
  const rows = await db.select().from(heroVideos).where(eq(heroVideos.id, id)).limit(1);
  return rows[0] ?? null;
}

/** PUT /api/admin/hero-videos/[id] — edit an existing hero video card. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await params;
  try {
    const existing = await getRow(id);
    if (!existing) return NextResponse.json({ ok: false, message: "Video not found." }, { status: 404 });

    const body = await request.json();
    const result = validateHeroVideo(body);
    if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 400 });

    const [updated] = await db
      .update(heroVideos)
      .set(result.data)
      .where(eq(heroVideos.id, id))
      .returning();

    return NextResponse.json({ ok: true, video: updated });
  } catch (err) {
    console.error("hero video update failed", err);
    return NextResponse.json({ ok: false, message: "Could not update the video." }, { status: 500 });
  }
}

/** DELETE /api/admin/hero-videos/[id] — remove the row, then clean storage. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await params;
  try {
    const existing = await getRow(id);
    if (!existing) return NextResponse.json({ ok: false, message: "Video not found." }, { status: 404 });

    await db.delete(heroVideos).where(eq(heroVideos.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("hero video delete failed", err);
    return NextResponse.json({ ok: false, message: "Could not delete the video." }, { status: 500 });
  }
}
