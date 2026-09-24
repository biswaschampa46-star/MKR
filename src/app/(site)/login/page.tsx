import type { Metadata } from "next";
import { Alert, GlassCard, Logo } from "@/components/ui";
import { GoogleButton, LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; reset?: string }> }) {
  const params = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
      <div className="text-center">
        <Logo showTagline className="items-center" />
        <p className="meta-label mt-6">Welcome back</p>
        <h1 className="display-1 mt-3 text-[#f4faff]">Sign in</h1>
        <p className="mt-3 text-sm text-[#a8c0d5]">Your orders, addresses and wishlist — where you left them.</p>
      </div>

      {params.reset ? <Alert tone="success">Password updated. Sign in with your new password.</Alert> : null}
      {params.error ? <Alert tone="error">{params.error}</Alert> : null}

      <GlassCard className="space-y-5 p-6">
        <LoginForm next={params.next} />
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-[#a8c0d5]/70">
          <span className="h-px flex-1 bg-[#a8c0d5]/20" /> or <span className="h-px flex-1 bg-[#a8c0d5]/20" />
        </div>
        <GoogleButton next={params.next} />
      </GlassCard>

      <p className="text-center text-xs text-[#a8c0d5]">
        Sessions use secure httpOnly cookies (Supabase Auth when configured) — never browser storage.
      </p>
    </div>
  );
}
