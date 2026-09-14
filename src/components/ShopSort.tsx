"use client";

import { useRouter } from "next/navigation";
import UiSelect from "@/components/UiSelect";
import type { SortKey } from "@/lib/products";

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
];

export default function ShopSort({
  sort,
  params,
}: {
  sort: SortKey;
  params: Record<string, string>;
}) {
  const router = useRouter();

  const onChange = (value: string) => {
    const sp = new URLSearchParams(params);
    sp.set("sort", value);
    router.push(`/shop?${sp.toString()}`);
  };

  return (
    <div className="inline-flex min-w-0 max-w-full items-center gap-3">
      <span className="label shrink-0 sr-only md:not-sr-only">Sort</span>
      <div className="min-w-0 w-[min(13rem,calc(100vw-3rem))] sm:w-52 sm:max-w-none">
        <UiSelect
          value={sort}
          onChange={onChange}
          options={OPTIONS}
          placeholder="Sort"
          searchable={false}
          ariaLabel="Sort products"
          triggerClassName="ds-trigger--pill"
        />
      </div>
    </div>
  );
}
