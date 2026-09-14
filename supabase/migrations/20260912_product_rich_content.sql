-- Product rich content (admin → storefront sync)
-- Idempotent: safe to run multiple times.
-- All columns are additive with defaults, so existing product rows stay valid.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS warranty text NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS return_policy text NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_info text NOT NULL DEFAULT '';
