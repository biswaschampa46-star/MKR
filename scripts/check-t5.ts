import { db } from "../src/db";
import { coupons, orders } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const [t] = await db.select().from(coupons).where(eq(coupons.code, "TEST10"));
  console.log("TEST10 ROW:", JSON.stringify(t));
  const [o5] = await db.select().from(orders).where(eq(orders.orderNumber, "MK-726003"));
  console.log("T5 ORDER:", JSON.stringify({ subtotal: o5.subtotal, discount: o5.discount, total: o5.total, coupon: o5.couponCode }));
  const ex = await db.select().from(coupons).where(eq(coupons.code, "EXPIRED123"));
  if (!ex.length) {
    await db.insert(coupons).values({ code: "EXPIRED123", discountType: "fixed", discountValue: 50, expiresAt: new Date(Date.now() - 86400000) });
    console.log("seeded EXPIRED123");
  } else console.log("EXPIRED123 exists");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
