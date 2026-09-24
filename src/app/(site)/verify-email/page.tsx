import type { Metadata } from "next";
import Link from "next/link";
import { Alert, GlassCard, LinkButton, Logo } from "@/components/ui";
import { verifyEmailAction } from "@/app/actions/auth";
import { emailConfigured } from "@/lib/email";
import type { ActionResult } from "@/types";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; pending?: string }>;
}) {
  const { token, pending } = await searchParams;

  // A token in the URL is consumed immediately, server-side, one-time (Phase 6).
  // No pending state keeps the token in UI memory beyond this request.
  const result: ActionResult | null = token ? await verifyEmailAction(token) : null;
  const awaitingEmail = !token && pending === "1";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
      <div className="text-center">
        <Logo showTagline className="items-center" />
        <p className="meta-label mt-6">Verify</p>
        <h1 className="display-1 mt-3 text-[#f4faff]">Email verification</h1>
      </div>
      <GlassCard className="space-y-4 p-6">
        {result ? (
          result.ok ? (
            <Alert tone="success">{result.message}</Alert>
          ) : (
            <Alert tone="error">{result.error}</Alert>
          )
        ) : null}
        {awaitingEmail ? (
          <Alert tone="info">
            We sent a verification link to your email address. Open it from your inbox to confirm your account. The
            link expires in 24 hours.
          </Alert>
        ) : null}
        {!emailConfigured() && !result?.ok ? (
          <p className="text-xs text-[#a8c0d5]">
            Outbound email is not configured on this deployment yet. Contact support to verify your address, or ask the
            store to enable an email provider.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/profile" size="sm">Go to profile</LinkButton>
          <Link href="/shop" className="text-sm text-[#8ccbff]">Continue shopping</Link>
        </div>
      </GlassCard>
    </div>
  );
}
