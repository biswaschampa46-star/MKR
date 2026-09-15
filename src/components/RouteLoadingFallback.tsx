"use client";

import { isBootOrSettling, markNavigationComplete } from "@/lib/loading-store";

/**
 * App Router route-level fallback (client component so the boot-window
 * check runs in the browser, not during SSR — SSR renders nothing, which
 * is exactly right: the boot splash handles first paint).
 *
 * IMPORTANT: this must never be a second FULL-SCREEN loader. The premium
 * boot splash (GlobalLoadingOverlay) is the single full-screen loading
 * experience. During boot and its settle window this renders nothing, and
 * afterwards it shows a lightweight inline placeholder so a slow server
 * navigation still gets brand feedback without the "loader → loader" flash.
 */
export default function RouteLoadingFallback({ label }: { label?: string }) {
  if (isBootOrSettling()) return null;
  // Real content has arrived; tell the overlay to drop any route-loading
  // state so the two systems can't queue up back-to-back.
  markNavigationComplete();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
      className="grid min-h-[52vh] place-items-center px-6 py-16"
    >
      <p className="label animate-pulse">{label ?? "LOADING"}</p>
    </div>
  );
}
