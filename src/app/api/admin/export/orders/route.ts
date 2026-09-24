import { sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/admin";
import { rawQuery } from "@/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ══════════════ Admin-only orders CSV export (Phase 12) ══════════════
   Server-generated, UTF-8 with BOM (Excel-safe for Bengali text), full CSV
   escaping, and spreadsheet formula-injection protection: any value starting
   with =, +, -, @ or a control char is prefixed with a single quote so
   Excel/Sheets treat it as text. Exported fields are order/ccheckout data
   only — no hashes, tokens or internal identifiers. */

const CSV_INJECTION = /^[=+\-@\t\r]/;

function csvCell(value: unknown): string {
  if (value === null || undefined) return "";
  let text = String(value);
  if (CSV_INJECTION.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");

type ExportRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  email: string;
  phone: string;
  address: Record<string, string | null>;
  deliveryZone: string;
  items: string;
  quantities: string;
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  couponCode: string | null;
  paymentMethod: string;
  paymentPurpose: string;
  paymentStatus: string;
  senderNumber: string | null;
  transactionId: string | null;
  status: string;
  notes: string | null;
};

const HEADERS = [
  "Order ID", "Order Number", "Order Time", "Customer Name", "Email", "Phone",
  "Address", "Area/Thana", "Postal Code", "District/Location", "Delivery Zone",
  "Products", "Quantities", "Item Count", "Subtotal (BDT)", "Discount (BDT)",
  "Delivery Fee (BDT)", "Total (BDT)", "Coupon", "Payment Method", "Payment Purpose",
  "Payment Status", "Sender Number", "Transaction ID", "Order Status", "Customer Notes",
];

export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return new Response("Unauthorized — admin session required.", { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.trim();

  const clauses = [sql`true`];
  if (status && status !== "all") clauses.push(sql`o.status = ${status}::order_status`);
  if (search) {
    const like = `%${search}%`;
    clauses.push(
      sql`(o.order_number ilike ${like} or o.customer_name ilike ${like} or o.email ilike ${like} or o.phone ilike ${like})`,
    );
  }

  const orders = await rawQuery<ExportRow>(
    sql`select o.id, o.order_number as "orderNumber", o.created_at as "createdAt",
               o.customer_name as "customerName", o.email, o.phone,
               o.shipping_address as address, o.delivery_zone as "deliveryZone",
               coalesce((select string_agg(oi.product_name || ' × ' || oi.quantity || ' (' || oi.line_total || ' BDT)', ' | ' order by oi.created_at)
                   from order_items oi where oi.order_id = o.id), '') as items,
               coalesce((select string_agg(oi.quantity::text, ', ' order by oi.created_at)
                   from order_items oi where oi.order_id = o.id), '') as quantities,
               (select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = o.id) as "itemCount",
               o.subtotal, o.discount_total as "discountTotal", o.delivery_fee as "deliveryFee", o.total,
               o.coupon_code as "couponCode", o.payment_method::text as "paymentMethod",
               o.payment_purpose::text as "paymentPurpose", o.payment_status::text as "paymentStatus",
               o.sender_number as "senderNumber", o.transaction_id as "transactionId",
               o.status::text as status, o.notes
          from orders o
         where ${sql.join(clauses, sql` and `)}
         order by o.created_at desc
         limit 5000`,
  );

  const rows: string[] = [csvRow(HEADERS)];
  for (const o of orders) {
    const address = o.address ?? {};
    rows.push(
      csvRow([
        o.id,
        o.orderNumber,
        new Date(o.createdAt).toISOString(),
        o.customerName,
        o.email,
        o.phone,
        address.addressLine ?? "",
        address.area ?? "",
        address.postalCode ?? "",
        address.district ?? "",
        o.deliveryZone,
        o.items,
        o.quantities,
        o.itemCount,
        o.subtotal,
        o.discountTotal,
        o.deliveryFee,
        o.total,
        o.couponCode ?? "",
        o.paymentMethod,
        o.paymentPurpose,
        o.paymentStatus,
        o.senderNumber ?? "",
        o.transactionId ?? "",
        o.status,
        o.notes ?? "",
      ]),
    );
  }

  // UTF-8 BOM so Excel renders Bengali text correctly.
  const body = "\uFEFF" + rows.join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mkr-orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
