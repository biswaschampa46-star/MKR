-- ═══════════════════════════════════════════════════════════════
-- 0002 — Functions (verbatim)
-- Extracted VERBATIM from the live Supabase project on 2026-09-23T19:20:25.329Z
-- via scripts/extract-sql.mjs (read-only pg_get_* definitions).
-- These are the REAL production bodies — not reconstructions.
-- ═══════════════════════════════════════════════════════════════

-- ── enforce_single_default_address (function) ──
CREATE OR REPLACE FUNCTION public.enforce_single_default_address()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.is_default then
    update public.addresses
       set is_default = false, updated_at = now()
     where customer_id = new.customer_id
       and id <> new.id
       and is_default = true;
  end if;
  return new;
end;
$function$


-- ── keep_single_default_address (function) ──
CREATE OR REPLACE FUNCTION public.keep_single_default_address()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.is_default then
    update public.customer_addresses
      set is_default = false, updated_at = now()
      where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$function$


-- ── notify_customer_on_order (function) ──
CREATE OR REPLACE FUNCTION public.notify_customer_on_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- ── orders_realtime_notify (function) ──
CREATE OR REPLACE FUNCTION public.orders_realtime_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$


-- ── place_order (function) ──
CREATE OR REPLACE FUNCTION public.place_order(p_cart_id uuid, p_customer_id uuid, p_access_token_hash text, p_email text, p_customer_name text, p_phone text, p_shipping jsonb, p_delivery_zone text, p_payment_method text, p_payment_purpose text, p_sender_number text, p_transaction_id text, p_notes text, p_coupon_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row record;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_delivery integer := 0;
  v_total integer := 0;
  v_zone jsonb;
  v_settings jsonb;
  v_coupon public.coupons;
  v_coupon_id uuid;
  v_used_by_user integer := 0;
  v_order_id uuid;
  v_order_number text;
  v_item_count integer := 0;
  v_price integer;
  v_stock integer;
  v_line_total integer;
  v_variant_active boolean;
  v_payment_status public.payment_status := 'unpaid';
begin
  if p_cart_id is null then raise exception 'CART_EMPTY'; end if;
  if not exists (select 1 from public.carts where id = p_cart_id and status = 'open') then
    raise exception 'CART_EMPTY';
  end if;
  if not exists (select 1 from public.cart_items where cart_id = p_cart_id) then
    raise exception 'CART_EMPTY';
  end if;

  if p_delivery_zone is null or length(btrim(p_delivery_zone)) = 0 then
    raise exception 'DELIVERY_ZONE_REQUIRED';
  end if;
  if p_payment_method not in ('cod','bkash','nagad','rocket') then
    raise exception 'PAYMENT_METHOD_INVALID';
  end if;
  if p_payment_purpose not in ('delivery_prepaid','full_prepaid') then
    raise exception 'PAYMENT_PURPOSE_INVALID';
  end if;
  if p_payment_method <> 'cod' then
    if p_transaction_id is null or length(btrim(p_transaction_id)) < 4 then
      raise exception 'TRANSACTION_ID_REQUIRED';
    end if;
    if p_sender_number is null or length(btrim(p_sender_number)) < 6 then
      raise exception 'SENDER_NUMBER_REQUIRED';
    end if;
  end if;
  if coalesce(btrim(p_email), '') = '' or coalesce(btrim(p_customer_name), '') = '' or coalesce(btrim(p_phone), '') = '' then
    raise exception 'CUSTOMER_INFO_REQUIRED';
  end if;

  -- lock the cart rows for the duration of the transaction
  perform 1 from public.cart_items where cart_id = p_cart_id for update;

  for v_row in
    select ci.product_id,
           ci.variant_id,
           ci.quantity,
           p.name as product_name,
           p.slug as product_slug,
           p.sku as product_sku,
           p.price as product_price,
           p.status as product_status,
           p.visibility as product_visibility,
           p.stock as product_stock
      from public.cart_items ci
      join public.products p on p.id = ci.product_id
     where ci.cart_id = p_cart_id
     order by ci.created_at
  loop
    if v_row.quantity is null or v_row.quantity < 1 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if v_row.product_status <> 'active' or v_row.product_visibility <> 'public' then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_row.product_name;
    end if;

    if v_row.variant_id is not null then
      select pv.stock, coalesce(pv.price, v_row.product_price), pv.is_active
        into v_stock, v_price, v_variant_active
        from public.product_variants pv
       where pv.id = v_row.variant_id
         for update;

      if v_stock is null then
        raise exception 'VARIANT_MISSING:%', v_row.product_name;
      end if;
      if not coalesce(v_variant_active, true) then
        raise exception 'VARIANT_INACTIVE:%', v_row.product_name;
      end if;
      if v_stock < v_row.quantity then
        raise exception 'OUT_OF_STOCK:%', v_row.product_name;
      end if;

      update public.product_variants
         set stock = stock - v_row.quantity, updated_at = now()
       where id = v_row.variant_id;

      insert into public.inventory_movements (product_id, variant_id, delta, stock_after, reason, actor)
      values (v_row.product_id, v_row.variant_id, -v_row.quantity, v_stock - v_row.quantity, 'order_placed', 'checkout');
    else
      select stock into v_stock from public.products where id = v_row.product_id for update;
      if coalesce(v_stock, 0) < v_row.quantity then
        raise exception 'OUT_OF_STOCK:%', v_row.product_name;
      end if;
      update public.products set stock = stock - v_row.quantity, updated_at = now() where id = v_row.product_id;
      insert into public.inventory_movements (product_id, variant_id, delta, stock_after, reason, actor)
      values (v_row.product_id, null, -v_row.quantity, coalesce(v_stock,0) - v_row.quantity, 'order_placed', 'checkout');
    end if;

    v_line_total := v_price * v_row.quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_item_count := v_item_count + v_row.quantity;
  end loop;

  -- delivery fee comes from settings (admin editable), never from the client
  select value into v_settings from public.settings where key = 'delivery';
  if v_settings is not null and jsonb_typeof(v_settings -> 'zones') = 'array' then
    select z into v_zone
      from jsonb_array_elements(v_settings -> 'zones') z
     where z ->> 'key' = p_delivery_zone
     limit 1;
  end if;

  if v_zone is null then
    v_delivery := case when p_delivery_zone = 'chittagong' then 70 else 130 end;
  else
    v_delivery := greatest(coalesce((v_zone ->> 'fee')::int, 0), 0);
  end if;

  if v_settings is not null
     and coalesce(v_settings ->> 'freeDeliveryThreshold', '') <> ''
     and v_subtotal >= (v_settings ->> 'freeDeliveryThreshold')::int then
    v_delivery := 0;
  end if;

  -- coupon validation
  if p_coupon_code is not null and length(btrim(p_coupon_code)) > 0 then
    select * into v_coupon from public.coupons where upper(code) = upper(btrim(p_coupon_code)) for update;
    if v_coupon.id is null then raise exception 'COUPON_INVALID'; end if;
    if not v_coupon.is_active then raise exception 'COUPON_INACTIVE'; end if;
    if v_coupon.starts_at is not null and v_coupon.starts_at > now() then raise exception 'COUPON_NOT_STARTED'; end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at < now() then raise exception 'COUPON_EXPIRED'; end if;
    if v_subtotal < v_coupon.min_order_amount then
      raise exception 'COUPON_MIN_ORDER:%', v_coupon.min_order_amount;
    end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'COUPON_LIMIT_REACHED';
    end if;

    select count(*) into v_used_by_user
      from public.coupon_redemptions
     where coupon_id = v_coupon.id
       and (
         (p_customer_id is not null and customer_id = p_customer_id)
         or (p_email is not null and lower(coalesce(email, '')) = lower(p_email))
       );

    if v_used_by_user >= coalesce(v_coupon.per_user_limit, 1) then
      raise exception 'COUPON_ALREADY_USED';
    end if;

    if v_coupon.discount_type = 'percentage' then
      v_discount := floor((v_subtotal::numeric * v_coupon.discount_value::numeric) / 100)::int;
      if v_coupon.max_discount_amount is not null then
        v_discount := least(v_discount, v_coupon.max_discount_amount);
      end if;
    else
      v_discount := v_coupon.discount_value;
    end if;

    v_discount := greatest(least(v_discount, v_subtotal), 0);
    v_coupon_id := v_coupon.id;
  end if;

  v_total := greatest(v_subtotal - v_discount + v_delivery, 0);
  if p_payment_method <> 'cod' then
    v_payment_status := 'awaiting_verification';
  end if;

  v_order_number := 'MK-' || lpad(nextval('order_number_seq')::text, 6, '0');

  insert into public.orders (
    order_number, customer_id, access_token_hash, email, customer_name, phone, shipping_address,
    subtotal, discount_total, delivery_fee, total, coupon_code, payment_method, payment_purpose,
    payment_status, sender_number, transaction_id, delivery_zone, status, notes
  ) values (
    v_order_number, p_customer_id, p_access_token_hash, lower(btrim(p_email)), btrim(p_customer_name),
    btrim(p_phone), coalesce(p_shipping, '{}'::jsonb), v_subtotal, v_discount, v_delivery, v_total,
    case when v_coupon_id is null then null else v_coupon.code end, p_payment_method::public.payment_method,
    p_payment_purpose::public.payment_purpose, v_payment_status,
    nullif(btrim(coalesce(p_sender_number, '')), ''), nullif(btrim(coalesce(p_transaction_id, '')), ''),
    p_delivery_zone, 'pending', nullif(btrim(coalesce(p_notes, '')), '')
  ) returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, product_slug, sku, size, color, image_url,
    quantity, unit_price, line_total
  )
  select v_order_id,
         ci.product_id,
         ci.variant_id,
         p.name,
         p.slug,
         coalesce(pv.sku, p.sku),
         pv.size,
         pv.color,
         (select ma.public_url
            from public.product_images pi
            join public.media_assets ma on ma.id = pi.media_id
           where pi.product_id = ci.product_id
           order by (pi.role = 'main') desc, pi.sort_order asc
           limit 1),
         ci.quantity,
         case when ci.variant_id is null then p.price else coalesce(pv.price, p.price) end,
         ci.quantity * (case when ci.variant_id is null then p.price else coalesce(pv.price, p.price) end)
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    left join public.product_variants pv on pv.id = ci.variant_id
   where ci.cart_id = p_cart_id;

  insert into public.order_events (order_id, status, message, actor)
  values (v_order_id, 'pending', 'Order placed', 'customer');

  if v_coupon_id is not null then
    update public.coupons set used_count = used_count + 1 where id = v_coupon_id;
    insert into public.coupon_redemptions (coupon_id, customer_id, order_id, email, amount)
    values (v_coupon_id, p_customer_id, v_order_id, lower(btrim(p_email)), v_discount);
  end if;

  update public.carts set status = 'converted', updated_at = now() where id = p_cart_id;

  if p_customer_id is not null then
    insert into public.notifications (customer_id, audience, kind, title, body, link)
    values (p_customer_id, 'customer', 'order', 'Order ' || v_order_number || ' placed',
            'We received your order and will confirm it shortly.', '/profile/orders');
  end if;

  perform public.publish_realtime(
    'orders',
    'order.created',
    jsonb_build_object(
      'orderId', v_order_id,
      'orderNumber', v_order_number,
      'total', v_total,
      'customerName', btrim(p_customer_name),
      'itemCount', v_item_count
    )
  );

  insert into public.analytics_daily (day, orders_count, revenue)
  values (current_date, 1, v_total)
  on conflict (day) do update
    set orders_count = public.analytics_daily.orders_count + 1,
        revenue = public.analytics_daily.revenue + v_total,
        updated_at = now();

  return jsonb_build_object(
    'orderId', v_order_id,
    'orderNumber', v_order_number,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'deliveryFee', v_delivery,
    'total', v_total,
    'itemCount', v_item_count,
    'couponCode', case when v_coupon_id is null then null else v_coupon.code end,
    'paymentStatus', v_payment_status
  );
end;
$function$


-- ── publish_realtime (function) ──
CREATE OR REPLACE FUNCTION public.publish_realtime(p_channel text, p_event text, p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  insert into public.realtime_events (channel, event, payload) values (p_channel, p_event, coalesce(p_payload, '{}'::jsonb));
end;
$function$


-- ── rls_auto_enable (function) ──
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$


-- ── sync_product_stock (function) ──
CREATE OR REPLACE FUNCTION public.sync_product_stock(p_product_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  v_stock integer;
begin
  if exists (select 1 from public.product_variants where product_id = p_product_id and is_active) then
    select coalesce(sum(stock), 0) into v_stock
      from public.product_variants
     where product_id = p_product_id and is_active;
    update public.products set stock = v_stock where id = p_product_id;
    return v_stock;
  end if;
  select stock into v_stock from public.products where id = p_product_id;
  return coalesce(v_stock, 0);
end;
$function$


-- ── touch_updated_at (function) ──
CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$


-- ── trg_sync_variant_stock_fn (function) ──
CREATE OR REPLACE FUNCTION public.trg_sync_variant_stock_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  perform public.sync_product_stock(coalesce(new.product_id, old.product_id));
  return null;
end;
$function$


-- ── update_order_status (function) ──
CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_status order_status, p_actor text DEFAULT 'admin'::text, p_message text DEFAULT NULL::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order public.orders;
  v_item record;
  v_stock_after integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;

  if p_status in ('cancelled','returned') and v_order.status not in ('cancelled','returned') then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      if v_item.variant_id is not null then
        update public.product_variants
           set stock = stock + v_item.quantity, updated_at = now()
         where id = v_item.variant_id
        returning stock into v_stock_after;
        insert into public.inventory_movements (product_id, variant_id, delta, stock_after, reason, order_id, actor)
        values (v_item.product_id, v_item.variant_id, v_item.quantity, coalesce(v_stock_after, 0), 'order_restock', p_order_id, coalesce(p_actor,'admin'));
      elsif v_item.product_id is not null then
        update public.products
           set stock = stock + v_item.quantity, updated_at = now()
         where id = v_item.product_id
        returning stock into v_stock_after;
        insert into public.inventory_movements (product_id, variant_id, delta, stock_after, reason, order_id, actor)
        values (v_item.product_id, null, v_item.quantity, coalesce(v_stock_after, 0), 'order_restock', p_order_id, coalesce(p_actor,'admin'));
      end if;
    end loop;
  end if;

  update public.orders
     set status = p_status,
         payment_status = case
           when p_status = 'delivered' and payment_method = 'cod' then 'verified'::public.payment_status
           else payment_status
         end,
         updated_at = now()
   where id = p_order_id
   returning * into v_order;

  insert into public.order_events (order_id, status, message, actor)
  values (p_order_id, p_status::text, p_message, coalesce(p_actor, 'admin'));

  if v_order.customer_id is not null then
    insert into public.notifications (customer_id, audience, kind, title, body, link)
    values (v_order.customer_id, 'customer', 'order',
            'Order ' || v_order.order_number || ' is ' || replace(p_status::text, '_', ' '),
            coalesce(p_message, 'Track the latest status in your orders.'), '/profile/orders');
  end if;

  perform public.publish_realtime(
    'orders',
    'order.status_changed',
    jsonb_build_object('orderId', p_order_id, 'orderNumber', v_order.order_number, 'status', p_status::text)
  );

  return v_order;
end;
$function$


-- ── validate_coupon (function) ──
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_subtotal integer, p_customer_id uuid, p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_coupon public.coupons;
  v_discount integer := 0;
  v_used_by_user integer := 0;
begin
  if p_code is null or length(btrim(p_code)) = 0 then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'Enter a coupon code.');
  end if;

  select * into v_coupon from public.coupons where upper(code) = upper(btrim(p_code));
  if v_coupon.id is null then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'This coupon code does not exist.');
  end if;
  if not v_coupon.is_active then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'This coupon is no longer active.');
  end if;
  if v_coupon.starts_at is not null and v_coupon.starts_at > now() then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'This coupon is not active yet.');
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'This coupon has expired.');
  end if;
  if p_subtotal < v_coupon.min_order_amount then
    return jsonb_build_object('valid', false, 'discount', 0,
      'message', 'Minimum order of ' || v_coupon.min_order_amount || ' taka required.');
  end if;
  if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'This coupon has reached its usage limit.');
  end if;

  select count(*) into v_used_by_user
    from public.coupon_redemptions
   where coupon_id = v_coupon.id
     and (
       (p_customer_id is not null and customer_id = p_customer_id)
       or (p_email is not null and lower(coalesce(email, '')) = lower(p_email))
     );
  if v_used_by_user >= coalesce(v_coupon.per_user_limit, 1) then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'You have already used this coupon.');
  end if;

  if v_coupon.discount_type = 'percentage' then
    v_discount := floor((p_subtotal::numeric * v_coupon.discount_value::numeric) / 100)::int;
    if v_coupon.max_discount_amount is not null then
      v_discount := least(v_discount, v_coupon.max_discount_amount);
    end if;
  else
    v_discount := v_coupon.discount_value;
  end if;

  v_discount := greatest(least(v_discount, p_subtotal), 0);

  return jsonb_build_object(
    'valid', true,
    'discount', v_discount,
    'code', v_coupon.code,
    'message', 'Coupon applied — you saved ' || v_discount || ' taka.'
  );
end;
$function$


-- ── verify_order_payment (function) ──
CREATE OR REPLACE FUNCTION public.verify_order_payment(p_order_id uuid, p_actor text DEFAULT 'admin'::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order public.orders;
begin
  update public.orders
     set payment_status = 'verified', updated_at = now()
   where id = p_order_id
   returning * into v_order;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;

  insert into public.order_events (order_id, status, message, actor)
  values (p_order_id, 'payment_verified', 'Payment verified against transaction id', coalesce(p_actor, 'admin'));

  if v_order.customer_id is not null then
    insert into public.notifications (customer_id, audience, kind, title, body, link)
    values (v_order.customer_id, 'customer', 'payment',
            'Payment verified for ' || v_order.order_number,
            'Your payment has been verified. Thank you!', '/profile/orders');
  end if;

  perform public.publish_realtime(
    'orders',
    'order.payment_verified',
    jsonb_build_object('orderId', p_order_id, 'orderNumber', v_order.order_number)
  );

  return v_order;
end;
$function$


