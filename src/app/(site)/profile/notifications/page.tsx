import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { NotificationStream } from "@/components/profile/notification-stream";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/profile";
import { requireCustomer } from "@/lib/auth/customer";
import { listCustomerNotifications } from "@/lib/data/content";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const customer = await requireCustomer("/profile/notifications");
  const notifications = await listCustomerNotifications(customer.id);

  return (
    <div className="space-y-6">
      <NotificationStream />
      <SectionHeading
        eyebrow="Inbox"
        title="Notifications"
        description="Order and payment updates arrive here and over realtime."
        action={
          notifications.some((item) => !item.isRead) ? (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="rounded-full border border-[#a8c0d5]/25 px-3 py-1.5 text-xs text-[#ddf3ff] transition hover:border-[#8ccbff]">
                Mark all read
              </button>
            </form>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="Order confirmations, payment verifications and announcements will appear here."
          action={<LinkButton href="/shop" size="sm" variant="outline">Continue shopping</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article key={notification.id} className={`glass rounded-3xl p-5 ${notification.isRead ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-base text-[#f4faff]">{notification.title}</p>
                <div className="flex items-center gap-2">
                  <Badge tone={notification.kind === "order" ? "info" : notification.kind === "payment" ? "success" : "default"}>
                    {notification.kind}
                  </Badge>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#a8c0d5]/70">{formatDateTime(notification.createdAt)}</span>
                </div>
              </div>
              {notification.body ? <p className="mt-1 text-sm text-[#a8c0d5]">{notification.body}</p> : null}
              <div className="mt-3 flex items-center gap-3">
                {notification.link ? (
                  <Link href={notification.link} className="text-xs text-[#8ccbff] hover:underline">
                    Open
                  </Link>
                ) : null}
                {!notification.isRead ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="id" value={notification.id} />
                    <button type="submit" className="text-xs text-[#a8c0d5] hover:text-[#f4faff]">
                      Mark read
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
