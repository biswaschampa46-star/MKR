"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { attachExistingMediaAction } from "@/app/actions/admin-settings";
import { uploadProductImageAction } from "@/app/actions/admin-products";

export function ProductMediaForms({
  productId,
  existingMedia,
}: {
  productId: string;
  existingMedia: { id: string; role: string; storagePath: string }[];
}) {
  const [uploadState, uploadAction, uploading] = useActionState(uploadProductImageAction, undefined);
  const [attachState, attachAction, attaching] = useActionState(attachExistingMediaAction, undefined);

  return (
    <div className="space-y-6">
      <form action={uploadAction} className="space-y-4">
        <input type="hidden" name="productId" value={productId} />
        <Field label="Role">
          <Select name="role" defaultValue="gallery">
            {["main", "gallery", "variant", "size_chart", "promo"].map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Alt text" hint="accessibility + SEO">
          <Input name="altText" placeholder="Front view on model" />
        </Field>
        <Field label="File" hint="JPG/PNG/WEBP/AVIF up to 8 MB · MP4/WEBM up to 60 MB">
          <input
            type="file"
            name="file"
            required
            accept="image/*,video/*"
            className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm text-[#ddf3ff] file:mr-3 file:rounded-full file:border-0 file:bg-[#8ccbff]/20 file:px-3 file:py-1.5"
          />
        </Field>
        {uploadState && !uploadState.ok ? <Alert tone="error">{uploadState.error}</Alert> : null}
        {uploadState && uploadState.ok ? <Alert tone="success">{uploadState.message}</Alert> : null}
        <Button type="submit" variant="outline" disabled={uploading}>
          {uploading ? "Uploading…" : "Upload to storage"}
        </Button>
      </form>

      <form action={attachAction} className="space-y-4 border-t border-[#a8c0d5]/15 pt-6">
        <input type="hidden" name="productId" value={productId} />
        <Field label="Attach an existing asset">
          <Select name="mediaId" defaultValue="">
            <option value="">— choose from media library —</option>
            {existingMedia.slice(0, 80).map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.role} · {asset.storagePath.slice(0, 60)}
              </option>
            ))}
          </Select>
        </Field>
        {attachState && !attachState.ok ? <Alert tone="error">{attachState.error}</Alert> : null}
        {attachState && attachState.ok ? <Alert tone="success">{attachState.message}</Alert> : null}
        <Button type="submit" variant="ghost" disabled={attaching}>
          {attaching ? "Attaching…" : "Attach asset"}
        </Button>
      </form>
    </div>
  );
}
