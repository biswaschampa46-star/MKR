import { db } from "../src/db";
import { sql, eq } from "drizzle-orm";
import { products, coupons, orders } from "../src/db/schema";
import { checkCoupon, discountFor } from "../src/lib/coupons";
import { isInsideChittagong, deliveryFeeFor, getSettings } from "../src/lib/settings";

async function main() {
  // 1. tables
  const t = await db.execute(
    sql`select table_name from information_schema.tables where table_schema='public' order by 1`,
  );
  console.log("TABLES:", (t.rows ?? t).map((r: any) => r.table_name ?? r[0]).join(", "));

  // 2. settings / delivery logic
  const s = await getSettings();
  console.log("FEES:", s.deliveryFeeInside, s.deliveryFeeOutside);
  const cities = ["Chattogram", "Chittagong", "ctg city", "Dhaka", "Sylhet", "Dubai", "London"];
  for (const c of cities)
    console.log(`  ${c} -> ${deliveryFeeFor(c, s)} (insideCtg=${isInsideChittagong(c)})`);
  console.log("  'Chittagong Hill Tracts' ->", isInsideChittagong("Chittagong Hill Tracts"));

  // 3. product availability
  const prods = await db.select().from(products).limit(3);
  console.log("PRODUCTS:", prods.map((p) => `${p.name} ৳${p.price} stock=${p.stock}`).join(" | "));

  // 4. coupons in DB
  const cs = await db.select().from(coupons);
  console.log("COUPONS:", cs.map((c) => `${c.code}(${c.discountType}=${c.discountValue},active=${c.isActive})`).join(" | ") || "none");

  // 5. coupon functional checks
  const invalid = await checkCoupon("NOPE123", 1000);
  console.log("invalid coupon ->", invalid.ok, invalid.ok ? "" : invalid.message);

  // create temp test coupon
  const [tmp] = await db
    .insert(coupons)
    .values({ code: "TMPTEST10", discountType: "percent", discountValue: 10, maxDiscountAmount: 50 })
    .returning();
  const ok = await checkCoupon("TMPT EST".replace(/\s/g, ""), 500);
  console.log("valid coupon TMPT EST->TMPTEST10 ->", ok.ok, ok.ok ? `discount=${ok.discount}` : ok.message);
  const ok2 = await checkCoupon("tmptest10", 500); // case-insensitivity via normalize
  console.log("lowercase 'tmptest10' ->", ok2.ok, ok2.ok ? `discount=${ok2.discount}` : ok2.message);
  const huge = await checkCoupon("TMPTEST10", 400, "01799999999");
  console.log("400 subtotal, 10% capped at 50 ->", huge.ok ? huge.discount : huge.message);
  await db.delete(coupons).where(eq(coupons.id, tmp.id));
  console.log("after delete re-check ->", (await checkCoupon("TMPTEST10", 500)).ok ? "STILL VALID (BUG)" : "rejected ✓");

  // 6. orders count
  const cnt = await db.select({ n: sql<number>`count(*)::int` }).from(orders);
  console.log("ORDER COUNT:", cnt[0].n);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
