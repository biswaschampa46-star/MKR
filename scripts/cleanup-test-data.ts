import { db } from "../src/db";
import { coupons, orders, couponRedemptions } from "../src/db/schema";
import { eq, like, sql } from "drizzle-orm";

async function main() {
  // remove test orders created during the automated run
  const testOrders = await db
    .select({ id: orders.id, num: orders.orderNumber })
    .from(orders)
    .where(eq(orders.customerName, "Test User"));
  for (const o of testOrders) {
    await db.delete(couponRedemptions).where(eq(couponRedemptions.orderNumber, o.num));
    await db.delete(orders).where(eq(orders.id, o.id));
  }
  console.log(`deleted ${testOrders.length} test orders`);

  // revert TEST10 usage count for the deleted redemption
  await db.update(coupons).set({ usedCount: sql`greatest(0, ${coupons.usedCount} - 1)` }).where(eq(coupons.code, "TEST10"));

  // remove the seeded expired test coupon
  await db.delete(coupons).where(eq(coupons.code, "EXPIRED123"));
  console.log("cleaned coupons");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
