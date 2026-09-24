"use client";

import { useEffect } from "react";
import { Button, ErrorState } from "@/components/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface real failures instead of silently rendering an empty page.
    console.error("[MKR] render error:", error.message);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl items-center px-4 py-16">
      <div className="w-full space-y-4">
        {/* Phase 22: never render raw error messages (may contain SQL/internal detail). */}
        <ErrorState
          title="Something went wrong"
          description="An unexpected error occurred while rendering this page. Retry, or head back to the store."
          detail={error.digest ? `Reference: ${error.digest}` : undefined}
        />
        <div className="flex justify-center">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
