import { ProductGridSkeleton } from "@/components/ui";

export default function WishlistLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <ProductGridSkeleton count={4} />
    </div>
  );
}
