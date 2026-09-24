import { SectionHeading } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteSubscriberAction } from "@/app/actions/admin-community";
import { listSubscribers } from "@/lib/data/content";
import { formatDateTime } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  const subscribers = await listSubscribers();

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Marketing" title="Subscribers" description="Email list captured from the footer and profile opt-in — stored in PostgreSQL." />
      <div className="glass divide-y divide-[#a8c0d5]/12 rounded-3xl">
        {subscribers.length === 0 ? (
          <p className="p-6 text-sm text-[#a8c0d5]">No subscribers yet.</p>
        ) : (
          subscribers.map((subscriber) => (
            <div key={subscriber.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <span className="text-[#f4faff]">{subscriber.email}</span>
              <span className="text-xs text-[#a8c0d5]">{subscriber.source} · {subscriber.status} · {formatDateTime(subscriber.createdAt)}</span>
              <form action={deleteSubscriberAction}>
                <input type="hidden" name="id" value={subscriber.id} />
                <SubmitButton pendingLabel="Removing…" variant="danger" className="px-3 py-1.5 text-xs">Remove</SubmitButton>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
