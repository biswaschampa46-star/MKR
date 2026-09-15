-- ============================================================
-- MKR — Dynamic Promotional Banner & Flash Sale system
-- Additive migration. Creates promo_campaigns only.
-- No existing tables are touched. Safe to re-run (IF NOT EXISTS).
-- ============================================================

create table if not exists promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_name varchar(120) not null,
  label varchar(60) not null default '',
  heading varchar(120) not null default '',
  description varchar(300) not null default '',
  campaign_type varchar(20) not null default 'custom',
  discount_kind varchar(12) not null default 'none',
  discount_value integer not null default 0,
  coupon_code varchar(40) not null default '',
  cta_text varchar(60) not null default '',
  cta_url varchar(300) not null default '',
  -- design
  bg_mode varchar(10) not null default 'solid',
  bg_color varchar(9) not null default '#0b263d',
  bg_color2 varchar(9) not null default '#4da8ff',
  text_color varchar(9) not null default '#f4faff',
  accent_color varchar(9) not null default '#8ccbff',
  button_color varchar(9) not null default '#ddf3ff',
  button_text_color varchar(9) not null default '#06131f',
  radius integer not null default 20,
  height varchar(8) not null default 'md',
  layout varchar(10) not null default 'center',
  align varchar(6) not null default 'left',
  gradient_enabled boolean not null default true,
  animation_enabled boolean not null default true,
  image_url varchar(300) not null default '',
  mobile_image_url varchar(300) not null default '',
  -- targeting / schedule / ordering
  placement varchar(20) not null default 'below_hero',
  target_type varchar(12) not null default 'all',
  target_id varchar(200) not null default '',
  start_at timestamptz,
  end_at timestamptz,
  priority integer not null default 5,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promo_campaigns_active_idx
  on promo_campaigns (is_enabled, placement, priority, sort_order);
create index if not exists promo_campaigns_window_idx
  on promo_campaigns (start_at, end_at);

-- ============================================================
-- RLS: the site talks to Postgres with the server's own
-- DATABASE_URL (service-level connection, never exposed to the
-- browser), so public reads happen through server components only.
-- Enable RLS and deny anon/authenticated access outright; admin
-- writes go through session-guarded server routes.
-- ============================================================

alter table promo_campaigns enable row level security;

-- No policies are created for anon/authenticated on purpose: the
-- public anon key, if it ever reaches a browser, can neither read
-- nor write this table. Server code connects with DATABASE_URL and
-- bypasses RLS (owner role), as with every other table in this app.
