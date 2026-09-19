import { NextResponse } from "next/server";
import { db } from "@/db";
import { aboutMedia } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KINDS = new Set(["image", "video"]);

/** GET /api/admin/about-media — full list for the manager. */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const rows = await db.select().from(aboutMedia).orderBy(desc(aboutMedia.createdAt));
  return NextResponse.json({ ok: true, media: rows });
}

/** POST /api/admin/about-media — add a new picture/video for the About page. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = (await request.json()) as { url?: string; kind?: string; alt?: string; isActive?: boolean };
    const url = (body.url ?? "").trim();
    const kind = body.kind === "video" ? "video" : "image";
    const alt = (body.alt ?? "").trim().slice(0, 200);
    /* Storage is Supabase-only: accept hosted https URLs (what /api/admin/upload
       returns) plus legacy local paths and built-in /images assets. */
    if (!url || !/^(https?:\/\/|\/uploads\/|\/images\/)/.test(url)) {
      return NextResponse.json({ ok: false, message: "Upload a file first." }, { status: 400 });
    }
    if (!KINDS.has(kind)) {
      return NextResponse.json({ ok: false, message: "Invalid media kind." }, { status: 400 });
    }

    const isActive = body.isActive !== false;
    /* single slot: activating a new row demotes the previous one */
    if (isActive) {
      await db.update(aboutMedia).set({ isActive: false, updatedAt: new Date() }).where(eq(aboutMedia.isActive, true));
    }
    const [created] = await db.insert(aboutMedia).values({ url, kind, alt, isActive }).returning();
    return NextResponse.json({ ok: true, media: created });
  } catch (err) {
    console.error("about media create failed", err);
    return NextResponse.json({ ok: false, message: "Could not save the media." }, { status: 500 });
  }
}
