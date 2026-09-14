import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Construction } from "lucide-react";

export default function AdminPlaceholder({
  title,
  description,
  icon: Icon = Construction,
  actions = [],
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  actions?: { href: string; label: string }[];
}) {
  return (
    <div className="adm-fade space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--adm-text)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--adm-sub)]">{description}</p>
      </div>

      <section className="adm-card flex flex-col items-center px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--adm-tint)] text-[var(--adm-primary-soft)]">
          <Icon size={26} strokeWidth={1.8} />
        </span>
        <p className="mt-4 text-sm font-semibold text-[var(--adm-text)]">This module is on the roadmap</p>
        <p className="mt-1 max-w-md text-sm text-[var(--adm-sub)]">
          The storefront already collects the data this page will manage — the dedicated management UI ships next.
        </p>
        {actions.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {actions.map((a) => (
              <Link key={a.href} href={a.href} className="adm-btn adm-btn-ghost">
                {a.label}
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
