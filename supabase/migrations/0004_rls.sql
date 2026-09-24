-- ═══════════════════════════════════════════════════════════════
-- 0004 — Row Level Security (verbatim)
-- Extracted VERBATIM from the live Supabase project on 2026-09-23T19:20:26.466Z
-- via scripts/extract-sql.mjs (read-only pg_get_* definitions).
-- These are the REAL production bodies — not reconstructions.
-- ═══════════════════════════════════════════════════════════════

alter table public."about_sections" enable row level security;
alter table public."addresses" enable row level security;
alter table public."ai_generations" enable row level security;
alter table public."analytics_daily" enable row level security;
alter table public."auth_tokens" enable row level security;
alter table public."cart_items" enable row level security;
alter table public."carts" enable row level security;
alter table public."categories" enable row level security;
alter table public."contact_messages" enable row level security;
alter table public."coupon_redemptions" enable row level security;
alter table public."coupons" enable row level security;
alter table public."customers" enable row level security;
alter table public."hero_slides" enable row level security;
alter table public."inventory_movements" enable row level security;
alter table public."media_assets" enable row level security;
alter table public."notifications" enable row level security;
alter table public."order_events" enable row level security;
alter table public."order_items" enable row level security;
alter table public."orders" enable row level security;
alter table public."product_images" enable row level security;
alter table public."product_variants" enable row level security;
alter table public."products" enable row level security;
alter table public."realtime_events" enable row level security;
alter table public."reviews" enable row level security;
alter table public."search_queries" enable row level security;
alter table public."sessions" enable row level security;
alter table public."settings" enable row level security;
alter table public."subscribers" enable row level security;
alter table public."wishlist_items" enable row level security;

-- about_sections.about_sections_public_read (SELECT, PERMISSIVE, roles: anon,authenticated)
-- using: true
drop policy if exists "about_sections_public_read" on public."about_sections";
create policy "about_sections_public_read" on public."about_sections" for select to "anon", "authenticated"
  using (true);

-- addresses.addresses_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "addresses_no_client_access" on public."addresses";
create policy "addresses_no_client_access" on public."addresses" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- ai_generations.ai_generations_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "ai_generations_no_client_access" on public."ai_generations";
create policy "ai_generations_no_client_access" on public."ai_generations" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- analytics_daily.analytics_daily_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "analytics_daily_no_client_access" on public."analytics_daily";
create policy "analytics_daily_no_client_access" on public."analytics_daily" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- auth_tokens.auth_tokens_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "auth_tokens_no_client_access" on public."auth_tokens";
create policy "auth_tokens_no_client_access" on public."auth_tokens" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- cart_items.cart_items_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "cart_items_no_client_access" on public."cart_items";
create policy "cart_items_no_client_access" on public."cart_items" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- carts.carts_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "carts_no_client_access" on public."carts";
create policy "carts_no_client_access" on public."carts" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- categories.categories_public_read (SELECT, PERMISSIVE, roles: anon,authenticated)
-- using: true
drop policy if exists "categories_public_read" on public."categories";
create policy "categories_public_read" on public."categories" for select to "anon", "authenticated"
  using (true);

-- contact_messages.contact_messages_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "contact_messages_no_client_access" on public."contact_messages";
create policy "contact_messages_no_client_access" on public."contact_messages" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- coupon_redemptions.coupon_redemptions_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "coupon_redemptions_no_client_access" on public."coupon_redemptions";
create policy "coupon_redemptions_no_client_access" on public."coupon_redemptions" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- coupons.coupons_public_read (SELECT, PERMISSIVE, roles: anon,authenticated)
-- using: true
drop policy if exists "coupons_public_read" on public."coupons";
create policy "coupons_public_read" on public."coupons" for select to "anon", "authenticated"
  using (true);

-- customers.customers_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "customers_no_client_access" on public."customers";
create policy "customers_no_client_access" on public."customers" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- hero_slides.hero_slides_public_read (SELECT, PERMISSIVE, roles: anon,authenticated)
-- using: true
drop policy if exists "hero_slides_public_read" on public."hero_slides";
create policy "hero_slides_public_read" on public."hero_slides" for select to "anon", "authenticated"
  using (true);

-- inventory_movements.inventory_movements_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "inventory_movements_no_client_access" on public."inventory_movements";
create policy "inventory_movements_no_client_access" on public."inventory_movements" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- media_assets.media_assets_public_read (SELECT, PERMISSIVE, roles: anon,authenticated)
-- using: true
drop policy if exists "media_assets_public_read" on public."media_assets";
create policy "media_assets_public_read" on public."media_assets" for select to "anon", "authenticated"
  using (true);

-- notifications.notifications_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "notifications_no_client_access" on public."notifications";
create policy "notifications_no_client_access" on public."notifications" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- order_events.order_events_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "order_events_no_client_access" on public."order_events";
create policy "order_events_no_client_access" on public."order_events" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- order_items.order_items_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "order_items_no_client_access" on public."order_items";
create policy "order_items_no_client_access" on public."order_items" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- orders.orders_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "orders_no_client_access" on public."orders";
create policy "orders_no_client_access" on public."orders" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- product_images.product_images_public_read (SELECT, PERMISSIVE, roles: anon,authenticated)
-- using: true
drop policy if exists "product_images_public_read" on public."product_images";
create policy "product_images_public_read" on public."product_images" for select to "anon", "authenticated"
  using (true);

-- product_variants.product_variants_public_read (SELECT, PERMISSIVE, roles: anon,authenticated)
-- using: true
drop policy if exists "product_variants_public_read" on public."product_variants";
create policy "product_variants_public_read" on public."product_variants" for select to "anon", "authenticated"
  using (true);

-- products.products_public_read (SELECT, PERMISSIVE, roles: anon,authenticated)
-- using: true
drop policy if exists "products_public_read" on public."products";
create policy "products_public_read" on public."products" for select to "anon", "authenticated"
  using (true);

-- realtime_events.realtime_events_public_read (SELECT, PERMISSIVE, roles: anon,authenticated)
-- using: true
drop policy if exists "realtime_events_public_read" on public."realtime_events";
create policy "realtime_events_public_read" on public."realtime_events" for select to "anon", "authenticated"
  using (true);

-- reviews.reviews_public_read (SELECT, PERMISSIVE, roles: anon,authenticated)
-- using: true
drop policy if exists "reviews_public_read" on public."reviews";
create policy "reviews_public_read" on public."reviews" for select to "anon", "authenticated"
  using (true);

-- search_queries.search_queries_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "search_queries_no_client_access" on public."search_queries";
create policy "search_queries_no_client_access" on public."search_queries" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- sessions.sessions_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "sessions_no_client_access" on public."sessions";
create policy "sessions_no_client_access" on public."sessions" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- settings.settings_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "settings_no_client_access" on public."settings";
create policy "settings_no_client_access" on public."settings" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- subscribers.subscribers_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "subscribers_no_client_access" on public."subscribers";
create policy "subscribers_no_client_access" on public."subscribers" for all to "anon", "authenticated"
  using (false)
  with check (false);

-- wishlist_items.wishlist_items_no_client_access (ALL, PERMISSIVE, roles: anon,authenticated)
-- using: false
-- with check: false
drop policy if exists "wishlist_items_no_client_access" on public."wishlist_items";
create policy "wishlist_items_no_client_access" on public."wishlist_items" for all to "anon", "authenticated"
  using (false)
  with check (false);

