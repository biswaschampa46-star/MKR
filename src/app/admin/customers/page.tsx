import type { Metadata } from "next";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, ne } from "drizzle-orm";
import AdminShell from "@/components/admin/AdminShell";
import { bdt, formatDate, stageLabel } from "@/lib/format";
import { Users, ShoppingBag, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Customers", robots: { index: false } };

type Customer = {
  phone: string;
  name: string;
  city: string;
  orderCount: number;
  totalSpent: number;
  lastOrder: Date;
  lastStatus: string;
};

export default async function CustomersPage() {
  let customers: Customer[] = [];
  try {
    const rows = await db.select().from(orders).where(ne(orders.status, "cancelled")).orderBy(desc(orders.createdAt));
    const map = new Map<string, Customer>();
    for (const o of rows) {
      const existing = map.get(o.phone);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += o.total;
      } else {
        map.set(o.phone, {
          phone: o.phone,
          name: o.customerName,
          city: o.city,
          orderCount: 1,
          totalSpent: o.total,
          lastOrder: o.createdAt,
          lastStatus: o.status,
        });
      }
    }
    customers = [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent);
  } catch {
    /* db unreachable — empty state */
  }

  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);
  const repeat = customers.filter((c) => c.orderCount > 1).length;

  return (
    <AdminShell>
      <div className="adm-fade space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--adm-text)]">Customers</h1>
          <p className="mt-1 text-sm text-[var(--adm-sub)]">Built from real checkout activity — one row per phone number.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Users, label: "Total customers", value: String(customers.length) },
            { icon: ShoppingBag, label: "Repeat customers", value: String(repeat) },
            { icon: MapPin, label: "Lifetime value", value: bdt(totalSpent) },
          ].map((s) => (
            <div key={s.label} className="adm-card p-5">
              <s.icon size={18} className="text-[var(--adm-primary-soft)]" />
              <p className="font-display mt-2 text-xl font-bold text-[var(--adm-text)]">{s.value}</p>
              <p className="adm-label mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <section className="adm-card overflow-hidden">
          {customers.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-[var(--adm-text)]">No customers yet</p>
              <p className="mt-1 text-sm text-[var(--adm-sub)]">Customers appear here after their first order.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="adm-table w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Orders</th>
                    <th>Total spent</th>
                    <th>Last order</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.phone}>
                      <td className="font-medium text-[var(--adm-text)]">{c.name}</td>
                      <td className="text-[var(--adm-sub)]">{c.phone}</td>
                      <td className="text-[var(--adm-sub)]">{c.city}</td>
                      <td>
                        <span className={`adm-badge ${c.orderCount > 1 ? "adm-badge--success" : "adm-badge--neutral"}`}>
                          {c.orderCount}
                        </span>
                      </td>
                      <td className="font-semibold text-[var(--adm-text)]">{bdt(c.totalSpent)}</td>
                      <td className="whitespace-nowrap text-[var(--adm-sub)]">
                        {formatDate(c.lastOrder)} · {stageLabel(c.lastStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
