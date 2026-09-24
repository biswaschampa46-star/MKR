"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Inline pending state for server-action forms: disables itself and shows a
 * spinner + label while its parent form is submitting (no double submits).
 * Client-only because of useFormStatus — import from this file, not the
 * server-safe "@/components/ui" barrel.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant = "outline",
  size = "sm",
  ...props
}: Omit<ComponentProps<"button">, "ref"> & {
  pendingLabel?: string;
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} className={className} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
