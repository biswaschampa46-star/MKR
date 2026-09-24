import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, LinkButton } from "@/components/ui";
import { MediaImage } from "@/components/media-image";
import { OrderStatusWatcher } from "@/components/order/order-status-watcher";
import { CancelOrderForm } from "@/components/order/cancel-order-form";
import { authorizeOrderView } from "@/lib/orders/access";
import { getPaymentSettings } from "@/lib/data/content";
import { formatDateTime, formatTaka, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/utils";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const order = await authorizeOrderView(id);
  if (!order) notFound();

  const payments = await getPaymentSettings();
  const payTo = order.paymentMethod === "cod" ? null : payments[order.paymentMethod as "bkash" | "nagad" | "rocket"];

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-8">
      <OrderStatusWatcher orderId={order.id} />

      {query.placed ? (
        <Alert tone="success">
          Order <strong>{order.orderNumber}</strong> placed. We will confirm it shortly — watch this page or your
          notifications for status updates.
        </Alert>
      ) : null}

      <div className="glass-strong flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#8ccbff]">Order</p>
          <h1 className="font-display text-3xl text-[#f4faff]">{order.orderNumber}</h1>
          <p className="mt-1 text-xs text-[#a8c0d5]">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">{ORDER_STATUS_LABELS[order.status] ?? order.status}</Badge>
          <Badge tone={order.paymentStatus === "verified" ? "success" : order.paymentStatus === "unpaid" ? "warn" : "default"}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
          </Badge>
          <Badge>{order.paymentMethod.toUpperCase()}</Badge>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {order.items.map((item) => (
            <article key={item.id} className="glass flex gap-4 rounded-3xl p-4">
              <MediaImage src={item.imageUrl} alt={item.productName} className="h-24 w-20 shrink-0 rounded-2xl" sizes="80px" />
              <div className="flex flex-1 items-start justify-between gap-3">
                <div>
                  {item.productSlug ? (
                    <Link href={`/product/${item.productSlug}`} className="font-display text-base text-[#f4faff] hover:text-[#8ccbff]">
                      {item.productName}
                    </Link>
                  ) : (
                    <p className="font-display text-base text-[#f4faff]">{item.productName}</p>
                  )}
                  <p className="text-xs text-[#a8c0d5]">
                    {[item.size, item.color].filter(Boolean).join(" · ")} · SKU {item.sku ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-[#a8c0d5]">
                    {item.quantity} × {formatTaka(item.unitPrice)}
                  </p>
                </div>
                <span className="font-display text-base text-[#f4faff]">{formatTaka(item.lineTotal)}</span>
              </div>
            </article>
          ))}

          <section className="glass rounded-3xl p-6">
            <h2 className="mb-4 font-display text-lg text-[#f4faff]">Status timeline</h2>
            <ol className="space-y-4">
              {order.events.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#8ccbff]" />
                  <div>
                    <p className="text-sm text-[#f4faff]">{ORDER_STATUS_LABELS[event.status] ?? event.status}</p>
                    {event.message ? <p className="text-xs text-[#a8c0d5]">{event.message}</p> : null}
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#a8c0d5]/70">{formatDateTime(event.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="glass space-y-3 rounded-3xl p-6 text-sm">
            <h2 className="font-display text-lg text-[#f4faff]">Totals</h2>
            <div className="flex justify-between text-[#a8c0d5]">
              <span>Subtotal</span>
              <span className="text-[#f4faff]">{formatTaka(order.subtotal)}</span>
            </div>
            {order.discountTotal > 0 ? (
              <div className="flex justify-between text-[#a8c0d5]">
                <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
                <span className="text-emerald-300">−{formatTaka(order.discountTotal)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-[#a8c0d5]">
              <span>Delivery (prepaid)</span>
              <span className="text-[#f4faff]">{formatTaka(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between border-t border-[#a8c0d5]/15 pt-3 text-base">
              <span className="text-[#f4faff]">Total</span>
              <span className="font-display text-xl text-[#f4faff]">{formatTaka(order.total)}</span>
            </div>
          </section>

          <section className="glass space-y-2 rounded-3xl p-6 text-sm">
            <h2 className="font-display text-lg text-[#f4faff]">Delivery</h2>
            <p className="text-[#ddf3ff]">{order.customerName}</p>
            <p className="text-[#a8c0d5]">{order.phone}</p>
            <p className="text-[#a8c0d5]">{order.email}</p>
            <p className="whitespace-pre-line text-[#a8c0d5]">
              {[order.shippingAddress.addressLine, order.shippingAddress.area, order.shippingAddress.district]
                .filter(Boolean)
                .join(", ")}
            </p>
            {order.notes ? <p className="text-xs text-[#a8c0d5]/80">Notes: {order.notes}</p> : null}
          </section>

          {payTo ? (
            <section className="glass space-y-2 rounded-3xl p-6 text-sm">
              <h2 className="font-display text-lg text-[#f4faff]">Payment verification</h2>
              <p className="text-[#a8c0d5]">
                {order.paymentMethod === "cod"
                  ? `Delivery charge prepaid via mobile money. Pay products (${formatTaka(order.total - order.deliveryFee)}) in cash to the courier.`
                  : `Send money to ${payTo} (${order.paymentMethod}) if you have not yet.`}
              </p>
              <p className="text-[#a8c0d5]">
                Delivery prepay — Sender: {order.senderNumber ?? "—"} · TxID: {order.transactionId ?? "—"}
              </p>
            </section>
          ) : (
            <section className="glass space-y-2 rounded-3xl p-6 text-sm">
              <h2 className="font-display text-lg text-[#f4faff]">Payment verification</h2>
              <p className="text-[#a8c0d5]">
                Delivery charge prepaid via mobile money. Pay products ({formatTaka(order.total - order.deliveryFee)}) in
                cash to the courier.
              </p>
              <p className="text-[#a8c0d5]">
                Delivery prepay — Sender: {order.senderNumber ?? "—"} · TxID: {order.transactionId ?? "—"}
              </p>
            </section>
          )}

          {/* Phase 13: customer cancellation — only before fulfilment starts. */}
          {["pending", "confirmed"].includes(order.status) ? <CancelOrderForm orderId={order.id} /> : null}

          <div className="flex flex-col gap-2">
            <LinkButton href="/profile/orders" variant="outline">
              All my orders
            </LinkButton>
            <LinkButton href="/shop" variant="ghost">
              Continue shopping
            </LinkButton>
          </div>
        </aside>
      </div>
    </div>
  );
}
