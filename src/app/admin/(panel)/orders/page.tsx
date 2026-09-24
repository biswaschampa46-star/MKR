import Link from "next/link";
import { Badge, SectionHeading } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateOrderStatusAction, verifyPaymentAction } from "@/app/actions/admin-orders";
import { getOrderDetail, listOrdersForAdmin } from "@/lib/data/commerce";
import { formatDateTime, formatTaka, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const [orders, focus] = await Promise.all([
    listOrdersForAdmin({ status: params.status, search: params.q }),
    params.focus ? getOrderDetail(params.focus) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Sales"
        title="Orders"
        description="Status changes run through the transactional RPC, so cancelling an order restocks variant inventory exactly once."
      />

      <form className="glass flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3">
        <input name="q" defaultValue={params.q ?? ""} placeholder="Order number, name, phone, TxID" className="min-w-56 flex-1 rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-2.5 text-sm" />
        <Select name="status" defaultValue={params.status ?? ""} className="w-auto min-w-40 py-2.5 text-sm" aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <button type="submit" className="rounded-full border border-[#a8c0d5]/25 px-4 py-2 text-xs text-[#ddf3ff]">Filter</button>
        <a
          href={`/api/admin/export/orders?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(params.q ? { search: params.q } : {}) }).toString()}`}
          className="ml-auto rounded-full bg-gradient-to-r from-[#4da8ff] to-[#8ccbff] px-4 py-2 text-xs font-semibold text-[#071a2b] transition hover:brightness-110"
          download
        >
          Export CSV
        </a>
      </form>

      {focus ? (
        <section className="glass space-y-4 rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl text-[#f4faff]">{focus.orderNumber}</h2>
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">{ORDER_STATUS_LABELS[focus.status]}</Badge>
              <Badge tone={focus.paymentStatus === "verified" ? "success" : "warn"}>{PAYMENT_STATUS_LABELS[focus.paymentStatus]}</Badge>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm text-[#a8c0d5]">
              <p className="text-[#f4faff]">{focus.customerName}</p>
              <p>{focus.email}</p>
              <p>{focus.phone}</p>
              <p>{[focus.shippingAddress.addressLine, focus.shippingAddress.area, focus.shippingAddress.district].filter(Boolean).join(", ")}</p>
              {focus.transactionId ? <p>TxID {focus.transactionId} · sender {focus.senderNumber ?? "—"}</p> : null}
            </div>
            <div className="space-y-1 text-sm text-[#a8c0d5]">
              <p>Method: {focus.paymentMethod.toUpperCase()} · {focus.paymentPurpose.replace("_", " ")} · delivery prepaid</p>
              <p>Subtotal {formatTaka(focus.subtotal)} · discount {formatTaka(focus.discountTotal)} · delivery {formatTaka(focus.deliveryFee)}</p>
              <p className="font-display text-lg text-[#f4faff]">Total {formatTaka(focus.total)}</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-[#ddf3ff]">
            {focus.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.productName} {item.size ? `· ${item.size}` : ""} {item.color ? `· ${item.color}` : ""} ×{item.quantity}</span>
                <span>{formatTaka(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="grid gap-4 sm:grid-cols-2">
            <form action={updateOrderStatusAction} className="space-y-3">
              <input type="hidden" name="orderId" value={focus.id} />
              <Select name="status" defaultValue={focus.status} aria-label="Order status">
                {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <input name="message" placeholder="Customer-facing note" className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-3 py-2.5 text-sm" />
              <SubmitButton pendingLabel="Updating…" variant="outline">Update status</SubmitButton>
            </form>
            {focus.paymentStatus !== "verified" ? (
              <form action={verifyPaymentAction} className="flex items-end">
                <input type="hidden" name="orderId" value={focus.id} />
                <SubmitButton pendingLabel="Verifying…" variant="outline" className="border-emerald-400/40 bg-emerald-500/10 text-emerald-100">Verify payment</SubmitButton>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="space-y-3">
        {orders.length === 0 ? (
          <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No orders match this filter.</p>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4 text-sm">
              <div>
                <Link href={`/admin/orders?focus=${order.id}`} className="font-display text-base text-[#f4faff] hover:text-[#8ccbff]">
                  {order.orderNumber}
                </Link>
                <p className="text-xs text-[#a8c0d5]">{order.customerName} · {order.phone} · {formatDateTime(order.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{ORDER_STATUS_LABELS[order.status]}</Badge>
                <Badge tone={order.paymentStatus === "verified" ? "success" : "warn"}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</Badge>
                <span className="font-display text-base text-[#f4faff]">{formatTaka(order.total)}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
