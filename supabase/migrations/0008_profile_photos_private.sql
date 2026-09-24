-- ═══════════════════════════════════════════════════════════════
-- 0008 — Profile photos: PUBLIC → PRIVATE (Phase 2 security fix)
--
-- The audit/0005 extraction showed `profile-photos` was created PUBLIC with
-- a blanket `profile_photos_public_read` SELECT policy. Profile photos are
-- personal data: they are no longer anonymously readable.
--
-- Serving model after this migration:
--   • The app resolves avatar URLs to /api/media/{id} (see mediaSelection
--     and the avatarUrl queries in lib/data + lib/auth).
--   • That route redirects to a short-lived Supabase SIGNED URL (1 hour),
--     created with the service-role key. No public listing, no public read.
--   • Owner self-service (authenticated user reading/writing their own
--     folder) is preserved through the existing owner policies.
-- ═══════════════════════════════════════════════════════════════

-- 1) Flip the bucket to private.
update storage.buckets
   set public = false
 where id = 'profile-photos'
   and public = true;

-- 2) Remove the blanket anonymous read policy.
drop policy if exists "profile_photos_public_read" on storage."objects";

-- 3) Owner policies (write/update/delete own folder) were already created in
--    0005 and remain in force — they scope every operation to
--    (storage.foldername(name))[1] = auth.uid()::text, i.e. the owner's own
--    customer-id folder. A SELECT-for-owner policy is added so an
--    authenticated user can also read back their own object directly.
drop policy if exists "profile_photos_owner_read" on storage."objects";
create policy "profile_photos_owner_read" on storage."objects" for select
  to "authenticated"
  using ((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text));
