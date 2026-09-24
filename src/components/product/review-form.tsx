"use client";

import { useActionState } from "react";
import { submitReviewAction } from "@/app/actions/profile";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

export function ReviewForm({ productId, authenticated }: { productId: string; authenticated: boolean }) {
  const [state, formAction, pending] = useActionState(submitReviewAction, undefined);

  if (!authenticated) {
    return (
      <Alert tone="info">
        Sign in to write a review — reviews are moderated before they appear on the storefront.
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <Field label="Rating">
          <Input name="rating" type="number" min={1} max={5} defaultValue={5} required />
        </Field>
        <Field label="Headline" hint="optional">
          <Input name="title" placeholder="Premium feel, true to size" maxLength={120} />
        </Field>
      </div>
      <Field label="Your review">
        <Textarea name="body" rows={4} required minLength={10} placeholder="Fabric, fit, delivery experience…" />
      </Field>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      {state && state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
