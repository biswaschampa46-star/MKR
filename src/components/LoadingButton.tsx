"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Central button loader — one style for every submit/action.
 * Shows a spinner, locks the button, sets aria-busy and blocks duplicates.
 * Visual design unchanged (uses existing .btn classes).
 */
export default function LoadingButton({
  loading,
  children,
  loadingLabel,
  ...props
}: {
  loading: boolean;
  children: ReactNode;
  loadingLabel?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={props.disabled ?? loading}
      aria-busy={loading}
      aria-live="polite"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
