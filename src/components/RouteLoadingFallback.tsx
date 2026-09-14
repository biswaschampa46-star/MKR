import PremiumLoader, { LOADER_STATUS } from "@/components/PremiumLoader";

/**
 * App Router fallback shown during real server navigation/data waits.
 * Reuses the exact premium brand animation (compact variant) — no new design.
 */
export default function RouteLoadingFallback({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
      style={{
        minHeight: "52vh",
        display: "grid",
        placeItems: "center",
        padding: "3rem 1rem",
      }}
    >
      <PremiumLoader progress={62} status={label ?? LOADER_STATUS[1]} leaving={false} compact />
    </div>
  );
}
