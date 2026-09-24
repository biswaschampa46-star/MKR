import { SectionHeading } from "@/components/ui";
import { orderStats, revenueByDay, topProducts } from "@/lib/data/commerce";
import { formatTaka } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const [stats, revenue, top] = await Promise.all([orderStats(), revenueByDay(30), topProducts(10)]);
  const maxRevenue = Math.max(...revenue.map((row) => row.revenue), 1);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Insights" title="Analytics" description="Every number is computed live from authoritative order data — cancelled orders never inflate revenue, and no history is fabricated." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-3xl p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#8ccbff]">Revenue · excl. cancelled</p>
          <p className="mt-2 font-display text-2xl text-[#f4faff]">{formatTaka(stats.revenue)}</p>
        </div>
        <div className="glass rounded-3xl p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#8ccbff]">Active orders</p>
          <p className="mt-2 font-display text-2xl text-[#f4faff]">{stats.activeOrders}</p>
          <p className="mt-1 text-[11px] text-[#a8c0d5]/70">{stats.cancelledOrders} cancelled/returned excluded</p>
        </div>
        <div className="glass rounded-3xl p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#8ccbff]">Total orders · all time</p>
          <p className="mt-2 font-display text-2xl text-[#f4faff]">{stats.ordersTotal}</p>
        </div>
        <div className="glass rounded-3xl p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#8ccbff]">Avg order value</p>
          <p className="mt-2 font-display text-2xl text-[#f4faff]">
            {formatTaka(stats.activeOrders > 0 ? Math.round(stats.revenue / stats.activeOrders) : 0)}
          </p>
        </div>
      </div>

      <section className="glass space-y-4 rounded-3xl p-6">
        <h2 className="font-display text-lg text-[#f4faff]">Revenue · last 30 days</h2>
        <div className="flex h-44 items-end gap-1.5">
          {revenue.map((row) => (
            <div key={row.day} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-[#4da8ff]/25 to-[#8ccbff]"
                style={{ height: `${Math.max((row.revenue / maxRevenue) * 100, 3)}%` }}
                title={`${row.day}: ${formatTaka(row.revenue)} · ${row.orders} orders`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="glass space-y-3 rounded-3xl p-6">
        <h2 className="font-display text-lg text-[#f4faff]">Best sellers</h2>
        {top.length === 0 ? (
          <p className="text-sm text-[#a8c0d5]">No sales data yet.</p>
        ) : (
          top.map((product) => (
            <div key={product.productId ?? product.name} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-[#ddf3ff]">{product.name}</span>
              <span className="text-[#a8c0d5]">{product.units} units · {formatTaka(product.revenue)}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
