"use client";

import { usePathname } from "next/navigation";

/**
 * Renders its children only on storefront routes. Admin pages bring their own
 * chrome (AdminShell), so Nav/Footer/cart/search/AI must not mount there.
 */
export default function StorefrontChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}
