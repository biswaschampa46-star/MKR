import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl items-center px-4 py-16">
      <EmptyState
        title="This page could not be found"
        description="The link may be out of date, or the product has been archived. Everything else is still here."
        action={<LinkButton href="/shop">Back to the shop</LinkButton>}
      />
    </div>
  );
}
