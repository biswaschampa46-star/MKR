import { NextResponse } from "next/server";
import { db } from "@/db";
import { aboutMedia } from "@/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { unlink } from "fs/promises";
import path from "path";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getRow(id: string) {
  const rows = await db.select().from(aboutMedia).where(eq(aboutMedia.id, id)).limit(1);
  return rows[0] ?? null;
}

/** PUT /api/admin/about-media/[id] — activate, edit alt text, or swap the file. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await params;
  try {
    const existing = await getRow(id);
    if (!existing) return NextResponse.json({ ok: false, message: "Media not found." }, { status: 404 });

    const body = (await request.json()) as { url?: string; kind?: string; alt?: string; isActive?: boolean };
    const url = (body.url ?? existing.url).trim();
    const kind = body.kind === "video" ? "video" : body.kind === "image" ? "image" : existing.kind;
    const alt = body.alt !== undefined ? body.alt.trim().slice(0, 200) : existing.alt;
    const isActive = body.isActive ?? existing.isActive;

    /* single slot: activating this row demotes every other row */
    if (isActive && !existing.isActive) {
      await db.update(aboutMedia).set({ isActive: false, updatedAt: new Date() }).where(ne(aboutMedia.id, id));
    }

    const [updated] = await db
      .update(aboutMedia)
      .set({ url, kind, alt, isActive, updatedAt: new Date() })
      .where(eq(aboutMedia.id, id))
      .returning();

    /* safe-replace: remove the old upload only after the DB update succeeded */
    if (existing.url !== updated.url) {
      const stillUsed = await db
        .select({ id: aboutMedia.id })
        .from(aboutMedia)
        .where(and(ne(aboutMedia.id, id), eq(aboutMedia.url, existing.url)));
      if (stillUsed.length === 0 && existing.url.startsWith("/uploads/")) {
        try {
          await unlink(path.join(process.cwd(), "public", existing.url.replace(/^\//, "")));
        } catch {
          /* already gone — fine */
        }
      }
    }

    return NextResponse.json({ ok: true, media: updated });
  } catch (err) {
    console.error("about media update failed", err);
    return NextResponse.json({ ok: false, message: "Could not update the media." }, { status: 500 });
  }
}

/** DELETE /api/admin/about-media/[id] — remove the row, then clean storage. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await params;
  try {
    const existing = await getRow(id);
    if (!existing) return NextResponse.json({ ok: false, message: "Media not found." }, { status: 404 });

    await db.delete(aboutMedia).where(eq(aboutMedia.id, id));
    if (existing.url.startsWith("/uploads/")) {
      const stillUsed = await db.select({ id: aboutMedia.id }).from(aboutMedia).where(eq(aboutMedia.url, existing.url));
      if (stillUsed.length === 0) {
        try {
          await unlink(path.join(process.cwd(), "public", existing.url.replace(/^\//, "")));
        } catch {
          /* already gone — fine */
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("about media delete failed", err);
    return NextResponse.json({ ok: false, message: "Could not delete the media." }, { status: 500 });
  }
}
