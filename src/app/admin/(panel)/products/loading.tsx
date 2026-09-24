import { ListRowSkeleton } from "@/components/ui";

export default function AdminProductsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <ListRowSkeleton rows={6} />
    </div>
  );
}
