import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { marketingVideos } from "@/db/schema";
import { deleteObject, type BucketName } from "@/lib/storage";

export type MarketingVideo = {
  id: string;
  title: string;
  description: string | null;
  videoBucket: string;
  videoPath: string;
  videoUrl: string;
  videoMime: string;
  videoSizeBytes: number;
  posterBucket: string | null;
  posterPath: string | null;
  posterUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  overlayPosition: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  showControls: boolean;
  isActive: boolean;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

type Row = typeof marketingVideos.$inferSelect;

function mapRow(row: Row): MarketingVideo {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Admin list — every video regardless of publish state. */
export async function listMarketingVideos(): Promise<MarketingVideo[]> {
  const rows = await db
    .select()
    .from(marketingVideos)
    .orderBy(asc(marketingVideos.displayOrder), desc(marketingVideos.createdAt));
  return rows.map(mapRow);
}

/** Homepage list — published + active only, in admin priority order. */
export async function listPublicMarketingVideos(): Promise<MarketingVideo[]> {
  const rows = await db
    .select()
    .from(marketingVideos)
    .where(and(eq(marketingVideos.isPublished, true), eq(marketingVideos.isActive, true)))
    .orderBy(asc(marketingVideos.displayOrder), desc(marketingVideos.createdAt));
  return rows.map(mapRow);
}

export async function getMarketingVideo(id: string): Promise<MarketingVideo | null> {
  const rows = await db.select().from(marketingVideos).where(eq(marketingVideos.id, id)).limit(1);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createMarketingVideo(values: typeof marketingVideos.$inferInsert): Promise<string> {
  const inserted = await db.insert(marketingVideos).values(values).returning({ id: marketingVideos.id });
  return inserted[0].id;
}

export async function updateMarketingVideo(id: string, values: Partial<typeof marketingVideos.$inferInsert>): Promise<void> {
  await db
    .update(marketingVideos)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(marketingVideos.id, id));
}

/** Removes the DB row and its Supabase Storage objects (video + poster). */
export async function deleteMarketingVideo(id: string): Promise<void> {
  const rows = await db.select().from(marketingVideos).where(eq(marketingVideos.id, id)).limit(1);
  await db.delete(marketingVideos).where(eq(marketingVideos.id, id));
  const video = rows[0];
  if (!video) return;
  if (video.videoBucket && video.videoPath) {
    await deleteObject(video.videoBucket as BucketName, video.videoPath);
  }
  if (video.posterBucket && video.posterPath) {
    await deleteObject(video.posterBucket as BucketName, video.posterPath);
  }
}