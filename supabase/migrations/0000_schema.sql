-- ═══════════════════════════════════════════════════════════════
-- 0000 — Schema: enums, tables, columns, constraints, indexes
-- Reconstructed verbatim from the live database's pg_catalog on
-- 2026-09-23T19:21:43.152Z via scripts/extract-schema.mjs (read-only).
-- ═══════════════════════════════════════════════════════════════

do $$ begin
  if not exists (select 1 from pg_type where typname = 'auth_provider' and typnamespace = 'public'::regnamespace) then
    create type public."auth_provider" as enum ('email', 'google');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'cart_status' and typnamespace = 'public'::regnamespace) then
    create type public."cart_status" as enum ('open', 'converted', 'abandoned');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'coupon_type' and typnamespace = 'public'::regnamespace) then
    create type public."coupon_type" as enum ('percentage', 'fixed');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'customer_status' and typnamespace = 'public'::regnamespace) then
    create type public."customer_status" as enum ('active', 'blocked');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'media_kind' and typnamespace = 'public'::regnamespace) then
    create type public."media_kind" as enum ('image', 'video', 'document');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'media_role' and typnamespace = 'public'::regnamespace) then
    create type public."media_role" as enum ('main', 'gallery', 'variant', 'size_chart', 'promo', 'hero', 'about', 'banner', 'avatar');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'message_status' and typnamespace = 'public'::regnamespace) then
    create type public."message_status" as enum ('new', 'read', 'archived');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'order_status' and typnamespace = 'public'::regnamespace) then
    create type public."order_status" as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_method' and typnamespace = 'public'::regnamespace) then
    create type public."payment_method" as enum ('cod', 'bkash', 'nagad', 'rocket');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_purpose' and typnamespace = 'public'::regnamespace) then
    create type public."payment_purpose" as enum ('delivery_prepaid', 'full_prepaid');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_status' and typnamespace = 'public'::regnamespace) then
    create type public."payment_status" as enum ('unpaid', 'awaiting_verification', 'verified', 'failed', 'refunded');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'product_status' and typnamespace = 'public'::regnamespace) then
    create type public."product_status" as enum ('draft', 'active', 'archived');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'product_visibility' and typnamespace = 'public'::regnamespace) then
    create type public."product_visibility" as enum ('public', 'hidden');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'review_status' and typnamespace = 'public'::regnamespace) then
    create type public."review_status" as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table if not exists public."about_sections" (
  "id" uuid not null default gen_random_uuid(),
  "section" text not null default 'story'::text,
  "heading" text not null,
  "body" text,
  "media_id" uuid,
  "sort_order" integer not null default 0,
  "is_active" boolean not null default true,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."about_sections" add constraint "about_sections_media_id_media_assets_id_fk" foreign key (media_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table public."about_sections" add constraint "about_sections_pkey" primary key (id);


create table if not exists public."addresses" (
  "id" uuid not null default gen_random_uuid(),
  "customer_id" uuid not null,
  "label" text,
  "full_name" text not null,
  "phone" text not null,
  "address_line" text not null,
  "district" text not null,
  "area" text,
  "postal_code" text,
  "notes" text,
  "is_default" boolean not null default false,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."addresses" add constraint "addresses_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
alter table public."addresses" add constraint "addresses_pkey" primary key (id);

CREATE INDEX addresses_customer_idx ON public.addresses USING btree (customer_id);
CREATE UNIQUE INDEX addresses_one_default_key ON public.addresses USING btree (customer_id) WHERE (is_default = true);

create table if not exists public."ai_generations" (
  "id" uuid not null default gen_random_uuid(),
  "kind" text not null,
  "model" text not null,
  "prompt" text not null,
  "result" text,
  "customer_id" uuid,
  "created_by" text,
  "created_at" timestamp with time zone not null default now()
);

alter table public."ai_generations" add constraint "ai_generations_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
alter table public."ai_generations" add constraint "ai_generations_pkey" primary key (id);

CREATE INDEX ai_generations_kind_idx ON public.ai_generations USING btree (kind, created_at);

create table if not exists public."analytics_daily" (
  "day" date not null,
  "orders_count" integer not null default 0,
  "revenue" integer not null default 0,
  "visitors" integer not null default 0,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."analytics_daily" add constraint "analytics_daily_pkey" primary key (day);

CREATE INDEX analytics_daily_created_idx ON public.analytics_daily USING btree (created_at);

create table if not exists public."auth_tokens" (
  "id" uuid not null default gen_random_uuid(),
  "customer_id" uuid not null,
  "kind" text not null,
  "token_hash" text not null,
  "expires_at" timestamp with time zone not null,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now()
);

alter table public."auth_tokens" add constraint "auth_tokens_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
alter table public."auth_tokens" add constraint "auth_tokens_pkey" primary key (id);

CREATE INDEX auth_tokens_customer_idx ON public.auth_tokens USING btree (customer_id);
CREATE UNIQUE INDEX auth_tokens_hash_key ON public.auth_tokens USING btree (token_hash);

create table if not exists public."cart_items" (
  "id" uuid not null default gen_random_uuid(),
  "cart_id" uuid not null,
  "product_id" uuid not null,
  "variant_id" uuid,
  "quantity" integer not null default 1,
  "price_snapshot" integer not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."cart_items" add constraint "cart_items_cart_id_carts_id_fk" foreign key (cart_id) REFERENCES carts(id) ON DELETE CASCADE;
alter table public."cart_items" add constraint "cart_items_product_id_products_id_fk" foreign key (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public."cart_items" add constraint "cart_items_variant_id_product_variants_id_fk" foreign key (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
alter table public."cart_items" add constraint "cart_items_pkey" primary key (id);

CREATE INDEX cart_items_cart_idx ON public.cart_items USING btree (cart_id);
CREATE UNIQUE INDEX cart_items_unique ON public.cart_items USING btree (cart_id, product_id, variant_id);

create table if not exists public."carts" (
  "id" uuid not null default gen_random_uuid(),
  "customer_id" uuid,
  "anon_token_hash" text,
  "status" cart_status not null default 'open'::cart_status,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."carts" add constraint "carts_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
alter table public."carts" add constraint "carts_pkey" primary key (id);

CREATE UNIQUE INDEX carts_anon_token_key ON public.carts USING btree (anon_token_hash);
CREATE INDEX carts_customer_idx ON public.carts USING btree (customer_id);

create table if not exists public."categories" (
  "id" uuid not null default gen_random_uuid(),
  "slug" text not null,
  "name" text not null,
  "description" text,
  "image_media_id" uuid,
  "parent_id" uuid,
  "sort_order" integer not null default 0,
  "is_active" boolean not null default true,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."categories" add constraint "categories_pkey" primary key (id);

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);
CREATE INDEX categories_sort_idx ON public.categories USING btree (sort_order);

create table if not exists public."contact_messages" (
  "id" uuid not null default gen_random_uuid(),
  "name" text not null,
  "email" text not null,
  "phone" text,
  "subject" text,
  "message" text not null,
  "status" message_status not null default 'new'::message_status,
  "customer_id" uuid,
  "created_at" timestamp with time zone not null default now()
);

alter table public."contact_messages" add constraint "contact_messages_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
alter table public."contact_messages" add constraint "contact_messages_pkey" primary key (id);

CREATE INDEX contact_messages_status_idx ON public.contact_messages USING btree (status, created_at);

create table if not exists public."coupon_redemptions" (
  "id" uuid not null default gen_random_uuid(),
  "coupon_id" uuid not null,
  "customer_id" uuid,
  "order_id" uuid,
  "email" text,
  "amount" integer not null,
  "created_at" timestamp with time zone not null default now()
);

alter table public."coupon_redemptions" add constraint "coupon_redemptions_coupon_id_coupons_id_fk" foreign key (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE;
alter table public."coupon_redemptions" add constraint "coupon_redemptions_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
alter table public."coupon_redemptions" add constraint "coupon_redemptions_pkey" primary key (id);

CREATE INDEX coupon_redemptions_coupon_idx ON public.coupon_redemptions USING btree (coupon_id);

create table if not exists public."coupons" (
  "id" uuid not null default gen_random_uuid(),
  "code" text not null,
  "description" text,
  "discount_type" coupon_type not null default 'percentage'::coupon_type,
  "discount_value" integer not null,
  "max_discount_amount" integer,
  "min_order_amount" integer not null default 0,
  "starts_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "usage_limit" integer,
  "per_user_limit" integer not null default 1,
  "used_count" integer not null default 0,
  "is_active" boolean not null default true,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."coupons" add constraint "coupons_pkey" primary key (id);

CREATE UNIQUE INDEX coupons_code_key ON public.coupons USING btree (code);

create table if not exists public."customers" (
  "id" uuid not null default gen_random_uuid(),
  "auth_user_id" text,
  "provider" auth_provider not null default 'email'::auth_provider,
  "email" text not null,
  "password_hash" text,
  "full_name" text,
  "phone" text,
  "avatar_media_id" uuid,
  "email_verified_at" timestamp with time zone,
  "status" customer_status not null default 'active'::customer_status,
  "preferences" jsonb,
  "marketing_opt_in" boolean not null default false,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."customers" add constraint "customers_avatar_media_id_media_assets_id_fk" foreign key (avatar_media_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table public."customers" add constraint "customers_pkey" primary key (id);

CREATE UNIQUE INDEX customers_auth_user_key ON public.customers USING btree (auth_user_id);
CREATE UNIQUE INDEX customers_email_key ON public.customers USING btree (email);

create table if not exists public."hero_slides" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "media_type" text not null default 'image'::text,
  "eyebrow" text,
  "heading" text not null,
  "subheading" text,
  "cta_label" text,
  "cta_href" text,
  "sort_order" integer not null default 0,
  "is_active" boolean not null default true,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."hero_slides" add constraint "hero_slides_media_id_media_assets_id_fk" foreign key (media_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table public."hero_slides" add constraint "hero_slides_pkey" primary key (id);


create table if not exists public."inventory_movements" (
  "id" uuid not null default gen_random_uuid(),
  "product_id" uuid,
  "variant_id" uuid,
  "delta" integer not null,
  "stock_after" integer not null,
  "reason" text not null,
  "order_id" uuid,
  "actor" text not null default 'system'::text,
  "created_at" timestamp with time zone not null default now()
);

alter table public."inventory_movements" add constraint "inventory_movements_order_id_orders_id_fk" foreign key (order_id) REFERENCES orders(id) ON DELETE SET NULL;
alter table public."inventory_movements" add constraint "inventory_movements_product_id_products_id_fk" foreign key (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public."inventory_movements" add constraint "inventory_movements_variant_id_product_variants_id_fk" foreign key (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
alter table public."inventory_movements" add constraint "inventory_movements_pkey" primary key (id);

CREATE INDEX inventory_movements_variant_idx ON public.inventory_movements USING btree (variant_id);

create table if not exists public."media_assets" (
  "id" uuid not null default gen_random_uuid(),
  "kind" media_kind not null default 'image'::media_kind,
  "role" media_role not null default 'gallery'::media_role,
  "storage_provider" text not null default 'supabase'::text,
  "bucket" text not null,
  "storage_path" text not null,
  "public_url" text,
  "alt_text" text,
  "mime_type" text not null,
  "size_bytes" integer not null,
  "width" integer,
  "height" integer,
  "duration_seconds" integer,
  "sort_order" integer not null default 0,
  "metadata" jsonb,
  "bytes" bytea,
  "uploaded_by" text,
  "created_at" timestamp with time zone not null default now()
);

alter table public."media_assets" add constraint "media_assets_pkey" primary key (id);

CREATE UNIQUE INDEX media_assets_bucket_path_key ON public.media_assets USING btree (bucket, storage_path);
CREATE INDEX media_assets_role_idx ON public.media_assets USING btree (role, sort_order);

create table if not exists public."notifications" (
  "id" uuid not null default gen_random_uuid(),
  "customer_id" uuid,
  "audience" text not null default 'customer'::text,
  "kind" text not null default 'info'::text,
  "title" text not null,
  "body" text,
  "link" text,
  "is_read" boolean not null default false,
  "created_at" timestamp with time zone not null default now()
);

alter table public."notifications" add constraint "notifications_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
alter table public."notifications" add constraint "notifications_pkey" primary key (id);

CREATE INDEX notifications_customer_idx ON public.notifications USING btree (customer_id, created_at);

create table if not exists public."order_events" (
  "id" uuid not null default gen_random_uuid(),
  "order_id" uuid not null,
  "status" text not null,
  "message" text,
  "actor" text not null default 'system'::text,
  "created_at" timestamp with time zone not null default now()
);

alter table public."order_events" add constraint "order_events_order_id_orders_id_fk" foreign key (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table public."order_events" add constraint "order_events_pkey" primary key (id);

CREATE INDEX order_events_order_idx ON public.order_events USING btree (order_id);

create table if not exists public."order_items" (
  "id" uuid not null default gen_random_uuid(),
  "order_id" uuid not null,
  "product_id" uuid,
  "variant_id" uuid,
  "product_name" text not null,
  "product_slug" text,
  "sku" text,
  "size" text,
  "color" text,
  "image_url" text,
  "quantity" integer not null,
  "unit_price" integer not null,
  "line_total" integer not null,
  "created_at" timestamp with time zone not null default now()
);

alter table public."order_items" add constraint "order_items_order_id_orders_id_fk" foreign key (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table public."order_items" add constraint "order_items_product_id_products_id_fk" foreign key (product_id) REFERENCES products(id) ON DELETE SET NULL;
alter table public."order_items" add constraint "order_items_variant_id_product_variants_id_fk" foreign key (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
alter table public."order_items" add constraint "order_items_pkey" primary key (id);

CREATE INDEX order_items_order_idx ON public.order_items USING btree (order_id);

create table if not exists public."orders" (
  "id" uuid not null default gen_random_uuid(),
  "order_number" text not null,
  "customer_id" uuid,
  "access_token_hash" text,
  "email" text not null,
  "customer_name" text not null,
  "phone" text not null,
  "shipping_address" jsonb not null,
  "subtotal" integer not null,
  "discount_total" integer not null default 0,
  "delivery_fee" integer not null default 0,
  "total" integer not null,
  "coupon_code" text,
  "payment_method" payment_method not null default 'cod'::payment_method,
  "payment_purpose" payment_purpose not null default 'delivery_prepaid'::payment_purpose,
  "payment_status" payment_status not null default 'unpaid'::payment_status,
  "sender_number" text,
  "transaction_id" text,
  "delivery_zone" text not null,
  "status" order_status not null default 'pending'::order_status,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."orders" add constraint "orders_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
alter table public."orders" add constraint "orders_pkey" primary key (id);

CREATE INDEX orders_created_idx ON public.orders USING btree (created_at);
CREATE INDEX orders_customer_idx ON public.orders USING btree (customer_id, created_at);
CREATE UNIQUE INDEX orders_number_key ON public.orders USING btree (order_number);
CREATE INDEX orders_status_idx ON public.orders USING btree (status);

create table if not exists public."product_images" (
  "id" uuid not null default gen_random_uuid(),
  "product_id" uuid not null,
  "media_id" uuid not null,
  "variant_id" uuid,
  "role" media_role not null default 'gallery'::media_role,
  "alt_text" text,
  "sort_order" integer not null default 0,
  "created_at" timestamp with time zone not null default now()
);

alter table public."product_images" add constraint "product_images_media_id_media_assets_id_fk" foreign key (media_id) REFERENCES media_assets(id) ON DELETE CASCADE;
alter table public."product_images" add constraint "product_images_product_id_products_id_fk" foreign key (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public."product_images" add constraint "product_images_variant_id_product_variants_id_fk" foreign key (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
alter table public."product_images" add constraint "product_images_pkey" primary key (id);

CREATE INDEX product_images_product_idx ON public.product_images USING btree (product_id, sort_order);
CREATE UNIQUE INDEX product_images_unique ON public.product_images USING btree (product_id, media_id, role);

create table if not exists public."product_variants" (
  "id" uuid not null default gen_random_uuid(),
  "product_id" uuid not null,
  "sku" text not null,
  "size" text,
  "color" text,
  "color_hex" text,
  "price" integer,
  "stock" integer not null default 0,
  "image_media_id" uuid,
  "is_active" boolean not null default true,
  "sort_order" integer not null default 0,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."product_variants" add constraint "product_variants_image_media_id_media_assets_id_fk" foreign key (image_media_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table public."product_variants" add constraint "product_variants_product_id_products_id_fk" foreign key (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public."product_variants" add constraint "product_variants_pkey" primary key (id);

CREATE UNIQUE INDEX product_variants_combo_key ON public.product_variants USING btree (product_id, size, color);
CREATE INDEX product_variants_product_idx ON public.product_variants USING btree (product_id);
CREATE UNIQUE INDEX product_variants_sku_key ON public.product_variants USING btree (sku);

create table if not exists public."products" (
  "id" uuid not null default gen_random_uuid(),
  "slug" text not null,
  "name" text not null,
  "brand" text not null default 'MKR'::text,
  "category_id" uuid,
  "subcategory" text,
  "short_description" text,
  "description" text,
  "rich_content" text,
  "price" integer not null,
  "compare_price" integer,
  "discount_percent" integer not null default 0,
  "sku" text not null,
  "status" product_status not null default 'draft'::product_status,
  "visibility" product_visibility not null default 'public'::product_visibility,
  "stock" integer not null default 0,
  "low_stock_threshold" integer not null default 3,
  "material" text,
  "fabric" text,
  "fit" text,
  "gender" text,
  "sizes" text[],
  "colors" text[],
  "tags" text[],
  "size_chart" jsonb,
  "care_instructions" text,
  "shipping_information" text,
  "seo_title" text,
  "seo_description" text,
  "keywords" text[],
  "is_featured" boolean not null default false,
  "created_by" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."products" add constraint "products_category_id_categories_id_fk" foreign key (category_id) REFERENCES categories(id) ON DELETE SET NULL;
alter table public."products" add constraint "products_pkey" primary key (id);

CREATE INDEX products_category_idx ON public.products USING btree (category_id);
CREATE INDEX products_created_idx ON public.products USING btree (created_at);
CREATE INDEX products_price_idx ON public.products USING btree (price);
CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku);
CREATE UNIQUE INDEX products_slug_key ON public.products USING btree (slug);
CREATE INDEX products_status_idx ON public.products USING btree (status, visibility);

create table if not exists public."realtime_events" (
  "id" bigint not null default nextval('realtime_events_id_seq'::regclass),
  "channel" text not null,
  "event" text not null,
  "payload" jsonb,
  "created_at" timestamp with time zone not null default now()
);

alter table public."realtime_events" add constraint "realtime_events_pkey" primary key (id);

CREATE INDEX realtime_events_channel_idx ON public.realtime_events USING btree (channel, id);

create table if not exists public."reviews" (
  "id" uuid not null default gen_random_uuid(),
  "product_id" uuid not null,
  "customer_id" uuid not null,
  "order_id" uuid,
  "rating" integer not null,
  "title" text,
  "body" text not null,
  "status" review_status not null default 'pending'::review_status,
  "moderation_note" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table public."reviews" add constraint "reviews_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
alter table public."reviews" add constraint "reviews_order_id_orders_id_fk" foreign key (order_id) REFERENCES orders(id) ON DELETE SET NULL;
alter table public."reviews" add constraint "reviews_product_id_products_id_fk" foreign key (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public."reviews" add constraint "reviews_pkey" primary key (id);

CREATE UNIQUE INDEX reviews_product_customer_key ON public.reviews USING btree (product_id, customer_id);
CREATE INDEX reviews_status_idx ON public.reviews USING btree (status, created_at);

create table if not exists public."search_queries" (
  "id" uuid not null default gen_random_uuid(),
  "customer_id" uuid,
  "query" text not null,
  "result_count" integer not null default 0,
  "created_at" timestamp with time zone not null default now()
);

alter table public."search_queries" add constraint "search_queries_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
alter table public."search_queries" add constraint "search_queries_pkey" primary key (id);

CREATE INDEX search_queries_customer_idx ON public.search_queries USING btree (customer_id, created_at);

create table if not exists public."sessions" (
  "id" uuid not null default gen_random_uuid(),
  "customer_id" uuid not null,
  "token_hash" text not null,
  "user_agent" text,
  "ip_hash" text,
  "expires_at" timestamp with time zone not null,
  "created_at" timestamp with time zone not null default now()
);

alter table public."sessions" add constraint "sessions_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
alter table public."sessions" add constraint "sessions_pkey" primary key (id);

CREATE INDEX sessions_customer_idx ON public.sessions USING btree (customer_id);
CREATE UNIQUE INDEX sessions_token_key ON public.sessions USING btree (token_hash);

create table if not exists public."settings" (
  "key" text not null,
  "value" jsonb not null,
  "description" text,
  "updated_at" timestamp with time zone not null default now()
);

alter table public."settings" add constraint "settings_pkey" primary key (key);


create table if not exists public."subscribers" (
  "id" uuid not null default gen_random_uuid(),
  "email" text not null,
  "source" text not null default 'footer'::text,
  "status" text not null default 'subscribed'::text,
  "created_at" timestamp with time zone not null default now()
);

alter table public."subscribers" add constraint "subscribers_pkey" primary key (id);

CREATE UNIQUE INDEX subscribers_email_key ON public.subscribers USING btree (email);

create table if not exists public."wishlist_items" (
  "id" uuid not null default gen_random_uuid(),
  "customer_id" uuid not null,
  "product_id" uuid not null,
  "created_at" timestamp with time zone not null default now()
);

alter table public."wishlist_items" add constraint "wishlist_items_customer_id_customers_id_fk" foreign key (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
alter table public."wishlist_items" add constraint "wishlist_items_product_id_products_id_fk" foreign key (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public."wishlist_items" add constraint "wishlist_items_pkey" primary key (id);

CREATE UNIQUE INDEX wishlist_unique ON public.wishlist_items USING btree (customer_id, product_id);

