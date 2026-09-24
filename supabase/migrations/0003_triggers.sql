-- ═══════════════════════════════════════════════════════════════
-- 0003 — Triggers (verbatim)
-- Extracted VERBATIM from the live Supabase project on 2026-09-23T19:20:25.700Z
-- via scripts/extract-sql.mjs (read-only pg_get_* definitions).
-- These are the REAL production bodies — not reconstructions.
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trg_single_default_address BEFORE INSERT OR UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION enforce_single_default_address();

CREATE TRIGGER trg_sync_variant_stock AFTER INSERT OR DELETE OR UPDATE OF stock ON public.product_variants FOR EACH ROW EXECUTE FUNCTION trg_sync_variant_stock_fn();

CREATE TRIGGER trg_touch_about_sections BEFORE UPDATE ON public.about_sections FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_addresses BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_analytics_daily BEFORE UPDATE ON public.analytics_daily FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_cart_items BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_carts BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_coupons BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_customers BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_hero_slides BEFORE UPDATE ON public.hero_slides FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_product_variants BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_reviews BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_settings BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

