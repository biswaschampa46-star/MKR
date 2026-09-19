-- 2026-09-19 — Size-recommendation toggle.
-- The `size_recommendation_enabled` column is read by the product detail page
-- (`Product.sizeRecommendationEnabled`) but was never added by the earlier
-- clothing-system migration, so production SELECT * queries fail until this runs.
-- Idempotent: safe to run multiple times.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS size_recommendation_enabled boolean NOT NULL DEFAULT false;
