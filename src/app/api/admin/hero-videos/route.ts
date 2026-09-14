import { NextResponse } from "next/server";
import { db } from "@/db";
import { heroVideos } from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";
import { validateHeroVideo } from "@/lib/hero-video-validation";

export const dynamic = "force-dynamic";

/** GET /api/admin/hero-videos — full list (including inactive) for the manager. */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const rows = await db.select().from(heroVideos).orderBy(asc(heroVideos.displayOrder), asc(heroVideos.createdAt));
  return NextResponse.json({ ok: true, videos: rows });
}

/** POST /api/admin/hero-videos — create a new hero video card. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = await request.json();
    const result = validateHeroVideo(body);
    if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 400 });

    const [created] = await db.insert(heroVideos).values(result.data).returning();
    return NextResponse.json({ ok: true, video: created });
  } catch (err) {
    console.error("hero video create failed", err);
    return NextResponse.json({ ok: false, message: "Could not save the video." }, { status: 500 });
  }
}
