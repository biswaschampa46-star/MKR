-- ═══════════════════════════════════════════════════════════════════════
--  Orders Realtime Broadcast — Admin live order system
--  Run in Supabase Dashboard → SQL Editor → New query. Idempotent (safe to re-run).
--
--  Whenever a row is INSERTed / UPDATEd / DELETEd on public.orders, this
--  trigger broadcasts a lightweight { op, id } event on the Realtime
--  channel "admin:orders" (event "orders_changed").
--
--  The payload intentionally contains ONLY the operation and the row id —
--  no customer PII. Admin browsers receive the event and then fetch the
--  actual order data through admin-session-guarded API routes, so no RLS
--  policy is bypassed and no service-role key ever reaches the browser.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.orders_realtime_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'op', tg_op,
      'id', coalesce(new.id, old.id)
    ),
    'orders_changed',      -- event name
    'admin:orders',        -- channel topic
    false                  -- public channel (payload has no PII; data access stays behind the admin API)
  );
  return null;
end;
$$;

drop trigger if exists orders_realtime_notify on public.orders;

create trigger orders_realtime_notify
  after insert or update or delete on public.orders
  for each row execute function public.orders_realtime_notify();

-- ─────────────────────────  VERIFY  ─────────────────────────
-- 1. Trigger exists:
--    select tgname from pg_trigger where tgrelid = 'public.orders'::regclass and not tgisinternal;
-- 2. End-to-end smoke test (SQL Editor):
--    begin; select realtime.send('{"op":"INSERT","id":"00000000-0000-0000-0000-000000000000"}'::jsonb, 'orders_changed', 'admin:orders', false); rollback;
--    → any open admin tab should toast / refetch within ~1s (the fake id 404s, so no row is added).
