-- ═══════════════════════════════════════════════════════════════
-- 0007 — Production hardening
--   1. rate_limits: shared table for cross-instance rate limiting
--   2. profile-photos bucket: private (was public) — signed URLs only
--   3. admin_audit_log: audit trail for sensitive admin actions
-- Applied to the live project on 2026-09-24 after the app-side
-- signed-URL proxy was in place (see /api/media/[id]/signed).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Rate limiting (Phase 4) ──
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);
alter table public.rate_limits enable row level security;
-- App connects as postgres (bypasses RLS); deny all client access like other internal tables.
drop policy if exists "rate_limits_no_client_access" on public.rate_limits;
create policy "rate_limits_no_client_access" on public.rate_limits for all to "anon", "authenticated"
  using (false)
  with check (false);

-- ── 2. Profile photos become private (Phase 2) ──
update storage.buckets set public = false where id = 'profile-photos';
drop policy if exists "profile_photos_public_read" on storage.objects;

-- ── 3. Admin audit log (Phase 27) ──
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  target text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor, created_at desc);
create index if not exists admin_audit_log_action_idx on public.admin_audit_log (action, created_at desc);
alter table public.admin_audit_log enable row level security;
drop policy if exists "admin_audit_log_no_client_access" on public.admin_audit_log;
create policy "admin_audit_log_no_client_access" on public.admin_audit_log for all to "anon", "authenticated"
  using (false)
  with check (false);
