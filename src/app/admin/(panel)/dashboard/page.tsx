import Link from "next/link";
import { Badge, SectionHeading } from "@/components/ui";
import { NewOrdersWatcher } from "@/components/admin/new-orders-watcher";
import { listInventory, listProducts } from "@/lib/data/catalog";
import { listRecentOrders, orderStats, revenueByDay } from "@/lib/data/commerce";
import { listMessages } from "@/lib/data/content";
import { formatDateTime, formatTaka, ORDER_STATUS_LABELS, stripUndefined } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, recent, revenue, lowStock, messages, products] = await Promise.all([
    orderStats(),
    listRecentOrders(8),
    revenueByDay(14),
    listInventory(8, true),
    listMessages("new"),
    listProducts({ perPage: 5, includeUnpublished: true }),
  ]);
  const maxRevenue = Math.max(...revenue.map((row) => row.revenue), 1);

  return (
    <div className="space-y-6">
      <NewOrdersWatcher />
      <SectionHeading eyebrow="Live" title="Operations dashboard" description="Metrics read directly from PostgreSQL — the same source of truth the storefront uses." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Revenue · excludes cancelled", value: formatTaka(stats.revenue) },
          { label: "Total orders (all time)", value: stats.ordersTotal },
          { label: "Active orders (not cancelled/returned)", value: stats.activeOrders },
          { label: "Cancelled & returned orders", value: stats.cancelledOrders },
          { label: "Pending orders", value: stats.pending },
          { label: "Customers", value: stats.customers },
          { label: "Awaiting payment verification", value: stats.awaitingPayment },
          { label: "Low stock variants", value: stats.lowStock },
        ].map((card) => (
          <div key={card.label} className="glass rounded-3xl p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8ccbff]">{card.label}</p>
            <p className="mt-2 font-display text-2xl text-[#f4faff]">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="glass space-y-4 rounded-3xl p-6">
        <h2 className="font-display text-lg text-[#f4faff]">Revenue · last 14 days</h2>
        <p className="text-xs text-[#a8c0d5]">Computed live from orders (cancelled excluded). Days before the first order show zero — real history only.</p>
        <div className="flex h-40 items-end gap-2">
          {revenue.map((row) => (
            <div key={row.day} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-[#4da8ff]/30 to-[#8ccbff]"
                style={{ height: `${Math.max((row.revenue / maxRevenue) * 100, 3)}%` }}
                title={`${row.day}: ${formatTaka(row.revenue)} · ${row.orders} orders`}
              />
              <span className="text-[9px] text-[#a8c0d5]/70">{row.day.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass space-y-3 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-[#f4faff]">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs text-[#8ccbff]">All orders</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-[#a8c0d5]">No orders yet.</p>
          ) : (
            recent.map((order) => (
              <Link key={order.id} href={`/admin/orders?focus=${order.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[#a8c0d5]/12 px-3 py-2.5 text-sm transition hover:border-[#8ccbff]/40">
                <span>
                  <span className="text-[#f4faff]">{order.orderNumber}</span>
                  <span className="block text-xs text-[#a8c0d5]">{order.customerName} · {formatDateTime(order.createdAt)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone="info">{ORDER_STATUS_LABELS[order.status] ?? order.status}</Badge>
                  <span className="text-[#f4faff]">{formatTaka(order.total)}</span>
                </span>
              </Link>
            ))
          )}
        </section>

        <div className="space-y-6">
          <section className="glass space-y-3 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-[#f4faff]">Low stock</h2>
              <Link href="/admin/inventory" className="text-xs text-[#8ccbff]">Manage inventory</Link>
            </div>
            {lowStock.length === 0 ? (
              <p className="text-sm text-[#a8c0d5]">No variants below their threshold.</p>
            ) : (
              lowStock.map((row) => (
                <div key={row.variantId ?? row.sku ?? row.productId} className="flex items-center justify-between text-sm">
                  <span className="text-[#ddf3ff]">{row.productName} {row.size ? `· ${row.size}` : ""} {row.color ? `/ ${row.color}` : ""}</span>
                  <span className="text-rose-200">{row.stock} left</span>
                </div>
              ))
            )}
          </section>

          <section className="glass space-y-3 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-[#f4faff]">New messages</h2>
              <Link href="/admin/messages" className="text-xs text-[#8ccbff]">Inbox</Link>
            </div>
            {messages.length === 0 ? (
              <p className="text-sm text-[#a8c0d5]">No unread messages.</p>
            ) : (
              messages.slice(0, 4).map((message) => (
                <p key={message.id} className="text-sm text-[#ddf3ff]">
                  {message.name} <span className="text-xs text-[#a8c0d5]">{stripUndefined(message.subject) || message.message.slice(0, 60)}</span>
                </p>
              ))
            )}
          </section>

          <section className="glass space-y-3 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-[#f4faff]">Catalogue</h2>
              <Link href="/admin/products" className="text-xs text-[#8ccbff]">Products</Link>
            </div>
            {products.items.length === 0 ? (
              <p className="text-sm text-[#a8c0d5]">No products yet — create the first one.</p>
            ) : (
              products.items.map((product) => (
                <div key={product.id} className="flex items-center justify-between text-sm">
                  <span className="text-[#ddf3ff]">{product.name}</span>
                  <span className="text-[#a8c0d5]">{formatTaka(product.price)} · stock {product.stock}</span>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
