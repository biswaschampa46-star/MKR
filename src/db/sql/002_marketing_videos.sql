-- ============================================================================
-- MKR — 002: marketing videos (homepage brand-film advertisements)
-- Idempotent. Safe to re-run against Supabase (or plain) PostgreSQL.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.marketing_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_bucket text not null default 'mkr-marketing-videos',
  video_path text not null,
  video_url text not null,
  video_mime text not null default 'video/mp4',
  video_size_bytes integer not null default 0,
  poster_bucket text,
  poster_path text,
  poster_url text,
  cta_text text,
  cta_url text,
  overlay_position text not null default 'left',
  autoplay boolean not null default true,
  muted boolean not null default true,
  loop boolean not null default true,
  show_controls boolean not null default false,
  is_active boolean not null default true,
  is_published boolean not null default false,
  display_order integer not null default 0,
  uploaded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_videos_order_idx
  on public.marketing_videos (display_order asc, created_at desc);

-- ------------------------------- RLS ---------------------------------------
-- Public visitors may only read published + active rows. Every write goes
-- through server-side admin-session-validated actions (service role / table
-- owner bypasses RLS), so no public INSERT/UPDATE/DELETE policy exists.
alter table public.marketing_videos enable row level security;

drop policy if exists "marketing_videos_public_read" on public.marketing_videos;
create policy "marketing_videos_public_read"
  on public.marketing_videos
  for select
  to anon, authenticated
  using (is_published and is_active);

-- --------------------------- updated_at trigger ----------------------------
drop trigger if exists trg_touch_marketing_videos on public.marketing_videos;
create trigger trg_touch_marketing_videos
  before update on public.marketing_videos
  for each row execute function public.touch_updated_at();
