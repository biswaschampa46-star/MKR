import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { desc } from "drizzle-orm";
import AdminShell from "@/components/admin/AdminShell";
import { formatDate } from "@/lib/format";
import { MessageSquare, Star, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  let items: (typeof messages.$inferSelect)[] = [];
  try {
    items = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(10);
  } catch {
    /* db unreachable */
  }

  return (
    <AdminShell>
      <div className="adm-fade space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--adm-text)]">Notifications</h1>
          <p className="mt-1 text-sm text-[var(--adm-sub)]">Everything that needs your attention, in one feed.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="adm-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-[var(--adm-text)]">
                <MessageSquare size={17} className="text-[var(--adm-primary-soft)]" />
                Customer messages
              </h2>
              <Link href="/admin/messages" className="text-xs font-semibold text-[var(--adm-primary-soft)] hover:underline">
                Open inbox
              </Link>
            </div>
            {items.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--adm-sub)]">No messages yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--adm-border)]">
                {items.map((m) => (
                  <li key={m.id} className="py-3">
                    <p className="text-sm font-medium text-[var(--adm-text)]">{m.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--adm-sub)]">{m.message}</p>
                    <p className="mt-1 text-xs text-[var(--adm-sub)]">{formatDate(m.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="adm-card flex flex-col p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-[var(--adm-text)]">
              <Star size={17} className="text-[var(--adm-warn)]" />
              Review moderation
            </h2>
            <p className="mt-3 text-sm text-[var(--adm-sub)]">
              Hidden and pending reviews wait in the moderation queue.
            </p>
            <Link href="/admin/reviews" className="adm-btn adm-btn-ghost mt-auto w-fit">
              Moderate reviews
              <ArrowRight size={14} />
            </Link>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
