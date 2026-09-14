import type { Metadata } from "next";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc } from "drizzle-orm";
import AdminShell from "@/components/admin/AdminShell";
import CouponsManager from "@/components/admin/CouponsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Discounts & Coupons", robots: { index: false } };

export default async function DiscountsPage() {
  let list: Awaited<ReturnType<typeof loadCoupons>> = [];
  try {
    list = await loadCoupons();
  } catch {
    list = [];
  }
  return (
    <AdminShell active="Discounts & Coupons">
      <h1 className="font-display mb-2 text-2xl font-bold text-[var(--adm-text)]">Discounts & Coupons</h1>
      <p className="mb-8 max-w-xl text-sm text-[var(--adm-sub)]">
        Coupon codes are validated server-side at checkout. Percentage and fixed
        discounts, expiry, minimum order, maximum cap and usage limits are supported.
      </p>
      <CouponsManager coupons={list} />
    </AdminShell>
  );
}

function loadCoupons() {
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}
