CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_slug text UNIQUE NOT NULL,
  store_name text NOT NULL DEFAULT 'Aura Threads',
  bio text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  whatsapp_phone text NOT NULL DEFAULT '',
  instagram_handle text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  bank_account text NOT NULL DEFAULT '',
  bank_account_name text NOT NULL DEFAULT '',
  delivery_zones jsonb NOT NULL DEFAULT '{"Lagos Mainland":{"fee":2500},"Lagos Island":{"fee":3500},"Outside Lagos":{"fee":6000}}'::jsonb,
  store_active boolean NOT NULL DEFAULT true,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'unlimited')),
  order_credits integer NOT NULL DEFAULT 0 CHECK (order_credits >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active stores" ON public.profiles FOR SELECT TO anon USING (store_active = true);
CREATE POLICY "Users can view active stores and their own profile" ON public.profiles FOR SELECT TO authenticated USING (store_active = true OR id = auth.uid());
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'New Arrivals',
  description text NOT NULL DEFAULT '',
  price bigint NOT NULL CHECK (price >= 0),
  compare_at_price bigint CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text NOT NULL DEFAULT '',
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view visible products" ON public.products FOR SELECT TO anon USING (visible = true);
CREATE POLICY "Users can view visible products and their own hidden products" ON public.products FOR SELECT TO authenticated USING (visible = true OR vendor_id = auth.uid());
CREATE POLICY "Vendors can add their own products" ON public.products FOR INSERT TO authenticated WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "Vendors can update their own products" ON public.products FOR UPDATE TO authenticated USING (vendor_id = auth.uid()) WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "Vendors can delete their own products" ON public.products FOR DELETE TO authenticated USING (vendor_id = auth.uid());

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('AT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  delivery_zone text NOT NULL,
  delivery_fee bigint NOT NULL CHECK (delivery_fee >= 0),
  subtotal bigint NOT NULL CHECK (subtotal >= 0),
  total bigint NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'paid', 'dispatched', 'delivered')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT UPDATE (status) ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view their own orders" ON public.orders FOR SELECT TO authenticated USING (vendor_id = auth.uid());
CREATE POLICY "Vendors can update their own order status" ON public.orders FOR UPDATE TO authenticated USING (vendor_id = auth.uid()) WITH CHECK (vendor_id = auth.uid());

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price bigint NOT NULL CHECK (unit_price >= 0),
  variant text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view their own order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.vendor_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.create_store_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, store_slug, store_name)
  VALUES (NEW.id, 'aura-' || substr(replace(NEW.id::text, '-', ''), 1, 10), 'Aura Threads');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_store_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_store_profile_for_new_user();

CREATE OR REPLACE FUNCTION public.place_store_order(
  p_vendor_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_zone text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    IF v_qty < 1 OR v_qty > 20 THEN RAISE EXCEPTION 'Quantity must be between 1 and 20'; END IF;
    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item ->> 'product_id')::uuid AND vendor_id = p_vendor_id AND visible = true
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A selected item is no longer available'; END IF;
    IF v_product.stock < v_qty THEN RAISE EXCEPTION 'Not enough stock for %', v_product.name; END IF;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  END LOOP;

  INSERT INTO public.orders (vendor_id, customer_name, customer_phone, delivery_zone, delivery_fee, subtotal, total)
  VALUES (p_vendor_id, trim(p_customer_name), trim(p_customer_phone), p_delivery_zone, v_fee, v_subtotal, v_subtotal + v_fee)
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
    'delivery_fee', v_order.delivery_fee,
    'subtotal', v_order.subtotal,
    'total', v_order.total,
    'status', v_order.status,
    'created_at', v_order.created_at
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.place_store_order(uuid, text, text, text, jsonb) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.create_store_profile_for_new_user() FROM PUBLIC, anon, authenticated;
