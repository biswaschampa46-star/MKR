import { Badge, SectionHeading } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { BroadcastNotificationForm } from "@/components/admin/settings-forms";
import { deleteNotificationAction } from "@/app/actions/admin-community";
import { listAllNotifications } from "@/lib/data/content";
import { db } from "@/db/client";
import { customers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDateTime } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const [notifications, customerRows] = await Promise.all([
    listAllNotifications(60),
    db.select({ id: customers.id, email: customers.email }).from(customers).orderBy(desc(customers.createdAt)).limit(100),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Comms" title="Notifications" description="In-app notifications are delivered over Supabase Realtime (SSE fallback) and stored against the customer." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="glass h-max rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg text-[#f4faff]">Send notification</h2>
          <BroadcastNotificationForm customers={customerRows} />
        </div>
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No notifications sent yet.</p>
          ) : (
            notifications.map((notification) => (
              <article key={notification.id} className="glass space-y-2 rounded-3xl p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[#f4faff]">{notification.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone={notification.audience === "admin" ? "warn" : "info"}>{notification.audience}</Badge>
                    <Badge>{notification.kind}</Badge>
                  </div>
                </div>
                {notification.body ? <p className="text-xs text-[#a8c0d5]">{notification.body}</p> : null}
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#a8c0d5]/70">{formatDateTime(notification.createdAt)}</p>
                <form action={deleteNotificationAction}>
                  <input type="hidden" name="id" value={notification.id} />
                  <SubmitButton pendingLabel="Deleting…" variant="danger" className="px-3 py-1.5 text-xs">Delete</SubmitButton>
                </form>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
