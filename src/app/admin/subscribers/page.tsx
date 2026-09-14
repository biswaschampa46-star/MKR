import type { Metadata } from "next";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { desc } from "drizzle-orm";
import AdminShell from "@/components/admin/AdminShell";
import SubscribersManager from "@/components/admin/SubscribersManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Subscribers", robots: { index: false } };

export default async function AdminSubscribersPage() {
  let items: (typeof subscribers.$inferSelect)[] = [];
  try {
    items = await db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
  } catch {
    items = [];
  }
  return (
    <AdminShell active="Subscribers">
      <h1 className="font-display mb-8 text-2xl font-bold text-foam">Subscribers</h1>
      <SubscribersManager items={items} />
    </AdminShell>
  );
}
