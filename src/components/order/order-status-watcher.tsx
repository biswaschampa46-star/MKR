"use client";

import { useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/use-realtime";

/** Refreshes the server-rendered order page when this order changes. */
export function OrderStatusWatcher({ orderId }: { orderId: string }) {
  const router = useRouter();
  useRealtime("orders", (event) => {
    const payload = event.payload as { orderId?: string };
    if (!payload?.orderId || payload.orderId === orderId) router.refresh();
  });
  return null;
}
