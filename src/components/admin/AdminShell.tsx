import { db } from "@/db";
import { messages, orders, productReviews } from "@/db/schema";
import { count, eq, inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminChrome from "./AdminChrome";

export default async function AdminShell({
  children,
}: {
  children: React.ReactNode;
  active?: string; // kept for backward compatibility with existing pages
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  let unreadMessages = 0;
  let unreadReviews = 0;
  let pendingOrders = 0;
  try {
    const [m] = await db.select({ n: count() }).from(messages);
    const [r] = await db.select({ n: count() }).from(productReviews).where(eq(productReviews.approved, false));
    unreadMessages = m?.n ?? 0;
    unreadReviews = r?.n ?? 0;
    const [p] = await db
      .select({ n: count() })
      .from(orders)
      .where(inArray(orders.status, ["pending_payment", "payment_verified", "confirmed", "processing"]));
    pendingOrders = p?.n ?? 0;
  } catch {
    /* db unreachable — badges just stay at zero */
  }

  return (
    <AdminChrome unread={{ messages: unreadMessages, reviews: unreadReviews }} initialPendingOrders={pendingOrders}>
      {children}
    </AdminChrome>
  );
}
