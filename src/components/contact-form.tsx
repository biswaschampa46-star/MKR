"use client";

import { useState } from "react";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

export function ContactForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, setState] = useState<{ pending: boolean; message: string | null; error: string | null }>({
    pending: false,
    message: null,
    error: null,
  });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setState({ pending: true, message: null, error: null });
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          subject: String(formData.get("subject") ?? ""),
          message: String(formData.get("message") ?? ""),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; error?: string };
      if (!payload.ok) throw new Error(payload.error ?? "Could not send your message.");
      setState({ pending: false, message: payload.message ?? "Message sent.", error: null });
      form.reset();
    } catch (cause) {
      setState({ pending: false, message: null, error: cause instanceof Error ? cause.message : "Could not send your message." });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <Input name="name" required placeholder="Ayesha Rahman" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required defaultValue={defaultEmail} placeholder="you@email.com" />
        </Field>
        <Field label="Phone" hint="optional">
          <Input name="phone" placeholder="01712345678" />
        </Field>
        <Field label="Subject" hint="optional">
          <Input name="subject" placeholder="Order enquiry" />
        </Field>
      </div>
      <Field label="Message">
        <Textarea name="message" rows={5} required minLength={10} placeholder="How can the MKR team help?" />
      </Field>
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Button type="submit" disabled={state.pending}>
        {state.pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
