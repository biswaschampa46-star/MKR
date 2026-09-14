import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { heroVideos, type HeroVideo } from "@/db/schema";
import AdminShell from "@/components/admin/AdminShell";
import HeroVideosManager from "@/components/admin/HeroVideosManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Hero Videos", robots: { index: false } };

export default async function HeroVideosPage() {
  let videos: HeroVideo[] = [];
  try {
    videos = await db
      .select()
      .from(heroVideos)
      .orderBy(asc(heroVideos.displayOrder), asc(heroVideos.createdAt));
  } catch (err) {
    console.error("hero videos load failed", err);
  }

  return (
    <AdminShell active="Hero Videos">
      <h1 className="font-display mb-2 text-2xl font-bold text-foam">Hero Videos</h1>
      <p className="mb-8 text-sm text-mist">
        Manage the “NEW ARRIVALS” video card shown on the homepage hero.
      </p>
      <HeroVideosManager initialVideos={videos} />
    </AdminShell>
  );
}
