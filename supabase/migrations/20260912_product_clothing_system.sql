-- 2026-09-12 — Clothing product management upgrade.
-- Safe, additive-only migration: every new column has a default so all
-- existing product rows remain valid and the storefront keeps working.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku varchar(64) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS barcode varchar(64) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand varchar(80) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category varchar(60) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subcategory varchar(60) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS collection varchar(80) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS product_type varchar(60) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS short_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cost_price integer,
  ADD COLUMN IF NOT EXISTS tax_pct integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency varchar(8) NOT NULL DEFAULT 'BDT',
  ADD COLUMN IF NOT EXISTS gender varchar(12) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS clothing_type varchar(40) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fabric varchar(40) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fabric_weight varchar(30) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fit varchar(20) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pattern varchar(20) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS season varchar(20) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country_of_origin varchar(60) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variant_inventory jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_best_seller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status varchar(12) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS visibility varchar(12) NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_backorders boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS weight_grams integer,
  ADD COLUMN IF NOT EXISTS package_weight_grams integer,
  ADD COLUMN IF NOT EXISTS length_cm integer,
  ADD COLUMN IF NOT EXISTS width_cm integer,
  ADD COLUMN IF NOT EXISTS height_cm integer,
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shipping_class varchar(30) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_title varchar(160) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_keywords varchar(300) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS canonical_url varchar(300) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_image varchar(300) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS products_status_idx ON products (status);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_brand_idx ON products (brand);