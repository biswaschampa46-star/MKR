import { Skeleton } from "@/components/ui";

export default function CheckoutLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {[0, 1, 2].map((section) => (
            <div key={section} className="surface space-y-4 rounded-[24px] p-[clamp(1.25rem,3vw,1.75rem)]">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
        <div className="surface h-max space-y-4 rounded-[24px] p-[clamp(1.25rem,3vw,2rem)]">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
