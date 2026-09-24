import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/customer";
import { listCustomerOrders } from "@/lib/data/commerce";
import { formatDateTime, formatTaka, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/utils";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfileOrdersPage() {
  const customer = await requireCustomer("/profile/orders");
  const orders = await listCustomerOrders(customer.id);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="History" title="My orders" description="Live status — updated as the studio processes your parcel." />
      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Once you place an order it appears here with live status, payment state and courier progress."
          action={<LinkButton href="/shop" size="sm">Start shopping</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/order/${order.id}`} className="glass block rounded-3xl p-5 transition hover:border-[#8ccbff]/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg text-[#f4faff]">{order.orderNumber}</p>
                  <p className="text-xs text-[#a8c0d5]">{formatDateTime(order.createdAt)} · {order.itemCount} item(s)</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{ORDER_STATUS_LABELS[order.status] ?? order.status}</Badge>
                  <Badge tone={order.paymentStatus === "verified" ? "success" : "warn"}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </Badge>
                  <span className="font-display text-lg text-[#f4faff]">{formatTaka(order.total)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
