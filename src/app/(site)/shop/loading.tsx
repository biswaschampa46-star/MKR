import { ProductGridSkeleton, Skeleton } from "@/components/ui";

/** Route-level loading: filter rail + product grid skeletons matching the real shop layout. */
export default function ShopLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div className="hidden space-y-4 lg:block">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
