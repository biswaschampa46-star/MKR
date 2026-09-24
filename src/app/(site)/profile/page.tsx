import type { Metadata } from "next";
import Link from "next/link";
import { Badge, SectionHeading } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/customer";
import { getCustomerOverview, listCustomerOrders } from "@/lib/data/commerce";
import { countUnreadNotifications } from "@/lib/data/content";
import { listCustomerReviews } from "@/lib/data/catalog";
import { formatDate, formatTaka, ORDER_STATUS_LABELS } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfileOverviewPage() {
  const customer = await requireCustomer();
  const [overview, orders, notifications, reviews] = await Promise.all([
    getCustomerOverview(customer.id),
    listCustomerOrders(customer.id),
    countUnreadNotifications(customer.id),
    listCustomerReviews(customer.id),
  ]);

  const cards = [
    { label: "Orders", value: overview.orderCount },
    { label: "Lifetime spend", value: formatTaka(overview.spend) },
    { label: "In progress", value: overview.pending },
    { label: "Unread notices", value: notifications },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass rounded-3xl p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8ccbff]">{card.label}</p>
            <p className="mt-2 font-display text-2xl text-[#f4faff]">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <SectionHeading eyebrow="Recent" title="Latest orders" action={<Link href="/profile/orders" className="text-xs text-[#8ccbff]">View all</Link>} />
        {orders.length === 0 ? (
          <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No orders yet. Your first MKR piece is waiting.</p>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 4).map((order) => (
              <Link key={order.id} href={`/order/${order.id}`} className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5 transition hover:border-[#8ccbff]/40">
                <div>
                  <p className="font-display text-base text-[#f4faff]">{order.orderNumber}</p>
                  <p className="text-xs text-[#a8c0d5]">{formatDate(order.createdAt)} · {order.itemCount} item(s)</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="info">{ORDER_STATUS_LABELS[order.status] ?? order.status}</Badge>
                  <span className="font-display text-base text-[#f4faff]">{formatTaka(order.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading eyebrow="Feedback" title="My reviews" action={<Link href="/profile/reviews" className="text-xs text-[#8ccbff]">Manage</Link>} />
        {reviews.length === 0 ? (
          <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">You have not reviewed anything yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="glass rounded-3xl p-5">
                <p className="text-sm text-[#f4faff]">{review.productName}</p>
                <p className="text-xs text-[#a8c0d5]">{review.rating}★ · {review.status}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
