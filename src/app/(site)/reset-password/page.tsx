import type { Metadata } from "next";
import Link from "next/link";
import { Alert, GlassCard, Logo } from "@/components/ui";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
      <div className="text-center">
        <Logo showTagline className="items-center" />
        <p className="meta-label mt-6">Account recovery</p>
        <h1 className="display-1 mt-3 text-[#f4faff]">Choose a new password</h1>
      </div>
      <GlassCard className="p-6">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Alert tone="error">
            This reset link is incomplete. <Link href="/forgot-password" className="underline">Request a new one</Link>.
          </Alert>
        )}
      </GlassCard>
    </div>
  );
}
