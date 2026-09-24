"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { cancelOrderAction } from "@/app/actions/order-cancel";

/* Customer order cancellation (Phase 13): inline confirmation flow.
   Shown only for cancellable orders; type-to-confirm guards against
   accidental taps without a modal. */
export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(cancelOrderAction, undefined);
  const [open, setOpen] = useState(false);

  if (state?.ok) {
    return <Alert tone="success">{state.message}</Alert>;
  }

  return (
    <div className="space-y-3">
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      {open ? (
        <form action={formAction} className="mkr-panel glass space-y-3 rounded-2xl p-4">
          <input type="hidden" name="orderId" value={orderId} />
          <Field label="Type CANCEL to confirm" hint="This cannot be undone">
            <Input name="confirm" placeholder="CANCEL" autoComplete="off" required />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              {pending ? "Cancelling…" : "Confirm cancellation"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Keep my order
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)} aria-expanded={open}>
          Cancel this order
        </Button>
      )}
    </div>
  );
}
