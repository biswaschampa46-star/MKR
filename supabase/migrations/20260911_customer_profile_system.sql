-- ═══════════════════════════════════════════════════════════════════════
--  Customer Profile System — MKR Atelier
--  Run this entire file in Supabase Dashboard → SQL Editor → New query.
--  Safe to re-run: everything is idempotent (IF NOT EXISTS / ON CONFLICT).
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────── 1. TABLES ─────────────────────────

create table if not exists public.customer_profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users (id) on delete cascade,
  full_name          varchar(120) not null default '',
  email              varchar(160) not null default '',
  phone              varchar(24) not null default '',
  profile_photo      text not null default '',
  date_of_birth      date,
  gender             varchar(16),
  account_status     varchar(20) not null default 'active',
  notification_prefs jsonb not null default '{"orderUpdates":true,"promotions":true,"email":true}',
  profile_visibility varchar(16) not null default 'private',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  last_login_at      timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  full_name   varchar(120) not null,
  phone       varchar(24) not null,
  division    varchar(60) not null default '',
  district    varchar(60) not null default '',
  upazila     varchar(60) not null default '',
  address     text not null,
  postal_code varchar(12) not null default '',
  label       varchar(12) not null default 'home',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.customer_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      varchar(160) not null,
  message    text not null default '',
  type       varchar(24) not null default 'general',
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── 2. LINK COLUMNS ─────────────────────────

alter table public.orders
  add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.product_reviews
  add column if not exists user_id uuid references auth.users (id) on delete set null;

-- ───────────────────────── 3. INDEXES ─────────────────────────

create index if not exists customer_profiles_user_idx      on public.customer_profiles (user_id);
create index if not exists customer_addresses_user_idx     on public.customer_addresses (user_id);
create index if not exists customer_addresses_default_idx  on public.customer_addresses (user_id, is_default);
create index if not exists wishlists_user_idx              on public.wishlists (user_id);
create index if not exists wishlists_product_idx           on public.wishlists (product_id);
create index if not exists wishlists_created_idx           on public.wishlists (created_at desc);
create index if not exists customer_notifications_user_idx on public.customer_notifications (user_id, created_at desc);
create index if not exists orders_user_idx                 on public.orders (user_id);
create index if not exists product_reviews_user_idx        on public.product_reviews (user_id);
-- ───────────────────────── 4. ROW LEVEL SECURITY ─────────────────────────
-- Every customer-owned row is fenced by user_id = auth.uid().
-- Frontend filtering alone is never trusted; the database enforces it.

alter table public.customer_profiles      enable row level security;
alter table public.customer_addresses     enable row level security;
alter table public.wishlists              enable row level security;
alter table public.customer_notifications enable row level security;

drop policy if exists customer_profiles_owner on public.customer_profiles;
create policy customer_profiles_owner on public.customer_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists customer_addresses_owner on public.customer_addresses;
create policy customer_addresses_owner on public.customer_addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists wishlists_owner on public.wishlists;
create policy wishlists_owner on public.wishlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists customer_notifications_owner on public.customer_notifications;
create policy customer_notifications_owner on public.customer_notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Orders: customers get read-only access to their own rows.
-- They must NOT mutate status / payment / totals — admin API uses the
-- service-role key and bypasses RLS, so admin flows keep working.
alter table public.orders enable row level security;

drop policy if exists orders_customer_select on public.orders;
create policy orders_customer_select on public.orders
  for select using (auth.uid() = user_id);

-- Reviews: anyone may read approved reviews; inserts stay open because the
-- app writes via the server API (service-role, bypassing RLS), which links
-- signed-in reviews with a token-verified user_id. Direct browser inserts
-- can only ever claim the caller's own id (never someone else's).
alter table public.product_reviews enable row level security;

drop policy if exists product_reviews_public_read on public.product_reviews;
create policy product_reviews_public_read on public.product_reviews
  for select using (approved = true or auth.uid() = user_id);

drop policy if exists product_reviews_owner_write on public.product_reviews;
create policy product_reviews_owner_write on public.product_reviews
  for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists product_reviews_owner_update on public.product_reviews;
create policy product_reviews_owner_update on public.product_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists product_reviews_owner_delete on public.product_reviews;
create policy product_reviews_owner_delete on public.product_reviews
  for delete using (auth.uid() = user_id);

-- ───────────────────────── 5. AUTO-PROFILE + ORDER NOTIFY ─────────────────────────

create or replace function public.ensure_customer_profile()
returns public.customer_profiles
language plpgsql
security definer
set search_path = public
as $func$
declare
  me    auth.users%rowtype;
  prof  public.customer_profiles%rowtype;
  mname text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into me from auth.users where id = auth.uid();
  mname := coalesce(
    nullif(me.raw_user_meta_data ->> 'full_name', ''),
    nullif(me.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(me.email, ''), '@', 1),
    'Customer'
  );

  insert into public.customer_profiles (user_id, full_name, email, last_login_at)
  values (auth.uid(), mname, coalesce(me.email, ''), now())
  on conflict (user_id) do update
    set last_login_at = now(),
        updated_at    = now(),
        email         = excluded.email;

  select * into prof from public.customer_profiles where user_id = auth.uid();
  return prof;
end;
$func$;

grant execute on function public.ensure_customer_profile() to authenticated;

create or replace function public.notify_customer_on_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  title text;
  body  text;
begin
  if new.user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    title := 'Order placed — ' || new.order_number;
    body  := 'We received your order of ৳' || new.total || '. We will confirm payment shortly.';
  elsif old.status is distinct from new.status then
    title := case new.status
      when 'payment_verified' then 'Payment confirmed — ' || new.order_number
      when 'confirmed'   then 'Order confirmed — ' || new.order_number
      when 'processing'  then 'Order is being prepared — ' || new.order_number
      when 'shipped'     then 'Order shipped — ' || new.order_number
      when 'delivered'   then 'Order delivered — ' || new.order_number
      when 'cancelled'   then 'Order cancelled — ' || new.order_number
      else 'Order update — ' || new.order_number
    end;
    body := 'Status: ' || replace(new.status::text, '_', ' ') || '. Total ৳' || new.total || '.';
  else
    return new;
  end if;

  insert into public.customer_notifications (user_id, title, message, type)
  values (new.user_id, title, body,
    case when new.status = 'cancelled' then 'cancelled'
         when new.status = 'delivered' then 'delivered'
         when new.status = 'shipped'   then 'shipped'
         else 'order' end);
  return new;
end;
$func$;

drop trigger if exists orders_customer_notify on public.orders;
create trigger orders_customer_notify
  after insert or update of status on public.orders
  for each row execute function public.notify_customer_on_order();

-- Only one default address per customer at a time.
create or replace function public.keep_single_default_address()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if new.is_default then
    update public.customer_addresses
      set is_default = false, updated_at = now()
      where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$func$;

drop trigger if exists customer_addresses_single_default on public.customer_addresses;
create trigger customer_addresses_single_default
  before insert or update of is_default on public.customer_addresses
  for each row execute function public.keep_single_default_address();

-- ───────────────────────── 6. STORAGE: profile-photos ─────────────────────────
-- Create the bucket in Dashboard → Storage → New bucket → name
-- "profile-photos", Public ON. Then run the four policies below.

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

drop policy if exists profile_photos_public_read on storage.objects;
create policy profile_photos_public_read on storage.objects
  for select using (bucket_id = 'profile-photos');

drop policy if exists profile_photos_owner_write on storage.objects;
create policy profile_photos_owner_write on storage.objects
  for insert with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_photos_owner_update on storage.objects;
create policy profile_photos_owner_update on storage.objects
  for update using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_photos_owner_delete on storage.objects;
create policy profile_photos_owner_delete on storage.objects
  for delete using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );