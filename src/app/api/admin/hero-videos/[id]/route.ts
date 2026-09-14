import { NextResponse } from "next/server";
import { db } from "@/db";
import { heroVideos } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { unlink } from "fs/promises";
import path from "path";
import { isAdmin, unauthorized } from "@/lib/auth";
import { validateHeroVideo, localUploadPath } from "@/lib/hero-video-validation";

export const dynamic = "force-dynamic";

/** Only unlink files under /uploads/ that no other hero-video row still uses. */
async function cleanupFile(url: string, keepExceptId?: string) {
  const local = localUploadPath(url);
  if (!local) return;
  const stillUsed =
    keepExceptId !== undefined
      ? await db
          .select({ id: heroVideos.id })
          .from(heroVideos)
          .where(and(ne(heroVideos.id, keepExceptId), eq(heroVideos.videoUrl, url)))
      : await db.select({ id: heroVideos.id }).from(heroVideos).where(eq(heroVideos.videoUrl, url));
  const thumbUsed =
    keepExceptId !== undefined
      ? await db
          .select({ id: heroVideos.id })
          .from(heroVideos)
          .where(and(ne(heroVideos.id, keepExceptId), eq(heroVideos.thumbnailUrl, url)))
      : await db.select({ id: heroVideos.id }).from(heroVideos).where(eq(heroVideos.thumbnailUrl, url));
  if (stillUsed.length > 0 || thumbUsed.length > 0) return;
  try {
    await unlink(path.join(process.cwd(), "public", local));
  } catch {
    /* file already gone — fine */
  }
}

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

    /* Safe-replace: only remove old storage files after the DB update succeeded
       and the files are no longer referenced. */
    if (existing.videoUrl !== updated.videoUrl) await cleanupFile(existing.videoUrl, id);
    if (existing.thumbnailUrl && existing.thumbnailUrl !== updated.thumbnailUrl) {
      await cleanupFile(existing.thumbnailUrl, id);
    }

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
    await cleanupFile(existing.videoUrl);
    if (existing.thumbnailUrl) await cleanupFile(existing.thumbnailUrl);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("hero video delete failed", err);
    return NextResponse.json({ ok: false, message: "Could not delete the video." }, { status: 500 });
  }
}
