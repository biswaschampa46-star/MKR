"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { Select } from "@/components/ui/select";
import {
  changePasswordAction,
  saveAddressAction,
  updateProfileAction,
  uploadAvatarAction,
} from "@/app/actions/profile";

export function ProfileSettingsForm({
  fullName,
  phone,
  marketingOptIn,
}: {
  fullName: string;
  phone: string;
  marketingOptIn: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="fullName" defaultValue={fullName} required minLength={2} />
        </Field>
        <Field label="Phone" hint="used for delivery calls">
          <Input name="phone" defaultValue={phone} placeholder="01712345678" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
        <input type="checkbox" name="marketingOptIn" defaultChecked={marketingOptIn} className="h-4 w-4" />
        Email me about new drops and private sales
      </label>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      {state && state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}

export function AvatarUploadForm() {
  const [state, formAction, pending] = useActionState(uploadAvatarAction, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Profile photo" hint="JPG/PNG/WEBP up to 4 MB">
        <input
          type="file"
          name="avatar"
          accept="image/*"
          required
          className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm text-[#ddf3ff] file:mr-3 file:rounded-full file:border-0 file:bg-[#8ccbff]/20 file:px-3 file:py-1.5 file:text-[#ddf3ff]"
        />
      </Field>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      {state && state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Uploading…" : "Upload photo"}</Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password">
          <Input name="currentPassword" type="password" required autoComplete="current-password" />
        </Field>
        <Field label="New password" hint="min 8 characters">
          <Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
      </div>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      {state && state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Updating…" : "Change password"}</Button>
    </form>
  );
}

export function AddressForm({ districts }: { districts: { name: string }[] }) {
  const [state, formAction, pending] = useActionState(saveAddressAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label" hint="optional">
          <Input name="label" placeholder="Home / Office" />
        </Field>
        <Field label="Recipient name">
          <Input name="fullName" required />
        </Field>
        <Field label="Phone">
          <Input name="phone" required placeholder="01712345678" />
        </Field>
        <Field label="District">
          <Select name="district" defaultValue="Chattogram">
            {districts.map((district) => (
              <option key={district.name} value={district.name}>{district.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Area / Thana" hint="optional">
          <Input name="area" />
        </Field>
        <Field label="Postal code" hint="optional">
          <Input name="postalCode" />
        </Field>
      </div>
      <Field label="Full address">
        <Textarea name="addressLine" rows={3} required minLength={6} />
      </Field>
      <Field label="Delivery notes" hint="optional">
        <Textarea name="notes" rows={2} />
      </Field>
      <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
        <input type="checkbox" name="isDefault" className="h-4 w-4" /> Make this my default delivery address
      </label>
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      {state && state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save address"}</Button>
    </form>
  );
}
