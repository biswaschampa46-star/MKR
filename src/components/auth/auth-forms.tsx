"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { loginAction, registerAction, forgotPasswordAction, resetPasswordAction } from "@/app/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" error={state?.ok === false ? state.fieldErrors?.email?.[0] : undefined}>
        <Input name="email" type="email" required autoComplete="email" placeholder="you@email.com" />
      </Field>
      <Field label="Password" error={state?.ok === false ? state.fieldErrors?.password?.[0] : undefined}>
        <Input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
      </Field>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#a8c0d5]">
        <Link href="/forgot-password" className="hover:text-[#f4faff]">Forgot password?</Link>
        <Link href="/register" className="hover:text-[#f4faff]">Create an account</Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Full name" error={state?.ok === false ? state.fieldErrors?.fullName?.[0] : undefined}>
        <Input name="fullName" required autoComplete="name" placeholder="Ayesha Rahman" />
      </Field>
      <Field label="Email" error={state?.ok === false ? state.fieldErrors?.email?.[0] : undefined}>
        <Input name="email" type="email" required autoComplete="email" placeholder="you@email.com" />
      </Field>
      <Field label="Phone" hint="optional" error={state?.ok === false ? state.fieldErrors?.phone?.[0] : undefined}>
        <Input name="phone" placeholder="01712345678" autoComplete="tel" />
      </Field>
      <Field label="Password" hint="min 8 characters" error={state?.ok === false ? state.fieldErrors?.password?.[0] : undefined}>
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-xs text-[#a8c0d5]">
        Already with us? <Link href="/login" className="text-[#8ccbff]">Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" placeholder="you@email.com" />
      </Field>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      {state && state.ok ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" hint="min 8 characters" error={state?.ok === false ? state.fieldErrors?.password?.[0] : undefined}>
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Reset password"}
      </Button>
    </form>
  );
}

export function GoogleButton({ next = "/profile" }: { next?: string }) {
  return (
    <a
      href={`/api/auth/google?next=${encodeURIComponent(next)}`}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-[#a8c0d5]/30 px-5 py-3 text-sm text-[#f4faff] transition hover:border-[#8ccbff] hover:bg-[#8ccbff]/10"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f4faff] text-[11px] font-bold text-[#071a2b]">G</span>
      Continue with Google
    </a>
  );
}
