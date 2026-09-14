import type { Metadata } from "next";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { desc } from "drizzle-orm";
import AdminShell from "@/components/admin/AdminShell";
import MessagesManager from "@/components/admin/MessagesManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Messages", robots: { index: false } };

export default async function AdminMessagesPage() {
  let items: (typeof messages.$inferSelect)[] = [];
  try {
    items = await db.select().from(messages).orderBy(desc(messages.createdAt));
  } catch {
    items = [];
  }
  return (
    <AdminShell active="Messages">
      <h1 className="font-display mb-8 text-2xl font-bold text-foam">Messages</h1>
      <MessagesManager items={items} />
    </AdminShell>
  );
}
