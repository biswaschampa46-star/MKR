import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { orders, ORDER_STAGES } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Check, ArrowRight, Smartphone, Package } from "lucide-react";
import { bdt, stageLabel, methodLabel, formatDate } from "@/lib/format";
import { getPaymentNumber } from "@/lib/settings";
import { variantLabel } from "@/lib/variant-attributes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const justPlaced = sp.placed === "1";

  let order = null;
  try {
    order = (await db.select().from(orders).where(eq(orders.id, id)).limit(1))[0] ?? null;
  } catch {
    order = null;
  }
  if (!order) notFound();

  const cancelled = order.status === "cancelled";
  const currentIdx = cancelled ? -1 : ORDER_STAGES.indexOf(order.status as (typeof ORDER_STAGES)[number]);
  const payTo = await getPaymentNumber(order.paymentMethod);

  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-28 pt-36 md:px-10 md:pt-44">
      {/* header */}
      <header className="mb-14">
        <p className="label">{justPlaced ? "Order Placed" : "Order Details"}</p>
        <h1 className="display-2 mt-6 text-foam">
          {justPlaced ? "Thank you." : "Your order."}
        </h1>
        <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-mist">
          <p>
            Order{" "}
            <span className="font-display font-semibold tracking-[0.12em] text-ice">
              {order.orderNumber}
            </span>
          </p>
          <p>{formatDate(order.createdAt)}</p>
          <p className="badge-tag !text-[0.58rem]">{stageLabel(order.status)}</p>
        </div>
        {justPlaced && (
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-mist">
            Keep your order number — you can return to this page anytime via{" "}
            <Link href="/track" className="link-line text-soft hover:text-ice">Track Order</Link>.
          </p>
        )}
      </header>

      <div className="grid gap-14 lg:grid-cols-12">
        {/* left: status + payment */}
        <div className="space-y-12 lg:col-span-6">
          {/* timeline */}
          <section aria-label="Order status" className="card-glass rounded-2xl p-8">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-foam">
              Status
            </p>
            {cancelled ? (
              <p className="mt-6 text-sm text-mist">
                This order was cancelled. Contact us if you have questions.
              </p>
            ) : (
              <ol className="mt-7 space-y-0">
                {ORDER_STAGES.map((stage, i) => {
                  const done = i < currentIdx;
                  const current = i === currentIdx;
                  return (
                    <li key={stage} className="relative flex gap-5 pb-7 last:pb-0">
                      {i < ORDER_STAGES.length - 1 && (
                        <span
                          className={`absolute left-[0.85rem] top-9 h-[calc(100%-2rem)] w-px ${
                            done ? "bg-soft/60" : "bg-line-soft"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors ${
                          done
                            ? "border-soft bg-soft/20 text-soft"
                            : current
                              ? "border-soft/70 text-soft"
                              : "border-line text-mist/40"
                        }`}
                      >
                        {done ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        ) : (
                          <span className={`h-1.5 w-1.5 rounded-full ${current ? "bg-soft pulse-soft" : "bg-mist/30"}`} />
                        )}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${current || done ? "text-foam" : "text-mist/50"}`}>
                          {stageLabel(stage)}
                        </p>
                        {current && stage === "pending_payment" && (
                          <p className="mt-1.5 text-xs leading-relaxed text-mist/70">
                            {order.paymentPurpose === "full_order"
                              ? `Waiting for your ${bdt(order.total)} payment to be verified. Nothing to pay on delivery.`
                              : `Waiting for your ${bdt(order.shippingFee)} delivery-charge payment to be verified. The ${bdt(order.codAmount)} product amount is paid in cash on delivery.`}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* payment instructions */}
          {order.status === "pending_payment" && !cancelled && (
            <section aria-label="Payment instructions" className="rounded-2xl border border-soft/25 bg-deep/50 p-8">
              <p className="font-display flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-foam">
                <Smartphone className="h-4 w-4 text-soft" strokeWidth={1.5} />
                Complete your payment
              </p>
              <p className="mt-5 text-sm leading-relaxed text-mist">
                Method: <span className="font-semibold text-foam">{methodLabel(order.paymentMethod)}</span>
                <br />
                Amount to send now: <span className="font-semibold text-ice">{bdt(order.paymentPurpose === "full_order" ? order.total : order.shippingFee)}</span>
                {order.paymentPurpose !== "full_order" && (
                  <>
                    <br />
                    Remaining <span className="font-semibold text-foam">{bdt(order.codAmount)}</span> is collected in cash on delivery.
                  </>
                )}
              </p>
              {payTo ? (
                <p className="mt-4 text-sm leading-relaxed text-mist">
                  Send the delivery charge via <span className="text-foam">Send Money</span> to{" "}
                  <span className="font-display font-semibold tracking-[0.08em] text-ice">{payTo}</span>,
                  then keep the Transaction ID. We verify and confirm your order.
                </p>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-mist">
                  Our team will contact you on{" "}
                  <span className="text-foam">{order.phone}</span> shortly with the{" "}
                  {methodLabel(order.paymentMethod)} payment details. Already paid?
                  Share your Transaction ID with us and we will verify it.
                </p>
              )}
              <p className="mt-5 text-xs leading-relaxed text-mist/60">
                We never mark payments as verified automatically — every order is
                checked by the store team.
              </p>
            </section>
          )}

          {/* delivery */}
          <section aria-label="Delivery address" className="card-glass rounded-2xl p-8">
            <p className="font-display flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-foam">
              <Package className="h-4 w-4 text-soft" strokeWidth={1.5} />
              Delivery
            </p>
            <p className="mt-5 text-sm leading-relaxed text-mist">
              {order.customerName}
              <br />
              {order.address}, {order.city}
              <br />
              {order.phone}
            </p>
            {order.notes && (
              <p className="mt-4 border-t border-line-soft pt-4 text-xs leading-relaxed text-mist/70">
                Note: {order.notes}
              </p>
            )}
          </section>
        </div>

        {/* right: items */}
        <div className="lg:col-span-6">
          <section aria-label="Order items" className="card-glass rounded-2xl p-8">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-foam">
              Items
            </p>
            <ul className="mt-6 space-y-6">
              {order.items.map((item) => (
                <li key={`${item.productId}-${item.variant}`} className="flex items-center gap-5">
                  <div className="media-frame relative h-20 w-16 shrink-0">
                    <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${item.slug}`} className="font-display block truncate text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-foam hover:text-ice">
                      {item.name}
                    </Link>
                    <p className="mt-1.5 text-xs text-mist/70">
                      {variantLabel(item)} · ×{item.qty}
                    </p>
                  </div>
                  <p className="text-sm text-ice">{bdt(item.price * item.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-7 space-y-3.5 border-t border-line-soft pt-6 text-sm">
              <div className="flex justify-between">
                <dt className="text-mist">Subtotal</dt>
                <dd className="text-foam">{bdt(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-mist">Coupon {order.couponCode ? `(${order.couponCode})` : ""}</dt>
                  <dd className="text-soft">−{bdt(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-mist">Product total</dt>
                <dd className="text-foam">{bdt(order.subtotal - order.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mist">Delivery {order.deliveryZone === "inside_ctg" ? "(inside Chattogram)" : "(outside Chattogram)"}</dt>
                <dd className="text-foam">{order.shippingFee === 0 ? "Free" : bdt(order.shippingFee)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line-soft pt-4">
                <dt className="label">Grand Total</dt>
                <dd className="font-display text-xl font-bold text-ice">{bdt(order.total)}</dd>
              </div>
            </dl>

            {/* payment breakdown */}
            <dl className="mt-6 space-y-3 rounded-2xl border border-soft/25 bg-deep/50 p-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-mist">Payment plan</dt>
                <dd className="text-foam">
                  {order.paymentPurpose === "full_order" ? "Full prepayment" : "Delivery prepaid + product COD"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mist">Amount paid (advance)</dt>
                <dd className={`font-semibold ${order.amountPaid > 0 ? "text-soft" : "text-mist/60"}`}>
                  {bdt(order.amountPaid)}
                  {order.amountPaid > 0 && " · verified"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mist">Cash on delivery</dt>
                <dd className="text-foam">{bdt(order.codAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-line-soft pt-3 text-xs">
                <dt className="text-mist/70">Delivery charge</dt>
                <dd className="text-mist">{order.deliveryPaymentStatus === "paid" ? "Paid" : "Awaiting verification"}</dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-mist/70">Product payment</dt>
                <dd className="text-mist">
                  {order.productPaymentStatus === "paid"
                    ? "Paid"
                    : order.productPaymentStatus === "cod"
                      ? "Cash on delivery"
                      : "Awaiting verification"}
                </dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-mist/70">Payment method</dt>
                <dd className="text-mist">{methodLabel(order.paymentMethod)}</dd>
              </div>
            </dl>
          </section>

          <Link href="/shop" className="btn btn-line mt-8">
            Continue shopping <ArrowRight className="btn-arrow h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
