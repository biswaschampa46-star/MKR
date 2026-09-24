import Link from "next/link";
import { Logo } from "@/components/ui";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { getContactSettings } from "@/lib/data/content";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/shop?sort=newest", label: "New arrivals" },
      { href: "/shop?onSale=1", label: "On sale" },
      { href: "/track", label: "Track order" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/register", label: "Create account" },
      { href: "/profile/orders", label: "My orders" },
      { href: "/profile/wishlist", label: "Wishlist" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About MKR" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ],
  },
];

export async function SiteFooter() {
  const contact = await getContactSettings();

  return (
    <footer className="mt-[clamp(4.5rem,9vw,8.5rem)] border-t border-[#a8c0d5]/12 bg-[#050b14]">
      {/* Giant editorial wordmark */}
      <div className="overflow-hidden border-b border-[#a8c0d5]/10" data-reveal suppressHydrationWarning>
        <p
          aria-hidden
          className="display-hero wordmark select-none px-[var(--gutter)] pt-[clamp(2rem,5vw,3.5rem)] leading-[0.9] text-[#122c44]"
        >
          MKR
        </p>
      </div>

      <div
        className="mx-auto grid w-full max-w-[88rem] gap-12 px-[var(--gutter)] py-[clamp(2.5rem,5vw,4rem)] lg:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]"
        data-reveal
        suppressHydrationWarning
      >
        <div className="space-y-5">
          <Logo showTagline />
          <p className="max-w-sm text-sm leading-relaxed text-[#a8c0d5]">
            Premium minimal clothing for everyday presence. Designed in Bangladesh, delivered nationwide.
          </p>
          <NewsletterForm />
        </div>

        {columns.map((column) => (
          <div key={column.title} className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8ccbff]">{column.title}</h3>
            <ul className="space-y-2 text-sm text-[#a8c0d5]">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block transition-transform duration-300 hover:translate-x-1 hover:text-[#f4faff]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[#a8c0d5]/10">
        {/* sm:pr-28 reserves the bottom-right corner for the floating contact
            dock so it can never sit on top of the footer contact line. */}
        <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-3 px-[var(--gutter)] py-6 text-xs text-[#a8c0d5]/70 sm:flex-row sm:items-center sm:justify-between sm:pr-28">
          <p>© {new Date().getFullYear()} MKR — Casual Threads &amp; Style. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            {contact.phone ? <span>{contact.phone}</span> : null}
            {contact.email ? <span>{contact.email}</span> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
