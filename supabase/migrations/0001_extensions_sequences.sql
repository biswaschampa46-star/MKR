-- ═══════════════════════════════════════════════════════════════
-- 0001 — Extensions & sequences
-- Extracted VERBATIM from the live Supabase project on 2026-09-23T19:20:24.552Z
-- via scripts/extract-sql.mjs (read-only pg_get_* definitions).
-- These are the REAL production bodies — not reconstructions.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto"; -- v1.3

create sequence if not exists "order_number_seq" as bigint start 1001 increment 1;
create sequence if not exists "realtime_events_id_seq" as bigint start 1 increment 1;
