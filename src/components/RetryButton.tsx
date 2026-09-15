"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCcw } from "lucide-react";

/**
 * Re-runs the server components for the current URL without a full page
 * reload. Used by the data-error state so a transient database failure can
 * be retried in place.
 */
export default function RetryButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="btn btn-line disabled:opacity-50"
    >
      <RotateCcw
        className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
        strokeWidth={1.5}
      />
      {pending ? "Retrying…" : label}
    </button>
  );
}
