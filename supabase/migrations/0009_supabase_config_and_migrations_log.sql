-- ═══════════════════════════════════════════════════════════════════
-- 0009 — Supabase configuration ledger + migration bookkeeping.
--
-- Why: the audit found bucket configuration, delivery fee defaults and
-- other operational values lived only in the live project with no
-- in-repo record. These tables make the configuration observable and
-- give future migration runs a local ledger, without affecting the
-- application runtime.
--
-- Idempotent: IF NOT EXISTS throughout. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

-- Key/value snapshot of operational configuration that lives in the
-- Supabase project (buckets, business defaults). Application code does
-- NOT read this table — it documents the expected live configuration
-- so drift is detectable.
create table if not exists public.supabase_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.supabase_config enable row level security;

drop policy if exists "supabase_config_no_client_access" on public.supabase_config;
create policy "supabase_config_no_client_access" on public.supabase_config
  for all to "anon", "authenticated"
  using (false)
  with check (false);

-- Local ledger of applied migration files (name + timestamp). The
-- extract scripts stamp rows here so a fresh environment can see which
-- migrations have been pushed to the live project.
create table if not exists public.migrations_applied (
  filename   text primary key,
  applied_at timestamptz not null default now()
);

alter table public.migrations_applied enable row level security;

drop policy if exists "migrations_applied_no_client_access" on public.migrations_applied;
create policy "migrations_applied_no_client_access" on public.migrations_applied
  for all to "anon", "authenticated"
  using (false)
  with check (false);

-- Seed the expected configuration snapshot (only if not already set).
insert into public.supabase_config (key, value)
values
  ('buckets', '["uploads","profile-photos","mkr-marketing-videos","mkr-documents"]'::jsonb),
  ('delivery_fee_chattogram_prepaid_taka', '70'::jsonb),
  ('delivery_fee_outside_chattogram_prepaid_taka', '130'::jsonb)
on conflict (key) do nothing;
