"use client";

import { useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/use-realtime";

/** Single shared orders subscription for the admin dashboard. */
export function NewOrdersWatcher() {
  const router = useRouter();
  useRealtime("orders", () => router.refresh());
  return null;
}
