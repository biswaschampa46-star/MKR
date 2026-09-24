import { getCurrentCustomer } from "@/lib/auth/customer";
import { listCategories } from "@/lib/data/catalog";
import { getMarketingSettings } from "@/lib/data/content";
import { HeaderClient } from "@/components/layout/header-client";

export async function SiteHeader() {
  const [categories, customer, marketing] = await Promise.all([
    listCategories().catch(() => []),
    getCurrentCustomer(),
    getMarketingSettings(),
  ]);

  return (
    <HeaderClient
      categories={categories.map((category) => ({
        slug: category.slug,
        name: category.name,
        count: category.productCount,
      }))}
      customer={customer ? { fullName: customer.fullName, email: customer.email, avatarUrl: customer.avatarUrl } : null}
      announcement={marketing.showAnnouncement ? marketing.announcement : null}
      announcementHref={marketing.announcementHref}
    />
  );
}
