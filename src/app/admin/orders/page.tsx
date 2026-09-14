import type { Metadata } from "next";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import AdminShell from "@/components/admin/AdminShell";
import OrdersManager from "@/components/admin/OrdersManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Orders", robots: { index: false } };

export default async function AdminOrdersPage() {
  let list: Awaited<ReturnType<typeof loadOrders>> = [];
  try {
    list = await loadOrders();
  } catch {
    list = [];
  }
  return (
    <AdminShell active="Orders">
      <h1 className="font-display mb-8 text-2xl font-bold text-foam">Orders</h1>
      <OrdersManager orders={list} />
    </AdminShell>
  );
}

function loadOrders() {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      phone: orders.phone,
      email: orders.email,
      address: orders.address,
      city: orders.city,
      notes: orders.notes,
      paymentMethod: orders.paymentMethod,
      senderNumber: orders.senderNumber,
      transactionId: orders.transactionId,
      subtotal: orders.subtotal,
      shippingFee: orders.shippingFee,
      total: orders.total,
      discount: orders.discount,
      couponCode: orders.couponCode,
      deliveryZone: orders.deliveryZone,
      paymentPurpose: orders.paymentPurpose,
      amountPaid: orders.amountPaid,
      codAmount: orders.codAmount,
      deliveryPaymentStatus: orders.deliveryPaymentStatus,
      productPaymentStatus: orders.productPaymentStatus,
      clientRequestId: orders.clientRequestId,
      items: orders.items,
      status: orders.status,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      userId: orders.userId,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt));
}
