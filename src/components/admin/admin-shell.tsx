import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { adminLogoutAction } from "@/app/actions/admin-auth";

export function AdminShell({ children, email }: { children: ReactNode; email: string | null }) {
  return (
    <div className="mx-auto grid w-full max-w-[110rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
      <AdminNav email={email} />
      <div className="min-w-0 space-y-6">
        <header className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#8ccbff]">MKR admin</p>
            <p className="text-sm text-[#ddf3ff]">Supabase-first operations console</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-[#8ccbff] hover:underline">View store</Link>
            <form action={adminLogoutAction}>
              <button type="submit" className="rounded-full border border-[#a8c0d5]/25 px-4 py-2 text-xs text-[#ddf3ff] transition hover:border-[#8ccbff]">
                Sign out
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
