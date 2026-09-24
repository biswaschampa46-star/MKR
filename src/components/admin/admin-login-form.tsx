"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { adminBootstrapAction, adminLoginAction } from "@/app/actions/admin-auth";

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(adminLoginAction, undefined);
  const [bootstrapState, bootstrapAction, bootstrapping] = useActionState(adminBootstrapAction, undefined);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <Field label="Admin email">
          <Input name="email" type="email" required autoComplete="username" placeholder="admin@mkr.example" />
        </Field>
        <Field label="Admin password">
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending || !configured}>
          {pending ? "Verifying…" : configured ? "Sign in to admin" : "Admin credentials not configured"}
        </Button>
      </form>

      {!configured ? (
        <form action={bootstrapAction} className="space-y-4 border-t border-[#a8c0d5]/15 pt-6">
          <Alert tone="warn">
            ADMIN_EMAIL / ADMIN_PASSWORD are not set on this deployment. You can create the first admin credential here
            once — it is stored as a bcrypt hash in the settings table and this form disables itself afterwards.
          </Alert>
          <Field label="Admin email">
            <Input name="email" type="email" required />
          </Field>
          <Field label="Admin password" hint="min 8 characters">
            <Input name="password" type="password" required minLength={8} />
          </Field>
          {bootstrapState && !bootstrapState.ok ? <Alert tone="error">{bootstrapState.error}</Alert> : null}
          <Button type="submit" variant="outline" className="w-full" disabled={bootstrapping}>
            {bootstrapping ? "Creating…" : "Create admin credential"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
