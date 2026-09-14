import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { orders, products, productReviews, subscribers, messages } from "@/db/schema";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { bdt, stageLabel, formatDate } from "@/lib/format";
import AdminShell from "@/components/admin/AdminShell";
import SalesChart, { type ChartPoint } from "@/components/admin/SalesChart";
import OrdersTable, { type OrderRow } from "@/components/admin/OrdersTable";
import {
  ShoppingBag, Package, Users, Star, TrendingUp, TrendingDown, Boxes, AlertTriangle,
  PackageCheck, PackageX, UserPlus, UserCheck, ShoppingCart, TicketPercent, FileText,
  Megaphone, Plus, ClipboardList, MessageSquare, ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Dashboard", robots: { index: false } };

const DAY = 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  /* ————— data (all optional — the dashboard degrades gracefully) ————— */
  let revenue = 0;
  let orderCount = 0;
  let productCount = 0;
  let customerCount = 0;
  let subscriberCount = 0;
  let messageCount = 0;
  let avgRating = 0;
  let reviewCount = 0;
  let cancelledCount = 0;
  let stockUnits = 0;
  let lowStockRows: { id: string; slug: string; name: string; image: string; stock: number }[] = [];
  let outOfStock = 0;
  let recentRestock: { name: string; stock: number }[] = [];
  let allOrders: OrderRow[] = [];
  let orderItems: { name: string; qty: number }[][] = [];
  let topProducts: { id: string; slug: string; name: string; image: string; stock: number; createdAt: Date }[] = [];

  function normalizeOrderItems(items: unknown): { name: string; qty: number }[] {
    if (!Array.isArray(items)) return [];
    return items.map((i) => {
      const row = i as { name?: unknown; qty?: unknown };
      return { name: String(row.name ?? "item"), qty: Number(row.qty ?? 1) || 1 };
    });
  }

  async function safe(section: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      console.error(`admin dashboard: ${section} failed`, err);
    }
  }

  await safe("revenue", async () => {
    const [rev] = await db
      .select({ total: sql<number>`coalesce(sum(${orders.total}), 0)::int`, n: sql<number>`count(*)::int` })
      .from(orders)
      .where(ne(orders.status, "cancelled"));
    revenue = rev?.total ?? 0;
    orderCount = rev?.n ?? 0;
  });

  await safe("products", async () => {
    const [p] = await db.select({ n: sql<number>`count(*)::int`, units: sql<number>`coalesce(sum(${products.stock}), 0)::int` }).from(products);
    productCount = p?.n ?? 0;
    stockUnits = p?.units ?? 0;
  });

  await safe("customers", async () => {
    const [c] = await db.select({ n: sql<number>`count(distinct ${orders.phone})::int` }).from(orders);
    customerCount = c?.n ?? 0;
  });

  await safe("subscribers+messages", async () => {
    const [s] = await db.select({ n: sql<number>`count(*)::int` }).from(subscribers);
    subscriberCount = s?.n ?? 0;
    const [m] = await db.select({ n: sql<number>`count(*)::int` }).from(messages);
    messageCount = m?.n ?? 0;
  });

  await safe("reviews", async () => {
    const [r] = await db
      .select({ avg: sql<number>`coalesce(avg(${productReviews.rating}), 0)::float`, n: sql<number>`count(*)::int` })
      .from(productReviews)
      .where(eq(productReviews.approved, true));
    avgRating = r?.avg ?? 0;
    reviewCount = r?.n ?? 0;
    const [cc] = await db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "cancelled"));
    cancelledCount = cc?.n ?? 0;
  });

  await safe("stock", async () => {
    lowStockRows = await db
      .select({ id: products.id, slug: products.slug, name: products.name, image: products.image, stock: products.stock })
      .from(products)
      .where(and(sql`${products.stock} > 0`, sql`${products.stock} <= 5`))
      .orderBy(products.stock)
      .limit(4);
    const [oos] = await db.select({ n: sql<number>`count(*)::int` }).from(products).where(sql`${products.stock} = 0`);
    outOfStock = oos?.n ?? 0;
    recentRestock = await db
      .select({ name: products.name, stock: products.stock })
      .from(products)
      .where(sql`${products.stock} > 5`)
      .orderBy(desc(products.createdAt))
      .limit(3);
  });

  await safe("orders", async () => {
    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        phone: orders.phone,
        city: orders.city,
        total: orders.total,
        paymentMethod: orders.paymentMethod,
        status: orders.status,
        createdAt: orders.createdAt,
        items: orders.items,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(200);
    allOrders = rows.map((o) => ({ ...o, items: normalizeOrderItems(o.items) }));
    orderItems = allOrders.map((o) => o.items);
  });

  await safe("top products", async () => {
    topProducts = await db
      .select({ id: products.id, slug: products.slug, name: products.name, image: products.image, stock: products.stock, createdAt: products.createdAt })
      .from(products)
      .orderBy(desc(products.createdAt))
      .limit(5);
  });

  /* ————— derived metrics ————— */
  const now = Date.now();
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

  const inMonth = allOrders.filter((o) => o.status !== "cancelled" && new Date(o.createdAt) >= monthStart);
  const inPrevMonth = allOrders.filter((o) => o.status !== "cancelled" && new Date(o.createdAt) >= prevMonthStart && new Date(o.createdAt) < monthStart);
  const sum = (rows: OrderRow[]) => rows.reduce((s2, o) => s2 + o.total, 0);
  const revenueThis = sum(inMonth) || revenue;
  const revenuePrev = sum(inPrevMonth);
  const salesDelta = revenuePrev > 0 ? ((revenueThis - revenuePrev) / revenuePrev) * 100 : revenueThis > 0 ? 100 : 0;
  const ordersThis = inMonth.length;
  const ordersPrev = inPrevMonth.length;
  const ordersDelta = ordersPrev > 0 ? ((ordersThis - ordersPrev) / ordersPrev) * 100 : ordersThis > 0 ? 100 : 0;

  const aov = orderCount > 0 ? Math.round(revenue / orderCount) : 0;
  const cancelRate = orderCount + cancelledCount > 0 ? (cancelledCount / (orderCount + cancelledCount)) * 100 : 0;

  /* daily series, last 30 days */
  const series: ChartPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now - i * DAY);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + DAY);
    const dayOrders = allOrders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime() && o.status !== "cancelled";
    });
    series.push({
      day: dayStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      revenue: sum(dayOrders),
      orders: dayOrders.length,
    });
  }

  /* ————— stat cards ————— */
  const stats = [
    {
      label: "Total sales",
      value: bdt(revenue),
      delta: salesDelta,
      icon: ShoppingBag,
      tint: "var(--adm-primary)",
      spark: series.map((p) => p.revenue),
    },
    {
      label: "Total orders",
      value: String(orderCount),
      delta: ordersDelta,
      icon: ClipboardList,
      tint: "var(--adm-primary-soft)",
      spark: series.map((p) => p.orders),
    },
    {
      label: "Customers",
      value: String(customerCount),
      delta: null,
      icon: Users,
      tint: "var(--adm-success)",
      spark: null as number[] | null,
    },
    {
      label: "Products",
      value: String(productCount),
      delta: null,
      icon: Package,
      tint: "var(--adm-warn)",
      spark: null as number[] | null,
    },
  ];

  const performance = [
    { label: "Average order value", value: aov > 0 ? bdt(aov) : "—", hint: `${orderCount} paid orders` },
    { label: "Return / cancel rate", value: `${cancelRate.toFixed(1)}%`, hint: `${cancelledCount} cancelled` },
    { label: "Customer satisfaction", value: reviewCount > 0 ? `${avgRating.toFixed(1)} / 5` : "—", hint: `${reviewCount} reviews` },
    { label: "Subscribers", value: String(subscriberCount), hint: "newsletter list" },
  ];

  /* activity timeline — newest real events first */
  type Event = { icon: React.ElementType; title: string; meta: string; when: Date | string; tone: string };
  const events: Event[] = [];
  for (const o of allOrders.slice(0, 6)) {
    events.push({ icon: ShoppingCart, title: `Order ${o.orderNumber} — ${o.customerName}`, meta: `${bdt(o.total)} · ${stageLabel(o.status)}`, when: o.createdAt, tone: o.status === "cancelled" ? "var(--adm-danger)" : "var(--adm-primary-soft)" });
  }
  if (messageCount > 0) {
    events.push({ icon: MessageSquare, title: `${messageCount} customer message${messageCount === 1 ? "" : "s"} received`, meta: "Contact inbox", when: new Date(), tone: "var(--adm-warn)" });
  }
  if (reviewCount > 0) {
    events.push({ icon: Star, title: `${reviewCount} approved review${reviewCount === 1 ? "" : "s"}`, meta: avgRating > 0 ? `${avgRating.toFixed(1)} average rating` : "", when: new Date(), tone: "var(--adm-success)" });
  }
  events.sort((a, b2) => new Date(b2.when).getTime() - new Date(a.when).getTime());

  const quickActions = [
    { href: "/admin/products/new", label: "Add product", icon: Plus },
    { href: "/admin/orders", label: "Manage orders", icon: ShoppingCart },
    { href: "/admin/marketing", label: "Add customer", icon: Megaphone },
    { href: "/admin/discounts", label: "Create coupon", icon: TicketPercent },
    { href: "/admin/analytics", label: "View reports", icon: FileText },
  ];

  const fmtNum = (n: number) => new Intl.NumberFormat("en-IN").format(n);

  return (
    <AdminShell>
      <div className="adm-fade space-y-6">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--adm-text)]">Dashboard</h1>
            <p className="mt-1 text-sm text-[var(--adm-sub)]">
              {formatDate(new Date())} · store is live and taking orders
            </p>
          </div>
          <Link href="/admin/products/new" className="adm-btn adm-btn-primary">
            <Plus size={16} />
            Add product
          </Link>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => {
            const up = (s.delta ?? 0) >= 0;
            const maxV = s.spark ? Math.max(...s.spark, 1) : 0;
            return (
              <div key={s.label} className="adm-card adm-card--hover p-5">
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--adm-tint)", color: s.tint }}>
                    <s.icon size={20} strokeWidth={1.9} />
                  </span>
                  {s.delta !== null && (
                    <span className={`adm-badge ${up ? "adm-badge--success" : "adm-badge--danger"}`}>
                      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {up ? "+" : ""}{Math.abs(s.delta).toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="adm-label mt-4">{s.label}</p>
                <p className="font-display mt-1 text-2xl font-bold tracking-tight text-[var(--adm-text)]">{s.value}</p>
                {s.spark && (
                  <svg viewBox="0 0 120 32" className="mt-3 w-full" preserveAspectRatio="none" aria-hidden>
                    <polyline
                      points={s.spark.map((v, i) => `${(i / Math.max(s.spark!.length - 1, 1)) * 120},${30 - (v / maxV) * 26}`).join(" ")}
                      fill="none"
                      stroke={s.tint}
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* chart + timeline */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SalesChart data={series} />
          </div>

          {/* activity timeline */}
          <section className="adm-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold text-[var(--adm-text)]">Order activity</h2>
            <div className="mt-5">
              {events.length === 0 ? (
                <p className="text-sm text-[var(--adm-sub)]">No activity yet — events appear here as orders come in.</p>
              ) : (
                events.slice(0, 6).map((e, i) => (
                  <div key={i} className="adm-timeline-item">
                    <span className="adm-timeline-dot">
                      <e.icon size={10} style={{ color: e.tone }} />
                    </span>
                    <p className="text-sm font-medium text-[var(--adm-text)]">{e.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--adm-sub)]">
                      {e.meta} · {formatDate(e.when)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* orders table */}
        <OrdersTable orders={allOrders.map((o, i) => ({ ...o, items: orderItems[i] ?? [] }))} />

        {/* top products + inventory + customers */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* top products */}
          <section className="adm-card p-5 sm:p-6 xl:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[var(--adm-text)]">Best selling products</h2>
              <Link href="/admin/products" className="text-xs font-semibold text-[var(--adm-primary-soft)] hover:underline">
                View all
              </Link>
            </div>
            {topProducts.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--adm-sub)]">No products yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--adm-border)]">
                {topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-4 py-3">
                    <span className="w-4 text-sm font-bold text-[var(--adm-sub)]">{i + 1}</span>
                    <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--adm-border)]">
                      <Image src={p.image} alt={p.name} fill sizes="40px" className="object-cover" unoptimized />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--adm-text)]">{p.name}</p>
                      <p className="text-xs text-[var(--adm-sub)]">Added {formatDate(p.createdAt)}</p>
                    </div>
                    <span className={`adm-badge ${p.stock === 0 ? "adm-badge--danger" : p.stock <= 5 ? "adm-badge--warn" : "adm-badge--success"}`}>
                      {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
                    </span>
                    <ArrowRight size={15} className="text-[var(--adm-sub)]" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* inventory overview */}
          <section className="adm-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold text-[var(--adm-text)]">Inventory overview</h2>
            <div className="mt-4 space-y-3">
              {[
                { icon: Boxes, label: "Total stock", value: `${fmtNum(stockUnits)} units`, tone: "var(--adm-primary-soft)" },
                { icon: AlertTriangle, label: "Low stock (≤ 5)", value: `${lowStockRows.length} products`, tone: "var(--adm-warn)" },
                { icon: PackageX, label: "Out of stock", value: `${outOfStock} products`, tone: "var(--adm-danger)" },
                { icon: PackageCheck, label: "Recently added", value: recentRestock.length > 0 ? recentRestock[0].name : "—", tone: "var(--adm-success)" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 rounded-xl border border-[var(--adm-border)] p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--adm-hover)", color: row.tone }}>
                    <row.icon size={17} strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--adm-sub)]">{row.label}</p>
                    <p className="truncate text-sm font-semibold text-[var(--adm-text)]">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/admin/inventory" className="adm-btn adm-btn-ghost mt-4 w-full">
              Review inventory
              <ArrowRight size={15} />
            </Link>
          </section>
        </div>

        {/* customers + performance + quick actions */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* customer overview */}
          <section className="adm-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold text-[var(--adm-text)]">Customers</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--adm-border)] p-3">
                <UserPlus size={16} className="text-[var(--adm-primary-soft)]" />
                <p className="font-display mt-2 text-xl font-bold text-[var(--adm-text)]">{fmtNum(customerCount)}</p>
                <p className="text-xs text-[var(--adm-sub)]">Total customers</p>
              </div>
              <div className="rounded-xl border border-[var(--adm-border)] p-3">
                <UserCheck size={16} className="text-[var(--adm-success)]" />
                <p className="font-display mt-2 text-xl font-bold text-[var(--adm-text)]">{fmtNum(inMonth.length)}</p>
                <p className="text-xs text-[var(--adm-sub)]">Ordered this month</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--adm-border)] p-3">
              <p className="adm-label">Returning activity</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--adm-hover)]">
                <div
                  className="h-full rounded-full bg-[var(--adm-success)] transition-all"
                  style={{ width: `${orderCount > 0 ? Math.min(100, (inMonth.length / orderCount) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--adm-sub)]">
                {orderCount > 0 ? `${((inMonth.length / orderCount) * 100).toFixed(0)}% of all orders came in this month` : "Not enough data yet"}
              </p>
            </div>
            <Link href="/admin/customers" className="adm-btn adm-btn-ghost mt-4 w-full">
              View customers
              <ArrowRight size={15} />
            </Link>
          </section>

          {/* performance */}
          <section className="adm-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold text-[var(--adm-text)]">Performance</h2>
            <div className="mt-4 space-y-3">
              {performance.map((p) => (
                <div key={p.label} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--adm-border)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--adm-text)]">{p.value}</p>
                    <p className="text-xs text-[var(--adm-sub)]">{p.hint}</p>
                  </div>
                  <p className="adm-label text-right">{p.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* quick actions */}
          <section className="adm-card p-5 sm:p-6">
            <h2 className="font-display text-base font-bold text-[var(--adm-text)]">Quick actions</h2>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {quickActions.map((a) => (
                <Link key={a.label} href={a.href} className="adm-nav-item justify-start border border-[var(--adm-border)] bg-[var(--adm-surface)]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--adm-tint)", color: "var(--adm-primary-soft)" }}>
                    <a.icon size={16} />
                  </span>
                  <span className="flex-1 text-sm font-medium">{a.label}</span>
                  <ArrowRight size={14} className="opacity-50" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
