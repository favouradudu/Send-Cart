-- 1. Drop the obsolete 5-parameter signature that omitted customer street address
DROP FUNCTION IF EXISTS public.place_store_order(uuid, text, text, text, jsonb);

-- 2. Ensure the 6-parameter signature has fixed search_path and proper permissions
CREATE OR REPLACE FUNCTION public.place_store_order(
  p_vendor_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_zone text,
  p_items jsonb,
  p_delivery_address text DEFAULT ''::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_fee bigint;
  v_subtotal bigint := 0;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty integer;
  v_order public.orders%ROWTYPE;
  v_month_count integer;
  v_credits integer;
  v_plan text;
  v_store_active boolean;
BEGIN
  IF length(trim(coalesce(p_customer_name, ''))) < 2 OR length(trim(coalesce(p_customer_name, ''))) > 100 THEN
    RAISE EXCEPTION 'Please enter a valid customer name';
  END IF;

  IF length(regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g')) < 8 OR length(regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g')) > 15 THEN
    RAISE EXCEPTION 'Please enter a valid phone number';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 30 THEN
    RAISE EXCEPTION 'Your basket is empty or contains too many items';
  END IF;

  SELECT (delivery_zones -> p_delivery_zone ->> 'fee')::bigint, plan, order_credits, store_active
    INTO v_fee, v_plan, v_credits, v_store_active
    FROM public.profiles WHERE id = p_vendor_id FOR UPDATE;

  IF NOT FOUND OR NOT v_store_active OR v_fee IS NULL THEN
    RAISE EXCEPTION 'This store or delivery location is unavailable';
  END IF;

  SELECT count(*) INTO v_month_count FROM public.orders
    WHERE vendor_id = p_vendor_id
      AND created_at >= (date_trunc('month', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos');

  IF v_plan = 'free' AND v_month_count >= 30 AND v_credits <= 0 THEN
    RAISE EXCEPTION 'This store has reached its monthly order limit';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item ->> 'quantity')::integer;
    IF v_qty < 1 OR v_qty > 20 THEN 
      RAISE EXCEPTION 'Quantity must be between 1 and 20'; 
    END IF;

    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item ->> 'product_id')::uuid AND vendor_id = p_vendor_id AND visible = true
      FOR UPDATE;

    IF NOT FOUND THEN 
      RAISE EXCEPTION 'A selected item is no longer available'; 
    END IF;

    IF v_product.stock < v_qty THEN 
      RAISE EXCEPTION 'Not enough stock for %', v_product.name; 
    END IF;

    v_subtotal := v_subtotal + v_product.price * v_qty;
  END LOOP;

  INSERT INTO public.orders (
    vendor_id,
    customer_name,
    customer_phone,
    delivery_zone,
    delivery_address,
    delivery_fee,
    subtotal,
    total
  )
  VALUES (
    p_vendor_id,
    trim(p_customer_name),
    trim(p_customer_phone),
    p_delivery_zone,
    trim(coalesce(p_delivery_address, '')),
    v_fee,
    v_subtotal,
    v_subtotal + v_fee
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item ->> 'quantity')::integer;

    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item ->> 'product_id')::uuid AND vendor_id = p_vendor_id AND visible = true
      FOR UPDATE;

    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, variant)
    VALUES (v_order.id, v_product.id, v_product.name, v_qty, v_product.price, coalesce(v_item ->> 'variant', ''));

    UPDATE public.products SET stock = stock - v_qty, updated_at = now() WHERE id = v_product.id;
  END LOOP;

  IF v_plan = 'free' AND v_month_count >= 30 THEN
    UPDATE public.profiles SET order_credits = order_credits - 1, updated_at = now() WHERE id = p_vendor_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'delivery_zone', v_order.delivery_zone,
    'delivery_address', v_order.delivery_address,
    'delivery_fee', v_order.delivery_fee,
    'subtotal', v_order.subtotal,
    'total', v_order.total,
    'status', v_order.status,
    'created_at', v_order.created_at
  );
END;
$function$;

-- 3. Grant execute to public storefront buyers (anon) and authenticated sellers
GRANT EXECUTE ON FUNCTION public.place_store_order(uuid, text, text, text, jsonb, text) TO anon, authenticated;
