import { Badge, SectionHeading } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteMessageAction, setMessageStatusAction } from "@/app/actions/admin-community";
import { listMessages } from "@/lib/data/content";
import { formatDateTime } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await listMessages();

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Inbox" title="Customer messages" description="Contact form submissions with realtime alerts on the dashboard." />
      <div className="space-y-3">
        {messages.length === 0 ? (
          <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <article key={message.id} className="glass space-y-2 rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-base text-[#f4faff]">{message.name} · {message.email}</p>
                  <p className="text-xs text-[#a8c0d5]">{message.phone ?? "no phone"} · {formatDateTime(message.createdAt)}</p>
                </div>
                <Badge tone={message.status === "new" ? "info" : message.status === "archived" ? "default" : "success"}>{message.status}</Badge>
              </div>
              {message.subject ? <p className="text-sm text-[#f4faff]">{message.subject}</p> : null}
              <p className="whitespace-pre-line text-sm text-[#a8c0d5]">{message.message}</p>
              <div className="flex flex-wrap gap-2">
                {(["new", "read", "archived"] as const).map((status) => (
                  <form key={status} action={setMessageStatusAction}>
                    <input type="hidden" name="id" value={message.id} />
                    <input type="hidden" name="status" value={status} />
                    <SubmitButton key={status} pendingLabel="…" className="px-3 py-1.5 text-xs">Mark {status}</SubmitButton>
                  </form>
                ))}
                <form action={deleteMessageAction}>
                  <input type="hidden" name="id" value={message.id} />
                  <SubmitButton pendingLabel="Deleting…" variant="danger" className="px-3 py-1.5 text-xs">Delete</SubmitButton>
                </form>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
