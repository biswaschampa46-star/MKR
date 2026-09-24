-- ═══════════════════════════════════════════════════════════════
-- 0010 — Responsive hero video: mobile media on hero_slides
-- Extends the EXISTING hero_slides table (no new table). One row now
-- carries both the desktop/tablet media (media_id, unchanged) and the
-- phone-only media (mobile_*) so admins can target each viewport.
-- ═══════════════════════════════════════════════════════════════

alter table public."hero_slides"
  add column if not exists "mobile_media_id" uuid references media_assets(id) on delete set null;
alter table public."hero_slides"
  add column if not exists "mobile_media_type" text not null default 'image'::text;
alter table public."hero_slides"
  add column if not exists "mobile_aspect_ratio" text not null default '9:16'::text;
alter table public."hero_slides"
  add column if not exists "mobile_is_active" boolean not null default true;
