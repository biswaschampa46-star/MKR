-- ═══════════════════════════════════════════════════════════════
-- 0005 — Storage buckets & policies (verbatim)
-- Extracted VERBATIM from the live Supabase project on 2026-09-23T19:20:26.870Z
-- via scripts/extract-sql.mjs (read-only pg_get_* definitions).
-- These are the REAL production bodies — not reconstructions.
-- ═══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('All in one', 'All in one', true, null, null)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, null, null)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, null, null)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, null, null)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects.products_public_read (SELECT)
-- using: (bucket_id = 'products'::text)
drop policy if exists "products_public_read" on storage."objects";
create policy "products_public_read" on storage."objects" for select to "anon", "authenticated"
  using ((bucket_id = 'products'::text));

-- storage.objects.profile_photos_owner_delete (DELETE)
-- using: ((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
drop policy if exists "profile_photos_owner_delete" on storage."objects";
create policy "profile_photos_owner_delete" on storage."objects" for delete
  using (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- storage.objects.profile_photos_owner_update (UPDATE)
-- using: ((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
-- with check: ((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
drop policy if exists "profile_photos_owner_update" on storage."objects";
create policy "profile_photos_owner_update" on storage."objects" for update
  using (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  with check (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- storage.objects.profile_photos_owner_write (INSERT)
-- with check: ((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
drop policy if exists "profile_photos_owner_write" on storage."objects";
create policy "profile_photos_owner_write" on storage."objects" for insert
  with check (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- storage.objects.profile_photos_public_read (SELECT)
-- using: (bucket_id = 'profile-photos'::text)
drop policy if exists "profile_photos_public_read" on storage."objects";
create policy "profile_photos_public_read" on storage."objects" for select
  using ((bucket_id = 'profile-photos'::text));

