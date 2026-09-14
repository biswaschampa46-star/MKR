import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { products } from "@/db/schema";
import { asc } from "drizzle-orm";
import AdminShell from "@/components/admin/AdminShell";
import { formatDate } from "@/lib/format";
import { AlertTriangle, PackageX, Search, Boxes } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Inventory", robots: { index: false } };

type Row = { id: string; name: string; slug: string; image: string; stock: number; createdAt: Date };

export default async function InventoryPage() {
  let rows: Row[] = [];
  try {
    rows = await db
      .select({ id: products.id, name: products.name, slug: products.slug, image: products.image, stock: products.stock, createdAt: products.createdAt })
      .from(products)
      .orderBy(asc(products.stock));
  } catch {
    /* db unreachable — empty state */
  }

  const low = rows.filter((r) => r.stock > 0 && r.stock <= 5);
  const out = rows.filter((r) => r.stock === 0);
  const totalUnits = rows.reduce((s, r) => s + r.stock, 0);

  return (
    <AdminShell>
      <div className="adm-fade space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--adm-text)]">Inventory</h1>
            <p className="mt-1 text-sm text-[var(--adm-sub)]">Stock levels across all products, lowest first.</p>
          </div>
          <Link href="/admin/products/new" className="adm-btn adm-btn-primary">Add product</Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            { icon: Boxes, label: "Total units", value: String(totalUnits), tone: "var(--adm-primary-soft)" },
            { icon: AlertTriangle, label: "Low stock (≤5)", value: String(low.length), tone: "var(--adm-warn)" },
            { icon: PackageX, label: "Out of stock", value: String(out.length), tone: "var(--adm-danger)" },
            { icon: Search, label: "SKUs tracked", value: String(rows.length), tone: "var(--adm-success)" },
          ].map((s) => (
            <div key={s.label} className="adm-card p-5">
              <s.icon size={18} style={{ color: s.tone }} />
              <p className="font-display mt-2 text-xl font-bold text-[var(--adm-text)]">{s.value}</p>
              <p className="adm-label mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <section className="adm-card overflow-hidden">
          {rows.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-[var(--adm-text)]">No products to track</p>
              <p className="mt-1 text-sm text-[var(--adm-sub)]">Add your first product to start tracking stock.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="adm-table w-full min-w-[680px]">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded-md border border-[var(--adm-border)]">
                            <Image src={p.image} alt={p.name} fill sizes="32px" className="object-cover" unoptimized />
                          </div>
                          <span className="font-medium text-[var(--adm-text)]">{p.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--adm-hover)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (p.stock / 25) * 100)}%`,
                                background: p.stock === 0 ? "var(--adm-danger)" : p.stock <= 5 ? "var(--adm-warn)" : "var(--adm-success)",
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-[var(--adm-text)]">{p.stock}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`adm-badge ${p.stock === 0 ? "adm-badge--danger" : p.stock <= 5 ? "adm-badge--warn" : "adm-badge--success"}`}>
                          {p.stock === 0 ? "Out of stock" : p.stock <= 5 ? "Low stock" : "In stock"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-[var(--adm-sub)]">{formatDate(p.createdAt)}</td>
                      <td>
                        <Link href={`/product/${p.slug}`} className="text-xs font-semibold text-[var(--adm-primary-soft)] hover:underline">
                          View
                        </Link>
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
