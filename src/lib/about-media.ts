import { db } from "@/db";
import { aboutMedia, type AboutMedia } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

/** The media shown in the /about story grid (newest active row wins), or null
 *  when none is configured — the page then falls back to its built-in image. */
export async function getActiveAboutMedia(): Promise<AboutMedia | null> {
  try {
    const rows = await db
      .select()
      .from(aboutMedia)
      .where(eq(aboutMedia.isActive, true))
      .orderBy(desc(aboutMedia.createdAt))
      .limit(1);
    return rows[0] ?? null;
  } catch (err) {
    console.error("getActiveAboutMedia failed", err);
    return null;
  }
}
