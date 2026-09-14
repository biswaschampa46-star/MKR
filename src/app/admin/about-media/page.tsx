import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { aboutMedia, type AboutMedia } from "@/db/schema";
import AdminShell from "@/components/admin/AdminShell";
import AboutMediaManager from "@/components/admin/AboutMediaManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — About Media", robots: { index: false } };

export default async function AboutMediaPage() {
  let media: AboutMedia[] = [];
  try {
    media = await db.select().from(aboutMedia).orderBy(desc(aboutMedia.createdAt));
  } catch (err) {
    console.error("about media load failed", err);
  }

  return (
    <AdminShell active="About Media">
      <h1 className="font-display mb-2 text-2xl font-bold text-foam">About Media</h1>
      <p className="mb-8 text-sm text-mist">
        Upgrade the picture or video shown in the story section of the About page.
      </p>
      <AboutMediaManager initialMedia={media} />
    </AdminShell>
  );
}
