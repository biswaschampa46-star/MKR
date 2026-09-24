import { ProductDetailSkeleton } from "@/components/ui";

export default function ProductLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <ProductDetailSkeleton />
    </div>
  );
}
