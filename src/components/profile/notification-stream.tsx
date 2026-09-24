"use client";

import { useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/use-realtime";

/** One shared notifications subscription that refreshes the inbox live. */
export function NotificationStream() {
  const router = useRouter();
  useRealtime("notifications", () => router.refresh());
  return null;
}
