import { db } from "@/db";
import { heroVideos, type HeroVideo } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

/**
 * The active hero video card (lowest display_order wins), or null when none
 * is configured — the homepage hero then falls back to its built-in default.
 */
export async function getActiveHeroVideos(): Promise<HeroVideo | null> {
  try {
    const rows = await db
      .select()
      .from(heroVideos)
      .where(eq(heroVideos.isActive, true))
      .orderBy(asc(heroVideos.displayOrder), asc(heroVideos.createdAt))
      .limit(1);
    return rows[0] ?? null;
  } catch (err) {
    console.error("getActiveHeroVideos failed", err);
    return null;
  }
}
